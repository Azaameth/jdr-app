---
work_package_id: WP02
title: Dashboard resolution + create/edit UI
dependencies:
- WP01
requirement_refs:
- FR-002
- FR-004
- NFR-002
tracker_refs: []
planning_base_branch: dev
merge_target_branch: dev
branch_strategy: Planning artifacts for this mission were generated on dev. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into dev unless the human explicitly redirects the landing branch.
subtasks:
- T004
- T005
- T006
- T007
agent: ""
assignee: ""
shell_pid: ""
history: []
agent_profile: frontend-freddy
authoritative_surface: src/views/
create_intent:
- src/views/__tests__/TeamView.spec.ts
- e2e/team-roster.spec.ts
execution_mode: code_change
model: ''
owned_files:
- src/views/TeamView.vue
- src/views/PlayerView.vue
- src/views/__tests__/TeamView.spec.ts
- e2e/team-roster.spec.ts
role: implementer
tags: []
---

# Work Package Prompt: WP02 – Dashboard resolution + create/edit UI

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: (fill from frontmatter `agent` at assignment time)

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

`TeamView.vue` (the "Situation globale" dashboard, route `/campaigns/:id/team`) currently
renders `character.raceId`/`character.classId` as raw strings (e.g. `kitsune`, `cogneur`)
instead of resolved names. Fix that, and wire the WP01 create/update repository functions
into an MJ/admin-only "new character" entry point plus inline edit.

## Context — important, read before writing new resolution logic

**Do not reinvent race/class resolution.** `src/views/PlayerView.vue` (lines ~40-79) already
has this exact logic: `normalizeToken()`, `matchRaceFromCharacter()`,
`matchClassFromCharacter()`, and an `ensureCatalogLoaded()` cache keyed by campaignId. Extract
these into a shared helper (e.g. `src/models/repositories/../utils/resolveCharacterCatalog.ts`
or a small composable) that both `PlayerView.vue` and `TeamView.vue` import, rather than
copy-pasting a second copy into `TeamView.vue`. This is a real duplication risk this WP must
avoid.

Read before starting:
- `src/views/TeamView.vue` (current dashboard — full file, it's short)
- `src/views/PlayerView.vue` lines 1-129 (resolution logic to extract/reuse)
- `src/views/CampaignView.vue` line 15 (`canEdit` pattern: `computed(() => authStore.isMj.value || authStore.isAdmin.value)` — reuse this exact check, don't invent a new role gate)
- `kitty-specs/character-data-dashboard-integration-01KXE6PE/tasks/WP01-repository-crud.md` (the functions this WP consumes: `createCharacterWithMembership`, `updateCharacter`)
- spec.md Edge Cases (orphaned reference fallback — no filtering by membership status)

### Subtask T004: Extract shared race/class resolution helper

**Purpose**: Avoid duplicating `PlayerView.vue`'s resolution logic in `TeamView.vue`.

**Steps**:
1. Move `normalizeToken`, `matchRaceFromCharacter`, `matchClassFromCharacter` out of
   `PlayerView.vue` into a new shared module (pick a location consistent with existing
   structure — e.g. `src/models/resolveCharacterCatalog.ts` — decide during implementation,
   not prescribed further here since no `utils/` directory exists yet in this codebase).
2. Update `PlayerView.vue` to import from the new module instead of defining these functions
   locally — confirm its existing behavior is unchanged (no test regression).
3. `TeamView.vue` imports the same functions plus `listRacesByCampaign`/`listClassesByCampaign`.

**Files**: new shared module (~40 lines, moved not duplicated), `src/views/PlayerView.vue` (modified, -~40/+2 lines)
**Validation**: `npm run type-check` passes; existing `PlayerView` behavior unchanged (manual check — no automated test currently covers `PlayerView.vue`, don't add one here, out of scope).

### Subtask T005: Resolve race/class names in `TeamView.vue`

**Purpose**: FR-002 — the actual "link it in the dashboard" ask.

**Steps**:
1. In `loadPlayers()`, alongside the existing `listCharactersByCampaign`/`listMembershipsByCampaign` calls, also fetch `listRacesByCampaign(campaignId.value)`/`listClassesByCampaign(campaignId.value)`.
2. For each `PlayerRow`, resolve `raceId`/`classId` through the shared matcher functions from T004; replace the `raceId: string` / `classId: string` fields with `raceName: string` / `className: string` (or keep both if useful for debugging — decide based on what template needs).
3. **FR-004 fallback**: when no match is found (orphaned reference), display the raw id string prefixed to make the gap visible rather than a blank cell — e.g. `raceName.value ?? \`(inconnu: ${character.raceId})\``. Keep it in French, consistent tone with existing error strings.
4. Update the template's Race/Classe `<td>` cells to use the resolved names.

**Files**: `src/views/TeamView.vue` (modified, +~20 lines)
**Validation**: `npm run type-check` and `npm run lint` pass.

### Subtask T006: "New character" entry point + inline edit

**Purpose**: FR-001/US1 (create) and FR-003/US3 (update), gated to MJ/admin only.

**Steps**:
1. In `TeamView.vue`, add a `canEdit = computed(() => authStore.isMj.value || authStore.isAdmin.value)` (copy `CampaignView.vue`'s exact pattern — import `useAuthStore`).
2. Add a "Nouveau personnage" button visible only when `canEdit`, opening a minimal inline form (name, race select, class select, owner uid, gender) — reuse `<select>`-from-catalog pattern already used elsewhere (check `RaceCarouselView.vue`/`ClassCarouselView.vue` for how race/class options are sourced, they're already loaded in this view per T005). On submit, call `createCharacterWithMembership()`, then `await loadPlayers()` to refresh.
3. In `PlayerView.vue`, when `canEdit` (reuse the same computed, add `useAuthStore` role check if not already sufficiently exposed), show an inline "modifier" affordance for name/level next to the existing display, calling `updateCharacter()` on save and refetching via the existing `loadCharacter()`.
4. Validate the race/class select values against the already-loaded catalogs before submit (spec.md Acceptance Scenario for FR-001: reject invalid raceId/classId with a French error, don't write it).

**Files**: `src/views/TeamView.vue` (modified, +~60 lines), `src/views/PlayerView.vue` (modified, +~30 lines)
**Validation**: `npm run type-check`, `npm run lint` pass; manually verified in-browser (create a character, confirm it appears in Team view with resolved names; edit a name, confirm it updates).

### Subtask T007: Tests

**Purpose**: SC-002/SC-003/SC-004.

**Steps**:
1. Create `src/views/__tests__/TeamView.spec.ts` (no existing test file for this view). Mock `CharacterRepository`/`MembershipRepository`/`RaceRepository`/`ClassRepository`. Cover: (a) resolved names render correctly for a matched race/class, (b) the orphaned-reference fallback renders instead of a blank cell, (c) the "Nouveau personnage" button is absent for a `joueur` role and present for `mj`/`admin` (mock `useAuthStore`).
2. Create `e2e/team-roster.spec.ts` following `e2e/castes.spec.ts`'s pattern (unauthenticated redirect check only — this suite still has no authenticated-session fixture, same limitation noted in the faction-caste-browser mission; don't attempt to build one here).

**Files**: `src/views/__tests__/TeamView.spec.ts` (new, ~70 lines), `e2e/team-roster.spec.ts` (new, ~15 lines)
**Validation**: `npm run test:unit` and `CI=1 npx playwright test --project=chromium e2e/team-roster.spec.ts` both pass.

## Definition of Done

- [ ] Race/class resolution logic exists in exactly one shared place, used by both `PlayerView.vue` and `TeamView.vue`
- [ ] Team view shows resolved race/class names, with a visible (not blank) fallback for orphaned references
- [ ] "Nouveau personnage" creation works end-to-end, gated to `mj`/`admin`
- [ ] Inline character edit (name/level) works end-to-end, gated to `mj`/`admin`
- [ ] New unit + e2e tests pass; `npm run type-check`, `npm run lint`, `npm run test:unit` all pass

## Risks

- **Duplication drift**: if the shared resolution helper (T004) is skipped and `TeamView.vue` gets its own copy instead, a future race/class-matching bugfix will need to be applied twice and will likely only get applied once. Treat T004 as a hard prerequisite for T005, not optional cleanup.
- **Role-gating consistency**: don't invent a new role-check helper — `authStore.isMj.value || authStore.isAdmin.value` is the existing idiom (`CampaignView.vue`, `CampaignListView.vue`); a third slightly-different variant makes future refactors harder.

## Reviewer Guidance

- Confirm `PlayerView.vue`'s pre-existing behavior (race/class display, forbidden-access guard for players viewing others' characters) is unchanged after the T004 extraction — this is the easiest place to introduce a silent regression.
- Confirm the orphaned-reference fallback is visually distinguishable (not just "same as normal" with a raw id) — spec.md FR-004 exists specifically so a broken reference doesn't look like clean data.
- Confirm create/edit forms are actually invisible (not just disabled) for `joueur` role — check the rendered DOM in the new unit test, not just a `v-if` in the template that could be bypassed by inspecting source.

Implementation command: `spec-kitty agent action implement WP02 --agent <name>`

## Activity Log
