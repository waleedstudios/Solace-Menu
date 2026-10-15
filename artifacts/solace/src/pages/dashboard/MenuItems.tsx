import { useState } from "react";
import { Link } from "react-router-dom";
import { useGetRestaurantMenu, getGetRestaurantMenuQueryKey } from "@workspace/api-client-react";
import { dataApi as supabase } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant } from "@/hooks/useRestaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { MacroBadges } from "@/components/MacroBadges";
import { toast } from "sonner";

const MenuItems = () => {
  const { user } = useAuth();
  const { restaurant, canManage, isOwner } = useRestaurant();
  const rid = restaurant?.id ?? "";
  const q = useGetRestaurantMenu(rid, {
    query: { queryKey: getGetRestaurantMenuQueryKey(rid), enabled: !!rid, refetchOnMount: "always", refetchOnWindowFocus: true } as any,
  });
  const items: any[] = (q.data as any)?.items || [];
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", image_url: "" });

  const openNew = () => { setEditing(null); setForm({ name: "", description: "", image_url: "" }); setOpen(true); };
  const openEdit = (it: any) => { setEditing(it); setForm({ name: it.name, description: it.description || "", image_url: it.image_url || "" }); setOpen(true); };

  const save = async () => {
    if (!user) return;
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const body = { name: form.name.trim(), description: form.description.trim() || null, image_url: form.image_url.trim() || null };
    const { error } = editing
      ? await supabase.from("menu_items").update(body).eq("id", editing.id)
      : await supabase.from("menu_items").insert({ user_id: user.id, ...body });
    if (error) return toast.error(error.message);
    toast.success(editing ? "Menu item updated" : "Menu item created");
    setOpen(false); q.refetch();
  };

  const table = (it: any) => (it.source === "recipe" ? "recipes" : "menu_items");
  const remove = async (it: any) => {
    if (!confirm("Delete this menu item?")) return;
    const { error } = await supabase.from(table(it)).delete().eq("id", it.id);
    if (error) return toast.error(it.source === "recipe" ? "This recipe is used as a sub-recipe elsewhere — remove it there first." : error.message);
    toast.success("Deleted"); q.refetch();
  };
  const toggle = async (it: any) => {
    const { error } = await supabase.from(table(it)).update({ is_published: !it.is_published }).eq("id", it.id);
    if (error) return toast.error(error.message);
    q.refetch();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl">Menu items</h1>
          <p className="text-muted-foreground text-sm mt-1">Recipes appear here and on your public menu with live nutrition.</p>
        </div>
        {isOwner && <Button variant="hero" onClick={openNew}><Plus /> New item</Button>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit menu item" : "New menu item"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label htmlFor="n">Name</Label><Input id="n" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Grilled Chicken Bowl" /></div>
            <div><Label htmlFor="d">Description</Label><Textarea id="d" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div><Label htmlFor="i">Image URL (optional)</Label><Input id="i" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="hero" onClick={save}>{editing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {!q.data && q.isLoading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{[0, 1, 2].map((i) => <div key={i} className="h-72 rounded-2xl bg-secondary animate-pulse" />)}</div>
      ) : !q.data && q.isError ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <h3 className="font-display text-2xl mb-2">Couldn't load the menu</h3>
          <Button variant="hero" onClick={() => q.refetch()}>Retry</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-16 text-center">
          <h3 className="font-display text-2xl mb-2">No menu items yet</h3>
          <p className="text-muted-foreground mb-6">Create a recipe and it will appear here.</p>
          <Button asChild variant="hero"><Link to="/dashboard/recipes">Go to recipes</Link></Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((it) => {
            const modern = it.source === "recipe";
            const editable = it.can_edit && (modern ? canManage : isOwner);
            const editLink = modern ? `/dashboard/recipes/${it.id}` : `/dashboard/items/${it.id}`;
            return (
              <div key={`${it.source}-${it.id}`} className="bg-card rounded-2xl border border-border shadow-sm-soft hover:shadow-md-soft transition-all overflow-hidden flex flex-col">
                {it.image_url ? (
                  <div className="aspect-[4/3] bg-secondary overflow-hidden"><img src={it.image_url} alt={it.name} className="w-full h-full object-cover" loading="lazy" /></div>
                ) : (
                  <div className="aspect-[4/3] bg-gradient-subtle flex items-center justify-center"><span className="font-display text-5xl text-muted-foreground/30">{it.name[0]}</span></div>
                )}
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-lg leading-tight truncate">{it.name}</h3>
                      {it.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{it.description}</p>}
                    </div>
                    {!it.is_published && <span className="text-[10px] uppercase tracking-wider bg-secondary px-2 py-1 rounded">Hidden</span>}
                  </div>
                  {it.macros && it.nutrition_complete ? <MacroBadges macros={it.macros} />
                    : <p className="text-xs text-muted-foreground">{it.macros ? "Nutrition incomplete" : "Nutrition coming soon"}</p>}
                  <p className="text-xs text-muted-foreground">{it.ingredient_count} ingredient{it.ingredient_count === 1 ? "" : "s"}{it.estimated_nutrition && it.macros ? " · estimated" : ""}</p>
                  <div className="flex gap-2 mt-auto pt-2">
                    {editable ? (
                      <>
                        <Button asChild size="sm" className="flex-1"><Link to={editLink}>Edit recipe</Link></Button>
                        {!modern && <Button variant="outline" size="icon" onClick={() => openEdit(it)} aria-label="Edit details"><Pencil className="h-4 w-4" /></Button>}
                        <Button variant="outline" size="icon" onClick={() => toggle(it)} aria-label="Toggle publish">{it.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
                        <Button variant="outline" size="icon" onClick={() => remove(it)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">View only</p>
                    )}
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
