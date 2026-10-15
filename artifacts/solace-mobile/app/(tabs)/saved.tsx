import { router } from 'expo-router';
import { Screen, Title, Row, Empty } from '@/components/ui';
import { useAppState } from '@/providers/AppState';
export default function Saved() {
  const { saved } = useAppState();
  return <Screen><Title eyebrow="Your collection">Saved menus</Title>{saved.length ? saved.map(m => <Row key={m.slug} title={m.name} subtitle="View the latest menu & nutrition" onPress={() => router.push({ pathname: '/menu/[slug]', params: { slug: m.slug } })} />) : <Empty icon="bookmark" title="Keep your favorites close" text="Save a restaurant from its menu. Your collection stays on this device—no account needed." />}</Screen>;
}
