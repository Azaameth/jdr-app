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
  subscribeParticipantsByCampaign:
    vi.fn<(campaignId: string, onChange: (participants: Participant[]) => void) => () => void>(),
  updateSessionFields:
    vi.fn<
      (
        campaignId: string,
        participantId: string,
        fields: Partial<CharacterSessionState>,
      ) => Promise<void>
    >(),
  updateChildSession:
    vi.fn<
      (
        campaignId: string,
        participantId: string,
        childCharacterId: string,
        fields: Partial<CharacterSessionState>,
      ) => Promise<void>
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
  subscribeParticipantsByCampaign: mocks.subscribeParticipantsByCampaign,
  updateSessionFields: mocks.updateSessionFields,
  updateChildSession: mocks.updateChildSession,
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
    status: 'Approved',
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
    mocks.subscribeParticipantsByCampaign.mockReturnValue(() => {})
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

    it('clamps hp to the maxOverride (equipment-adjusted effective max) instead of the raw stored maxHp', async () => {
      mocks.getParticipantByCharacterId.mockResolvedValue(
        makeParticipant({ session: { hp: 10, maxHp: 10, mana: 5, maxMana: 20, posture: 'DEFENSIF' } }),
      )
      mocks.setParticipantSessionByCharacterId.mockResolvedValue(makeParticipant())
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'hp', 1000, 14)

      expect(mocks.setParticipantSessionByCharacterId).toHaveBeenCalledWith('char-1', 'camp-1', {
        hp: 14,
      })
    })

    it('clamps mana to the maxOverride instead of the raw stored maxMana', async () => {
      mocks.getParticipantByCharacterId.mockResolvedValue(
        makeParticipant({ session: { hp: 10, maxHp: 50, mana: 5, maxMana: 4, posture: 'DEFENSIF' } }),
      )
      mocks.setParticipantSessionByCharacterId.mockResolvedValue(makeParticipant())
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'mana', 1000, 8)

      expect(mocks.setParticipantSessionByCharacterId).toHaveBeenCalledWith('char-1', 'camp-1', {
        mana: 8,
      })
    })

    it('falls back to the raw stored max when no maxOverride is supplied', async () => {
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

  describe('setInjury', () => {
    it('does nothing when subscribeParty has not been called (no campaign context)', async () => {
      const store = usePlayerStore()

      await store.setInjury('char-1', 'puissance', 'jaune')

      expect(mocks.getParticipantByCharacterId).not.toHaveBeenCalled()
      expect(mocks.updateSessionFields).not.toHaveBeenCalled()
    })

    it('adds a jaune injury key when none was present', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([])
      const store = usePlayerStore()
      store.subscribeParty('camp-1')
      mocks.getParticipantByCharacterId.mockResolvedValue(
        makeParticipant({ session: { hp: 10, maxHp: 50, mana: 5, maxMana: 20, posture: 'DEFENSIF' } }),
      )

      await store.setInjury('char-1', 'puissance', 'jaune')

      expect(mocks.getParticipantByCharacterId).toHaveBeenCalledWith('char-1', 'camp-1')
      expect(mocks.updateSessionFields).toHaveBeenCalledWith('camp-1', 'participant-1', {
        injuries: { puissance: 'jaune' },
      })
    })

    it('upgrades an existing jaune injury to rouge without touching other keys', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([])
      const store = usePlayerStore()
      store.subscribeParty('camp-1')
      mocks.getParticipantByCharacterId.mockResolvedValue(
        makeParticipant({
          session: {
            hp: 10,
            maxHp: 50,
            mana: 5,
            maxMana: 20,
            posture: 'DEFENSIF',
            injuries: { puissance: 'jaune', finesse: 'rouge' },
          },
        }),
      )

      await store.setInjury('char-1', 'puissance', 'rouge')

      expect(mocks.updateSessionFields).toHaveBeenCalledWith('camp-1', 'participant-1', {
        injuries: { puissance: 'rouge', finesse: 'rouge' },
      })
    })

    it('clearing to saine (null) removes the key entirely', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([])
      const store = usePlayerStore()
      store.subscribeParty('camp-1')
      mocks.getParticipantByCharacterId.mockResolvedValue(
        makeParticipant({
          session: {
            hp: 10,
            maxHp: 50,
            mana: 5,
            maxMana: 20,
            posture: 'DEFENSIF',
            injuries: { puissance: 'rouge', finesse: 'jaune' },
          },
        }),
      )

      await store.setInjury('char-1', 'puissance', null)

      expect(mocks.updateSessionFields).toHaveBeenCalledWith('camp-1', 'participant-1', {
        injuries: { finesse: 'jaune' },
      })
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([])
      const store = usePlayerStore()
      store.subscribeParty('camp-1')
      mocks.getParticipantByCharacterId.mockRejectedValue('boom')

      await store.setInjury('char-1', 'puissance', 'jaune')

      expect(store.error.value).toBe("Impossible de mettre à jour l'état de session.")
    })
  })

  describe('setAdvantage / setDisadvantage', () => {
    it('calls updateSessionFields with the resolved participant id', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([])
      const store = usePlayerStore()
      store.subscribeParty('camp-1')
      mocks.getParticipantByCharacterId.mockResolvedValue(makeParticipant())

      await store.setAdvantage('char-1', true)
      expect(mocks.updateSessionFields).toHaveBeenCalledWith('camp-1', 'participant-1', {
        advantage: true,
      })

      await store.setDisadvantage('char-1', false)
      expect(mocks.updateSessionFields).toHaveBeenCalledWith('camp-1', 'participant-1', {
        disadvantage: false,
      })
    })
  })

  describe('setChildVitals', () => {
    it('calls updateChildSession with the parent participant id and child characterId', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([])
      const store = usePlayerStore()
      store.subscribeParty('camp-1')
      mocks.getParticipantByCharacterId.mockResolvedValue(makeParticipant({ characterId: 'firm' }))

      await store.setChildVitals('firm', 'furmiaou', { hp: 40 })

      expect(mocks.getParticipantByCharacterId).toHaveBeenCalledWith('firm', 'camp-1')
      expect(mocks.updateChildSession).toHaveBeenCalledWith('camp-1', 'participant-1', 'furmiaou', {
        hp: 40,
      })
    })
  })

  describe('subscribeParty / unsubscribeParty / party', () => {
    it('is idempotent: calling subscribeParty twice with the same campaignId attaches once', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([])
      const store = usePlayerStore()

      store.subscribeParty('camp-1')
      store.subscribeParty('camp-1')

      expect(mocks.subscribeParticipantsByCampaign).toHaveBeenCalledTimes(1)
    })

    it('detaches the previous listener when subscribing to a different campaign', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([])
      const firstUnsubscribe = vi.fn<() => void>()
      mocks.subscribeParticipantsByCampaign.mockReturnValueOnce(firstUnsubscribe)
      const store = usePlayerStore()

      store.subscribeParty('camp-1')
      store.subscribeParty('camp-2')

      expect(firstUnsubscribe).toHaveBeenCalledTimes(1)
      expect(mocks.subscribeParticipantsByCampaign).toHaveBeenCalledTimes(2)
    })

    it('unsubscribeParty detaches the listener and clears party', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([
        makeCharacter({ id: 'char-1', ownerUid: 'uid-1' }),
      ])
      const unsubscribe = vi.fn<() => void>()
      mocks.subscribeParticipantsByCampaign.mockImplementation((_campaignId, onChange) => {
        onChange([makeParticipant({ characterId: 'char-1' })])
        return unsubscribe
      })
      const store = usePlayerStore()

      store.subscribeParty('camp-1')
      await Promise.resolve() // flush the listCharactersByCampaign microtask
      expect(store.party.value).toHaveLength(1)

      store.unsubscribeParty()

      expect(unsubscribe).toHaveBeenCalledTimes(1)
      expect(store.party.value).toHaveLength(0)
    })

    it('party excludes characters with parentCharacterId (I-C2) and non-approved participants', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([
        makeCharacter({ id: 'char-1', ownerUid: 'uid-1' }),
        makeCharacter({ id: 'child-1', ownerUid: 'uid-1', parentCharacterId: 'char-1' }),
        makeCharacter({ id: 'char-2', ownerUid: 'uid-2' }),
      ])
      mocks.subscribeParticipantsByCampaign.mockImplementation((_campaignId, onChange) => {
        onChange([
          makeParticipant({ id: 'p1', characterId: 'char-1', status: 'Approved' }),
          makeParticipant({ id: 'p2', characterId: 'char-2', status: 'Pending' }),
          // A participant referencing a child character should never exist per
          // data-model D-02 (children get no participant doc), but the filter
          // must exclude it defensively via parentCharacterId regardless.
          makeParticipant({ id: 'p3', characterId: 'child-1', status: 'Approved' }),
        ])
        return () => {}
      })
      const store = usePlayerStore()

      store.subscribeParty('camp-1')
      await Promise.resolve()

      expect(store.party.value).toEqual([
        { character: expect.objectContaining({ id: 'char-1' }), session: expect.any(Object) },
      ])
    })

    // FR-017 locked with the real seeded parent/child pair (scripts/data/
    // characters.json + participants.json): Firm Bintaggle ('firm') owns the
    // Furmiaou transformation ('furmiaou', parentCharacterId: 'firm'). Only
    // Firm's participant doc exists — Furmiaou's session lives in
    // `childSessions.furmiaou` on that doc, never as its own participant —
    // but `party` must exclude Furmiaou even if a stray participant doc for
    // it ever appeared, which the generic case above already covers
    // defensively. This case pins the exact production fixture names.
    it('party excludes Furmiaou (seeded child transformation) and keeps its parent Firm Bintaggle', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([
        makeCharacter({ id: 'firm', ownerUid: 'xxx', name: 'Firm Bintaggle' }),
        makeCharacter({
          id: 'furmiaou',
          ownerUid: 'xxx',
          name: 'Furmiaou',
          parentCharacterId: 'firm',
        }),
      ])
      mocks.subscribeParticipantsByCampaign.mockImplementation((_campaignId, onChange) => {
        onChange([makeParticipant({ id: 'p-firm', characterId: 'firm', status: 'Approved' })])
        return () => {}
      })
      const store = usePlayerStore()

      store.subscribeParty('camp-1')
      await Promise.resolve()

      expect(store.party.value).toEqual([
        { character: expect.objectContaining({ id: 'firm', name: 'Firm Bintaggle' }), session: expect.any(Object) },
      ])
      expect(store.party.value.some((entry) => entry.character.id === 'furmiaou')).toBe(false)
    })
  })
})
