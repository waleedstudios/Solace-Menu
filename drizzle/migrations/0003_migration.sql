DROP POLICY "Portion units viewable by all" ON public.portion_units;
CREATE POLICY "Portion units viewable by owner or on published menus" ON public.portion_units FOR SELECT
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.recipe_items ri JOIN public.menu_items mi ON mi.id = ri.menu_item_id
  WHERE ri.portion_unit_id = portion_units.id AND mi.is_published = true));

DROP POLICY "Profiles viewable by all" ON public.profiles;
CREATE POLICY "Profiles viewable by owner or with published menu" ON public.profiles FOR SELECT
USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.user_id = profiles.id AND mi.is_published = true));

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, restaurant_name, slug, created_at, updated_at) ON public.profiles TO anon, authenticated;