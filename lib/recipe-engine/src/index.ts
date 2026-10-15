// Shared by private recipe costing and the safe public nutrition projection.
import { toBase, isUnit, UNITS } from "./units";

export type CostIngredient = {
  id: string; name: string; base_unit: string; yield_pct: number;
  density_g_per_ml: number | null; current_cost: number | null; nutrition_source: string | null;
  calories_per_100g: number; protein_per_100g: number; carbs_per_100g: number; fats_per_100g: number;
  sat_fat_per_100?: number | null; fiber_per_100?: number | null; sugar_per_100?: number | null; added_sugar_per_100?: number | null; sodium_mg_per_100?: number | null;
};
export type CostRecipe = {
  id: string; name: string; batch_yield_qty: number; batch_yield_unit: string; servings_per_batch: number;
  packaging_cost: number; selling_price: number | null;
};
export type CostLine = { id: string; recipe_id: string; ingredient_id: string | null; sub_recipe_id: string | null; quantity: number; unit: string };
export type Nutr = { calories: number; protein: number; carbs: number; fats: number; sat_fat: number; fiber: number; sugar: number; added_sugar: number; sodium_mg: number };
const NZ: Nutr = { calories: 0, protein: 0, carbs: 0, fats: 0, sat_fat: 0, fiber: 0, sugar: 0, added_sugar: 0, sodium_mg: 0 };
const addN = (a: Nutr, b: Nutr, k = 1): Nutr => Object.fromEntries(Object.keys(a).map(x => [x, a[x as keyof Nutr] + b[x as keyof Nutr] * k])) as Nutr;
export type LineResult = { line: CostLine; name: string; cost: number | null; issues: string[] };
export type RecipeResult = {
  batchCost: number; costComplete: boolean; costIssues: string[];
  nutrition: Nutr; nutritionComplete: boolean; nutritionIssues: string[]; estimatedNutrition: boolean;
  lines: LineResult[]; servingCost: number; packaging: number; totalPerItem: number;
  foodCostPct: number | null; contribution: number | null; servingNutrition: Nutr;
};
export type Ctx = { ingredients: Map<string, CostIngredient>; recipes: Map<string, CostRecipe>; lines: CostLine[] };

export function computeRecipe(recipeId: string, ctx: Ctx, stack: string[] = []): RecipeResult {
  const r = ctx.recipes.get(recipeId);
  const empty: RecipeResult = { batchCost: 0, costComplete: false, costIssues: ["Recipe not found"], nutrition: { ...NZ }, nutritionComplete: false, nutritionIssues: ["Recipe unavailable"], estimatedNutrition: false, lines: [], servingCost: 0, packaging: 0, totalPerItem: 0, foodCostPct: null, contribution: null, servingNutrition: { ...NZ } };
  if (!r) return empty;
  if (stack.includes(recipeId)) return { ...empty, costIssues: [`Circular sub-recipe: ${r.name}`], nutritionIssues: ["Circular sub-recipe"] };
  let batchCost = 0, nutrition = { ...NZ }, costComplete = true, nutritionComplete = true, estimated = false;
  const costIssues: string[] = [], nutritionIssues: string[] = [];
  const lines: LineResult[] = [];
  for (const l of ctx.lines.filter(x => x.recipe_id === recipeId)) {
    const issues: string[] = [];
    let cost: number | null = null, name = "?";
    if (!(Number(l.quantity) > 0) || !Number.isFinite(Number(l.quantity))) {
      issues.push("Quantity needed"); nutritionComplete = false; nutritionIssues.push("Ingredient quantity needed");
    }
    if (l.ingredient_id) {
      const ing = ctx.ingredients.get(l.ingredient_id);
      if (!ing) { issues.push("Ingredient missing"); nutritionComplete = false; nutritionIssues.push("Ingredient missing"); }
      else {
        name = ing.name;
        const conv = toBase(Number(l.quantity), l.unit, ing.base_unit, ing.density_g_per_ml);
        if (!conv.ok) { issues.push(conv.reason); nutritionComplete = false; nutritionIssues.push(`${ing.name}: ${conv.reason}`); }
        else {
          const y = Math.min(Math.max(Number(ing.yield_pct) || 100, 1), 100) / 100;
          if (ing.current_cost == null) issues.push("No approved price");
          else cost = (conv.value / y) * Number(ing.current_cost);
          const core = [ing.calories_per_100g, ing.protein_per_100g, ing.carbs_per_100g, ing.fats_per_100g];
          if (!ing.nutrition_source || core.some(v => v == null || !Number.isFinite(Number(v)) || Number(v) < 0)) {
            issues.push("No nutrition data"); nutritionComplete = false; nutritionIssues.push(`${ing.name}: no nutrition`);
          } else {
            if (ing.nutrition_source === "estimated") estimated = true;
            nutrition = addN(nutrition, {
              calories: Number(ing.calories_per_100g), protein: Number(ing.protein_per_100g), carbs: Number(ing.carbs_per_100g), fats: Number(ing.fats_per_100g),
              sat_fat: ing.sat_fat_per_100 ?? 0, fiber: ing.fiber_per_100 ?? 0, sugar: ing.sugar_per_100 ?? 0,
              added_sugar: ing.added_sugar_per_100 ?? 0, sodium_mg: ing.sodium_mg_per_100 ?? 0,
            }, conv.value / 100);
          }
        }
      }
    } else if (l.sub_recipe_id) {
      const sr = ctx.recipes.get(l.sub_recipe_id), sub = computeRecipe(l.sub_recipe_id, ctx, [...stack, recipeId]);
      name = sr ? `${sr.name} (sub-recipe)` : "Sub-recipe missing";
      if (!sr) { issues.push("Sub-recipe missing"); nutritionComplete = false; nutritionIssues.push("Sub-recipe missing"); }
      else {
        let frac: number | null = null;
        if (isUnit(l.unit) && isUnit(sr.batch_yield_unit) && UNITS[l.unit].dim === UNITS[sr.batch_yield_unit].dim && Number(sr.batch_yield_qty) > 0) {
          frac = Number(l.quantity) * UNITS[l.unit].toBase / (Number(sr.batch_yield_qty) * UNITS[sr.batch_yield_unit].toBase);
        } else issues.push(`Sub-recipe yield is in ${sr.batch_yield_unit}; can't use ${l.unit}`);
        if (frac != null && Number.isFinite(frac)) {
          cost = sub.batchCost * frac;
          if (!sub.costComplete) issues.push("Sub-recipe cost incomplete");
          nutrition = addN(nutrition, sub.nutrition, frac);
          if (!sub.nutritionComplete) { nutritionComplete = false; nutritionIssues.push(`${sr.name}: incomplete nutrition`); }
          if (sub.estimatedNutrition) estimated = true;
        } else { nutritionComplete = false; nutritionIssues.push("Sub-recipe yield conversion unavailable"); }
      }
    } else { issues.push("Ingredient needed"); nutritionComplete = false; nutritionIssues.push("Ingredient needed"); }
    const blocking = issues.filter(i => i !== "No nutrition data");
    if (cost == null || blocking.length) { costComplete = false; costIssues.push(`${name}: ${blocking.join(", ") || "no cost"}`); }
    if (cost != null) batchCost += cost;
    lines.push({ line: l, name, cost, issues });
  }
  if (!lines.length) { costComplete = false; costIssues.push("No ingredients yet"); nutritionComplete = false; nutritionIssues.push("No ingredients yet"); }
  if (!(Number(r.servings_per_batch) > 0) || !Number.isFinite(Number(r.servings_per_batch))) {
    nutritionComplete = false; nutritionIssues.push("Servings per batch needed"); costComplete = false; costIssues.push("Servings per batch needed");
  }
  const servings = Number(r.servings_per_batch) > 0 ? Number(r.servings_per_batch) : 1;
  const servingCost = batchCost / servings, packaging = Number(r.packaging_cost) || 0, totalPerItem = servingCost + packaging;
  const price = r.selling_price != null ? Number(r.selling_price) : null;
  return {
    batchCost, costComplete, costIssues, nutrition, nutritionComplete, nutritionIssues, estimatedNutrition: estimated, lines,
    servingCost, packaging, totalPerItem, foodCostPct: price && price > 0 ? totalPerItem / price * 100 : null,
    contribution: price != null ? price - totalPerItem : null, servingNutrition: addN(NZ, nutrition, 1 / servings),
  };
}
export function recipesUsing(ingredientId: string, ctx: Ctx): string[] {
  const direct = new Set(ctx.lines.filter(l => l.ingredient_id === ingredientId).map(l => l.recipe_id));
  let grew = true;
  while (grew) {
    grew = false;
    for (const l of ctx.lines) if (l.sub_recipe_id && direct.has(l.sub_recipe_id) && !direct.has(l.recipe_id)) { direct.add(l.recipe_id); grew = true; }
  }
  return [...direct];
}
