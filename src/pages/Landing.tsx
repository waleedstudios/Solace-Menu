import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calculator, Globe, Salad, Sparkles } from "lucide-react";
import heroBowl from "@/assets/hero-bowl.jpg";
import dishPoke from "@/assets/dish-poke.jpg";
import dishPizza from "@/assets/dish-pizza.jpg";
import { useAuth } from "@/hooks/useAuth";
import { MacroBadges } from "@/components/MacroBadges";
import { FloatingMacro } from "@/components/FloatingMacro";
import { useScrollProgress } from "@/hooks/useScrollProgress";

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const hero = useScrollProgress<HTMLDivElement>();
  const showcase = useScrollProgress<HTMLDivElement>();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <header className="border-b border-border/40 bg-background/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-hero shadow-sm-soft" />
            <span className="font-display text-2xl leading-none">MacroMenu</span>
          </Link>
          <nav className="flex items-center gap-2">
            {!loading && (user ? (
              <Button onClick={() => navigate("/dashboard")} variant="default">Open dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")} className="hidden sm:inline-flex">Sign in</Button>
                <Button variant="hero" onClick={() => navigate("/auth?mode=signup")}>Get started</Button>
              </>
            ))}
          </nav>
        </div>
      </header>

      {/* HERO — cinematic with floating macros */}
      <section ref={hero.ref} className="relative">
        {/* Ambient glow */}
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary-glow/10 blur-[120px]" />
        </div>

        <div className="container pt-12 md:pt-20 pb-32 md:pb-40">
          <div className="max-w-4xl mx-auto text-center space-y-7 animate-fade-up relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 backdrop-blur px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary-glow" />
              For restaurants who care about accuracy
            </div>
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] leading-[0.95] tracking-tight">
              Every dish.<br />
              <em className="text-primary-glow">Exact</em> macros.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Build recipes from a structured ingredient library. We handle the math —
              calories, protein, carbs, fats — and give your customers a beautiful menu to browse.
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button size="lg" variant="hero" onClick={() => navigate("/auth?mode=signup")}>
                Start your menu <ArrowRight />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                Sign in
              </Button>
            </div>
          </div>

          {/* Floating macro stage */}
          <div className="relative mt-16 md:mt-20 max-w-3xl mx-auto">
            {/* Soft halo */}
            <div aria-hidden className="absolute -inset-10 bg-gradient-hero opacity-[0.07] blur-3xl rounded-[40%]" />

            {/* Menu card mockup */}
            <div
              className="relative rounded-[28px] overflow-hidden bg-card border border-border shadow-lg-soft will-change-transform"
              style={{
                transform: `perspective(1400px) rotateX(${8 - hero.progress * 8}deg) translateY(${hero.progress * -30}px)`,
                transition: "transform 0.1s linear",
              }}
            >
              <div className="grid sm:grid-cols-[1.1fr_1fr]">
                <div className="aspect-[4/3] sm:aspect-auto bg-secondary overflow-hidden">
                  <img
                    src={heroBowl}
                    alt="Grilled chicken grain bowl"
                    width={1280}
                    height={1280}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-7 md:p-9 flex flex-col gap-4 justify-center">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Signature</p>
                    <h3 className="font-display text-3xl md:text-4xl leading-tight">Grilled Chicken Bowl</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      Quinoa, avocado, cherry tomatoes, fresh herbs.
                    </p>
                  </div>
                  <div className="opacity-30">
                    <MacroBadges macros={{ calories: 642, protein: 48, carbs: 52, fats: 22 }} />
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">
                      Live macros (see above ↑)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating macros that drift on scroll */}
            <FloatingMacro
              variant="calories"
              label="642 kcal"
              progress={hero.progress}
              from={{ x: -8, y: -12 }}
              to={{ x: -120, y: -90 }}
              rotate={-8}
              delay={0}
            />
            <FloatingMacro
              variant="protein"
              label="48g P"
              progress={hero.progress}
              from={{ x: 92, y: 8 }}
              to={{ x: 140, y: -60 }}
              rotate={6}
              delay={0.05}
            />
            <FloatingMacro
              variant="carbs"
              label="52g C"
              progress={hero.progress}
              from={{ x: -5, y: 88 }}
              to={{ x: -160, y: 100 }}
              rotate={-12}
              delay={0.1}
            />
            <FloatingMacro
              variant="fats"
              label="22g F"
              progress={hero.progress}
              from={{ x: 88, y: 78 }}
              to={{ x: 170, y: 80 }}
              rotate={10}
              delay={0.08}
            />
          </div>
        </div>
      </section>

      {/* SCROLL SHOWCASE — sticky menu cards with popping macros */}
      <section ref={showcase.ref} className="relative bg-gradient-subtle border-y border-border/60">
        <div className="container py-24 md:py-32">
          <div className="max-w-2xl mx-auto text-center mb-16 md:mb-20">
            <p className="text-xs uppercase tracking-[0.2em] text-primary-glow mb-3">Live preview</p>
            <h2 className="font-display text-4xl md:text-5xl leading-tight">
              Your menu. Your numbers. <em className="text-primary-glow">In motion.</em>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-md mx-auto">
              Scroll to watch macros lift off each dish — exactly how diners experience them on your public page.
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <ShowcaseCard
              progress={showcase.progress}
              window={[0.0, 0.45]}
              image={dishPoke}
              eyebrow="Bowl"
              title="Salmon Poke Bowl"
              desc="Sushi rice, edamame, mango, cucumber, sesame."
              macros={{ calories: 580, protein: 32, carbs: 78, fats: 14 }}
              align="left"
            />
            <ShowcaseCard
              progress={showcase.progress}
              window={[0.25, 0.75]}
              image={dishPizza}
              eyebrow="Pizza"
              title="Margherita"
              desc="San marzano, fior di latte, basil, olive oil."
              macros={{ calories: 820, protein: 34, carbs: 92, fats: 32 }}
              align="right"
            />
            <ShowcaseCard
              progress={showcase.progress}
              window={[0.5, 1.0]}
              image={heroBowl}
              eyebrow="Signature"
              title="Grilled Chicken Bowl"
              desc="Quinoa, avocado, cherry tomatoes, fresh herbs."
              macros={{ calories: 642, protein: 48, carbs: 52, fats: 22 }}
              align="left"
              last
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-24 md:py-32">
        <div className="max-w-2xl mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-primary-glow mb-3">How it works</p>
          <h2 className="font-display text-4xl md:text-5xl leading-tight">A simple system for serious kitchens.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Salad, title: "Structured ingredients", body: "No vague inputs. Every entry is grams or a portion unit you've defined — like one scoop or one ladle." },
            { icon: Calculator, title: "Automatic macros", body: "Calories, protein, carbs and fats update live as you build. Standardized math, every time." },
            { icon: Globe, title: "Public menu page", body: "Each restaurant gets a clean, mobile-first URL to share with diners. No app download needed." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-7 shadow-sm-soft hover:shadow-md-soft hover:-translate-y-0.5 transition-all duration-300">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-xl mb-2">{title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="rounded-3xl bg-gradient-hero p-10 md:p-16 text-primary-foreground shadow-glow text-center relative overflow-hidden">
          <div aria-hidden className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          <h2 className="font-display text-4xl md:text-5xl mb-4 relative">Ready in minutes.</h2>
          <p className="opacity-80 max-w-md mx-auto mb-8 relative">
            Sign up, add your first menu item, and share your public macro menu today.
          </p>
          <Button size="lg" variant="outline" className="bg-card text-primary border-transparent hover:bg-card/90 relative" onClick={() => navigate("/auth?mode=signup")}>
            Create free account <ArrowRight />
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="container text-sm text-muted-foreground flex justify-between flex-wrap gap-2">
          <span>© MacroMenu</span>
          <span>Built for accurate kitchens</span>
        </div>
      </footer>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────── */

type Macros = { calories: number; protein: number; carbs: number; fats: number };

function ShowcaseCard({
  progress, window: w, image, eyebrow, title, desc, macros, align, last,
}: {
  progress: number;
  window: [number, number];
  image: string;
  eyebrow: string;
  title: string;
  desc: string;
  macros: Macros;
  align: "left" | "right";
  last?: boolean;
}) {
  // Local progress within this card's window (0..1)
  const [start, end] = w;
  const local = Math.max(0, Math.min(1, (progress - start) / (end - start)));

  // Card slides in from the side
  const slide = (1 - local) * (align === "left" ? -40 : 40);
  const fade = 0.4 + local * 0.6;

  return (
    <div className={`relative ${last ? "" : "mb-12 md:mb-16"}`}>
      <div
        className="grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden bg-card border border-border shadow-md-soft will-change-transform"
        style={{
          transform: `translate3d(${slide}px, 0, 0)`,
          opacity: fade,
          transition: "transform 0.15s linear, opacity 0.15s linear",
        }}
      >
        <div className={`aspect-[4/3] md:aspect-auto bg-secondary overflow-hidden ${align === "right" ? "md:order-2" : ""}`}>
          <img src={image} alt={title} loading="lazy" width={1280} height={1280} className="w-full h-full object-cover" />
        </div>
        <div className="p-8 md:p-10 flex flex-col justify-center gap-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
          <h3 className="font-display text-3xl md:text-4xl leading-tight">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
          <div className="opacity-30 mt-2">
            <MacroBadges macros={macros} />
          </div>
        </div>
      </div>

      {/* Macros pop OUT of the card as it scrolls past */}
      <FloatingMacro
        variant="calories"
        label={`${macros.calories} kcal`}
        progress={local}
        from={align === "left" ? { x: 42, y: 78 } : { x: 8, y: 78 }}
        to={align === "left" ? { x: -90, y: 60 } : { x: 90, y: 60 }}
        rotate={align === "left" ? -6 : 6}
        delay={0}
      />
      <FloatingMacro
        variant="protein"
        label={`${macros.protein}g P`}
        progress={local}
        from={align === "left" ? { x: 56, y: 86 } : { x: 22, y: 86 }}
        to={align === "left" ? { x: -60, y: 110 } : { x: 60, y: 110 }}
        rotate={align === "left" ? -10 : 10}
        delay={0.08}
      />
      <FloatingMacro
        variant="carbs"
        label={`${macros.carbs}g C`}
        progress={local}
        from={align === "left" ? { x: 70, y: 78 } : { x: 36, y: 78 }}
        to={align === "left" ? { x: -30, y: 70 } : { x: 30, y: 70 }}
        rotate={align === "left" ? 6 : -6}
        delay={0.16}
      />
      <FloatingMacro
        variant="fats"
        label={`${macros.fats}g F`}
        progress={local}
        from={align === "left" ? { x: 84, y: 86 } : { x: 50, y: 86 }}
        to={align === "left" ? { x: 0, y: 100 } : { x: 0, y: 100 }}
        rotate={align === "left" ? 10 : -10}
        delay={0.24}
      />
    </div>
  );
}

export default Landing;
