---
name: Recipe-to-menu behavior
description: The user's required relationship between menu recipes and the public menu.
---

Menu items added under Recipes should automatically create and synchronize the corresponding item on the public menu.

**Why:** The user explicitly requested automatic creation and synchronization instead of maintaining separate entries.

**How to apply:** Treat menu recipes as the source for their corresponding public dishes. Do not require the owner to repeat the same menu-item entry manually in another editor.

Synchronization must run on the server without requiring anyone to open the costing editor, and nutrition must reflect saved amounts rather than unsaved form drafts.

**Why:** Browser-driven nutrition writes can leave guests seeing stale values and can fail for staff without write access.

**How to apply:** Use one calculation policy for private costing and public nutrition. A future cache must be invalidated for ingredient, nested-recipe, yield and serving changes; do not restore browser-side snapshot writes.

Preserve deliberate visibility choices during synchronization rollouts.

**Why:** An unpublished modern recipe may reflect a default or a deliberate owner choice; there is no reliable historical distinction. A new synchronization marker does not prove permission to publish.

**How to apply:** Preserve existing modern and legacy visibility during rollout, publish newly created menu recipes by default, and leave older hidden recipes available for an explicit Show action. Keep sub-recipes private.
