import { computed, ref } from 'vue'
import { useCampaignRulesStore } from './useCampaignRulesStore'
import {
  getInventoryByCharacterId,
  updateInventoryEquipment,
  updateInventoryGold,
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

function getInventoryLimits() {
  const rulesStore = useCampaignRulesStore()
  return rulesStore.inventory.value
}

const OTHER_SLOT_LABELS: Record<InventoryCategory, string> = {
  nourriture: 'Nourriture',
  munitions: 'Munitions',
  bivouac: 'Matériel de camp',
  soins: 'Matériel de soin',
  potions: 'Potions',
  quete: 'Quête',
  speciaux: 'Spéciaux',
  docs: 'Documents',
  gemmes: 'Gemmes',
  butin: 'Butin',
}

function getOtherSlotLimit(category: InventoryCategory): number | null {
  const limits = getInventoryLimits()
  if (!limits || !limits.Other?.length) return null

  const label = OTHER_SLOT_LABELS[category]
  const match = limits.Other.find((group) => group.name === label)
  return match ? match.slots : null
}

function getOtherSlotLabel(category: InventoryCategory): string {
  return OTHER_SLOT_LABELS[category] ?? category
}

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
      const otherSlotLimit = getOtherSlotLimit(item.category)
      const maxSlots = otherSlotLimit ?? BACKPACK_MAX_SLOTS[item.category]

      if (filledCount >= maxSlots) {
        if (otherSlotLimit === null) {
          error.value = CATEGORY_FULL_ERROR
          return false
        }

        const displayName = getOtherSlotLabel(item.category)
        error.value = `Capacité de ${displayName} atteinte : ${filledCount}/${maxSlots}.`
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
      const success = await updateInventoryItems(current.campaignId, current.characterId, nextItems)
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
      const success = await updateInventoryItems(current.campaignId, current.characterId, nextItems)
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
    const limits = getInventoryLimits()

    if (isNew && kind === 'weapons' && limits && existingList.length >= limits.nbSlotWeapon) {
      error.value = `Capacité d'armes atteinte : ${existingList.length}/${limits.nbSlotWeapon}.`
      return false
    }

    if (isNew && kind === 'armor' && limits && existingList.length >= limits.nbSlotArmor) {
      error.value = `Capacité d'armures atteinte : ${existingList.length}/${limits.nbSlotArmor}.`
      return false
    }

    const nextList = isNew
      ? [...existingList, finalItem]
      : existingList.map((i) => (i.itemId === finalItem.itemId ? finalItem : i))

    try {
      const success = await updateInventoryEquipment(current.campaignId, current.characterId, kind, nextList)
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
      const success = await updateInventoryEquipment(current.campaignId, current.characterId, kind, nextList)
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

  async function setGold(gold: number): Promise<boolean> {
    error.value = null

    if (!inventory.value) {
      error.value = NO_INVENTORY_ERROR
      return false
    }

    const current = inventory.value

    try {
      const success = await updateInventoryGold(current.campaignId, current.characterId, gold)
      if (!success) {
        error.value = "Erreur lors de l'enregistrement de l'or."
        return false
      }
      inventory.value = { ...current, gold }
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'or."
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
    setGold,
    freeSlots,
    loadChildInventories,
  }
}
