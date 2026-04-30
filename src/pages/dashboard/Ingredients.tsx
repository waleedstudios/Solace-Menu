import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Ingredient } from "@/lib/macros";

const Ingredients = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<(Ingredient & { user_id: string | null })[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", calories_per_100g: "", protein_per_100g: "", carbs_per_100g: "", fats_per_100g: "" });

  const load = async () => {
    const { data } = await supabase.from("ingredients").select("*").order("name");
    setItems((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user) return;
    if (!form.name.trim()) { toast.error("Name required"); return; }
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      calories_per_100g: parseFloat(form.calories_per_100g) || 0,
      protein_per_100g: parseFloat(form.protein_per_100g) || 0,
      carbs_per_100g: parseFloat(form.carbs_per_100g) || 0,
      fats_per_100g: parseFloat(form.fats_per_100g) || 0,
    };
    const { error } = await supabase.from("ingredients").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Ingredient saved");
    setOpen(false);
    setForm({ name: "", calories_per_100g: "", protein_per_100g: "", carbs_per_100g: "", fats_per_100g: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this ingredient? Recipes using it will break.")) return;
    const { error } = await supabase.from("ingredients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl">Ingredients</h1>
          <p className="text-muted-foreground text-sm mt-1">Browse the library or add your own. Macros are per 100g.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus /> Custom ingredient</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New ingredient</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="House sauce" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Calories / 100g</Label><Input type="number" step="0.1" value={form.calories_per_100g} onChange={(e) => setForm({ ...form, calories_per_100g: e.target.value })} /></div>
                <div><Label>Protein (g) / 100g</Label><Input type="number" step="0.1" value={form.protein_per_100g} onChange={(e) => setForm({ ...form, protein_per_100g: e.target.value })} /></div>
                <div><Label>Carbs (g) / 100g</Label><Input type="number" step="0.1" value={form.carbs_per_100g} onChange={(e) => setForm({ ...form, carbs_per_100g: e.target.value })} /></div>
                <div><Label>Fats (g) / 100g</Label><Input type="number" step="0.1" value={form.fats_per_100g} onChange={(e) => setForm({ ...form, fats_per_100g: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="hero" onClick={create}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Search ingredients…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      <div className="bg-card rounded-2xl border border-border shadow-sm-soft overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_80px_80px_80px_40px] gap-3 px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/40">
          <span>Name</span><span className="text-right">Cal</span><span className="text-right">P</span><span className="text-right">C</span><span className="text-right">F</span><span></span>
        </div>
        <ul className="divide-y divide-border">
          {filtered.map((i) => (
            <li key={i.id} className="grid grid-cols-[1fr_80px_80px_80px_80px_40px] gap-3 px-5 py-3 items-center text-sm">
              <span className="flex items-center gap-2">
                {i.name}
                {i.user_id === user?.id && <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">Custom</span>}
              </span>
              <span className="text-right tabular-nums">{i.calories_per_100g}</span>
              <span className="text-right tabular-nums">{i.protein_per_100g}</span>
              <span className="text-right tabular-nums">{i.carbs_per_100g}</span>
              <span className="text-right tabular-nums">{i.fats_per_100g}</span>
              {i.user_id === user?.id ? (
                <Button variant="ghost" size="icon" onClick={() => remove(i.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
              ) : <span />}
            </li>
          ))}
          {filtered.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">No matches.</li>}
        </ul>
      </div>
    </div>
  );
};

export default Ingredients;
