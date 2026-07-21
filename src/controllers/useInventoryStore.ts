import { computed, ref } from 'vue'
import {
  getInventoryByCharacterId,
  updateInventoryEquipment,
  updateInventoryItems,
} from '../models/repositories/InventoryRepository'
import {
  BACKPACK_MAX_SLOTS,
  type CharacterInventory,
  type InventoryCategory,
  type InventoryItem,
  type WeaponArmorItem,
} from '../models/types/Inventory'

const inventory = ref<CharacterInventory | null>(null)
const childInventories = ref<Record<string, CharacterInventory>>({})
const loading = ref(false)
const error = ref<string | null>(null)

const NO_INVENTORY_ERROR = "Aucun inventaire chargé pour ce personnage."
const CATEGORY_FULL_ERROR = 'Catégorie pleine : aucun emplacement libre.'

export function useInventoryStore() {
  async function loadInventory(
    characterId: string,
    campaignId: string,
  ): Promise<CharacterInventory | null> {
    loading.value = true
    error.value = null

    try {
      const result = await getInventoryByCharacterId(characterId, campaignId)
      inventory.value = result
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur lors du chargement de l'inventaire."
      return null
    } finally {
      loading.value = false
    }
  }

  async function saveBackpackItem(
    item: Omit<InventoryItem, 'itemId'> & { itemId?: string },
  ): Promise<boolean> {
    error.value = null

    if (!inventory.value) {
      error.value = NO_INVENTORY_ERROR
      return false
    }

    const current = inventory.value
    const isNew = !item.itemId

    if (isNew) {
      const filledCount = current.items.filter((i) => i.category === item.category).length
      if (filledCount >= BACKPACK_MAX_SLOTS[item.category]) {
        error.value = CATEGORY_FULL_ERROR
        return false
      }
    }

    const finalItem: InventoryItem = {
      ...item,
      itemId: item.itemId ?? crypto.randomUUID(),
    }

    const nextItems = isNew
      ? [...current.items, finalItem]
      : current.items.map((i) => (i.itemId === finalItem.itemId ? finalItem : i))

    try {
      const success = await updateInventoryItems(current.id, nextItems)
      if (!success) {
        error.value = "Erreur lors de l'enregistrement de l'objet."
        return false
      }
      inventory.value = { ...current, items: nextItems }
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'objet."
      return false
    }
  }

  async function removeBackpackItem(itemId: string): Promise<boolean> {
    error.value = null

    if (!inventory.value) {
      error.value = NO_INVENTORY_ERROR
      return false
    }

    const current = inventory.value
    const nextItems = current.items.filter((i) => i.itemId !== itemId)

    try {
      const success = await updateInventoryItems(current.id, nextItems)
      if (!success) {
        error.value = "Erreur lors de la suppression de l'objet."
        return false
      }
      inventory.value = { ...current, items: nextItems }
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur lors de la suppression de l'objet."
      return false
    }
  }

  async function saveEquipmentItem(
    kind: 'weapons' | 'armor',
    item: Omit<WeaponArmorItem, 'itemId'> & { itemId?: string },
  ): Promise<boolean> {
    error.value = null

    if (!inventory.value) {
      error.value = NO_INVENTORY_ERROR
      return false
    }

    const current = inventory.value
    const finalItem: WeaponArmorItem = {
      ...item,
      itemId: item.itemId ?? crypto.randomUUID(),
    }

    const existingList = current[kind]
    const isNew = !existingList.some((i) => i.itemId === finalItem.itemId)
    const nextList = isNew
      ? [...existingList, finalItem]
      : existingList.map((i) => (i.itemId === finalItem.itemId ? finalItem : i))

    try {
      const success = await updateInventoryEquipment(current.id, kind, nextList)
      if (!success) {
        error.value = "Erreur lors de l'enregistrement de l'équipement."
        return false
      }
      inventory.value = { ...current, [kind]: nextList }
      return true
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'équipement."
      return false
    }
  }

  async function removeEquipmentItem(kind: 'weapons' | 'armor', itemId: string): Promise<boolean> {
    error.value = null

    if (!inventory.value) {
      error.value = NO_INVENTORY_ERROR
      return false
    }

    const current = inventory.value
    const nextList = current[kind].filter((i) => i.itemId !== itemId)

    try {
      const success = await updateInventoryEquipment(current.id, kind, nextList)
      if (!success) {
        error.value = "Erreur lors de la suppression de l'équipement."
        return false
      }
      inventory.value = { ...current, [kind]: nextList }
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur lors de la suppression de l'équipement."
      return false
    }
  }

  function freeSlots(category: InventoryCategory): number {
    const filledCount = inventory.value?.items.filter((i) => i.category === category).length ?? 0
    return Math.max(0, BACKPACK_MAX_SLOTS[category] - filledCount)
  }

  async function loadChildInventories(childIds: string[], campaignId: string): Promise<void> {
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

  return {
    inventory: computed(() => inventory.value),
    childInventories: computed(() => childInventories.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    loadInventory,
    saveBackpackItem,
    removeBackpackItem,
    saveEquipmentItem,
    removeEquipmentItem,
    freeSlots,
    loadChildInventories,
  }
}
