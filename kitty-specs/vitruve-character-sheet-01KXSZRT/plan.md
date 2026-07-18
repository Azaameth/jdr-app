# Implementation Plan: Vitruve Character Sheet Layout

**Branch**: `feat/vitruve-character-sheet` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `kitty-specs/vitruve-character-sheet-01KXSZRT/spec.md`

## Summary

Restructure the character page (`src/views/PlayerView.vue`) into the legacy "vitruve" two-column layout: a left sheet (identity header, PV/Mana steppers, portrait, display-only jet calculator, avantage/désavantage toggles, live "État du groupe", "Dés d'Aventure" reminder, MJ raw editor) and a right tabbed panel (Fiche, Caractéristiques, Dons, Inventaire, plus one tab per child character). The existing Dons/Inventaire components are reused unchanged. Two deliberate upgrades over legacy: injury states and toggles are persisted + synced in real time, and the hardcoded Furmiaou tab becomes a data-driven child-character relationship. The spec's Schema Contract is locked; delivery is six sequential work-package clusters on a single lane (decision 01KXT0MDBTHK7AMPR1T7SC17KZ).

## Technical Context

**Language/Version**: TypeScript 5.x, Vue 3.5 (`<script setup lang="ts">`), Node per `.node-version`
**Primary Dependencies**: Vite, vue-router, Firebase JS SDK (Auth + Firestore client); `firebase-admin` for seed scripts only. No new dependencies.
**Storage**: Firestore — existing `characters` and `participants` collections extended per the locked Schema Contract; new `campaignSessions` collection (doc id = campaignId). `firestore.rules` updated in-repo (deployment remains the README "Known follow-ups" item).
**Testing**: Vitest + @vue/test-utils for units (jet-formula state space per NFR-005, store/repository fallbacks); one new Playwright smoke e2e for layout + tab switching (decision 01KXT0MF6T7BFAY5M3CZYWDBS9); full existing suite as non-regression gate (charter Quality Gates: e2e required — this touches a full view).
**Target Platform**: SPA in modern browsers; GitHub Pages demo build must keep working read-only without Firebase config (`if (!db) return …` repository fallback).
**Project Type**: Single web SPA (existing `src/` layout).
**Performance Goals**: Session-state changes visible to other viewers < 2s (NFR-001) via Firestore `onSnapshot` listeners — **first real-time listener usage in the codebase** (none exists today); don't worsen Vite's 500kB chunk warning.
**Constraints**: DIR-001..005 (patterns, French strings, legacy-as-spec); layout usable ≥768px, stacking below (NFR-002); zero console errors without backend (NFR-003); schema names locked (C-004); no Dons/Inventaire regression (C-005).
**Scale/Scope**: One campaign table (~5 players + MJ); 1 view restructured, ~6 new components, 1 new type module + repository + store, 2 type modules extended, rules + seed updates.

## Charter Check

*GATE: evaluated against `.kittify/charter/charter.md` (2026-07-12).*

| Charter clause | Status | Note |
|---|---|---|
| Testing Standards (Vitest, Playwright, vue-tsc, oxlint+eslint) | PASS | Plan adds unit tests (NFR-005) + smoke e2e; no new tooling. |
| Quality Gates (type-check, lint, unit, build; e2e for full-view changes) | PASS | Full view touched → e2e explicitly in scope per gate. |
| Performance Benchmarks (500kB chunk warning) | PASS | No new dependencies; components are plain SFCs. |
| Branch Strategy (mission worktrees, review, merge) | PASS | PR-bound mission on `feat/vitruve-character-sheet`. |
| Policy: hand-rolled singleton stores, repository pattern (DIR-003) | PASS | `useCampaignSessionStore` + `CampaignSessionRepository` follow the committed patterns. The new **subscribe (onSnapshot) repository functions** are an *extension* of the pattern (returning an unsubscribe handle, no-op when `!db`), not a second pattern — documented in research.md; CLAUDE.md conventions section updated when the convention lands (DIR-002). |
| DIR-004 legacy-as-spec | PASS | Formulas extracted to spec; all UI re-implemented as SFCs. |
| DIR-005 French strings | PASS | NFR-004 pins legacy wording. |

No violations → Complexity Tracking left empty.

## Project Structure

### Documentation (this mission)

```
kitty-specs/vitruve-character-sheet-01KXSZRT/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── session-state-api.md   # Locked repository/store/rules surface
└── tasks.md             # Phase 2 output (/spec-kitty.tasks — not created here)
```

### Source Code (repository root)

```
src/
├── models/
│   ├── types/
│   │   ├── Character.ts               # + parentCharacterId
│   │   ├── Participant.ts             # + injuries/advantage/disadvantage/childSessions
│   │   └── CampaignSession.ts         # NEW — adventure-dice state
│   └── repositories/
│       ├── ParticipantRepository.ts   # + subscribe/list live, session-field updates, childSessions
│       ├── CharacterRepository.ts     # + listChildrenOf (parentCharacterId filter)
│       └── CampaignSessionRepository.ts # NEW — get/subscribe/adjust adventure dice
├── controllers/
│   ├── usePlayerStore.ts              # session mutations extended (injuries, toggles, childSessions)
│   └── useCampaignSessionStore.ts     # NEW — adventure-dice store
├── components/
│   ├── vitruve/                       # NEW component family
│   │   ├── VitruveSheet.vue           # left column shell (header, vitals, portrait)
│   │   ├── JetCalculator.vue          # display-only calculator
│   │   ├── AdvantageToggles.vue       # avantage/désavantage
│   │   ├── PartyStatus.vue            # état du groupe (live)
│   │   ├── AdventureDiceBox.vue       # dés d'aventure reminder
│   │   ├── FicheTab.vue               # identity tab
│   │   ├── CaracTab.vue               # caractéristiques + injuries + compétences checkboxes
│   │   ├── ChildSheetTab.vue          # child-character mini-sheet
│   │   └── RawCharacterEditor.vue     # MJ-only raw editor (modal)
│   └── …existing components reused (BackpackGrid, DonList, WeaponArmorList, …)
└── views/
    └── PlayerView.vue                 # restructured into vitruve layout, hosts tabs

firestore.rules                        # + campaignSessions rules; participant session fields unchanged scope
scripts/data/characters.json           # + Furmiaou child character (FR-018)
scripts/…                              # seed scripts updated to carry parentCharacterId
e2e/ (existing Playwright dir)         # + vitruve smoke spec
```

**Structure Decision**: Single-project SPA structure preserved. New UI concentrated under `src/components/vitruve/` to keep the restructured `PlayerView.vue` a thin orchestrator (it currently already hosts inventory/dons wiring that must survive intact).

## Implementation Concern Map

> Concerns are not work packages; `/spec-kitty.tasks` translates them (confirmed intent: six sequential WPs ≈ spec's Suggested Delivery Clusters).

### IC-01 — Schema & data-access contract

- **Purpose**: Materialize the spec's locked Schema Contract: types, repositories, stores, rules, seeds — the surface every other concern builds on.
- **Relevant requirements**: FR-014, FR-015, FR-018 (data side), C-001, C-003, C-004
- **Affected surfaces**: `src/models/types/{Character,Participant,CampaignSession}.ts`, `src/models/repositories/{Participant,Character,CampaignSession}Repository.ts`, `src/controllers/{usePlayerStore,useCampaignSessionStore}.ts`, `firestore.rules`, `scripts/data/*.json`
- **Sequencing/depends-on**: none (first)
- **Risks**: Field-name drift vs the locked contract; rules must deny non-owner session writes while allowing MJ overrides.

### IC-02 — Real-time subscription pattern

- **Purpose**: Introduce the codebase's first `onSnapshot` convention: repository `subscribe*` functions returning an unsubscribe handle, no-op `() => {}` when `!db`; stores own listener lifecycle (attach on view mount, detach on unmount/campaign switch).
- **Relevant requirements**: NFR-001, FR-002, FR-008–010, FR-014, NFR-003
- **Affected surfaces**: `ParticipantRepository.ts`, `CampaignSessionRepository.ts`, `usePlayerStore.ts`, `useCampaignSessionStore.ts`; CLAUDE.md convention note (DIR-002)
- **Sequencing/depends-on**: IC-01
- **Risks**: Listener leaks on route change; double-write echo (local optimistic value vs snapshot); keeping demo build silent.

### IC-03 — Vitruve layout shell & tab host

- **Purpose**: Restructure `PlayerView.vue` into the two-column layout and tab bar while relocating the existing Dons/Inventaire content unchanged.
- **Relevant requirements**: FR-001–003, FR-011, NFR-002, C-005
- **Affected surfaces**: `src/views/PlayerView.vue`, `src/components/vitruve/VitruveSheet.vue`, styles
- **Sequencing/depends-on**: IC-01 (types only); independent of IC-02
- **Risks**: Regression of existing inventory/dons wiring and permissions (`canEditInventory`); e2e selectors moving.

### IC-04 — Fiche & Caractéristiques tabs

- **Purpose**: Identity tab and the carac tab with injury squares, compétences/race-modifier checkbox lists, posture placement.
- **Relevant requirements**: FR-006 (list side), FR-012–014
- **Affected surfaces**: `FicheTab.vue`, `CaracTab.vue`, `usePlayerStore.ts` (injury mutations)
- **Sequencing/depends-on**: IC-01, IC-02 (live injuries), IC-03 (tab host)
- **Risks**: Legacy category math must use the mapping table (force/social/mental ↔ sub pairs); histoire edit permissions.

### IC-05 — Jet calculator & avantage/désavantage

- **Purpose**: Display-only calculator (formula per FR-005/007) fed by category, injuries, ticked modifiers, manual mod; persistent toggles.
- **Relevant requirements**: FR-005–008, NFR-005
- **Affected surfaces**: `JetCalculator.vue`, `AdvantageToggles.vue`, shared ephemeral tick-state (provide/inject or store-local, non-persisted)
- **Sequencing/depends-on**: IC-04 (tick sources live in CaracTab)
- **Risks**: Formula fidelity (pin-at-5 rule, clamp order); tick-state must reset on character switch.

### IC-06 — État du groupe & dés d'aventure

- **Purpose**: Live party PV/Mana list and the shared adventure-dice reminder with MJ ± controls.
- **Relevant requirements**: FR-009–010, FR-017 (exclusion), NFR-001
- **Affected surfaces**: `PartyStatus.vue`, `AdventureDiceBox.vue`, `useCampaignSessionStore.ts`
- **Sequencing/depends-on**: IC-01, IC-02
- **Risks**: Excluding child characters requires the participant↔character join; missing `campaignSessions` doc must render 0/0.

### IC-07 — Child characters & MJ raw editor

- **Purpose**: Child tabs with mini-sheets and `childSessions` persistence, calculator context switch, Furmiaou seed, MJ raw-data editor.
- **Relevant requirements**: FR-004, FR-015–018
- **Affected surfaces**: `ChildSheetTab.vue`, `RawCharacterEditor.vue`, `CharacterRepository.listChildrenOf`, `usePlayerStore.ts` (childSessions mutations), seeds
- **Sequencing/depends-on**: IC-01, IC-03, IC-05 (calculator context), IC-04 (carac blocks reuse)
- **Risks**: Reusing carac-block rendering for children without duplicating components; raw-editor writes must reject invalid JSON atomically (FR-004).

### IC-08 — Verification & non-regression

- **Purpose**: NFR-005 unit coverage of the formula state space, vitruve smoke e2e, keep existing suites green, docs sync (DIR-002).
- **Relevant requirements**: NFR-005, SC-003, SC-005, C-005
- **Affected surfaces**: `src/**/__tests__/`, Playwright specs, CLAUDE.md conventions note
- **Sequencing/depends-on**: distributed — each cluster lands green (C-006); final sweep last
- **Risks**: Playwright webkit flakiness (known project gotcha) — smoke spec must stay browser-agnostic.
