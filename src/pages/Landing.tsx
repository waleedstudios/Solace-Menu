import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calculator, Globe, Salad } from "lucide-react";
import heroBowl from "@/assets/hero-bowl.jpg";
import { useAuth } from "@/hooks/useAuth";
import { MacroBadges } from "@/components/MacroBadges";

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
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
                <Button variant="ghost" onClick={() => navigate("/auth")}>Sign in</Button>
                <Button variant="hero" onClick={() => navigate("/auth?mode=signup")}>Get started</Button>
              </>
            ))}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container grid lg:grid-cols-2 gap-12 lg:gap-16 py-16 md:py-24 items-center">
        <div className="space-y-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-glow" />
            Built for restaurants who care about accuracy
          </div>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
            Every dish.<br />
            <em className="text-primary-glow">Exact</em> macros.
          </h1>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            Build recipes from a structured ingredient library. MacroMenu calculates calories, protein, carbs and fats automatically — and gives your customers a beautiful public menu to browse.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="hero" onClick={() => navigate("/auth?mode=signup")}>
              Start your menu <ArrowRight />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>Sign in</Button>
          </div>
          <div className="pt-4">
            <MacroBadges macros={{ calories: 642, protein: 48, carbs: 52, fats: 22 }} size="lg" />
            <p className="text-xs text-muted-foreground mt-2">Live preview · Grilled chicken bowl</p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 bg-gradient-hero opacity-5 blur-3xl rounded-full" />
          <div className="relative rounded-3xl overflow-hidden shadow-lg-soft bg-card">
            <img src={heroBowl} alt="A grilled chicken grain bowl with avocado, tomatoes, and quinoa" width={1280} height={1280} className="w-full h-auto" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 md:py-24 border-t border-border/60">
        <div className="max-w-2xl mb-14">
          <h2 className="font-display text-4xl md:text-5xl leading-tight">A simple system for serious kitchens.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Salad, title: "Structured ingredients", body: "No vague inputs. Every recipe entry is grams or a portion unit you've defined — like one scoop or one ladle." },
            { icon: Calculator, title: "Automatic macros", body: "Calories, protein, carbs and fats update live as you build. Standardized math, every time." },
            { icon: Globe, title: "Public menu page", body: "Each restaurant gets a clean, mobile-first URL to share with diners. No app download needed." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-7 shadow-sm-soft hover:shadow-md-soft transition-shadow">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-xl mb-2">{title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="rounded-3xl bg-gradient-hero p-10 md:p-16 text-primary-foreground shadow-glow text-center">
          <h2 className="font-display text-4xl md:text-5xl mb-4">Ready in minutes.</h2>
          <p className="opacity-80 max-w-md mx-auto mb-8">Sign up, add your first menu item, and share your public macro menu today.</p>
          <Button size="lg" variant="outline" className="bg-card text-primary border-transparent hover:bg-card/90" onClick={() => navigate("/auth?mode=signup")}>
            Create free account <ArrowRight />
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="container text-sm text-muted-foreground flex justify-between">
          <span>© MacroMenu</span>
          <span>Built for accurate kitchens</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
