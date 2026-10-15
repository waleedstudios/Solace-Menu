// Unit system. Base units: mass → g, volume → ml, count → each.
// Weight ounces (oz) and fluid ounces (fl_oz) are different dimensions and never interchangeable.
export type Dim = "mass" | "volume" | "count";
export type Unit = "g" | "kg" | "oz" | "lb" | "ml" | "l" | "fl_oz" | "gal" | "each" | "dozen";

export const UNITS: Record<Unit, { dim: Dim; toBase: number; label: string }> = {
  g: { dim: "mass", toBase: 1, label: "g" },
  kg: { dim: "mass", toBase: 1000, label: "kg" },
  oz: { dim: "mass", toBase: 28.349523125, label: "oz (weight)" },
  lb: { dim: "mass", toBase: 453.59237, label: "lb" },
  ml: { dim: "volume", toBase: 1, label: "ml" },
  l: { dim: "volume", toBase: 1000, label: "L" },
  fl_oz: { dim: "volume", toBase: 29.5735295625, label: "fl oz" },
  gal: { dim: "volume", toBase: 3785.411784, label: "gal (US)" },
  each: { dim: "count", toBase: 1, label: "each" },
  dozen: { dim: "count", toBase: 12, label: "dozen" },
};
export const UNIT_LIST = Object.keys(UNITS) as Unit[];
export const BASE_OF: Record<Dim, Unit> = { mass: "g", volume: "ml", count: "each" };

export const isUnit = (u: unknown): u is Unit => typeof u === "string" && u in UNITS;
export const dimOf = (u: string): Dim | null => (isUnit(u) ? UNITS[u].dim : null);

export type ConvResult = { ok: true; value: number; reason?: undefined } | { ok: false; reason: string };

/**
 * Convert qty of `from` into the base unit of `targetBase` (g, ml or each).
 * Cross mass↔volume only with a verified density (g per ml). Count never converts.
 */
export function toBase(qty: number, from: string, targetBase: string, densityGPerMl?: number | null): ConvResult {
  if (!isUnit(from) || !isUnit(targetBase)) return { ok: false, reason: `Unknown unit "${from}"` };
  const f = UNITS[from], t = UNITS[targetBase];
  const base = qty * f.toBase;
  if (f.dim === t.dim) return { ok: true, value: base / t.toBase };
  if (f.dim !== "count" && t.dim !== "count" && densityGPerMl && densityGPerMl > 0) {
    if (f.dim === "volume" && t.dim === "mass") return { ok: true, value: base * densityGPerMl };
    if (f.dim === "mass" && t.dim === "volume") return { ok: true, value: base / densityGPerMl };
  }
  return { ok: false, reason: `Needs a verified ${f.dim}→${t.dim} conversion (${from} → ${targetBase})` };
}

/** Total base quantity of one purchase unit: pack_count × pack_size × unit factor. */
export function packBaseQty(packCount: number | null | undefined, packSize: number | null | undefined, packUnit: string | null | undefined): number | null {
  if (!isUnit(packUnit) || !packSize || packSize <= 0) return null;
  const c = packCount && packCount > 0 ? packCount : 1;
  return c * packSize * UNITS[packUnit].toBase;
}

export function describePack(packCount?: number | null, packSize?: number | null, packUnit?: string | null) {
  if (!packSize || !packUnit) return "Pack size unknown";
  const u = isUnit(packUnit) ? UNITS[packUnit].label : packUnit;
  return packCount && packCount > 1 ? `${packCount} × ${packSize} ${u}` : `${packSize} ${u}`;
}

export const baseLabel = (b: string) => (b === "g" ? "g" : b === "ml" ? "ml" : "each");
/** Human comparable cost, e.g. $/lb for mass, $/gal... we use per kg / per L / per each. */
export function displayUnitCost(costPerBase: number, base: string) {
  if (base === "g") return { value: costPerBase * 453.59237, unit: "lb" };
  if (base === "ml") return { value: costPerBase * 1000, unit: "L" };
  return { value: costPerBase, unit: "each" };
}
export const money = (n: number | null | undefined, d = 2) =>
  n == null || !isFinite(n) ? "—" : n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: d, maximumFractionDigits: d });
