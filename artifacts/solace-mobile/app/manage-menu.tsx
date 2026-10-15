import { useState } from 'react';
import { router } from 'expo-router';
import { useGetRestaurantMenu, getGetRestaurantMenuQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Back, Button, Card, Empty, Loading, Notice, Nutrition, Screen, Title, Txt } from '@/components/ui';
import { useAppState } from '@/providers/AppState';
import { eq, rows } from '@/lib/domain';
export default function ManageMenu() {
  const app = useAppState(); const client = useQueryClient();
  const [error, setError] = useState<unknown>(null); const [saving, setSaving] = useState('');
  const menu = useGetRestaurantMenu(app.restaurant?.id || '', { query: { queryKey: getGetRestaurantMenuQueryKey(app.restaurant?.id || ''), enabled: !!app.restaurant, retry: false } });
  async function toggle(id: string, source: 'recipe' | 'legacy', published: boolean) {
    setSaving(id); setError(null);
    try {
      await rows({ table: source === 'recipe' ? 'recipes' : 'menu_items', operation: 'update', payload: { is_published: !published }, filters: [eq('id', id)] });
      await Promise.all([menu.refetch(), app.refresh(), client.invalidateQueries({ predicate: q => String(q.queryKey[0]).startsWith('/api/public') })]);
    } catch (e) { setError(e); } finally { setSaving(''); }
  }
  return <Screen refreshing={menu.isRefetching} onRefresh={() => void menu.refetch()}><Back /><Title eyebrow="Saved recipes, live menus">Your public menu</Title><Notice error={error || menu.error} />
    {!app.restaurant ? <Button title="Open your kitchen" onPress={() => router.replace('/(tabs)/kitchen')} /> : menu.isPending ? <Loading /> : <>
      {menu.data && <Button title="Preview customer menu" secondary onPress={() => router.push({ pathname: '/menu/[slug]', params: { slug: menu.data.slug } })} />}
      {menu.data?.items.length ? menu.data.items.map(item => <Card key={`${item.source}:${item.id}`}><Txt size={20} bold>{item.name}</Txt><Txt size={12} muted>{item.is_published ? 'Published · Visible to customers' : 'Hidden · Only your team can see this'}</Txt><Nutrition macros={item.macros} />
        {item.can_edit && <><Button title={item.is_published ? 'Hide from menu' : 'Show on menu'} secondary loading={saving === item.id} onPress={() => void toggle(item.id, item.source, item.is_published)} />
          {item.source === 'recipe' && <Button title="Edit recipe & food cost" onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: item.id } })} />}</>}
      </Card>) : <Empty title="No menu items yet" text="Add a menu recipe in your kitchen to publish your first dish." />}
    </>}
  </Screen>;
}
