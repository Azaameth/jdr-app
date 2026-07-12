# jdr-app

Campaign manager for "La Tour des Sorciers", a homebrew French tabletop RPG. Vue 3 + Vite + Firebase (Auth/Firestore).

## Migration context

This app is a rewrite of a single-file monolith (`legacy-reference/index.html`, ~4200 lines of inline HTML/CSS/JS). That file is kept as the behavioral reference for features not yet ported — see `legacy-reference/README.md` for the list and pointers to the relevant sections. When migrating a feature from it, treat it as a spec of intended behavior, not code to copy.

spec-kitty (`.kittify/`) tracks the remaining migration work as missions. Check there (or the migration backlog) before starting new feature work.

## Conventions

- **Stores** (`src/controllers/use*Store.ts`): hand-rolled singleton composables, *not* Pinia's `defineStore` — module-scope `ref`/`computed` + a factory function returning computed properties and async methods. Pinia is installed and registered via `createPinia()` in `main.ts` but isn't otherwise used. Follow the existing pattern (see `useCampaignStore.ts`) for new stores, including the `error.value = err instanceof Error ? err.message : '<French fallback>'` shape on every catch.
- **Repositories** (`src/models/repositories/*Repository.ts`): plain async functions per Firestore collection, no classes. Every function starts with `if (!db) return …` so the app still works (read-only/no-op) when Firebase isn't configured — e.g. GitHub Pages builds without secrets. Map Firestore docs with `{ id: doc.id, ...doc.data() }`, not a blind cast.
- User-facing strings are French; keep new ones consistent with the existing tone (see error messages in `useAuthStore.ts`, `useCampaignStore.ts`).
- Role-based access (`user.role`: `admin` / `mj` / `joueur`) gates both routes (`router.beforeEach` in `src/router/index.ts`) and in-view checks (e.g. `PlayerView.vue` only lets a `joueur` see their own character, resolved via `usePlayerStore().resolveCharacterId`).

## Data seeding

`scripts/` holds Firestore seed/admin scripts (`seedAll.mjs`, `uploadDefaultCharsAdmin.mjs`, `clearFirebase.mjs`, etc.) driven by JSON fixtures in `scripts/data/`. The `*Admin.mjs` scripts use `firebase-admin` and need a service-account key in `scripts/keys/` (gitignored, ask the project owner for one — see `npm run seed:defaultchars:admin`).

## Commands

- `npm run dev` / `npm run build` — dev server / production build (build runs type-check first)
- `npm run test:unit` — Vitest; `npm run test:e2e` — Playwright (`npx playwright install` first run)
- `npm run lint` — oxlint + eslint, both with `--fix`
- `npm run type-check` — `vue-tsc --build`

Node version is pinned via `.node-version` (fnm/nvm-compatible); CI (`.github/workflows/deploy.yml`) matches.
