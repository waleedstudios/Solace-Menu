CREATE TYPE public.member_role AS ENUM ('owner','manager','staff');
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  price_alert_threshold_pct numeric NOT NULL DEFAULT 5,
  invoice_retention_days integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.restaurant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text,
  role public.member_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, user_id)
);
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.member_role_of(_restaurant uuid)
RETURNS public.member_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.restaurant_members WHERE restaurant_id = _restaurant AND user_id = auth.uid() LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.is_member(_restaurant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurant_members WHERE restaurant_id = _restaurant AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.can_manage(_restaurant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurant_members WHERE restaurant_id = _restaurant AND user_id = auth.uid() AND role IN ('owner','manager'))
$$;
CREATE OR REPLACE FUNCTION public.is_owner(_restaurant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurant_members WHERE restaurant_id = _restaurant AND user_id = auth.uid() AND role = 'owner')
$$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingredients
  ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ADD COLUMN category text,
  ADD COLUMN brand text,
  ADD COLUMN supplier_code text,
  ADD COLUMN vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN base_unit text NOT NULL DEFAULT 'g',
  ADD COLUMN pack_count numeric,
  ADD COLUMN pack_size numeric,
  ADD COLUMN pack_unit text,
  ADD COLUMN purchase_unit text,
  ADD COLUMN yield_pct numeric NOT NULL DEFAULT 100,
  ADD COLUMN density_g_per_ml numeric,
  ADD COLUMN current_cost numeric,
  ADD COLUMN current_cost_date date,
  ADD COLUMN current_cost_invoice_id uuid,
  ADD COLUMN nutrition_source text,
  ADD COLUMN sat_fat_per_100 numeric,
  ADD COLUMN fiber_per_100 numeric,
  ADD COLUMN sugar_per_100 numeric,
  ADD COLUMN added_sugar_per_100 numeric,
  ADD COLUMN sodium_mg_per_100 numeric,
  ADD COLUMN serving_size_text text,
  ADD COLUMN servings_per_container numeric,
  ADD COLUMN label_image_path text,
  ADD COLUMN allergens text[],
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
COMMENT ON COLUMN public.ingredients.current_cost IS 'Cost per base unit (g, ml or each) from the latest approved purchase by invoice date, before yield.';

CREATE TABLE public.ingredient_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  vendor_name text,
  alias text NOT NULL,
  product_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  is_subrecipe boolean NOT NULL DEFAULT false,
  batch_yield_qty numeric NOT NULL DEFAULT 1,
  batch_yield_unit text NOT NULL DEFAULT 'each',
  servings_per_batch numeric NOT NULL DEFAULT 1,
  serving_size_text text,
  packaging_cost numeric NOT NULL DEFAULT 0,
  selling_price numeric,
  instructions text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.recipe_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  sub_recipe_id uuid REFERENCES public.recipes(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((ingredient_id IS NULL) <> (sub_recipe_id IS NULL)),
  CHECK (quantity > 0)
);
CREATE TABLE public.recipe_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_name text,
  invoice_number text,
  invoice_date date,
  doc_type text NOT NULL DEFAULT 'invoice',
  corrects_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  file_paths text[] NOT NULL DEFAULT '{}',
  file_hash text,
  status text NOT NULL DEFAULT 'uploaded',
  subtotal numeric,
  discount numeric,
  tax numeric,
  delivery numeric,
  total numeric,
  uncertain_fields text[] NOT NULL DEFAULT '{}',
  extraction_error text,
  uploaded_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  product_code text,
  quantity numeric,
  pack_count numeric,
  pack_size numeric,
  pack_unit text,
  unit_price numeric,
  line_total numeric,
  uncertain boolean NOT NULL DEFAULT false,
  uncertain_note text,
  match_status text NOT NULL DEFAULT 'unmatched',
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE SET NULL,
  match_confidence numeric,
  match_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_line_id uuid REFERENCES public.invoice_lines(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  vendor_name text,
  invoice_date date NOT NULL,
  cost_per_base numeric NOT NULL,
  base_unit text NOT NULL,
  pack_description text,
  pack_base_qty numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  file_name text,
  row_count integer NOT NULL DEFAULT 0,
  period_start date,
  period_end date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.sales_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.sales_imports(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  sale_date date,
  item_name text NOT NULL,
  modifiers text,
  quantity numeric NOT NULL DEFAULT 0,
  net_sales numeric NOT NULL DEFAULT 0,
  discounts numeric NOT NULL DEFAULT 0,
  refunds numeric NOT NULL DEFAULT 0
);
CREATE TABLE public.sales_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  sales_item_name text NOT NULL,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE CASCADE,
  ignored boolean NOT NULL DEFAULT false,
  UNIQUE (restaurant_id, sales_item_name)
);

CREATE INDEX ON public.restaurant_members(user_id);
CREATE INDEX ON public.ingredients(restaurant_id);
CREATE INDEX ON public.recipe_lines(recipe_id);
CREATE INDEX ON public.invoices(restaurant_id, invoice_date);
CREATE INDEX ON public.invoice_lines(invoice_id);
CREATE INDEX ON public.price_history(ingredient_id, invoice_date);
CREATE INDEX ON public.sales_lines(import_id);
CREATE INDEX ON public.sales_lines(restaurant_id, item_name);

-- grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants, public.restaurant_members, public.locations, public.vendors, public.ingredient_aliases, public.recipes, public.recipe_lines, public.recipe_versions, public.invoices, public.invoice_lines, public.price_history, public.sales_imports, public.sales_lines, public.sales_mappings TO authenticated;
GRANT ALL ON public.restaurants, public.restaurant_members, public.locations, public.vendors, public.ingredient_aliases, public.recipes, public.recipe_lines, public.recipe_versions, public.invoices, public.invoice_lines, public.price_history, public.sales_imports, public.sales_lines, public.sales_mappings TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read restaurant" ON public.restaurants FOR SELECT TO authenticated USING (public.is_member(id));
CREATE POLICY "owners update restaurant" ON public.restaurants FOR UPDATE TO authenticated USING (public.is_owner(id));

CREATE POLICY "members read members" ON public.restaurant_members FOR SELECT TO authenticated USING (public.is_member(restaurant_id));
CREATE POLICY "owners update members" ON public.restaurant_members FOR UPDATE TO authenticated USING (public.is_owner(restaurant_id) AND user_id <> auth.uid());
CREATE POLICY "owners remove members" ON public.restaurant_members FOR DELETE TO authenticated USING (public.is_owner(restaurant_id) AND user_id <> auth.uid());

CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "members read" ON public.locations FOR SELECT TO authenticated USING (public.is_member(restaurant_id));
CREATE POLICY "owners write" ON public.locations FOR ALL TO authenticated USING (public.is_owner(restaurant_id)) WITH CHECK (public.is_owner(restaurant_id));

CREATE POLICY "members read" ON public.vendors FOR SELECT TO authenticated USING (public.is_member(restaurant_id));
CREATE POLICY "members insert" ON public.vendors FOR INSERT TO authenticated WITH CHECK (public.is_member(restaurant_id));
CREATE POLICY "managers write" ON public.vendors FOR UPDATE TO authenticated USING (public.can_manage(restaurant_id));
CREATE POLICY "managers delete" ON public.vendors FOR DELETE TO authenticated USING (public.can_manage(restaurant_id));

CREATE POLICY "members read workspace ingredients" ON public.ingredients FOR SELECT TO authenticated USING (restaurant_id IS NOT NULL AND public.is_member(restaurant_id));
CREATE POLICY "managers insert workspace ingredients" ON public.ingredients FOR INSERT TO authenticated WITH CHECK (restaurant_id IS NOT NULL AND public.can_manage(restaurant_id));
CREATE POLICY "managers update workspace ingredients" ON public.ingredients FOR UPDATE TO authenticated USING (restaurant_id IS NOT NULL AND public.can_manage(restaurant_id));
CREATE POLICY "managers delete workspace ingredients" ON public.ingredients FOR DELETE TO authenticated USING (restaurant_id IS NOT NULL AND public.can_manage(restaurant_id));

CREATE POLICY "members read" ON public.ingredient_aliases FOR SELECT TO authenticated USING (public.is_member(restaurant_id));
CREATE POLICY "managers write" ON public.ingredient_aliases FOR ALL TO authenticated USING (public.can_manage(restaurant_id)) WITH CHECK (public.can_manage(restaurant_id));

CREATE POLICY "managers read" ON public.recipes FOR SELECT TO authenticated USING (public.can_manage(restaurant_id));
CREATE POLICY "managers write" ON public.recipes FOR ALL TO authenticated USING (public.can_manage(restaurant_id)) WITH CHECK (public.can_manage(restaurant_id));
CREATE POLICY "managers read" ON public.recipe_versions FOR SELECT TO authenticated USING (public.can_manage(restaurant_id));
CREATE POLICY "managers insert" ON public.recipe_versions FOR INSERT TO authenticated WITH CHECK (public.can_manage(restaurant_id));
CREATE POLICY "managers all" ON public.recipe_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND public.can_manage(r.restaurant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND public.can_manage(r.restaurant_id)));

CREATE POLICY "members read" ON public.invoices FOR SELECT TO authenticated USING (public.is_member(restaurant_id));
CREATE POLICY "members upload" ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.is_member(restaurant_id) AND uploaded_by = auth.uid());
CREATE POLICY "edit unapproved or manage" ON public.invoices FOR UPDATE TO authenticated USING (public.can_manage(restaurant_id) OR (public.is_member(restaurant_id) AND uploaded_by = auth.uid() AND status <> 'approved'));
CREATE POLICY "managers delete" ON public.invoices FOR DELETE TO authenticated USING (public.can_manage(restaurant_id));

CREATE POLICY "members read" ON public.invoice_lines FOR SELECT TO authenticated USING (public.is_member(restaurant_id));
CREATE POLICY "members write unapproved" ON public.invoice_lines FOR ALL TO authenticated
  USING (public.can_manage(restaurant_id) OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.uploaded_by = auth.uid() AND i.status <> 'approved'))
  WITH CHECK (public.is_member(restaurant_id));

CREATE POLICY "managers read" ON public.price_history FOR SELECT TO authenticated USING (public.can_manage(restaurant_id));
CREATE POLICY "managers write" ON public.price_history FOR ALL TO authenticated USING (public.can_manage(restaurant_id)) WITH CHECK (public.can_manage(restaurant_id));

CREATE POLICY "managers all" ON public.sales_imports FOR ALL TO authenticated USING (public.can_manage(restaurant_id)) WITH CHECK (public.can_manage(restaurant_id));
CREATE POLICY "managers all" ON public.sales_lines FOR ALL TO authenticated USING (public.can_manage(restaurant_id)) WITH CHECK (public.can_manage(restaurant_id));
CREATE POLICY "managers all" ON public.sales_mappings FOR ALL TO authenticated USING (public.can_manage(restaurant_id)) WITH CHECK (public.can_manage(restaurant_id));

-- add member by email (owners only)
CREATE OR REPLACE FUNCTION public.add_member_by_email(_restaurant uuid, _email text, _role public.member_role)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  IF NOT public.is_owner(_restaurant) THEN RAISE EXCEPTION 'Only owners can add team members'; END IF;
  IF _role = 'owner' THEN RAISE EXCEPTION 'Use manager or staff'; END IF;
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(trim(_email));
  IF uid IS NULL THEN RETURN 'not_found'; END IF;
  INSERT INTO public.restaurant_members (restaurant_id, user_id, email, role)
  VALUES (_restaurant, uid, lower(trim(_email)), _role)
  ON CONFLICT (restaurant_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  RETURN 'added';
END $$;

-- backfill workspaces for existing accounts
INSERT INTO public.restaurants (id, name, owner_id) SELECT id, restaurant_name, id FROM public.profiles ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_members (restaurant_id, user_id, email, role) SELECT id, id, email, 'owner' FROM public.profiles ON CONFLICT DO NOTHING;
INSERT INTO public.locations (restaurant_id, name) SELECT id, 'Main location' FROM public.restaurants;
UPDATE public.ingredients SET restaurant_id = user_id, nutrition_source = 'manual' WHERE user_id IS NOT NULL;
UPDATE public.ingredients SET nutrition_source = 'estimated' WHERE user_id IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  base_slug TEXT; final_slug TEXT; counter INT := 0; rname TEXT;
BEGIN
  rname := COALESCE(NEW.raw_user_meta_data->>'restaurant_name', split_part(NEW.email, '@', 1));
  base_slug := public.slugify(rname);
  IF base_slug = '' OR base_slug IS NULL THEN base_slug := 'restaurant'; END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  INSERT INTO public.profiles (id, restaurant_name, slug, email) VALUES (NEW.id, rname, final_slug, NEW.email);
  IF COALESCE(NEW.raw_user_meta_data->>'join_only','') <> 'true' THEN
    INSERT INTO public.restaurants (id, name, owner_id) VALUES (NEW.id, rname, NEW.id);
    INSERT INTO public.restaurant_members (restaurant_id, user_id, email, role) VALUES (NEW.id, NEW.id, NEW.email, 'owner');
    INSERT INTO public.locations (restaurant_id, name) VALUES (NEW.id, 'Main location');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ingredients_updated_at BEFORE UPDATE ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();