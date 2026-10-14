import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant, loadCostCtx } from "@/hooks/useRestaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { computeRecipe, type RecipeResult } from "@/lib/costing";
import { money } from "@/lib/units";

const Recipes = () => {
  const { restaurant } = useRestaurant();
  const navigate = useNavigate();
  const [rows, setRows] = useState<{ r: any; res: RecipeResult }[]>([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"menu" | "sub">("menu");

  useEffect(() => {
    if (!restaurant) return;
    loadCostCtx(restaurant.id).then((ctx) => setRows(ctx.recipeList.map((r) => ({ r, res: computeRecipe(r.id, ctx) }))));
  }, [restaurant?.id]);

  const create = async () => {
    const name = prompt(tab === "sub" ? "Sub-recipe name (e.g. Spicy mayo)" : "Recipe name");
    if (!name?.trim() || !restaurant) return;
    const { data, error } = await supabase.from("recipes").insert({
      restaurant_id: restaurant.id, name: name.trim(), is_subrecipe: tab === "sub",
      batch_yield_unit: tab === "sub" ? "g" : "each", batch_yield_qty: tab === "sub" ? 1000 : 1,
    }).select("id").single();
    if (error) return toast.error(error.message);
    navigate(`/dashboard/recipes/${data!.id}`);
  };

  const list = useMemo(() => rows.filter(({ r }) => r.is_subrecipe === (tab === "sub") && `${r.name} ${r.category || ""}`.toLowerCase().includes(q.toLowerCase())), [rows, q, tab]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl">Recipes</h1>
          <p className="text-muted-foreground text-sm mt-1">Menu recipes and sub-recipes (sauces, dressings, prep mixes). Visible to owners and managers.</p>
        </div>
        <Button onClick={create}><Plus /> New {tab === "sub" ? "sub-recipe" : "recipe"}</Button>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="inline-flex rounded-lg border border-border p-1 bg-card">
          {(["menu", "sub"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm ${tab === t ? "bg-primary text-primary-foreground" : ""}`}>{t === "menu" ? "Menu items" : "Sub-recipes"}</button>)}
        </div>
        <div className="relative flex-1 min-w-[200px]"><Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" /><Input className="pl-9" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {!list.length ? <p className="text-sm text-muted-foreground text-center py-10">No {tab === "sub" ? "sub-recipes" : "recipes"} yet.</p> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map(({ r, res }) => (
            <Link key={r.id} to={`/dashboard/recipes/${r.id}`} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md-soft transition-shadow space-y-3">
              <div className="flex justify-between gap-2"><p className="font-display text-xl leading-tight">{r.name}</p>{!res.costComplete && <Badge variant="outline" className="text-amber-600 border-amber-500/50 shrink-0">Incomplete</Badge>}</div>
              <p className="text-xs text-muted-foreground">{r.category || "Uncategorized"} · v{r.version} · updated {new Date(r.updated_at).toLocaleDateString()}</p>
              {r.is_subrecipe ? <p className="text-sm">Batch {Number(r.batch_yield_qty)} {r.batch_yield_unit} · {money(res.batchCost)}{!res.costComplete && " (partial)"}</p> : (
                <div className="grid grid-cols-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Cost</p><p className="tabular-nums">{money(res.totalPerItem)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Price</p><p className="tabular-nums">{money(r.selling_price)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Food cost</p><p className="tabular-nums">{res.foodCostPct != null && res.costComplete ? `${res.foodCostPct.toFixed(1)}%` : "—"}</p></div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
export default Recipes;
