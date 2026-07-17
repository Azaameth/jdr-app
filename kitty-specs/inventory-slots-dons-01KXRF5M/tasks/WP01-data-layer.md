---
work_package_id: WP01
title: 'Data layer: types, parser, persistence, fixtures'
dependencies: []
requirement_refs:
- FR-001
- FR-005
- FR-007
- FR-008
tracker_refs: []
planning_base_branch: feat/inventory-slots-dons
merge_target_branch: feat/inventory-slots-dons
branch_strategy: mission-feature-branch
subtasks:
- T001
- T002
- T003
- T004
- T005
- T006
- T007
agent: claude
history:
- 2026-07-17T16:47:51Z — created by /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: src/models/
create_intent: []
execution_mode: code_change
model: claude-sonnet-5
owned_files:
- src/models/types/Inventory.ts
- src/models/types/Character.ts
- src/models/repositories/InventoryRepository.ts
- src/models/repositories/__tests__/InventoryRepository.spec.ts
- src/utils/**
- src/controllers/useInventoryStore.ts
- src/controllers/__tests__/useInventoryStore.spec.ts
- scripts/migrateInventoryFixtures.mjs
- scripts/data/inventories.json
- scripts/data/characters.json
role: implementer
tags: []
---

# WP01 — Data layer: types, parser, persistence, fixtures

## ⚡ Do This First: Load Agent Profile

Before reading further, load your assigned agent profile:

```
/ad-hoc-profile-load implementer-ivan
```

Adopt its identity, boundaries, and initialization declaration, then return here.

## Objective

Make the entire inventory/dons data path real and green with **zero UI changes**: typed models per the locked contract, a lossless legacy-string parser, repository write functions, a singleton inventory store, and migrated seed fixtures — each unit-tested. When you finish, `npm run type-check && npm run lint && npm run test:unit` all pass and the app renders exactly as before.

## Context (read these, in this order)

1. `kitty-specs/inventory-slots-dons-01KXRF5M/contracts/data-layer.md` — **the locked API surface. Implement exactly these names/signatures.**
2. `kitty-specs/inventory-slots-dons-01KXRF5M/data-model.md` — entity shapes, invariants, validation rules.
3. `NEXTSTEPS.md` § "Typed inventory schema" — the upstream locked contract (cite, never re-derive).
4. `CLAUDE.md` § Conventions — store/repository patterns you must follow.
5. Reference implementations: `src/models/repositories/CharacterRepository.ts` + its spec (test pattern), `src/controllers/usePlayerStore.ts` + its spec (store pattern).

Branch strategy: planning base and merge target are both `feat/inventory-slots-dons`. Execution worktrees are allocated per computed lane from `lanes.json`; run `spec-kitty agent action implement WP01 --agent claude` and work in the workspace it reports. **Gotcha (from README):** worktrees don't share gitignored files — copy `.env` and run `npm install` in the worktree if needed.

## Subtasks

### T001 — Extend `src/models/types/Inventory.ts`

**Purpose**: materialize the locked schema types.

Add (keeping the existing exports' names stable):

```ts
export type InventoryCategory =
  | 'nourriture' | 'munitions' | 'bivouac' | 'soins' | 'potions'
  | 'quete' | 'speciaux' | 'docs' | 'gemmes' | 'butin'

export const BACKPACK_MAX_SLOTS: Record<InventoryCategory, number> = {
  nourriture: 1, munitions: 2, quete: 7, speciaux: 7, docs: 9,
  gemmes: 9, bivouac: 15, soins: 15, potions: 15, butin: 16,
}

export interface WeaponArmorItem {
  itemId: string
  name: string
  damageDie?: 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20'
  damageBonus?: number
  armorRating?: number
  statNote?: string
}
```

Extend `InventoryItem` with required `category: InventoryCategory` (keep `equipped?` for doc compatibility). Extend `CharacterInventory` with `weapons: WeaponArmorItem[]` and `armor: WeaponArmorItem[]`.

**Validation**: type-check passes; `PlayerView.vue` still compiles (its usage of `items` is shape-compatible).

### T002 — Enrich `CharacterGift`, retire dead types in `src/models/types/Character.ts`

**Purpose**: persisted gift enrichment + dead-code cleanup (spec C-003/C-004).

1. Delete the unused `InventoryItemType` and `InventoryItem` declarations (`Character.ts:43-52`). They are confirmed unreferenced (grep `src/` to re-verify before deleting; every real consumer imports from `types/Inventory.ts`).
2. Extend `CharacterGift` with `manaNote?: string`, `damageDice?: string`, `damageBonus?: number` (see data-model.md for semantics — `damageDice` is freeform because legacy has `1D6+1D8`; `manaNote` absorbs formulas like `X`, `2+(1/5m)`, `Tout`).

**Validation**: type-check green; grep confirms no import of the deleted types.

### T003 — Pure parser/formatter `src/utils/inventoryText.ts` + corpus tests

**Purpose**: lossless conversion of legacy strings (FR-005, NFR-002). Create `src/utils/` (first file in it).

Implement per `contracts/data-layer.md`:

- `parseWeaponArmorText(raw)`: strip a trailing `(...)` annotation (regex like `/^(.*?)\s*\(([^)]*)\)\s*$/`). Inside the annotation, recognize:
  - damage pattern: `D4|D6|D8|D10|D12|D20` optionally followed by `/` and a signed number — note legacy uses BOTH ASCII `-`/`+` and Unicode minus `−` (U+2212): `(D4/−1)`, `(D10/+4)`. Normalize `−` to `-` before parsing the number, set `damageDie` + `damageBonus`.
  - armor pattern: `RD<number>` → `armorRating`. `(RD2 vs proj. magiques)` → `armorRating: 2`, `statNote: 'vs proj. magiques'`.
  - anything left over (or annotations matching nothing, e.g. `(vs proj. magiques)`, `(Armure impossible — Oracle)`) goes to `statNote` **verbatim**.
  - no annotation at all → just `{ name }`.
- `formatWeaponArmorStat(item)`: `'D10/+4'` (bonus always signed), `'RD2'`, `'RD2 vs proj. magiques'` (structured + note joined with a space), bare `statNote`, or `''`.
- `parseQuantityText(raw)`: legacy regex `^(.*?)\s*[x×]\s*(\d+)\s*$` → `{ name, quantity }`; default quantity 1.
- `parseLegacyGiftText(raw)`: split name from effect on ` — ` or ` : ` (first match wins, legacy order: ` — ` then ` : `); from the effect, extract `<n> mana` → `manaCost`; extract a dice expression (`\d*D\d+(\+\d*D\d+)*` style) → `damageDice` and trailing `+N`/`−N` → `damageBonus`; whatever remains meaningful stays in `description` (never lose the original effect text — when in doubt keep the whole effect string as `description`). No `manaCost` and no dice → passive: return only `name` + `description`, never synthesized zeros.

**Tests** (`src/utils/__tests__/inventoryText.spec.ts`) — MUST cover the full real corpus:
`Vieille épée (D4/−1)`, `Deux haches à une main (D10/+4)`, `Robe d'Arcaniste enchantée (RD2)`, `Anneau du Dieu du Feu (RD2 vs proj. magiques)`, `Anneau du Dieu du Feu (vs proj. magiques)`, `Armure impossible — Oracle` (placeholder as whole name — must survive untouched), `Kit médical ×4`, `Rations` (no qty), `Turbo Fist — 2 mana / 1D10+2`, `Say My Name — 8 mana / 1D6+1D8+1`, `Maîtrise des Armes : relance 1×/combat` (passive), `Baroud d'Honneur : <30% PV → +2 dégâts` (passive). Plus round-trip assertions: `formatWeaponArmorStat(parseWeaponArmorText(s))` reproduces the original annotation content for every corpus string.

**Validation**: every corpus case has an explicit assertion; no case loses characters.

### T004 — `InventoryRepository` write functions + mapper + tests

**Purpose**: persistence paths (FR-003 groundwork) with the `if (!db)` convention.

In `src/models/repositories/InventoryRepository.ts`:
1. Extend `mapInventory` to default `weapons`/`armor` to `[]` with the same `Array.isArray` guard as `items`, mapping each entry's fields defensively (no blind cast).
2. Add per `contracts/data-layer.md`:
   - `updateInventoryItems(inventoryId, items): Promise<boolean>` — `if (!db) return false`; `updateDoc(doc(db, 'inventories', inventoryId), { items, updatedAt: new Date().toISOString() })`; return true.
   - `updateInventoryEquipment(inventoryId, kind, list): Promise<boolean>` — same shape, writing `weapons` or `armor` per `kind`.

**Tests** (`src/models/repositories/__tests__/InventoryRepository.spec.ts`) — copy the structure of `CharacterRepository.spec.ts` exactly (`vi.hoisted` mocks, `vi.mock('firebase/firestore')`, `vi.resetModules()` + re-import per test):
- "no db": both new functions return `false` and never touch Firestore; `getInventoryByCharacterId` returns `null`.
- "db present": mapper defaults missing `weapons`/`armor` to `[]`; `updateInventoryItems` writes the items array + refreshed `updatedAt`; `updateInventoryEquipment('…', 'armor', …)` writes the `armor` field (assert field name).

### T005 — `src/controllers/useInventoryStore.ts` + tests

**Purpose**: the single mutation surface for inventory (UI WPs consume only this).

Follow `usePlayerStore.ts` exactly: module-scope `ref`s (`inventory`, `loading`, `error`), factory returning computed views + async methods, every catch setting `error.value = err instanceof Error ? err.message : '<French fallback>'`. API per `contracts/data-layer.md`:

- `loadInventory(characterId, campaignId)` — delegates to `getInventoryByCharacterId`, caches in `inventory`.
- `saveBackpackItem(item)` — if no `itemId`: generate one (`crypto.randomUUID()`), **enforce the cap**: when `items.filter(i => i.category === item.category).length >= BACKPACK_MAX_SLOTS[category]` set `error` to a French message (e.g. `'Catégorie pleine : aucun emplacement libre.'`) and return `false` without writing. Existing `itemId`: replace in place. Persist via `updateInventoryItems`, update local state on success.
- `removeBackpackItem(itemId)` — filter + persist.
- `saveEquipmentItem(kind, item)` / `removeEquipmentItem(kind, itemId)` — same pattern via `updateInventoryEquipment` (no cap).
- `freeSlots(category)` — `BACKPACK_MAX_SLOTS[category] − filledCount`, 0 floor.
- No inventory loaded → mutations set a French error and return `false`.

**Tests** (`src/controllers/__tests__/useInventoryStore.spec.ts`) — mock the repository module like `usePlayerStore.spec.ts` does; cover: load caches; cap rejection (French error, repo NOT called); add generates itemId and persists; edit replaces by itemId; remove filters; equipment save hits `updateInventoryEquipment` with right `kind`; repo `false` → store error set, local state unchanged; `freeSlots` math.

### T006 — Fixture migration script + regenerated fixtures

**Purpose**: lossless seed migration (FR-007/FR-008, research D6).

Write `scripts/migrateInventoryFixtures.mjs` (plain Node, no firebase dependency — pure JSON in/out, reusing the same parsing logic; small enough to re-implement the regexes inline or import nothing):

1. **Inventories**: read `scripts/data/inventories.json`. For each doc: items whose name carries a weapon/armor annotation or is a known weapon/armor (the equipped `Vieille épée`, `Robe d'Arcaniste`, `Bouclier`, `Anneau`, `haches`… — decide via the parse result: entries with damage stats → `weapons`; `RD`/armor-ish or known armor names → `armor`) move out of `items` into `weapons`/`armor` as `WeaponArmorItem`s. Remaining items get a `category` assigned from a **name→category map you write explicitly in the script** (e.g. Rations→nourriture, Kit médical→soins, Parchemin/Livre→docs, Boussole/Corde/Sac→bivouac, quest-ish→quete…). Unknown names default to `butin` — but list every mapping explicitly so the reviewer can audit; do not guess silently at runtime.
2. **Gifts**: read `scripts/data/characters.json`. For each gift, parse the legacy string in `name` to split real `name`, `manaCost`, `damageDice`, `damageBonus`. Then merge the legacy `DONS_DATA` port: embed in the script a `DONS_DATA` object transcribed from `legacy-reference/index.html:3305-3348` (per character, keyed by don name) carrying `{ mana, des, bonus, desc }`; where an entry exists, set `description` to the real flavor `desc` (keep `\n`), `manaCost` (numeric mana) or `manaNote` (string mana), `damageDice` (des unless `'—'`), `damageBonus` (bonus unless 0). Passives get no zero-value fields.
3. Deterministic output (stable key order, 2-space indent, trailing newline) written back to both JSON files. Re-running must produce no diff.

Run it, commit both the script and the regenerated JSON.

**Validation**: spot-check azarius — `Vieille épée` in `weapons` with `{damageDie:'D4', damageBonus:-1}`; `Anneau du Dieu du Feu (vs proj. magiques)` in `armor` with `statNote` and **no** armorRating; `Kit médical` in `soins` with quantity 4; gift `Turbo Fist` has real flavor text from DONS_DATA, `manaCost: 2`, `damageDice: '1D10'`, `damageBonus: 2`; `Maîtrise des Armes` has no mana/dice fields.

### T007 — Data-layer gate sweep

**Purpose**: prove WP01 independently green (spec C-006, NFR-003).

1. `npm run type-check` — zero errors (including `PlayerView.vue` against the extended types).
2. `npm run lint` — clean.
3. `npm run test:unit` — all suites green including the three new spec files.
4. `node scripts/migrateInventoryFixtures.mjs && git diff --exit-code scripts/data/` — determinism proof.
5. Confirm zero changes under `src/views/` / `src/components/` (`git status`).

## Definition of Done

- [ ] All exports match `contracts/data-layer.md` names/signatures exactly.
- [ ] Corpus tests cover every string listed in T003 with round-trip losslessness.
- [ ] Every new repository function starts with the `if (!db)` guard; no-db branch tested.
- [ ] Store follows the singleton-composable pattern with French error fallbacks; cap invariant enforced and tested.
- [ ] Fixtures regenerated deterministically; dead types deleted; no UI diffs.
- [ ] `type-check` + `lint` + `test:unit` green.

## Reviewer Guidance

- Diff-check the type shapes against `contracts/data-layer.md` line by line — this surface is what all later WPs and the Vitruve sheet build on.
- Hunt for silent data loss: any corpus string whose parse+format drops characters fails NFR-002.
- Verify the fixture diff item-by-item for azarius (the messiest character) rather than trusting the script.
- Confirm no `firestore.rules` changes and no UI-file changes snuck in.
