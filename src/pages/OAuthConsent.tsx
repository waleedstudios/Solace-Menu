import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("This link is missing its authorization request.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch (e: any) {
        if (active) setError(e?.message || "Could not reach the authorization server.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve ? await oauth().approveAuthorization(authorizationId) : await oauth().denyAuthorization(authorizationId);
      if (error) { setBusy(false); return setError(error.message); }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) { setBusy(false); return setError("No redirect returned by the authorization server."); }
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(e?.message || "Something went wrong.");
    }
  }

  const name = details?.client?.name ?? details?.client?.client_name ?? "An app";
  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-md-soft text-center space-y-5">
        <Logo size={36} />
        {error ? (
          <p className="text-sm text-destructive">Could not load this request: {error}</p>
        ) : !details ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <>
            <h1 className="font-display text-2xl">Connect {name} to Solace Menu</h1>
            <p className="text-sm text-muted-foreground">
              {name} will be able to read your restaurants' ingredients, menu items and invoices as you. Recipe lines are never shared.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Deny</Button>
              <Button variant="hero" disabled={busy} onClick={() => decide(true)}>Approve</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
