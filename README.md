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
pnpm install --frozen-lockfile
pnpm run typecheck
```

Use Node.js 24.13.0 and pnpm 10.26.1 (pinned in `package.json`) to match CI. Manual web builds require `PORT` and `BASE_PATH`; for example, `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/solace run build`. The managed artifact tooling supplies these during normal development. The root `build` includes the Expo app and is not the PR check command. External services must be configured before running the full application. See [replit.md](replit.md) for service details, operating instructions, and data-protection rules.

The mobile release checklist is in [artifacts/solace-mobile/APP_STORE_CHECKLIST.md](artifacts/solace-mobile/APP_STORE_CHECKLIST.md). A GitHub push does not submit the app to the App Store or publish the Replit app.

## GitHub and Lovable collaboration

- The repository is `waleedstudios/solace-menu`; Replit is the authoritative implementation.
- The reconciliation preserves the prior GitHub commits as merge history without activating their legacy Supabase/MCP runtime integrations.
- Keeping the same repository does not require removing Lovable's access. A repository rename does not establish a new Lovable connection; check Lovable's connection settings if it still displays the previous name.
- Lovable may not support building or editing this Replit monorepo as-is. Do not treat its old root-level Vite configuration as the active app.
- For Lovable design work, use a separate branch or pull request where supported, review the changes, and adapt them to `artifacts/solace`. Do not replace the backend, authentication, or workspace configuration with the legacy application.
- There is no automatic safe two-way application synchronization. Review incoming changes before merging, and avoid force-pushing either version over the other.

## Pull-request checks and review

`.github/workflows/pull-request-checks.yml` runs **SolaceMenu PR checks / Workspace checks** on every pull request, including drafts and forks, and can also be run manually from GitHub Actions. It uses an Ubuntu x64 runner, the versions above, and `pnpm install --frozen-lockfile`; dependency updates must include the corresponding `pnpm-lock.yaml` changes. Existing package-release-age and install-script restrictions remain enabled.

The job runs these commands in order:

```sh
pnpm run typecheck
pnpm --filter @workspace/solace run test
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/solace run build
pnpm --filter @workspace/api-server run build
```

Typechecking covers shared libraries first, then the website, API, Expo mobile app, mockup sandbox, and scripts. Vitest covers recipe costing, invoice helpers, data transport (mocked HTTP), and public-menu cache boundaries using synthetic fixtures. The web and API builds only produce bundles: they do not start services, log in, run schema pushes, extract invoices, or deploy anything. No GitHub secrets, private restaurant records, live Clerk sessions, database credentials, App Storage access, or paid AI calls are required.

Deliberate exclusions:

- `pnpm --filter @workspace/api-server run test:invoices` includes real PostgreSQL transaction tests that write fixtures and requires a prepared development database. It is **not** run by this secret-free job; never point it at production.
- Expo packaging, native/store releases, interactive authenticated flows, live integrations, and the retired `.migration-backup` application are not exercised. A green check is not proof that these work.
- API contract edits belong in `lib/api-spec/openapi.yaml`; regenerate with `pnpm --filter @workspace/api-spec run codegen` and commit the generated clients/validators. CI typechecks the committed output but does not currently enforce regeneration drift.

For incoming Lovable/design changes:

1. Use a branch and open a pull request against the current Replit version in `waleedstudios/solace-menu`. Keep Lovable repository access as-is.
2. Review the diff, especially authentication, API contracts, database changes, dependency scripts, and this workflow. Adapt UI changes to `artifacts/solace`; reject changes that restore the retired root-level Supabase/Lovable app or overwrite workspace configuration.
3. In the PR's **Checks** tab, open **Workspace checks** to inspect any failed command. Fix the failure on the same branch and push again; newer runs cancel older runs for that PR. GitHub may require a maintainer to approve a first-time fork contributor's workflow run.
4. After the check passes, review the affected screens in Replit using managed workflows and merge only after human review. Merge/push does not publish the Replit app or submit the mobile app.

This adds checks, not a merge lock: no branch-protection rules or repository access settings are changed. Requiring this check and reviews before merging would need a separately approved repository-rules change. Direct pushes can still bypass this PR workflow.

## Backup boundaries

GitHub stores the committed source and history. It does **not** back up live PostgreSQL records, App Storage files such as invoices, authentication-provider accounts, or secret values. Those require separate backup and recovery procedures.
