import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MacroBadges } from "@/components/MacroBadges";
import { totalMacros, type Ingredient, type PortionUnit, type RecipeItem } from "@/lib/macros";

type Profile = { id: string; restaurant_name: string; slug: string };
type MenuItem = { id: string; name: string; description: string | null; image_url: string | null };

const PublicMenu = () => {
  const { slug } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [recipes, setRecipes] = useState<Record<string, RecipeItem[]>>({});
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [portionUnits, setPortionUnits] = useState<PortionUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from("profiles").select("id, restaurant_name, slug").eq("slug", slug).maybeSingle();
      if (!p) { setNotFound(true); setLoading(false); return; }
      setProfile(p as Profile);

      const { data: m } = await supabase.from("menu_items").select("id, name, description, image_url")
        .eq("user_id", p.id).eq("is_published", true).order("created_at", { ascending: false });
      const list = (m as MenuItem[]) || [];
      setItems(list);

      if (list.length) {
        const ids = list.map((x) => x.id);
        const [{ data: ris }, { data: ing }, { data: pu }] = await Promise.all([
          supabase.from("recipe_items").select("*").in("menu_item_id", ids),
          supabase.from("ingredients").select("*"),
          supabase.from("portion_units").select("*").eq("user_id", p.id),
        ]);
        const grouped: Record<string, RecipeItem[]> = {};
        (ris || []).forEach((r: any) => { (grouped[r.menu_item_id] ||= []).push(r as RecipeItem); });
        setRecipes(grouped);
        setIngredients((ing as Ingredient[]) || []);
        setPortionUnits((pu as PortionUnit[]) || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading menu…</div>;
  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <h1 className="font-display text-5xl mb-3">Menu not found</h1>
      <p className="text-muted-foreground mb-6">No restaurant exists at that URL.</p>
      <Link to="/" className="text-primary underline">← Back home</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container py-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Menu</p>
            <h1 className="font-display text-2xl md:text-3xl leading-tight">{profile?.restaurant_name}</h1>
          </div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Powered by MacroMenu</Link>
        </div>
      </header>

      <main className="container py-10 md:py-16">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="font-display text-3xl mb-2">Coming soon</h2>
            <p className="text-muted-foreground">This restaurant hasn't published menu items yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((it) => {
              const recipe = recipes[it.id] || [];
              const macros = totalMacros(recipe, ingredients, portionUnits);
              return (
                <article key={it.id} className="bg-card rounded-2xl border border-border shadow-sm-soft overflow-hidden flex flex-col hover:shadow-md-soft transition-shadow animate-fade-up">
                  {it.image_url ? (
                    <div className="aspect-[4/3] bg-secondary overflow-hidden">
                      <img src={it.image_url} alt={it.name} loading="lazy" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-gradient-subtle flex items-center justify-center">
                      <span className="font-display text-6xl text-muted-foreground/30">{it.name[0]}</span>
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col gap-3">
                    <h2 className="font-display text-2xl leading-tight">{it.name}</h2>
                    {it.description && <p className="text-sm text-muted-foreground leading-relaxed">{it.description}</p>}
                    <div className="mt-auto pt-2">
                      <MacroBadges macros={macros} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-border/60 py-8 mt-10">
        <div className="container text-center text-xs text-muted-foreground">
          Macros calculated from standardized recipes · <Link to="/" className="hover:text-foreground">MacroMenu</Link>
        </div>
      </footer>
    </div>
  );
};

export default PublicMenu;
