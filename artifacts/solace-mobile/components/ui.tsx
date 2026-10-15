import React from 'react';
import { ActivityIndicator, Image, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from './KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { message } from '@/lib/domain';

export function Screen({ children, refreshing, onRefresh }: { children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void }) {
  const c = useColors(); const inset = useSafeAreaInsets();
  return <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: c.background }} bottomOffset={30} keyboardShouldPersistTaps="handled"
    refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.tint} /> : undefined}
    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: Platform.OS === 'web' ? 75 : inset.top + 16, paddingBottom: 110 + (Platform.OS === 'web' ? 34 : inset.bottom), gap: 20 }}>
    {children}
  </KeyboardAwareScrollViewCompat>;
}
export function Txt({ children, size = 15, muted = false, bold = false, color, style }: { children?: React.ReactNode; size?: number; muted?: boolean; bold?: boolean; color?: string; style?: object }) {
  const c = useColors();
  return <Text style={[{ color: color || (muted ? c.mutedForeground : c.foreground), fontFamily: bold ? 'Inter_600SemiBold' : 'Inter_400Regular', fontSize: size, lineHeight: size * 1.4 }, style]}>{children}</Text>;
}
export function Title({ eyebrow, children }: { eyebrow?: string; children: React.ReactNode }) {
  const c = useColors();
  return <View style={{ gap: 7 }}>{!!eyebrow && <Txt size={11} bold color={c.tint} style={{ letterSpacing: 2 }}>{eyebrow.toUpperCase()}</Txt>}<Txt size={32} bold style={{ letterSpacing: -1.1 }}>{children}</Txt></View>;
}
export function Brand() { return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Image source={require('@/assets/images/brand-mark.png')} style={{ width: 38, height: 38 }} resizeMode="contain" /><Image source={require('@/assets/images/brand-wordmark.png')} style={{ width: 148, height: 25 }} resizeMode="contain" /></View>; }
export function Button({ title, onPress, secondary, danger, disabled, loading, icon, testID }: { title: string; onPress: () => void; secondary?: boolean; danger?: boolean; disabled?: boolean; loading?: boolean; icon?: React.ComponentProps<typeof Feather>['name']; testID?: string }) {
  const c = useColors();
  const color = danger ? c.destructive : secondary ? c.foreground : c.primaryForeground;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} testID={testID} disabled={disabled || loading}
    onPress={() => { void Haptics.selectionAsync().catch(() => {}); onPress(); }}
    style={({ pressed }) => ({ minHeight: 52, borderRadius: c.radius, paddingHorizontal: 18, paddingVertical: 14, gap: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: danger || secondary ? c.secondary : c.primary, opacity: disabled || loading ? .45 : pressed ? .7 : 1 })}>
    {loading ? <ActivityIndicator color={color} /> : icon ? <Feather name={icon} color={color} size={18} /> : null}<Txt bold color={color}>{title}</Txt>
  </Pressable>;
}
export function IconButton({ icon, label, onPress }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void }) {
  const c = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', opacity: pressed ? .4 : 1 })}><Feather name={icon} size={23} color={c.foreground} /></Pressable>;
}
export function Back() { return <View style={{ alignSelf: 'flex-start' }}><IconButton icon="arrow-left" label="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /></View>; }
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = useColors();
  return <View style={{ gap: 8 }}><Txt size={12} bold muted>{label}</Txt><TextInput accessibilityLabel={label} placeholderTextColor={c.mutedForeground} {...props}
    style={[{ color: c.foreground, fontFamily: 'Inter_400Regular', fontSize: 15, minHeight: 50, padding: 14, borderRadius: c.radius, backgroundColor: c.muted, borderWidth: 1, borderColor: c.border }, props.style]} /></View>;
}
export function Card({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, padding: 20, borderRadius: c.radius, gap: 12 }}>{children}</View>;
}
export function Row({ title, subtitle, onPress, icon = 'arrow-up-right', trailing }: { title: string; subtitle?: string; onPress?: () => void; icon?: React.ComponentProps<typeof Feather>['name']; trailing?: string }) {
  const c = useColors();
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={({ pressed }) => ({ paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border, flexDirection: 'row', gap: 12, alignItems: 'center', opacity: pressed ? .6 : 1 })}>
    <View style={{ flex: 1, gap: 4 }}><Txt bold>{title}</Txt>{!!subtitle && <Txt size={12} muted>{subtitle}</Txt>}</View>
    {!!trailing && <Txt bold size={14}>{trailing}</Txt>}{onPress && <Feather name={icon} size={20} color={c.tint} />}
  </Pressable>;
}
export function Notice({ error, retry }: { error: unknown; retry?: () => void }) {
  const c = useColors();
  if (!error) return null;
  return <Card><Txt color={c.destructive}>{message(error)}</Txt>{retry && <Button title="Try again" secondary onPress={retry} />}</Card>;
}
export function Empty({ title, text, icon = 'coffee' }: { title: string; text: string; icon?: React.ComponentProps<typeof Feather>['name'] }) {
  const c = useColors();
  return <View style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}><Feather name={icon} size={32} color={c.tint} /><Txt bold size={18}>{title}</Txt><Txt muted style={{ textAlign: 'center' }}>{text}</Txt></View>;
}
export function Loading() { const c = useColors(); return <ActivityIndicator color={c.tint} style={{ padding: 30 }} />; }
export function Nutrition({ macros }: { macros?: { calories: number; protein: number; carbs: number; fats: number } | null }) {
  const c = useColors();
  if (!macros) return <Txt muted size={12}>Nutrition coming soon</Txt>;
  return <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>{[['kcal', macros.calories], ['protein', macros.protein], ['carbs', macros.carbs], ['fat', macros.fats]].map(([label, value]) => <View key={label} style={{ gap: 1 }}><Txt bold size={18} color={c.tint}>{Math.round(Number(value) * 10) / 10}{label !== 'kcal' ? 'g' : ''}</Txt><Txt muted size={10}>{label}</Txt></View>)}</View>;
}
