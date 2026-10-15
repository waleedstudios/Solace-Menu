
-- Profiles table (one per restaurant owner)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ingredients: global library (user_id NULL) + user custom
CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories_per_100g NUMERIC(10,2) NOT NULL DEFAULT 0,
  protein_per_100g NUMERIC(10,2) NOT NULL DEFAULT 0,
  carbs_per_100g NUMERIC(10,2) NOT NULL DEFAULT 0,
  fats_per_100g NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.portion_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  average_grams NUMERIC(10,2) NOT NULL,
  min_grams NUMERIC(10,2),
  max_grams NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  grams NUMERIC(10,2),
  portion_unit_id UUID REFERENCES public.portion_units(id) ON DELETE SET NULL,
  portion_quantity NUMERIC(10,2),
  -- Phase 2 prep: modifier support
  is_modifier BOOLEAN NOT NULL DEFAULT false,
  modifier_type TEXT, -- 'add' | 'remove' | null
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_items_menu_item ON public.recipe_items(menu_item_id);
CREATE INDEX idx_menu_items_user ON public.menu_items(user_id);
CREATE INDEX idx_profiles_slug ON public.profiles(slug);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portion_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;

-- Profiles: public readable (needed for public menu lookup), owner manages own
CREATE POLICY "Profiles viewable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Ingredients: global (user_id NULL) viewable by all authed; user customs viewable by owner; everyone can read because public menu needs ingredient data
CREATE POLICY "Ingredients viewable by all" ON public.ingredients FOR SELECT USING (true);
CREATE POLICY "Users create own ingredients" ON public.ingredients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ingredients" ON public.ingredients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own ingredients" ON public.ingredients FOR DELETE USING (auth.uid() = user_id);

-- Portion units: viewable by all (public menu may need to display), owner manages
CREATE POLICY "Portion units viewable by all" ON public.portion_units FOR SELECT USING (true);
CREATE POLICY "Users create own portion units" ON public.portion_units FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own portion units" ON public.portion_units FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own portion units" ON public.portion_units FOR DELETE USING (auth.uid() = user_id);

-- Menu items: published items viewable by all; owner manages all
CREATE POLICY "Published menu items viewable by all" ON public.menu_items FOR SELECT USING (is_published = true OR auth.uid() = user_id);
CREATE POLICY "Users create own menu items" ON public.menu_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own menu items" ON public.menu_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own menu items" ON public.menu_items FOR DELETE USING (auth.uid() = user_id);

-- Recipe items: viewable if parent menu_item viewable; owner manages via parent
CREATE POLICY "Recipe items viewable by all" ON public.recipe_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.id = menu_item_id AND (mi.is_published = true OR mi.user_id = auth.uid()))
);
CREATE POLICY "Owners insert recipe items" ON public.recipe_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.id = menu_item_id AND mi.user_id = auth.uid())
);
CREATE POLICY "Owners update recipe items" ON public.recipe_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.id = menu_item_id AND mi.user_id = auth.uid())
);
CREATE POLICY "Owners delete recipe items" ON public.recipe_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.id = menu_item_id AND mi.user_id = auth.uid())
);

-- Slug helper
CREATE OR REPLACE FUNCTION public.slugify(value TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' from regexp_replace(lower(value), '[^a-z0-9]+', '-', 'g'));
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
  rname TEXT;
BEGIN
  rname := COALESCE(NEW.raw_user_meta_data->>'restaurant_name', split_part(NEW.email, '@', 1));
  base_slug := public.slugify(rname);
  IF base_slug = '' OR base_slug IS NULL THEN base_slug := 'restaurant'; END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  INSERT INTO public.profiles (id, restaurant_name, slug, email)
  VALUES (NEW.id, rname, final_slug, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed a starter global ingredient library
INSERT INTO public.ingredients (name, calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g) VALUES
  ('Chicken Breast', 165, 31, 0, 3.6),
  ('Salmon', 208, 20, 0, 13),
  ('White Rice (cooked)', 130, 2.7, 28, 0.3),
  ('Brown Rice (cooked)', 112, 2.6, 24, 0.9),
  ('Quinoa (cooked)', 120, 4.4, 21, 1.9),
  ('Avocado', 160, 2, 9, 15),
  ('Olive Oil', 884, 0, 0, 100),
  ('Cheddar Cheese', 402, 25, 1.3, 33),
  ('Mozzarella', 280, 28, 3.1, 17),
  ('Egg', 155, 13, 1.1, 11),
  ('Spinach', 23, 2.9, 3.6, 0.4),
  ('Tomato', 18, 0.9, 3.9, 0.2),
  ('Lettuce', 15, 1.4, 2.9, 0.2),
  ('Bread (white)', 265, 9, 49, 3.2),
  ('Pasta (cooked)', 131, 5, 25, 1.1),
  ('Ground Beef (lean)', 217, 26, 0, 12),
  ('Bacon', 541, 37, 1.4, 42),
  ('Butter', 717, 0.9, 0.1, 81),
  ('Tofu', 76, 8, 1.9, 4.8),
  ('Black Beans (cooked)', 132, 8.9, 24, 0.5),
  ('Sweet Potato', 86, 1.6, 20, 0.1),
  ('Potato', 77, 2, 17, 0.1),
  ('Almonds', 579, 21, 22, 50),
  ('Greek Yogurt', 59, 10, 3.6, 0.4),
  ('Honey', 304, 0.3, 82, 0);
