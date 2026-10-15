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
export const isUnit = (u: unknown): u is Unit => typeof u === "string" && Object.hasOwn(UNITS, u);
export const dimOf = (u: string): Dim | null => isUnit(u) ? UNITS[u].dim : null;
export type ConvResult = { ok: true; value: number; reason?: undefined } | { ok: false; reason: string };
export function toBase(qty: number, from: string, targetBase: string, density?: number | null): ConvResult {
  if (!isUnit(from) || !isUnit(targetBase)) return { ok: false, reason: `Unknown unit "${from}"` };
  if (!Number.isFinite(qty)) return { ok: false, reason: "Quantity must be finite" };
  const f = UNITS[from], t = UNITS[targetBase], base = qty * f.toBase;
  if (f.dim === t.dim) return { ok: true, value: base / t.toBase };
  if (f.dim !== "count" && t.dim !== "count" && density && density > 0 && Number.isFinite(density)) {
    return { ok: true, value: f.dim === "volume" ? base * density : base / density };
  }
  return { ok: false, reason: `Needs a verified ${f.dim}→${t.dim} conversion (${from} → ${targetBase})` };
}
