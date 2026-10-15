import { useAuth } from '@clerk/expo';
import { router } from 'expo-router';
import { View } from 'react-native';
import { computeRecipe } from '@workspace/recipe-engine';
import { Brand, Button, Card, Empty, Loading, Notice, Row, Screen, Title, Txt } from '@/components/ui';
import { BusinessSetup } from '@/components/BusinessSetup';
import { useAppState } from '@/providers/AppState';
import { money } from '@/lib/domain';
export default function Kitchen() {
  const { isSignedIn, isLoaded } = useAuth();
  const app = useAppState();
  if (!isLoaded) return <Screen><Loading /></Screen>;
  if (!isSignedIn) return <Screen><Brand /><Title eyebrow="Built for your business">A clearer view{'\n'}of your kitchen.</Title><Txt muted>Recipes, nutrition menus, and food costs—connected to the website you already use.</Txt><Card><Row title="Recipes & food costs" subtitle="Per-serving costs, margins, and nutrition" /><Row title="A menu that stays in sync" subtitle="Save a recipe once. Update it everywhere." /><Row title="Invoices on the go" subtitle="Capture supplier documents with your camera" /></Card><Button title="Sign in to your restaurant" icon="arrow-up-right" onPress={() => router.push('/sign-in')} /><Button title="Keep exploring menus" secondary onPress={() => router.push('/')} /></Screen>;
  const recipes = app.workspace.recipes.filter(r => r.restaurant_id === app.restaurant?.id);
  const ctx = { recipes: new Map(app.workspace.recipes.map(r => [r.id, r])), ingredients: new Map(app.workspace.ingredients.map(i => [i.id, i])), lines: app.workspace.lines };
  const costs = recipes.filter(r => !r.is_subrecipe).map(r => computeRecipe(r.id, ctx)).filter(c => c.costComplete && c.foodCostPct != null);
  const average = costs.length ? costs.reduce((sum, c) => sum + c.foodCostPct!, 0) / costs.length : null;
  return <Screen refreshing={app.busy} onRefresh={() => void app.refresh()}><Brand />
    <Notice error={app.error} retry={() => void app.refresh()} />
    {app.accountLoading ? <Loading /> : app.account && !app.account.onboarding_complete ? <BusinessSetup /> : <>
      <Title eyebrow={app.role || 'Restaurant workspace'}>{app.restaurant?.name || 'Your kitchen'}</Title>
      {app.workspace.restaurants.length > 1 && <View style={{ gap: 8 }}>{app.workspace.restaurants.map(r => <Button key={r.id} title={`${r.id === app.restaurant?.id ? 'Selected: ' : ''}${r.name}`} secondary onPress={() => app.selectRestaurant(r.id)} />)}</View>}
      {!app.restaurant ? app.busy ? <Loading /> : <Empty title="No restaurant available" text="Your account has no accessible restaurant. Ask your restaurant owner to add your account to their team." /> : <>
        <View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><Card><Txt muted size={11}>MENU RECIPES</Txt><Txt bold size={31}>{recipes.filter(r => !r.is_subrecipe).length}</Txt></Card></View><View style={{ flex: 1 }}><Card><Txt muted size={11}>AVG FOOD COST</Txt><Txt bold size={31}>{average == null ? '—' : `${average.toFixed(1)}%`}</Txt></Card></View></View>
        <Button title="Manage public menu" icon="book-open" onPress={() => router.push('/manage-menu')} />
        <Row title="Ingredients" subtitle="Nutrition and current costs" icon="grid" onPress={() => router.push('/ingredients')} />
        <Row title="Supplier invoices" subtitle="Capture & review documents" icon="camera" onPress={() => router.push('/invoices')} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Txt bold size={22}>Your recipes</Txt>{app.canManage && <Button title="New" icon="plus" secondary onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: 'new' } })} />}</View>
        {recipes.length ? recipes.map(r => { const cost = computeRecipe(r.id, ctx); return <Row key={r.id} title={r.name} subtitle={`${r.is_subrecipe ? 'Sub-recipe · Private' : r.is_published ? 'Live on menu' : 'Hidden'} · ${cost.nutritionComplete ? `${Math.round(cost.servingNutrition.calories)} kcal` : 'Nutrition incomplete'}`} trailing={cost.costComplete ? money(cost.totalPerItem) : 'Cost needed'} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} />; }) : <Empty title="Your first recipe starts here" text="Add a recipe, then its ingredients and quantities. Menu dishes publish automatically; sub-recipes stay private." />}
      </>}
    </>}
  </Screen>;
}
