import { computed, ref } from 'vue'
import { listCharactersByCampaign } from '../models/repositories/CharacterRepository'
import {
  getParticipant,
  getParticipantByCharacterId,
  setParticipantPersonalNoteByCharacterId,
  setParticipantPersonalNoteByUid,
  setParticipantSessionByCharacterId,
} from '../models/repositories/ParticipantRepository'
import type { Participant, Posture } from '../models/types/Participant'

// Cache: campaignId → characterId for the current user
const cache = ref<Record<string, string>>({})
const error = ref<string | null>(null)

export function usePlayerStore() {
  async function setSessionResource(
    campaignId: string,
    characterId: string,
    resource: 'hp' | 'mana',
    targetValue: number,
  ): Promise<Participant | null> {
    error.value = null

    try {
      const participant = await getParticipantByCharacterId(characterId, campaignId)
      if (!participant) {
        return null
      }

      const maxValue = resource === 'hp' ? participant.session.maxHp : participant.session.maxMana
      const boundedMax = Math.max(0, maxValue)
      const normalized =
        resource === 'hp'
          ? Math.max(-boundedMax, Math.min(Math.trunc(targetValue), boundedMax))
          : Math.max(0, Math.min(Math.trunc(targetValue), boundedMax))

      return await setParticipantSessionByCharacterId(characterId, campaignId, {
        [resource]: normalized,
      })
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la session.'
      return null
    }
  }

  async function setSessionPosture(
    campaignId: string,
    characterId: string,
    posture: Posture,
  ): Promise<Participant | null> {
    error.value = null

    try {
      return await setParticipantSessionByCharacterId(characterId, campaignId, {
        posture,
      })
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la posture.'
      return null
    }
  }

  async function getPersonalNoteParticipant(
    campaignId: string,
    participantRef: string,
  ): Promise<Participant | null> {
    error.value = null

    try {
      const byCharacterId = await getParticipantByCharacterId(participantRef, campaignId)
      if (byCharacterId) return byCharacterId
      return await getParticipant(participantRef, campaignId)
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Erreur lors de la récupération de la note.'
      return null
    }
  }

  async function setPersonalNote(
    campaignId: string,
    participantRef: string,
    personalNote: string,
  ): Promise<Participant | null> {
    error.value = null

    try {
      const byCharacterId = await setParticipantPersonalNoteByCharacterId(
        participantRef,
        campaignId,
        personalNote,
      )
      if (byCharacterId) return byCharacterId

      return await setParticipantPersonalNoteByUid(participantRef, campaignId, personalNote)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la note.'
      return null
    }
  }

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
      error.value =
        err instanceof Error ? err.message : 'Erreur lors de la résolution du personnage.'
      return null
    }
  }

  return {
    resolveCharacterId,
    setSessionResource,
    setSessionPosture,
    getPersonalNoteParticipant,
    setPersonalNote,
    cache: computed(() => cache.value),
    error: computed(() => error.value),
  }
}
