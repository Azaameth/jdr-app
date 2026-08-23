import { computed, ref } from 'vue'
import {
  getEquipmentByCharacter,
  setEquipmentByCharacter,
  subscribeEquipmentByCharacter,
  type CharacterEquipmentDocument,
} from '../models/repositories/EquipmentRepository'
import {
  deleteBagItem,
  listBagItemsByCharacter,
  setBagItem,
  subscribeBagItemsByCharacter,
  type BagItemDocument,
} from '../models/repositories/ItemRepository'

export type EquipmentState = CharacterEquipmentDocument

const emptyEquipment: EquipmentState = {
  Armor: [],
  Weapons: [],
  Currency: 0,
  PlayerId: '',
  CampaignId: '',
}

const equipment = ref<EquipmentState>(emptyEquipment)
const items = ref<BagItemDocument[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const currentCampaignId = ref<string | null>(null)
const currentCharacterId = ref<string | null>(null)
let unsubscribeEquipment: (() => void) | null = null
let unsubscribeItems: (() => void) | null = null

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

  async function fetch(campaignId: string, characterId: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const nextEquipment = await getEquipmentByCharacter(campaignId, characterId)
      if (nextEquipment) {
        equipment.value = nextEquipment
      }

      const nextItems = await listBagItemsByCharacter(campaignId, characterId)
      items.value = nextItems
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors du chargement de l’équipement.'
    } finally {
      loading.value = false
    }
  }

  async function saveEquipment(partial: Partial<EquipmentState>): Promise<void> {
    error.value = null

    try {
      if (!currentCampaignId.value || !currentCharacterId.value) {
        return
      }

      await setEquipmentByCharacter(currentCampaignId.value, currentCharacterId.value, partial)
      equipment.value = { ...equipment.value, ...partial } as EquipmentState
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde de l’équipement.'
    }
  }

  async function saveItem(itemId: string, payload: Partial<BagItemDocument>): Promise<void> {
    error.value = null

    try {
      if (!currentCampaignId.value || !currentCharacterId.value) {
        return
      }

      await setBagItem(currentCampaignId.value, currentCharacterId.value, itemId, payload)
      const normalizedPayload: Partial<BagItemDocument> = {
        ...payload,
        EntryId: payload.EntryId ?? itemId,
      }

      const nextItems = items.value.some((entry) => entry.EntryId === itemId)
        ? items.value.map((entry) => (entry.EntryId === itemId ? { ...entry, ...normalizedPayload } : entry))
        : [...items.value, { ...normalizedPayload, Quantity: normalizedPayload.Quantity ?? 1 } as BagItemDocument]

      items.value = nextItems
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde de l’objet.'
    }
  }

  async function removeItem(itemId: string): Promise<void> {
    error.value = null

    try {
      if (!currentCampaignId.value || !currentCharacterId.value) {
        return
      }

      await deleteBagItem(currentCampaignId.value, currentCharacterId.value, itemId)
      items.value = items.value.filter((entry) => entry.EntryId !== itemId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors de la suppression de l’objet.'
    }
  }

  return {
    equipment: computed(() => equipment.value),
    items: computed(() => items.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    currentCampaignId: computed(() => currentCampaignId.value),
    currentCharacterId: computed(() => currentCharacterId.value),
    subscribe,
    unsubscribe,
    fetch,
    saveEquipment,
    saveItem,
    removeItem,
  }
}
