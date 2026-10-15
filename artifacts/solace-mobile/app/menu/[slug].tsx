import { useState } from 'react';
import { Image, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGetPublicMenu, getGetPublicMenuQueryKey } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { Back, Button, Card, Empty, Field, IconButton, Loading, Notice, Nutrition, Screen, Title, Txt } from '@/components/ui';
import { useAppState } from '@/providers/AppState';
import { apiOrigin, money, photoUri } from '@/lib/domain';
export default function Menu() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const menu = useGetPublicMenu(slug, { query: { queryKey: getGetPublicMenuQueryKey(slug), enabled: !!slug, refetchInterval: 15000, refetchOnWindowFocus: true, retry: false } });
  const c = useColors(); const { saved, toggleSaved } = useAppState();
  const [search, setSearch] = useState(''); const [error, setError] = useState<unknown>(null);
  const items = menu.data?.items.filter(i => `${i.name} ${i.description || ''} ${i.category || ''}`.toLowerCase().includes(search.toLowerCase()));
  async function bookmark() { try { await toggleSaved({ slug, name: menu.data!.restaurant_name }); } catch (e) { setError(e); } }
  return <Screen refreshing={menu.isRefetching} onRefresh={() => void menu.refetch()}><Back />
    {menu.isPending ? <Loading /> : !menu.data ? <Notice error={menu.error || new Error('This menu is unavailable.')} retry={() => void menu.refetch()} /> : <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Txt size={11} bold color={c.tint}>THE MENU, MADE CLEAR</Txt><View style={{ flexDirection: 'row' }}>
        <IconButton icon={saved.some(m => m.slug === slug) ? 'check' : 'bookmark'} label="Save menu" onPress={() => void bookmark()} />
        <IconButton icon="share-2" label="Share menu" onPress={() => { void Share.share({ message: `${menu.data.restaurant_name}\n${apiOrigin}/r/${encodeURIComponent(slug)}` }).catch(setError); }} />
      </View></View>
      <Title>{menu.data.restaurant_name}</Title><Txt muted size={13}>Nutrition per serving · Menu & prices set by the restaurant</Txt>
      <Notice error={error || menu.error} retry={menu.error ? () => void menu.refetch() : undefined} />
      <Field label="Find a dish" placeholder="Search dishes or categories" value={search} onChangeText={setSearch} />
      {items?.length ? items.map(item => <Card key={`${item.source}:${item.id}`}>
        {photoUri(item.image_url) && <Image source={{ uri: photoUri(item.image_url)! }} style={{ height: 185, width: '100%', borderRadius: 12 }} />}
        {!!item.category && <Txt size={10} bold color={c.tint}>{item.category.toUpperCase()}</Txt>}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><View style={{ flex: 1 }}><Txt bold size={20}>{item.name}</Txt></View>{item.selling_price != null && <Txt bold>{money(item.selling_price)}</Txt>}</View>
        {!!item.description && <Txt muted size={13}>{item.description}</Txt>}
        {!!item.serving_size_text && <Txt size={12} muted>{item.serving_size_text}</Txt>}
        <Nutrition macros={item.nutrition_complete ? item.macros : null} />
        {item.estimated_nutrition && <Txt size={11} muted>Estimated nutrition</Txt>}
      </Card>) : <Empty title={search ? 'No matching dishes' : 'The menu is being prepared'} text={search ? 'Try another dish name.' : 'Check back soon for the restaurant’s published dishes.'} />}
      <Txt muted size={11}>Nutrition values are supplied or estimated by the restaurant and may vary. Ask restaurant staff about allergens and dietary requirements.</Txt>
      <Button title="Back to explore" secondary onPress={() => router.replace('/')} />
    </>}
  </Screen>;
}
