ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS description text, ADD COLUMN IF NOT EXISTS image_url text, ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true, ADD COLUMN IF NOT EXISTS public_macros jsonb;

CREATE OR REPLACE FUNCTION public.get_public_menu(_slug text)
RETURNS TABLE (id uuid, name text, description text, image_url text, category text, macros jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT r.id, r.name, r.description, r.image_url, r.category, r.public_macros
  FROM public.recipes r JOIN public.profiles p ON p.id = r.restaurant_id
  WHERE p.slug = _slug AND r.is_subrecipe = false AND r.is_published = true
  ORDER BY r.category NULLS LAST, r.name
$$;
GRANT EXECUTE ON FUNCTION public.get_public_menu(text) TO anon, authenticated;