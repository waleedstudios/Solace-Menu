import { Link, useParams } from "react-router-dom";
import { useGetPublicMenu, getGetPublicMenuQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { MacroBadges } from "@/components/MacroBadges";
import { money } from "@/lib/units";

const visibleInterval = () => (typeof document !== "undefined" && document.visibilityState === "hidden" ? false : 15000);

const PublicMenu = () => {
  const { slug = "" } = useParams();
  const q = useGetPublicMenu(slug, {
    query: {
      queryKey: getGetPublicMenuQueryKey(slug),
      enabled: !!slug,
      refetchInterval: visibleInterval,
      refetchOnWindowFocus: true,
      refetchOnMount: "always",
      retry: (n: number, e: any) => e?.status !== 404 && n < 2,
    } as any,
  });
  const data = q.data as any;
  const err = q.error as any;

  if (!data && q.isLoading) return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container py-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => <div key={i} className="h-72 rounded-2xl bg-secondary animate-pulse" />)}
      </div>
    </div>
  );
  if (!data && err?.status === 404) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <h1 className="font-display text-5xl mb-3">Menu not found</h1>
      <p className="text-muted-foreground mb-6">No restaurant exists at that URL.</p>
      <Link to="/" className="text-primary underline">Back home</Link>
    </div>
  );
  if (!data) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <h1 className="font-display text-4xl mb-3">We couldn't load this menu</h1>
      <p className="text-muted-foreground mb-6">Something went wrong on our side.</p>
      <Button variant="hero" onClick={() => q.refetch()}>Retry</Button>
    </div>
  );

  const items: any[] = data.items || [];
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container py-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Menu</p>
            <h1 className="font-display text-2xl md:text-3xl leading-tight">{data.restaurant_name}</h1>
          </div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Powered by Solace Menu</Link>
        </div>
      </header>
      <main className="container py-10 md:py-16">
        {q.isError && (
          <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3 text-sm flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Couldn't refresh the menu. Showing the last version.</span>
            <Button size="sm" variant="outline" onClick={() => q.refetch()}>Retry</Button>
          </div>
        )}
        {items.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="font-display text-3xl mb-2">Coming soon</h2>
            <p className="text-muted-foreground">This restaurant hasn't published menu items yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((it) => (
              <article key={`${it.source}-${it.id}`} className="bg-card rounded-2xl border border-border shadow-sm-soft overflow-hidden flex flex-col hover:shadow-md-soft transition-shadow animate-fade-up">
                {it.image_url ? (
                  <div className="aspect-[4/3] bg-secondary overflow-hidden"><img src={it.image_url} alt={it.name} loading="lazy" className="w-full h-full object-cover" /></div>
                ) : (
                  <div className="aspect-[4/3] bg-gradient-subtle flex items-center justify-center"><span className="font-display text-6xl text-muted-foreground/30">{it.name[0]}</span></div>
                )}
                <div className="p-6 flex-1 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-2xl leading-tight">{it.name}</h2>
                    {it.selling_price != null && <span className="text-sm font-medium tabular-nums shrink-0">{money(it.selling_price)}</span>}
                  </div>
                  {it.category && <p className="text-xs text-muted-foreground">{it.category}</p>}
                  {it.description && <p className="text-sm text-muted-foreground leading-relaxed">{it.description}</p>}
                  {it.serving_size_text && <p className="text-xs text-muted-foreground">Serving: {it.serving_size_text}</p>}
                  <div className="mt-auto pt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">Nutrition per serving</p>
                    {it.macros && it.nutrition_complete ? (
                      <>
                        <MacroBadges macros={it.macros} />
                        {it.estimated_nutrition && <p className="text-xs text-muted-foreground">Estimated per serving</p>}
                      </>
                    ) : it.macros ? (
                      <p className="text-xs text-muted-foreground">Nutrition incomplete</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nutrition coming soon</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <footer className="border-t border-border/60 py-8 mt-10">
        <div className="container text-center text-xs text-muted-foreground">
          Nutrition calculated from standardized recipes · <Link to="/" className="hover:text-foreground">Solace Menu</Link>
        </div>
      </footer>
    </div>
  );
};

export default PublicMenu;
