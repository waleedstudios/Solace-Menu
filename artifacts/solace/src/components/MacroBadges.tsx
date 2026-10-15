import { Macros, fmt, fmt1 } from "@/lib/macros";
import { Flame } from "lucide-react";

const SWATCH = {
  calories: { bg: "bg-macro-calories/10", text: "text-macro-calories", label: "kcal" },
  protein:  { bg: "bg-macro-protein/10",  text: "text-macro-protein",  label: "P" },
  carbs:    { bg: "bg-macro-carbs/15",    text: "text-macro-carbs",    label: "C" },
  fats:     { bg: "bg-macro-fats/10",     text: "text-macro-fats",     label: "F" },
};

export function MacroBadges({ macros, size = "sm" }: { macros: Macros; size?: "sm" | "lg" }) {
  const big = size === "lg";
  return (
    <div className={`flex flex-wrap ${big ? "gap-3" : "gap-1.5"}`}>
      <span className={`macro-pill ${SWATCH.calories.bg} ${SWATCH.calories.text} ${big ? "px-4 py-2 text-sm" : ""}`}>
        <Flame className={big ? "h-4 w-4" : "h-3 w-3"} strokeWidth={2.5} />
        {fmt(macros.calories)} {SWATCH.calories.label}
      </span>
      <span className={`macro-pill ${SWATCH.protein.bg} ${SWATCH.protein.text} ${big ? "px-4 py-2 text-sm" : ""}`}>
        {fmt1(macros.protein)}g {SWATCH.protein.label}
      </span>
      <span className={`macro-pill ${SWATCH.carbs.bg} ${SWATCH.carbs.text} ${big ? "px-4 py-2 text-sm" : ""}`}>
        {fmt1(macros.carbs)}g {SWATCH.carbs.label}
      </span>
      <span className={`macro-pill ${SWATCH.fats.bg} ${SWATCH.fats.text} ${big ? "px-4 py-2 text-sm" : ""}`}>
        {fmt1(macros.fats)}g {SWATCH.fats.label}
      </span>
    </div>
  );
}
