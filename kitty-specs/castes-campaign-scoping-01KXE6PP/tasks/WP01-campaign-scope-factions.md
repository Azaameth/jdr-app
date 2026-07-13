---
work_package_id: WP01
title: Campaign-scope factions end-to-end
dependencies: []
requirement_refs:
- FR-001
- FR-002
- FR-003
- NFR-001
- C-001
- C-002
- C-003
tracker_refs: []
planning_base_branch: dev
merge_target_branch: dev
branch_strategy: Planning artifacts for this mission were generated on dev. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into dev unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
- T004
agent: ""
assignee: ""
shell_pid: ""
history: []
agent_profile: implementer-ivan
authoritative_surface: src/models/
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- src/models/types/Faction.ts
- src/models/repositories/FactionRepository.ts
- src/views/FactionBrowserView.vue
- src/views/__tests__/FactionBrowserView.spec.ts
- scripts/uploadStaticDataAdmin.mjs
role: implementer
tags: []
---

# Work Package Prompt: WP01 – Campaign-scope factions end-to-end

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: (fill from frontmatter `agent` at assignment time)

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

Factions/castes are the only one of the three reference-data collections (races, classes,
factions) without a `campaignId`. Give them the same scoping races/classes already have, end
to end: type, repository query, view call-site, and the admin seed script.

## Context

Read before starting:
- `spec.md` (Assumptions — explains why this reverses the faction-caste-browser mission's
  original "not campaign-scoped" decision, and why that's fine)
- `src/models/repositories/RaceRepository.ts` / `ClassRepository.ts` (the exact pattern to
  mirror: `where('campaignId', '==', campaignId)`)
- `src/models/repositories/FactionRepository.ts` (current, unscoped version — full file, 17 lines)
- `src/views/FactionBrowserView.vue` (already resolves `campaignId` from the route for
  `CampaignShell` — just needs to also pass it to the data fetch)
- `scripts/uploadStaticDataAdmin.mjs` (full file — races/classes are cleared-then-rewritten
  per run; factions must NOT get that same blanket-clear treatment once scoped, see T004)
- `src/views/__tests__/FactionBrowserView.spec.ts` (existing mock of `listFactions` — needs
  updating to the new function name/signature)

### Subtask T001: Add `campaignId` to `Faction`

**Purpose**: FR-001.

**Steps**:
1. In `src/models/types/Faction.ts`, add `campaignId: string` to the `Faction` interface.

**Files**: `src/models/types/Faction.ts` (modified, +1 line)
**Validation**: `npm run type-check` passes (will surface every call site needing an update — expected, fix them in T002/T003).

### Subtask T002: Campaign-scoped repository query

**Purpose**: FR-002, C-001.

**Steps**:
1. In `FactionRepository.ts`, rename `listFactions(): Promise<Faction[]>` to
   `listFactionsByCampaign(campaignId: string): Promise<Faction[]>`.
2. Change the query to `query(collection(db, FACTIONS_COLLECTION), where('campaignId', '==', campaignId), orderBy('order'))` —
   note Firestore requires a composite index for an equality filter combined with an orderBy
   on a different field; if the query throws a missing-index error when manually tested against
   a real project, follow the error's own console link to create it (same situation
   `RaceRepository`/`ClassRepository` would already have hit — check whether an index already
   exists for those and whether it can be reused/extended for factions).
3. Keep the `if (!db) return []` no-op guard (read path, unchanged convention).

**Files**: `src/models/repositories/FactionRepository.ts` (modified, ~+3/-2 lines)
**Validation**: `npm run type-check` passes.

### Subtask T003: Update the view call-site and its test

**Purpose**: FR-002 (consumer side), NFR-001.

**Steps**:
1. In `FactionBrowserView.vue`, change the import and call from `listFactions()` to
   `listFactionsByCampaign(campaignId.value)` — `campaignId` is already a computed in this
   file, no new state needed.
2. In `FactionBrowserView.spec.ts`, update the mocked module: rename the exported mock
   function to `listFactionsByCampaign`, and change its type from `vi.fn<() => Promise<...>>`
   to `vi.fn<(campaignId: string) => Promise<...>>`. Optionally assert it was called with
   `'campaign-1'` (the route mock's existing `id` param) to actually verify the scoping wired
   through, not just that *a* function resolves data — this is the one line that turns this
   test from "the view still renders" into "the view is actually campaign-scoped now."
   Existing fixture data and both existing test cases (tab switching, subtitle/badge/facts
   rendering) stay unchanged — no content regression (NFR-001).

**Files**: `src/views/FactionBrowserView.vue` (modified, ~+1/-1 lines), `src/views/__tests__/FactionBrowserView.spec.ts` (modified, ~+3/-2 lines)
**Validation**: `npm run test:unit` passes including the updated test.

### Subtask T004: Seed script — stamp campaignId, scope the clear

**Purpose**: FR-003 — the DB-writing half of "place castes information in the DB with a
campaign relationship," and the Edge Case warning about not deleting other campaigns' factions.

**Steps**:
1. In `uploadStaticDataAdmin.mjs`'s faction loop (currently line 83-91), add `campaignId` to
   the written document: `await db.collection('factions').doc(id).set({ ...f, campaignId })` —
   mirrors how races/classes already do `{ ...r, img: imgPath, campaignId }`.
2. **Do not** call the existing blanket `clearCollection(db, 'factions')` the way races/classes
   are cleared (`clearCollection` deletes every document in the collection regardless of
   campaign — safe for races/classes only because this script has only ever targeted one
   campaign at a time in practice, but explicitly wrong once factions are meant to support
   multiple campaigns' data coexisting). Instead, before writing, delete only the documents
   already belonging to the target `campaignId`: query
   `db.collection('factions').where('campaignId', '==', campaignId).get()`, batch-delete those,
   then write the new set. This makes factions idempotent-per-campaign without touching other
   campaigns' rows.
3. Leave the races/classes blanket-clear behavior exactly as-is — fixing that is a pre-existing
   latent issue out of this mission's scope (noted in spec.md Edge Cases), don't touch it here.

**Files**: `scripts/uploadStaticDataAdmin.mjs` (modified, ~+10/-2 lines)
**Validation**: `node scripts/uploadStaticDataAdmin.mjs` runs without error against a real service account (manual check, not part of CI, same as the original faction-caste-browser mission's T003 validation) — confirm factions written have `campaignId`, and re-running for a second `STATIC_DATA_CAMPAIGN_ID` does not remove the first campaign's faction documents.

## Definition of Done

- [ ] `Faction` type has `campaignId`
- [ ] `listFactionsByCampaign(campaignId)` filters correctly, mirroring `RaceRepository`/`ClassRepository`'s exact query shape
- [ ] `FactionBrowserView.vue` passes its resolved `campaignId` through
- [ ] Existing unit tests updated and passing, with the mock's call verified to receive the campaignId
- [ ] Seed script stamps `campaignId` on every faction and only clears that campaign's factions, not the whole collection
- [ ] `npm run type-check`, `npm run lint`, `npm run test:unit` all pass

## Risks

- **Missing Firestore composite index**: an equality filter (`campaignId`) plus `orderBy('order')` on a different field typically needs a composite index in Firestore — this will only surface as a runtime error against a real project, not at type-check/lint/unit time. Flag to the reviewer if this wasn't manually verified against a live/emulated Firestore instance.
- **Blanket-clear regression**: if T004 is implemented by just reusing `clearCollection(db, 'factions')` (the easy-but-wrong path), a second campaign's seed run silently deletes the first campaign's factions. This is the single most important thing for the reviewer to check.

## Reviewer Guidance

- Confirm T004 does NOT call `clearCollection(db, 'factions')` — check for a scoped, per-campaignId delete instead.
- Confirm `FactionBrowserView.spec.ts`'s updated mock actually asserts the campaignId argument, not just that the mock resolves — a test that only checks "data still renders" would pass even if scoping were silently broken.
- Confirm races/classes' existing (pre-existing, out-of-scope) blanket-clear behavior was left untouched, not "fixed" as a drive-by — that's explicitly out of scope per spec.md Edge Cases.

Implementation command: `spec-kitty agent action implement WP01 --agent <name>`

## Activity Log
