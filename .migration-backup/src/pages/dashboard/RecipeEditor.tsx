import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ArrowLeft, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { MacroBadges } from "@/components/MacroBadges";
import { totalMacros, macrosForItem, resolveGrams, type Ingredient, type PortionUnit, type RecipeItem } from "@/lib/macros";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type MenuItem = { id: string; name: string; description: string | null; user_id: string };

const RecipeEditor = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState<MenuItem | null>(null);
  const [recipe, setRecipe] = useState<RecipeItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [portionUnits, setPortionUnits] = useState<PortionUnit[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-row state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedIngredientId, setPickedIngredientId] = useState<string>("");
  const [mode, setMode] = useState<"grams" | "portion">("grams");
  const [grams, setGrams] = useState<string>("");
  const [portionUnitId, setPortionUnitId] = useState<string>("");
  const [portionQty, setPortionQty] = useState<string>("1");

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      setLoading(true);
      const [{ data: mi }, { data: ing }, { data: pu }, { data: ris }] = await Promise.all([
        supabase.from("menu_items").select("*").eq("id", id).maybeSingle(),
        supabase.from("ingredients").select("*").order("name"),
        supabase.from("portion_units").select("*").eq("user_id", user.id).order("name"),
        supabase.from("recipe_items").select("*").eq("menu_item_id", id),
      ]);
      if (!mi || mi.user_id !== user.id) { toast.error("Not found"); navigate("/dashboard/menu"); return; }
      setItem(mi as MenuItem);
      setIngredients((ing as Ingredient[]) || []);
      setPortionUnits((pu as PortionUnit[]) || []);
      setRecipe((ris as RecipeItem[]) || []);
      setLoading(false);
    })();
  }, [id, user, navigate]);

  const ingMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const totals = useMemo(() => totalMacros(recipe, ingredients, portionUnits), [recipe, ingredients, portionUnits]);

  const resetAddRow = () => {
    setPickedIngredientId(""); setGrams(""); setPortionUnitId(""); setPortionQty("1"); setMode("grams");
  };

  const addIngredient = async () => {
    if (!pickedIngredientId) { toast.error("Pick an ingredient"); return; }
    let payload: any = { menu_item_id: id, ingredient_id: pickedIngredientId };
    if (mode === "grams") {
      const g = parseFloat(grams);
      if (!g || g <= 0) { toast.error("Enter grams (> 0)"); return; }
      payload.grams = g;
    } else {
      if (!portionUnitId) { toast.error("Select a portion unit"); return; }
      const q = parseFloat(portionQty);
      if (!q || q <= 0) { toast.error("Enter quantity (> 0)"); return; }
      payload.portion_unit_id = portionUnitId;
      payload.portion_quantity = q;
    }
    const { data, error } = await supabase.from("recipe_items").insert(payload).select().single();
    if (error) return toast.error(error.message);
    setRecipe([...recipe, data as RecipeItem]);
    resetAddRow();
  };

  const removeRow = async (rowId: string) => {
    const { error } = await supabase.from("recipe_items").delete().eq("id", rowId);
    if (error) return toast.error(error.message);
    setRecipe(recipe.filter((r) => r.id !== rowId));
  };

  const pickedIngredient = ingredients.find((i) => i.id === pickedIngredientId);

  if (loading || !item) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link to="/dashboard/menu"><ArrowLeft /> Back to menu</Link>
      </Button>

      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl">{item.name}</h1>
          {item.description && <p className="text-muted-foreground mt-1 max-w-xl">{item.description}</p>}
        </div>
      </div>

      {/* Live totals */}
      <div className="rounded-2xl bg-gradient-hero p-6 md:p-8 text-primary-foreground shadow-glow">
        <p className="text-xs uppercase tracking-wider opacity-70 mb-3">Total per serving</p>
        <MacroBadges macros={totals} size="lg" />
      </div>

      {/* Ingredient list */}
      <div className="bg-card rounded-2xl border border-border shadow-sm-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg">Ingredients</h2>
          <span className="text-sm text-muted-foreground">{recipe.length} item{recipe.length === 1 ? "" : "s"}</span>
        </div>
        {recipe.length === 0 ? (
          <p className="px-6 py-10 text-center text-muted-foreground text-sm">No ingredients yet. Add one below.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recipe.map((r) => {
              const ing = ingMap.get(r.ingredient_id);
              const m = macrosForItem(r, ing, portionUnits);
              const g = resolveGrams(r, portionUnits);
              const unit = r.portion_unit_id ? portionUnits.find((p) => p.id === r.portion_unit_id) : null;
              return (
                <li key={r.id} className="px-6 py-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-medium">{ing?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {unit ? `${r.portion_quantity} × ${unit.name} (${g.toFixed(0)}g)` : `${g.toFixed(0)}g`}
                    </p>
                  </div>
                  <MacroBadges macros={m} />
                  <Button variant="ghost" size="icon" onClick={() => removeRow(r.id)} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add ingredient form */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-soft space-y-4">
        <h2 className="text-lg">Add ingredient</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block">Ingredient</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {pickedIngredient ? pickedIngredient.name : "Search ingredient…"}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search…" />
                  <CommandList>
                    <CommandEmpty>No ingredient found. <Link to="/dashboard/ingredients" className="text-primary underline">Add custom →</Link></CommandEmpty>
                    <CommandGroup>
                      {ingredients.map((i) => (
                        <CommandItem key={i.id} value={i.name} onSelect={() => { setPickedIngredientId(i.id); setPickerOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", pickedIngredientId === i.id ? "opacity-100" : "opacity-0")} />
                          <div className="flex-1">
                            <p>{i.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">{i.calories_per_100g} kcal · {i.protein_per_100g}P / {i.carbs_per_100g}C / {i.fats_per_100g}F per 100g</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="mb-2 block">Measurement</Label>
            <div className="flex rounded-md border border-input p-1 bg-secondary/40">
              <button type="button" onClick={() => setMode("grams")}
                className={cn("flex-1 text-sm py-1.5 rounded-sm transition-colors", mode === "grams" ? "bg-card shadow-sm-soft" : "text-muted-foreground")}>
                Grams
              </button>
              <button type="button" onClick={() => setMode("portion")}
                className={cn("flex-1 text-sm py-1.5 rounded-sm transition-colors", mode === "portion" ? "bg-card shadow-sm-soft" : "text-muted-foreground")}>
                Portion unit
              </button>
            </div>
          </div>
        </div>

        {mode === "grams" ? (
          <div>
            <Label htmlFor="g" className="mb-2 block">Grams</Label>
            <Input id="g" type="number" min="0" step="1" value={grams} onChange={(e) => setGrams(e.target.value)} placeholder="150" />
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div>
              <Label className="mb-2 block">Portion unit</Label>
              {portionUnits.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No portion units yet. <Link to="/dashboard/portions" className="text-primary underline">Define one →</Link>
                </p>
              ) : (
                <Select value={portionUnitId} onValueChange={setPortionUnitId}>
                  <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    {portionUnits.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.average_grams}g avg)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label htmlFor="q" className="mb-2 block">Quantity</Label>
              <Input id="q" type="number" min="0" step="0.5" value={portionQty} onChange={(e) => setPortionQty(e.target.value)} />
            </div>
          </div>
        )}

        <Button variant="hero" onClick={addIngredient}><Plus /> Add to recipe</Button>
      </div>
    </div>
  );
};

export default RecipeEditor;
