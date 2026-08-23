# jdr-app

Campaign manager for "La Tour des Sorciers", a homebrew French tabletop RPG.
Vue 3 + Vite + TypeScript + Firebase (Auth/Firestore).

Mid-migration from a single-file HTML prototype (`legacy-reference/index.html`)
to this app — see [MIGRATION_BACKLOG.md](MIGRATION_BACKLOG.md) for what's left
to port, and [CLAUDE.md](CLAUDE.md) for the conventions this codebase follows.

## Setup

1. **Node version**: pinned via `.node-version`. Install [fnm](https://github.com/Schniz/fnm)
   (or nvm) and run `fnm use` (or `fnm install` first if you don't have that
   version yet) from the repo root.
2. **Install dependencies**: `npm install`
3. **Firebase config**: copy `.env.local.example` to `.env.local` and fill in
   the values — ask the project owner for the Web App config (Firebase
   Console → Project settings → Your apps). You don't strictly need this to
   develop: every repository no-ops when Firebase isn't configured (see
   CLAUDE.md), so the UI runs fine without it — you just won't see real data
   or be able to sign in. There's no separate dev/staging Firebase project;
   `.env.local` points at the same project as production.
4. **Service account (optional)**: only needed for the admin seed scripts in
   `scripts/` (`npm run seed:*`). Ask the project owner for a key and place
   it at `scripts/keys/serviceAccountKey.json` (gitignored).

## Running things in the background

`./scripts/dev.sh {start|stop|restart|status}` runs the dev server as a
tracked background process instead of tying up a terminal — useful over SSH.
It cleans up fully on `stop` (no orphaned processes left holding a port);
`DEV_PORT=` overrides the default (5173).

## Commands

```sh
npm run dev          # dev server (vite) — or ./scripts/dev.sh start to background it
npm run build         # type-check + production build
npm run preview       # serve the production build locally

npm run test:unit      # Vitest
npm run test:e2e       # Playwright (npx playwright install first run)
npm run test:e2e -- --project=chromium   # single browser
npm run test:e2e -- e2e/castes.spec.ts   # single file

npm run lint           # oxlint + eslint, both with --fix
npm run type-check     # vue-tsc --build
```

CI (`.github/workflows/ci.yml`) runs type-check/lint/unit/e2e on every PR and
on pushes to `main` (the sole trunk — see CLAUDE.md). `.github/workflows/deploy.yml`
separately builds and deploys to GitHub Pages on push to `main`, and deploys
`firestore.rules` when that file changes.

## Known follow-ups

Not migration gaps (see MIGRATION_BACKLOG.md for those). All items flagged
during a 2026-07-12 best-practices pass have since been resolved:
`firestore.rules` is deployed to production (`.github/workflows/deploy.yml`
redeploys it automatically whenever the file changes), `src/firebase/testConnection.ts`
has been removed, and `participant.personalNote` now lives in its own
`participantNotes` collection (one doc per participant, keyed by the
participant's own doc id) restricted to its owner/mj/admin — see
`firestore.rules`.

## Recommended editor setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar).
Vue.js devtools browser extension is useful for inspecting component state.
