import { computed, ref } from 'vue'
import { getCharacterByCampaign, listCharactersByCampaign } from '../models/repositories/CharacterRepository'
import {
  getCharacterState,
  subscribeCharacterState,
  updateCharacterState,
  type CharacterStateDocument,
} from '../models/repositories/CharacterStateRepository'
import { getParticipant, subscribeParticipantsByCampaign } from '../models/repositories/ParticipantRepository'
import {
  getParticipantNote,
  setParticipantNote,
} from '../models/repositories/ParticipantNoteRepository'
import type { CharacterProfile } from '../models/types/Character'
import type { Participant, Posture, SecondaryAttributeName } from '../models/types/Participant'

// Cache: campaignId → characterId for the current user
const cache = ref<Record<string, string>>({})
const error = ref<string | null>(null)

// "État du groupe" (party) live state — populated by subscribeParty.
const partyCampaignId = ref<string | null>(null)
const partyParticipants = ref<Participant[]>([])
const partyCharacters = ref<CharacterProfile[]>([])
// One States/Current listener per character in the campaign (base characters
// AND their transformations — each is its own Character doc with its own
// live state per docs/rpg-data-model.md §4.8/Cluster 3b), keyed by characterId.
const partyCharacterStates = ref<Record<string, CharacterStateDocument>>({})
let unsubscribeParticipants: (() => void) | null = null
let unsubscribeCharacterStates: Array<() => void> = []

function clampSessionValue(resource: 'hp' | 'mana', value: number, max: number) {
  const boundedMax = Math.max(0, max)
  if (resource === 'hp') {
    return Math.max(-boundedMax, Math.min(Math.trunc(value), boundedMax))
  }
  return Math.max(0, Math.min(Math.trunc(value), boundedMax))
}

export function usePlayerStore() {
  async function setSessionResource(
    campaignId: string,
    characterId: string,
    resource: 'hp' | 'mana',
    targetValue: number,
    // Equipment can raise max HP/Mana above the stored raw Health/Mana value
    // (equipment-stat-effects). Callers that know the character's effective
    // max (e.g. PlayerView.vue, via computeEffectiveMaxStat) should pass it
    // here so the server-side clamp doesn't silently re-cap the write back
    // down to the raw stored max. Falls back to the raw stored max for any
        // caller that doesn't have equipment data on hand.
    maxOverride?: number,
  ): Promise<CharacterStateDocument | null> {
    error.value = null

    try {
      const state = await getCharacterState(campaignId, characterId)
      if (!state) {
        return null
      }

      const rawMax = resource === 'hp' ? state.Health : state.Mana
      const maxValue = maxOverride ?? rawMax
      const normalized = clampSessionValue(resource, targetValue, maxValue)
      const field = resource === 'hp' ? 'HealthCurrent' : 'ManaCurrent'

      await updateCharacterState(campaignId, characterId, { [field]: normalized })
      return { ...state, [field]: normalized }
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
  ): Promise<CharacterStateDocument | null> {
    error.value = null

    try {
      await updateCharacterState(campaignId, characterId, { Posture: posture })
      const state = await getCharacterState(campaignId, characterId)
      return state ? { ...state, Posture: posture } : null
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
      const direct = await getParticipant(participantRef, campaignId)
      if (direct) return direct
      // participantRef may be a characterId instead of a uid (a caller
      // linking into a character's own notes) — resolve it via the
      // character's PlayerId/ownerUid, since Players/{uid} carries no
      // characterId of its own (docs/rpg-data-model.md §4.6).
      const character = await getCharacterByCampaign(campaignId, participantRef)
      if (character?.ownerUid) {
        return await getParticipant(character.ownerUid, campaignId)
      }
      return null
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

  // setInjury/setAdvantage/setDisadvantage/setSessionResource/setSessionPosture
  // all take a characterId directly — this works identically whether
  // characterId is a base (playable) character or one of its transformations,
  // since each is its own Character doc with its own States/Current (Cluster
  // 3b's core simplification: a child needs no separate "child vitals" API).
  async function setInjury(
    characterId: string,
    attr: SecondaryAttributeName,
    state: 'jaune' | 'rouge' | null,
  ): Promise<void> {
    error.value = null

    try {
      if (!partyCampaignId.value) return
      const current = await getCharacterState(partyCampaignId.value, characterId)
      if (!current) return

      const nextInjuries = { ...current.Injuries }
      if (state === null) {
        delete nextInjuries[attr]
      } else {
        nextInjuries[attr] = state
      }

      await updateCharacterState(partyCampaignId.value, characterId, { Injuries: nextInjuries })
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Impossible de mettre à jour l'état de session."
    }
  }

  async function setAdvantage(characterId: string, value: boolean): Promise<void> {
    error.value = null

    try {
      if (!partyCampaignId.value) return
      await updateCharacterState(partyCampaignId.value, characterId, { Advantage: value })
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Impossible de mettre à jour l'état de session."
    }
  }

  async function setDisadvantage(characterId: string, value: boolean): Promise<void> {
    error.value = null

    try {
      if (!partyCampaignId.value) return
      await updateCharacterState(partyCampaignId.value, characterId, { Disadvantage: value })
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Impossible de mettre à jour l'état de session."
    }
  }

  /**
   * Idempotent attach to a campaign's live participant roster (état du groupe)
   * AND every one of its characters' live combat state. Re-calling with the
   * same campaignId is a no-op; a different campaignId detaches every
   * previous listener first so subscriptions never stack.
   */
  function subscribeParty(campaignId: string): void {
    if (partyCampaignId.value === campaignId && unsubscribeParticipants) {
      return
    }

    if (unsubscribeParticipants) {
      unsubscribeParticipants()
      unsubscribeParticipants = null
    }
    unsubscribeCharacterStates.forEach((unsub) => unsub())
    unsubscribeCharacterStates = []
    partyCharacterStates.value = {}

    partyCampaignId.value = campaignId
    error.value = null

    listCharactersByCampaign(campaignId)
      .then((list) => {
        partyCharacters.value = list
        unsubscribeCharacterStates = list.map((character) =>
          subscribeCharacterState(campaignId, character.id, (state) => {
            if (!state) return
            partyCharacterStates.value = { ...partyCharacterStates.value, [character.id]: state }
          }),
        )
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
    unsubscribeCharacterStates.forEach((unsub) => unsub())
    unsubscribeCharacterStates = []
    partyCampaignId.value = null
    partyParticipants.value = []
    partyCharacters.value = []
    partyCharacterStates.value = {}
  }

  const party = computed(() => {
    const participantsByUid = new Map(partyParticipants.value.map((p) => [p.uid, p]))
    const entries: Array<{ character: CharacterProfile; state: CharacterStateDocument }> = []

    for (const character of partyCharacters.value) {
      if (character.parentCharacterId) continue // I-C2: children excluded from rosters
      const participant = participantsByUid.get(character.ownerUid)
      if (!participant || participant.status !== 'Approved') continue
      const state = partyCharacterStates.value[character.id]
      if (!state) continue
      entries.push({ character, state })
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
    subscribeParty,
    unsubscribeParty,
    party,
    // Raw subscribed participant docs (all statuses) so other screens can
    // check approval status without a second subscription.
    partyParticipants: computed(() => partyParticipants.value),
    // Live States/Current for every character in the campaign, keyed by
    // characterId — the character sheet reads its own (and its active
    // child's) entry from here instead of holding a second subscription.
    partyCharacterStates: computed(() => partyCharacterStates.value),
    cache: computed(() => cache.value),
    error: computed(() => error.value),
  }
}
