# Data Model: Equipment Stat Effects

## Entity: `WeaponArmorItem` (extended)

`src/models/types/Inventory.ts` — existing interface, two new optional-with-default fields:

```ts
export interface WeaponArmorItem {
  itemId: string
  name: string
  damageDie?: 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20'
  damageBonus?: number
  armorRating?: number
  statNote?: string
  equipped?: boolean                                        // NEW — FR-001, default false when absent
  statBonus?: { stat: 'maxHp' | 'maxMana'; amount: number }  // NEW — FR-002
}
```

**Validation rules**:
- `equipped` absent or `false` ⇒ item never contributes, regardless of `statBonus` (FR-001, invariant in spec.md).
- `statBonus.stat` is a closed union of exactly `'maxHp' | 'maxMana'` — no other target is valid this mission (C-001).
- `statBonus` absent ⇒ item contributes 0 to every stat (FR-007's edge case: an item with only `statNote` contributes nothing).
- `damageBonus`, `armorRating`, `statNote` are unchanged in shape and meaning — never read by the new aggregation logic (C-004, research.md D4).

**No migration required**: both new fields are optional; existing Firestore documents and seed fixtures remain valid without a backfill (mirrors how `InventoryItem.equipped?` was introduced additively in the prior inventory mission).

## Derived value: Effective max stat (not persisted)

Not a stored entity — a pure computation over existing data, per FR-003/FR-006:

```
effectiveMax(character, stat) =
  character.session[stat]                                  // base, e.g. CharacterSessionState.maxHp
  + Σ item.statBonus.amount
      for item in character.inventory.weapons ++ character.inventory.armor
      where item.equipped === true
        and item.statBonus?.stat === stat
```

- **Inputs**: `CharacterSessionState.maxHp`/`maxMana` (`src/models/types/Participant.ts:17,19`, unchanged), and a `WeaponArmorItem[]` (weapons + armor concatenated).
- **Output**: a `number`, recomputed on every read — never written back to Firestore, never cached beyond a component's `computed()` (FR-006: "a pure derived computation, not a value that needs separate persistence or migration").
- **Scope isolation** (FR-005): the `items` input for a parent character is `useInventoryStore().inventory.value` (weapons+armor); for a child/transformation it is `useInventoryStore().childInventories.value[child.id]` (weapons+armor) — never mixed.

## Entity: `CharacterInventory` (unchanged shape, new access pattern)

`src/models/types/Inventory.ts` — no field changes. What changes is *how many* of these a session holds in memory at once:

```ts
export interface CharacterInventory {
  id: string
  uid: string
  campaignId: string
  characterId: string   // already generic — works identically for a parent or a child characterId
  items: InventoryItem[]
  weapons: WeaponArmorItem[]
  armor: WeaponArmorItem[]
  createdAt?: string
  updatedAt?: string
}
```

## Store extension: `useInventoryStore` (IC-03)

New state, additive to the existing singleton `inventory` ref (unchanged):

```ts
const childInventories = ref<Record<string, CharacterInventory>>({})

async function loadChildInventories(childIds: string[], campaignId: string): Promise<void> {
  if (!db) return
  const results = await Promise.all(
    childIds.map((id) => getInventoryByCharacterId(id, campaignId)),
  )
  const next: Record<string, CharacterInventory> = {}
  childIds.forEach((id, i) => {
    const inv = results[i]
    if (inv) next[id] = inv
  })
  childInventories.value = next
}
```

- Keyed by `characterId` (the child's own ID), one entry per child that actually has an inventory doc.
- A child with no `CharacterInventory` doc yet simply has no entry ⇒ `effectiveMax` falls back to `items = []` ⇒ contributes 0, same as the "no equipped bonus items" edge case (NFR-001's no-op-safe posture).
- Does not replace or alias the existing `inventory` ref — both coexist, so the parent's own inventory UI (`BackpackGrid.vue`, `WeaponArmorList.vue`) is unaffected.

## State transitions

None — this feature introduces no new persisted state machine. `equipped`/`statBonus` are written through the *existing* `updateInventoryEquipment` repository function (already generic over `WeaponArmorItem[]`) via the *existing* `saveEquipmentItem`/`removeEquipmentItem` store methods — no new write path is needed since C-003 excludes a guided authoring UI this mission (bonuses are set via seed fixtures or `RawCharacterEditor.vue`'s raw-JSON editor, both of which already write arbitrary `WeaponArmorItem` shapes).
