# Contract — Data-Layer API Surface (locked)

This is the stable surface WP implementers cite. No REST/GraphQL layer exists — the app talks to Firestore through repositories; the "contract" is the exported TypeScript surface. Shapes are defined in `../data-model.md`; this file locks names and signatures.

## `src/utils/inventoryText.ts` (pure, no I/O)

```ts
/** '(D10/+4)' | '(RD2)' | '(RD2 vs proj. magiques)' | no annotation → structured + statNote fallback. Lossless. */
export function parseWeaponArmorText(raw: string): Omit<WeaponArmorItem, 'itemId'>

/** Inverse presentation: 'D10/+4', 'RD2', 'RD2 vs proj. magiques', '' when no stats. For badges. */
export function formatWeaponArmorStat(item: Pick<WeaponArmorItem, 'damageDie' | 'damageBonus' | 'armorRating' | 'statNote'>): string

/** 'Kit médical ×4' → { name: 'Kit médical', quantity: 4 }; 'Rations' → { name: 'Rations', quantity: 1 } */
export function parseQuantityText(raw: string): { name: string; quantity: number }

/** 'Turbo Fist — 2 mana / 1D10+2' | 'Maîtrise des Armes : relance 1×/combat' → name + structured gift fields. Lossless. */
export function parseLegacyGiftText(raw: string): Pick<CharacterGift, 'name' | 'manaCost' | 'manaNote' | 'damageDice' | 'damageBonus' | 'description'>
```

## `src/models/types/Inventory.ts`

Exports: `InventoryCategory`, `BACKPACK_MAX_SLOTS`, `InventoryItem`, `WeaponArmorItem`, `CharacterInventory` (see data-model.md). `src/models/types/Character.ts` exports the enriched `CharacterGift`; its dead `InventoryItem`/`InventoryItemType` are removed.

## `src/models/repositories/InventoryRepository.ts`

Existing (unchanged): `getInventoryByCharacterId(characterId, campaignId): Promise<CharacterInventory | null>` — mapper now defaults `weapons`/`armor` to `[]`.

New (each starts with `if (!db) return false`; each refreshes `updatedAt` ISO string):

```ts
/** Replace the backpack items array (store has already validated caps). */
export async function updateInventoryItems(inventoryId: string, items: InventoryItem[]): Promise<boolean>

/** Replace weapons or armor list. kind discriminates the field written. */
export async function updateInventoryEquipment(inventoryId: string, kind: 'weapons' | 'armor', list: WeaponArmorItem[]): Promise<boolean>
```

Whole-array replacement (not per-element patches) keeps the repository dumb and matches Firestore's array-field semantics; the store owns slot-level logic.

## `src/controllers/useInventoryStore.ts` (singleton composable, `usePlayerStore.ts` pattern)

```ts
export function useInventoryStore(): {
  inventory: ComputedRef<CharacterInventory | null>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>

  loadInventory(characterId: string, campaignId: string): Promise<CharacterInventory | null>

  /** Add or update a backpack item. Rejects (French error, returns false) when the category is full and item is new. */
  saveBackpackItem(item: Omit<InventoryItem, 'itemId'> & { itemId?: string }): Promise<boolean>
  removeBackpackItem(itemId: string): Promise<boolean>

  saveEquipmentItem(kind: 'weapons' | 'armor', item: Omit<WeaponArmorItem, 'itemId'> & { itemId?: string }): Promise<boolean>
  removeEquipmentItem(kind: 'weapons' | 'armor', itemId: string): Promise<boolean>

  /** max − filled for a category, from current state. */
  freeSlots(category: InventoryCategory): number
}
```

Error convention on every catch: `error.value = err instanceof Error ? err.message : '<French fallback>'`.

## Seed fixtures

- `scripts/data/inventories.json`: array of `CharacterInventory`-shaped docs (categorized `items`, `weapons`, `armor`).
- `scripts/data/characters.json`: `gifts[]` entries carry enriched `CharacterGift` fields; legacy `DONS_DATA` (`legacy-reference/index.html:3305-3348`) merged in; no `0`-synthesis for passives.
- `scripts/migrateInventoryFixtures.mjs`: one-shot generator that produced the above (kept as mapping documentation; safe to re-run — deterministic output).

## UI phase (consumes the above; listed for naming stability only)

Components: `AppModal.vue`, `BackpackGrid.vue`, `WeaponArmorList.vue`, `InventorySlotModal.vue`, `DonDetailModal.vue`. Props/emit shapes are decided in the UI work packages; they must consume the store API above rather than repositories directly.
