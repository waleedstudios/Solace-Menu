// Macro calculation engine — single source of truth.
// Formula: (grams / 100) × per-100g macros. Sum over all recipe items.

export type Ingredient = {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
};

export type PortionUnit = {
  id: string;
  name: string;
  average_grams: number;
};

export type RecipeItem = {
  id: string;
  ingredient_id: string;
  grams: number | null;
  portion_unit_id: string | null;
  portion_quantity: number | null;
  is_modifier?: boolean;
  modifier_type?: string | null;
};

export type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export const ZERO: Macros = { calories: 0, protein: 0, carbs: 0, fats: 0 };

export function resolveGrams(item: Pick<RecipeItem, "grams" | "portion_unit_id" | "portion_quantity">, portionUnits: PortionUnit[]): number {
  if (item.grams && item.grams > 0) return Number(item.grams);
  if (item.portion_unit_id && item.portion_quantity) {
    const u = portionUnits.find((p) => p.id === item.portion_unit_id);
    if (u) return Number(u.average_grams) * Number(item.portion_quantity);
  }
  return 0;
}

export function macrosForItem(
  recipeItem: RecipeItem,
  ingredient: Ingredient | undefined,
  portionUnits: PortionUnit[]
): Macros {
  if (!ingredient) return ZERO;
  const grams = resolveGrams(recipeItem, portionUnits);
  const factor = grams / 100;
  return {
    calories: ingredient.calories_per_100g * factor,
    protein: ingredient.protein_per_100g * factor,
    carbs: ingredient.carbs_per_100g * factor,
    fats: ingredient.fats_per_100g * factor,
  };
}

export function totalMacros(
  recipeItems: RecipeItem[],
  ingredients: Ingredient[],
  portionUnits: PortionUnit[]
): Macros {
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));
  return recipeItems.reduce<Macros>((acc, ri) => {
    // Phase 2: skip "remove" modifiers from base total
    if (ri.is_modifier && ri.modifier_type === "remove") return acc;
    const m = macrosForItem(ri, ingMap.get(ri.ingredient_id), portionUnits);
    return {
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fats: acc.fats + m.fats,
    };
  }, { ...ZERO });
}

export const fmt = (n: number) => Math.round(n).toLocaleString();
export const fmt1 = (n: number) => (Math.round(n * 10) / 10).toString();
