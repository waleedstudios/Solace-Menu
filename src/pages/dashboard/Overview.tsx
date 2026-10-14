import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant, loadCostCtx } from "@/hooks/useRestaurant";
import { Badge } from "@/components/ui/badge";
import { computeRecipe, recipesUsing } from "@/lib/costing";
import { money, displayUnitCost } from "@/lib/units";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

type Alert = { ingredient: any; prev: any; next: any; pct: number; sameVendor: boolean; packShrink: boolean; recipes: { name: string; delta: number }[] };

const Overview = () => {
  const { restaurant } = useRestaurant();
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    if (!restaurant) return;
    (async () => {
      const [{ data: invs }, { data: lines }, { data: hist }, ctx] = await Promise.all([
        supabase.from("invoices").select("id, status, vendor_name, invoice_number").eq("restaurant_id", restaurant.id),
        supabase.from("invoice_lines").select("id, invoice_id, description, match_status").eq("restaurant_id", restaurant.id).in("match_status", ["unmatched", "suggested"]),
        supabase.from("price_history").select("*").eq("restaurant_id", restaurant.id).order("invoice_date", { ascending: false }).order("created_at", { ascending: false }),
        loadCostCtx(restaurant.id),
      ]);
      const approvedIds = new Set((invs || []).filter((i) => i.status === "approved").map((i) => i.id));
      const thr = Number(restaurant.price_alert_threshold_pct) || 5;
      const byIng = new Map<string, any[]>();
      for (const h of hist || []) byIng.set(h.ingredient_id, [...(byIng.get(h.ingredient_id) || []), h]);
      const alerts: Alert[] = [];
      for (const [iid, hs] of byIng) {
        if (hs.length < 2) continue;
        const [next, prev] = hs;
        const pct = ((next.cost_per_base - prev.cost_per_base) / prev.cost_per_base) * 100;
        const sameVendor = (next.vendor_name || "") === (prev.vendor_name || "");
        const packShrink = sameVendor && next.pack_base_qty && prev.pack_base_qty && next.pack_base_qty < prev.pack_base_qty;
        if (Math.abs(pct) < thr && !packShrink) continue;
        const ing = ctx.ingredients.get(iid); if (!ing) continue;
        const recipes = recipesUsing(iid, ctx).filter((r) => !ctx.recipeList.find((x) => x.id === r)?.is_subrecipe).map((rid) => {
          const after = computeRecipe(rid, ctx).totalPerItem;
          const bctx = { ...ctx, ingredients: new Map(ctx.ingredients).set(iid, { ...ing, current_cost: prev.cost_per_base }) };
          return { name: ctx.recipes.get(rid)!.name, delta: after - computeRecipe(rid, bctx).totalPerItem };
        });
        alerts.push({ ingredient: ing, prev, next, pct, sameVendor, packShrink: !!packShrink, recipes });
      }
      const menu = ctx.recipeList.filter((r) => !r.is_subrecipe);
      const results = menu.map((r) => ({ r, res: computeRecipe(r.id, ctx) }));
      const months = new Map<string, number[]>();
      for (const h of hist || []) { const m = h.invoice_date.slice(0, 7); months.set(m, [...(months.get(m) || []), 1]); }
      // Spend trend from approved invoices by month
      const { data: approved } = await supabase.from("invoices").select("invoice_date, total, doc_type").eq("restaurant_id", restaurant.id).eq("status", "approved");
      const spend = new Map<string, number>();
      for (const a of approved || []) if (a.invoice_date) spend.set(a.invoice_date.slice(0, 7), (spend.get(a.invoice_date.slice(0, 7)) || 0) + Number(a.total || 0));
      const { data: sales } = await supabase.from("sales_lines").select("item_name, quantity, net_sales").eq("restaurant_id", restaurant.id).limit(20000);
      const { data: maps } = await supabase.from("sales_mappings").select("*").eq("restaurant_id", restaurant.id);
      const mm = new Map((maps || []).map((m) => [m.sales_item_name, m]));
      let net = 0, cost = 0;
      for (const s of sales || []) { const m = mm.get(s.item_name); if (m?.recipe_id) { net += Number(s.net_sales); cost += computeRecipe(m.recipe_id, ctx).totalPerItem * Number(s.quantity); } }
      setD({
        review: (invs || []).filter((i) => i.status === "review" || i.status === "failed"),
        unmatched: (lines || []).filter((l) => !approvedIds.has(l.invoice_id)),
        alerts,
        incomplete: results.filter((x) => !x.res.costComplete),
        missingNutrition: ctx.ingredientList.filter((i) => !i.nutrition_source),
        avgPct: (() => { const ok = results.filter((x) => x.res.costComplete && x.res.foodCostPct != null); return ok.length ? ok.reduce((a, x) => a + x.res.foodCostPct!, 0) / ok.length : null; })(),
        spend: [...spend.entries()].sort().map(([m, v]) => ({ m, v })),
        sales: sales?.length ? { net, cost } : null,
        empty: !ctx.ingredientList.length && !menu.length && !(invs || []).length,
      });
    })();
  }, [restaurant?.id]);

  if (!d) return <p className="text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="font-display text-4xl">Overview</h1><p className="text-muted-foreground text-sm mt-1">What needs your attention today.</p></div>
      {d.empty && <div className="rounded-2xl border border-border bg-card p-6 text-sm space-y-2">
        <p className="font-medium">Getting started</p>
        <p>1. <Link className="underline" to="/dashboard/invoices">Scan an invoice</Link> — ingredients and prices come from your real purchases.</p>
        <p>2. <Link className="underline" to="/dashboard/recipes">Build recipes</Link> from those ingredients to see cost per plate.</p>
        <p>3. <Link className="underline" to="/dashboard/sales">Import sales</Link> to see theoretical food cost and contribution.</p>
      </div>}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card k="Invoices to review" v={d.review.length} to="/dashboard/invoices" />
        <Card k="Unmatched lines" v={d.unmatched.length} to="/dashboard/invoices" />
        <Card k="Price alerts" v={d.alerts.length} />
        <Card k="Incomplete recipes" v={d.incomplete.length} to="/dashboard/recipes" />
        <Card k="Missing nutrition" v={d.missingNutrition.length} to="/dashboard/ingredients" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="font-medium">Ingredient price alerts <span className="text-xs text-muted-foreground font-normal">(±{Number(restaurant!.price_alert_threshold_pct)}% threshold)</span></p>
          {!d.alerts.length ? <p className="text-sm text-muted-foreground">Alerts appear once an ingredient has two approved purchases.</p> : d.alerts.map((a: Alert) => {
            const p = displayUnitCost(a.prev.cost_per_base, a.prev.base_unit), n = displayUnitCost(a.next.cost_per_base, a.next.base_unit);
            return <div key={a.ingredient.id} className="text-sm border-b border-border pb-3 space-y-1">
              <div className="flex justify-between gap-2"><span className="font-medium">{a.ingredient.name}</span><Badge variant="outline" className={a.pct > 0 ? "text-destructive border-destructive/40" : "text-accent-foreground"}>{a.pct > 0 ? "+" : ""}{a.pct.toFixed(1)}%</Badge></div>
              <p>{money(p.value)}/{p.unit} → {money(n.value)}/{n.unit} ({money(n.value - p.value)}) · <Link className="underline" to={`/dashboard/invoices/${a.next.invoice_id}`}>{a.next.vendor_name} {a.next.invoice_date}</Link></p>
              {!a.sameVendor && <p className="text-xs text-muted-foreground">Vendor changed ({a.prev.vendor_name} → {a.next.vendor_name}) — not a same-vendor comparison.</p>}
              {a.packShrink && <p className="text-xs text-amber-600">Pack size reduced: {a.prev.pack_description} → {a.next.pack_description}</p>}
              {a.recipes.map((r) => <p key={r.name} className="text-xs text-muted-foreground">{r.name}: {r.delta >= 0 ? "+" : ""}{money(r.delta, 3)} per item</p>)}
            </div>;
          })}
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="font-medium">Approved purchases by month</p>
          {d.spend.length ? <div className="h-48"><ResponsiveContainer><LineChart data={d.spend}><XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: number) => money(v)} /><Line dataKey="v" stroke="hsl(var(--accent))" strokeWidth={2} dot /></LineChart></ResponsiveContainer></div> : <p className="text-sm text-muted-foreground">Approve invoices to see purchasing trends.</p>}
          <p className="text-sm">Average food cost (complete recipes): <b>{d.avgPct != null ? `${d.avgPct.toFixed(1)}%` : "—"}</b></p>
          <p className="text-sm">Theoretical sales contribution: <b>{d.sales ? `${money(d.sales.net - d.sales.cost)} on ${money(d.sales.net)} mapped sales` : "import sales to see this"}</b></p>
        </section>
      </div>

      {(d.review.length > 0 || d.incomplete.length > 0) && <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-border bg-card p-5 text-sm space-y-1"><p className="font-medium mb-2">Awaiting review</p>{d.review.map((i: any) => <Link key={i.id} className="block underline" to={`/dashboard/invoices/${i.id}`}>{i.vendor_name || "Unknown vendor"} #{i.invoice_number || "?"}</Link>)}</section>
        <section className="rounded-2xl border border-border bg-card p-5 text-sm space-y-1"><p className="font-medium mb-2">Recipes with incomplete costs</p>{d.incomplete.map((x: any) => <Link key={x.r.id} className="block" to={`/dashboard/recipes/${x.r.id}`}><span className="underline">{x.r.name}</span> <span className="text-xs text-muted-foreground">{x.res.costIssues[0]}</span></Link>)}</section>
      </div>}
    </div>
  );
};
const Card = ({ k, v, to }: { k: string; v: number; to?: string }) => {
  const body = <div className="rounded-2xl border border-border bg-card p-5 h-full"><p className="text-xs text-muted-foreground">{k}</p><p className="font-display text-3xl mt-1">{v}</p></div>;
  return to ? <Link to={to}>{body}</Link> : body;
};
export default Overview;
