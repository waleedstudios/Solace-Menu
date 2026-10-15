# Project rules

- Restaurant data is scoped by `restaurant_id` and protected with RLS helpers `is_member` / `can_manage` / `is_owner`; why: isolated multi-user workspaces with owner/manager/staff roles.
- All cost and nutrition math lives in `src/lib/units.ts` and `src/lib/costing.ts` and runs client-side; why: single source of truth, unit-tested, and easier to move to encrypted/browser-only data later.
- Missing prices, conversions or nutrition are surfaced as issues, never treated as zero; why: product requirement that incomplete totals are never presented as verified.
- Ingredient `current_cost` is derived only from approved `price_history` (latest by invoice date) via `refreshCurrentCost`; why: uploads must never silently change costs and older invoices must not overwrite newer prices.
- Invoice/label reading goes through the `extract-document` edge function; recipes are never sent to AI; why: privacy requirement.
- Legacy `menu_items`/`recipe_items`/`portion_units` still power the public menu; new costing uses `recipes`/`recipe_lines`.
