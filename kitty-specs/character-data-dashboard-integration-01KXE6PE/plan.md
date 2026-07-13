# Implementation Plan: Character Data / Dashboard Integration

**Branch**: `character-data-dashboard-integration-01KXE6PE` | **Date**: 2026-07-13 | **Spec**: `kitty-specs/character-data-dashboard-integration-01KXE6PE/spec.md`
**Input**: Feature specification from `kitty-specs/character-data-dashboard-integration-01KXE6PE/spec.md`

## Summary

Close the CRUD gap on `CharacterRepository`/`MembershipRepository` (today only `list`/`get`
exist) by adding atomic create/update functions, expose them through an MJ/admin-only
"new character" form and inline edit on the existing player detail view, and fix
`TeamView.vue` (the dashboard) to resolve `raceId`/`classId` to display names via
`RaceRepository`/`ClassRepository` instead of rendering raw IDs.

## Technical Context

**Language/Version**: TypeScript ~6.0, Vue 3.5 (`<script setup lang="ts">`)
**Primary Dependencies**: Vite 8, vue-router 5, Firebase 12 (Firestore client SDK) — no new dependencies needed
**Storage**: Firestore, existing `characters` and `memberships` collections (no schema change — same fields as `Character.ts`/`Membership.ts`); writes use a Firestore batch (`writeBatch`) so character + membership are created atomically per NFR-001
**Testing**: Vitest + @vue/test-utils for repository create/update functions and the dashboard's race/class resolution (including the orphaned-reference fallback); Playwright e2e for the new-character form since it's a full view/flow (charter: e2e required for changes touching a full view)
**Target Platform**: Browser (existing GitHub Pages deployment, no platform changes)
**Project Type**: Single Vue/Vite web app (no backend server — Firestore is the only "backend")
**Performance Goals**: No specific budget beyond charter defaults; race/class name resolution happens client-side against already-fetched `Race[]`/`Class[]` arrays (no extra per-row network round-trip)
**Constraints**: No production Firestore data inspection/migration in this mission (C-002); new write paths must stay expressible under the not-yet-deployed `firestore.rules` shape (C-003) — `characters/{id}` create requires the proposed doc's owner-matching semantics already written into those rules
**Scale/Scope**: Single campaign's roster at a time (existing `listCharactersByCampaign`/`listMembershipsByCampaign` scope), typically single-digit to low-dozens of characters per campaign

## Charter Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Per `.kittify/charter/charter.md`:
- **Testing Standards** — plan includes Vitest coverage for the new repository functions and dashboard resolution logic, plus a Playwright e2e test for the new-character flow (charter requires e2e for full-view changes). ✅
- **Quality Gates** — type-check/lint/unit are non-negotiable; build must succeed; e2e required here since routing/a full view is touched. ✅
- **Project Directive 3** (follow existing conventions) — new repository functions follow the `if (!db) return …` graceful-fallback + `mapX()` normalizer pattern already used by `MembershipRepository.mapMembership`/`UserRepository.mapUser`; no new store pattern introduced (character-creation state lives in the view, consistent with how `CampaignView`/`CampaignListView` handle role-gated actions today, not a new singleton composable). ✅
- **Project Directive 4** (legacy-reference is a behavior spec) — the legacy flat `charData` shape (`legacy-reference/index.html` ~line 1912) is read only to confirm which fields belong to identity vs. session, not copied as-is; the current `CharacterProfile`/`Membership` split is kept as-is (spec's Assumption (a)). ✅
- **Project Directive 5** (French strings) — new form labels/validation/error messages in French, matching `CampaignView.vue`/`useCampaignStore.ts` tone. ✅
- **Branch Strategy** — mission workflow via spec-kitty worktree, not a direct `main` commit. ✅
- **Spec Constraint C-002** (no production data touched) — explicitly respected; this plan only adds app-level CRUD, it does not write a one-off migration script against live data. ✅

No violations — Complexity Tracking section not needed.

## Project Structure

### Documentation (this mission)

```
kitty-specs/character-data-dashboard-integration-01KXE6PE/
├── spec.md               # Feature specification (done)
├── plan.md               # This file
└── tasks/                # Phase 2 output (spec-kitty tasks command)
```

### Source Code (repository root)

```
src/
├── models/
│   ├── types/
│   │   └── Character.ts                      # MODIFIED — add CharacterDraft/CreateCharacterInput type if needed for the form payload
│   └── repositories/
│       ├── CharacterRepository.ts             # MODIFIED — add createCharacter(), updateCharacter()
│       └── MembershipRepository.ts            # MODIFIED — add createMembership() (called alongside createCharacter() via writeBatch), updateMembershipSession() reused if present, else add
├── views/
│   ├── TeamView.vue                           # MODIFIED — resolve raceId/classId via RaceRepository/ClassRepository, fallback for orphaned refs, entry point for "new character"
│   └── PlayerView.vue                         # MODIFIED — inline edit for name/level (US3), gated by canEdit-style role check
└── router/
    └── index.ts                               # Likely unchanged — create/edit happen inline on existing routes, no new route expected unless the form ends up being a dedicated view (decide in tasks phase if the inline-modal approach proves too cramped)
```

**Structure Decision**: Follows the existing single-project layout exactly — no new
directories. Firestore writes route through the repository layer only (no direct
`writeBatch` calls from view components), consistent with every other data-access path in
the app.

## Implementation Concern Map

### IC-01 — Repository CRUD (create/update)

- **Purpose**: Add atomic character+membership creation and character update functions, closing the CRUD gap identified in MIGRATION_BACKLOG.md item 1.
- **Relevant requirements**: FR-001, FR-003, NFR-001, NFR-002, C-001, C-003
- **Affected surfaces**: `src/models/repositories/CharacterRepository.ts`, `src/models/repositories/MembershipRepository.ts`
- **Sequencing/depends-on**: none — this is the foundation the other concern builds on
- **Risks**: Getting the Firestore batch write shape wrong could silently violate the not-yet-deployed `firestore.rules` ownership checks; validate against the rules file's `characters`/`memberships` match blocks even though they aren't live yet.

### IC-02 — Dashboard resolution + create/edit UI

- **Purpose**: Wire the new repository functions into a "new character" entry point and inline edit, and fix `TeamView.vue` to show resolved race/class names.
- **Relevant requirements**: FR-002, FR-004, US1, US2, US3
- **Affected surfaces**: `src/views/TeamView.vue`, `src/views/PlayerView.vue`
- **Sequencing/depends-on**: IC-01 (needs the repository functions to exist first)
- **Risks**: Role-gating the create/edit UI needs to match `CampaignView.vue`'s existing `canEdit` computed pattern (`authStore.isMj.value || authStore.isAdmin.value`) rather than inventing a new check.
