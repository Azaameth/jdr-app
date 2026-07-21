# Contract: Data Layer — Equipment Stat Effects

Locked TS API surface for this mission. Implementation tasks (`/spec-kitty.tasks`) cite this file instead of re-deriving signatures.

## 1. Type extension — `src/models/types/Inventory.ts`

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

No other type in `Inventory.ts` changes.

## 2. Pure aggregation function — `src/utils/effectiveStats.ts` (NEW)

```ts
import type { WeaponArmorItem } from '../models/types/Inventory'

export type EffectiveStatTarget = 'maxHp' | 'maxMana'

/**
 * Sums statBonus.amount across every equipped item targeting `stat`, added
 * to `baseValue`. Ignores damageBonus/armorRating/statNote entirely. No Vue,
 * no Firestore — must stay importable from a plain unit test.
 */
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

**Contract guarantees**:
- Never throws (NFR-001) — an empty `items` array, an item with no `statBonus`, or an unequipped item all resolve to `bonus = 0` for that item.
- Pure: no side effects, no reads of module-scope state, deterministic for given inputs.
- Does not clamp or round — caller is responsible for any display-layer formatting (none expected; both `baseValue` and `amount` are already whole numbers by existing convention).

## 3. Store extension — `src/controllers/useInventoryStore.ts`

New exports, additive to the existing factory return (all current exports unchanged):

```ts
const childInventories = ref<Record<string, CharacterInventory>>({})

async function loadChildInventories(childIds: string[], campaignId: string): Promise<void> { /* see data-model.md */ }

// added to the factory's returned object:
return {
  // ...existing exports unchanged...
  childInventories: computed(() => childInventories.value),
  loadChildInventories,
}
```

**Contract guarantees**:
- `if (!db) return` no-op, consistent with every other store/repository function (`loadChildInventories` resolves immediately, `childInventories` stays `{}`).
- Does not mutate or alias the existing `inventory` ref.
- `loadChildInventories` is idempotent — calling it again with the same `childIds` simply re-fetches and replaces the cache; safe to call on every character-page load (mirrors how `listChildrenOf` is already re-fetched on every load in `PlayerView.vue`).

## 4. Consumption sites (display work package — no new exported API, listed for traceability)

- `VitruveSheet.vue`: `computed(() => computeEffectiveMaxStat(session.value?.maxHp ?? 0, [...weapons, ...armor], 'maxHp'))` (and the `maxMana` equivalent), where `weapons`/`armor` come from the existing `useInventoryStore().inventory`.
- `ChildSheetTab.vue`: same shape, but `weapons`/`armor` come from `useInventoryStore().childInventories.value[props.child.id]`.
- Both existing `disabled` computeds (`VitruveSheet.vue:44,49,59`; `ChildSheetTab.vue:104-105`) switch their `maxHp`/`maxMana` comparison from the raw `session.maxHp`/`maxMana` to the new effective-max computed value.

## 5. Unaffected surfaces (explicitly out of contract)

- `InventoryRepository.ts` — no signature changes; `getInventoryByCharacterId`/`updateInventoryEquipment` are already generic enough.
- `useInventoryStore`'s existing `saveEquipmentItem`/`removeEquipmentItem` — no signature changes; they already accept/write full `WeaponArmorItem` objects, so the two new optional fields pass through untouched.
- `firestore.rules` — no changes (existing `inventories` match block already covers the whole document).
- `jetFormula.ts` / `JetCalculator.vue` — untouched; roll-total bonuses are explicitly out of scope (C-001).
