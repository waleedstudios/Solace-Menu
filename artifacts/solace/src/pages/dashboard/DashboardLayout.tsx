import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RestaurantProvider, useRestaurant } from "@/hooks/useRestaurant";
import { dataApi as supabase } from "@/lib/data";
import { useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LayoutGrid, Carrot, Ruler, ExternalLink, LogOut, ScanLine, BookOpen, BarChart3, Users } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const Shell = () => {
  const navigate = useNavigate();
  const { signOut: clerkSignOut } = useClerk();
  const { user } = useAuth();
  const { restaurant, role, canManage, loading, memberships, switchTo, error } = useRestaurant();
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("slug").eq("id", user.id).maybeSingle().then(({ data }) => setSlug(data?.slug ?? null));
  }, [user]);

  const signOut = async () => { await clerkSignOut(); toast.success("Signed out"); navigate("/"); };
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border bg-card">
        <div className="container flex h-16 items-center justify-between gap-2">
          <Logo size={32} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {slug && (
              <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
                <a href={`/r/${slug}`} target="_blank" rel="noreferrer">Public menu <ExternalLink /></a>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut /> <span className="hidden sm:inline">Sign out</span></Button>
          </div>
        </div>
      </header>

      <div className="container py-6 lg:py-8 grid lg:grid-cols-[220px_1fr] gap-6 lg:gap-8">
        <aside className="space-y-1">
          {restaurant && (
            <div className="mb-4 px-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Restaurant · {role}</p>
              {memberships.length > 1 ? (
                <select className="font-display text-lg bg-transparent" value={restaurant.id} onChange={(e) => switchTo(e.target.value)}>
                  {memberships.map((m) => <option key={m.restaurant_id} value={m.restaurant_id}>{m.name}</option>)}
                </select>
              ) : <p className="font-display text-lg leading-tight">{restaurant.name}</p>}
            </div>
          )}
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {canManage && <NavLink to="/dashboard" end className={navCls}><LayoutDashboard className="h-4 w-4" /> Overview</NavLink>}
            <NavLink to="/dashboard/invoices" className={navCls}><ScanLine className="h-4 w-4" /> Scan invoice</NavLink>
            {canManage && <>
              <NavLink to="/dashboard/ingredients" className={navCls}><Carrot className="h-4 w-4" /> Ingredients</NavLink>
              <NavLink to="/dashboard/recipes" className={navCls}><BookOpen className="h-4 w-4" /> Recipes</NavLink>
              <NavLink to="/dashboard/sales" className={navCls}><BarChart3 className="h-4 w-4" /> Sales</NavLink>
              <NavLink to="/dashboard/menu" className={navCls}><LayoutGrid className="h-4 w-4" /> Public menu</NavLink>
              <NavLink to="/dashboard/portions" className={navCls}><Ruler className="h-4 w-4" /> Portion units</NavLink>
            </>}
            <NavLink to="/dashboard/team" className={navCls}><Users className="h-4 w-4" /> Team & settings</NavLink>
          </nav>
        </aside>
        <main className="min-w-0">
          {loading ? <p className="text-muted-foreground">Loading…</p> : error ? <p role="alert" className="text-destructive">{error}</p> : !restaurant ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="font-display text-2xl mb-2">No workspace yet</p>
              <p className="text-sm text-muted-foreground">Ask a restaurant owner to add your email to their team.</p>
            </div>
          ) : <Outlet />}
        </main>
      </div>
    </div>
  );
};

const DashboardLayout = () => {
  const { user, loading, error } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user && !error) navigate("/auth", { replace: true }); }, [user, loading, error, navigate]);
  if (error) return <div className="min-h-screen flex flex-col gap-3 items-center justify-center text-destructive"><p role="alert">{error}</p><button className="underline" onClick={() => window.location.reload()}>Retry</button></div>;
  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  return <RestaurantProvider><Shell /></RestaurantProvider>;
};

export default DashboardLayout;
