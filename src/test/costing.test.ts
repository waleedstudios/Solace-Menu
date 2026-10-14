import { describe, it, expect } from "vitest";
import { toBase, packBaseQty } from "@/lib/units";
import { computeRecipe, recipesUsing, type Ctx } from "@/lib/costing";
import { lineUnitCost, suggestMatch, totalsCheck } from "@/lib/invoices";

const ing = (o: any) => ({ calories_per_100g: 0, protein_per_100g: 0, carbs_per_100g: 0, fats_per_100g: 0, density_g_per_ml: null, nutrition_source: "label", yield_pct: 100, ...o });

describe("units", () => {
  it("never mixes weight oz and fluid oz", () => {
    expect(toBase(1, "oz", "g").ok).toBe(true);
    expect(toBase(1, "fl_oz", "g").ok).toBe(false);
    expect(toBase(1, "fl_oz", "g", 1.03).value).toBeCloseTo(30.46, 1);
    expect(toBase(1, "each", "g", 1).ok).toBe(false);
  });
  it("handles a case of 4 x 1 gal", () => {
    expect(packBaseQty(4, 1, "gal")).toBeCloseTo(15141.65, 1);
  });
});

describe("nested recipe costing", () => {
  const ctx: Ctx = {
    ingredients: new Map([
      ["mayo", ing({ id: "mayo", name: "Mayo", base_unit: "g", current_cost: 0.01, calories_per_100g: 700 })],
      ["sriracha", ing({ id: "sriracha", name: "Sriracha", base_unit: "g", current_cost: 0.02 })],
      ["salmon", ing({ id: "salmon", name: "Salmon", base_unit: "g", current_cost: 0.03, yield_pct: 75 })],
      ["rice", ing({ id: "rice", name: "Rice", base_unit: "g", current_cost: null, nutrition_source: null })],
    ] as any),
    recipes: new Map([
      ["sauce", { id: "sauce", name: "Spicy mayo", batch_yield_qty: 1000, batch_yield_unit: "g", servings_per_batch: 1, packaging_cost: 0, selling_price: null }],
      ["roll", { id: "roll", name: "Roll", batch_yield_qty: 1, batch_yield_unit: "each", servings_per_batch: 1, packaging_cost: 0.25, selling_price: 12 }],
    ]),
    lines: [
      { id: "1", recipe_id: "sauce", ingredient_id: "mayo", sub_recipe_id: null, quantity: 800, unit: "g" },
      { id: "2", recipe_id: "sauce", ingredient_id: "sriracha", sub_recipe_id: null, quantity: 200, unit: "g" },
      { id: "3", recipe_id: "roll", ingredient_id: "salmon", sub_recipe_id: null, quantity: 90, unit: "g" },
      { id: "4", recipe_id: "roll", ingredient_id: null, sub_recipe_id: "sauce", quantity: 30, unit: "g" },
    ],
  };
  it("costs sub-recipe by fraction of batch and applies yield once", () => {
    const sauce = computeRecipe("sauce", ctx);
    expect(sauce.batchCost).toBeCloseTo(12); // 8 + 4
    const roll = computeRecipe("roll", ctx);
    // salmon 90/0.75*0.03 = 3.60, sauce 30/1000*12 = 0.36
    expect(roll.batchCost).toBeCloseTo(3.96);
    expect(roll.totalPerItem).toBeCloseTo(4.21);
    expect(roll.foodCostPct).toBeCloseTo(35.08, 1);
    expect(roll.costComplete).toBe(true);
    expect(recipesUsing("mayo", ctx).sort()).toEqual(["roll", "sauce"]);
  });
  it("flags missing price and missing nutrition instead of zero", () => {
    const c = { ...ctx, lines: [...ctx.lines, { id: "5", recipe_id: "roll", ingredient_id: "rice", sub_recipe_id: null, quantity: 100, unit: "g" }] };
    const r = computeRecipe("roll", c);
    expect(r.costComplete).toBe(false);
    expect(r.nutritionComplete).toBe(false);
  });
  it("blocks volume line on a weight ingredient without density", () => {
    const c = { ...ctx, lines: [{ id: "x", recipe_id: "roll", ingredient_id: "mayo", sub_recipe_id: null, quantity: 1, unit: "fl_oz" }] };
    expect(computeRecipe("roll", c).costComplete).toBe(false);
  });
});

describe("invoice helpers", () => {
  const ingM: any = { id: "oil", name: "Canola oil", brand: null, supplier_code: "OIL-4", base_unit: "ml", pack_count: 4, pack_size: 1, pack_unit: "gal", density_g_per_ml: null, current_cost: null, current_cost_date: null };
  it("normalizes a case price to cost per ml", () => {
    const r = lineUnitCost({ pack_count: 4, pack_size: 1, pack_unit: "gal", unit_price: 60, line_total: 60, quantity: 1 } as any, ingM);
    expect(r.ok && r.costPerBase).toBeCloseTo(60 / 15141.18, 5);
  });
  it("matches learned vendor alias by product code", () => {
    const m = suggestMatch({ description: "CANOLA 4/1GAL", product_code: "123", pack_count: 4, pack_size: 1, pack_unit: "gal" }, "Sysco", [ingM], [{ ingredient_id: "oil", vendor_name: "Sysco", alias: "x", product_code: "123" }]);
    expect(m?.ingredient_id).toBe("oil");
    expect(m!.confidence).toBeGreaterThan(0.9);
  });
  it("flags totals that don't reconcile", () => {
    const t = totalsCheck({ subtotal: 100, discount: 0, tax: 5, delivery: 0, total: 110 }, [{ line_total: 100, quantity: 1, unit_price: 100 } as any]);
    expect(t.issues.length).toBe(1);
  });
});
