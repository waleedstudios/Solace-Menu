import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { dataApi as supabase } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant, loadCostCtx } from "@/hooks/useRestaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, History, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { computeRecipe, type Ctx } from "@/lib/costing";
import { UNIT_LIST, UNITS, money } from "@/lib/units";

const n = (v: any) => (String(v ?? "").trim() === "" ? null : Number(v));

const RecipeDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { restaurant } = useRestaurant();
  const navigate = useNavigate();
  const [ctx, setCtx] = useState<(Ctx & { recipeList: any[]; ingredientList: any[] }) | null>(null);
  const [r, setR] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [add, setAdd] = useState({ ref: "", quantity: "", unit: "g" });
  const [showHist, setShowHist] = useState(false);

  const load = async () => {
    if (!restaurant || !id) return;
    const c = await loadCostCtx(restaurant.id);
    setCtx(c);
    setR(c.recipeList.find((x) => x.id === id) || null);
    const { data } = await supabase.from("recipe_versions").select("*").eq("recipe_id", id).order("version", { ascending: false });
    setVersions(data || []);
  };
  useEffect(() => { load(); }, [id, restaurant?.id]);

  const liveCtx = useMemo(() => (ctx && r ? { ...ctx, recipes: new Map(ctx.recipes).set(r.id, r) } : null), [ctx, r]);
  const res = useMemo(() => (liveCtx && r ? computeRecipe(r.id, liveCtx) : null), [liveCtx, r]);
  if (!ctx || !r || !res) return <p className="text-muted-foreground">Loading…</p>;

  const snapshot = (lines = ctx.lines.filter((l) => l.recipe_id === r.id)) => ({
    recipe: { name: r.name, category: r.category, batch_yield_qty: r.batch_yield_qty, batch_yield_unit: r.batch_yield_unit, servings_per_batch: r.servings_per_batch, packaging_cost: r.packaging_cost, selling_price: r.selling_price },
    lines: lines.map((l) => ({ ingredient_id: l.ingredient_id, sub_recipe_id: l.sub_recipe_id, quantity: l.quantity, unit: l.unit })),
    cost: { total_per_item: res.totalPerItem, complete: res.costComplete, method: "latest approved purchase by invoice date" },
  });
  const bump = async () => {
    await supabase.from("recipe_versions").insert({ recipe_id: r.id, restaurant_id: r.restaurant_id, version: r.version, snapshot: snapshot() as any, created_by: user?.id });
    return r.version + 1;
  };

  const saveRecipe = async () => {
    const version = await bump();
    const { error } = await supabase.from("recipes").update({
      name: r.name, category: r.category || null, batch_yield_qty: n(r.batch_yield_qty) ?? 1, batch_yield_unit: r.batch_yield_unit,
      servings_per_batch: n(r.servings_per_batch) ?? 1, serving_size_text: r.serving_size_text || null, packaging_cost: n(r.packaging_cost) ?? 0,
      selling_price: n(r.selling_price), instructions: r.instructions || null, version,
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(`Saved as version ${version}`); load();
  };

  const addLine = async () => {
    if (!add.ref || !(Number(add.quantity) > 0)) return toast.error("Pick an ingredient and enter a quantity");
    const [kind, refId] = add.ref.split(":");
    if (kind === "r" && refId === r.id) return toast.error("A recipe can't contain itself");
    const pos = ctx.lines.filter((l) => l.recipe_id === r.id).length;
    const { error } = await supabase.from("recipe_lines").insert({ recipe_id: r.id, ingredient_id: kind === "i" ? refId : null, sub_recipe_id: kind === "r" ? refId : null, quantity: Number(add.quantity), unit: add.unit, position: pos });
    if (error) return toast.error(error.message);
    const version = await bump();
    await supabase.from("recipes").update({ version }).eq("id", r.id);
    setAdd({ ref: "", quantity: "", unit: "g" }); load();
  };
  const removeLine = async (lid: string) => {
    await supabase.from("recipe_lines").delete().eq("id", lid);
    const version = await bump(); await supabase.from("recipes").update({ version }).eq("id", r.id); load();
  };
  const del = async () => {
    if (!confirm("Delete this recipe?")) return;
    const { error } = await supabase.from("recipes").delete().eq("id", r.id);
    if (error) return toast.error("This is used as a sub-recipe elsewhere — remove it there first.");
    navigate("/dashboard/recipes");
  };

  const F = (k: string, label: string, props: any = {}) => (
    <div className="space-y-1"><Label className="text-xs">{label}</Label><Input value={r[k] ?? ""} onChange={(e) => setR({ ...r, [k]: e.target.value })} {...props} /></div>
  );
  const sn = res.servingNutrition;

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" asChild><Link to="/dashboard/recipes"><ArrowLeft /> Recipes</Link></Button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Input className="font-display text-3xl h-auto border-none px-0 shadow-none focus-visible:ring-0" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} />
          <p className="text-xs text-muted-foreground">{r.is_subrecipe ? "Sub-recipe" : "Menu recipe"} · version {r.version} · last updated {new Date(r.updated_at).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowHist(!showHist)}><History /> History ({versions.length})</Button>
          <Button variant="ghost" onClick={del}><Trash2 /></Button>
          <Button onClick={saveRecipe}><Save /> Save</Button>
        </div>
      </div>

      {showHist && <div className="rounded-2xl border border-border bg-card p-4 text-sm space-y-1">
        {versions.length ? versions.map((v) => <p key={v.id}>v{v.version} · {new Date(v.created_at).toLocaleString()} · {v.snapshot.lines.length} lines · cost then {money(v.snapshot.cost.total_per_item)}{!v.snapshot.cost.complete && " (incomplete)"}</p>) : <p className="text-muted-foreground">No earlier versions.</p>}
      </div>}

      <div className="grid xl:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {F("category", "Category")}
            {F("batch_yield_qty", "Batch yield", { type: "number" })}
            <div className="space-y-1"><Label className="text-xs">Yield unit</Label>
              <select className="w-full h-10 border border-input rounded-md bg-background px-2 text-sm" value={r.batch_yield_unit} onChange={(e) => setR({ ...r, batch_yield_unit: e.target.value })}>
                {UNIT_LIST.map((u) => <option key={u} value={u}>{UNITS[u].label}</option>)}</select></div>
            {F("servings_per_batch", "Servings per batch", { type: "number" })}
            {F("serving_size_text", "Serving size")}
            {!r.is_subrecipe && <>{F("packaging_cost", "Packaging $/item", { type: "number", step: "0.01" })}{F("selling_price", "Menu price $", { type: "number", step: "0.01" })}</>}
            <div className="col-span-2 sm:col-span-4 space-y-1"><Label className="text-xs">Preparation notes (optional)</Label>
              <Textarea rows={3} value={r.instructions ?? ""} onChange={(e) => setR({ ...r, instructions: e.target.value })} /></div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="font-medium">Ingredients</p>
            {res.lines.map(({ line, name, cost, issues }) => (
              <div key={line.id} className="flex items-center justify-between gap-2 py-2 border-b border-border text-sm">
                <div className="min-w-0"><p className="truncate">{name}</p><p className="text-xs text-muted-foreground">{Number(line.quantity)} {UNITS[line.unit as keyof typeof UNITS]?.label || line.unit}{issues.length > 0 && <span className="text-amber-600"> · {issues.join(", ")}</span>}</p></div>
                <div className="flex items-center gap-2"><span className="tabular-nums">{cost != null ? money(cost, 3) : "—"}</span><button onClick={() => removeLine(line.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_90px_110px_auto] gap-2 pt-2">
              <select className="h-10 border border-input rounded-md bg-background px-2 text-sm min-w-0" value={add.ref} onChange={(e) => {
                const [k, rid] = e.target.value.split(":");
                const base = k === "i" ? ctx.ingredients.get(rid)?.base_unit : ctx.recipes.get(rid)?.batch_yield_unit;
                setAdd({ ...add, ref: e.target.value, unit: base || add.unit });
              }}>
                <option value="">Add ingredient or sub-recipe…</option>
                <optgroup label="Ingredients">{ctx.ingredientList.map((i) => <option key={i.id} value={`i:${i.id}`}>{i.name}{i.brand ? ` · ${i.brand}` : ""}</option>)}</optgroup>
                <optgroup label="Sub-recipes">{ctx.recipeList.filter((x) => x.is_subrecipe && x.id !== r.id).map((x) => <option key={x.id} value={`r:${x.id}`}>{x.name}</option>)}</optgroup>
              </select>
              <Input type="number" placeholder="Qty" value={add.quantity} onChange={(e) => setAdd({ ...add, quantity: e.target.value })} />
              <select className="h-10 border border-input rounded-md bg-background px-2 text-sm" value={add.unit} onChange={(e) => setAdd({ ...add, unit: e.target.value })}>
                {UNIT_LIST.map((u) => <option key={u} value={u}>{UNITS[u].label}</option>)}</select>
              <Button onClick={addLine}><Plus /></Button>
            </div>
            <p className="text-xs text-muted-foreground">Enter the usable (as-used) amount. Trim loss from each ingredient's yield is added to cost automatically.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-2 text-sm">
            <div className="flex justify-between"><p className="font-medium">Cost</p>{res.costComplete ? <Badge>Complete</Badge> : <Badge variant="outline" className="text-amber-600 border-amber-500/50">Incomplete</Badge>}</div>
            <Row k="Batch cost" v={money(res.batchCost)} />
            <Row k="Cost per serving" v={money(res.servingCost)} />
            {!r.is_subrecipe && <>
              <Row k="Packaging" v={money(res.packaging)} />
              <Row k="Food + packaging per item" v={money(res.totalPerItem)} strong />
              <Row k="Food-cost %" v={res.foodCostPct != null ? `${res.foodCostPct.toFixed(1)}%` : "Set a price"} />
              <Row k="Contribution before labor & overhead" v={money(res.contribution)} />
              <p className="text-xs text-muted-foreground">Contribution is not net profit — labor, overhead and payment fees aren't included.</p>
            </>}
            {!res.costComplete && <div className="text-xs text-amber-600 space-y-0.5 pt-2">{res.costIssues.map((s) => <p key={s}>⚠ {s}</p>)}<p>Totals above are partial, not verified.</p></div>}
            <p className="text-xs text-muted-foreground pt-1">Costing method: latest approved purchase by invoice date.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 space-y-2 text-sm">
            <p className="font-medium">Nutrition per serving <span className="text-xs text-muted-foreground font-normal">(calculated estimate)</span></p>
            <Row k="Calories" v={`${Math.round(sn.calories)} kcal`} /><Row k="Protein" v={`${sn.protein.toFixed(1)} g`} /><Row k="Carbs" v={`${sn.carbs.toFixed(1)} g`} />
            <Row k="Fat" v={`${sn.fats.toFixed(1)} g`} /><Row k="Sat fat" v={`${sn.sat_fat.toFixed(1)} g`} /><Row k="Fiber" v={`${sn.fiber.toFixed(1)} g`} />
            <Row k="Sugars / added" v={`${sn.sugar.toFixed(1)} / ${sn.added_sugar.toFixed(1)} g`} /><Row k="Sodium" v={`${Math.round(sn.sodium_mg)} mg`} />
            {!res.nutritionComplete && <div className="text-xs text-amber-600 pt-1">{res.nutritionIssues.map((s) => <p key={s}>⚠ {s}</p>)}<p>Missing values are excluded, not counted as zero — totals are understated.</p></div>}
            {res.estimatedNutrition && <p className="text-xs text-muted-foreground">Includes estimated (non-label) values.</p>}
            <p className="text-xs text-muted-foreground">Based on ingredient data; rounding and cooking methods affect accuracy. Not lab-tested. Allergens are tracked separately.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
  <div className={`flex justify-between gap-2 ${strong ? "font-semibold" : ""}`}><span className="text-muted-foreground">{k}</span><span className="tabular-nums text-right">{v}</span></div>
);
export default RecipeDetail;
