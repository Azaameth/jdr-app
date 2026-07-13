---
work_package_id: WP01
title: Character/membership create + update repository functions
dependencies: []
requirement_refs:
- FR-001
- FR-003
- NFR-001
- NFR-002
- C-001
- C-003
tracker_refs: []
planning_base_branch: dev
merge_target_branch: dev
branch_strategy: Planning artifacts for this mission were generated on dev. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into dev unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-character-data-dashboard-integration-01KXE6PE
base_commit: b810282269fc751103c045fceba30d6c90fffe68
created_at: '2026-07-13T17:21:33.202057+00:00'
subtasks:
- T001
- T002
- T003
assignee: ''
agent: "claude"
shell_pid: "20196"
history: []
agent_profile: implementer-ivan
authoritative_surface: src/models/
create_intent:
- src/models/repositories/__tests__/CharacterRepository.spec.ts
- src/models/repositories/__tests__/MembershipRepository.spec.ts
execution_mode: code_change
model: ''
owned_files:
- src/models/repositories/CharacterRepository.ts
- src/models/repositories/MembershipRepository.ts
- src/models/repositories/__tests__/CharacterRepository.spec.ts
- src/models/repositories/__tests__/MembershipRepository.spec.ts
role: implementer
tags: []
---

# Work Package Prompt: WP01 – Character/membership create + update repository functions

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: (fill from frontmatter `agent` at assignment time)

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

`CharacterRepository.ts` and `MembershipRepository.ts` currently only support `list*`/`get*` — there is no way to create or update a character through the app itself; the only path today is re-running an admin seed script (`scripts/generateCharacterData.mjs` + `scripts/uploadDefaultCharsAdmin.mjs`) against a JSON fixture. Add the missing `create`/`update` functions, with character + membership creation happening atomically.

## Context

Read before starting:
- `spec.md` (Assumption & Open Question section explains why this WP exists — it's the CRUD gap, not a live-data migration)
- `plan.md` Technical Context and IC-01
- `src/models/repositories/MembershipRepository.ts` — existing `mapMembership()` normalizer pattern to reuse/extend
- `src/models/repositories/UserRepository.ts` — `mapUser()` for the same normalizer convention on a different collection
- `src/models/types/Character.ts`, `src/models/types/Membership.ts` — exact field shapes
- `firestore.rules` (repo root, not yet deployed but must not be contradicted) — `characters/{id}` create requires `request.resource.data.ownerUid == request.auth.uid` or mj/admin; `memberships/{id}` create has the equivalent proposed-owner check

### Subtask T001: `createCharacterWithMembership()`

**Purpose**: Atomic creation of a `CharacterProfile` + its `Membership`, satisfying NFR-001.

**Steps**:
1. In `CharacterRepository.ts`, add:
   ```ts
   export interface CreateCharacterInput {
     campaignId: string
     ownerUid: string
     name: string
     raceId: string
     classId: string
     gender: CharacterGender
     elements: string[]
   }
   ```
   (minimal required fields for a freshly-onboarded character — level defaults to 1, attributes/skills/gifts/languages default to empty, `lore.backstory` defaults to `''`.)
2. Add `export async function createCharacterWithMembership(input: CreateCharacterInput): Promise<{ characterId: string }>`. `if (!db) throw new Error('Firebase non configuré.')` (this is a write path, not a read — the graceful no-op convention is for reads; a write with no backend must fail loudly, not silently pretend to succeed).
3. Use `writeBatch(db)`: `doc(collection(db, 'characters'))` for a fresh character id, `doc(collection(db, 'memberships'))` for a fresh membership id — `batch.set()` both, then `batch.commit()`. Membership defaults: `status: 'approved'`, `personalNote: ''`, `session: { hp: 0, maxHp: 0, mana: 0, maxMana: 0, posture: 'DEFENSIF', inventory: [] }` (an MJ creating a character sets stats afterward via the character sheet — this WP does not need a stats-entry form, just valid defaults).
4. Set `createdAt`/`updatedAt` to `new Date().toISOString()` on both docs, matching `generateCharacterData.mjs`'s convention.

**Files**: `src/models/repositories/CharacterRepository.ts` (modified, +~35 lines)
**Validation**: `npm run type-check` passes.

### Subtask T002: `updateCharacter()`

**Purpose**: FR-003 — edit an existing character's identity fields (name/level, extensible to others).

**Steps**:
1. Add `export async function updateCharacter(id: string, patch: Partial<Pick<CharacterProfile, 'name' | 'level' | 'raceId' | 'classId' | 'gender' | 'elements'>>): Promise<void>`.
2. `if (!db) throw new Error('Firebase non configuré.')`.
3. `updateDoc(doc(db, 'characters', id), { ...patch, updatedAt: new Date().toISOString() })`.
4. Restrict the patch type to identity fields only (not `skills`/`gifts`/`attributes` — those need dedicated editing UX out of this WP's scope; keep the type narrow so callers can't accidentally overwrite a nested structure with a partial one).

**Files**: `src/models/repositories/CharacterRepository.ts` (same file as T001)
**Validation**: `npm run type-check` passes.

### Subtask T003: Unit tests

**Purpose**: SC-004 — cover the new write paths.

**Steps**:
1. Create `src/models/repositories/__tests__/CharacterRepository.spec.ts` and `.../MembershipRepository.spec.ts` (new directory — no `__tests__` under `repositories/` exists yet; follow the mocking style used in `src/views/__tests__/*.spec.ts` for `vi.mock('firebase/firestore', ...)`).
2. `CharacterRepository.spec.ts`: mock `writeBatch`/`updateDoc`/`doc`/`collection` from `firebase/firestore`; assert `createCharacterWithMembership` calls `batch.set` twice (character + membership) and `batch.commit` once; assert `updateCharacter` calls `updateDoc` with exactly the patched fields plus `updatedAt`, not the full object.
3. Also assert both functions throw when `db` is undefined (mock `../../firebase/config` to export `db: undefined` for that one test case) — this is the one place these repositories intentionally deviate from the no-op convention (see T001 step 2's rationale), so it needs explicit coverage or a future refactor could silently "fix" it back to a no-op and break NFR-001's atomicity guarantee unnoticed.

**Files**: `src/models/repositories/__tests__/CharacterRepository.spec.ts` (new, ~50 lines), `src/models/repositories/__tests__/MembershipRepository.spec.ts` (new, ~20 lines — only needs the `db` undefined + mapMembership coverage if not already covered elsewhere)
**Validation**: `npm run test:unit` passes including these new files.

## Definition of Done

- [ ] `createCharacterWithMembership()` writes both docs atomically via `writeBatch`, throws (not silently no-ops) when Firebase isn't configured
- [ ] `updateCharacter()` only patches the fields passed, always bumps `updatedAt`
- [ ] New unit tests cover both success and the `db` undefined case
- [ ] `npm run type-check`, `npm run lint`, `npm run test:unit` all pass

## Risks

- **Silent no-op vs throw inconsistency**: every existing repository function no-ops on missing `db` (by design, for read-only degraded mode). These new *write* functions must throw instead — flag clearly in code (a one-line comment) so a future contributor copying the read pattern doesn't "fix" this into a silent failure that drops a character creation on the floor.
- **Firestore rules drift**: the batch write shape must stay writable under the rules already drafted in `firestore.rules` (not yet deployed) — if this WP's write shape doesn't match those rules' expectations (e.g. proposed `ownerUid` equality), flag it to the reviewer rather than silently diverging; the rules are the intended target even though they aren't live.

## Reviewer Guidance

- Confirm the batch write is genuinely atomic (both `batch.set` calls before a single `batch.commit`, not two separate writes).
- Confirm `updateCharacter`'s patch type can't accidentally clobber `attributes`/`skills`/`gifts`/`lore` — those aren't in scope for this WP.
- Check the new `__tests__` directory under `repositories/` follows the mocking conventions used elsewhere in the codebase rather than inventing a new one.

Implementation command: `spec-kitty agent action implement WP01 --agent <name>`

## Activity Log
- 2026-07-13T17:21:44Z – claude – shell_pid=16368 – Assigned agent via action command
- 2026-07-13T17:29:09Z – claude – shell_pid=16368 – Moved to for_review
- 2026-07-13T17:35:17Z – claude – shell_pid=16368 – T001-T003 done, all gates green (type-check/lint/unit 12-12/build).
- 2026-07-13T17:40:39Z – claude – shell_pid=20196 – Started review via action command
- 2026-07-13T18:03:25Z – user – shell_pid=20196 – Approved by project owner after reviewing the diff (git diff kitty/mission-character-data-dashboard-integration-01KXE6PE..HEAD -- src/). Fresh gate re-verification: type-check, lint, unit (12/12), build all green.
