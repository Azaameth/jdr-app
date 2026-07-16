import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { usePlayerStore as UsePlayerStoreType } from '../usePlayerStore'
import type { CharacterProfile } from '../../models/types/Character'
import type { CharacterSessionState, Participant } from '../../models/types/Participant'

const mocks = vi.hoisted(() => ({
  listCharactersByCampaign: vi.fn<(campaignId: string) => Promise<CharacterProfile[]>>(),
  getParticipant: vi.fn<(uid: string, campaignId: string) => Promise<Participant | null>>(),
  getParticipantByCharacterId:
    vi.fn<(characterId: string, campaignId: string) => Promise<Participant | null>>(),
  setParticipantSessionByCharacterId:
    vi.fn<
      (
        characterId: string,
        campaignId: string,
        sessionPatch: Partial<CharacterSessionState>,
      ) => Promise<Participant | null>
    >(),
  getParticipantNote: vi.fn<(participantId: string) => Promise<string>>(),
  setParticipantNote: vi.fn<(participantId: string, personalNote: string) => Promise<void>>(),
}))

vi.mock('../../models/repositories/CharacterRepository', () => ({
  listCharactersByCampaign: mocks.listCharactersByCampaign,
}))

vi.mock('../../models/repositories/ParticipantRepository', () => ({
  getParticipant: mocks.getParticipant,
  getParticipantByCharacterId: mocks.getParticipantByCharacterId,
  setParticipantSessionByCharacterId: mocks.setParticipantSessionByCharacterId,
}))

vi.mock('../../models/repositories/ParticipantNoteRepository', () => ({
  getParticipantNote: mocks.getParticipantNote,
  setParticipantNote: mocks.setParticipantNote,
}))

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 'participant-1',
    uid: 'uid-1',
    campaignId: 'camp-1',
    characterId: 'char-1',
    status: 'approved',
    session: {
      hp: 10,
      maxHp: 50,
      mana: 5,
      maxMana: 20,
      posture: 'DEFENSIF',
    },
    ...overrides,
  }
}

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-1',
    campaignId: 'camp-1',
    ownerUid: 'uid-1',
    name: 'Hero',
    raceId: 'r1',
    classId: 'c1',
    gender: 'Autre',
    elements: [],
    level: 1,
    attributes: {
      primary: { force: 1, social: 1, mental: 1 },
      secondary: { puissance: 1, finesse: 1, aura: 1, relation: 1, instinct: 1, savoir: 1 },
    },
    skills: [],
    gifts: [],
    languages: [],
    img: '',
    backstory: '',
    ...overrides,
  }
}

describe('usePlayerStore', () => {
  let usePlayerStore: typeof UsePlayerStoreType

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    ;({ usePlayerStore } = await import('../usePlayerStore'))
  })

  describe('setSessionResource', () => {
    it('clamps hp to +maxHp when target exceeds the max', async () => {
      mocks.getParticipantByCharacterId.mockResolvedValue(
        makeParticipant({ session: { hp: 10, maxHp: 50, mana: 5, maxMana: 20, posture: 'DEFENSIF' } }),
      )
      mocks.setParticipantSessionByCharacterId.mockResolvedValue(makeParticipant())
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'hp', 1000)

      expect(mocks.setParticipantSessionByCharacterId).toHaveBeenCalledWith('char-1', 'camp-1', {
        hp: 50,
      })
    })

    it('lets hp go negative down to -maxHp (does not clamp to 0)', async () => {
      mocks.getParticipantByCharacterId.mockResolvedValue(
        makeParticipant({ session: { hp: 10, maxHp: 50, mana: 5, maxMana: 20, posture: 'DEFENSIF' } }),
      )
      mocks.setParticipantSessionByCharacterId.mockResolvedValue(makeParticipant())
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'hp', -1000)

      expect(mocks.setParticipantSessionByCharacterId).toHaveBeenCalledWith('char-1', 'camp-1', {
        hp: -50,
      })
    })

    it('truncates decimal hp values within range', async () => {
      mocks.getParticipantByCharacterId.mockResolvedValue(
        makeParticipant({ session: { hp: 10, maxHp: 50, mana: 5, maxMana: 20, posture: 'DEFENSIF' } }),
      )
      mocks.setParticipantSessionByCharacterId.mockResolvedValue(makeParticipant())
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'hp', 10.9)

      expect(mocks.setParticipantSessionByCharacterId).toHaveBeenCalledWith('char-1', 'camp-1', {
        hp: 10,
      })
    })

    it('clamps mana to 0 when target is negative (does not go negative)', async () => {
      mocks.getParticipantByCharacterId.mockResolvedValue(
        makeParticipant({ session: { hp: 10, maxHp: 50, mana: 5, maxMana: 20, posture: 'DEFENSIF' } }),
      )
      mocks.setParticipantSessionByCharacterId.mockResolvedValue(makeParticipant())
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'mana', -5)

      expect(mocks.setParticipantSessionByCharacterId).toHaveBeenCalledWith('char-1', 'camp-1', {
        mana: 0,
      })
    })

    it('clamps mana to +maxMana when target exceeds the max', async () => {
      mocks.getParticipantByCharacterId.mockResolvedValue(
        makeParticipant({ session: { hp: 10, maxHp: 50, mana: 5, maxMana: 20, posture: 'DEFENSIF' } }),
      )
      mocks.setParticipantSessionByCharacterId.mockResolvedValue(makeParticipant())
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'mana', 1000)

      expect(mocks.setParticipantSessionByCharacterId).toHaveBeenCalledWith('char-1', 'camp-1', {
        mana: 20,
      })
    })

    it('truncates decimal mana values within range', async () => {
      mocks.getParticipantByCharacterId.mockResolvedValue(
        makeParticipant({ session: { hp: 10, maxHp: 50, mana: 5, maxMana: 20, posture: 'DEFENSIF' } }),
      )
      mocks.setParticipantSessionByCharacterId.mockResolvedValue(makeParticipant())
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'mana', 12.4)

      expect(mocks.setParticipantSessionByCharacterId).toHaveBeenCalledWith('char-1', 'camp-1', {
        mana: 12,
      })
    })

    it('returns null without throwing when the participant is not found', async () => {
      mocks.getParticipantByCharacterId.mockResolvedValue(null)
      const store = usePlayerStore()

      const result = await store.setSessionResource('camp-1', 'char-1', 'hp', 10)

      expect(result).toBeNull()
      expect(mocks.setParticipantSessionByCharacterId).not.toHaveBeenCalled()
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.getParticipantByCharacterId.mockRejectedValue('boom')
      const store = usePlayerStore()

      const result = await store.setSessionResource('camp-1', 'char-1', 'hp', 10)

      expect(result).toBeNull()
      expect(store.error.value).toBe('Erreur lors de la mise à jour de la session.')
    })

    it('surfaces the Error message when the repository throws an Error', async () => {
      mocks.getParticipantByCharacterId.mockRejectedValue(new Error('offline'))
      const store = usePlayerStore()

      const result = await store.setSessionResource('camp-1', 'char-1', 'hp', 10)

      expect(result).toBeNull()
      expect(store.error.value).toBe('offline')
    })
  })

  describe('resolveParticipant', () => {
    it('returns the characterId-based lookup result without calling the uid fallback', async () => {
      const participant = makeParticipant()
      mocks.getParticipantByCharacterId.mockResolvedValue(participant)
      const store = usePlayerStore()

      const result = await store.resolveParticipant('camp-1', 'char-1')

      expect(result).toEqual(participant)
      expect(mocks.getParticipant).not.toHaveBeenCalled()
    })

    it('falls back to the uid-based lookup when the characterId lookup is falsy', async () => {
      const participant = makeParticipant()
      mocks.getParticipantByCharacterId.mockResolvedValue(null)
      mocks.getParticipant.mockResolvedValue(participant)
      const store = usePlayerStore()

      const result = await store.resolveParticipant('camp-1', 'uid-1')

      expect(result).toEqual(participant)
      expect(mocks.getParticipant).toHaveBeenCalledWith('uid-1', 'camp-1')
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.getParticipantByCharacterId.mockRejectedValue('boom')
      const store = usePlayerStore()

      const result = await store.resolveParticipant('camp-1', 'ref')

      expect(result).toBeNull()
      expect(store.error.value).toBe('Erreur lors de la résolution du participant.')
    })

    it('surfaces the Error message when the repository throws an Error', async () => {
      mocks.getParticipantByCharacterId.mockRejectedValue(new Error('down'))
      const store = usePlayerStore()

      const result = await store.resolveParticipant('camp-1', 'ref')

      expect(result).toBeNull()
      expect(store.error.value).toBe('down')
    })
  })

  describe('getPersonalNote', () => {
    it('returns the note from the repository', async () => {
      mocks.getParticipantNote.mockResolvedValue('hello')
      const store = usePlayerStore()

      const result = await store.getPersonalNote('participant-1')

      expect(result).toBe('hello')
      expect(mocks.getParticipantNote).toHaveBeenCalledWith('participant-1')
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.getParticipantNote.mockRejectedValue('boom')
      const store = usePlayerStore()

      const result = await store.getPersonalNote('participant-1')

      expect(result).toBe('')
      expect(store.error.value).toBe('Erreur lors de la récupération de la note.')
    })

    it('surfaces the Error message when the repository throws an Error', async () => {
      mocks.getParticipantNote.mockRejectedValue(new Error('down'))
      const store = usePlayerStore()

      const result = await store.getPersonalNote('participant-1')

      expect(result).toBe('')
      expect(store.error.value).toBe('down')
    })
  })

  describe('setPersonalNote', () => {
    it('calls the repository with the participant id and note', async () => {
      mocks.setParticipantNote.mockResolvedValue(undefined)
      const store = usePlayerStore()

      await store.setPersonalNote('participant-1', 'hello')

      expect(mocks.setParticipantNote).toHaveBeenCalledWith('participant-1', 'hello')
      expect(store.error.value).toBeNull()
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.setParticipantNote.mockRejectedValue('boom')
      const store = usePlayerStore()

      await store.setPersonalNote('participant-1', 'hello')

      expect(store.error.value).toBe('Erreur lors de la mise à jour de la note.')
    })

    it('surfaces the Error message when the repository throws an Error', async () => {
      mocks.setParticipantNote.mockRejectedValue(new Error('conflict'))
      const store = usePlayerStore()

      await store.setPersonalNote('participant-1', 'hello')

      expect(store.error.value).toBe('conflict')
    })
  })

  describe('resolveCharacterId', () => {
    it('caches the resolved characterId per campaignId and does not refetch', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([makeCharacter({ id: 'char-1', ownerUid: 'uid-1' })])
      const store = usePlayerStore()

      const first = await store.resolveCharacterId('uid-1', 'camp-1')
      const second = await store.resolveCharacterId('uid-1', 'camp-1')

      expect(first).toBe('char-1')
      expect(second).toBe('char-1')
      expect(mocks.listCharactersByCampaign).toHaveBeenCalledTimes(1)
    })

    it('returns null when no character matches the ownerUid', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([makeCharacter({ id: 'char-1', ownerUid: 'someone-else' })])
      const store = usePlayerStore()

      const result = await store.resolveCharacterId('uid-1', 'camp-1')

      expect(result).toBeNull()
    })
  })
})
