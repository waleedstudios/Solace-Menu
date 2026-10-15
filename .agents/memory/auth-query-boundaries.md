---
name: Authentication query boundaries
description: Keep guest menus loading normally while erasing private session caches.
---

Authentication initialization, sign-out and onboarding cache resets must preserve active public-menu queries.

**Why:** Clearing the shared query client cancelled in-flight guest menu requests and left their observers showing loading placeholders indefinitely, even though the API returned correct data. The earlier imperative public loader did not reveal this interaction.

**How to apply:** Erase private account queries on identity changes without destroying independent public queries. Regression-check a pending guest request, not only an already cached menu. This is cache isolation, not a change to Google consent or Clerk authentication.
