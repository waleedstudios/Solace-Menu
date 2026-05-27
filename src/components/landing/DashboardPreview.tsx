import { BarChart3, ChefHat, Database, LineChart, Sparkles, TrendingUp } from "lucide-react";

export const DashboardPreview = () => {
  const bars = [42, 68, 55, 78, 64, 88, 72];
  return (
    <div className="relative rounded-3xl border border-border bg-card shadow-lg-soft overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="ml-3 text-xs font-medium text-muted-foreground">app.menusolace.com / dashboard</span>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-background px-3 text-[11px] font-medium"><Sparkles className="h-3 w-3 text-accent" /> AI agent online</span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-foreground text-[11px] font-medium text-background">SM</span>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[200px,1fr]">
        {/* Sidebar */}
        <div className="hidden border-r border-border p-4 lg:block">
          {[
            { icon: ChefHat, label: "Recipes", active: true },
            { icon: Database, label: "Ingredients" },
            { icon: BarChart3, label: "Analytics" },
            { icon: LineChart, label: "Menus" },
          ].map((i) => (
            <div key={i.label} className={`mb-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${i.active ? "bg-foreground text-background" : "text-foreground/60 hover:bg-secondary"}`}>
              <i.icon className="h-4 w-4" /> {i.label}
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="space-y-4 p-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Menu items", value: "248", delta: "+12" },
              { label: "Avg calories", value: "612", delta: "−8%" },
              { label: "Public views", value: "18.4k", delta: "+24%" },
              { label: "Conversion", value: "9.2%", delta: "+1.4" },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-border p-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{k.label}</div>
                <div className="mt-1 flex items-baseline justify-between">
                  <div className="font-display text-2xl tabular-nums">{k.value}</div>
                  <div className="inline-flex items-center gap-0.5 text-[11px] font-medium text-foreground/60"><TrendingUp className="h-3 w-3" />{k.delta}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-[1.4fr,1fr]">
            {/* Chart card */}
            <div className="rounded-2xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="font-display text-lg">Menu engagement</div>
                  <div className="text-xs text-muted-foreground">Past 7 days</div>
                </div>
                <div className="flex gap-1 text-[11px]">
                  {["7D", "30D", "90D"].map((t, i) => (
                    <span key={t} className={`rounded-full px-2 py-0.5 ${i === 0 ? "bg-foreground text-background" : "text-muted-foreground"}`}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex h-32 items-end gap-2">
                {bars.map((h, i) => (
                  <div key={i} className="group flex-1 rounded-t-lg bg-gradient-to-t from-accent-soft to-accent transition-all hover:from-accent hover:to-foreground" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <span key={d}>{d}</span>)}
              </div>
            </div>

            {/* Recipe builder card */}
            <div className="rounded-2xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-display text-lg">Recipe builder</div>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium"><Sparkles className="h-3 w-3" /> AI</span>
              </div>
              <div className="space-y-2">
                {[
                  { name: "Quinoa", g: 120, cal: 180 },
                  { name: "Chicken breast", g: 150, cal: 248 },
                  { name: "Avocado", g: 60, cal: 96 },
                  { name: "Olive oil", g: 10, cal: 88 },
                ].map((r, i) => (
                  <div key={r.name} className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2 text-xs animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                    <span className="font-medium">{r.name}</span>
                    <span className="tabular-nums text-muted-foreground">{r.g}g · {r.cal} cal</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-foreground px-3 py-2 text-background">
                <span className="text-xs font-medium">Total</span>
                <span className="font-display tabular-nums">612 cal · 48g P</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating macro chips */}
      <div className="pointer-events-none absolute -right-4 top-24 hidden rounded-2xl border border-border bg-background/90 px-4 py-3 shadow-lg-soft backdrop-blur md:block animate-float-slow-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Just published</div>
        <div className="font-display text-lg">Spring menu · 32 items</div>
      </div>
    </div>
  );
};
