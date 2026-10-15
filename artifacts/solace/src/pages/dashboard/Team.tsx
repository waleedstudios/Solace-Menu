import { useEffect, useState } from "react";
import { dataApi as supabase } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant } from "@/hooks/useRestaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const Team = () => {
  const { user } = useAuth();
  const { restaurant, role, isOwner, locations, reload } = useRestaurant();
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState(""); const [newRole, setNewRole] = useState("staff");
  const [locName, setLocName] = useState("");
  const [thr, setThr] = useState(""); const [ret, setRet] = useState("");

  const load = async () => {
    if (!restaurant) return;
    const { data } = await supabase.from("restaurant_members").select("*").eq("restaurant_id", restaurant.id).order("created_at");
    setMembers(data || []); setThr(String(restaurant.price_alert_threshold_pct)); setRet(restaurant.invoice_retention_days ? String(restaurant.invoice_retention_days) : "");
  };
  useEffect(() => { load(); }, [restaurant?.id]);

  const addMember = async () => {
    const { data, error } = await supabase.rpc("add_member_by_email", { _restaurant: restaurant!.id, _email: email, _role: newRole as any });
    if (error) return toast.error(error.message);
    if (data === "not_found") return toast.error("No account with that email yet. Ask them to sign up first, then add them.");
    toast.success("Added"); setEmail(""); load();
  };
  const setMemberRole = async (id: string, r: string) => { const { error } = await supabase.from("restaurant_members").update({ role: r as any }).eq("id", id); if (error) toast.error(error.message); load(); };
  const removeMember = async (id: string) => { if (confirm("Remove this person?")) { await supabase.from("restaurant_members").delete().eq("id", id); load(); } };
  const addLoc = async () => { if (!locName.trim()) return; const { error } = await supabase.from("locations").insert({ restaurant_id: restaurant!.id, name: locName.trim() }); if (error) return toast.error(error.message); setLocName(""); reload(); };
  const delLoc = async (id: string) => { if (locations.length <= 1) return toast.error("Keep at least one location"); if (confirm("Delete location? Invoices and sales keep their data but lose the location tag.")) { await supabase.from("locations").delete().eq("id", id); reload(); } };
  const saveSettings = async () => {
    const { error } = await supabase.from("restaurants").update({ price_alert_threshold_pct: Number(thr) || 5, invoice_retention_days: ret ? Number(ret) : null }).eq("id", restaurant!.id);
    if (error) return toast.error(error.message); toast.success("Settings saved"); reload();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div><h1 className="font-display text-4xl">Team & settings</h1><p className="text-muted-foreground text-sm mt-1">You are {role === "owner" ? "the owner" : `a ${role}`} of {restaurant?.name}.</p></div>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <p className="font-medium">Team</p>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p><b>Owner</b> — everything, including team, locations and settings.</p>
          <p><b>Manager</b> — ingredients, recipes, invoice approval, sales and reports.</p>
          <p><b>Staff</b> — upload invoices only.</p>
        </div>
        <div className="divide-y divide-border">{members.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span className="truncate">{m.email || m.user_id}{m.user_id === user?.id && " (you)"}</span>
            {isOwner && m.role !== "owner" ? <div className="flex gap-2">
              <select className="h-9 border border-input rounded-md bg-background px-2" value={m.role} onChange={(e) => setMemberRole(m.id, e.target.value)}><option value="manager">Manager</option><option value="staff">Staff</option></select>
              <Button size="sm" variant="ghost" onClick={() => removeMember(m.id)}>Remove</Button></div> : <Badge variant="outline">{m.role}</Badge>}
          </div>))}</div>
        {isOwner && <div className="flex flex-wrap gap-2">
          <Input className="flex-1 min-w-[200px]" placeholder="teammate@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className="h-10 border border-input rounded-md bg-background px-2 text-sm" value={newRole} onChange={(e) => setNewRole(e.target.value)}><option value="manager">Manager</option><option value="staff">Staff</option></select>
          <Button onClick={addMember}>Add</Button>
        </div>}
        {isOwner && <p className="text-xs text-muted-foreground">Teammates need an account first. If they sign up just to join, they'll also get an empty restaurant of their own; they can switch between workspaces from the sidebar.</p>}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <p className="font-medium">Locations</p>
        <p className="text-xs text-muted-foreground">Recipes and ingredients are shared. Invoices and sales are tagged per location for separate reports.</p>
        {locations.map((l) => <div key={l.id} className="flex justify-between text-sm py-1"><span>{l.name}</span>{isOwner && <button className="text-muted-foreground text-xs underline" onClick={() => delLoc(l.id)}>delete</button>}</div>)}
        {isOwner && <div className="flex gap-2"><Input placeholder="New location name" value={locName} onChange={(e) => setLocName(e.target.value)} /><Button onClick={addLoc}>Add</Button></div>}
      </section>

      {isOwner && <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <p className="font-medium">Settings</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1"><Label className="text-xs">Price alert threshold (%)</Label><Input type="number" value={thr} onChange={(e) => setThr(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Invoice retention (days, blank = keep forever)</Label><Input type="number" value={ret} onChange={(e) => setRet(e.target.value)} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Retention is recorded now; automatic deletion of old invoices isn't switched on yet.</p>
        <Button onClick={saveSettings}>Save settings</Button>
      </section>}

      <section className="rounded-2xl border border-border bg-card p-5 space-y-1 text-sm">
        <p className="font-medium">Privacy</p>
        <p className="text-muted-foreground">Your data is visible only to your team inside the app. Recipe encryption isn't built yet, so the platform operator could technically still read data stored on the server. Invoices and nutrition labels are sent to an AI service to be read; recipes are never sent.</p>
      </section>
    </div>
  );
};
export default Team;
