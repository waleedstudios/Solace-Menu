import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { dataApi as supabase } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant } from "@/hooks/useRestaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, FileUp, Loader2, ScanLine, Search } from "lucide-react";
import { toast } from "sonner";
import { sha256, STATUS_LABEL, DOC_LABEL } from "@/lib/invoices";
import { extractSupplierInvoice } from "@workspace/api-client-react";
import { money } from "@/lib/units";

export async function runExtraction(invoiceId: string, restaurantId: string, paths: string[], vendorHint?: string) {
  await extractSupplierInvoice(invoiceId);
}

const Invoices = () => {
  const { user } = useAuth();
  const { restaurant, locations, canManage } = useRestaurant();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loc, setLoc] = useState("all");
  const [uploadLoc, setUploadLoc] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!restaurant) return;
    const { data } = await supabase.from("invoices").select("*, invoice_lines(description, product_code)").eq("restaurant_id", restaurant.id).order("invoice_date", { ascending: false, nullsFirst: true }).order("created_at", { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { load(); }, [restaurant?.id]);
  useEffect(() => { if (!uploadLoc && locations[0]) setUploadLoc(locations[0].id); }, [locations]);

  const upload = async (files: FileList | null) => {
    if (!files?.length || !restaurant || !user) return;
    setBusy(true);
    try {
      const list = [...files];
      const hash = (await Promise.all(list.map(sha256))).join(":");
      const dup = rows.find((r) => r.file_hash === hash);
      if (dup && !confirm(`This exact file was already uploaded (${dup.vendor_name || "invoice"} ${dup.invoice_number || ""}). Upload anyway?`)) return;
      const uploadId = crypto.randomUUID();
      const paths: string[] = [];
      for (const [i, f] of list.entries()) {
        const ext = f.name.split(".").pop() || "jpg";
        const path = `${restaurant.id}/invoices/${uploadId}/${i + 1}.${ext}`;
        const { error: ue } = await supabase.storage.from("documents").upload(path, f, { contentType: f.type });
        if (ue) throw ue;
        paths.push(path);
      }
      const { data: inv, error } = await supabase.from("invoices").insert({ restaurant_id: restaurant.id, uploaded_by: user.id, file_hash: hash, location_id: uploadLoc || null, file_paths: paths }).select().single();
      if (error || !inv) throw error;
      if (!canManage) {
        toast.success("Captured securely. An owner or manager will review and approve this invoice.");
        await load();
        return;
      }
      toast.message("Uploaded. Reading the document…");
      try { await runExtraction(inv.id, restaurant.id, paths); toast.success("Ready for review"); }
      catch (e: any) { toast.error(e.message); }
      navigate(`/dashboard/invoices/${inv.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; if (camRef.current) camRef.current.value = ""; }
  };

  const filtered = useMemo(() => rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (loc !== "all" && r.location_id !== loc) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return [r.vendor_name, r.invoice_number, String(r.total ?? ""), ...(r.invoice_lines || []).map((l: any) => `${l.description} ${l.product_code || ""}`)].join(" ").toLowerCase().includes(s);
  }), [rows, q, status, loc]);

  const byVendor = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const r of filtered) { const k = r.vendor_name || "Unknown vendor"; m.set(k, [...(m.get(k) || []), r]); }
    return [...m.entries()];
  }, [filtered]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-4xl">Scan invoice</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload → AI reads it → you review → approve → prices update. Uploading alone never changes costs.</p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 sm:p-8 text-center space-y-4">
        <ScanLine className="h-10 w-10 mx-auto text-accent" />
        <p className="font-medium">Photos, phone camera, or PDF. Select several images for a multi-page invoice.</p>
        {locations.length > 1 && (
          <select className="border border-border rounded-md bg-background px-3 py-2 text-sm" value={uploadLoc} onChange={(e) => setUploadLoc(e.target.value)}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => upload(e.target.files)} />
          <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          <Button size="lg" onClick={() => camRef.current?.click()} disabled={busy}><Camera /> Take photo</Button>
          <Button size="lg" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <FileUp />} Upload files</Button>
        </div>
        {busy && <p className="text-sm text-muted-foreground">Uploading and reading — this can take up to a minute.</p>}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search vendor, invoice #, ingredient, amount" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="border border-border rounded-md bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {locations.length > 1 && (
          <select className="border border-border rounded-md bg-background px-3 py-2 text-sm" value={loc} onChange={(e) => setLoc(e.target.value)}>
            <option value="all">All locations</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>

      {!rows.length ? (
        <p className="text-sm text-muted-foreground text-center py-10">No invoices yet. Your archive of original documents will appear here, grouped by vendor.</p>
      ) : byVendor.map(([vendor, list]) => (
        <div key={vendor} className="space-y-2">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground">{vendor}</h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {list.map((r) => (
              <Link key={r.id} to={`/dashboard/invoices/${r.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-secondary/50 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium truncate">{DOC_LABEL[r.doc_type] || "Invoice"} {r.invoice_number ? `#${r.invoice_number}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{r.invoice_date || "Date unknown"} · {locations.find((l) => l.id === r.location_id)?.name || "—"}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm tabular-nums">{money(r.total)}</span>
                  <Badge variant={r.status === "approved" ? "default" : r.status === "review" ? "secondary" : "outline"}>{STATUS_LABEL[r.status] || r.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
export default Invoices;
