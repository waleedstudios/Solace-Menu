import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { dataApi as supabase } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant, loadCostCtx } from "@/hooks/useRestaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { approveInvoice, lineUnitCost, totalsCheck, STATUS_LABEL, DOC_LABEL, type InvLine, type MatchIng, type PriceChange } from "@/lib/invoices";
import { runExtraction } from "./Invoices";
import { UNIT_LIST, UNITS, money, displayUnitCost } from "@/lib/units";
import { computeRecipe, recipesUsing } from "@/lib/costing";

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));
const flagCls = (on: boolean) => (on ? "border-amber-500 ring-1 ring-amber-500/40" : "");

const InvoiceReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { restaurant, canManage, locations } = useRestaurant();
  const [inv, setInv] = useState<any>(null);
  const [lines, setLines] = useState<InvLine[]>([]);
  const [ings, setIngs] = useState<MatchIng[]>([]);
  const [urls, setUrls] = useState<{ url: string; pdf: boolean }[]>([]);
  const [dupes, setDupes] = useState<any[]>([]);
  const [others, setOthers] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [newFor, setNewFor] = useState<InvLine | null>(null);
  const [newIng, setNewIng] = useState({ name: "", base_unit: "g" });
  const [result, setResult] = useState<{ changes: PriceChange[]; effects: { name: string; before: number; after: number; complete: boolean }[] } | null>(null);

  const load = async () => {
    if (!id || !restaurant) return;
    const { data: i } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
    setInv(i);
    const [{ data: l }, { data: ig }, { data: oth }] = await Promise.all([
      supabase.from("invoice_lines").select("*").eq("invoice_id", id).order("position"),
      supabase.from("ingredients").select("id, name, brand, supplier_code, base_unit, pack_count, pack_size, pack_unit, density_g_per_ml, current_cost, current_cost_date").eq("restaurant_id", restaurant.id).order("name"),
      supabase.from("invoices").select("id, vendor_name, invoice_number, invoice_date, total, file_hash, status").eq("restaurant_id", restaurant.id).neq("id", id),
    ]);
    setLines((l || []) as any); setIngs((ig || []) as any); setOthers(oth || []);
    if (i) {
      setDupes((oth || []).filter((o: any) => (i.file_hash && o.file_hash === i.file_hash) ||
        (i.invoice_number && o.invoice_number === i.invoice_number && (o.vendor_name || "").toLowerCase() === (i.vendor_name || "").toLowerCase())));
      const signed = await Promise.all((i.file_paths || []).map(async (p: string) => {
        const { data } = await supabase.storage.from("documents").createSignedUrl(p, 3600);
        return { url: data?.signedUrl || "", pdf: p.toLowerCase().endsWith(".pdf") };
      }));
      setUrls(signed);
    }
  };
  useEffect(() => { load(); }, [id, restaurant?.id]);

  const locked = inv?.status === "approved" || inv?.status === "extracting" || !canManage;
  const [saving, setSaving] = useState(0);
  const saveInv = async (patch: any) => {
    setSaving(n => n + 1);
    const { error } = await supabase.from("invoices").update(patch).eq("id", inv.id);
    if (error) toast.error(error.message); else setInv((old: any) => ({ ...old, ...patch }));
    setSaving(n => n - 1);
  };
  const saveLine = async (lid: string, patch: Partial<InvLine>) => {
    setSaving(n => n + 1);
    const { error } = await supabase.from("invoice_lines").update(patch as any).eq("id", lid);
    if (error) toast.error(error.message); else setLines(ls => ls.map(l => l.id === lid ? { ...l, ...patch } : l));
    setSaving(n => n - 1);
  };
  const check = useMemo(() => (inv ? totalsCheck(inv, lines) : null), [inv, lines]);
  const unc = new Set<string>(inv?.uncertain_fields || []);

  const createIngredient = async () => {
    if (!newFor || !restaurant || !user || !newIng.name.trim()) return;
    const { data, error } = await supabase.from("ingredients").insert({
      restaurant_id: restaurant.id, user_id: user.id, name: newIng.name.trim(), base_unit: newIng.base_unit,
      supplier_code: newFor.product_code, pack_count: newFor.pack_count, pack_size: newFor.pack_size, pack_unit: newFor.pack_unit,
      vendor_id: null, nutrition_source: null,
    }).select("id, name, brand, supplier_code, base_unit, pack_count, pack_size, pack_unit, density_g_per_ml, current_cost, current_cost_date").single();
    if (error) return toast.error(error.message);
    setIngs((x) => [...x, data as any]);
    await saveLine(newFor.id, { ingredient_id: data!.id, match_status: "confirmed", match_confidence: 1, match_reason: "New ingredient created from this line" });
    setNewFor(null);
  };

  const approve = async () => {
    if (!user || !restaurant) return;
    if (check?.issues.length && !confirm(`Totals don't reconcile:\n${check.issues.join("\n")}\n\nApprove anyway?`)) return;
    setBusy(true);
    try {
    const ctxBefore = await loadCostCtx(restaurant.id);
    const r = await approveInvoice(inv.id, !!check?.issues.length);
    if (!r.ok) { setBusy(false); return toast.error(r.errors.join(" · ")); }
    const ctxAfter = await loadCostCtx(restaurant.id);
    const affected = new Set<string>();
    r.changes.forEach((c) => recipesUsing(c.ingredient_id, ctxAfter).forEach((x) => affected.add(x)));
    const effects = [...affected].map((rid) => {
      const b = computeRecipe(rid, ctxBefore), a = computeRecipe(rid, ctxAfter);
      return { name: ctxAfter.recipes.get(rid)!.name, before: b.totalPerItem, after: a.totalPerItem, complete: a.costComplete };
    });
    setResult({ changes: r.changes, effects });
    setBusy(false);
    toast.success("Approved. Price history updated.");
    await load();
    } catch (error: any) { toast.error(error?.message || "Could not complete approval. Reload and try again."); }
    finally { setBusy(false); }
  };

  const rerun = async () => {
    if (!confirm("Re-read this document? Your edits to line items will be replaced.")) return;
    setBusy(true);
    try { await runExtraction(inv.id, restaurant!.id, inv.file_paths, inv.vendor_name); toast.success("Re-read complete"); } catch (e: any) { toast.error(e.message); }
    setBusy(false); load();
  };

  const saveManualReview = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("invoices").update({ status: "review", extraction_error: null }).eq("id", inv.id);
      if (error) throw new Error(error.message);
      await load();
      toast.success("Manual review saved. Prices have not changed.");
    } catch (error: any) { toast.error(error?.message || "Could not save review."); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("Delete this invoice and its uploaded files? You can upload it again afterwards.")) return;
    setBusy(true);
    await supabase.from("invoice_lines").delete().eq("invoice_id", inv.id);
    const { error } = await supabase.from("invoices").delete().eq("id", inv.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    if (inv.file_paths?.length) await supabase.storage.from("documents").remove(inv.file_paths);
    toast.success("Invoice deleted");
    navigate("/dashboard/invoices");
  };

  if (!inv) return <p className="text-muted-foreground">Loading…</p>;
  const ingName = (iid: string | null) => ings.find((i) => i.id === iid)?.name;

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" asChild><Link to="/dashboard/invoices"><ArrowLeft /> Invoice archive</Link></Button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{inv.vendor_name || "Unknown vendor"} {inv.invoice_number ? `#${inv.invoice_number}` : ""}</h1>
          <div className="flex gap-2 mt-2"><Badge>{STATUS_LABEL[inv.status]}</Badge><Badge variant="outline">{DOC_LABEL[inv.doc_type]}</Badge></div>
        </div>
        <div className="flex gap-2">
          {canManage && !locked && <Button variant="outline" onClick={remove} disabled={busy}><Trash2 /> Delete</Button>}
          {canManage && !locked && <Button variant="outline" onClick={rerun} disabled={busy || !!saving}><RefreshCw /> Re-read</Button>}
          {canManage && !locked && inv.status !== "review" && <Button variant="outline" onClick={saveManualReview} disabled={busy || !!saving || !lines.length}>Save manual review</Button>}
          {canManage && !locked && <Button onClick={approve} disabled={busy || !!saving || inv.status !== "review"}>{busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Approve & update prices</Button>}
        </div>
      </div>
      {!canManage && inv.status !== "approved" && <p className="text-sm text-muted-foreground">A manager or owner will review and approve this invoice.</p>}
      {inv.extraction_error && <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">{inv.extraction_error}. You can re-read or enter the details manually.</div>}
      {dupes.length > 0 && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Possible duplicate of {dupes.map((d) => <Link key={d.id} className="underline mr-2" to={`/dashboard/invoices/${d.id}`}>{d.vendor_name} #{d.invoice_number || "?"} ({d.invoice_date || "no date"})</Link>)}</span>
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-accent bg-accent/10 p-5 space-y-3">
          <p className="font-medium">Approved — what changed</p>
          {result.changes.map((c) => {
            const ing = ings.find((i) => i.id === c.ingredient_id);
            const b = ing?.base_unit || "g";
            const p = c.prev != null ? displayUnitCost(c.prev, b) : null, n = c.next != null ? displayUnitCost(c.next, b) : null;
            return <p key={c.ingredient_id} className="text-sm">{ing?.name}: {p ? `${money(p.value)}/${p.unit}` : "no previous price"} → {n ? `${money(n.value)}/${n.unit}` : "—"}
              {p && n && p.value > 0 ? ` (${((n.value - p.value) / p.value * 100).toFixed(1)}%)` : ""}{!c.becameCurrent && " · a newer invoice still sets the current cost"}</p>;
          })}
          {result.effects.length > 0 && <div className="text-sm"><p className="text-muted-foreground mt-2">Cost per menu item:</p>
            {result.effects.map((e) => <p key={e.name}>{e.name}: {money(e.before)} → {money(e.after)}{!e.complete && " (incomplete)"}</p>)}</div>}
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-3 space-y-3 xl:sticky xl:top-4 self-start max-h-[85vh] overflow-auto">
          {urls.length ? urls.map((u, i) => u.pdf
            ? <iframe key={i} src={u.url} className="w-full h-[75vh] rounded-lg" title={`Page ${i + 1}`} />
            : <a key={i} href={u.url} target="_blank" rel="noreferrer"><img src={u.url} alt={`Invoice page ${i + 1}`} className="w-full rounded-lg" /></a>)
            : <p className="text-sm text-muted-foreground p-6">Original document unavailable.</p>}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 grid sm:grid-cols-2 gap-3">
            {([["vendor_name", "Vendor"], ["invoice_number", "Invoice #"], ["invoice_date", "Date"]] as const).map(([k, lbl]) => (
              <div key={k} className="space-y-1"><Label>{lbl}{unc.has(k) && <span className="text-amber-600"> · check</span>}</Label>
                <Input type={k === "invoice_date" ? "date" : "text"} disabled={locked} className={flagCls(unc.has(k))} defaultValue={inv[k] || ""} onBlur={(e) => saveInv({ [k]: e.target.value || null })} /></div>
            ))}
            <div className="space-y-1"><Label>Document type</Label>
              <select disabled={locked} className="w-full border border-border rounded-md bg-background px-3 py-2 text-sm" value={inv.doc_type} onChange={(e) => saveInv({ doc_type: e.target.value })}>
                {Object.entries(DOC_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            {inv.doc_type !== "invoice" && <div className="space-y-1 sm:col-span-2"><Label>Relates to invoice</Label>
              <select disabled={locked} className="w-full border border-border rounded-md bg-background px-3 py-2 text-sm" value={inv.corrects_invoice_id || ""} onChange={(e) => saveInv({ corrects_invoice_id: e.target.value || null })}>
                <option value="">—</option>{others.map((o) => <option key={o.id} value={o.id}>{o.vendor_name} #{o.invoice_number} {o.invoice_date}</option>)}
              </select>
              {inv.doc_type === "corrected_invoice" && <p className="text-xs text-muted-foreground">Approving this records its prices; reject or delete the original if it should no longer count.</p>}
              {(inv.doc_type === "credit_note" || inv.doc_type === "return") && <p className="text-xs text-muted-foreground">Credits and returns are archived but don't change ingredient prices.</p>}
            </div>}
            {locations.length > 1 && <div className="space-y-1"><Label>Location</Label>
              <select disabled={locked} className="w-full border border-border rounded-md bg-background px-3 py-2 text-sm" value={inv.location_id || ""} onChange={(e) => saveInv({ location_id: e.target.value || null })}>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>}
            {(["subtotal", "discount", "tax", "delivery", "total"] as const).map((k) => (
              <div key={k} className="space-y-1"><Label className="capitalize">{k}{unc.has(k) && <span className="text-amber-600"> · check</span>}</Label>
                <Input type="number" step="0.01" disabled={locked} className={flagCls(unc.has(k))} defaultValue={inv[k] ?? ""} onBlur={(e) => saveInv({ [k]: numOrNull(e.target.value) })} /></div>
            ))}
          </div>
          {check && (check.issues.length
            ? <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm space-y-1">{check.issues.map((s) => <p key={s}>⚠ {s}</p>)}</div>
            : <p className="text-sm text-accent-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Line items reconcile with the invoice total.</p>)}

          <div className="space-y-3">
            {lines.map((l) => {
              const ing = ings.find((i) => i.id === l.ingredient_id);
              const conv = ing ? lineUnitCost(l, ing) : null;
              return (
                <div key={l.id} className={`rounded-2xl border bg-card p-4 space-y-3 ${l.uncertain ? "border-amber-500/60" : "border-border"}`}>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <Input disabled={locked} className="col-span-2 sm:col-span-4" defaultValue={l.description} onBlur={(e) => saveLine(l.id, { description: e.target.value })} />
                    <Input disabled={locked} className="col-span-2" placeholder="Product code" defaultValue={l.product_code || ""} onBlur={(e) => saveLine(l.id, { product_code: e.target.value || null })} />
                    <div><Label className="text-xs">Qty</Label><Input disabled={locked} type="number" defaultValue={l.quantity ?? ""} onBlur={(e) => saveLine(l.id, { quantity: numOrNull(e.target.value) })} /></div>
                    <div><Label className="text-xs">Units/pack</Label><Input disabled={locked} type="number" defaultValue={l.pack_count ?? ""} onBlur={(e) => saveLine(l.id, { pack_count: numOrNull(e.target.value) })} /></div>
                    <div><Label className="text-xs">Size each</Label><Input disabled={locked} type="number" defaultValue={l.pack_size ?? ""} onBlur={(e) => saveLine(l.id, { pack_size: numOrNull(e.target.value) })} /></div>
                    <div><Label className="text-xs">Unit</Label>
                      <select disabled={locked} className="w-full h-10 border border-input rounded-md bg-background px-2 text-sm" value={l.pack_unit || ""} onChange={(e) => saveLine(l.id, { pack_unit: e.target.value || null })}>
                        <option value="">?</option>{UNIT_LIST.map((u) => <option key={u} value={u}>{UNITS[u].label}</option>)}</select></div>
                    <div><Label className="text-xs">Unit price</Label><Input disabled={locked} type="number" step="0.01" defaultValue={l.unit_price ?? ""} onBlur={(e) => saveLine(l.id, { unit_price: numOrNull(e.target.value) })} /></div>
                    <div><Label className="text-xs">Line total</Label><Input disabled={locked} type="number" step="0.01" defaultValue={l.line_total ?? ""} onBlur={(e) => saveLine(l.id, { line_total: numOrNull(e.target.value) })} /></div>
                  </div>
                  {l.uncertain && <p className="text-xs text-amber-600">⚠ {l.uncertain_note || "AI was unsure about this line — please check against the original."}</p>}

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant={l.match_status === "confirmed" ? "default" : "outline"}>
                      {l.match_status === "confirmed" ? `✓ ${ingName(l.ingredient_id)}` : l.match_status === "suggested" ? `Suggested: ${ingName(l.ingredient_id)} (${Math.round((l.match_confidence || 0) * 100)}%)` : l.match_status === "nonfood" ? "Non-food expense" : "Unmatched"}
                    </Badge>
                    {!locked && <>
                      {l.match_status === "suggested" && <Button size="sm" onClick={() => saveLine(l.id, { match_status: "confirmed" })}>Confirm</Button>}
                      <select className="h-9 border border-input rounded-md bg-background px-2 text-sm max-w-[200px]" value="" onChange={(e) => e.target.value && saveLine(l.id, { ingredient_id: e.target.value, match_status: "confirmed", match_confidence: 1, match_reason: "Chosen manually" })}>
                        <option value="">Choose ingredient…</option>{ings.map((i) => <option key={i.id} value={i.id}>{i.name}{i.brand ? ` · ${i.brand}` : ""}</option>)}</select>
                      <Button size="sm" variant="outline" onClick={() => { setNewFor(l); setNewIng({ name: l.description, base_unit: l.pack_unit && UNITS[l.pack_unit as keyof typeof UNITS] ? (UNITS[l.pack_unit as keyof typeof UNITS].dim === "mass" ? "g" : UNITS[l.pack_unit as keyof typeof UNITS].dim === "volume" ? "ml" : "each") : "g" }); }}>New ingredient</Button>
                      <Button size="sm" variant="ghost" onClick={() => saveLine(l.id, { match_status: "nonfood", ingredient_id: null })}>Non-food</Button>
                      <Button size="sm" variant="ghost" onClick={() => saveLine(l.id, { match_status: "unmatched", ingredient_id: null })}>Later</Button>
                    </>}
                  </div>
                  {l.match_reason && l.match_status !== "nonfood" && <p className="text-xs text-muted-foreground">{l.match_reason}</p>}
                  {conv && l.match_status !== "nonfood" && (conv.ok
                    ? <p className="text-xs rounded-lg bg-secondary px-3 py-2">Conversion for approval: {conv.explain}</p>
                    : <p className="text-xs text-amber-600">Conversion needed: {conv.reason}</p>)}
                </div>
              );
            })}
            {!lines.length && <p className="text-sm text-muted-foreground">No line items yet.</p>}
          </div>
        </div>
      </div>

      <Dialog open={!!newFor} onOpenChange={(o) => !o && setNewFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>New ingredient from this line</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Standard name</Label><Input value={newIng.name} onChange={(e) => setNewIng({ ...newIng, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Measured by</Label>
              <select className="w-full border border-border rounded-md bg-background px-3 py-2 text-sm" value={newIng.base_unit} onChange={(e) => setNewIng({ ...newIng, base_unit: e.target.value })}>
                <option value="g">Weight (grams)</option><option value="ml">Volume (ml)</option><option value="each">Count (each)</option></select></div>
            <p className="text-xs text-muted-foreground">Supplier code and pack size are copied from the invoice. Add brand, yield and nutrition later in Ingredients.</p>
          </div>
          <DialogFooter><Button onClick={createIngredient}>Create & match</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default InvoiceReview;
