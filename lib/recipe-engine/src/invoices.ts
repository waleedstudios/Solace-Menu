import { isUnit, UNITS, toBase } from "./units";

export type InvLine = {
  id: string; invoice_id: string; restaurant_id: string; position: number; description: string; product_code: string | null;
  quantity: number | null; pack_count: number | null; pack_size: number | null; pack_unit: string | null;
  unit_price: number | null; line_total: number | null; uncertain: boolean; uncertain_note: string | null;
  match_status: string; ingredient_id: string | null; match_confidence: number | null; match_reason: string | null;
};
export type Alias = { ingredient_id: string; vendor_name: string | null; alias: string; product_code: string | null };
export type MatchIng = { id: string; name: string; brand: string | null; supplier_code: string | null; base_unit: string; pack_count: number | null; pack_size: number | null; pack_unit: string | null; density_g_per_ml: number | null; current_cost: number | null; current_cost_date: string | null };
export type InvoiceDetails = {
  id: string; restaurant_id: string; location_id: string | null; vendor_name: string | null; invoice_number: string | null;
  invoice_date: string | null; doc_type: string; status: string; subtotal: number | null; discount: number | null;
  tax: number | null; delivery: number | null; total: number | null; uncertain_fields: string[]; file_paths: string[];
  file_hash: string | null; extraction_error: string | null; corrects_invoice_id: string | null; created_at: string;
};
export const norm = (s: string | null | undefined) => (s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => new Set(norm(s).split(" ").filter(t => t.length > 1));
export function describePack(count?: number | null, size?: number | null, unit?: string | null) {
  if (!size || !unit) return "Pack size unknown";
  const label = isUnit(unit) ? UNITS[unit].label : unit;
  return count && count > 1 ? `${count} × ${size} ${label}` : `${size} ${label}`;
}
export function suggestMatch(line: Pick<InvLine, "description" | "product_code" | "pack_count" | "pack_size" | "pack_unit">, vendor: string | null, ingredients: MatchIng[], aliases: Alias[]) {
  const v = norm(vendor), code = norm(line.product_code), desc = norm(line.description);
  // Store candidates rather than mutating a closure variable, so TS can narrow the winner.
  const candidates: { ingredient_id: string; confidence: number; reason: string }[] = [];
  const consider = (id: string, confidence: number, reason: string) => {
    if (ingredients.some(i => i.id === id)) candidates.push({ ingredient_id: id, confidence, reason });
  };
  for (const a of aliases) {
    const sameVendor = !!v && norm(a.vendor_name) === v;
    if (code && norm(a.product_code) === code) consider(a.ingredient_id, sameVendor ? .97 : .85, `Product code confirmed before${sameVendor ? ` for ${vendor}` : " (different vendor)"}`);
    if (desc && norm(a.alias) === desc) consider(a.ingredient_id, sameVendor ? .92 : .75, `Description confirmed before${sameVendor ? ` for ${vendor}` : " (different vendor)"}`);
  }
  const lt = tokens(line.description);
  for (const i of ingredients) {
    if (code && norm(i.supplier_code) === code) consider(i.id, .9, `Matches supplier code on ${i.name}`);
    const it = tokens(`${i.name} ${i.brand || ""}`), inter = [...lt].filter(t => it.has(t)).length;
    const j = inter / Math.max(1, new Set([...lt, ...it]).size);
    if (j >= .2) consider(i.id, Math.min(.7, .3 + j), `Name similarity with "${i.name}" — please confirm`);
  }
  const best = candidates.sort((a, b) => b.confidence - a.confidence)[0];
  if (!best) return null;
  const ing = ingredients.find(i => i.id === best.ingredient_id)!;
  if ((ing.pack_size && line.pack_size && (ing.pack_count ?? 1) * ing.pack_size !== (line.pack_count ?? 1) * line.pack_size) ||
      (ing.pack_unit && line.pack_unit && ing.pack_unit !== line.pack_unit)) {
    best.confidence = Math.min(best.confidence, .6);
    best.reason += `. Pack differs: catalog ${describePack(ing.pack_count, ing.pack_size, ing.pack_unit)} vs invoice ${describePack(line.pack_count, line.pack_size, line.pack_unit)}`;
  }
  return best;
}
export function lineUnitCost(line: InvLine, ing: MatchIng): { ok: true; costPerBase: number; baseQty: number; explain: string; reason?: undefined } | { ok: false; reason: string } {
  if (!isUnit(line.pack_unit) || !line.pack_size || line.pack_size <= 0) return { ok: false, reason: "Pack size/unit missing or invalid" };
  if (line.pack_count != null && (!Number.isFinite(line.pack_count) || line.pack_count <= 0)) return { ok: false, reason: "Units per pack must be positive" };
  if (line.quantity != null && (!Number.isFinite(line.quantity) || line.quantity <= 0)) return { ok: false, reason: "Quantity must be positive" };
  const per = line.unit_price ?? (line.line_total != null && line.quantity ? line.line_total / line.quantity : null);
  if (per == null || !Number.isFinite(per) || per < 0) return { ok: false, reason: "Unit price missing or invalid" };
  const conv = toBase((line.pack_count ?? 1) * line.pack_size, line.pack_unit, ing.base_unit, ing.density_g_per_ml);
  if (conv.ok === false) return { ok: false, reason: conv.reason };
  const cost = per / conv.value;
  if (conv.value <= 0 || !Number.isFinite(cost)) return { ok: false, reason: "Pack quantity is invalid" };
  return { ok: true, costPerBase: cost, baseQty: conv.value,
    explain: `${describePack(line.pack_count, line.pack_size, line.pack_unit)} = ${conv.value.toFixed(2)} ${ing.base_unit} → $${cost.toFixed(5)}/${ing.base_unit}` };
}
export function totalsCheck(inv: Pick<InvoiceDetails, "subtotal" | "discount" | "tax" | "delivery" | "total">, lines: InvLine[]) {
  const sumLines = lines.reduce((a, l) => a + (Number(l.line_total) || 0), 0), issues: string[] = [];
  for (const l of lines) {
    if (l.line_total == null) issues.push(`"${l.description}": line total missing`);
    if (l.quantity != null && l.unit_price != null && l.line_total != null && Math.abs(l.quantity * l.unit_price - l.line_total) > .02)
      issues.push(`"${l.description}": ${l.quantity} × ${l.unit_price} ≠ ${l.line_total}`);
  }
  if (inv.subtotal != null && Math.abs(sumLines - inv.subtotal) > .05) issues.push(`Line items add to ${sumLines.toFixed(2)} but subtotal is ${Number(inv.subtotal).toFixed(2)}`);
  const computed = (inv.subtotal ?? sumLines) - Math.abs(Number(inv.discount) || 0) + (Number(inv.tax) || 0) + (Number(inv.delivery) || 0);
  if (inv.total != null && Math.abs(computed - inv.total) > .05) issues.push(`Calculated total ${computed.toFixed(2)} ≠ invoice total ${Number(inv.total).toFixed(2)}`);
  if (inv.total == null) issues.push("Invoice total missing");
  return { sumLines, computed, issues };
}
export const STATUS_LABEL: Record<string, string> = { uploaded: "Uploaded", extracting: "Reading…", review: "Needs review", approved: "Approved", failed: "Extraction failed", rejected: "Rejected" };
export const DOC_LABEL: Record<string, string> = { invoice: "Invoice", credit_note: "Credit note", return: "Return", corrected_invoice: "Corrected invoice" };
