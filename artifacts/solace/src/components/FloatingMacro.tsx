import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "calories" | "protein" | "carbs" | "fats";

const STYLES: Record<Variant, string> = {
  calories: "bg-macro-calories/10 text-macro-calories ring-macro-calories/20",
  protein: "bg-macro-protein/10 text-macro-protein ring-macro-protein/20",
  carbs: "bg-macro-carbs/15 text-macro-carbs ring-macro-carbs/25",
  fats: "bg-macro-fats/10 text-macro-fats ring-macro-fats/20",
};

/**
 * A single floating macro pill that drifts based on a 0..1 scroll progress.
 * Designed for the landing hero parallax effect.
 */
export function FloatingMacro({
  variant,
  label,
  progress,
  from,
  to,
  rotate = 0,
  className,
  delay = 0,
}: {
  variant: Variant;
  label: string;
  progress: number;
  /** start position (top/left % within parent) */
  from: { x: number; y: number };
  /** end offset in pixels (added to start) */
  to: { x: number; y: number };
  rotate?: number;
  className?: string;
  delay?: number;
}) {
  // Apply per-pill delay window so they don't all move in lockstep
  const local = Math.max(0, Math.min(1, (progress - delay) / (1 - delay || 1)));
  const tx = to.x * local;
  const ty = to.y * local;
  const rot = rotate * local;
  const scale = 1 + 0.15 * local;
  const opacity = 1 - 0.1 * local;

  return (
    <div
      className={cn(
        "absolute pointer-events-none transition-none will-change-transform",
        className
      )}
      style={{
        left: `${from.x}%`,
        top: `${from.y}%`,
        transform: `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg) scale(${scale})`,
        opacity,
      }}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 backdrop-blur-md tabular-nums shadow-md-soft bg-card/95",
          STYLES[variant]
        )}
      >
        {variant === "calories" && <Flame className="h-3.5 w-3.5" strokeWidth={2.5} />}
        {label}
      </span>
    </div>
  );
}
