import type React from "react";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { dataApi as supabase } from "@/lib/data";
import { useAuth } from "./useAuth";
import { type Ctx, type CostIngredient, type CostLine, type CostRecipe } from "@/lib/costing";

export type Role = "owner" | "manager" | "staff";
type Restaurant = { id: string; name: string; price_alert_threshold_pct: number; invoice_retention_days: number | null };
type Location = { id: string; name: string };
type Value = {
  restaurant: Restaurant | null; role: Role | null; locations: Location[];
  canManage: boolean; isOwner: boolean; loading: boolean; reload: () => void;
  memberships: { restaurant_id: string; role: Role; name: string }[]; switchTo: (id: string) => void;
  error: string | null;
};
// Keep one context instance across hot reloads so provider and consumers never mismatch.
const C: React.Context<Value | null> = ((globalThis as any).__solaceRestaurantCtx ??= createContext<Value | null>(null));

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<Value, "reload" | "switchTo" | "canManage" | "isOwner">>({ restaurant: null, role: null, locations: [], loading: true, memberships: [], error: null });
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem("solace-restaurant"));

  const load = useCallback(async () => {
    if (!user) return;
    const { data: mem, error } = await supabase.from("restaurant_members").select("restaurant_id, role, restaurants(name)").eq("user_id", user.id);
    if (error) { setState({ restaurant: null, role: null, locations: [], loading: false, memberships: [], error: error.message }); return; }
    const memberships = (mem || []).map((m: any) => ({ restaurant_id: m.restaurant_id, role: m.role, name: m.restaurants?.name ?? "Restaurant" }));
    const pick = memberships.find((m) => m.restaurant_id === activeId) || memberships[0];
    if (!pick) { setState({ restaurant: null, role: null, locations: [], loading: false, memberships, error: null }); return; }
    const [{ data: r, error: restaurantError }, { data: locs, error: locationError }] = await Promise.all([
      supabase.from("restaurants").select("id, name, price_alert_threshold_pct, invoice_retention_days").eq("id", pick.restaurant_id).maybeSingle(),
      supabase.from("locations").select("id, name").eq("restaurant_id", pick.restaurant_id).order("created_at"),
    ]);
    setState({ restaurant: r as any, role: pick.role, locations: locs || [], loading: false, memberships, error: restaurantError?.message || locationError?.message || null });
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
  const known = new Set((ings || []).map(i => i.id));
  const referenced = [...new Set((lines || []).map(l => l.ingredient_id).filter(id => id && !known.has(id)))];
  const { data: referencedIngredients } = referenced.length
    ? await supabase.from("ingredients").select("*").in("id", referenced) : { data: [] as any[] };
  const ingredientList = [...(ings || []), ...(referencedIngredients || [])];
  const ctx: Ctx = {
    ingredients: new Map(ingredientList.map((i: any) => [i.id, i as CostIngredient])),
    recipes: new Map((recs || []).map((r: any) => [r.id, r as CostRecipe])),
    lines: (lines || []) as CostLine[],
  };
  return {
    ...ctx,
    recipeList: (recs || []) as any,
    ingredientList,
  };
}

