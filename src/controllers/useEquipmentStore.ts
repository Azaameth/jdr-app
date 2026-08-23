import { computed, ref } from 'vue'
import { useCampaignRulesStore } from './useCampaignRulesStore'
import {
  equipItem as equipItemRepo,
  getEquipmentByCharacter,
  setEquipmentByCharacter,
  subscribeEquipmentByCharacter,
  unequipItem as unequipItemRepo,
  type CharacterEquipmentDocument,
  type GearEntry,
} from '../models/repositories/EquipmentRepository'
import {
  deleteBagItem,
  setBagItem,
  subscribeBagItemsByCharacter,
  type BagItemDocument,
} from '../models/repositories/ItemRepository'

export type EquipmentState = CharacterEquipmentDocument
export type GearKind = 'Armor' | 'Weapons'

const emptyEquipment: EquipmentState = {
  Armor: [],
  Weapons: [],
  Currency: 0,
  PlayerId: '',
  CampaignId: '',
}

const equipment = ref<EquipmentState>(emptyEquipment)
const items = ref<BagItemDocument[]>([])
const childEquipment = ref<Record<string, CharacterEquipmentDocument>>({})
const error = ref<string | null>(null)
const currentCampaignId = ref<string | null>(null)
const currentCharacterId = ref<string | null>(null)
let unsubscribeEquipment: (() => void) | null = null
let unsubscribeItems: (() => void) | null = null

const NO_TARGET_ERROR = 'Aucun équipement chargé pour ce personnage.'

function slotLimit(kind: GearKind, rulesStore: ReturnType<typeof useCampaignRulesStore>): number | null {
  return kind === 'Armor' ? rulesStore.maxArmorSlots.value : rulesStore.maxWeaponSlots.value
}

export function useEquipmentStore() {
  function subscribe(campaignId: string, characterId: string): void {
    if (
      currentCampaignId.value === campaignId &&
      currentCharacterId.value === characterId &&
      unsubscribeEquipment &&
      unsubscribeItems
    ) {
      return
    }

    if (unsubscribeEquipment) {
      unsubscribeEquipment()
      unsubscribeEquipment = null
    }

    if (unsubscribeItems) {
      unsubscribeItems()
      unsubscribeItems = null
    }

    currentCampaignId.value = campaignId
    currentCharacterId.value = characterId
    error.value = null

    unsubscribeEquipment = subscribeEquipmentByCharacter(campaignId, characterId, (nextEquipment) => {
      equipment.value = nextEquipment ?? { ...emptyEquipment, CampaignId: campaignId }
    })

    unsubscribeItems = subscribeBagItemsByCharacter(campaignId, characterId, (nextItems) => {
      items.value = nextItems
    })
  }

  function unsubscribe(): void {
    if (unsubscribeEquipment) {
      unsubscribeEquipment()
      unsubscribeEquipment = null
    }

    if (unsubscribeItems) {
      unsubscribeItems()
      unsubscribeItems = null
    }

    currentCampaignId.value = null
    currentCharacterId.value = null
    equipment.value = { ...emptyEquipment }
    items.value = []
  }

  /** Read-only equipment snapshot for a transformation's stat calc — no live listener, no bag. */
  async function loadChildEquipment(childIds: string[], campaignId: string): Promise<void> {
    const results = await Promise.all(
      childIds.map((id) => getEquipmentByCharacter(campaignId, id)),
    )
    const next: Record<string, CharacterEquipmentDocument> = {}
    childIds.forEach((id, i) => {
      const result = results[i]
      if (result) next[id] = result
    })
    childEquipment.value = next
  }

  async function saveBagItem(
    item: Omit<BagItemDocument, 'EntryId' | 'PlayerId' | 'CampaignId'> & { EntryId?: string },
  ): Promise<boolean> {
    error.value = null

    const campaignId = currentCampaignId.value
    const characterId = currentCharacterId.value
    if (!campaignId || !characterId) {
      error.value = NO_TARGET_ERROR
      return false
    }

    const isNew = !item.EntryId
    if (isNew) {
      const rulesStore = useCampaignRulesStore()
      const max = rulesStore.maxItems.value
      if (max !== null && items.value.length >= max) {
        error.value = `Capacité du sac atteinte : ${items.value.length}/${max}.`
        return false
      }
    }

    const entryId = item.EntryId ?? crypto.randomUUID()
    const payload: BagItemDocument = {
      ...item,
      EntryId: entryId,
      PlayerId: equipment.value.PlayerId,
      CampaignId: campaignId,
    }

    try {
      await setBagItem(campaignId, characterId, entryId, payload)
      items.value = isNew
        ? [...items.value, payload]
        : items.value.map((i) => (i.EntryId === entryId ? payload : i))
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'objet."
      return false
    }
  }

  async function removeBagItem(entryId: string): Promise<boolean> {
    error.value = null

    const campaignId = currentCampaignId.value
    const characterId = currentCharacterId.value
    if (!campaignId || !characterId) {
      error.value = NO_TARGET_ERROR
      return false
    }

    try {
      await deleteBagItem(campaignId, characterId, entryId)
      items.value = items.value.filter((i) => i.EntryId !== entryId)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur lors de la suppression de l'objet."
      return false
    }
  }

  async function saveEquippedItem(
    kind: GearKind,
    item: Omit<GearEntry, 'EntryId'> & { EntryId?: string },
  ): Promise<boolean> {
    error.value = null

    const campaignId = currentCampaignId.value
    const characterId = currentCharacterId.value
    if (!campaignId || !characterId) {
      error.value = NO_TARGET_ERROR
      return false
    }

    const existingList = equipment.value[kind]
    const isNew = !item.EntryId || !existingList.some((entry) => entry.EntryId === item.EntryId)

    if (isNew) {
      const rulesStore = useCampaignRulesStore()
      const max = slotLimit(kind, rulesStore)
      const label = kind === 'Armor' ? "d'armures" : "d'armes"
      if (max !== null && existingList.length >= max) {
        error.value = `Capacité ${label} atteinte : ${existingList.length}/${max}.`
        return false
      }
    }

    const entry: GearEntry = { ...item, EntryId: item.EntryId ?? crypto.randomUUID() }
    const nextList = isNew
      ? [...existingList, entry]
      : existingList.map((candidate) => (candidate.EntryId === entry.EntryId ? entry : candidate))

    try {
      await setEquipmentByCharacter(campaignId, characterId, { [kind]: nextList })
      equipment.value = { ...equipment.value, [kind]: nextList }
      return true
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'équipement."
      return false
    }
  }

  async function removeEquippedItem(kind: GearKind, entryId: string): Promise<boolean> {
    error.value = null

    const campaignId = currentCampaignId.value
    const characterId = currentCharacterId.value
    if (!campaignId || !characterId) {
      error.value = NO_TARGET_ERROR
      return false
    }

    const nextList = equipment.value[kind].filter((entry) => entry.EntryId !== entryId)

    try {
      await setEquipmentByCharacter(campaignId, characterId, { [kind]: nextList })
      equipment.value = { ...equipment.value, [kind]: nextList }
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur lors de la suppression de l'équipement."
      return false
    }
  }

  /** Moves a bag item into Equipment/Main (§5.3), transactionally. */
  async function equip(kind: GearKind, entryId: string): Promise<boolean> {
    error.value = null

    const campaignId = currentCampaignId.value
    const characterId = currentCharacterId.value
    if (!campaignId || !characterId) {
      error.value = NO_TARGET_ERROR
      return false
    }

    const rulesStore = useCampaignRulesStore()
    const max = slotLimit(kind, rulesStore)
    const label = kind === 'Armor' ? "d'armures" : "d'armes"
    const currentCount = equipment.value[kind].length
    if (max !== null && currentCount >= max) {
      error.value = `Capacité ${label} atteinte : ${currentCount}/${max}.`
      return false
    }

    try {
      await equipItemRepo(campaignId, characterId, entryId, kind)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur lors de l'équipement de l'objet."
      return false
    }
  }

  /** Moves an equipped item back into the bag (§5.3), transactionally. */
  async function unequip(kind: GearKind, entryId: string): Promise<boolean> {
    error.value = null

    const campaignId = currentCampaignId.value
    const characterId = currentCharacterId.value
    if (!campaignId || !characterId) {
      error.value = NO_TARGET_ERROR
      return false
    }

    const rulesStore = useCampaignRulesStore()
    const max = rulesStore.maxItems.value
    if (max !== null && items.value.length >= max) {
      error.value = `Capacité du sac atteinte : ${items.value.length}/${max}.`
      return false
    }

    try {
      await unequipItemRepo(campaignId, characterId, entryId, kind)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur lors du déséquipement de l'objet."
      return false
    }
  }

  async function setCurrency(value: number): Promise<boolean> {
    error.value = null

    const campaignId = currentCampaignId.value
    const characterId = currentCharacterId.value
    if (!campaignId || !characterId) {
      error.value = NO_TARGET_ERROR
      return false
    }

    try {
      await setEquipmentByCharacter(campaignId, characterId, { Currency: value })
      equipment.value = { ...equipment.value, Currency: value }
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur lors de l'enregistrement de la monnaie."
      return false
    }
  }

  return {
    equipment: computed(() => equipment.value),
    items: computed(() => items.value),
    childEquipment: computed(() => childEquipment.value),
    error: computed(() => error.value),
    currentCampaignId: computed(() => currentCampaignId.value),
    currentCharacterId: computed(() => currentCharacterId.value),
    subscribe,
    unsubscribe,
    loadChildEquipment,
    saveBagItem,
    removeBagItem,
    saveEquippedItem,
    removeEquippedItem,
    equip,
    unequip,
    setCurrency,
  }
}
