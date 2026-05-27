import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Sparkles, Calculator, QrCode, ShieldCheck, Salad,
  BarChart3, Zap, Wand2, Check, Star, Instagram, Twitter, Linkedin,
} from "lucide-react";
import dishBowl from "@/assets/dish-bowl.jpg";
import { useAuth } from "@/hooks/useAuth";
import { InteractiveMenuDemo } from "@/components/landing/InteractiveMenuDemo";
import { DashboardPreview } from "@/components/landing/DashboardPreview";

const features = [
  { icon: Calculator, title: "AI Macro Calculation", desc: "Detect ingredients, infer portions, and verify macros against a 400k+ food database." },
  { icon: Salad, title: "Portion Intelligence", desc: "Define units once — grams, cups, slices — and Solace scales every recipe automatically." },
  { icon: QrCode, title: "QR Nutrition Menus", desc: "Generate a beautiful public menu at /r/your-slug — print one QR and you're live." },
  { icon: ShieldCheck, title: "Allergen Tracking", desc: "Surface gluten, dairy, nut, soy and sesame at the dish and modifier level." },
  { icon: Wand2, title: "Interactive Menus", desc: "Diners filter by goals, toggle modifiers, and watch macros recalculate in real time." },
  { icon: BarChart3, title: "Restaurant Analytics", desc: "See what guests view, customize, and reorder. Optimize menus with confidence." },
  { icon: Sparkles, title: "Menu Optimization", desc: "AI suggests lower-calorie swaps and high-margin upsells that fit your brand." },
  { icon: Zap, title: "Real-Time Updates", desc: "Edit a recipe and every QR menu updates instantly. No reprints, no waste." },
];

const testimonials = [
  { name: "Maya Chen", role: "Owner, Nourish Kitchen", quote: "Our guests trust the macros. Conversion on healthy bowls jumped 31% the week we launched." },
  { name: "David Rasmussen", role: "Chef, Hearth & Grain", quote: "Setup took an afternoon. Solace replaced three tools and a very angry spreadsheet." },
  { name: "Priya Shah", role: "Founder, Lift Café", quote: "Macro-first diners are our people. Solace makes us look like a venture-backed tech company." },
];

const plans = [
  { name: "Starter", price: "29", desc: "For new restaurants finding their groove.", features: ["Up to 30 menu items", "AI macro calculation", "Public QR menu", "Basic allergens"], cta: "Start free" },
  { name: "Pro", price: "89", desc: "For growing kitchens that want it all.", popular: true, features: ["Unlimited items & menus", "Verified nutrition reviews", "Modifier intelligence", "Analytics dashboard", "Priority support"], cta: "Start free trial" },
  { name: "Enterprise", price: "Custom", desc: "Multi-location chains and franchises.", features: ["POS & menu integrations", "Location-level analytics", "SSO & audit logs", "Dedicated success manager", "Custom SLAs"], cta: "Talk to sales" },
];

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-foreground text-background">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-display text-2xl leading-none">Solace Menu</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-foreground/70 md:flex">
            <a href="#demo" className="hover:text-foreground transition">Live demo</a>
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            {!loading && (user ? (
              <Button onClick={() => navigate("/dashboard")}>Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")} className="hidden sm:inline-flex">Sign in</Button>
                <Button onClick={() => navigate("/auth")} className="rounded-full">Get started</Button>
              </>
            ))}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-subtle" />
        <div className="absolute -top-32 left-1/2 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />

        <div className="container relative grid gap-16 py-20 md:py-28 lg:grid-cols-[1.05fr,1fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-medium backdrop-blur">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-accent"><Sparkles className="h-2.5 w-2.5" /></span>
              New · Solace AI agent v2 is live
            </div>
            <h1 className="font-display text-[clamp(3rem,7vw,6rem)] leading-[0.95] tracking-tight">
              Smarter nutrition.<br />
              <span className="italic text-foreground/70">Better menus.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              AI-powered interactive menus with real-time nutrition, macros, and portion intelligence — built for modern restaurants who care about what they serve.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => navigate("/auth")} className="group rounded-full px-6 h-12">
                Get started <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-6 h-12 border-foreground/20">
                Book demo
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-4 text-xs text-muted-foreground">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => <div key={i} className="h-7 w-7 rounded-full border-2 border-background bg-gradient-sage" />)}
              </div>
              <div>
                <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-foreground text-foreground" />)}</div>
                <div className="mt-0.5">Trusted by 400+ kitchens</div>
              </div>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative">
            <div className="relative aspect-square max-w-md mx-auto">
              <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-sage" />
              <img src={dishBowl} alt="Signature dish" width={1024} height={1024} className="absolute inset-3 rounded-[2rem] object-cover shadow-lg-soft" />

              {/* Floating macro cards */}
              <div className="absolute -left-6 top-8 rounded-2xl bg-background/90 px-4 py-3 shadow-lg-soft backdrop-blur-xl border border-border animate-float-slow">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Calories</div>
                <div className="font-display text-2xl tabular-nums">540</div>
                <div className="text-[10px] text-accent">↓ 18% vs avg</div>
              </div>

              <div className="absolute -right-4 top-32 rounded-2xl bg-foreground px-4 py-3 text-background shadow-glow animate-float-slow-2">
                <div className="text-[10px] font-medium uppercase tracking-wider opacity-60">Protein</div>
                <div className="font-display text-2xl tabular-nums">38g</div>
                <div className="mt-1 h-1 w-20 rounded-full bg-background/20"><div className="h-full w-3/4 rounded-full bg-accent" /></div>
              </div>

              <div className="absolute -left-2 bottom-10 rounded-2xl bg-background/90 px-4 py-3 shadow-lg-soft backdrop-blur-xl border border-border animate-float-slow">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft"><Sparkles className="h-3.5 w-3.5" /></span>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">AI suggests</div>
                    <div className="text-xs font-medium">Swap rice → cauliflower (−180 cal)</div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-6 -bottom-2 rounded-2xl bg-background/90 px-4 py-3 shadow-lg-soft backdrop-blur-xl border border-border animate-float-slow-2">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Carbs · Fats</div>
                <div className="font-display text-lg tabular-nums">52g <span className="text-foreground/40">·</span> 18g</div>
              </div>
            </div>
          </div>
        </div>

        {/* Logos */}
        <div className="container border-t border-border py-10">
          <div className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Powering nutrition for forward-thinking kitchens
          </div>
          <div className="mt-6 overflow-hidden">
            <div className="flex w-max items-center gap-16 animate-marquee opacity-50">
              {[...Array(2)].map((_, k) => (
                <div key={k} className="flex items-center gap-16">
                  {["NOURISH", "Hearth & Grain", "LIFT CAFÉ", "Verde Bowl", "Saltwater", "Daybreak", "Forma", "Olive Society"].map((l) => (
                    <span key={l + k} className="whitespace-nowrap font-display text-2xl">{l}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE MENU DEMO */}
      <section id="demo" className="container py-24">
        <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Live demo</div>
            <h2 className="mt-3 font-display text-5xl leading-tight md:text-6xl">Try a real Solace menu.</h2>
            <p className="mt-3 text-lg text-muted-foreground">Tap dishes, adjust portions, toggle modifiers. Every macro updates in real time — exactly what your guests will see.</p>
          </div>
          <div className="hidden gap-2 md:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs"><span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> Interactive</span>
          </div>
        </div>
        <InteractiveMenuDemo />
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="absolute -top-32 right-0 h-[400px] w-[600px] rounded-full bg-accent/30 blur-[140px]" />
        <div className="container relative grid gap-16 py-24 lg:grid-cols-[1fr,1.3fr] lg:items-center">
          <div className="space-y-6">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-background/50">For operators</div>
            <h2 className="font-display text-5xl leading-tight md:text-6xl">The kitchen OS for menu nutrition.</h2>
            <p className="text-lg text-background/70">Build recipes, manage ingredients, publish menus, and track engagement — all from one calm, fast dashboard.</p>
            <ul className="space-y-2 text-sm text-background/80">
              {["Drag-and-drop recipe builder", "Verified ingredient database", "Live macro recalculation", "Publish to QR or your website"].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> {f}</li>
              ))}
            </ul>
            <Button onClick={() => navigate("/auth")} className="rounded-full bg-background text-foreground hover:bg-background/90 h-12 px-6">
              Open the dashboard <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="container py-24">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Features</div>
          <h2 className="mt-3 font-display text-5xl leading-tight md:text-6xl">Everything your menu needs.</h2>
          <p className="mt-3 text-lg text-muted-foreground">Built with the precision of Stripe and the warmth of a great neighborhood restaurant.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div key={f.title} className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition-all hover:shadow-lg-soft hover:-translate-y-1">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-foreground transition group-hover:bg-foreground group-hover:text-background">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-accent/0 transition-all duration-500 group-hover:bg-accent/20 group-hover:blur-2xl" />
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-secondary/50 py-24">
        <div className="container">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">How it works</div>
            <h2 className="mt-3 font-display text-5xl leading-tight md:text-6xl">Live in three steps.</h2>
          </div>
          <div className="relative grid gap-6 md:grid-cols-3">
            <div className="pointer-events-none absolute left-[15%] right-[15%] top-12 hidden h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent md:block" />
            {[
              { n: "01", title: "Upload your recipes", desc: "Paste, import, or build recipes ingredient by ingredient. Photos optional." },
              { n: "02", title: "AI calculates macros", desc: "Solace identifies every ingredient, scales portions, and verifies the macros." },
              { n: "03", title: "Publish instantly", desc: "Share a QR code or embed your menu. Updates push live in seconds." },
            ].map((s, i) => (
              <div key={s.n} className="relative rounded-3xl border border-border bg-card p-8 text-center shadow-sm-soft">
                <div className="mx-auto mb-5 grid h-24 w-24 place-items-center rounded-full bg-background shadow-md-soft">
                  <div className="absolute h-24 w-24 rounded-full bg-accent/30 animate-pulse-ring" />
                  <span className="font-display text-3xl">{s.n}</span>
                </div>
                <h3 className="font-display text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container py-24">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Loved by operators</div>
          <h2 className="mt-3 font-display text-5xl leading-tight md:text-6xl">A quiet kind of magic.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="flex h-full flex-col justify-between rounded-3xl border border-border bg-card p-8 shadow-sm-soft">
              <div>
                <div className="mb-3 flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className="h-3.5 w-3.5 fill-foreground text-foreground" />)}</div>
                <blockquote className="font-display text-2xl leading-snug">"{t.quote}"</blockquote>
              </div>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                <div className="h-10 w-10 rounded-full bg-gradient-sage" />
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="container py-24">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Pricing</div>
          <h2 className="mt-3 font-display text-5xl leading-tight md:text-6xl">Simple, restaurant-friendly.</h2>
          <p className="mt-3 text-lg text-muted-foreground">Start free. Upgrade when your menu does.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={`relative rounded-3xl border p-8 ${p.popular ? "bg-foreground text-background border-foreground shadow-glow lg:scale-105" : "bg-card border-border"}`}>
              {p.popular && <span className="absolute -top-3 left-8 rounded-full bg-accent px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground">Most popular</span>}
              <div className="font-display text-2xl">{p.name}</div>
              <p className={`mt-1 text-sm ${p.popular ? "text-background/60" : "text-muted-foreground"}`}>{p.desc}</p>
              <div className="my-6 flex items-baseline gap-1">
                {p.price === "Custom" ? (
                  <span className="font-display text-5xl">Custom</span>
                ) : (
                  <>
                    <span className="font-display text-6xl tabular-nums">${p.price}</span>
                    <span className={`text-sm ${p.popular ? "text-background/60" : "text-muted-foreground"}`}>/mo</span>
                  </>
                )}
              </div>
              <Button
                onClick={() => navigate("/auth")}
                className={`w-full rounded-full h-11 ${p.popular ? "bg-background text-foreground hover:bg-background/90" : ""}`}
                variant={p.popular ? "default" : "outline"}
              >
                {p.cta}
              </Button>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className={`h-4 w-4 ${p.popular ? "text-accent" : "text-foreground/60"}`} /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-foreground p-12 text-center text-background md:p-20">
          <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-accent/30 blur-[120px]" />
          <div className="relative">
            <h2 className="mx-auto max-w-3xl font-display text-5xl leading-[1.05] md:text-7xl">
              Transform your menu into a smart nutrition experience.
            </h2>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={() => navigate("/auth")} className="rounded-full bg-background text-foreground hover:bg-background/90 h-12 px-6">
                Start free trial <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full h-12 px-6 border-background/30 text-background hover:bg-background/10 hover:text-background">
                Schedule demo
              </Button>
            </div>
            <div className="mt-6 text-xs text-background/50">No credit card required · 14-day trial</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="container grid gap-10 py-16 md:grid-cols-[2fr,1fr,1fr,1fr]">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-foreground text-background"><Sparkles className="h-4 w-4" /></div>
              <span className="font-display text-2xl leading-none">Solace Menu</span>
            </Link>
            <p className="max-w-sm text-sm text-muted-foreground">AI nutrition intelligence for modern restaurants. Built with care in your kitchen, not a lab.</p>
            <div className="flex gap-2">
              {[Instagram, Twitter, Linkedin].map((I, i) => (
                <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-full border border-border transition hover:bg-foreground hover:text-background">
                  <I className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {[
            { title: "Product", links: ["Features", "Live demo", "Pricing", "Changelog"] },
            { title: "Company", links: ["About", "Customers", "Careers", "Contact"] },
            { title: "Legal", links: ["Privacy", "Terms", "Security", "DPA"] },
          ].map((c) => (
            <div key={c.title}>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.title}</div>
              <ul className="mt-4 space-y-2 text-sm">
                {c.links.map((l) => <li key={l}><a href="#" className="text-foreground/70 hover:text-foreground transition">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border">
          <div className="container flex flex-col items-center justify-between gap-4 py-6 text-xs text-muted-foreground sm:flex-row">
            <div>© {new Date().getFullYear()} Solace Menu. menusolace.com</div>
            <div className="flex items-center gap-4">
              <a href="https://instagram.com/menusolace" className="hover:text-foreground transition">@menusolace</a>
              <span>·</span>
              <a href="mailto:hi@menusolace.com" className="hover:text-foreground transition">hi@menusolace.com</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
