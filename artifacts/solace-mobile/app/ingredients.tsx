import { useState } from 'react';
import { router } from 'expo-router';
import { useAppState } from '@/providers/AppState';
import { Back, Button, Empty, Field, Row, Screen, Title } from '@/components/ui';
import { money } from '@/lib/domain';
export default function Ingredients() {
  const app = useAppState(); const [search, setSearch] = useState('');
  const ingredients = app.workspace.ingredients.filter(i => (!i.restaurant_id || i.restaurant_id === app.restaurant?.id) && i.name.toLowerCase().includes(search.toLowerCase()));
  return <Screen refreshing={app.busy} onRefresh={() => void app.refresh()}><Back /><Title eyebrow="The foundation of every dish">Ingredients</Title>
    {app.restaurant ? <>{app.canManage && <Button title="Add ingredient" icon="plus" onPress={() => router.push({ pathname: '/ingredient/[id]', params: { id: 'new' } })} />}
      <Field label="Search ingredients" value={search} onChangeText={setSearch} placeholder="Chicken, rice, olive oil…" />
      {ingredients.length ? ingredients.map(i => <Row key={i.id} title={i.name} subtitle={`${i.nutrition_source ? `${i.calories_per_100g} kcal / 100g` : 'Nutrition needed'} · ${i.restaurant_id ? 'Your catalog' : 'Shared catalog'}`} trailing={i.current_cost == null ? 'No price' : `${money(Number(i.current_cost) * 1000)} / 1000${i.base_unit}`} onPress={() => router.push({ pathname: '/ingredient/[id]', params: { id: i.id } })} />) : <Empty title="No matching ingredients" text="Try another name or add an ingredient to your restaurant catalog." />}
    </> : <Button title="Open kitchen" onPress={() => router.replace('/(tabs)/kitchen')} />}
  </Screen>;
}
