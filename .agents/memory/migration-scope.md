---
name: Migration scope
description: Full migration scope and the user's intended Replit/GitHub/Lovable workflow.
---

The user selected “Migrate the full app to Replit” rather than a frontend-only port.

**Why:** The user explicitly chose the full migration option.

**How to apply:** Include authentication, persistent data, document uploads, and document extraction when evaluating migration completeness. Do not silently narrow future port work to the frontend.

The current Replit SolaceMenu version should be the version on GitHub. The user will not use Lovable to update SolaceMenu except possibly for UI/design, but wants Lovable to retain access to the repository.

**Why:** The user explicitly clarified which version should be authoritative and Lovable's remaining role.

**How to apply:** Treat Replit as the source of truth when planning repository synchronization. Preserve access to the existing repository rather than moving the app back to Lovable.
