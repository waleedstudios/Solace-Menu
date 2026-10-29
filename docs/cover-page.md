# Marketing cover page

Signed-out visitors to `/` see the Solace Menu product story. Signed-in visitors keep their existing onboarding/dashboard redirect. Sign in leaves the story through a same-origin `../auth` link targeted at the top window. BASE_URL supports deployments below a subpath.

The locally hosted document at `public/cover/index.html` intentionally uses an isolated, full-viewport iframe: its global styles, document queries, sticky scenes and window scrolling cannot affect app screens. Nothing loads from the private Sites preview. Vite copies public assets into the existing build. The previous Landing component remains available in source.

Edit the story modules in `artifacts/solace/public/cover`. Run `node scripts/build-cover.mjs` after editing templates. Run `node --test scripts/cover-data.test.mjs` for calculation checks. All recipe, price, nutrition and sales examples are fictional; email ingestion remains labeled planned.

Manual review: signed-out `/`, Sign in -> `/auth`, signed-in onboarding/dashboard redirect, `/r/:slug`, mobile scrolling, Read story, OS reduced motion, price slider and guest menu dialog. No backend, authentication or native app changes.

The iframe keeps its own scroll position and fragment navigation. For search-engine-focused marketing in a later pass, the story can be ported to native React/server-rendered markup; this integration prioritizes preserving the exact approved design and isolating application styles.

## Validation on Windows

Story generation, eight calculation tests, JavaScript syntax checks, workspace TypeScript build, and web-app typecheck passed. Full Vite build is blocked by existing Unix-only preinstall and explicit removal of Windows Rollup dependencies in pnpm-workspace.yaml. Run the production build in the authoritative Linux/Replit workspace before merging.
