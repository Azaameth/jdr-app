# jdr-app

Campaign manager for "La Tour des Sorciers", a homebrew French tabletop RPG.
Vue 3 + Vite + TypeScript + Firebase (Auth/Firestore).

Mid-migration from a single-file HTML prototype (`legacy-reference/index.html`)
to this app — see [MIGRATION_BACKLOG.md](MIGRATION_BACKLOG.md) for what's left
to port, [MULTI_CAMPAIGN_ROADMAP.md](MULTI_CAMPAIGN_ROADMAP.md) for the larger
architecture work needed to support multiple independent campaigns, and
[CLAUDE.md](CLAUDE.md) for the conventions this codebase follows.

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

`./scripts/dev.sh {start|stop|restart|status}` and `./scripts/dashboard.sh
{start|stop|restart|status}` run the dev server / spec-kitty dashboard as
tracked background processes instead of tying up a terminal — useful over
SSH. Both clean up fully on `stop` (no orphaned processes left holding a
port); `DEV_PORT=`/`DASHBOARD_PORT=` override the defaults (5173 / 4173).

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
on pushes to `dev`/`main`. `.github/workflows/deploy.yml` separately builds
and deploys to GitHub Pages on push to `main`.

## Working with spec-kitty

This project uses [spec-kitty](https://github.com/Priivacy-ai/spec-kitty) to
track non-trivial feature work as governed missions instead of ad-hoc
changes. `.kittify/charter/charter.md` has the project-specific charter
(testing standards, quality gates, branch strategy); `kitty-specs/<mission>/`
holds each mission's spec/plan/tasks/analysis once one exists.

Typical flow for a new mission (see `MIGRATION_BACKLOG.md` for candidates):

1. `/spec-kitty.specify` — scaffold `spec.md` for the feature
2. `/spec-kitty.plan` — scaffold `plan.md` (technical approach, charter compliance)
3. `/spec-kitty.tasks` — break into work packages (`wps.yaml`, `tasks/WP*.md`)
4. `/spec-kitty.analyze` — cross-check spec/plan/tasks against the charter
   before implementation starts; **this gate is enforced** — `spec-kitty agent
   action implement` refuses to start (`analysis_report_required`) without a
   recorded analysis. Do this for real; it's caught real gaps before (e.g. a
   charter-mandated e2e test the task list had missed).
5. `spec-kitty agent action implement WP01 --agent <name>` — claims the work
   package, gives you a worktree at `.worktrees/<mission>-lane-a` on its own
   branch, and the full task prompt.
6. `spec-kitty agent action review WP01 --agent <name>` → `spec-kitty agent
   tasks move-task WP01 --to approved --mission <slug> --note "..."` once
   implementation passes review.
7. `spec-kitty accept --mission <slug>` → `spec-kitty merge --mission <slug>`
   → `spec-kitty review --mission <slug>` to land the mission's branch into
   `dev` and run the post-merge dead-code/issue-matrix checks.

Things that aren't obvious from the CLI's own help text:

- **Git worktrees don't share gitignored files.** `.env.local` and
  `scripts/keys/serviceAccountKey.json` won't exist in a mission's worktree —
  copy them over, or point admin scripts at the main checkout's copy via
  `SERVICE_ACCOUNT=<path> node scripts/...`.
- **`spec-kitty next` can misbehave when driven ad-hoc** (state appearing to
  cycle backward through phases) rather than through a full agent session.
  If that happens, don't panic-fix it — check `kitty-specs/<slug>/status.events.jsonl`
  directly; the underlying event log is usually fine even when the CLI's
  reported state looks wrong. Prefer the explicit `spec-kitty agent action
  implement`/`review` commands over `spec-kitty next` for manual driving.
- **The built-in `software-dev` mission type's path conventions
  (`tests/`, `contracts/`, `docs/`) don't match this repo's actual layout**
  (`e2e/` + colocated `src/**/__tests__/`, no contracts/docs folders).
  `spec-kitty accept` will flag this every time — that's expected; rerun with
  `--allow-fail` to get past it. Fixing it properly means forking spec-kitty's
  entire built-in mission-type directory (a versioned state machine + DAG,
  not just config), which isn't worth the upgrade-drift risk for a cosmetic
  check.
- **Interactive interview commands** (`spec-kitty charter interview`, etc.)
  can't be driven non-interactively. For charter/spec/plan authoring, either
  drive them for real in an interactive session, or scaffold with `--defaults`
  and hand-edit — the latter is what produced the current charter and the
  faction-caste-browser mission's artifacts.
- **`spec-kitty review` in post-merge mode requires `issue-matrix.md`**
  (a one-table-row-per-known-issue file, schema in
  `specify_cli/cli/commands/review/_issue_matrix.py` if you need the exact
  column/verdict vocabulary). Nothing in the implement/review prompts tells
  you this up front — it's only surfaced as `MISSION_REVIEW_ISSUE_MATRIX_MISSING`
  the first time you run `spec-kitty review` post-merge. Hit this on both
  missions run so far (once with Claude, once with Copilot as the agent), so
  it's a real recurring gap, not a one-off. Write it once you have real
  findings to record — an empty/placeholder table also satisfies the schema
  if there's nothing to log.

## Known follow-ups

Not migration gaps (see MIGRATION_BACKLOG.md for those) — things flagged
during a 2026-07-12 best-practices pass that are deliberately not yet acted
on:

- **Firestore security rules are written but not deployed.** `firestore.rules`
  (+ `firebase.json`/`.firebaserc`) exist in the repo and fix a real hole in
  the previous Console-only rules (any signed-in user could write any
  document, including granting themselves admin via their own `users/{uid}`
  doc). Publishing them needs a human decision — see the commit `security:
  add version-controlled Firestore rules` for the full writeup, and consider
  testing via the Firebase Console's Rules Playground before publishing.
- **`character.lore.notesPrivate` and `membership.personalNote`** sit on
  documents every campaign member can otherwise legitimately read. Firestore
  rules can't hide a single field within a document — real privacy needs
  those moved to a separate owner/mj-only document (subcollection).
- **`src/firebase/testConnection.ts`** (`testFirebaseConnection`, writes to a
  `healthcheck` collection) is unreferenced anywhere in `src/` — dead code,
  same category as the `HomeView`/`AppShell` cleanup already done.
- **`spec-kitty retrospect summary` reports 0 missions** despite both completed
  missions (`faction-caste-browser-01KXBRY3`, `wire-up-the-dice-roller-01KXDN1H`)
  having well-formed `retrospective.yaml` files on disk. Looks like a cross-mission
  indexing gap in spec-kitty itself, not something wrong in this project's data —
  noted here in case it's still unresolved by the time someone next reaches for
  that command; hasn't been investigated further.

## Recommended editor setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar).
Vue.js devtools browser extension is useful for inspecting component state.
