---
work_package_id: WP06
title: Child characters, raw editor & final verification
dependencies:
- WP05
requirement_refs:
- FR-004
- FR-015
- FR-016
tracker_refs: []
planning_base_branch: feat/vitruve-character-sheet
merge_target_branch: feat/vitruve-character-sheet
branch_strategy: Planning artifacts for this mission were generated on feat/vitruve-character-sheet. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/vitruve-character-sheet unless the human explicitly redirects the landing branch.
subtasks:
- T027
- T028
- T029
- T030
- T031
agent: "claude:sonnet:reviewer-renata:reviewer"
shell_pid: "69063"
history:
- 2026-07-18T07:12:04Z — created by /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: src/components/vitruve/
create_intent:
- src/components/vitruve/ChildSheetTab.vue
- src/components/vitruve/RawCharacterEditor.vue
- e2e/vitruve.spec.ts
- src/components/vitruve/__tests__/ChildSheetTab.spec.ts
- src/components/vitruve/__tests__/RawCharacterEditor.spec.ts
execution_mode: code_change
model: claude-sonnet-5
owned_files:
- src/components/vitruve/ChildSheetTab.vue
- src/components/vitruve/RawCharacterEditor.vue
- src/components/vitruve/__tests__/ChildSheetTab.spec.ts
- src/components/vitruve/__tests__/RawCharacterEditor.spec.ts
- e2e/vitruve.spec.ts
- NEXTSTEPS.md
role: implementer
tags: []
---

# WP06 — Child characters, raw editor & final verification

## ⚡ Do This First: Load Agent Profile

Before reading further, load your assigned agent profile:

```
/ad-hoc-profile-load frontend-freddy
```

Adopt its identity, boundaries, and initialization declaration, then return here.

## Objective

Close the mission: data-driven **child-character tabs** (Furmiaou et al.) with persisted child vitals and the calculator following the active context; the MJ-only **raw data editor**; the **vitruve smoke e2e**; and the final verification sweep with `NEXTSTEPS.md` ledger closure.

## Context

- Children: full `CharacterProfile` docs with `parentCharacterId` (WP01 seeded Furmiaou under Firm). Fetch via `listChildrenOf(campaignId, characterId)`. Child volatile state lives in the **parent participant's** `childSessions[childId]` (write via `usePlayerStore().setChildVitals`). Children have no participant docs and never appear in rosters (FR-017 — already enforced store-side).
- Legacy behavior reference (`buildFurmHTML`, ~l.3496): child pane shows portrait banner, PV card with ± and "PV / max", Mana card (0/0 renders "Aucune magie"), element badges, then the three carac blocks with the child's own injury-state squares. Child injuries: **this mission persists child injuries inside `childSessions[childId].injuries`** — same shape as the parent's.
- Calculator context (FR-016): when a child tab is active, the calculator must receive the **child's** `attributes` + `childSessions[childId].injuries`, and `contextKey` must change (WP04 designed for this) so manual mod and ticks reset. Leaving the child tab restores parent context.
- Raw editor (FR-004): MJ/admin only. Legacy showed a JSON textarea of the whole character (`editRawChar`, ~l.2634). Modernize minimally: modal (`AppModal.vue` exists) with a JSON textarea prefilled from the current `CharacterProfile`; on save, `JSON.parse` → on failure show French error ("JSON invalide — aucune modification enregistrée.") and write **nothing**; on success strip `id`/`campaignId` (immutable) and `updateCharacter(id, parsed)`. This is also the only UI for creating/editing children's identity in this mission (assumption in spec — no dedicated child-creation UI).

## Subtasks

### T027 — `ChildSheetTab.vue`

**File**: `src/components/vitruve/ChildSheetTab.vue` (new)

Props: `child: CharacterProfile`, `childSession: CharacterSessionState | null`, `canEdit: boolean`. Emits: `adjust-hp(delta)`, `set-injury(attr, state)`.

Render (FR-015): header "«name» — Forme" styled per legacy's green-tinted variant; portrait banner (img or fallback); PV card with ± (uses `childSession.hp/maxHp`, falls back to the child profile's seeded max when session entry doesn't exist yet — display seeded values, first ± creates the entry); Mana card — when `maxMana === 0` show "Aucune magie" italic note (I-C3); element badges; three carac category blocks with injury squares. **Reuse the category-block rendering from `CaracTab.vue`** — if extraction into a shared subcomponent is needed, extract `CaracCategoryBlock.vue` *within* `CaracTab.vue`'s file family and record the out-of-map edit rationale (preferred: WP03 already structured it; check before duplicating anything).

### T028 — Child-tab integration + calculator context

`PlayerView.vue` integration edits (out-of-map, record rationale):
1. On character load, `listChildrenOf(campaignId, characterId)` → `children` ref. Tab bar appends one tab per child, labeled with the child's name (FR-011). No children ⇒ no extra tabs (SC-004).
2. `activeTab` values for children: the child's characterId. If `activeTab` references a child that no longer exists after a character switch, fall back to `'fiche'` (edge case in spec).
3. Active-context computed: `{ attributes, injuries, contextKey }` — parent's when a base tab is active, child's when a child tab is active. Feed `JetCalculator` from this computed (FR-016). Call `useTickState().reset()` on context change (extend the existing watcher).
4. Wire `ChildSheetTab` emits: `adjust-hp` → `setChildVitals(parentCharacterId, childId, { hp: next })`; `set-injury` → `setChildVitals(…, { injuries: nextMap })` (same replace-map semantics as the parent path).

### T029 — `RawCharacterEditor.vue`

**File**: `src/components/vitruve/RawCharacterEditor.vue` (new)

Props: `character: CharacterProfile`, `open: boolean`. Emits: `close`, `saved`. Uses `AppModal.vue`. Content: monospace textarea prefilled with `JSON.stringify(character, null, 2)`; Enregistrer / Annuler. Save flow per Context above — atomic: parse-validate fully before any write; French error on invalid JSON shown inside the modal; on success emit `saved` so the view refreshes the character (and children, in case `parentCharacterId` data changed). Trigger button "Éditer les données brutes" rendered in `VitruveSheet`'s widgets slot area **only** for `isMj || isAdmin` (integration edit, recorded).

Tests (`RawCharacterEditor.spec.ts`): invalid JSON → error shown, no `updateCharacter` call; valid JSON → called without `id`/`campaignId`; cancel writes nothing.

### T030 — Vitruve smoke e2e

**File**: `e2e/vitruve.spec.ts` (new)

Browser-agnostic (must pass on all projects configured in `playwright.config.ts` — the project has known webkit sensitivity; avoid hover-dependent and timing-tight assertions). Follow the structure/auth approach of `e2e/inventory.spec.ts` (read it first — it solved the same "no Firebase in CI" problem; mirror its route/fixture strategy):
1. Character page renders the two-column layout (left sheet heading + tab bar visible).
2. Tabs switch: click Caractéristiques → carac pane visible; click Dons → dons content; click Inventaire → backpack categories visible (reuses the selectors inventory e2e relies on).
3. Calculator card present with a total in the 5–95 range.
Keep it a smoke test — no write assertions (decision 01KXT0MF6T7BFAY5M3CZYWDBS9).

### T031 — Final sweep + ledger

1. Run the full gate locally: `npm run type-check && npm run lint && npm run test:unit && npm run test:e2e && npm run build` — all green (SC-005; build required by charter Quality Gates).
2. Walk quickstart.md steps 1–7 manually against the dev server; fix anything that fails before calling this done.
3. `NEXTSTEPS.md`: mark all six clusters done with a one-line status each; note the two known follow-ups explicitly (firestore.rules deployment; full Dés d'Aventure feature still unported).
4. Confirm CLAUDE.md subscribe-pattern note (WP01) still matches the implemented reality; adjust wording if the implementation diverged (DIR-002).

## Branch Strategy

Planning base: `feat/vitruve-character-sheet`. Merge target: `feat/vitruve-character-sheet` (→ `main` via PR at mission end). Single-lane; worktree from `lanes.json`. Implement with:

```
spec-kitty agent action implement WP06 --agent claude
```

## Definition of Done

- [ ] Firm shows a Furmiaou tab (seeded data); other characters show exactly four tabs (SC-004)
- [ ] Child PV ± persists under `childSessions` and survives reload; "Aucune magie" for 0-max mana
- [ ] Calculator follows the active tab context and resets on switch (FR-016)
- [ ] Raw editor: MJ-only, atomic, French invalid-JSON error, id/campaignId never written
- [ ] `e2e/vitruve.spec.ts` green on all configured browsers
- [ ] Full gate green: type-check, lint, unit, e2e, build
- [ ] NEXTSTEPS.md ledger closed; docs in sync

## Reviewer Guidance

- FR-016 is the subtle one: verify by reading the active-context computed that a child tab feeds child attributes *and* child injuries — a half-switched context (child attributes, parent injuries) computes plausible-looking wrong totals.
- Check the child-session bootstrap: first ± on a child with no `childSessions` entry must create a sane full entry, not write `{hp: NaN}`.
- Raw editor: attempt a payload containing `"id": "other-doc"` and `"role"`-like junk — confirm stripping/ignoring; this is an MJ-trust surface but shouldn't corrupt doc identity.
- e2e: run it 3× locally on webkit before approving (known flake surface).
- NEXTSTEPS.md must reflect reality — reject a "all done" ledger if any gate step was skipped.

## Activity Log

- 2026-07-18T12:25:18Z – claude:sonnet:frontend-freddy:implementer – shell_pid=47651 – Assigned agent via action command
- 2026-07-18T12:47:06Z – claude:sonnet:frontend-freddy:implementer – shell_pid=47651 – Ready for review: T027-T031 implemented. ChildSheetTab.vue (child mini-sheet, extracted CaracCategoryBlock.vue reused from CaracTab), RawCharacterEditor.vue (MJ-only atomic JSON editor), PlayerView.vue integration (child tabs, active-context switch for calculator FR-016, stale-tab fallback, raw-editor trigger), e2e/vitruve.spec.ts smoke, NEXTSTEPS.md ledger closed. Full local gate green: type-check, lint, 376 unit tests, build, e2e chromium 5/5 (vitruve spec re-run 3x clean). Webkit CI-only per known environment gotcha. Out-of-map edits (sanctioned, documented in code comments): CaracCategoryBlock.vue extraction touching CaracTab.vue; PlayerView.vue + PlayerView.spec.ts integration edits.
- 2026-07-18T12:47:43Z – claude:sonnet:reviewer-renata:reviewer – shell_pid=53685 – Started review via action command
- 2026-07-18T16:29:32Z – user – shell_pid=53685 – Moved to planned
- 2026-07-18T16:30:49Z – claude:sonnet:frontend-freddy:implementer – shell_pid=68088 – Started implementation via action command
- 2026-07-18T16:33:31Z – claude:sonnet:frontend-freddy:implementer – shell_pid=68088 – Cycle 2: FR-016 test coverage added per review feedback; all suites green
- 2026-07-18T16:34:04Z – claude:sonnet:reviewer-renata:reviewer – shell_pid=69063 – Started review via action command
- 2026-07-18T16:35:53Z – user – shell_pid=69063 – Review passed (cycle 2): FR-016 coverage added; new test mounts PlayerView, gives Furmiaou genuinely distinct attributes/injuries from the parent fixture, and asserts JetCalculator's attributes/injuries/contextKey props switch atomically to the child's on tab activation (with explicit .not.toEqual guards) and restore on switching back. Fix commit 66170f4 is test-only (59 lines, PlayerView.spec.ts only); type-check, lint, and unit (377/377) all green; production files unchanged since 706665d. Cycle-1 rejection (review-cycle-1.md) is superseded — this override records the cycle-2 approval.
