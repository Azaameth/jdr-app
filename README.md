# jdr-app

Campaign manager for "La Tour des Sorciers", a homebrew French tabletop RPG.
Vue 3 + Vite + TypeScript + Firebase (Auth/Firestore).

Mid-migration from a single-file HTML prototype (`legacy-reference/index.html`)
to this app — see [MIGRATION_BACKLOG.md](MIGRATION_BACKLOG.md) for what's left
to port, and [CLAUDE.md](CLAUDE.md) for the conventions this codebase follows.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow and
[SECURITY.md](SECURITY.md) for responsible vulnerability reporting.

## Setup

1. **Node version**: pinned via `.node-version`. Install [fnm](https://github.com/Schniz/fnm)
   (or nvm) and run `fnm use` (or `fnm install` first if you don't have that
   version yet) from the repo root. This project is intended for Node 22.18+
   or 24.12+, and newer Firebase CLI/admin tooling is intentionally kept on the
   supported branch; Node 26 currently triggers `EBADENGINE` warnings from a
   transitive dependency (`superstatic`).
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

## Firebase tooling update

The project was updated to a newer Firebase admin/CLI line after the audit report
showed transitive vulnerabilities in older dependency chains. The app keeps the
runtime dependency on `firebase` for the browser SDK, while the tooling packages
used for admin scripts and local emulation were bumped to the supported versions in
[package.json](package.json): `firebase-admin` and `firebase-tools`.

If you work on the admin scripts in `scripts/`, keep your local Node version inside
one of the supported ranges declared in the repo (`22.18+` or `24.12+`).

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
npm run test:unit:coverage   # Vitest with a coverage report (text + html in coverage/)
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

## Recommended editor setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar).
Vue.js devtools browser extension is useful for inspecting component state.
