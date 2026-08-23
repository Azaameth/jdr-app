import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { usePlayerStore as UsePlayerStoreType } from '../usePlayerStore'
import type { CharacterProfile } from '../../models/types/Character'
import type { Participant } from '../../models/types/Participant'
import type { CharacterStateDocument } from '../../models/repositories/CharacterStateRepository'

const mocks = vi.hoisted(() => ({
  listCharactersByCampaign: vi.fn<(campaignId: string) => Promise<CharacterProfile[]>>(),
  getCharacterByCampaign: vi.fn<(campaignId: string, id: string) => Promise<CharacterProfile | null>>(),
  getCharacterState: vi.fn<(campaignId: string, characterId: string) => Promise<CharacterStateDocument | null>>(),
  subscribeCharacterState:
    vi.fn<
      (
        campaignId: string,
        characterId: string,
        onChange: (state: CharacterStateDocument | null) => void,
      ) => () => void
    >(),
  updateCharacterState:
    vi.fn<
      (
        campaignId: string,
        characterId: string,
        fields: Partial<CharacterStateDocument>,
      ) => Promise<void>
    >(),
  getParticipant: vi.fn<(uid: string, campaignId: string) => Promise<Participant | null>>(),
  subscribeParticipantsByCampaign:
    vi.fn<(campaignId: string, onChange: (participants: Participant[]) => void) => () => void>(),
  getParticipantNote: vi.fn<(participantId: string) => Promise<string>>(),
  setParticipantNote: vi.fn<(participantId: string, personalNote: string) => Promise<void>>(),
}))

vi.mock('../../models/repositories/CharacterRepository', () => ({
  listCharactersByCampaign: mocks.listCharactersByCampaign,
  getCharacterByCampaign: mocks.getCharacterByCampaign,
}))

vi.mock('../../models/repositories/CharacterStateRepository', () => ({
  getCharacterState: mocks.getCharacterState,
  subscribeCharacterState: mocks.subscribeCharacterState,
  updateCharacterState: mocks.updateCharacterState,
}))

vi.mock('../../models/repositories/ParticipantRepository', () => ({
  getParticipant: mocks.getParticipant,
  subscribeParticipantsByCampaign: mocks.subscribeParticipantsByCampaign,
}))

vi.mock('../../models/repositories/ParticipantNoteRepository', () => ({
  getParticipantNote: mocks.getParticipantNote,
  setParticipantNote: mocks.setParticipantNote,
}))

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 'uid-1',
    uid: 'uid-1',
    campaignId: 'camp-1',
    status: 'Approved',
    ...overrides,
  }
}

function makeState(overrides: Partial<CharacterStateDocument> = {}): CharacterStateDocument {
  return {
    Health: 50,
    HealthCurrent: 10,
    Mana: 20,
    ManaCurrent: 5,
    Posture: 'DEFENSIF',
    PlayerId: 'uid-1',
    CampaignId: 'camp-1',
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
    mocks.subscribeCharacterState.mockReturnValue(() => {})
    ;({ usePlayerStore } = await import('../usePlayerStore'))
  })

  describe('setSessionResource', () => {
    it('clamps hp to +Health when target exceeds the max', async () => {
      mocks.getCharacterState.mockResolvedValue(makeState({ Health: 50 }))
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'hp', 1000)

      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'char-1', {
        HealthCurrent: 50,
      })
    })

    it('lets hp go negative down to -Health (does not clamp to 0)', async () => {
      mocks.getCharacterState.mockResolvedValue(makeState({ Health: 50 }))
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'hp', -1000)

      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'char-1', {
        HealthCurrent: -50,
      })
    })

    it('truncates decimal hp values within range', async () => {
      mocks.getCharacterState.mockResolvedValue(makeState({ Health: 50 }))
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'hp', 10.9)

      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'char-1', {
        HealthCurrent: 10,
      })
    })

    it('clamps mana to 0 when target is negative (does not go negative)', async () => {
      mocks.getCharacterState.mockResolvedValue(makeState({ Mana: 20 }))
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'mana', -5)

      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'char-1', {
        ManaCurrent: 0,
      })
    })

    it('clamps mana to +Mana when target exceeds the max', async () => {
      mocks.getCharacterState.mockResolvedValue(makeState({ Mana: 20 }))
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'mana', 1000)

      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'char-1', {
        ManaCurrent: 20,
      })
    })

    it('truncates decimal mana values within range', async () => {
      mocks.getCharacterState.mockResolvedValue(makeState({ Mana: 20 }))
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'mana', 12.4)

      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'char-1', {
        ManaCurrent: 12,
      })
    })

    it('clamps hp to the maxOverride (equipment-adjusted effective max) instead of the raw stored Health', async () => {
      mocks.getCharacterState.mockResolvedValue(makeState({ Health: 10 }))
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'hp', 1000, 14)

      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'char-1', {
        HealthCurrent: 14,
      })
    })

    it('clamps mana to the maxOverride instead of the raw stored Mana', async () => {
      mocks.getCharacterState.mockResolvedValue(makeState({ Mana: 4 }))
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'mana', 1000, 8)

      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'char-1', {
        ManaCurrent: 8,
      })
    })

    it('falls back to the raw stored max when no maxOverride is supplied', async () => {
      mocks.getCharacterState.mockResolvedValue(makeState({ Health: 50 }))
      const store = usePlayerStore()

      await store.setSessionResource('camp-1', 'char-1', 'hp', 1000)

      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'char-1', {
        HealthCurrent: 50,
      })
    })

    it('returns null without throwing when the character state is not found', async () => {
      mocks.getCharacterState.mockResolvedValue(null)
      const store = usePlayerStore()

      const result = await store.setSessionResource('camp-1', 'char-1', 'hp', 10)

      expect(result).toBeNull()
      expect(mocks.updateCharacterState).not.toHaveBeenCalled()
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.getCharacterState.mockRejectedValue('boom')
      const store = usePlayerStore()

      const result = await store.setSessionResource('camp-1', 'char-1', 'hp', 10)

      expect(result).toBeNull()
      expect(store.error.value).toBe('Erreur lors de la mise à jour de la session.')
    })

    it('surfaces the Error message when the repository throws an Error', async () => {
      mocks.getCharacterState.mockRejectedValue(new Error('offline'))
      const store = usePlayerStore()

      const result = await store.setSessionResource('camp-1', 'char-1', 'hp', 10)

      expect(result).toBeNull()
      expect(store.error.value).toBe('offline')
    })
  })

  describe('resolveParticipant', () => {
    it('returns the direct uid-based lookup result without calling the character fallback', async () => {
      const participant = makeParticipant()
      mocks.getParticipant.mockResolvedValue(participant)
      const store = usePlayerStore()

      const result = await store.resolveParticipant('camp-1', 'uid-1')

      expect(result).toEqual(participant)
      expect(mocks.getCharacterByCampaign).not.toHaveBeenCalled()
    })

    it("falls back to resolving via the character's ownerUid when the direct uid lookup is falsy", async () => {
      const participant = makeParticipant()
      mocks.getParticipant.mockImplementation(async (uid: string) =>
        uid === 'uid-1' ? participant : null,
      )
      mocks.getCharacterByCampaign.mockResolvedValue(makeCharacter({ id: 'char-1', ownerUid: 'uid-1' }))
      const store = usePlayerStore()

      const result = await store.resolveParticipant('camp-1', 'char-1')

      expect(result).toEqual(participant)
      expect(mocks.getCharacterByCampaign).toHaveBeenCalledWith('camp-1', 'char-1')
      expect(mocks.getParticipant).toHaveBeenCalledWith('uid-1', 'camp-1')
    })

    it('returns null when neither the direct lookup nor the character fallback resolve', async () => {
      mocks.getParticipant.mockResolvedValue(null)
      mocks.getCharacterByCampaign.mockResolvedValue(null)
      const store = usePlayerStore()

      const result = await store.resolveParticipant('camp-1', 'missing')

      expect(result).toBeNull()
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.getParticipant.mockRejectedValue('boom')
      const store = usePlayerStore()

      const result = await store.resolveParticipant('camp-1', 'ref')

      expect(result).toBeNull()
      expect(store.error.value).toBe('Erreur lors de la résolution du participant.')
    })

    it('surfaces the Error message when the repository throws an Error', async () => {
      mocks.getParticipant.mockRejectedValue(new Error('down'))
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

      expect(mocks.getCharacterState).not.toHaveBeenCalled()
      expect(mocks.updateCharacterState).not.toHaveBeenCalled()
    })

    it('adds a jaune injury key when none was present', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([])
      const store = usePlayerStore()
      store.subscribeParty('camp-1')
      mocks.getCharacterState.mockResolvedValue(makeState())

      await store.setInjury('char-1', 'puissance', 'jaune')

      expect(mocks.getCharacterState).toHaveBeenCalledWith('camp-1', 'char-1')
      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'char-1', {
        Injuries: { puissance: 'jaune' },
      })
    })

    it('upgrades an existing jaune injury to rouge without touching other keys', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([])
      const store = usePlayerStore()
      store.subscribeParty('camp-1')
      mocks.getCharacterState.mockResolvedValue(
        makeState({ Injuries: { puissance: 'jaune', finesse: 'rouge' } }),
      )

      await store.setInjury('char-1', 'puissance', 'rouge')

      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'char-1', {
        Injuries: { puissance: 'rouge', finesse: 'rouge' },
      })
    })

    it('clearing to saine (null) removes the key entirely', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([])
      const store = usePlayerStore()
      store.subscribeParty('camp-1')
      mocks.getCharacterState.mockResolvedValue(
        makeState({ Injuries: { puissance: 'rouge', finesse: 'jaune' } }),
      )

      await store.setInjury('char-1', 'puissance', null)

      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'char-1', {
        Injuries: { finesse: 'jaune' },
      })
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([])
      const store = usePlayerStore()
      store.subscribeParty('camp-1')
      mocks.getCharacterState.mockRejectedValue('boom')

      await store.setInjury('char-1', 'puissance', 'jaune')

      expect(store.error.value).toBe("Impossible de mettre à jour l'état de session.")
    })
  })

  describe('setAdvantage / setDisadvantage', () => {
    it('calls updateCharacterState directly against the given characterId', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([])
      const store = usePlayerStore()
      store.subscribeParty('camp-1')

      await store.setAdvantage('char-1', true)
      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'char-1', {
        Advantage: true,
      })

      await store.setDisadvantage('char-1', false)
      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'char-1', {
        Disadvantage: false,
      })
    })

    // Cluster 3b: a child (transformation) is its own Character with its own
    // States/Current — no separate setChildVitals API is needed, it's the
    // exact same call with the child's own characterId.
    it('works identically for a child characterId', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([])
      const store = usePlayerStore()
      store.subscribeParty('camp-1')

      await store.setAdvantage('furmiaou', true)

      expect(mocks.updateCharacterState).toHaveBeenCalledWith('camp-1', 'furmiaou', {
        Advantage: true,
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

    it('unsubscribeParty detaches every character-state listener and the participants listener, and clears party', async () => {
      mocks.listCharactersByCampaign.mockResolvedValue([
        makeCharacter({ id: 'char-1', ownerUid: 'uid-1' }),
      ])
      const unsubscribeParticipants = vi.fn<() => void>()
      mocks.subscribeParticipantsByCampaign.mockImplementation((_campaignId, onChange) => {
        onChange([makeParticipant({ id: 'uid-1', uid: 'uid-1', status: 'Approved' })])
        return unsubscribeParticipants
      })
      const unsubscribeState = vi.fn<() => void>()
      mocks.subscribeCharacterState.mockImplementation((_campaignId, _characterId, onChange) => {
        onChange(makeState())
        return unsubscribeState
      })
      const store = usePlayerStore()

      store.subscribeParty('camp-1')
      await Promise.resolve() // flush the listCharactersByCampaign microtask
      expect(store.party.value).toHaveLength(1)

      store.unsubscribeParty()

      expect(unsubscribeParticipants).toHaveBeenCalledTimes(1)
      expect(unsubscribeState).toHaveBeenCalledTimes(1)
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
          makeParticipant({ id: 'uid-1', uid: 'uid-1', status: 'Approved' }),
          makeParticipant({ id: 'uid-2', uid: 'uid-2', status: 'Pending' }),
        ])
        return () => {}
      })
      mocks.subscribeCharacterState.mockImplementation((_campaignId, _characterId, onChange) => {
        onChange(makeState())
        return () => {}
      })
      const store = usePlayerStore()

      store.subscribeParty('camp-1')
      await Promise.resolve()

      expect(store.party.value).toEqual([
        { character: expect.objectContaining({ id: 'char-1' }), state: expect.any(Object) },
      ])
    })

    // FR-017 locked with the real seeded parent/child pair (scripts/data/
    // characters.json + participants.json): Firm Bintaggle ('firm') owns the
    // Furmiaou transformation ('furmiaou', parentCharacterId: 'firm'). `party`
    // must exclude Furmiaou even though it shares Firm's ownerUid (and would
    // therefore match the same Approved participant), because a character
    // with a parentCharacterId is filtered out before the participant check.
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
        onChange([makeParticipant({ id: 'xxx', uid: 'xxx', status: 'Approved' })])
        return () => {}
      })
      mocks.subscribeCharacterState.mockImplementation((_campaignId, _characterId, onChange) => {
        onChange(makeState())
        return () => {}
      })
      const store = usePlayerStore()

      store.subscribeParty('camp-1')
      await Promise.resolve()

      expect(store.party.value).toEqual([
        {
          character: expect.objectContaining({ id: 'firm', name: 'Firm Bintaggle' }),
          state: expect.any(Object),
        },
      ])
      expect(store.party.value.some((entry) => entry.character.id === 'furmiaou')).toBe(false)
    })
  })
})
