import { useState } from 'react';
import { ImageBackground, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useDiscoverRestaurants } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { Brand, Button, Empty, Field, IconButton, Loading, Notice, Row, Screen, Title, Txt } from '@/components/ui';
import { menuSlug } from '@/lib/domain';
export default function Discover() {
  const c = useColors();
  const [search, setSearch] = useState('');
  const menus = useDiscoverRestaurants();
  const filtered = menus.data?.restaurants.filter(r => r.name.toLowerCase().includes(search.trim().toLowerCase()));
  function openLink() { const slug = menuSlug(search); if (slug) router.push({ pathname: '/menu/[slug]', params: { slug } }); }
  return <Screen refreshing={menus.isRefetching} onRefresh={() => void menus.refetch()}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Brand /><IconButton icon="maximize" label="Scan a restaurant QR code" onPress={() => router.push('/scan')} /></View>
    <ImageBackground source={require('@/assets/images/hero-bowl.jpg')} imageStyle={{ borderRadius: 22 }} style={{ minHeight: 285, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 22 }}>
      <LinearGradient colors={['transparent', c.primary]} style={{ padding: 24, paddingTop: 80, gap: 9 }}>
        <Txt size={10} bold color={c.accent} style={{ letterSpacing: 2 }}>GOOD FOOD. NOTHING HIDDEN.</Txt>
        <Txt size={33} bold color={c.primaryForeground} style={{ letterSpacing: -1 }}>Know what's{'\n'}on your plate.</Txt>
        <Txt size={13} color={c.primaryForeground}>Real menus. Clear nutrition. Better choices.</Txt>
      </LinearGradient>
    </ImageBackground>
    <Field label="Find your next meal" placeholder="Restaurant name or menu link" value={search} onChangeText={setSearch} autoCapitalize="none" returnKeyType="search" onSubmitEditing={openLink} testID="restaurant-search" />
    {search.trim() && menuSlug(search) ? <Button title="Open menu link" secondary onPress={openLink} /> : null}
    <Title eyebrow="Made transparent">Explore menus</Title>
    <Notice error={menus.error} retry={() => void menus.refetch()} />
    {menus.isPending ? <Loading /> : filtered?.length ? filtered.map(r => <Row key={r.slug} title={r.name} subtitle={`${r.item_count} dishes · Nutrition per serving`} onPress={() => router.push({ pathname: '/menu/[slug]', params: { slug: r.slug } })} />) : <Empty title={search ? 'No matching restaurants' : 'Menus are on their way'} text="Open a restaurant’s SolaceMenu link or scan its QR code. Published menus appear here automatically." />}
    <View style={{ backgroundColor: c.secondary, borderRadius: 18, padding: 22, gap: 12 }}><Txt size={20} bold>Good food. Better business.</Txt><Txt muted size={13}>Bring your nutrition menu and food costs together.</Txt><Button title="For restaurants" icon="arrow-up-right" onPress={() => router.push('/(tabs)/kitchen')} testID="open-kitchen" /></View>
  </Screen>;
}
