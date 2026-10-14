DROP POLICY IF EXISTS "Ingredients viewable by all" ON public.ingredients;
CREATE POLICY "Global or published-menu ingredients viewable" ON public.ingredients FOR SELECT
USING (
  restaurant_id IS NULL
  OR EXISTS (SELECT 1 FROM public.recipe_items ri JOIN public.menu_items mi ON mi.id = ri.menu_item_id WHERE ri.ingredient_id = ingredients.id AND mi.is_published = true)
);