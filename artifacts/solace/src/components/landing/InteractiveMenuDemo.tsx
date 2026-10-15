import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Leaf, Wheat, Milk, Flame, Drumstick, Cookie, Droplet, Sparkles, Search } from "lucide-react";
import dishBowl from "@/assets/dish-bowl.jpg";
import dishSalmon from "@/assets/dish-salmon.jpg";
import dishPoke from "@/assets/dish-poke.jpg";
import dishPizza from "@/assets/dish-pizza.jpg";

type Modifier = { id: string; label: string; cal: number; p: number; c: number; f: number };
type Tag = "High protein" | "Lean" | "Veg" | "Omega-3";
type Dish = {
  id: string; name: string; tag: Tag; img: string;
  base: { cal: number; p: number; c: number; f: number };
  allergens: ("gluten" | "dairy" | "nuts")[];
  mods: Modifier[];
};

const DISHES: Dish[] = [
  {
    id: "bowl", name: "Harvest Power Bowl", tag: "High protein", img: dishBowl,
    base: { cal: 540, p: 38, c: 52, f: 18 },
    allergens: [],
    mods: [
      { id: "extra-chicken", label: "Extra chicken", cal: 120, p: 24, c: 0, f: 3 },
      { id: "avocado", label: "Avocado", cal: 80, p: 1, c: 4, f: 7 },
      { id: "no-quinoa", label: "No quinoa", cal: -160, p: -6, c: -28, f: -2 },
    ],
  },
  {
    id: "salmon", name: "Atlantic Salmon", tag: "Omega-3", img: dishSalmon,
    base: { cal: 480, p: 42, c: 12, f: 28 },
    allergens: [],
    mods: [
      { id: "extra-asparagus", label: "Extra asparagus", cal: 30, p: 3, c: 5, f: 0 },
      { id: "butter", label: "Light butter", cal: 60, p: 0, c: 0, f: 7 },
    ],
  },
  {
    id: "poke", name: "Ahi Tuna Poke", tag: "Lean", img: dishPoke,
    base: { cal: 420, p: 32, c: 48, f: 10 },
    allergens: [],
    mods: [
      { id: "edamame", label: "Edamame", cal: 90, p: 8, c: 7, f: 4 },
      { id: "no-rice", label: "No rice", cal: -180, p: -3, c: -38, f: -1 },
    ],
  },
  {
    id: "pizza", name: "Margherita", tag: "Veg", img: dishPizza,
    base: { cal: 720, p: 28, c: 88, f: 24 },
    allergens: ["gluten", "dairy"],
    mods: [
      { id: "no-cheese", label: "No cheese", cal: -180, p: -12, c: 0, f: -14 },
      { id: "chili", label: "Chili oil", cal: 90, p: 0, c: 0, f: 10 },
    ],
  },
];

const FILTERS: ("All" | Tag)[] = ["All", "High protein", "Lean", "Veg", "Omega-3"];

const AllergenIcon = ({ a }: { a: "gluten" | "dairy" | "nuts" }) => {
  const map = { gluten: Wheat, dairy: Milk, nuts: Leaf };
  const Icon = map[a];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-foreground/70">
      <Icon className="h-3 w-3" /> {a}
    </span>
  );
};

const MacroStat = ({ label, value, suffix, color, max, pulseKey }: { label: string; value: number; suffix: string; color: string; max: number; pulseKey: number }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="font-medium text-foreground/70">{label}</span>
        <span
          key={pulseKey}
          className="font-display text-base text-foreground tabular-nums inline-block origin-right animate-macro-pop"
        >
          {Math.round(value)}{suffix}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 12px ${color}55` }}
        />
      </div>
    </div>
  );
};

export const InteractiveMenuDemo = () => {
  const [filter, setFilter] = useState<"All" | Tag>("All");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(DISHES[0].id);
  const [portion, setPortion] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [pulseKey, setPulseKey] = useState(0);
  const firstRender = useRef(true);

  const filteredDishes = useMemo(() => {
    return DISHES.filter((d) => {
      const matchTag = filter === "All" || d.tag === filter;
      const matchSearch = !search.trim() || d.name.toLowerCase().includes(search.trim().toLowerCase());
      return matchTag && matchSearch;
    });
  }, [filter, search]);

  // If active dish was filtered out, switch to first visible
  useEffect(() => {
    if (filteredDishes.length && !filteredDishes.find((d) => d.id === activeId)) {
      setActiveId(filteredDishes[0].id);
      setPortion(1);
      setSelected({});
    }
  }, [filteredDishes, activeId]);

  const dish = DISHES.find((d) => d.id === activeId)!;

  const macros = useMemo(() => {
    const m = { cal: dish.base.cal, p: dish.base.p, c: dish.base.c, f: dish.base.f };
    dish.mods.forEach((mod) => {
      if (selected[mod.id]) { m.cal += mod.cal; m.p += mod.p; m.c += mod.c; m.f += mod.f; }
    });
    return { cal: m.cal * portion, p: m.p * portion, c: m.c * portion, f: m.f * portion };
  }, [dish, selected, portion]);

  // Pulse macros whenever they change (skip first mount)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setPulseKey((k) => k + 1);
  }, [macros.cal, macros.p, macros.c, macros.f]);

  const switchDish = (id: string) => { setActiveId(id); setPortion(1); setSelected({}); };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
      {/* Menu list */}
      <div className="rounded-3xl border border-border bg-card p-3 shadow-md-soft">
        <div className="mb-3 flex flex-col gap-3 px-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-accent animate-pulse" />
              Live menu · Nourish Kitchen
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes"
                className="h-8 w-36 rounded-full border border-border bg-background pl-8 pr-3 text-xs outline-none transition focus:w-48 focus:border-foreground/40"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((t) => {
              const active = filter === t;
              return (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                    active
                      ? "bg-foreground text-background shadow-sm-soft"
                      : "bg-secondary text-foreground/60 hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-2">
          {filteredDishes.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No dishes match those filters.
            </div>
          )}
          {filteredDishes.map((d) => {
            const active = d.id === activeId;
            return (
              <button
                key={d.id}
                onClick={() => switchDish(d.id)}
                className={`group flex w-full items-center gap-4 rounded-2xl p-3 text-left transition-all duration-300 animate-fade-in ${active ? "bg-secondary ring-1 ring-foreground/10" : "hover:bg-secondary/60"}`}
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                  <img src={d.img} alt={d.name} loading="lazy" width={128} height={128} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-display text-lg leading-tight">{d.name}</div>
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/70">{d.tag}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
                    <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" /> {d.base.cal} cal</span>
                    <span className="inline-flex items-center gap-1"><Drumstick className="h-3 w-3" /> {d.base.p}g</span>
                    <span className="inline-flex items-center gap-1"><Cookie className="h-3 w-3" /> {d.base.c}g</span>
                    <span className="inline-flex items-center gap-1"><Droplet className="h-3 w-3" /> {d.base.f}g</span>
                  </div>
                </div>
                <div className={`grid h-8 w-8 place-items-center rounded-full text-xs transition ${active ? "bg-foreground text-background" : "bg-secondary text-foreground/40 group-hover:bg-foreground/10"}`}>→</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-lg-soft">
        <div className="relative h-56 overflow-hidden">
          <img src={dish.img} alt={dish.name} loading="lazy" width={1024} height={1024} className="h-full w-full object-cover transition-all duration-700 animate-fade-in" key={dish.id} />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
          <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-[11px] font-medium backdrop-blur">
            <Sparkles className="h-3 w-3 text-accent" /> AI verified macros
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-3xl leading-tight">{dish.name}</h3>
              <p className="text-sm text-muted-foreground">Macros update live as you customize.</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Calories</div>
              <div
                key={`cal-${pulseKey}`}
                className="font-display text-3xl tabular-nums inline-block origin-right animate-macro-pop"
              >
                {Math.round(macros.cal)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MacroStat label="Protein" value={macros.p} suffix="g" color="hsl(var(--macro-protein))" max={80} pulseKey={pulseKey} />
            <MacroStat label="Carbs" value={macros.c} suffix="g" color="hsl(var(--macro-carbs))" max={120} pulseKey={pulseKey} />
            <MacroStat label="Fats" value={macros.f} suffix="g" color="hsl(var(--macro-fats))" max={50} pulseKey={pulseKey} />
          </div>

          {/* Portion */}
          <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
            <div>
              <div className="text-xs font-medium text-foreground/70">Portion</div>
              <div className="font-display text-lg tabular-nums">{portion.toFixed(2)}×</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPortion((p) => Math.max(0.25, +(p - 0.25).toFixed(2)))} className="grid h-8 w-8 place-items-center rounded-full bg-background hover:bg-foreground hover:text-background transition active:scale-90"><Minus className="h-3.5 w-3.5" /></button>
              <button onClick={() => setPortion((p) => Math.min(3, +(p + 0.25).toFixed(2)))} className="grid h-8 w-8 place-items-center rounded-full bg-background hover:bg-foreground hover:text-background transition active:scale-90"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* Modifiers */}
          <div className="space-y-2">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Modifiers</div>
            <div className="flex flex-wrap gap-2">
              {dish.mods.map((m) => {
                const on = !!selected[m.id];
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelected((s) => ({ ...s, [m.id]: !s[m.id] }))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
                      on
                        ? "border-foreground bg-foreground text-background shadow-sm-soft scale-[1.02]"
                        : "border-border bg-background hover:border-foreground/40 hover:-translate-y-0.5"
                    }`}
                  >
                    {on ? "✓ " : "+ "}{m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {dish.allergens.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Allergens</span>
              {dish.allergens.map((a) => <AllergenIcon key={a} a={a} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
