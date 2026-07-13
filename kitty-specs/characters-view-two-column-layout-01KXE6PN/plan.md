# Implementation Plan: Characters View Two-Column Layout

**Branch**: `characters-view-two-column-layout-01KXE6PN` | **Date**: 2026-07-13 | **Spec**: `kitty-specs/characters-view-two-column-layout-01KXE6PN/spec.md`
**Input**: Feature specification from `kitty-specs/characters-view-two-column-layout-01KXE6PN/spec.md`

## Summary

Reflow `PlayerView.vue`'s seven stacked `.card` sections into a two-column CSS grid on desktop
(≥1024px), collapsing to the existing single-column mobile layout at the file's established
`800px` breakpoint. Sections are assigned to columns explicitly in the template (not
auto-flowed via `column-count`), so no section ever visually splits and reading order stays
predictable — Identité + Bonus + Attributs in column one (frequently-referenced during play,
naturally shorter), Compétences + Dons + Histoire + Session in column two.

## Technical Context

**Language/Version**: TypeScript ~6.0, Vue 3.5 (`<script setup lang="ts">`)
**Primary Dependencies**: None new — pure CSS grid on the existing template structure
**Storage**: N/A — no data model touched
**Testing**: Vitest + @vue/test-utils — new minimal smoke test asserting all sections still render for a fixture character (guards NFR-002); layout/column placement verified manually (CSS grid placement isn't meaningfully assertable via jsdom)
**Target Platform**: Browser (existing GitHub Pages deployment, no platform changes)
**Project Type**: Single Vue/Vite web app
**Performance Goals**: None beyond charter defaults — pure CSS change, no runtime cost
**Constraints**: Must not change any rendered content/conditional (NFR-002); must reuse the existing 800px breakpoint (NFR-001); portrait/illustration sidebar explicitly out of scope (C-002)
**Scale/Scope**: Single file (`PlayerView.vue`) template restructure + style changes; smallest of the three missions scaffolded this session

## Charter Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Per `.kittify/charter/charter.md`:
- **Testing Standards** — new Vitest smoke test added despite this being primarily a CSS change, specifically to guard NFR-002 (no content regression) since `PlayerView.vue` currently has zero test coverage of any kind. ✅
- **Quality Gates** — type-check/lint/unit non-negotiable; `npm run test:e2e` is charter-required for changes touching "a full view" — `PlayerView.vue` qualifies, so a minimal e2e smoke test is included (auth-guard-only, matching the established limitation already documented for `e2e/castes.spec.ts`). ✅
- **Project Directive 3** (existing conventions) — pure CSS grid on an existing `<script setup lang="ts">` view, no new store/pattern. ✅
- **Project Directive 4** (legacy-reference as behavior spec) — `.vitruve-layout`'s two-column *shape* is acknowledged as prior art but not literally ported (see spec.md C-002) — this is a deliberate, disclosed scope narrowing, not an oversight. ✅
- **Branch Strategy** — mission workflow via spec-kitty worktree. ✅

No violations — Complexity Tracking section not needed.

## Project Structure

### Documentation (this mission)

```
kitty-specs/characters-view-two-column-layout-01KXE6PN/
├── spec.md               # Feature specification (done)
├── plan.md               # This file
└── tasks/                # Phase 2 output (spec-kitty tasks command)
```

### Source Code (repository root)

```
src/
└── views/
    ├── PlayerView.vue                    # MODIFIED — template: wrap sections in two column containers; style: grid layout + 800px breakpoint collapse
    └── __tests__/
        └── PlayerView.spec.ts            # NEW — smoke test: all sections render for a fixture character

e2e/
└── player-sheet.spec.ts                  # NEW — auth-guard-only smoke test, same pattern as e2e/castes.spec.ts
```

**Structure Decision**: Single-file change plus its first-ever test file — no new directories,
no new architectural pattern. This is the smallest-footprint mission of the three scaffolded
this session.

## Implementation Concern Map

Not included — single self-contained concern (one view, one CSS layout change, one new test
file), same rationale as the faction-caste-browser mission's plan.md: `/spec-kitty.tasks` can
decompose directly into a single work package without an intermediate concern map.
