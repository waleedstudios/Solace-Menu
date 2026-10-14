import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const num = { type: ["number", "null"] };
const str = { type: ["string", "null"] };

const invoiceSchema = {
  type: "object",
  properties: {
    vendor_name: str, invoice_number: str,
    invoice_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
    doc_type: { type: "string", enum: ["invoice", "credit_note", "return", "corrected_invoice"] },
    subtotal: num, discount: num, tax: num, delivery: num, total: num,
    uncertain_fields: { type: "array", items: { type: "string" }, description: "Header fields you could not read confidently" },
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" }, product_code: str,
          quantity: { ...num, description: "Number of purchase units bought (negative for credits/returns)" },
          pack_count: { ...num, description: "Inner units per purchase unit, e.g. 4 for a case of 4x1 gal" },
          pack_size: { ...num, description: "Size of each inner unit, e.g. 1 for 1 gal" },
          pack_unit: { type: ["string", "null"], enum: ["g", "kg", "oz", "lb", "ml", "l", "fl_oz", "gal", "each", null] },
          unit_price: num, line_total: num,
          uncertain: { type: "boolean" }, uncertain_note: str,
        },
        required: ["description", "uncertain"],
      },
    },
  },
  required: ["lines", "doc_type", "uncertain_fields"],
};

const labelSchema = {
  type: "object",
  properties: {
    product_name: str, brand: str,
    serving_size_text: str,
    serving_size_amount: { ...num, description: "Serving size in grams or milliliters, only if printed" },
    serving_size_unit: { type: ["string", "null"], enum: ["g", "ml", null] },
    servings_per_container: num,
    calories: num, protein_g: num, carbs_g: num, fat_g: num, sat_fat_g: num,
    fiber_g: num, sugar_g: num, added_sugar_g: num, sodium_mg: num,
    allergens_statement: { ...str, description: "Exact 'Contains' statement if printed, else null" },
    uncertain_fields: { type: "array", items: { type: "string" } },
  },
  required: ["uncertain_fields"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Not signed in" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Not signed in" }, 401);

    const { kind, restaurant_id, paths } = await req.json();
    if (!["invoice", "label"].includes(kind) || !restaurant_id || !Array.isArray(paths) || !paths.length) return json({ error: "Bad request" }, 400);
    const { data: isMember } = await supabase.rpc("is_member", { _restaurant: restaurant_id });
    if (!isMember) return json({ error: "Forbidden" }, 403);

    const content: any[] = [{
      type: "text",
      text: kind === "invoice"
        ? "Extract this supplier invoice / receipt (all pages). Read only what is printed; use null for anything not visible. Never guess pack sizes. Flag any field you are unsure of. Credits/returns use negative quantities and totals."
        : "Extract this nutrition facts label. Read only printed values; use null when absent. Do not infer allergens; only copy a printed Contains statement.",
    }];
    for (const p of paths.slice(0, 10)) {
      if (!String(p).startsWith(`${restaurant_id}/`)) return json({ error: "Forbidden" }, 403);
      const { data, error } = await supabase.storage.from("documents").download(p);
      if (error || !data) return json({ error: "Could not read file" }, 400);
      const b64 = encodeBase64(new Uint8Array(await data.arrayBuffer()));
      content.push({ type: "image_url", image_url: { url: `data:${data.type || "image/jpeg"};base64,${b64}` } });
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
        tools: [{ type: "function", function: { name: "record", description: "Record extracted data", parameters: kind === "invoice" ? invoiceSchema : labelSchema } }],
        tool_choice: { type: "function", function: { name: "record" } },
      }),
    });
    if (r.status === 429) return json({ error: "AI is busy, try again in a minute." }, 429);
    if (r.status === 402) return json({ error: "AI credits exhausted. Add credits in workspace settings." }, 402);
    if (!r.ok) { console.error("AI error status", r.status); return json({ error: "Extraction failed" }, 500); }
    const out = await r.json();
    const args = out.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return json({ error: "Nothing could be extracted" }, 422);
    return json({ data: JSON.parse(args) });
  } catch (_e) {
    console.error("extract-document failed");
    return json({ error: "Extraction failed" }, 500);
  }
});
