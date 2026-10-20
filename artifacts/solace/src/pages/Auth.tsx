import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { SignIn, SignUp } from "@clerk/react";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { clerkEnabled } from "@/lib/clerk";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Auth() {
  const location = useLocation();
  const [params] = useSearchParams();
  const { user, loading, error } = useAuth();
  const signup = location.pathname.includes("sign-up");
  if (location.pathname.endsWith("/auth")) return <Navigate replace to={params.get("mode") === "signup" ? "/sign-up" : "/sign-in"} />;
  if (!loading && user) return <Navigate replace to={user.onboarding_complete ? "/dashboard" : "/onboarding"} />;
  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      <header className="container py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-4 w-4" /> Back</Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo size={40} className="mb-6" />
            <h1 className="font-display text-4xl mb-2">{signup ? "Create your account" : "Welcome back"}</h1>
            <p className="text-muted-foreground text-sm">{signup ? "Set up your restaurant in under a minute." : "Sign in to your dashboard."}</p>
          </div>
          {error && <p role="alert" className="rounded-lg border border-destructive p-4 mb-4 text-sm text-destructive">{error} <button className="underline" onClick={() => window.location.reload()}>Retry</button></p>}
          {!clerkEnabled ? (
            <p role="status" className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-md-soft">Sign-in isn't available in this preview. Use the live Solace Menu site to sign in.</p>
          ) : signup ? (
            <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} forceRedirectUrl={`${basePath}/onboarding`} />
          ) : (
            <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} forceRedirectUrl={`${basePath}/onboarding`} />
          )}
        </div>
      </main>
    </div>
  );
}
