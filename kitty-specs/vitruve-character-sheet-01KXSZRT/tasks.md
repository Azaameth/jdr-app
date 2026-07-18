# Tasks: Vitruve Character Sheet Layout

**Mission**: `vitruve-character-sheet-01KXSZRT`
**Branch**: `feat/vitruve-character-sheet` (planning base and merge target; lands in `main` via PR)
**Generated**: 2026-07-18T07:12:04Z
**Inputs**: spec.md, plan.md, research.md, data-model.md, contracts/session-state-api.md, quickstart.md

Delivery shape (decision `01KXT0MDBTHK7AMPR1T7SC17KZ`): **six sequential work packages** on a single lane, 1:1 with the spec's Suggested Delivery Clusters. Each WP must be green (type-check, lint, unit; e2e where noted) before the next starts. `NEXTSTEPS.md` is the increment ledger (C-006).

## Subtask Index

*Reference table only — progress is tracked via the per-WP checkbox lists below. `[P]` marks file-level parallel-safe subtasks within a WP.*

| ID | Description | WP | Parallel |
|----|-------------|----|----------|
| T001 | Extend Character/Participant types; add CampaignSession type module | WP01 | |
| T002 | ParticipantRepository: subscribe + session/childSessions writes | WP01 | |
| T003 | CharacterRepository: listChildrenOf + updateCharacter write | WP01 | [P] |
| T004 | CampaignSessionRepository (new): get/subscribe/adjustAdventureDice | WP01 | [P] |
| T005 | usePlayerStore extensions: injuries, toggles, childSessions, party subscription | WP01 | |
| T006 | useCampaignSessionStore (new) | WP01 | [P] |
| T007 | firestore.rules: campaignSessions + session/childSessions/backstory write scopes | WP01 | [P] |
| T008 | Seeds (Furmiaou child), unit tests for fallbacks/mutations, CLAUDE.md subscribe-pattern note | WP01 | |
| T009 | VitruveSheet.vue left-column shell (header, vitals pills, portrait) | WP02 | |
| T010 | Restructure PlayerView.vue into two-column layout + tab host | WP02 | |
| T011 | Relocate Dons & Inventaire into tabs unchanged | WP02 | |
| T012 | Responsive stacking + French labels per legacy wording | WP02 | |
| T013 | Test/selector updates; existing e2e green | WP02 | |
| T014 | FicheTab.vue: identity cards, valeurs pills, histoire | WP03 | [P] |
| T015 | Histoire editing (owner/MJ) persisted | WP03 | |
| T016 | CaracTab.vue: category blocks + injury squares (persisted cycle) | WP03 | |
| T017 | Compétences & bonus/malus checkbox lists + shared tick-state module | WP03 | |
| T018 | Summary cards + posture placement; tab unit tests | WP03 | |
| T019 | jetFormula.ts pure module + NFR-005 state-space unit tests | WP04 | [P] |
| T020 | JetCalculator.vue display component | WP04 | |
| T021 | AdvantageToggles.vue persisted toggles | WP04 | [P] |
| T022 | Calculator wiring: ticks, injuries, context, reset; component tests | WP04 | |
| T023 | PartyStatus.vue live party list (children excluded) | WP05 | [P] |
| T024 | AdventureDiceBox.vue counters + MJ ± | WP05 | [P] |
| T025 | Left-column integration + listener lifecycle | WP05 | |
| T026 | Tests: exclusion, defaults, role gating | WP05 | |
| T027 | ChildSheetTab.vue mini-sheet with childSessions vitals | WP06 | |
| T028 | Child-tab integration + calculator context switch | WP06 | |
| T029 | RawCharacterEditor.vue (MJ-only, validated atomic write) | WP06 | [P] |
| T030 | Vitruve smoke e2e spec | WP06 | [P] |
| T031 | Final sweep: full CI, NEXTSTEPS.md closure, docs sync | WP06 | |

## Phase 1 — Foundation

### WP01 — Contract: types, data access, rules, seeds

**Prompt**: `tasks/WP01-contract-data-access.md` (~520 lines) · **Priority**: P1 · **Dependencies**: none

**Goal**: Materialize the locked Schema Contract end-to-end with zero UI change: extended types, repository functions (including the codebase's first `onSnapshot` subscribe pattern), store extensions, Firestore rules, and seed data. App renders exactly as before when done.

**Independent test**: `npm run type-check && npm run lint && npm run test:unit` pass; new repository/store functions covered by unit tests including `!db` fallbacks; `git diff` shows no component/view changes.

- [x] T001 Extend Character/Participant types; add CampaignSession type module (WP01)
- [x] T002 ParticipantRepository: subscribe + session/childSessions writes (WP01)
- [x] T003 CharacterRepository: listChildrenOf + updateCharacter write (WP01)
- [x] T004 CampaignSessionRepository: get/subscribe/adjustAdventureDice (WP01)
- [x] T005 usePlayerStore extensions (WP01)
- [x] T006 useCampaignSessionStore (WP01)
- [x] T007 firestore.rules updates (WP01)
- [x] T008 Seeds, unit tests, CLAUDE.md note (WP01)

**Risks**: field-name drift vs locked contract (reviewer must diff against `contracts/session-state-api.md`); rules regressions on existing participant writes.

## Phase 2 — Layout

### WP02 — Vitruve layout skeleton & tab host

**Prompt**: `tasks/WP02-layout-skeleton.md` (~430 lines) · **Priority**: P1 · **Dependencies**: WP01

**Goal**: Restructure `src/views/PlayerView.vue` into the two-column vitruve layout with the right-panel tab bar, relocating the existing Dons/Inventaire features unchanged. Fiche/Carac tabs render placeholders.

**Independent test**: existing unit + e2e suites green; page shows left sheet (header, vitals, portrait) and tabs; Dons/Inventaire behave byte-for-byte as before (modals, permissions, read-only fallback).

- [x] T009 VitruveSheet.vue left-column shell (WP02)
- [x] T010 PlayerView two-column restructure + tab host (WP02)
- [x] T011 Relocate Dons & Inventaire tabs unchanged (WP02)
- [x] T012 Responsive stacking + legacy French labels (WP02)
- [x] T013 Test/selector updates; e2e green (WP02)

**Risks**: silent regression of inventory wiring (C-005) — the biggest non-regression surface of the mission; e2e selectors.

## Phase 3 — Tabs

### WP03 — Fiche & Caractéristiques tabs

**Prompt**: `tasks/WP03-fiche-carac-tabs.md` (~470 lines) · **Priority**: P1 · **Dependencies**: WP02

**Goal**: The two content tabs: identity (Fiche) with editable histoire, and Caractéristiques with persisted injury squares, compétences/race-modifier checkbox lists (shared ephemeral tick state), and posture placement.

**Independent test**: injury click cycles saine→jaune→rouge→saine, adjusts category % per formula, survives reload; ticks reset on character switch; histoire edit gated to owner/MJ.

- [x] T014 FicheTab.vue (WP03)
- [x] T015 Histoire editing persisted (WP03)
- [x] T016 CaracTab.vue category blocks + injury squares (WP03)
- [x] T017 Compétences/bonus checkbox lists + tick-state module (WP03)
- [x] T018 Summary cards + posture; tab unit tests (WP03)

**Risks**: category mapping fidelity (force/social/mental ↔ sub pairs); permission gating on histoire.

## Phase 4 — Calculator

### WP04 — Jet calculator & avantage/désavantage

**Prompt**: `tasks/WP04-jet-calculator.md` (~420 lines) · **Priority**: P1 · **Dependencies**: WP03

**Goal**: The display-only jet calculator as a pure formula module + UI, and the persisted Avantage/Désavantage toggles.

**Independent test**: NFR-005 unit tests cover the 9-combination injury space, pin-at-5 rule, clamp bounds, and modifier limits; UI never writes to Firestore; toggles persist and sync.

- [ ] T019 jetFormula.ts + state-space tests (WP04)
- [ ] T020 JetCalculator.vue (WP04)
- [ ] T021 AdvantageToggles.vue (WP04)
- [ ] T022 Wiring + reset behavior + component tests (WP04)

**Risks**: formula order of operations (adjust → sum → clamp); tick-state leakage across character switches.

## Phase 5 — Group widgets

### WP05 — État du groupe & dés d'aventure

**Prompt**: `tasks/WP05-group-widgets.md` (~380 lines) · **Priority**: P2 · **Dependencies**: WP04

**Goal**: The two live left-column widgets: real-time party PV/Mana list (children excluded) and the shared adventure-dice reminder with MJ-only ± controls.

**Independent test**: party list updates without reload when a session doc changes; missing `campaignSessions` doc renders 0/0; ± controls visible only to MJ/admin; listeners detach on unmount.

- [ ] T023 PartyStatus.vue (WP05)
- [ ] T024 AdventureDiceBox.vue (WP05)
- [ ] T025 Integration + listener lifecycle (WP05)
- [ ] T026 Tests: exclusion, defaults, gating (WP05)

**Risks**: listener leaks on route change; child exclusion requires participant↔character join.

## Phase 6 — Children & polish

### WP06 — Child characters, raw editor & final verification

**Prompt**: `tasks/WP06-child-characters-polish.md` (~500 lines) · **Priority**: P2 · **Dependencies**: WP05

**Goal**: Data-driven child-character tabs (Furmiaou seeded in WP01) with persisted child vitals and calculator context switch; MJ raw-data editor; smoke e2e; final CI sweep and ledger closure.

**Independent test**: quickstart.md walkthrough steps 5–7 pass; smoke e2e green on all configured browsers; full local CI green.

- [ ] T027 ChildSheetTab.vue mini-sheet (WP06)
- [ ] T028 Child-tab integration + calculator context (WP06)
- [ ] T029 RawCharacterEditor.vue (WP06)
- [ ] T030 Vitruve smoke e2e (WP06)
- [ ] T031 Final sweep + NEXTSTEPS.md closure (WP06)

**Risks**: reusing carac-block rendering without duplication; atomic validated raw-editor writes; webkit e2e flakiness (keep the spec browser-agnostic).

## Dependency graph

```
WP01 → WP02 → WP03 → WP04 → WP05 → WP06   (single lane, sequential by design)
```

Parallelization exists only *within* WPs (marked `[P]`); the lane structure is deliberately serial per the recorded delivery decision.
