import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { dataApi as supabase } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant, loadCostCtx } from "@/hooks/useRestaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Camera, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { UNIT_LIST, UNITS, money, displayUnitCost, describePack } from "@/lib/units";
import { recipesUsing } from "@/lib/costing";

type Ing = any;
const blank = {
  name: "", category: "", brand: "", supplier_code: "", base_unit: "g", pack_count: "", pack_size: "", pack_unit: "", purchase_unit: "",
  yield_pct: "100", density_g_per_ml: "", nutrition_source: "", serving_size_text: "", servings_per_container: "",
  calories_per_100g: "", protein_per_100g: "", carbs_per_100g: "", fats_per_100g: "", sat_fat_per_100: "", fiber_per_100: "",
  sugar_per_100: "", added_sugar_per_100: "", sodium_mg_per_100: "", allergens: "", label_image_path: "",
};
const n = (v: string) => (String(v).trim() === "" ? null : Number(v));
const SRC: Record<string, string> = { label: "From label", manual: "Manual entry", estimated: "Estimated" };

export const Ingredients = () => {
  const { user } = useAuth();
  const { restaurant } = useRestaurant();
  const [items, setItems] = useState<Ing[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(blank);
  const [detail, setDetail] = useState<Ing | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [aliases, setAliases] = useState<any[]>([]);
  const [usedIn, setUsedIn] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!restaurant) return;
    const { data } = await supabase.from("ingredients").select("*").eq("restaurant_id", restaurant.id).order("name");
    setItems(data || []);
  };
  useEffect(() => { load(); }, [restaurant?.id]);

  const openNew = () => { setEditId(null); setForm(blank); setOpen(true); };
  const openEdit = (i: Ing) => {
    setEditId(i.id);
    setForm(Object.fromEntries(Object.keys(blank).map((k) => [k, k === "allergens" ? (i.allergens || []).join(", ") : i[k] ?? ""])));
    setOpen(true);
  };

  const scanLabel = async (file: File | undefined) => {
    if (!file || !restaurant) return;
    setScanning(true);
    try {
      const path = `${restaurant.id}/labels/${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data, error: fe } = await supabase.functions.invoke("extract-document", { body: { kind: "label", restaurant_id: restaurant.id, paths: [path] } });
      const d = (data as any)?.data;
      if (fe || !d) throw new Error((data as any)?.error || "Could not read label");
      const amt = d.serving_size_amount;
      const per = (v: number | null) => (v == null || !amt ? "" : String(Math.round((v / amt) * 100 * 100) / 100));
      setForm((f: any) => ({
        ...f, label_image_path: path, nutrition_source: "label",
        name: f.name || d.product_name || "", brand: f.brand || d.brand || "",
        serving_size_text: d.serving_size_text || "", servings_per_container: d.servings_per_container ?? "",
        base_unit: d.serving_size_unit === "ml" ? "ml" : d.serving_size_unit === "g" ? "g" : f.base_unit,
        calories_per_100g: per(d.calories), protein_per_100g: per(d.protein_g), carbs_per_100g: per(d.carbs_g), fats_per_100g: per(d.fat_g),
        sat_fat_per_100: per(d.sat_fat_g), fiber_per_100: per(d.fiber_g), sugar_per_100: per(d.sugar_g), added_sugar_per_100: per(d.added_sugar_g), sodium_mg_per_100: per(d.sodium_mg),
        allergens: d.allergens_statement || f.allergens,
      }));
      if (!amt) toast.warning("The label doesn't show a gram/ml serving size. Enter per-100 values manually.");
      else toast.success(`Label read. Values converted to per 100 ${d.serving_size_unit}. Please check them.${d.uncertain_fields?.length ? ` Unsure: ${d.uncertain_fields.join(", ")}` : ""}`);
    } catch (e: any) { toast.error(e.message); } finally { setScanning(false); if (labelRef.current) labelRef.current.value = ""; }
  };

  const save = async () => {
    if (!user || !restaurant) return;
    if (!form.name.trim()) return toast.error("Name required");
    const hasNutr = ["calories_per_100g", "protein_per_100g", "carbs_per_100g", "fats_per_100g"].some((k) => String(form[k]).trim() !== "");
    const payload: any = {
      restaurant_id: restaurant.id, user_id: user.id, name: form.name.trim(), category: form.category || null, brand: form.brand || null,
      supplier_code: form.supplier_code || null, base_unit: form.base_unit, pack_count: n(form.pack_count), pack_size: n(form.pack_size), pack_unit: form.pack_unit || null,
      purchase_unit: form.purchase_unit || null, yield_pct: n(form.yield_pct) ?? 100, density_g_per_ml: n(form.density_g_per_ml),
      nutrition_source: hasNutr ? (form.nutrition_source || "manual") : null,
      serving_size_text: form.serving_size_text || null, servings_per_container: n(form.servings_per_container),
      calories_per_100g: n(form.calories_per_100g) ?? 0, protein_per_100g: n(form.protein_per_100g) ?? 0, carbs_per_100g: n(form.carbs_per_100g) ?? 0, fats_per_100g: n(form.fats_per_100g) ?? 0,
      sat_fat_per_100: n(form.sat_fat_per_100), fiber_per_100: n(form.fiber_per_100), sugar_per_100: n(form.sugar_per_100), added_sugar_per_100: n(form.added_sugar_per_100), sodium_mg_per_100: n(form.sodium_mg_per_100),
      allergens: form.allergens.trim() ? form.allergens.split(",").map((s: string) => s.trim()).filter(Boolean) : null,
      label_image_path: form.label_image_path || null,
    };
    if (payload.yield_pct <= 0 || payload.yield_pct > 100) return toast.error("Usable yield must be between 1 and 100%");
    const { error } = editId ? await supabase.from("ingredients").update(payload).eq("id", editId) : await supabase.from("ingredients").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this ingredient? This fails if a recipe still uses it.")) return;
    const { error } = await supabase.from("ingredients").delete().eq("id", id);
    if (error) return toast.error("Still used by a recipe or invoice — remove it there first.");
    setDetail(null); load();
  };

  const openDetail = async (i: Ing) => {
    setDetail(i);
    const [{ data: h }, { data: a }, ctx] = await Promise.all([
      supabase.from("price_history").select("*").eq("ingredient_id", i.id).order("invoice_date", { ascending: false }),
      supabase.from("ingredient_aliases").select("*").eq("ingredient_id", i.id),
      loadCostCtx(restaurant!.id),
    ]);
    setHistory(h || []); setAliases(a || []);
    setUsedIn(recipesUsing(i.id, ctx).map((r) => ctx.recipes.get(r)?.name || ""));
  };
  const removeAlias = async (id: string) => { await supabase.from("ingredient_aliases").delete().eq("id", id); setAliases((a) => a.filter((x) => x.id !== id)); };

  const filtered = useMemo(() => items.filter((i) => `${i.name} ${i.brand || ""} ${i.category || ""} ${i.supplier_code || ""}`.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const F = (k: string, label: string, props: any = {}) => (
    <div className="space-y-1"><Label className="text-xs">{label}</Label><Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} {...props} /></div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl">Ingredients</h1>
          <p className="text-muted-foreground text-sm mt-1">Your restaurant's catalog. Different brands or pack sizes stay as separate products.</p>
        </div>
        <Button onClick={openNew}><Plus /> New ingredient</Button>
      </div>
      <div className="relative"><Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" /><Input className="pl-9" placeholder="Search name, brand, code" value={search} onChange={(e) => setSearch(e.target.value)} /></div>

      {!items.length ? <p className="text-sm text-muted-foreground text-center py-10">No ingredients yet. Add one, or create them while reviewing an invoice.</p> : (
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {filtered.map((i) => {
            const c = i.current_cost != null ? displayUnitCost(Number(i.current_cost), i.base_unit) : null;
            return (
              <button key={i.id} onClick={() => openDetail(i)} className="w-full text-left flex items-center justify-between gap-3 p-4 hover:bg-secondary/50">
                <div className="min-w-0">
                  <p className="font-medium truncate">{i.name}{i.brand && <span className="text-muted-foreground font-normal"> · {i.brand}</span>}</p>
                  <p className="text-xs text-muted-foreground">{i.category || "Uncategorized"} · {describePack(i.pack_count, i.pack_size, i.pack_unit)} · yield {Number(i.yield_pct)}%</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!i.nutrition_source && <Badge variant="outline">No nutrition</Badge>}
                  <span className="text-sm tabular-nums">{c ? `${money(c.value)}/${c.unit}` : <span className="text-amber-600">No price</span>}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {detail && <>
            <SheetHeader><SheetTitle>{detail.name}</SheetTitle></SheetHeader>
            <div className="space-y-5 mt-4 text-sm">
              <div className="flex gap-2"><Button size="sm" onClick={() => { setDetail(null); openEdit(detail); }}>Edit</Button><Button size="sm" variant="ghost" onClick={() => remove(detail.id)}><Trash2 /> Delete</Button></div>
              <div>
                <p className="font-medium mb-1">Current cost</p>
                <p>{detail.current_cost != null ? `${money(Number(detail.current_cost), 5)} per ${detail.base_unit} · latest approved invoice ${detail.current_cost_date}` : "No approved purchase yet."}</p>
                <p className="text-xs text-muted-foreground">Costing method: latest approved purchase by invoice date. Usable yield {Number(detail.yield_pct)}% is applied in recipes.</p>
              </div>
              <div>
                <p className="font-medium mb-1">Nutrition</p>
                {detail.nutrition_source ? <p>{SRC[detail.nutrition_source]} · per 100 {detail.base_unit}: {Number(detail.calories_per_100g)} kcal, P {Number(detail.protein_per_100g)} g, C {Number(detail.carbs_per_100g)} g, F {Number(detail.fats_per_100g)} g</p> : <p className="text-amber-600">Missing — scan the label or enter it manually.</p>}
                <p className="text-xs text-muted-foreground mt-1">Allergens: {detail.allergens?.length ? detail.allergens.join(", ") : "not recorded (this does not mean allergen-free)"}</p>
              </div>
              <div><p className="font-medium mb-1">Used in</p><p>{usedIn.length ? usedIn.join(", ") : "No recipes"}</p></div>
              <div>
                <p className="font-medium mb-1">Vendor names & codes learned</p>
                {aliases.length ? aliases.map((a) => <div key={a.id} className="flex justify-between gap-2"><span>{a.vendor_name || "Any vendor"}: "{a.alias}" {a.product_code && `· ${a.product_code}`}</span><button className="text-muted-foreground" onClick={() => removeAlias(a.id)}>×</button></div>) : <p className="text-muted-foreground">None yet — confirmed invoice matches are remembered here.</p>}
              </div>
              <div>
                <p className="font-medium mb-1">Price history</p>
                {history.length ? history.map((h) => { const c = displayUnitCost(Number(h.cost_per_base), h.base_unit); return (
                  <Link key={h.id} to={`/dashboard/invoices/${h.invoice_id}`} className="flex justify-between py-1 border-b border-border hover:text-primary">
                    <span>{h.invoice_date} · {h.vendor_name || "—"} · {h.pack_description}</span><span className="tabular-nums">{money(c.value)}/{c.unit}</span></Link>); })
                  : <p className="text-muted-foreground">No approved purchases.</p>}
              </div>
            </div>
          </>}
        </SheetContent>
      </Sheet>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit ingredient" : "New ingredient"}</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-3">
              {F("name", "Standard name")}{F("category", "Category")}{F("brand", "Brand")}{F("supplier_code", "Supplier product code")}
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Measured by</Label>
                <select className="w-full h-10 border border-input rounded-md bg-background px-2 text-sm" value={form.base_unit} onChange={(e) => setForm({ ...form, base_unit: e.target.value })}>
                  <option value="g">Weight (g)</option><option value="ml">Volume (ml)</option><option value="each">Count (each)</option></select></div>
              {F("yield_pct", "Usable yield %", { type: "number" })}
              {F("density_g_per_ml", "Verified g per ml", { type: "number", placeholder: "optional" })}
              {F("purchase_unit", "Purchase unit", { placeholder: "case, bag…" })}
              {F("pack_count", "Units per pack", { type: "number" })}
              {F("pack_size", "Size of each", { type: "number" })}
              <div className="space-y-1"><Label className="text-xs">Unit</Label>
                <select className="w-full h-10 border border-input rounded-md bg-background px-2 text-sm" value={form.pack_unit} onChange={(e) => setForm({ ...form, pack_unit: e.target.value })}>
                  <option value="">—</option>{UNIT_LIST.map((u) => <option key={u} value={u}>{UNITS[u].label}</option>)}</select></div>
            </div>
            <p className="text-xs text-muted-foreground">Only fill "g per ml" with a verified figure for this exact product; otherwise volume and weight won't be mixed.</p>

            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-medium text-sm">Nutrition per 100 {form.base_unit === "each" ? "units" : form.base_unit} {form.nutrition_source && <Badge variant="outline" className="ml-2">{SRC[form.nutrition_source]}</Badge>}</p>
                <input ref={labelRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => scanLabel(e.target.files?.[0])} />
                <Button size="sm" variant="outline" onClick={() => labelRef.current?.click()} disabled={scanning}>{scanning ? <Loader2 className="animate-spin" /> : <Camera />} Scan nutrition label</Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {F("calories_per_100g", "kcal", { type: "number" })}{F("protein_per_100g", "Protein g", { type: "number" })}{F("carbs_per_100g", "Carbs g", { type: "number" })}
                {F("fats_per_100g", "Fat g", { type: "number" })}{F("sat_fat_per_100", "Sat fat g", { type: "number" })}{F("fiber_per_100", "Fiber g", { type: "number" })}
                {F("sugar_per_100", "Sugars g", { type: "number" })}{F("added_sugar_per_100", "Added sugar g", { type: "number" })}{F("sodium_mg_per_100", "Sodium mg", { type: "number" })}
                {F("servings_per_container", "Servings/container", { type: "number" })}
              </div>
              {F("serving_size_text", "Label serving size")}
              <div className="space-y-1"><Label className="text-xs">Source</Label>
                <select className="w-full h-10 border border-input rounded-md bg-background px-2 text-sm" value={form.nutrition_source} onChange={(e) => setForm({ ...form, nutrition_source: e.target.value })}>
                  <option value="">Auto (manual if filled)</option><option value="label">From label</option><option value="manual">Manual entry</option><option value="estimated">Estimated</option></select></div>
              {F("allergens", "Allergens (comma separated, as printed)")}
              <p className="text-xs text-muted-foreground">Empty nutrition stays "missing", never zero. Leaving allergens blank does not mark a product allergen-free.</p>
            </div>
          </div>
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Ingredients;
