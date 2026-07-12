import { ref } from 'vue'
import { listCharactersByCampaign } from '../models/repositories/CharacterRepository'

// Cache: campaignId → characterId for the current user
const cache = ref<Record<string, string>>({})

export function usePlayerStore() {
  /**
   * Returns the characterId owned by `ownerUid` in the given campaign.
   * Matches on character.ownerUid — works with both real auth UIDs and dev slugs.
   */
  async function resolveCharacterId(ownerUid: string, campaignId: string): Promise<string | null> {
    if (cache.value[campaignId]) return cache.value[campaignId]
    const characters = await listCharactersByCampaign(campaignId)
    const match = characters.find((c) => c.ownerUid === ownerUid)
    if (match) cache.value[campaignId] = match.id
    return match?.id ?? null
  }

  return { resolveCharacterId, cache }
}
