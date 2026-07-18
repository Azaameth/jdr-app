# Data Model — Inventory Slots & Dons System

Phase 1 output. This is the concrete materialization of the locked contract (`NEXTSTEPS.md` § "Typed inventory schema") plus the gift enrichment. The authoritative API surface is `contracts/data-layer.md`; this file explains entities, validation, and invariants.

## Entities

### InventoryCategory (union) + BACKPACK_MAX_SLOTS (constant)

```ts
export type InventoryCategory =
  | 'nourriture' | 'munitions' | 'bivouac' | 'soins' | 'potions'
  | 'quete' | 'speciaux' | 'docs' | 'gemmes' | 'butin'

export const BACKPACK_MAX_SLOTS: Record<InventoryCategory, number> = {
  nourriture: 1, munitions: 2, quete: 7, speciaux: 7, docs: 9,
  gemmes: 9, bivouac: 15, soins: 15, potions: 15, butin: 16,
}
```

Verified against `legacy-reference/index.html:3176-3186`. Fixed game rules — not user-configurable, not stored per-doc.

### InventoryItem (backpack item — extended existing type)

```ts
export interface InventoryItem {
  itemId: string
  name: string
  quantity: number          // 1 when legacy string had no ×N
  category: InventoryCategory   // NEW, required
  equipped?: boolean            // kept for compatibility with existing docs
}
```

### WeaponArmorItem (new)

```ts
export interface WeaponArmorItem {
  itemId: string
  name: string
  damageDie?: 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20'
  damageBonus?: number   // the "+4" / "−1" part
  armorRating?: number   // the "RD2" part
  statNote?: string      // anything that doesn't reduce to the above
}
```

`itemId` added relative to the NEXTSTEPS sketch for stable list keys/edits, consistent with `InventoryItem.itemId`. All stat fields optional; an item may have only `statNote`, or none at all.

### CharacterInventory (extended existing type)

```ts
export interface CharacterInventory {
  uid: string
  campaignId: string
  characterId: string
  items: InventoryItem[]        // backpack only (categorized, capped)
  weapons: WeaponArmorItem[]    // NEW — uncapped
  armor: WeaponArmorItem[]      // NEW — uncapped
  createdAt?: string
  updatedAt?: string
}
```

Repository mapper defaults `weapons`/`armor` to `[]` when absent (pre-migration docs), same `Array.isArray` guard as `items`.

### CharacterGift (enriched existing type, on `characters/{id}.gifts[]`)

```ts
export interface CharacterGift {
  id: string
  name: string               // display name, may keep leading emoji
  description: string        // real multi-line flavor text (\n preserved)
  manaCost?: number          // numeric cost when it is a plain number
  manaNote?: string          // NEW — formula/freeform cost: 'X', '2+(1/5m)', 'Tout'
  damageDice?: string        // NEW — freeform: '1D10', '1D6+1D8', absent for passives
  damageBonus?: number       // NEW — signed; absent/0 for passives
  cooldown?: string
  source?: 'race' | 'class' | 'story' | 'item'
}
```

### Retired

`src/models/types/Character.ts:43-52` — the unused `InventoryItem` / `InventoryItemType` duplicate declarations are deleted (spec C-004; confirmed unreferenced by grep).

## Validation rules & invariants

- **Cap invariant**: for every category `c`, `items.filter(i => i.category === c).length ≤ BACKPACK_MAX_SLOTS[c]`. Enforced in the store mutation path (reject with French error when full); empty-slot count is always computed (`max − filled`), never stored.
- **Losslessness invariant** (NFR-002): for any legacy string `s`, `format(parse(s))` preserves all information of `s`. Structured fields are extracted only when unambiguous; everything else lands in `statNote` verbatim. The unit-test corpus must include: `(D4/−1)`, `(D10/+4)`, `(RD2)`, `(RD2 vs proj. magiques)`, `(vs proj. magiques)`, `(Armure impossible — Oracle)`, `Kit médical ×4`, bare names.
- **Passive-gift rule** (FR-010): a gift with no `damageDice`, no `manaCost`, and no `manaNote` is a passive; UI renders "—" tiles, no badges. Never synthesize `0` values during migration.
- **No-backend rule** (NFR-001): every new repository function begins `if (!db) return <null/false/no-op>`; store surfaces the French fallback error only for user-initiated writes, silent read degradation otherwise (matches existing stores).
- **Permissions** (FR-009): writes go through the existing `inventories` rule (`firestore.rules:119-127` — owner `uid` or mj/admin). UI hides edit affordances for other users; gifts follow existing `characters` write rules (mj/admin-managed content).

## State transitions

Inventory doc lifecycle is trivial (exists per seeded character; updated in place; `updatedAt` refreshed on every write). No multi-step workflow states. Slot edit = read-modify-write of the relevant array via the store; last-write-wins is acceptable at hobby-table scale (documented trade-off, mirrors existing participant session writes).
