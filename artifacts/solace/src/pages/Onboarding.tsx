import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSignOut } from "@/lib/clerk";
import { Loader2 } from "lucide-react";
import { useAuth, type BusinessDetails } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

type Errors = Partial<Record<keyof BusinessDetails, string>>;

function validate(v: BusinessDetails): Errors {
  const e: Errors = {};
  if (v.full_name.trim().length < 2) e.full_name = "Enter your full name.";
  if (v.business_name.trim().length < 2) e.business_name = "Enter your business name.";
  if (v.business_address.trim().length < 5) e.business_address = "Enter the store address.";
  if (v.business_phone.replace(/\D/g, "").length < 7) e.business_phone = "Enter a phone number with at least 7 digits.";
  return e;
}

export default function Onboarding() {
  const { user, loading, error, completeOnboarding } = useAuth();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const [form, setForm] = useState<BusinessDetails | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (loading) return <div className="min-h-[100dvh] bg-gradient-subtle flex items-center justify-center text-muted-foreground" role="status">Loading your account…</div>;
  if (error) return <div className="min-h-[100dvh] flex flex-col gap-4 items-center justify-center px-6"><p role="alert" className="text-destructive">{error}</p><Button onClick={() => window.location.reload()}>Retry</Button></div>;
  if (!user) return <Navigate replace to="/sign-in" />;
  if (user.onboarding_complete && !pending) return <Navigate replace to="/dashboard" />;

  const values: BusinessDetails = form ?? {
    full_name: user.full_name ?? "",
    email: user.email,
    business_name: user.business_name ?? "",
    business_address: user.business_address ?? "",
    business_phone: user.business_phone ?? "",
  };
  const set = (k: keyof BusinessDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...values, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const found = validate(values);
    setErrors(found);
    setSubmitError(null);
    if (Object.keys(found).length) return;
    setPending(true);
    try {
      await completeOnboarding({
        full_name: values.full_name.trim(),
        email: values.email,
        business_name: values.business_name.trim(),
        business_address: values.business_address.trim(),
        business_phone: values.business_phone.trim(),
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "We couldn't save your details. Please try again.");
      setPending(false);
    }
  };

  const field = (
    id: keyof BusinessDetails, label: string, props: React.ComponentProps<typeof Input> = {},
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id} name={id} value={values[id]} onChange={set(id)} disabled={pending}
        aria-invalid={Boolean(errors[id])} aria-describedby={errors[id] ? `${id}-error` : undefined}
        {...props}
      />
      {errors[id] && <p id={`${id}-error`} className="text-sm text-destructive">{errors[id]}</p>}
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-subtle flex flex-col">
      <header className="container py-6 flex items-center justify-between">
        <Logo size={32} />
        <button type="button" disabled={pending} onClick={() => signOut({ redirectUrl: "/" })} className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors">
          Sign out
        </button>
      </header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 sm:px-6 pb-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl mb-2">Tell us about your restaurant</h1>
            <p className="text-muted-foreground text-sm">One last step before your dashboard.</p>
          </div>
          <form noValidate onSubmit={submit} className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-md-soft space-y-5">
            {submitError && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{submitError}</p>}
            {field("business_name", "Business name", { autoComplete: "organization", maxLength: 80, placeholder: "Pearl & Olive" })}
            <div className="space-y-2">
              <Label htmlFor="business_address">Store address</Label>
              <Textarea
                id="business_address" name="business_address" autoComplete="street-address"
                value={values.business_address} onChange={(e) => setForm({ ...values, business_address: e.target.value })}
                disabled={pending} maxLength={500} rows={3} placeholder="214 Harbor St, Portland, ME"
                aria-invalid={Boolean(errors.business_address)}
                aria-describedby={errors.business_address ? "business_address-error" : undefined}
              />
              {errors.business_address && <p id="business_address-error" className="text-sm text-destructive">{errors.business_address}</p>}
            </div>
            {field("business_phone", "Business phone", { type: "tel", autoComplete: "tel", inputMode: "tel", maxLength: 30, placeholder: "+1 (207) 555-0142" })}
            {field("full_name", "Your name", { autoComplete: "name", maxLength: 80 })}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={values.email} title={values.email} readOnly aria-describedby="email-note" className="bg-muted text-muted-foreground" />
              <p id="email-note" className="text-xs text-muted-foreground">Verified through your sign-in.</p>
            </div>
            <Button variant="hero" size="lg" className="w-full" disabled={pending}>
              {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : "Continue to dashboard"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
