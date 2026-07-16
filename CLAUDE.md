 ## Rules
- Follow all identity, style, and behavior definitions
- Treat them as strict instructions (not suggestions)

## Token / model policy
- Implementation grunt work (boilerplate, test writing, content entry): delegate to subagents on \model: sonnet
- Orchestrator reviews diffs against the spec's acceptance criteria — not against taste.
- Hooks run linter + tests after edits; do not spend orchestrator review on anything the hooks can catch.
- Periodic architecture audit (ultracode/x-high effort): only on explicit request, roughly once per phase.

## High-complexity specs
When a spec has ~4+ independent acceptance criteria, or spans state, UI, and cross-system coupling, do not build it in one session. First, define and lock the schema/naming contract in the spec (data field names, sub-object APIs, signals—the stable surface that other specs can reuse). Then implement and validate one acceptance-criteria cluster at a time, progressively delivering the complete feature, each green before the next, `/clear` between. Keep the increment ledger (what's done / what's next) in NEXTSTEPS.md so any session can resume

# jdr-app

Campaign manager for "La Tour des Sorciers", a homebrew French tabletop RPG. Vue 3 + Vite + Firebase (Auth/Firestore).

## Migration context

This app is a rewrite of a single-file monolith (`legacy-reference/index.html`, ~4200 lines of inline HTML/CSS/JS). That file is kept as the behavioral reference for features not yet ported — see `legacy-reference/README.md` for the list and pointers to the relevant sections. When migrating a feature from it, treat it as a spec of intended behavior, not code to copy.

spec-kitty (`.kittify/`) tracks the remaining migration work as missions. Check there (or the migration backlog) before starting new feature work. See README.md's "Working with spec-kitty" section for the concrete command sequence and gotchas discovered running the first mission end-to-end (worktrees don't share gitignored files, the analysis gate is enforced, etc.).

`legacy-reference/index.html` is ~4200 lines — grep it or delegate to a subagent to pull the relevant section instead of reading the whole file when consulting it as a spec.

## Conventions

- **Stores** (`src/controllers/use*Store.ts`): hand-rolled singleton composables — module-scope `ref`/`computed` + a factory function returning computed properties and async methods. This is the committed pattern; Pinia was installed but never used beyond registration and has been removed. Follow the existing pattern (see `useCampaignStore.ts`) for new stores, including the `error.value = err instanceof Error ? err.message : '<French fallback>'` shape on every catch.
- **Repositories** (`src/models/repositories/*Repository.ts`): plain async functions per Firestore collection, no classes. Every function starts with `if (!db) return …` so the app still works (read-only/no-op) when Firebase isn't configured — e.g. GitHub Pages builds without secrets. Map Firestore docs with `{ id: doc.id, ...doc.data() }`, not a blind cast.
- User-facing strings are French; keep new ones consistent with the existing tone (see error messages in `useAuthStore.ts`, `useCampaignStore.ts`).
- Role-based access (`user.role`: `admin` / `mj` / `joueur`) gates both routes (`router.beforeEach` in `src/router/index.ts`) and in-view checks (e.g. `PlayerView.vue` only lets a `joueur` see their own character, resolved via `usePlayerStore().resolveCharacterId`). `firestore.rules` enforces the same model server-side (a user can never write their own `role`; only `mj`/`admin` can write campaigns) — see README.md's "Known follow-ups" for its deployment status.

## Data seeding

`scripts/` holds Firestore seed/admin scripts (`seedAll.mjs`, `uploadDefaultCharsAdmin.mjs`, `clearFirebase.mjs`, etc.) driven by JSON fixtures in `scripts/data/`. The `*Admin.mjs` scripts use `firebase-admin` and need a service-account key in `scripts/keys/` (gitignored, ask the project owner for one — see `npm run seed:defaultchars:admin`).

## Commands

- `npm run dev` / `npm run build` — dev server / production build (build runs type-check first)
- `npm run test:unit` — Vitest; `npm run test:e2e` — Playwright (`npx playwright install` first run)
- `npm run lint` — oxlint + eslint, both with `--fix`
- `npm run type-check` — `vue-tsc --build`

Node version is pinned via `.node-version` (fnm/nvm-compatible); CI matches — `.github/workflows/ci.yml` runs type-check/lint/unit/e2e on PRs and `main` pushes, `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on push to `main`. `main` is the sole long-lived branch (the earlier `dev` branch was discarded — it had diverged with untrustworthy commits; use short-lived per-mission branches instead).

Development happens over SSH on a remote box, so verifying `npm run dev` in a browser needs port forwarding first (VSCode Remote-SSH PORTS tab, or `ssh -L <port>:localhost:<port>`) — `localhost:<port>` alone won't reach it from the client machine.
