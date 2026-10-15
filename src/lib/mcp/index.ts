import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listRestaurants from "./tools/list-restaurants";
import listIngredients from "./tools/list-ingredients";
import listMenuItems from "./tools/list-menu-items";
import listInvoices from "./tools/list-invoices";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "solace-menu",
  title: "Solace Menu",
  version: "0.1.0",
  instructions: "Read-only tools for Solace Menu restaurant workspaces. Call list_restaurants first to get a restaurant ID, then read ingredients (costs, macros), menu items (prices, published macros) or invoices. Recipe lines are not exposed.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listRestaurants, listIngredients, listMenuItems, listInvoices],
});
