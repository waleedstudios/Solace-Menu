import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Carrot, Ruler, ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

type Profile = { restaurant_name: string; slug: string };

const DashboardLayout = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("restaurant_name, slug").eq("id", user.id).maybeSingle()
      .then(({ data }) => data && setProfile(data));
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/");
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
      isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"
    }`;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Logo size={32} />
          <div className="flex items-center gap-2">
            {profile && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/r/${profile.slug}`} target="_blank" rel="noreferrer">
                  Public menu <ExternalLink />
                </a>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8 grid lg:grid-cols-[220px_1fr] gap-8">
        <aside className="space-y-1">
          {profile && (
            <div className="mb-6 px-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Restaurant</p>
              <p className="font-display text-lg leading-tight">{profile.restaurant_name}</p>
            </div>
          )}
          <NavLink to="/dashboard" end className={navCls}><LayoutGrid className="h-4 w-4" /> Menu items</NavLink>
          <NavLink to="/dashboard/ingredients" className={navCls}><Carrot className="h-4 w-4" /> Ingredients</NavLink>
          <NavLink to="/dashboard/portions" className={navCls}><Ruler className="h-4 w-4" /> Portion units</NavLink>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
