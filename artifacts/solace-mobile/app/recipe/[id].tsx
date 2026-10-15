import { useState } from 'react';
import { Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { computeRecipe, type CostLine } from '@workspace/recipe-engine';
import { isUnit } from '@workspace/recipe-engine/units';
import { useQueryClient } from '@tanstack/react-query';
import { Back, Button, Card, Field, Loading, Notice, Nutrition, Screen, Title, Txt } from '@/components/ui';
import { useAppState } from '@/providers/AppState';
import { eq, money, rows, type Recipe } from '@/lib/domain';

export default function RecipeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>(); const app = useAppState();
  if (!app.restaurant) return <Screen><Back /><Txt>Open your restaurant to manage recipes.</Txt><Button title="Open kitchen" onPress={() => router.replace('/(tabs)/kitchen')} /></Screen>;
  const recipe = app.workspace.recipes.find(r => r.id === id);
  if (id !== 'new' && !recipe) return <Screen><Back />{app.busy ? <Loading /> : <Txt>This recipe is unavailable.</Txt>}</Screen>;
  return <RecipeForm key={id} recipe={recipe} />;
}
function RecipeForm({ recipe }: { recipe?: Recipe }) {
  const app = useAppState(); const client = useQueryClient();
  const [name, setName] = useState(recipe?.name || '');
  const [description, setDescription] = useState(recipe?.description || '');
  const [category, setCategory] = useState(recipe?.category || '');
  const [price, setPrice] = useState(recipe?.selling_price == null ? '' : String(recipe.selling_price));
  const [packaging, setPackaging] = useState(String(recipe?.packaging_cost ?? 0));
  const [servings, setServings] = useState(String(recipe?.servings_per_batch ?? 1));
  const [yieldQty, setYieldQty] = useState(String(recipe?.batch_yield_qty ?? 1));
  const [yieldUnit, setYieldUnit] = useState(recipe?.batch_yield_unit || 'g');
  const [servingText, setServingText] = useState(recipe?.serving_size_text || '');
  const [image, setImage] = useState(recipe?.image_url || '');
  const [subrecipe, setSubrecipe] = useState(recipe?.is_subrecipe || false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState(''); const [deleting, setDeleting] = useState(false); const [confirmation, setConfirmation] = useState('');
  const [ingredient, setIngredient] = useState(''); const [subId, setSubId] = useState('');
  const [search, setSearch] = useState(''); const [amount, setAmount] = useState(''); const [unit, setUnit] = useState('g');
  const ctx = { recipes: new Map(app.workspace.recipes.map(r => [r.id, r])), ingredients: new Map(app.workspace.ingredients.map(i => [i.id, i])), lines: app.workspace.lines };
  const cost = recipe ? computeRecipe(recipe.id, ctx) : null;
  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null); setSuccess('');
    try { await fn(); } catch (e) { setError(e); } finally { setBusy(false); }
  }
  async function refreshed() {
    await app.refresh();
    await client.invalidateQueries({ predicate: q => String(q.queryKey[0]).includes('/menu') || String(q.queryKey[0]).startsWith('/api/public') });
  }
  async function snapshot() {
    if (!recipe || !cost) return;
    await rows({ table: 'recipe_versions', operation: 'insert', payload: {
      recipe_id: recipe.id, restaurant_id: recipe.restaurant_id, version: recipe.version,
      snapshot: { recipe, lines: app.workspace.lines.filter(l => l.recipe_id === recipe.id), cost: { total_per_item: cost.totalPerItem, complete: cost.costComplete, method: 'latest approved purchase by invoice date' } },
      created_by: app.account?.id,
    } });
  }
  async function save() {
    if (!app.canManage) return;
    if (name.trim().length < 2 || !Number.isFinite(Number(servings)) || Number(servings) <= 0 || !Number.isFinite(Number(yieldQty)) || Number(yieldQty) <= 0 || !isUnit(yieldUnit)) throw new Error('Enter a recipe name, positive servings and batch yield, and a supported yield unit.');
    if (!Number.isFinite(Number(packaging)) || Number(packaging) < 0 || (price !== '' && (!Number.isFinite(Number(price)) || Number(price) < 0))) throw new Error('Enter a non-negative price and packaging cost.');
    if (image.trim() && !image.trim().startsWith('https://')) throw new Error('Use an HTTPS photo URL.');
    const payload = { name: name.trim(), description: description.trim() || null, category: category.trim() || null, image_url: image.trim() || null, serving_size_text: servingText.trim() || null, selling_price: price === '' ? null : Number(price), packaging_cost: Number(packaging), servings_per_batch: Number(servings), batch_yield_qty: Number(yieldQty), batch_yield_unit: yieldUnit, is_subrecipe: subrecipe };
    if (recipe) {
      await snapshot();
      await rows({ table: 'recipes', operation: 'update', filters: [eq('id', recipe.id)], payload: { ...payload, version: recipe.version + 1 } });
      await refreshed(); setSuccess('Saved. Published menu details and nutrition are updated.');
    } else {
      const created = await rows<Recipe>({ table: 'recipes', operation: 'insert', payload: { ...payload, restaurant_id: app.restaurant!.id } });
      await refreshed();
      router.replace({ pathname: '/recipe/[id]', params: { id: created[0].id } });
    }
  }
  async function changeLine(action: () => Promise<unknown>) {
    if (!app.canManage || !recipe) return;
    await snapshot(); await action();
    await rows({ table: 'recipes', operation: 'update', filters: [eq('id', recipe.id)], payload: { version: recipe.version + 1 } });
    await refreshed(); setSuccess('Ingredient quantities saved. Any unsaved recipe details above are still a draft.');
  }
  const available = app.workspace.ingredients.filter(i => (!i.restaurant_id || i.restaurant_id === app.restaurant?.id) && i.name.toLowerCase().includes(search.toLowerCase()));
  return <Screen><Back /><Title eyebrow={recipe ? 'Recipe & food cost' : 'A new dish'}>{recipe?.name || 'Build your recipe'}</Title>
    {cost && <Card><Txt bold size={12}>SAVED RECIPE · PER SERVING</Txt><Nutrition macros={cost.nutritionComplete ? cost.servingNutrition : null} /><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><View><Txt muted size={11}>Food + packaging</Txt><Txt bold size={23}>{cost.costComplete ? money(cost.totalPerItem) : 'Incomplete'}</Txt></View><View><Txt muted size={11}>Food cost</Txt><Txt bold size={23}>{cost.costComplete && cost.foodCostPct != null ? `${cost.foodCostPct.toFixed(1)}%` : '—'}</Txt></View><View><Txt muted size={11}>Margin</Txt><Txt bold size={23}>{cost.costComplete ? money(cost.contribution) : '—'}</Txt></View></View>{!cost.costComplete && <Txt size={12} muted>{cost.costIssues.join(' · ')}</Txt>}<Txt size={11} muted>Costs and preparation details are private to your team.</Txt></Card>}
    <Notice error={error} />{!!success && <Txt bold size={13}>{success}</Txt>}
    <Field label="Recipe name" value={name} onChangeText={setName} editable={app.canManage} />
    <Field label="Public description" value={description} onChangeText={setDescription} multiline editable={app.canManage} />
    <Field label="Category" value={category} onChangeText={setCategory} editable={app.canManage} />
    <Field label="Photo URL (HTTPS)" value={image} onChangeText={setImage} autoCapitalize="none" editable={app.canManage} />
    <Field label="Serving description" value={servingText} onChangeText={setServingText} editable={app.canManage} />
    <Field label="Servings per batch" value={servings} onChangeText={setServings} keyboardType="decimal-pad" editable={app.canManage} />
    <Field label="Batch yield quantity" value={yieldQty} onChangeText={setYieldQty} keyboardType="decimal-pad" editable={app.canManage} />
    <Field label="Batch yield unit (g, kg, ml, l, each…)" value={yieldUnit} onChangeText={setYieldUnit} autoCapitalize="none" editable={app.canManage} />
    <Field label="Retail price ($)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" editable={app.canManage} />
    <Field label="Packaging per serving ($)" value={packaging} onChangeText={setPackaging} keyboardType="decimal-pad" editable={app.canManage} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Txt bold>Private sub-recipe</Txt><Switch accessibilityLabel="Private sub-recipe" value={subrecipe} onValueChange={setSubrecipe} disabled={!app.canManage} /></View>
    <Txt muted size={12}>New menu recipes publish automatically. Sub-recipes remain private. Use Menu management to show or hide existing dishes.</Txt>
    {app.canManage && <Button title={recipe ? 'Save recipe details' : 'Create recipe'} onPress={() => void run(save)} loading={busy} testID="save-recipe" />}
    {recipe && <>
      <Title eyebrow="Saved quantities">Recipe ingredients</Title>
      {cost?.lines.map(line => <Line key={`${line.line.id}:${line.line.quantity}:${line.line.unit}`} line={line.line} name={line.name} cost={line.cost} canEdit={app.canManage} busy={busy}
        save={(quantity, u) => void run(() => changeLine(() => rows({ table: 'recipe_lines', operation: 'update', filters: [eq('id', line.line.id)], payload: { quantity, unit: u } })))}
        remove={() => void run(() => changeLine(() => rows({ table: 'recipe_lines', operation: 'delete', filters: [eq('id', line.line.id)] })))} />)}
      {app.canManage && <Card><Txt bold>Add an ingredient or sub-recipe</Txt><Field label="Search your ingredients" value={search} onChangeText={setSearch} />
        {available.slice(0, 12).map(i => <Button key={i.id} title={`${ingredient === i.id ? 'Selected: ' : ''}${i.name}`} secondary onPress={() => { setIngredient(i.id); setSubId(''); }} />)}
        {app.workspace.recipes.filter(r => r.is_subrecipe && r.restaurant_id === app.restaurant?.id && r.id !== recipe.id && r.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8).map(r => <Button key={r.id} title={`${subId === r.id ? 'Selected: ' : ''}${r.name} · sub-recipe`} secondary onPress={() => { setSubId(r.id); setIngredient(''); }} />)}
        <Field label="Quantity" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <Field label="Unit (g, kg, oz, lb, ml, l, each…)" value={unit} onChangeText={setUnit} autoCapitalize="none" />
        <Button title="Add to recipe" loading={busy} disabled={!ingredient && !subId} onPress={() => void run(async () => {
          if (!(Number(amount) > 0) || !Number.isFinite(Number(amount)) || !isUnit(unit)) throw new Error('Enter a positive quantity and a supported unit.');
          await changeLine(() => rows({ table: 'recipe_lines', operation: 'insert', payload: { recipe_id: recipe.id, ingredient_id: ingredient || null, sub_recipe_id: subId || null, quantity: Number(amount), unit, position: cost?.lines.length || 0 } }));
          setAmount(''); setIngredient(''); setSubId('');
        })} />
      </Card>}
      {app.canManage && (!deleting ? <Button title="Delete this recipe" danger secondary onPress={() => setDeleting(true)} /> : <Card><Txt bold>Delete this recipe permanently?</Txt><Txt muted size={12}>It will also disappear from the public menu. Type its exact name to confirm. Recipes in use as sub-recipes must be removed from their parent recipes first.</Txt><Field label="Recipe name to confirm" value={confirmation} onChangeText={setConfirmation} /><Button title="Permanently delete" danger disabled={confirmation !== recipe.name} loading={busy} onPress={() => void run(async () => {
        await rows({ table: 'recipes', operation: 'delete', filters: [eq('id', recipe.id)] }); await refreshed(); router.replace('/(tabs)/kitchen');
      })} /><Button title="Keep recipe" secondary onPress={() => setDeleting(false)} /></Card>)}
    </>}
  </Screen>;
}
function Line({ line, name, cost, canEdit, busy, save, remove }: { line: CostLine; name: string; cost: number | null; canEdit: boolean; busy: boolean; save: (q: number, u: string) => void; remove: () => void }) {
  const [quantity, setQuantity] = useState(String(line.quantity)); const [unit, setUnit] = useState(line.unit); const [error, setError] = useState<unknown>(null);
  return <Card><Txt bold>{name}</Txt><Txt muted size={12}>Saved: {line.quantity} {line.unit} · {money(cost)}</Txt>{canEdit && <><Field label={`${name} quantity`} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" /><Field label={`${name} unit`} value={unit} onChangeText={setUnit} autoCapitalize="none" /><Notice error={error} /><Button title="Save amount" loading={busy} secondary onPress={() => {
    if (!(Number(quantity) > 0) || !Number.isFinite(Number(quantity)) || !isUnit(unit)) { setError(new Error('Enter a positive quantity and a supported unit.')); return; }
    setError(null); save(Number(quantity), unit);
  }} /><Button title="Remove ingredient" danger secondary disabled={busy} onPress={remove} /></>}</Card>;
}
