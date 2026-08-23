import { computed, ref } from 'vue'
import { listCharactersByCampaign } from '../models/repositories/CharacterRepository'
import {
  getParticipant,
  getParticipantByCharacterId,
  setParticipantSessionByCharacterId,
  subscribeParticipantsByCampaign,
  updateChildSession,
  updateSessionFields,
} from '../models/repositories/ParticipantRepository'
import {
  getParticipantNote,
  setParticipantNote,
} from '../models/repositories/ParticipantNoteRepository'
import type { CharacterProfile } from '../models/types/Character'
import type {
  CharacterSessionState,
  Participant,
  Posture,
  SecondaryAttributeName,
} from '../models/types/Participant'

// Cache: campaignId → characterId for the current user
const cache = ref<Record<string, string>>({})
const error = ref<string | null>(null)

// "État du groupe" (party) live state — populated by subscribeParty.
const partyCampaignId = ref<string | null>(null)
const partyParticipants = ref<Participant[]>([])
const partyCharacters = ref<CharacterProfile[]>([])
let unsubscribeParticipants: (() => void) | null = null

export function usePlayerStore() {
  async function setSessionResource(
    campaignId: string,
    characterId: string,
    resource: 'hp' | 'mana',
    targetValue: number,
    // Equipment can raise max HP/Mana above the stored raw session value
    // (equipment-stat-effects). Callers that know the character's effective
    // max (e.g. PlayerView.vue, via computeEffectiveMaxStat) should pass it
    // here so the server-side clamp doesn't silently re-cap the write back
    // down to the raw stored max. Falls back to the raw stored max for any
    // caller that doesn't have equipment data on hand.
    maxOverride?: number,
  ): Promise<Participant | null> {
    error.value = null

    try {
      const participant = await getParticipantByCharacterId(characterId, campaignId)
      if (!participant) {
        return null
      }

      const rawMax = resource === 'hp' ? participant.session.maxHp : participant.session.maxMana
      const maxValue = maxOverride ?? rawMax
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

  async function resolveParticipant(
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
        err instanceof Error ? err.message : 'Erreur lors de la résolution du participant.'
      return null
    }
  }

  async function getPersonalNote(participantId: string): Promise<string> {
    error.value = null

    try {
      return await getParticipantNote(participantId)
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Erreur lors de la récupération de la note.'
      return ''
    }
  }

  async function setPersonalNote(participantId: string, personalNote: string): Promise<void> {
    error.value = null

    try {
      await setParticipantNote(participantId, personalNote)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la note.'
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

  async function setInjury(
    characterId: string,
    attr: SecondaryAttributeName,
    state: 'jaune' | 'rouge' | null,
  ): Promise<void> {
    error.value = null

    try {
      if (!partyCampaignId.value) return
      const participant = await getParticipantByCharacterId(characterId, partyCampaignId.value)
      if (!participant) return

      const nextInjuries = { ...participant.session.injuries }
      if (state === null) {
        delete nextInjuries[attr]
      } else {
        nextInjuries[attr] = state
      }

      await updateSessionFields(partyCampaignId.value, participant.id, { injuries: nextInjuries })
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Impossible de mettre à jour l'état de session."
    }
  }

  async function setAdvantage(characterId: string, value: boolean): Promise<void> {
    error.value = null

    try {
      if (!partyCampaignId.value) return
      const participant = await getParticipantByCharacterId(characterId, partyCampaignId.value)
      if (!participant) return

      await updateSessionFields(partyCampaignId.value, participant.id, { advantage: value })
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Impossible de mettre à jour l'état de session."
    }
  }

  async function setDisadvantage(characterId: string, value: boolean): Promise<void> {
    error.value = null

    try {
      if (!partyCampaignId.value) return
      const participant = await getParticipantByCharacterId(characterId, partyCampaignId.value)
      if (!participant) return

      await updateSessionFields(partyCampaignId.value, participant.id, { disadvantage: value })
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Impossible de mettre à jour l'état de session."
    }
  }

  async function setChildVitals(
    parentCharacterId: string,
    childCharacterId: string,
    fields: Partial<CharacterSessionState>,
  ): Promise<void> {
    error.value = null

    try {
      if (!partyCampaignId.value) return
      const participant = await getParticipantByCharacterId(
        parentCharacterId,
        partyCampaignId.value,
      )
      if (!participant) return

      await updateChildSession(partyCampaignId.value, participant.id, childCharacterId, fields)
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Impossible de mettre à jour l'état de session."
    }
  }

  /**
   * Idempotent attach to a campaign's live participant roster (état du groupe).
   * Re-calling with the same campaignId is a no-op; a different campaignId
   * detaches the previous listener first so subscriptions never stack.
   */
  function subscribeParty(campaignId: string): void {
    if (partyCampaignId.value === campaignId && unsubscribeParticipants) {
      return
    }

    if (unsubscribeParticipants) {
      unsubscribeParticipants()
      unsubscribeParticipants = null
    }

    partyCampaignId.value = campaignId
    error.value = null

    listCharactersByCampaign(campaignId)
      .then((list) => {
        partyCharacters.value = list
      })
      .catch((err) => {
        error.value =
          err instanceof Error ? err.message : 'Erreur lors du chargement des personnages.'
      })

    unsubscribeParticipants = subscribeParticipantsByCampaign(campaignId, (list) => {
      partyParticipants.value = list
    })
  }

  function unsubscribeParty(): void {
    if (unsubscribeParticipants) {
      unsubscribeParticipants()
      unsubscribeParticipants = null
    }
    partyCampaignId.value = null
    partyParticipants.value = []
    partyCharacters.value = []
  }

  const party = computed(() => {
    const charactersById = new Map(partyCharacters.value.map((c) => [c.id, c]))
    const entries: Array<{ character: CharacterProfile; session: CharacterSessionState }> = []

    for (const participant of partyParticipants.value) {
      if (participant.status !== 'Approved') continue
      const character = charactersById.get(participant.characterId)
      if (!character) continue
      if (character.parentCharacterId) continue // I-C2: children excluded from rosters
      entries.push({ character, session: participant.session })
    }

    return entries
  })

  return {
    resolveCharacterId,
    setSessionResource,
    setSessionPosture,
    resolveParticipant,
    getPersonalNote,
    setPersonalNote,
    setInjury,
    setAdvantage,
    setDisadvantage,
    setChildVitals,
    subscribeParty,
    unsubscribeParty,
    party,
    // Raw subscribed participant docs (all statuses, children included) so the
    // character sheet can keep its own displayed participant live from the same
    // snapshot that feeds `party` — mission-review DRIFT-1 follow-up.
    partyParticipants: computed(() => partyParticipants.value),
    cache: computed(() => cache.value),
    error: computed(() => error.value),
  }
}
