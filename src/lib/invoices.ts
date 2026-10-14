import { supabase } from "@/integrations/supabase/client";
import { isUnit, UNITS, toBase, describePack } from "./units";

export type InvLine = {
  id: string; invoice_id: string; restaurant_id: string; position: number; description: string; product_code: string | null;
  quantity: number | null; pack_count: number | null; pack_size: number | null; pack_unit: string | null;
  unit_price: number | null; line_total: number | null; uncertain: boolean; uncertain_note: string | null;
  match_status: string; ingredient_id: string | null; match_confidence: number | null; match_reason: string | null;
};
export type Alias = { ingredient_id: string; vendor_name: string | null; alias: string; product_code: string | null };
export type MatchIng = { id: string; name: string; brand: string | null; supplier_code: string | null; base_unit: string; pack_count: number | null; pack_size: number | null; pack_unit: string | null; density_g_per_ml: number | null; current_cost: number | null; current_cost_date: string | null; };

const norm = (s: string | null | undefined) => (s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => new Set(norm(s).split(" ").filter((t) => t.length > 1));

export function suggestMatch(line: Pick<InvLine, "description" | "product_code" | "pack_count" | "pack_size" | "pack_unit">, vendor: string | null, ings: MatchIng[], aliases: Alias[]) {
  const v = norm(vendor);
  const code = norm(line.product_code);
  const desc = norm(line.description);
  let best: { ingredient_id: string; confidence: number; reason: string } | null = null;
  const consider = (id: string, c: number, reason: string) => { if (!best || c > best.confidence) best = { ingredient_id: id, confidence: c, reason }; };

  for (const a of aliases) {
    const sameVendor = v && norm(a.vendor_name) === v;
    if (code && norm(a.product_code) === code) consider(a.ingredient_id, sameVendor ? 0.97 : 0.85, `Product code ${line.product_code} was confirmed before${sameVendor ? ` for ${vendor}` : " (different vendor)"}`);
    if (desc && norm(a.alias) === desc) consider(a.ingredient_id, sameVendor ? 0.92 : 0.75, `Same description was confirmed before${sameVendor ? ` for ${vendor}` : " (different vendor)"}`);
  }
  const lt = tokens(line.description);
  for (const i of ings) {
    if (code && norm(i.supplier_code) === code) consider(i.id, 0.9, `Matches supplier code on ${i.name}`);
    const it = tokens(`${i.name} ${i.brand || ""}`);
    const inter = [...lt].filter((t) => it.has(t)).length;
    const j = inter / Math.max(1, new Set([...lt, ...it]).size);
    if (j >= 0.2) consider(i.id, Math.min(0.7, 0.3 + j), `Name similarity with "${i.name}" — please confirm`);
  }
  if (best) {
    const ing = ings.find((i) => i.id === best!.ingredient_id);
    if (ing && ing.pack_size && line.pack_size && (ing.pack_count ?? 1) * ing.pack_size !== (line.pack_count ?? 1) * line.pack_size || (ing && ing.pack_unit && line.pack_unit && ing.pack_unit !== line.pack_unit)) {
      best.confidence = Math.min(best.confidence, 0.6);
      best.reason += `. Pack differs: catalog ${describePack(ing!.pack_count, ing!.pack_size, ing!.pack_unit)} vs invoice ${describePack(line.pack_count, line.pack_size, line.pack_unit)}`;
    }
  }
  return best as { ingredient_id: string; confidence: number; reason: string } | null;
}

/** Cost per ingredient base unit for an invoice line, or a reason it can't be computed. */
export function lineUnitCost(line: InvLine, ing: MatchIng): { ok: true; costPerBase: number; baseQty: number; explain: string } | { ok: false; reason: string } {
  if (!isUnit(line.pack_unit) || !line.pack_size) return { ok: false, reason: "Pack size/unit missing on this line" };
  const per = line.unit_price ?? (line.line_total != null && line.quantity ? line.line_total / line.quantity : null);
  if (per == null) return { ok: false, reason: "Unit price missing" };
  const inner = (line.pack_count && line.pack_count > 0 ? line.pack_count : 1) * line.pack_size;
  const conv = toBase(inner, line.pack_unit, ing.base_unit, ing.density_g_per_ml);
  if (!conv.ok) return { ok: false, reason: conv.reason };
  if (conv.value <= 0) return { ok: false, reason: "Pack quantity is zero" };
  const base = ing.base_unit;
  return {
    ok: true, costPerBase: per / conv.value, baseQty: conv.value,
    explain: `${describePack(line.pack_count, line.pack_size, line.pack_unit)} = ${conv.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${base} → $${per.toFixed(2)} ÷ ${conv.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} = $${(per / conv.value).toFixed(5)}/${base}`,
  };
}

export function totalsCheck(inv: { subtotal: number | null; discount: number | null; tax: number | null; delivery: number | null; total: number | null }, lines: InvLine[]) {
  const sumLines = lines.reduce((a, l) => a + (Number(l.line_total) || 0), 0);
  const issues: string[] = [];
  for (const l of lines) {
    if (l.quantity != null && l.unit_price != null && l.line_total != null && Math.abs(l.quantity * l.unit_price - l.line_total) > 0.02)
      issues.push(`"${l.description}": ${l.quantity} × ${l.unit_price} ≠ ${l.line_total}`);
  }
  if (inv.subtotal != null && Math.abs(sumLines - inv.subtotal) > 0.05) issues.push(`Line items add to ${sumLines.toFixed(2)} but subtotal is ${Number(inv.subtotal).toFixed(2)}`);
  const computed = (inv.subtotal ?? sumLines) - Math.abs(Number(inv.discount) || 0) + (Number(inv.tax) || 0) + (Number(inv.delivery) || 0);
  if (inv.total != null && Math.abs(computed - inv.total) > 0.05) issues.push(`Calculated total ${computed.toFixed(2)} ≠ invoice total ${Number(inv.total).toFixed(2)}`);
  if (inv.total == null) issues.push("Invoice total missing");
  return { sumLines, computed, issues };
}

export async function sha256(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Recompute an ingredient's current cost = latest approved purchase by invoice date. */
export async function refreshCurrentCost(ingredientId: string) {
  const { data } = await supabase.from("price_history").select("cost_per_base, invoice_date, invoice_id")
    .eq("ingredient_id", ingredientId).order("invoice_date", { ascending: false }).order("created_at", { ascending: false }).limit(1);
  const top = data?.[0];
  await supabase.from("ingredients").update(top
    ? { current_cost: top.cost_per_base, current_cost_date: top.invoice_date, current_cost_invoice_id: top.invoice_id }
    : { current_cost: null, current_cost_date: null, current_cost_invoice_id: null }).eq("id", ingredientId);
}

export type PriceChange = { ingredient_id: string; prev: number | null; next: number | null; becameCurrent: boolean };

export async function approveInvoice(inv: any, lines: InvLine[], ings: MatchIng[], userId: string): Promise<{ ok: boolean; errors: string[]; changes: PriceChange[] }> {
  const errors: string[] = [];
  if (!inv.invoice_date) errors.push("Invoice date is required");
  const pending = lines.filter((l) => l.match_status === "suggested");
  if (pending.length) errors.push(`${pending.length} line(s) still have unconfirmed suggestions`);
  const isCredit = inv.doc_type === "credit_note" || inv.doc_type === "return";
  const rows: any[] = [];
  const confirmed = lines.filter((l) => l.match_status === "confirmed" && l.ingredient_id);
  if (!isCredit) for (const l of confirmed) {
    const ing = ings.find((i) => i.id === l.ingredient_id);
    if (!ing) { errors.push(`"${l.description}": ingredient missing`); continue; }
    const c = lineUnitCost(l, ing);
    if (!c.ok) { errors.push(`"${l.description}": ${c.reason}`); continue; }
    rows.push({
      restaurant_id: inv.restaurant_id, ingredient_id: ing.id, invoice_id: inv.id, invoice_line_id: l.id, location_id: inv.location_id,
      vendor_name: inv.vendor_name, invoice_date: inv.invoice_date, cost_per_base: c.costPerBase, base_unit: ing.base_unit,
      pack_description: describePack(l.pack_count, l.pack_size, l.pack_unit), pack_base_qty: c.baseQty,
    });
  }
  if (errors.length) return { ok: false, errors, changes: [] };

  const before = new Map(ings.map((i) => [i.id, i.current_cost]));
  if (rows.length) { const { error } = await supabase.from("price_history").insert(rows); if (error) return { ok: false, errors: [error.message], changes: [] }; }
  const touched = [...new Set(rows.map((r) => r.ingredient_id))];
  for (const id of touched) await refreshCurrentCost(id);
  const { data: after } = touched.length ? await supabase.from("ingredients").select("id, current_cost, current_cost_invoice_id").in("id", touched) : { data: [] as any[] };

  // Learn vendor-specific aliases from confirmed matches
  const aliasRows = confirmed.map((l) => ({ restaurant_id: inv.restaurant_id, ingredient_id: l.ingredient_id!, vendor_name: inv.vendor_name, alias: l.description, product_code: l.product_code }));
  if (aliasRows.length) {
    const { data: existing } = await supabase.from("ingredient_aliases").select("ingredient_id, alias, vendor_name").eq("restaurant_id", inv.restaurant_id);
    const key = (a: any) => `${a.ingredient_id}|${norm(a.alias)}|${norm(a.vendor_name)}`;
    const have = new Set((existing || []).map(key));
    const fresh = aliasRows.filter((a) => !have.has(key(a)));
    if (fresh.length) await supabase.from("ingredient_aliases").insert(fresh);
  }
  await supabase.from("invoices").update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() }).eq("id", inv.id);
  return {
    ok: true, errors: [],
    changes: (after || []).map((a: any) => ({ ingredient_id: a.id, prev: before.get(a.id) ?? null, next: a.current_cost, becameCurrent: a.current_cost_invoice_id === inv.id })),
  };
}

export const STATUS_LABEL: Record<string, string> = { uploaded: "Uploaded", extracting: "Reading…", review: "Needs review", approved: "Approved", failed: "Extraction failed", rejected: "Rejected" };
export const DOC_LABEL: Record<string, string> = { invoice: "Invoice", credit_note: "Credit note", return: "Return", corrected_invoice: "Corrected invoice" };
export { UNITS };
