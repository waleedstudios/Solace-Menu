# Project rules

- Keep the Replit workspace authoritative; root `dev` and `build:dev` commands adapt the existing web app to Lovable preview without migrating its backend or native app.
- On Lovable preview hosts without `VITE_CLERK_PUBLISHABLE_KEY`, the web app skips Clerk (`src/lib/clerk.ts`) and runs signed-out — sign-in is hosted by the Replit deployment, so preview must not crash loading it.
