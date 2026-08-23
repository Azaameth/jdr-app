# AGENTS.md

jdr-app: campaign manager for "La Tour des Sorciers", a homebrew French
tabletop RPG. Vue 3 + Vite + TypeScript + Firebase (Auth/Firestore).

This is a thin, tool-agnostic entry point for AI coding agents other than
Claude Code. **`CLAUDE.md` is the canonical, actively-maintained conventions
file** — read it for the full picture (store/repository patterns, live
subscriptions, role-based access, migration context, high-complexity spec
policy). This file only exists because AGENTS.md is what non-Claude-Code
tools read; keep it short rather than re-explaining everything CLAUDE.md
already covers, to avoid the two drifting apart.

## Setup

- Node version pinned via `.node-version` (fnm/nvm-compatible).
- `npm install`, then copy `.env.local.example` to `.env.local` for Firebase
  config (optional — every repository no-ops when Firebase isn't configured).

## Commands

```sh
npm run dev          # dev server
npm run build         # type-check + production build
npm run test:unit      # Vitest
npm run test:e2e       # Playwright
npm run lint           # oxlint + eslint, both with --fix
npm run type-check     # vue-tsc --build
```

## Non-negotiable conventions (see CLAUDE.md for the full rationale)

- Stores (`src/controllers/use*Store.ts`) and repositories
  (`src/models/repositories/*Repository.ts`) follow existing patterns in the
  codebase — don't introduce Pinia, classes, or a new state-management
  approach. See `docs/decisions/` before revisiting a settled architectural
  choice.
- User-facing strings are French.
- `main` is the sole long-lived branch; use short-lived per-mission branches.
- Check `MIGRATION_BACKLOG.md` before starting new feature work ported from
  `legacy-reference/index.html`.
