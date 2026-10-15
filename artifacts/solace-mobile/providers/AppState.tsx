import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { setAuthTokenGetter, useGetCurrentUser, getGetCurrentUserQueryKey, type LocalUser } from '@workspace/api-client-react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyWorkspace, eq, rows, type Workspace, type Restaurant, type Membership, type Recipe, type Ingredient, type Invoice } from '@/lib/domain';
import type { CostLine } from '@workspace/recipe-engine';

type SavedMenu = { name: string; slug: string };
type State = {
  account: LocalUser | undefined; accountLoading: boolean; error: unknown; busy: boolean;
  restaurant: Restaurant | undefined; role: string | undefined; canManage: boolean; workspace: Workspace;
  selectRestaurant: (id: string) => void; refresh: () => Promise<void>;
  saved: SavedMenu[]; toggleSaved: (menu: SavedMenu) => Promise<void>; clearSaved: () => Promise<void>;
};
const Context = createContext<State | null>(null);
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId, getToken } = useAuth();
  const client = useQueryClient();
  const [ready, setReady] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState<SavedMenu[]>([]);
  const identity = useRef(userId);
  const refreshVersion = useRef(0);
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    setReady(true);
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  useEffect(() => {
    AsyncStorage.getItem('solace.saved-menus').then(v => {
      if (v) { try { const parsed = JSON.parse(v); if (Array.isArray(parsed)) setSaved(parsed.filter(x => typeof x.name === 'string' && typeof x.slug === 'string')); } catch { /* corrupt local preferences are ignored */ } }
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (identity.current === userId) return;
    identity.current = userId;
    refreshVersion.current++;
    setWorkspace(emptyWorkspace); setSelected(''); setError(null); setBusy(false);
    client.removeQueries({ predicate: q => !String(q.queryKey[0]).startsWith('/api/public') && !(userId && q.queryKey.includes(userId)) });
  }, [userId, client]);
  const accountQuery = useGetCurrentUser({ query: {
    enabled: !!isSignedIn && ready,
    queryKey: [...getGetCurrentUserQueryKey(), userId],
    retry: false,
  } });
  const complete = accountQuery.data?.onboarding_complete;
  const refresh = useCallback(async () => {
    if (!isSignedIn || !complete) return;
    const requestingUser = userId;
    const version = ++refreshVersion.current;
    setBusy(true); setError(null);
    try {
      const [restaurants, members, recipes, ingredients, lines, invoices] = await Promise.all([
        rows<Restaurant>({ table: 'restaurants', operation: 'select' }),
        rows<Membership>({ table: 'restaurant_members', operation: 'select' }),
        rows<Recipe>({ table: 'recipes', operation: 'select' }),
        rows<Ingredient>({ table: 'ingredients', operation: 'select' }),
        rows<CostLine>({ table: 'recipe_lines', operation: 'select' }),
        rows<Invoice>({ table: 'invoices', operation: 'select', orders: [{ column: 'created_at', ascending: false }] }),
      ]);
      if (identity.current === requestingUser && refreshVersion.current === version) {
        setWorkspace({ restaurants, members, recipes, ingredients, lines, invoices });
        setSelected(old => restaurants.some(r => r.id === old) ? old : restaurants[0]?.id || '');
      }
    } catch (e) { if (identity.current === requestingUser && refreshVersion.current === version) setError(e); }
    finally { if (identity.current === requestingUser && refreshVersion.current === version) setBusy(false); }
  }, [complete, isSignedIn, userId]);
  useEffect(() => { void refresh(); }, [refresh]);
  const visibleWorkspace = isSignedIn && identity.current === userId ? workspace : emptyWorkspace;
  const restaurant = visibleWorkspace.restaurants.find(r => r.id === selected);
  const role = visibleWorkspace.members.find(m => m.restaurant_id === selected && m.user_id === accountQuery.data?.id)?.role;
  async function toggleSaved(menu: SavedMenu) {
    const next = saved.some(m => m.slug === menu.slug) ? saved.filter(m => m.slug !== menu.slug) : [...saved, menu];
    await AsyncStorage.setItem('solace.saved-menus', JSON.stringify(next)); setSaved(next);
  }
  return <Context.Provider value={{
    account: isSignedIn ? accountQuery.data : undefined, accountLoading: !!isSignedIn && accountQuery.isPending,
    error: accountQuery.error || error, busy, workspace: visibleWorkspace, restaurant, role, canManage: role === 'owner' || role === 'manager',
    selectRestaurant: setSelected, refresh: async () => {
      if (!isSignedIn) return;
      if (!complete) { await accountQuery.refetch(); return; }
      await refresh();
    }, saved, toggleSaved,
    clearSaved: async () => { await AsyncStorage.removeItem('solace.saved-menus'); setSaved([]); },
  }}>{children}</Context.Provider>;
}
export function useAppState() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing AppStateProvider');
  return value;
}
