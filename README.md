# SolaceMenu

SolaceMenu is a restaurant nutrition, recipe-costing, public-menu, and supplier-invoice platform. This repository contains the current Replit implementation, including the website, native mobile companion, and shared backend.

## Applications

| Directory | Purpose |
| --- | --- |
| `artifacts/solace` | Restaurant website and customer-facing public menus |
| `artifacts/solace-mobile` | Expo mobile app for restaurant teams and customers |
| `artifacts/api-server` | Shared Express API |
| `lib` | Shared database schema, API contracts, generated clients, and recipe engine |
| `.migration-backup` | Original Lovable source kept for reference, not an active application |

The active stack is pnpm workspaces, React/Vite, Expo, PostgreSQL/Drizzle, Clerk, Replit App Storage, and Replit AI Integrations. Do not restore the old root-level Lovable/Supabase application over this workspace.

## Development

The Replit workspace has managed workflows for the website, API, and mobile app. Use those workflows rather than launching duplicate servers. Configuration and service credentials belong in environment variables and Replit Secrets, never in commits.

```sh
pnpm install
pnpm run typecheck
pnpm run build
```

Manual web builds require `PORT` and `BASE_PATH`; the managed artifact tooling supplies these. External services must be configured before running the full application. See [replit.md](replit.md) for service details, operating instructions, and data-protection rules.

The mobile release checklist is in [artifacts/solace-mobile/APP_STORE_CHECKLIST.md](artifacts/solace-mobile/APP_STORE_CHECKLIST.md). A GitHub push does not submit the app to the App Store or publish the Replit app.

## GitHub and Lovable collaboration

- The repository is `waleedstudios/solace-menu`; Replit is the authoritative implementation.
- The reconciliation preserves the prior GitHub commits as merge history without activating their legacy Supabase/MCP runtime integrations.
- Keeping the same repository does not require removing Lovable's access. A repository rename does not establish a new Lovable connection; check Lovable's connection settings if it still displays the previous name.
- Lovable may not support building or editing this Replit monorepo as-is. Do not treat its old root-level Vite configuration as the active app.
- For Lovable design work, use a separate branch or pull request where supported, review the changes, and adapt them to `artifacts/solace`. Do not replace the backend, authentication, or workspace configuration with the legacy application.
- There is no automatic safe two-way application synchronization. Review incoming changes before merging, and avoid force-pushing either version over the other.

## Backup boundaries

GitHub stores the committed source and history. It does **not** back up live PostgreSQL records, App Storage files such as invoices, authentication-provider accounts, or secret values. Those require separate backup and recovery procedures.
