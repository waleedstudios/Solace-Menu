// Conversion constants are shared with server-side public nutrition.
export * from "@workspace/recipe-engine/units";
import { isUnit, UNITS } from "@workspace/recipe-engine/units";

export function packBaseQty(packCount: number | null | undefined, packSize: number | null | undefined, packUnit: string | null | undefined): number | null {
  if (!isUnit(packUnit) || !packSize || packSize <= 0) return null;
  return (packCount && packCount > 0 ? packCount : 1) * packSize * UNITS[packUnit].toBase;
}
export function describePack(packCount?: number | null, packSize?: number | null, packUnit?: string | null) {
  if (!packSize || !packUnit) return "Pack size unknown";
  const u = isUnit(packUnit) ? UNITS[packUnit].label : packUnit;
  return packCount && packCount > 1 ? `${packCount} × ${packSize} ${u}` : `${packSize} ${u}`;
}
export const baseLabel = (b: string) => b === "g" ? "g" : b === "ml" ? "ml" : "each";
export function displayUnitCost(costPerBase: number, base: string) {
  if (base === "g") return { value: costPerBase * 453.59237, unit: "lb" };
  if (base === "ml") return { value: costPerBase * 1000, unit: "L" };
  return { value: costPerBase, unit: "each" };
}
export const money = (n: number | null | undefined, d = 2) =>
  n == null || !isFinite(n) ? "—" : n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: d, maximumFractionDigits: d });
