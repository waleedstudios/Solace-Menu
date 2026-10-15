import { pool } from "@workspace/db";
import { GetPublicMenuResponse, GetRestaurantMenuResponse } from "@workspace/api-zod";
import { computeRecipe, type Ctx, type CostIngredient, type CostRecipe, type RecipeResult } from "@workspace/recipe-engine";
import { HttpError } from "./auth";

type Profile = { id: string; restaurant_name: string; slug: string };
type Item = ReturnType<typeof GetRestaurantMenuResponse.parse>["items"][number];
const nutritionColumns = `id, name, base_unit, yield_pct, density_g_per_ml, nutrition_source,
  calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g`;

// Existing false flags may represent deliberate choices, not just defaults.
// Only new inserts auto-publish; synchronization must never infer old consent.
export async function initializeRecipeMenuSync(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // The controlled additive migration precedes the first use of this column.
    // It is idempotent and does not recreate tables or modify dish visibility.
    await client.query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS public_menu_synced
      boolean NOT NULL DEFAULT false`);
    await client.query(`UPDATE recipes SET
      is_published = CASE WHEN is_subrecipe THEN FALSE ELSE is_published END,
      public_menu_synced = TRUE WHERE NOT public_menu_synced`);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export function menuNutrition(result: RecipeResult) {
  const { calories, protein, carbs, fats } = result.servingNutrition;
  const complete = result.nutritionComplete && [calories, protein, carbs, fats].every(v => Number.isFinite(v) && v >= 0);
  return {
    macros: complete ? { calories, protein, carbs, fats } : null,
    nutrition_complete: complete,
    estimated_nutrition: result.estimatedNutrition,
    ingredient_count: result.lines.length,
  };
}

async function menuView(profile: Profile, restaurantId?: string, actorId?: string, canManage = false) {
  const client = await pool.connect();
  try {
    // A coherent snapshot prevents half-updated dependency data within one response.
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const recipeRows = (await client.query(`SELECT r.id, r.restaurant_id, r.name, r.description,
      r.category, r.image_url, r.selling_price, r.serving_size_text, r.is_published, r.is_subrecipe,
      r.batch_yield_qty, r.batch_yield_unit, r.servings_per_batch
      FROM recipes r JOIN restaurants rest ON rest.id = r.restaurant_id
      WHERE rest.owner_id = $1 ${restaurantId ? "AND r.restaurant_id = $2" : ""}
      ORDER BY r.created_at DESC`, restaurantId ? [profile.id, restaurantId] : [profile.id])).rows;
    const recipeIds = recipeRows.map(r => r.id);
    const restaurantIds = [...new Set(recipeRows.map(r => r.restaurant_id))];
    const lines = recipeIds.length
      ? (await client.query("SELECT id, recipe_id, ingredient_id, sub_recipe_id, quantity, unit FROM recipe_lines WHERE recipe_id = ANY($1::uuid[]) ORDER BY position", [recipeIds])).rows : [];
    const legacyRows = (await client.query(`SELECT id, name, description, image_url, is_published
      FROM menu_items WHERE user_id = $1 ORDER BY created_at DESC`, [profile.id])).rows;
    const legacyIds = legacyRows.map(r => r.id);
    const legacyLines = legacyIds.length
      ? (await client.query("SELECT id, menu_item_id, ingredient_id, grams, portion_unit_id, portion_quantity, is_modifier, modifier_type FROM recipe_items WHERE menu_item_id = ANY($1::uuid[])", [legacyIds])).rows : [];
    const ingredientIds = [...new Set([...lines, ...legacyLines].map(l => l.ingredient_id).filter(Boolean))];
    const modernIngredientIds = lines.map(l => l.ingredient_id).filter(Boolean);
    const legacyIngredientIds = legacyLines.map(l => l.ingredient_id);
    // Legacy item ownership was checked above; only its already-public nutrient
    // data is read. No purchase prices, vendor details, labels or private notes.
    const ingredientRows = ingredientIds.length ? (await client.query(`SELECT ${nutritionColumns} FROM ingredients
      WHERE id = ANY($1::uuid[]) AND (
        (id = ANY($2::uuid[]) AND (restaurant_id = ANY($3::uuid[]) OR
          (restaurant_id IS NULL AND (user_id IS NULL OR user_id = $4))))
        OR id = ANY($5::uuid[]))`, [ingredientIds, modernIngredientIds, restaurantIds, profile.id, legacyIngredientIds])).rows : [];
    const ingredients = new Map<string, CostIngredient>(ingredientRows.map(i => [i.id, { ...i, current_cost: null }]));
    const ctx: Ctx = {
      ingredients,
      recipes: new Map(recipeRows.map(r => [r.id, { ...r, packaging_cost: 0, selling_price: null } as CostRecipe])),
      lines,
    };
    const items: Item[] = recipeRows.filter(r => !r.is_subrecipe).map(r => ({
      id: r.id, source: "recipe", name: r.name, description: r.description,
      category: r.category, image_url: r.image_url, selling_price: r.selling_price,
      serving_size_text: r.serving_size_text, is_published: r.is_published,
      can_edit: canManage, ...menuNutrition(computeRecipe(r.id, ctx)),
    }));
    const portionIds = legacyLines.map(l => l.portion_unit_id).filter(Boolean);
    const portions = portionIds.length
      ? new Map((await client.query("SELECT id, average_grams FROM portion_units WHERE id = ANY($1::uuid[])", [portionIds])).rows.map(p => [p.id, p.average_grams])) : new Map();
    for (const legacy of legacyRows) {
      const legacyRecipe: CostRecipe = { id: legacy.id, name: legacy.name, batch_yield_qty: 1, batch_yield_unit: "each", servings_per_batch: 1, packaging_cost: 0, selling_price: null };
      const legacyCtx: Ctx = {
        // The original standalone editor's measurements are explicitly grams.
        ingredients: new Map([...ingredients].map(([id, i]) => [id, { ...i, base_unit: "g" }])),
        recipes: new Map([[legacy.id, legacyRecipe]]),
        lines: legacyLines.filter(l => l.menu_item_id === legacy.id && !(l.is_modifier && l.modifier_type === "remove")).map(l => ({
          id: l.id, recipe_id: legacy.id, ingredient_id: l.ingredient_id, sub_recipe_id: null, unit: "g",
          quantity: Number(l.grams) > 0 ? Number(l.grams) : Number(portions.get(l.portion_unit_id) ?? 0) * Number(l.portion_quantity ?? 0),
        })),
      };
      items.push({
        id: legacy.id, source: "legacy", name: legacy.name, description: legacy.description,
        image_url: legacy.image_url, category: null, selling_price: null, serving_size_text: null,
        is_published: legacy.is_published, can_edit: actorId === profile.id,
        ...menuNutrition(computeRecipe(legacy.id, legacyCtx)),
      });
    }
    await client.query("COMMIT");
    return { restaurant_name: profile.restaurant_name, slug: profile.slug, items };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function readPublicMenu(slug: string) {
  const profile = (await pool.query("SELECT id, restaurant_name, slug FROM profiles WHERE slug = $1", [slug])).rows[0];
  if (!profile) throw new HttpError(404, "Menu not found.");
  const menu = await menuView(profile);
  return GetPublicMenuResponse.parse({ ...menu, items: menu.items.filter(i => i.is_published) });
}

export async function readRestaurantMenu(restaurantId: string, actorId: string, canManage: boolean) {
  const row = (await pool.query(`SELECT p.id, rest.name AS restaurant_name, p.slug
    FROM restaurants rest JOIN profiles p ON p.id = rest.owner_id WHERE rest.id = $1`, [restaurantId])).rows[0];
  if (!row) throw new HttpError(404, "Restaurant not found.");
  return GetRestaurantMenuResponse.parse(await menuView(row, restaurantId, actorId, canManage));
}
