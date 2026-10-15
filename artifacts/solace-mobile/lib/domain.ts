import type { CostIngredient, CostLine, CostRecipe } from '@workspace/recipe-engine';
import { queryData, type DataRequest } from '@workspace/api-client-react';

export type Restaurant = { id: string; name: string; owner_id: string; address: string | null; phone: string | null };
export type Membership = { id: string; restaurant_id: string; user_id: string; role: string };
export type Ingredient = CostIngredient & { restaurant_id: string | null; user_id: string | null };
export type Recipe = CostRecipe & { restaurant_id: string; description: string | null; category: string | null; image_url: string | null; serving_size_text: string | null; is_published: boolean; is_subrecipe: boolean; version: number };
export type Invoice = import('@workspace/recipe-engine/invoices').InvoiceDetails;
export type Workspace = { restaurants: Restaurant[]; members: Membership[]; recipes: Recipe[]; ingredients: Ingredient[]; lines: CostLine[]; invoices: Invoice[] };
export const emptyWorkspace: Workspace = { restaurants: [], members: [], recipes: [], ingredients: [], lines: [], invoices: [] };
export async function rows<T>(input: DataRequest): Promise<T[]> {
  const result = await queryData(input);
  if (result.error) throw new Error(result.error.message || 'Could not save.');
  return (Array.isArray(result.data) ? result.data : result.data ? [result.data] : []) as T[];
}
export const eq = (column: string, value: string) => ({ column, operator: 'eq' as const, value });
export const money = (value: number | null | undefined) => value == null ? '—' : `$${Number(value).toFixed(2)}`;
export function message(error: unknown) {
  const e = error as { data?: { error?: { message?: string } }; errors?: { longMessage?: string; message?: string }[]; message?: string };
  return e?.data?.error?.message || e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || e?.message || 'Something went wrong. Please try again.';
}
export const apiOrigin = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : '';
export function photoUri(uri?: string | null) {
  return uri?.startsWith('/') ? `${apiOrigin}${uri}` : uri?.startsWith('https://') ? uri : undefined;
}
export function menuSlug(input: string) {
  const raw = input.trim();
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(raw)) return raw.toLowerCase();
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/\/(?:r|restaurant|menu)\/([a-z0-9-]+)\/?$/i);
    if (url.protocol === 'solace-mobile:' && url.hostname === 'menu') return url.pathname.replace(/^\//, '');
    return match?.[1] ?? null;
  } catch { return null; }
}
