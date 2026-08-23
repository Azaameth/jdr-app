import { computed, ref } from 'vue'
import {
  getCharacterState,
  setCharacterState,
  subscribeCharacterState,
  updateCharacterState,
  type CharacterStateDocument,
} from '../models/repositories/CharacterStateRepository'

const emptyState: CharacterStateDocument = {
  Health: 0,
  HealthCurrent: 0,
  Mana: 0,
  ManaCurrent: 0,
  PhysicalArmor: 0,
  PhysicalArmorCurrent: 0,
  MagicalArmor: 0,
  MagicalArmorCurrent: 0,
  PhysicalAttack: 0,
  MagicalAttack: 0,
  PhysicalDefense: 0,
  MagicalDefense: 0,
  PlayerId: '',
  CampaignId: '',
}

const state = ref<CharacterStateDocument>(emptyState)
const loading = ref(false)
const error = ref<string | null>(null)
const currentCampaignId = ref<string | null>(null)
const currentCharacterId = ref<string | null>(null)
let unsubscribeFn: (() => void) | null = null

export function useCharacterStateStore() {
  function subscribe(campaignId: string, characterId: string): void {
    if (currentCampaignId.value === campaignId && currentCharacterId.value === characterId && unsubscribeFn) {
      return
    }

    if (unsubscribeFn) {
      unsubscribeFn()
      unsubscribeFn = null
    }

    currentCampaignId.value = campaignId
    currentCharacterId.value = characterId
    error.value = null

    unsubscribeFn = subscribeCharacterState(campaignId, characterId, (nextState) => {
      state.value = nextState ?? { ...emptyState, CampaignId: campaignId, PlayerId: '' }
    })
  }

  function unsubscribe(): void {
    if (unsubscribeFn) {
      unsubscribeFn()
      unsubscribeFn = null
    }
    currentCampaignId.value = null
    currentCharacterId.value = null
    state.value = { ...emptyState }
  }

  async function fetch(campaignId: string, characterId: string): Promise<CharacterStateDocument | null> {
    loading.value = true
    error.value = null

    try {
      const nextState = await getCharacterState(campaignId, characterId)
      if (nextState) {
        state.value = nextState
      }
      return nextState
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors du chargement de l’état du personnage.'
      return null
    } finally {
      loading.value = false
    }
  }

  async function save(partial: Partial<CharacterStateDocument>): Promise<void> {
    error.value = null

    try {
      if (!currentCampaignId.value || !currentCharacterId.value) {
        return
      }

      await setCharacterState(currentCampaignId.value, currentCharacterId.value, partial)
      state.value = { ...state.value, ...partial }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde de l’état du personnage.'
    }
  }

  async function patch(partial: Partial<CharacterStateDocument>): Promise<void> {
    error.value = null

    try {
      if (!currentCampaignId.value || !currentCharacterId.value) {
        return
      }

      await updateCharacterState(currentCampaignId.value, currentCharacterId.value, partial)
      state.value = { ...state.value, ...partial }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors de la mise à jour de l’état du personnage.'
    }
  }

  return {
    state: computed(() => state.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    currentCampaignId: computed(() => currentCampaignId.value),
    currentCharacterId: computed(() => currentCharacterId.value),
    subscribe,
    unsubscribe,
    fetch,
    save,
    patch,
  }
}
