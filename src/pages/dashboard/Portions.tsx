import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Unit = { id: string; name: string; average_grams: number; min_grams: number | null; max_grams: number | null };

const Portions = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Unit[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", average_grams: "", min_grams: "", max_grams: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("portion_units").select("*").eq("user_id", user.id).order("name");
    setItems((data as Unit[]) || []);
  };
  useEffect(() => { load(); }, [user]);

  const create = async () => {
    if (!user) return;
    if (!form.name.trim()) { toast.error("Name required"); return; }
    const avg = parseFloat(form.average_grams);
    if (!avg || avg <= 0) { toast.error("Average grams must be > 0"); return; }
    const { error } = await supabase.from("portion_units").insert({
      user_id: user.id,
      name: form.name.trim(),
      average_grams: avg,
      min_grams: form.min_grams ? parseFloat(form.min_grams) : null,
      max_grams: form.max_grams ? parseFloat(form.max_grams) : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Portion unit saved");
    setOpen(false);
    setForm({ name: "", average_grams: "", min_grams: "", max_grams: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this portion unit?")) return;
    const { error } = await supabase.from("portion_units").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl">Portion units</h1>
          <p className="text-muted-foreground text-sm mt-1">Define standardized portions like a scoop, ladle or slice. Each one converts to grams automatically.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus /> New portion unit</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New portion unit</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Scoop" /></div>
              <div><Label>Average grams (required)</Label><Input type="number" step="0.1" value={form.average_grams} onChange={(e) => setForm({ ...form, average_grams: e.target.value })} placeholder="150" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Min grams</Label><Input type="number" step="0.1" value={form.min_grams} onChange={(e) => setForm({ ...form, min_grams: e.target.value })} placeholder="optional" /></div>
                <div><Label>Max grams</Label><Input type="number" step="0.1" value={form.max_grams} onChange={(e) => setForm({ ...form, max_grams: e.target.value })} placeholder="optional" /></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="hero" onClick={create}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-16 text-center">
          <h3 className="font-display text-2xl mb-2">No portion units yet</h3>
          <p className="text-muted-foreground mb-6">Examples: scoop (150g), ladle (90g), slice (30g).</p>
          <Button variant="hero" onClick={() => setOpen(true)}><Plus /> New portion unit</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((u) => (
            <div key={u.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm-soft">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-lg leading-tight">{u.name}</h3>
                <Button variant="ghost" size="icon" onClick={() => remove(u.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
              </div>
              <p className="font-display text-3xl text-primary">{u.average_grams}<span className="text-base text-muted-foreground ml-1">g avg</span></p>
              {(u.min_grams || u.max_grams) && (
                <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                  Range: {u.min_grams ?? "—"}g – {u.max_grams ?? "—"}g
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Portions;
