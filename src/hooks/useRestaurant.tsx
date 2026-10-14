import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { computeRecipe, type Ctx, type CostIngredient, type CostLine, type CostRecipe } from "@/lib/costing";

export type Role = "owner" | "manager" | "staff";
type Restaurant = { id: string; name: string; price_alert_threshold_pct: number; invoice_retention_days: number | null };
type Location = { id: string; name: string };
type Value = {
  restaurant: Restaurant | null; role: Role | null; locations: Location[];
  canManage: boolean; isOwner: boolean; loading: boolean; reload: () => void;
  memberships: { restaurant_id: string; role: Role; name: string }[]; switchTo: (id: string) => void;
};
const C = createContext<Value | null>(null);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<Value, "reload" | "switchTo" | "canManage" | "isOwner">>({ restaurant: null, role: null, locations: [], loading: true, memberships: [] });
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem("solace-restaurant"));

  const load = useCallback(async () => {
    if (!user) return;
    const { data: mem } = await supabase.from("restaurant_members").select("restaurant_id, role, restaurants(name)").eq("user_id", user.id);
    const memberships = (mem || []).map((m: any) => ({ restaurant_id: m.restaurant_id, role: m.role, name: m.restaurants?.name ?? "Restaurant" }));
    const pick = memberships.find((m) => m.restaurant_id === activeId) || memberships[0];
    if (!pick) { setState({ restaurant: null, role: null, locations: [], loading: false, memberships }); return; }
    const [{ data: r }, { data: locs }] = await Promise.all([
      supabase.from("restaurants").select("id, name, price_alert_threshold_pct, invoice_retention_days").eq("id", pick.restaurant_id).maybeSingle(),
      supabase.from("locations").select("id, name").eq("restaurant_id", pick.restaurant_id).order("created_at"),
    ]);
    setState({ restaurant: r as any, role: pick.role, locations: locs || [], loading: false, memberships });
  }, [user, activeId]);

  useEffect(() => { load(); }, [load]);
  const switchTo = (id: string) => { localStorage.setItem("solace-restaurant", id); setActiveId(id); };
  return (
    <C.Provider value={{ ...state, reload: load, switchTo, canManage: state.role === "owner" || state.role === "manager", isOwner: state.role === "owner" }}>
      {children}
    </C.Provider>
  );
}
export function useRestaurant() {
  const v = useContext(C);
  if (!v) throw new Error("useRestaurant outside provider");
  return v;
}

/** Load everything the costing engine needs for one restaurant. */
export async function loadCostCtx(restaurantId: string): Promise<Ctx & { recipeList: (CostRecipe & { category: string | null; is_subrecipe: boolean; updated_at: string; version: number })[]; ingredientList: any[] }> {
  const [{ data: ings }, { data: recs }] = await Promise.all([
    supabase.from("ingredients").select("*").eq("restaurant_id", restaurantId).order("name"),
    supabase.from("recipes").select("*").eq("restaurant_id", restaurantId).order("name"),
  ]);
  const ids = (recs || []).map((r) => r.id);
  const { data: lines } = ids.length ? await supabase.from("recipe_lines").select("*").in("recipe_id", ids).order("position") : { data: [] as any[] };
  const ctx: Ctx = {
    ingredients: new Map((ings || []).map((i: any) => [i.id, i as CostIngredient])),
    recipes: new Map((recs || []).map((r: any) => [r.id, r as CostRecipe])),
    lines: (lines || []) as CostLine[],
  };
  syncPublicMacros(recs || [], ctx);
  return {
    ingredients: new Map((ings || []).map((i: any) => [i.id, i as CostIngredient])),
    recipes: new Map((recs || []).map((r: any) => [r.id, r as CostRecipe])),
    lines: (lines || []) as CostLine[],
    recipeList: (recs || []) as any,
    ingredientList: ings || [],
  };
}

/** Keep the public menu's macros in step with recipe nutrition. Incomplete nutrition is published as null (never zero). */
function syncPublicMacros(recs: any[], ctx: Ctx) {
  for (const r of recs) {
    if (r.is_subrecipe) continue;
    const res = computeRecipe(r.id, ctx);
    const n = res.servingNutrition;
    const next = res.nutritionComplete ? { calories: n.calories, protein: n.protein, carbs: n.carbs, fats: n.fats } : null;
    if (JSON.stringify(next) !== JSON.stringify(r.public_macros ?? null)) {
      supabase.from("recipes").update({ public_macros: next as any }).eq("id", r.id).then(() => {});
    }
  }
}
