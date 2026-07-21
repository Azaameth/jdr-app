---
work_package_id: WP01
title: 'Schema & aggregation: statBonus fields, computeEffectiveMaxStat, seed fixture'
dependencies: []
requirement_refs:
- FR-001
- FR-002
- FR-003
- FR-006
- FR-007
- FR-008
tracker_refs: []
planning_base_branch: feat/equipment-stat-effects
merge_target_branch: feat/equipment-stat-effects
branch_strategy: Planning artifacts for this mission were generated on feat/equipment-stat-effects. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/equipment-stat-effects unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
- T004
agent: ""
shell_pid: ""
history:
- timestamp: "2026-07-21T15:55:00Z"
  agent: "system"
  action: "Prompt generated via /spec-kitty.tasks"
agent_profile: implementer-ivan
authoritative_surface: src/models/types/Inventory.ts
create_intent:
- src/utils/effectiveStats.ts
- src/utils/__tests__/effectiveStats.spec.ts
execution_mode: code_change
model: claude-sonnet-5
owned_files:
- src/models/types/Inventory.ts
- src/utils/effectiveStats.ts
- src/utils/__tests__/effectiveStats.spec.ts
- scripts/data/inventories.json
role: implementer
tags: []
---

# WP01 — Schema & aggregation: statBonus fields, computeEffectiveMaxStat, seed fixture

## ⚡ Do This First: Load Agent Profile

Before reading further, load your assigned agent profile:

```
/ad-hoc-profile-load implementer-ivan
```

Adopt its identity, boundaries, and initialization declaration, then return here.

## Objective

Give `WeaponArmorItem` a structured, optional stat bonus and an `equipped` flag, and implement a pure, unit-tested function that sums equipped items' bonuses onto a base max stat. **Zero UI changes in this WP** — nothing renders differently yet, by design (spec.md C-006: this package must be independently green before any display wiring begins). When you finish, `npm run type-check && npm run lint && npm run test:unit` all pass and the app renders exactly as before.

## Context (read these, in this order)

1. `kitty-specs/equipment-stat-effects-01KY2MYD/contracts/data-layer.md` — **the locked API surface. Implement exactly these names/signatures**, sections 1 and 2 only (type extension + aggregation function) — section 3 (store extension) belongs to WP02.
2. `kitty-specs/equipment-stat-effects-01KY2MYD/data-model.md` — entity shapes, validation rules, the effective-max formula.
3. `kitty-specs/equipment-stat-effects-01KY2MYD/research.md` — D1 (why the field is named `statBonus`, not `bonus`/`effect`), D2 (why this is a plain function, not a Vue composable), D4 (why `statBonus` never interacts with `damageBonus`/`armorRating`).
4. Reference implementation for the pure-function pattern: `src/components/vitruve/jetFormula.ts` — read its file-level comment closely. Your new file must have the exact same "no Vue, no Firestore" property.
5. Reference implementation for defensive Firestore mapping (for context only — you are not touching the repository in this WP, `getInventoryByCharacterId`'s existing mapper already handles arbitrary `WeaponArmorItem` shapes defensively): `src/models/repositories/InventoryRepository.ts:8-20`.

Branch strategy: planning base and merge target are both `feat/equipment-stat-effects`. Execution worktrees are allocated per computed lane from `lanes.json`; run `spec-kitty agent action implement WP01 --agent claude` and work in the workspace it reports. **Gotcha (from README):** worktrees don't share gitignored files — copy `.env` and run `npm install` in the worktree if needed.

## Subtasks

### T001 — Extend `WeaponArmorItem` in `src/models/types/Inventory.ts`

**Purpose**: materialize the locked schema (FR-001, FR-002).

Add exactly two new optional fields to the existing interface, keeping every other export in the file unchanged:

```ts
export interface WeaponArmorItem {
  itemId: string
  name: string
  damageDie?: 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20'
  damageBonus?: number
  armorRating?: number
  statNote?: string
  equipped?: boolean
  statBonus?: { stat: 'maxHp' | 'maxMana'; amount: number }
}
```

Do not touch `InventoryItem`, `CharacterInventory`, `InventoryCategory`, or `BACKPACK_MAX_SLOTS` — none of them are in scope.

**Validation**: `npm run type-check` passes; `PlayerView.vue`, `WeaponArmorList.vue`, `useInventoryStore.ts` all still compile unchanged (the new fields are additive-optional, so nothing that already builds `WeaponArmorItem` objects needs to change).

### T002 — Pure aggregation function `src/utils/effectiveStats.ts`

**Purpose**: the single source of truth for "what's the effective max stat" (FR-003, FR-006, FR-007). Create `src/utils/effectiveStats.ts` (a second file in `src/utils/`, alongside the existing `inventoryText.ts`).

Implement per `contracts/data-layer.md` section 2:

```ts
import type { WeaponArmorItem } from '../models/types/Inventory'

export type EffectiveStatTarget = 'maxHp' | 'maxMana'

export function computeEffectiveMaxStat(
  baseValue: number,
  items: WeaponArmorItem[],
  stat: EffectiveStatTarget,
): number {
  const bonus = items
    .filter((item) => item.equipped && item.statBonus?.stat === stat)
    .reduce((sum, item) => sum + (item.statBonus?.amount ?? 0), 0)
  return baseValue + bonus
}
```

Add a short file-level comment mirroring `jetFormula.ts:4-6`'s intent (no Vue, no Firestore, must stay importable from a plain unit test) — this file must never import from `vue` or `firebase/firestore`, and must never be given knowledge of which character/child it's computing for (that's the caller's job — see WP02).

**Explicitly do NOT read** `damageBonus`, `armorRating`, or `statNote` anywhere in this function — per C-004/research.md D4, they are unrelated fields that happen to live on the same item.

**Validation**: function signature matches `contracts/data-layer.md` exactly; no import from `vue` or any Firestore module anywhere in the file.

### T003 — Unit tests `src/utils/__tests__/effectiveStats.spec.ts`

**Purpose**: prove NFR-002's exact combination list, and NFR-001's "never throws" guarantee. Follow the existing Vitest style in `src/utils/__tests__/inventoryText.spec.ts` (plain `describe`/`it`, no mocking needed — this is a pure function with no dependencies).

Cover, at minimum, one test per case:

1. **Single equipped bonus**: one item `{ equipped: true, statBonus: { stat: 'maxMana', amount: 4 } }` against `baseValue: 20` → `24`.
2. **Two stacked equipped bonuses on the same stat**: two items each `{ equipped: true, statBonus: { stat: 'maxMana', amount: X } }` (e.g. +4 and +2) → sums to `baseValue + 6`, not overwritten (SC-003).
3. **Unequipped item with a `statBonus`**: `{ equipped: false, statBonus: { stat: 'maxHp', amount: 10 } }` → contributes 0, result equals `baseValue`.
4. **Item with no `statBonus` at all** (e.g. only `statNote` set, or only `damageBonus`/`armorRating`): contributes 0 regardless of `equipped`.
5. **Bonus targeting the other stat**: an equipped item with `statBonus.stat === 'maxHp'` contributes 0 when querying `'maxMana'`, and vice versa.
6. **Empty `items` array**: returns `baseValue` unchanged, does not throw.
7. **`items` containing a mix** (some equipped-with-bonus, some equipped-without-bonus, some unequipped-with-bonus): only the equipped-with-matching-stat ones contribute, and only their amounts sum.

**Validation**: every case above has its own `it(...)` block with an explicit assertion; `npm run test:unit -- effectiveStats` green.

### T004 — Seed fixture: populate the existing Mana Ring item (FR-008)

**Purpose**: exercise the new fields end-to-end in real seed data, using the backlog's own example (`MIGRATION_BACKLOG.md` item 4: "Mwasa's +4 Mana Ring" — note the backlog's "Mwasa" is a spelling variant of the actual character, "Mwassa Mekhsitt", `characterId: "mwassa"`).

This item **already exists** — no new entry needed, and there is no need to search for it. In `scripts/data/inventories.json`, find the object where `"characterId": "mwassa"`, then inside its `armor` array find the entry:

```json
{
  "itemId": "inv-9-anneau-de-mana",
  "name": "Anneau de Mana"
}
```

Add the two new fields to that exact entry (do not create a second ring, do not touch any other character's data):

```json
{
  "itemId": "inv-9-anneau-de-mana",
  "name": "Anneau de Mana",
  "equipped": true,
  "statBonus": { "stat": "maxMana", "amount": 4 }
}
```

Match the file's existing JSON formatting exactly (indentation, key order convention already used by sibling entries) so the diff is minimal and reviewable.

**Validation**: `git diff scripts/data/inventories.json` shows exactly two added keys on the `inv-9-anneau-de-mana` entry — nothing else in the file changes; the JSON still parses (`node -e "JSON.parse(require('fs').readFileSync('scripts/data/inventories.json'))"` or equivalent).

## Definition of Done

- [ ] `WeaponArmorItem` has exactly the two new fields from `contracts/data-layer.md` section 1, nothing else changed in `Inventory.ts`.
- [ ] `computeEffectiveMaxStat` matches `contracts/data-layer.md` section 2's signature exactly; file imports nothing from `vue` or Firestore.
- [ ] All 7 test cases in T003 present and passing.
- [ ] Seed fixture updated with a real, equipped, bonus-carrying item.
- [ ] `npm run type-check`, `npm run lint`, `npm run test:unit` all green.
- [ ] `git status` shows zero changes under `src/views/` or `src/components/` — this WP is schema/logic/fixture only.

## Risks

- None notable — this is additive-optional typed fields plus a pure arithmetic function over a typed array. The only real risk is scope creep into the display layer (WP02's job) or into `damageBonus`/`armorRating` semantics (explicitly out of scope, C-004).

## Reviewer Guidance

- Diff-check `computeEffectiveMaxStat`'s signature and behavior against `contracts/data-layer.md` line by line — this is what WP02 builds on.
- Confirm the test suite actually exercises stacking (case 2) with an assertion on the *summed* value, not just "doesn't throw" — this is the FR most likely to be under-tested if rushed.
- Confirm no `damageBonus`/`armorRating`/`statNote` read anywhere in `effectiveStats.ts` (grep for those identifiers in the new file — should have zero hits).
- Confirm `git status` shows no `src/views/`, `src/components/`, or `src/controllers/` changes.

## Activity Log

- 2026-07-21T15:55:00Z – system – Prompt generated via /spec-kitty.tasks
