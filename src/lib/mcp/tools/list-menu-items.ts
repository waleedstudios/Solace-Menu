import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const macro = (m: any, k: string) => (m && typeof m[k] === "number" ? (m[k] as number) : null);

export default defineTool({
  name: "list_menu_items",
  title: "List menu items",
  description: "List a restaurant's menu items with category, price, description and published macros. Recipe lines and instructions are never returned.",
  inputSchema: { restaurant_id: z.string().uuid().describe("Restaurant ID from list_restaurants.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ restaurant_id }, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("recipes")
      .select("id, name, category, description, selling_price, is_published, public_macros")
      .eq("restaurant_id", restaurant_id).eq("is_subrecipe", false).order("name").limit(500);
    if (error) throw new ToolError(error.message);
    const items = (data || []).map((r) => {
      const m = r.public_macros as any;
      return {
        id: r.id, name: r.name, category: r.category, description: r.description,
        price: r.selling_price, published: r.is_published,
        macros: m ? { calories: macro(m, "calories"), protein: macro(m, "protein"), carbs: macro(m, "carbs"), fats: macro(m, "fats") } : null,
      };
    });
    return {
      content: [{ type: "text", text: items.length ? items.map((i) => `${i.name}${i.price != null ? ` ($${i.price})` : ""}: ${i.macros ? `${i.macros.calories} kcal, P${i.macros.protein} C${i.macros.carbs} F${i.macros.fats}` : "nutrition incomplete"}`).join("\n") : "No menu items." }],
      structuredContent: { items },
    };
  },
});
