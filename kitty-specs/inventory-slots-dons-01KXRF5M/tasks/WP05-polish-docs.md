---
work_package_id: WP05
title: E2E smoke, docs, final gates
dependencies:
- WP04
requirement_refs:
- FR-002
- FR-006
tracker_refs: []
planning_base_branch: feat/inventory-slots-dons
merge_target_branch: feat/inventory-slots-dons
branch_strategy: Planning artifacts for this mission were generated on feat/inventory-slots-dons. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/inventory-slots-dons unless the human explicitly redirects the landing branch.
subtasks:
- T022
- T023
- T024
agent: "claude"
shell_pid: "61550"
history:
- 2026-07-17T16:47:51Z — created by /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: MIGRATION_BACKLOG.md
create_intent:
- e2e/inventory.spec.ts
execution_mode: code_change
model: claude-sonnet-5
owned_files:
- MIGRATION_BACKLOG.md
- NEXTSTEPS.md
role: implementer
tags: []
---

# WP05 — E2E smoke, docs, final gates

## ⚡ Do This First: Load Agent Profile

Before reading further, load your assigned agent profile:

```
/ad-hoc-profile-load implementer-ivan
```

Adopt its identity, boundaries, and initialization declaration, then return here.

## Objective

Close the mission surface: Playwright smoke coverage for the new sections, documentation/ledger updates, and a final full-gate verification including the no-secrets build.

## Context

- Existing e2e style: `e2e/` specs run against the preview server without Firebase secrets (see the repo's existing specs and `playwright.config` — reuseExistingServer is configured; recent commits fixed heading assertions, so anchor selectors on stable French headings/labels).
- Without Firebase, PlayerView renders in degraded read-only mode — the smoke test asserts structure, not seeded data.
- Docs to update are owned here: `MIGRATION_BACKLOG.md` (move item 1 to "Already covered", pointing at the mission slug and new components) and `NEXTSTEPS.md` (mark this mission's ledger section done/merged per its own convention of deleting completed sections; also update the "Typed inventory schema" locked-contract note to point at the now-real `src/models/types/Inventory.ts`).

Branch strategy: base/target `feat/inventory-slots-dons`; run `spec-kitty agent action implement WP05 --agent claude`, work in the reported lane worktree (copy `.env`, `npm install`, `npx playwright install` on first run).

## Subtasks

### T022 — `e2e/inventory.spec.ts`

Smoke: navigate to a character page (follow the existing e2e auth/degraded-mode approach used by current specs). Assert: the armes/armures section headings render with ≥3 slots each; the backpack renders all 10 category headings ("Nourriture", "Munitions", "Matériel de bivouac & camp", …); the dons section heading renders. Keep selectors on headings/roles, not CSS classes.

### T023 — Docs updates

1. `MIGRATION_BACKLOG.md`: move item 1 into "Already covered" with the mission slug (`inventory-slots-dons-01KXRF5M`) and component pointers; renumber/adjust item 2's dependency note (its Inventaire-tab prerequisite is now met).
2. `NEXTSTEPS.md`: per its header convention, delete/close this mission's increment section; update the "Typed inventory schema" locked-contract entry to state it is implemented (`src/models/types/Inventory.ts`) so future specs cite code, not prose.

### T024 — Final gate sweep

`npm run type-check && npm run lint && npm run test:unit && npm run test:e2e`, plus a no-secrets `npm run build` and preview check of the character page (zero console errors). Report each result explicitly — no asserting success without output.

## Definition of Done

- [ ] E2E smoke green in CI conditions (no Firebase secrets).
- [ ] Backlog and ledger reflect reality; no stale "not yet ported" claims about this feature.
- [ ] All gates green, reported with real output.

## Reviewer Guidance

- Run the e2e spec twice to catch selector flakiness before approving.
- Check the backlog edit doesn't overstate scope (Vitruve interactive layer is still item 2 — only the inventory/dons prerequisite moved).

## Activity Log

- 2026-07-17T22:11:05Z – claude – shell_pid=54192 – Assigned agent via action command
- 2026-07-17T22:39:35Z – claude – shell_pid=54192 – Ready for review: e2e/inventory.spec.ts added (guard-redirect smoke, zero console errors, run twice clean); MIGRATION_BACKLOG.md item 1 moved to Already covered citing inventory-slots-dons-01KXRF5M; NEXTSTEPS.md Typed inventory schema entry now points to src/models/types/Inventory.ts. All gates green: type-check, lint, 197 unit tests, e2e (3/3 chromium, no-secrets build verified separately with zero console errors on the character route).
- 2026-07-17T22:40:32Z – claude – shell_pid=61550 – Started review via action command
- 2026-07-17T22:45:14Z – user – shell_pid=61550 – Review passed: T022 deviation ruled correct — requiresAuth guard on the player route (src/router/index.ts:72-91) makes unauthenticated PlayerView content unreachable e2e (verified: no auth fixture exists, ci.yml documents redirect-only e2e, castes.spec.ts precedent); guard-redirect smoke with zero console/page error assertion is the right scope for a WP owning only the e2e spec + two docs, and the structural headings T022 named are asserted at unit level (BackpackGrid.spec.ts all 10 categories, WeaponArmorList.spec.ts min-3-slot padding, PlayerView.spec.ts section lookups). Docs accurate: backlog item moved to Already covered citing the mission slug without overstating Vitruve scope; NEXTSTEPS locked-contract entry now cites src/models/types/Inventory.ts (verified the duplicate Character.ts InventoryItem is really gone). Gates re-run by reviewer in worktree under CI/no-secrets conditions: type-check clean, lint clean (no autofix diffs), 197/197 unit, no-secrets build + 3/3 e2e chromium, inventory.spec.ts run twice with no flakes. Follow-ups (non-blocking): (1) no test asserts the literal Dons h2 heading (PlayerView.vue:580) so the e2e comment slightly overstates PlayerView.spec.ts coverage; (2) legacy-reference/README.md:21 still lists the feature under Known unported features (pre-existing pattern, file defers to backlog); (3) an e2e auth fixture would unlock real content-level smoke for player/castes routes.
