import { useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { SignIn, SignUp } from "@clerk/react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Auth() {
  const location = useLocation();
  const [params] = useSearchParams();
  const { user, loading, error } = useAuth();
  const [restaurantName, setRestaurantName] = useState(() => sessionStorage.getItem("solace-signup-restaurant") || "");
  const [ready, setReady] = useState(() => Boolean(sessionStorage.getItem("solace-signup-restaurant")));
  const signup = location.pathname.includes("sign-up");
  if (location.pathname.endsWith("/auth")) return <Navigate replace to={params.get("mode") === "signup" ? "/sign-up" : "/sign-in"} />;
  if (!loading && user) return <Navigate replace to="/dashboard" />;
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
          {signup && !ready ? (
            <form className="bg-card rounded-2xl border border-border p-8 shadow-md-soft space-y-5" onSubmit={(e) => {
              e.preventDefault();
              const name = restaurantName.trim();
              if (name.length < 2) return;
              sessionStorage.setItem("solace-signup-restaurant", name);
              setReady(true);
            }}>
              <div className="space-y-2">
                <Label htmlFor="restaurant_name">Restaurant name</Label>
                <Input id="restaurant_name" autoComplete="organization" required minLength={2} maxLength={80} value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} placeholder="Pearl & Olive" />
              </div>
              <Button variant="hero" size="lg" className="w-full">Continue</Button>
              <p className="text-center text-sm text-muted-foreground">Already have an account? <Link to="/sign-in" className="text-primary underline">Sign in</Link></p>
            </form>
          ) : signup ? (
            <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} forceRedirectUrl={`${basePath}/dashboard`} unsafeMetadata={{ restaurant_name: restaurantName }} />
          ) : (
            <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} forceRedirectUrl={`${basePath}/dashboard`} />
          )}
        </div>
      </main>
    </div>
  );
}
