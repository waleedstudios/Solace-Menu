# Solace Restaurant OS

Solace helps restaurants manage ingredient nutrition and costs, build recipes, publish macro-enabled menus, review supplier invoices, and analyze sales.

## Run & Operate

- Managed workflow `artifacts/api-server: API Server` — Express API under `/api`
- Managed workflow `artifacts/solace: web` — React app at `/`
- Managed workflows inject `PORT` and `BASE_PATH`; use them rather than starting duplicate servers.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React, React Router, Vite, Tailwind CSS 3
- Auth: Replit-managed Clerk, same-origin cookie sessions
- Documents: Replit App Storage with restaurant-authorized download routes
- Extraction: OpenAI Responses through Replit AI Integrations
- API build: esbuild ESM bundle

## Where things live

- `artifacts/solace/src/` — imported pages, components, styles, and assets
- `artifacts/solace/src/lib/data.ts` — typed HTTP adapter for the imported query flows
- `artifacts/solace/src/pages/Onboarding.tsx` — required first-login business setup
- `artifacts/api-server/src/lib/onboarding.ts` — transactional, idempotent setup that preserves existing restaurant IDs and records
- `artifacts/api-server/src/routes/` — data queries, account provisioning, document storage, extraction
- `artifacts/api-server/src/lib/dataPolicy.ts` — restaurant and role authorization
- `lib/db/src/schema/` — normalized PostgreSQL schema
- `lib/api-spec/openapi.yaml` — API contract; generated clients and validators must come from codegen
- `.migration-backup/` — original Lovable source, preserved as a reference

## Architecture decisions

- Preserve the imported UI and React Router routes instead of redesigning during the port.
- Keep local UUID identities separate from Clerk provider IDs to preserve the imported relational model.
- Authenticate private document downloads on every request; do not expose reusable public bearer links.
- Owner manages team/settings/locations; owner and manager manage recipes, inventory, approvals, and sales; staff uploads invoices but cannot approve them.

## Product

- Ingredient catalog, portion units, nutrition labels, recipe costing and batch yields
- Legacy menu editor plus recipe-based public menus at `/r/:slug` and `/restaurant/:slug`
- Invoice upload, AI extraction, line matching, approval, and ingredient price history
- Sales import and recipe mapping, restaurant locations, team membership, settings

## Migration boundaries

- The Replit copy is independent. Changes here do not modify or automatically synchronize with Lovable.
- Existing hosted Lovable/Supabase accounts and private records have not been exported or imported; new accounts use Clerk.

## Gotchas

- The imported frontend retains its original relaxed TypeScript settings; backend/shared packages remain strict.
- A manual frontend production build requires `PORT` and `BASE_PATH` (normally supplied by artifact tooling).
- Do not reintroduce Supabase or the Lovable AI gateway into active runtime paths.
- Never run development schema pushes against production without an explicitly approved migration.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
