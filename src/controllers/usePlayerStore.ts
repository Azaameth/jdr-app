import { computed, ref } from 'vue'
import { listCharactersByCampaign } from '../models/repositories/CharacterRepository'

// Cache: campaignId → characterId for the current user
const cache = ref<Record<string, string>>({})
const error = ref<string | null>(null)

export function usePlayerStore() {
  /**
   * Returns the characterId owned by `ownerUid` in the given campaign.
   * Matches on character.ownerUid — works with both real auth UIDs and dev slugs.
   */
  async function resolveCharacterId(ownerUid: string, campaignId: string): Promise<string | null> {
    if (cache.value[campaignId]) return cache.value[campaignId]
    error.value = null
    try {
      const characters = await listCharactersByCampaign(campaignId)
      const match = characters.find((c) => c.ownerUid === ownerUid)
      if (match) cache.value[campaignId] = match.id
      return match?.id ?? null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors de la résolution du personnage.'
      return null
    }
  }

  return {
    resolveCharacterId,
    cache: computed(() => cache.value),
    error: computed(() => error.value),
  }
}
