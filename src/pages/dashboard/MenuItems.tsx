import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { MacroBadges } from "@/components/MacroBadges";
import { totalMacros, type Ingredient, type PortionUnit, type RecipeItem, ZERO } from "@/lib/macros";
import { toast } from "sonner";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_published: boolean;
};

const MenuItems = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [recipesByItem, setRecipesByItem] = useState<Record<string, RecipeItem[]>>({});
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [portionUnits, setPortionUnits] = useState<PortionUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", image_url: "" });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: m }, { data: ing }, { data: pu }] = await Promise.all([
      supabase.from("menu_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("ingredients").select("*"),
      supabase.from("portion_units").select("*").eq("user_id", user.id),
    ]);
    setItems((m as MenuItem[]) || []);
    setIngredients((ing as Ingredient[]) || []);
    setPortionUnits((pu as PortionUnit[]) || []);
    if (m && m.length) {
      const ids = m.map((x) => x.id);
      const { data: ris } = await supabase.from("recipe_items").select("*").in("menu_item_id", ids);
      const grouped: Record<string, RecipeItem[]> = {};
      (ris || []).forEach((ri: any) => {
        (grouped[ri.menu_item_id] ||= []).push(ri as RecipeItem);
      });
      setRecipesByItem(grouped);
    } else {
      setRecipesByItem({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const openNew = () => { setEditing(null); setForm({ name: "", description: "", image_url: "" }); setOpen(true); };
  const openEdit = (it: MenuItem) => { setEditing(it); setForm({ name: it.name, description: it.description || "", image_url: it.image_url || "" }); setOpen(true); };

  const save = async () => {
    if (!user) return;
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (editing) {
      const { error } = await supabase.from("menu_items").update({
        name: form.name.trim(), description: form.description.trim() || null, image_url: form.image_url.trim() || null,
      }).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Menu item updated");
    } else {
      const { error } = await supabase.from("menu_items").insert({
        user_id: user.id, name: form.name.trim(), description: form.description.trim() || null, image_url: form.image_url.trim() || null,
      });
      if (error) return toast.error(error.message);
      toast.success("Menu item created");
    }
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this menu item?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const togglePublish = async (it: MenuItem) => {
    const { error } = await supabase.from("menu_items").update({ is_published: !it.is_published }).eq("id", it.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl">Menu items</h1>
          <p className="text-muted-foreground text-sm mt-1">Build dishes, set ingredients, see live macros.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={openNew}><Plus /> New item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit menu item" : "New menu item"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label htmlFor="n">Name</Label><Input id="n" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Grilled Chicken Bowl" /></div>
              <div><Label htmlFor="d">Description</Label><Textarea id="d" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Quinoa, avocado, cherry tomatoes…" rows={3} /></div>
              <div><Label htmlFor="i">Image URL (optional)</Label><Input id="i" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="hero" onClick={save}>{editing ? "Save" : "Create"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-16 text-center">
          <h3 className="font-display text-2xl mb-2">No menu items yet</h3>
          <p className="text-muted-foreground mb-6">Create your first dish to start calculating macros.</p>
          <Button variant="hero" onClick={openNew}><Plus /> New item</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((it) => {
            const recipe = recipesByItem[it.id] || [];
            const macros = recipe.length ? totalMacros(recipe, ingredients, portionUnits) : ZERO;
            return (
              <div key={it.id} className="bg-card rounded-2xl border border-border shadow-sm-soft hover:shadow-md-soft transition-all overflow-hidden flex flex-col">
                {it.image_url ? (
                  <div className="aspect-[4/3] bg-secondary overflow-hidden">
                    <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-gradient-subtle flex items-center justify-center">
                    <span className="font-display text-5xl text-muted-foreground/30">{it.name[0]}</span>
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-lg leading-tight truncate">{it.name}</h3>
                      {it.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{it.description}</p>}
                    </div>
                    {!it.is_published && <span className="text-[10px] uppercase tracking-wider bg-secondary px-2 py-1 rounded">Hidden</span>}
                  </div>
                  <MacroBadges macros={macros} />
                  <p className="text-xs text-muted-foreground">{recipe.length} ingredient{recipe.length === 1 ? "" : "s"}</p>
                  <div className="flex gap-2 mt-auto pt-2">
                    <Button asChild variant="default" size="sm" className="flex-1"><Link to={`/dashboard/items/${it.id}`}>Edit recipe</Link></Button>
                    <Button variant="outline" size="icon" onClick={() => openEdit(it)} aria-label="Edit details"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={() => togglePublish(it)} aria-label="Toggle publish">
                      {it.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => remove(it.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MenuItems;
