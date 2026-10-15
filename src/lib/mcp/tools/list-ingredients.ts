import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_ingredients",
  title: "List ingredients",
  description: "List a restaurant's ingredients with current cost and macros per 100 g. Missing costs are shown as null, never zero.",
  inputSchema: {
    restaurant_id: z.string().uuid().describe("Restaurant ID from list_restaurants."),
    search: z.string().max(100).optional().describe("Optional name filter."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ restaurant_id, search }, ctx) => {
    let q = supabaseForUser(ctx).from("ingredients")
      .select("id, name, category, base_unit, current_cost, current_cost_date, calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g, allergens")
      .eq("restaurant_id", restaurant_id).order("name").limit(500);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const ingredients = (data || []).map((i) => ({
      id: i.id, name: i.name, category: i.category, base_unit: i.base_unit,
      current_cost: i.current_cost, current_cost_date: i.current_cost_date,
      calories_per_100g: i.calories_per_100g, protein_per_100g: i.protein_per_100g,
      carbs_per_100g: i.carbs_per_100g, fats_per_100g: i.fats_per_100g,
      allergens: i.allergens ?? [],
    }));
    return {
      content: [{ type: "text", text: ingredients.length ? ingredients.map((i) => `${i.name}: cost ${i.current_cost ?? "missing"} per ${i.base_unit}, ${i.calories_per_100g} kcal/100g`).join("\n") : "No ingredients." }],
      structuredContent: { ingredients },
    };
  },
});
