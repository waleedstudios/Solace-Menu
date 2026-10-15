import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";

const signupSchema = z.object({
  restaurant_name: z.string().trim().min(2, "Restaurant name is required").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});
const signinSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password required"),
});

const Auth = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const mode = params.get("mode") === "signup" ? "signup" : "signin";

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ restaurant_name: "", email: "", password: "" });

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { restaurant_name: parsed.data.restaurant_name },
          },
        });
        if (error) { toast.error(error.message); return; }
        toast.success("Welcome to Solace Menu");
      } else {
        const parsed = signinSchema.safeParse(form);
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email, password: parsed.data.password,
        });
        if (error) { toast.error(error.message); return; }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      <header className="container py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <Logo size={40} className="mb-6" />
            <h1 className="font-display text-4xl mb-2">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {mode === "signup" ? "Set up your restaurant in under a minute." : "Sign in to your dashboard."}
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-8 shadow-md-soft">
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="restaurant_name">Restaurant name</Label>
                  <Input id="restaurant_name" autoComplete="organization" value={form.restaurant_name}
                    onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })} placeholder="Pearl & Olive" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@restaurant.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "signup" ? "Already have an account? " : "New to Solace Menu? "}
            <button
              className="text-primary font-medium hover:underline"
              onClick={() => setParams(mode === "signup" ? {} : { mode: "signup" })}
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;
