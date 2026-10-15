import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_invoices",
  title: "List invoices",
  description: "List a restaurant's scanned supplier invoices with vendor, date, total and review status.",
  inputSchema: {
    restaurant_id: z.string().uuid().describe("Restaurant ID from list_restaurants."),
    limit: z.number().int().min(1).max(200).optional().describe("Max invoices to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ restaurant_id, limit }, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("invoices")
      .select("id, vendor_name, invoice_number, invoice_date, doc_type, status, total")
      .eq("restaurant_id", restaurant_id).order("invoice_date", { ascending: false, nullsFirst: false }).limit(limit ?? 50);
    if (error) throw new ToolError(error.message);
    const invoices = (data || []).map((i) => ({ ...i }));
    return {
      content: [{ type: "text", text: invoices.length ? invoices.map((i) => `${i.invoice_date ?? "no date"} ${i.vendor_name ?? "Unknown vendor"} #${i.invoice_number ?? "?"}: ${i.total ?? "?"} (${i.status})`).join("\n") : "No invoices." }],
      structuredContent: { invoices },
    };
  },
});
