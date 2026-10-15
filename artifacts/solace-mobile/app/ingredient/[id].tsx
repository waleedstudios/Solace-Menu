import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Back, Button, Field, Notice, Screen, Title, Txt } from '@/components/ui';
import { useAppState } from '@/providers/AppState';
import { eq, rows, type Ingredient } from '@/lib/domain';
import { isUnit } from '@workspace/recipe-engine/units';
export default function IngredientRoute() {
  const { id } = useLocalSearchParams<{ id: string }>(); const app = useAppState();
  const ingredient = app.workspace.ingredients.find(i => i.id === id);
  if (!app.restaurant) return <Screen><Back /><Txt>Open your restaurant first.</Txt></Screen>;
  if (id !== 'new' && !ingredient) return <Screen><Back /><Txt>This ingredient is unavailable.</Txt></Screen>;
  return <IngredientForm key={id} ingredient={ingredient} />;
}
function IngredientForm({ ingredient }: { ingredient?: Ingredient }) {
  const app = useAppState();
  const [name, setName] = useState(ingredient?.name || '');
  const [base, setBase] = useState(ingredient?.base_unit || 'g');
  const [price, setPrice] = useState(ingredient?.current_cost == null ? '' : String(Number(ingredient.current_cost) * 1000));
  const [yieldPct, setYield] = useState(String(ingredient?.yield_pct ?? 100));
  const [density, setDensity] = useState(ingredient?.density_g_per_ml == null ? '' : String(ingredient.density_g_per_ml));
  const [nutrition, setNutrition] = useState<Record<string, string>>(Object.fromEntries(['calories', 'protein', 'carbs', 'fats'].map(k => [k, ingredient?.nutrition_source ? String(ingredient[`${k}_per_100g` as keyof Ingredient] ?? '') : ''])));
  const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null); const [saved, setSaved] = useState(false);
  const own = !ingredient || !!ingredient.restaurant_id;
  const canEdit = app.canManage && own;
  async function save() {
    setError(null); setSaved(false); setBusy(true);
    try {
      if (!canEdit || name.trim().length < 2 || !isUnit(base) || (!ingredient && base !== 'g') || !(Number(yieldPct) > 0 && Number(yieldPct) <= 100) || (price && (!Number.isFinite(Number(price)) || Number(price) < 0)) || (density && (!Number.isFinite(Number(density)) || Number(density) <= 0))) throw new Error('Check the ingredient name, yield (1–100), cost, and density. New mobile ingredients use grams as their base unit.');
      const filled = Object.values(nutrition).filter(v => v.trim() !== '').length;
      if (filled && filled !== 4) throw new Error('Enter all four nutrition values, or leave all four blank.');
      if (filled && Object.values(nutrition).some(v => !Number.isFinite(Number(v)) || Number(v) < 0)) throw new Error('Nutrition values must be non-negative numbers.');
      const payload = { name: name.trim(), base_unit: base, current_cost: price === '' ? null : Number(price) / 1000, yield_pct: Number(yieldPct), density_g_per_ml: density === '' ? null : Number(density), nutrition_source: filled ? 'manual' : null, ...Object.fromEntries(Object.entries(nutrition).map(([k, v]) => [`${k}_per_100g`, v.trim() === '' ? 0 : Number(v)])) };
      const result = await rows<Ingredient>({ table: 'ingredients', operation: ingredient ? 'update' : 'insert', filters: ingredient ? [eq('id', ingredient.id)] : undefined, payload: ingredient ? payload : { ...payload, restaurant_id: app.restaurant!.id, user_id: app.account!.id } });
      await app.refresh(); setSaved(true);
      if (!ingredient) router.replace({ pathname: '/ingredient/[id]', params: { id: result[0].id } });
    } catch (e) { setError(e); } finally { setBusy(false); }
  }
  return <Screen><Back /><Title eyebrow={own ? 'Restaurant catalog' : 'Read-only shared catalog'}>{ingredient?.name || 'New ingredient'}</Title><Notice error={error} />{saved && <Txt bold>Saved. Recipes now use the updated costs and nutrition.</Txt>}
    <Field label="Ingredient name" value={name} onChangeText={setName} editable={canEdit} />
    <Field label="Cost base unit (new ingredients use g)" value={base} onChangeText={setBase} autoCapitalize="none" editable={false} />
    <Field label={`Cost per 1000 ${base} ($)`} value={price} onChangeText={setPrice} keyboardType="decimal-pad" editable={canEdit} />
    <Field label="Usable yield (%)" value={yieldPct} onChangeText={setYield} keyboardType="decimal-pad" editable={canEdit} />
    <Field label="Density (g/ml, optional)" value={density} onChangeText={setDensity} keyboardType="decimal-pad" editable={canEdit} />
    <Txt bold size={20}>Nutrition per 100g</Txt><Txt muted size={12}>Leave all fields blank if unknown. Missing nutrition never appears as a verified zero.</Txt>
    {['calories', 'protein', 'carbs', 'fats'].map(k => <Field key={k} label={k === 'calories' ? 'Calories (kcal)' : `${k[0].toUpperCase()}${k.slice(1)} (g)`} value={nutrition[k]} onChangeText={v => setNutrition({ ...nutrition, [k]: v })} keyboardType="decimal-pad" editable={canEdit} />)}
    {canEdit && <Button title="Save ingredient" loading={busy} onPress={() => void save()} />}
    {!own && <Txt muted>Shared starter ingredients are read-only. Add your own restaurant ingredient to enter supplier-specific prices and nutrition.</Txt>}
  </Screen>;
}
