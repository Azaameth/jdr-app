---
work_package_id: WP05
title: État du groupe & dés d'aventure
dependencies:
- WP04
requirement_refs:
- FR-009
- FR-010
- FR-017
tracker_refs: []
planning_base_branch: feat/vitruve-character-sheet
merge_target_branch: feat/vitruve-character-sheet
branch_strategy: Planning artifacts for this mission were generated on feat/vitruve-character-sheet. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/vitruve-character-sheet unless the human explicitly redirects the landing branch.
subtasks:
- T023
- T024
- T025
- T026
agent: claude
history:
- 2026-07-18T07:12:04Z — created by /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: src/components/vitruve/
create_intent:
- src/components/vitruve/PartyStatus.vue
- src/components/vitruve/AdventureDiceBox.vue
execution_mode: code_change
model: claude-sonnet-5
owned_files:
- src/components/vitruve/PartyStatus.vue
- src/components/vitruve/AdventureDiceBox.vue
- src/components/vitruve/__tests__/PartyStatus.spec.ts
- src/components/vitruve/__tests__/AdventureDiceBox.spec.ts
role: implementer
tags: []
---

# WP05 — État du groupe & dés d'aventure

## ⚡ Do This First: Load Agent Profile

Before reading further, load your assigned agent profile:

```
/ad-hoc-profile-load frontend-freddy
```

Adopt its identity, boundaries, and initialization declaration, then return here.

## Objective

The two live widgets of the left sheet: **"État du groupe"** — a real-time PV/Mana list of every approved party character (children excluded) — and **"Dés d'Aventure"** — the shared campaign Aventure/Mésaventure counters, adjustable by MJ/admin only. This WP exercises the WP01 real-time plumbing (`subscribeParty`, `useCampaignSessionStore`) in the UI for the first time; listener lifecycle correctness is the main risk.

## Context

- `usePlayerStore()` (WP01) provides `subscribeParty(campaignId)` / `unsubscribeParty()` and the `party` computed (approved participants joined with characters, `parentCharacterId` holders excluded — I-C2).
- `useCampaignSessionStore()` (WP01) provides `adventureDice` (defaults `{aventure: 0, mesaveture: 0}`? **No** — `{aventure: 0, mesaventure: 0}`, watch the spelling everywhere: `mesaventure`), `subscribe/unsubscribe`, `adjust(die, delta)`.
- Legacy visuals (behavior reference ~l.917–933): "État du groupe" card lists members with small PV/Mana readouts; "Dés d'Aventure" card shows a dice row plus "Aventure : N" (green) and "Mésaventure : N" (red) footer. Reproduce the information, style idiomatically.
- Role gating: `useAuthStore().isMj` / `isAdmin` — same computeds `PlayerView.vue` already uses.
- NFR-003: with `!db`, subscriptions no-op (never call back) — both widgets must render sensibly from initial/default state with zero errors.

## Subtasks

### T023 — `PartyStatus.vue`

**File**: `src/components/vitruve/PartyStatus.vue` (new)

Card titled "État du groupe" (FR-009). Consumes `usePlayerStore().party` directly (singleton — no props needed for data; keep a `highlightCharacterId?: string` prop to visually mark the currently viewed character). Each row: character name, PV `current/max` with a thin bar (fraction-filled, red-tinted when ≤ 25%), Mana `current/max` with a blue/violet bar. Empty state (no approved participants or `!db`): French italic note "Aucun personnage dans le groupe." — never a blank card.

### T024 — `AdventureDiceBox.vue`

**File**: `src/components/vitruve/AdventureDiceBox.vue` (new)

Card titled "Dés d'Aventure" (FR-010). Consumes `useCampaignSessionStore()`. Rows: "Aventure : N" (green accent) and "Mésaventure : N" (red accent). When `canAdjust` prop is true (view passes `isMj || isAdmin`): − / + buttons per counter calling `adjust('aventure' | 'mesaventure', ±1)`; store already clamps ≥ 0 — additionally disable − at 0. Missing doc renders 0 / 0 (store default). Non-MJ: read-only, no buttons rendered at all (not merely disabled).

### T025 — Integration + listener lifecycle

Small `PlayerView.vue` integration edit (out-of-map, record the rationale line):
1. Mount both components in the `widgets` slot below the WP04 widgets, matching legacy order (calculateur → avantages → état du groupe → dés d'aventure).
2. Lifecycle: on view mount / `campaignId` change, call `subscribeParty(campaignId)` and `campaignSessionStore.subscribe(campaignId)`; on unmount (`onUnmounted`) call both unsubscribes. Re-navigation between characters of the same campaign must not re-stack listeners (WP01 made attach idempotent — verify, don't assume).
3. Pass `highlightCharacterId={characterId}` and `canAdjust={isMj || isAdmin}`.

### T026 — Tests

1. `PartyStatus.spec.ts`: with a mocked store module — renders rows from `party`; excludes nothing itself (exclusion is store-side, but assert the component renders exactly what `party` provides); low-PV row gets the warning class; empty state text.
2. `AdventureDiceBox.spec.ts`: renders counters; buttons absent when `canAdjust` false; `adjust` called with correct args; − disabled at 0; defaults render 0/0.
3. Store-level exclusion (children never in `party`) was unit-tested in WP01 — extend that test if fixtures now exist for Furmiaou (seeded parent/child pair) to lock FR-017 at the data layer.

## Branch Strategy

Planning base: `feat/vitruve-character-sheet`. Merge target: `feat/vitruve-character-sheet` (→ `main` via PR at mission end). Single-lane; worktree from `lanes.json`. Implement with:

```
spec-kitty agent action implement WP05 --agent claude
```

## Definition of Done

- [ ] Both widgets mounted in legacy order in the left sheet
- [ ] Party list live-updates (manual check with two sessions or emulated snapshot), children excluded, highlight + low-PV states work
- [ ] Dice box: MJ sees ± (clamped at 0), players see read-only counters, missing doc shows 0/0
- [ ] Listeners attach once per campaign and detach on unmount — no leak on character navigation (verify via repeated route changes + listener count assertion in store test)
- [ ] `!db` demo build renders both widgets with defaults, zero console errors
- [ ] `npm run type-check && npm run lint && npm run test:unit` green

## Reviewer Guidance

- The listener lifecycle is the review focus: trace mount/unmount/param-change paths in `PlayerView.vue` and confirm unsubscribe happens on every exit path.
- Check the `mesaventure` spelling in every identifier and string — a typo here becomes a silent Firestore field fork.
- Confirm buttons are *absent* (not disabled) for non-MJ — spec FR-010 says read-only for other roles.
- Verify no direct Firestore imports leaked into the components (data flows only through stores).
