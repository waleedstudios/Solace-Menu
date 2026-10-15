import { useEffect, useMemo, useState } from "react";
import { dataApi as supabase } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant, loadCostCtx } from "@/hooks/useRestaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileUp, Plug } from "lucide-react";
import { toast } from "sonner";
import { computeRecipe, type Ctx } from "@/lib/costing";
import { money, toBase, isUnit, UNITS } from "@/lib/units";

export function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); if (row.some((x) => x.trim())) rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  row.push(cur); if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
const FIELDS = [["item", "Item name *"], ["quantity", "Quantity sold *"], ["net_sales", "Net sales (excl. tax & tips) *"], ["date", "Date"], ["discounts", "Discounts"], ["refunds", "Refunds"], ["modifiers", "Modifiers"]] as const;
const money2num = (s: string | undefined) => { if (!s) return 0; const v = Number(String(s).replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1")); return isFinite(v) ? v : 0; };
const toDate = (s: string | undefined) => { if (!s) return null; const d = new Date(s); return isNaN(+d) ? null : d.toISOString().slice(0, 10); };

/** Theoretical base-unit usage per ingredient for `factor` servings of a recipe. */
function usage(rid: string, factor: number, ctx: Ctx, out: Map<string, number>, depth = 0) {
  const r = ctx.recipes.get(rid); if (!r || depth > 8) return;
  const perServing = factor / (Number(r.servings_per_batch) || 1);
  for (const l of ctx.lines.filter((x) => x.recipe_id === rid)) {
    if (l.ingredient_id) {
      const ing = ctx.ingredients.get(l.ingredient_id); if (!ing) continue;
      const c = toBase(Number(l.quantity), l.unit, ing.base_unit, ing.density_g_per_ml); if (!c.ok) continue;
      out.set(ing.id, (out.get(ing.id) || 0) + (c.value / ((Number(ing.yield_pct) || 100) / 100)) * perServing);
    } else if (l.sub_recipe_id) {
      const sr = ctx.recipes.get(l.sub_recipe_id);
      if (sr && isUnit(l.unit) && isUnit(sr.batch_yield_unit) && UNITS[l.unit].dim === UNITS[sr.batch_yield_unit].dim) {
        const frac = (Number(l.quantity) * UNITS[l.unit].toBase) / (Number(sr.batch_yield_qty) * UNITS[sr.batch_yield_unit].toBase);
        usage(sr.id, frac * perServing * (Number(sr.servings_per_batch) || 1), ctx, out, depth + 1);
      }
    }
  }
}

const Sales = () => {
  const { user } = useAuth();
  const { restaurant, locations } = useRestaurant();
  const [csv, setCsv] = useState<{ name: string; rows: string[][] } | null>(null);
  const [map, setMap] = useState<Record<string, string>>({});
  const [importLoc, setImportLoc] = useState("");
  const [lines, setLines] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [imports, setImports] = useState<any[]>([]);
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof loadCostCtx>> | null>(null);
  const [loc, setLoc] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  const load = async () => {
    if (!restaurant) return;
    const [{ data: l }, { data: m }, { data: im }, c] = await Promise.all([
      supabase.from("sales_lines").select("*").eq("restaurant_id", restaurant.id).limit(20000),
      supabase.from("sales_mappings").select("*").eq("restaurant_id", restaurant.id),
      supabase.from("sales_imports").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }),
      loadCostCtx(restaurant.id),
    ]);
    setLines(l || []); setMappings(m || []); setImports(im || []); setCtx(c);
  };
  useEffect(() => { load(); }, [restaurant?.id]);
  useEffect(() => { if (!importLoc && locations[0]) setImportLoc(locations[0].id); }, [locations]);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    const rows = parseCSV(await f.text());
    if (rows.length < 2) return toast.error("CSV needs a header row and data");
    const h = rows[0].map((x) => x.toLowerCase());
    const guess = (keys: string[]) => String(h.findIndex((x) => keys.some((k) => x.includes(k))));
    setMap({ item: guess(["item", "product", "name"]), quantity: guess(["qty", "quantity", "count", "sold"]), net_sales: guess(["net"]), date: guess(["date", "day"]), discounts: guess(["discount"]), refunds: guess(["refund"]), modifiers: guess(["modifier", "option"]) });
    setCsv({ name: f.name, rows });
  };

  const doImport = async () => {
    if (!csv || !restaurant || !user) return;
    const idx = (k: string) => (map[k] && map[k] !== "-1" ? Number(map[k]) : -1);
    if (idx("item") < 0 || idx("quantity") < 0 || idx("net_sales") < 0) return toast.error("Map item, quantity and net sales");
    const data = csv.rows.slice(1).map((r) => ({
      item_name: (r[idx("item")] || "").trim(), quantity: money2num(r[idx("quantity")]), net_sales: money2num(r[idx("net_sales")]),
      sale_date: idx("date") >= 0 ? toDate(r[idx("date")]) : null, discounts: idx("discounts") >= 0 ? money2num(r[idx("discounts")]) : 0,
      refunds: idx("refunds") >= 0 ? money2num(r[idx("refunds")]) : 0, modifiers: idx("modifiers") >= 0 ? (r[idx("modifiers")] || null) : null,
    })).filter((r) => r.item_name);
    const dates = data.map((d) => d.sale_date).filter(Boolean).sort() as string[];
    const { data: im, error } = await supabase.from("sales_imports").insert({ restaurant_id: restaurant.id, location_id: importLoc || null, file_name: csv.name, row_count: data.length, period_start: dates[0] || null, period_end: dates[dates.length - 1] || null, created_by: user.id }).select().single();
    if (error) return toast.error(error.message);
    for (let i = 0; i < data.length; i += 500) {
      const { error: e } = await supabase.from("sales_lines").insert(data.slice(i, i + 500).map((d) => ({ ...d, import_id: im!.id, restaurant_id: restaurant.id, location_id: importLoc || null })));
      if (e) return toast.error(e.message);
    }
    toast.success(`Imported ${data.length} rows`); setCsv(null); load();
  };

  const setMapping = async (name: string, value: string) => {
    if (!restaurant) return;
    await supabase.from("sales_mappings").upsert({ restaurant_id: restaurant.id, sales_item_name: name, recipe_id: value && value !== "ignore" ? value : null, ignored: value === "ignore" }, { onConflict: "restaurant_id,sales_item_name" });
    load();
  };
  const delImport = async (id: string) => { if (confirm("Delete this import?")) { await supabase.from("sales_imports").delete().eq("id", id); load(); } };

  const report = useMemo(() => {
    if (!ctx) return null;
    const scoped = lines.filter((l) => (loc === "all" || l.location_id === loc) && (!from || (l.sale_date && l.sale_date >= from)) && (!to || (l.sale_date && l.sale_date <= to)));
    const mm = new Map(mappings.map((m) => [m.sales_item_name, m]));
    const names = new Map<string, { qty: number; net: number; mods: boolean }>();
    for (const l of scoped) { const x = names.get(l.item_name) || { qty: 0, net: 0, mods: false }; x.qty += Number(l.quantity); x.net += Number(l.net_sales); x.mods ||= !!l.modifiers; names.set(l.item_name, x); }
    const byRecipe = new Map<string, { qty: number; net: number; mods: boolean }>();
    const unmapped: string[] = [];
    for (const [name, v] of names) {
      const m = mm.get(name);
      if (!m) { unmapped.push(name); continue; }
      if (m.ignored || !m.recipe_id) continue;
      const x = byRecipe.get(m.recipe_id) || { qty: 0, net: 0, mods: false };
      x.qty += v.qty; x.net += v.net; x.mods ||= v.mods; byRecipe.set(m.recipe_id, x);
    }
    const rows = [...byRecipe.entries()].map(([rid, v]) => {
      const res = computeRecipe(rid, ctx);
      const cost = res.totalPerItem * v.qty;
      return { rid, name: ctx.recipes.get(rid)?.name || "?", ...v, cost, contribution: v.net - cost, pct: v.net > 0 ? (cost / v.net) * 100 : null, complete: res.costComplete };
    }).sort((a, b) => b.qty - a.qty);
    const use = new Map<string, number>();
    for (const r of rows) usage(r.rid, r.qty, ctx, use);
    const totals = rows.reduce((a, r) => ({ net: a.net + r.net, cost: a.cost + r.cost }), { net: 0, cost: 0 });
    const medianQty = rows.length ? rows.map((r) => r.qty).sort((a, b) => a - b)[Math.floor(rows.length / 2)] : 0;
    return { rows, unmapped, names: [...names.keys()].sort(), use, totals, weak: rows.filter((r) => r.qty >= medianQty && r.pct != null && r.pct > 35) };
  }, [ctx, lines, mappings, loc, from, to]);

  const recipeOpts = ctx?.recipeList.filter((r) => !r.is_subrecipe) || [];
  const mm = new Map(mappings.map((m) => [m.sales_item_name, m]));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-4xl">Sales</h1>
        <p className="text-muted-foreground text-sm mt-1">Import sales, link items to recipes, and see <b>theoretical</b> food cost. Actual food cost needs inventory counts, waste and transfers.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex"><input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => pick(e.target.files?.[0])} /><span className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm cursor-pointer"><FileUp className="h-4 w-4" /> Import sales CSV</span></label>
          {locations.length > 1 && <select className="h-10 border border-border rounded-md bg-background px-3 text-sm" value={importLoc} onChange={(e) => setImportLoc(e.target.value)}>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>}
        </div>
        {csv && <div className="space-y-3">
          <p className="text-sm">{csv.name}: {csv.rows.length - 1} rows. Match your columns:</p>
          <div className="grid sm:grid-cols-3 gap-3">{FIELDS.map(([k, lbl]) => (
            <div key={k} className="space-y-1"><Label className="text-xs">{lbl}</Label>
              <select className="w-full h-10 border border-input rounded-md bg-background px-2 text-sm" value={map[k] ?? "-1"} onChange={(e) => setMap({ ...map, [k]: e.target.value })}>
                <option value="-1">—</option>{csv.rows[0].map((h, i) => <option key={i} value={i}>{h}</option>)}</select></div>))}</div>
          <Button onClick={doImport}>Import</Button>
        </div>}
        {imports.length > 0 && <div className="text-xs text-muted-foreground space-y-1">{imports.map((i) => <p key={i.id}>{i.file_name} · {i.row_count} rows · {i.period_start || "?"} – {i.period_end || "?"} · {locations.find((l) => l.id === i.location_id)?.name || ""} <button className="underline ml-1" onClick={() => delImport(i.id)}>delete</button></p>)}</div>}
      </div>

      {report && report.names.length > 0 && <>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
          <p className="font-medium">Link sales items to recipes {report.unmapped.length > 0 && <Badge variant="outline" className="ml-2 text-amber-600 border-amber-500/50">{report.unmapped.length} unmapped</Badge>}</p>
          <div className="divide-y divide-border">{report.names.map((name) => { const m = mm.get(name); return (
            <div key={name} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className={!m ? "text-amber-600" : ""}>{name}</span>
              <select className="h-9 border border-input rounded-md bg-background px-2 text-sm max-w-[220px]" value={m ? (m.ignored ? "ignore" : m.recipe_id || "") : ""} onChange={(e) => setMapping(name, e.target.value)}>
                <option value="">Not mapped</option><option value="ignore">Not a food item (ignore)</option>{recipeOpts.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
            </div>); })}</div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          {locations.length > 1 && <select className="h-10 border border-border rounded-md bg-background px-3 text-sm" value={loc} onChange={(e) => setLoc(e.target.value)}><option value="all">All locations</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>}
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Stat k="Mapped net sales" v={money(report.totals.net)} />
          <Stat k="Theoretical food cost" v={`${money(report.totals.cost)}${report.totals.net > 0 ? ` · ${(report.totals.cost / report.totals.net * 100).toFixed(1)}%` : ""}`} />
          <Stat k="Theoretical contribution" v={money(report.totals.net - report.totals.cost)} />
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm"><thead className="text-xs text-muted-foreground"><tr className="text-left"><th className="p-3">Item (best sellers first)</th><th className="p-3 text-right">Sold</th><th className="p-3 text-right">Net sales</th><th className="p-3 text-right">Theor. cost</th><th className="p-3 text-right">Cost %</th><th className="p-3 text-right">Contribution</th></tr></thead>
            <tbody className="divide-y divide-border">{report.rows.map((r) => (
              <tr key={r.rid}><td className="p-3">{r.name}{!r.complete && <Badge variant="outline" className="ml-2 text-amber-600 border-amber-500/50">cost incomplete</Badge>}{r.mods && <Badge variant="outline" className="ml-2">modifiers not costed</Badge>}{report.weak.includes(r) && <Badge variant="outline" className="ml-2 text-destructive border-destructive/40">popular · weak margin</Badge>}</td>
                <td className="p-3 text-right tabular-nums">{r.qty}</td><td className="p-3 text-right tabular-nums">{money(r.net)}</td><td className="p-3 text-right tabular-nums">{money(r.cost)}</td><td className="p-3 text-right tabular-nums">{r.pct != null ? `${r.pct.toFixed(1)}%` : "—"}</td><td className="p-3 text-right tabular-nums">{money(r.contribution)}</td></tr>))}</tbody></table>
          {!report.rows.length && <p className="p-6 text-sm text-muted-foreground text-center">Map sales items to recipes to see figures.</p>}
        </div>
        <p className="text-xs text-muted-foreground">All figures are theoretical: recipe cost × quantity sold, using current approved costs. Modifiers and substitutions in your CSV aren't costed yet. Contribution is before labor, overhead and fees.</p>

        {report.use.size > 0 && <div className="rounded-2xl border border-border bg-card p-5 text-sm space-y-1">
          <p className="font-medium mb-2">Theoretical ingredient usage (incl. trim loss)</p>
          {[...report.use.entries()].map(([iid, q]) => { const ing = ctx!.ingredients.get(iid)!; return <div key={iid} className="flex justify-between"><span>{ing.name}</span><span className="tabular-nums">{q.toLocaleString(undefined, { maximumFractionDigits: 0 })} {ing.base_unit}</span></div>; })}
        </div>}
      </>}

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <p className="font-medium flex items-center gap-2"><Plug className="h-4 w-4" /> Point-of-sale connections</p>
        {["Square", "Toast", "Clover"].map((p) => <div key={p} className="flex justify-between text-sm"><span>{p}</span><Badge variant="outline">Not connected</Badge></div>)}
        <p className="text-xs text-muted-foreground">Not built yet. Each needs a developer account and approved API access from the provider. Use CSV export from your POS in the meantime.</p>
      </div>
    </div>
  );
};
const Stat = ({ k, v }: { k: string; v: string }) => <div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{k}</p><p className="font-display text-2xl mt-1">{v}</p></div>;
export default Sales;
