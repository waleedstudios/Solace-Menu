import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_restaurants",
  title: "List restaurants",
  description: "List the restaurant workspaces you belong to, with your role and restaurant IDs.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb.from("restaurant_members").select("restaurant_id, role, restaurants(name)").eq("user_id", ctx.getUserId() ?? "");
    if (error) throw new ToolError(error.message);
    const restaurants = (data || []).map((m: any) => ({ id: String(m.restaurant_id), name: String(m.restaurants?.name ?? "Restaurant"), role: String(m.role) }));
    return {
      content: [{ type: "text", text: restaurants.length ? restaurants.map((r) => `${r.id}: ${r.name} (${r.role})`).join("\n") : "No restaurants." }],
      structuredContent: { restaurants },
    };
  },
});
