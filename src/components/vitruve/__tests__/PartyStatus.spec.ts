import { describe, it, expect, vi } from 'vitest'
import { computed } from 'vue'
import { mount } from '@vue/test-utils'
import type { CharacterProfile } from '../../../models/types/Character'
import type { CharacterSessionState } from '../../../models/types/Participant'

// PartyStatus consumes usePlayerStore().party directly (singleton composable
// — no data props). Mock the store module the same way PlayerView.spec.ts
// mocks useAuthStore/useInventoryStore.
const mockParty =
  vi.fn<() => Array<{ character: CharacterProfile; session: CharacterSessionState }>>()
vi.mock('../../../controllers/usePlayerStore', () => ({
  usePlayerStore: () => ({
    party: computed(() => mockParty()),
  }),
}))

import PartyStatus from '../PartyStatus.vue'

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-1',
    campaignId: 'camp-1',
    ownerUid: 'uid-1',
    name: 'Azarius',
    raceId: 'r1',
    classId: 'c1',
    gender: 'Homme',
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

function makeSession(overrides: Partial<CharacterSessionState> = {}): CharacterSessionState {
  return {
    hp: 40,
    maxHp: 50,
    mana: 10,
    maxMana: 20,
    posture: 'OFFENSIF',
    ...overrides,
  }
}

describe('PartyStatus', () => {
  it('renders one row per entry provided by party, in order', () => {
    mockParty.mockReturnValue([
      { character: makeCharacter({ id: 'char-1', name: 'Azarius' }), session: makeSession() },
      { character: makeCharacter({ id: 'char-2', name: 'Nindey' }), session: makeSession({ hp: 5, maxHp: 50 }) },
    ])

    const wrapper = mount(PartyStatus)

    const rows = wrapper.findAll('.party-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.find('.party-row-name').text()).toBe('Azarius')
    expect(rows[1]?.find('.party-row-name').text()).toBe('Nindey')
  })

  it('renders exactly what party provides — no additional filtering in the component', () => {
    // The store already excludes children/non-approved (I-C2/FR-017);
    // PartyStatus must not re-filter — it renders every entry it's given.
    mockParty.mockReturnValue([
      { character: makeCharacter({ id: 'furmiaou', name: 'Furmiaou', parentCharacterId: 'firm' }), session: makeSession() },
    ])

    const wrapper = mount(PartyStatus)

    expect(wrapper.findAll('.party-row')).toHaveLength(1)
    expect(wrapper.find('.party-row-name').text()).toBe('Furmiaou')
  })

  it('shows PV and mana as current/max text', () => {
    mockParty.mockReturnValue([
      { character: makeCharacter(), session: makeSession({ hp: 12, maxHp: 50, mana: 3, maxMana: 20 }) },
    ])

    const wrapper = mount(PartyStatus)

    expect(wrapper.find('.party-row-hp-text').text()).toBe('12/50 PV')
    expect(wrapper.find('.party-row-mana-text').text()).toBe('3/20 mana')
  })

  it('applies the low-PV warning class when hp is at or below 25% of maxHp', () => {
    mockParty.mockReturnValue([
      { character: makeCharacter({ id: 'low' }), session: makeSession({ hp: 12, maxHp: 50 }) }, // 24% ≤ 25%
      { character: makeCharacter({ id: 'ok' }), session: makeSession({ hp: 13, maxHp: 50 }) }, // 26% > 25%
    ])

    const wrapper = mount(PartyStatus)
    const rows = wrapper.findAll('.party-row')

    expect(rows[0]?.find('.party-row-hp-text').classes()).toContain('low-hp')
    expect(rows[0]?.find('.party-bar-fill').classes()).toContain('low-hp')
    expect(rows[1]?.find('.party-row-hp-text').classes()).not.toContain('low-hp')
  })

  it('marks the row matching highlightCharacterId as highlighted', () => {
    mockParty.mockReturnValue([
      { character: makeCharacter({ id: 'char-1' }), session: makeSession() },
      { character: makeCharacter({ id: 'char-2' }), session: makeSession() },
    ])

    const wrapper = mount(PartyStatus, { props: { highlightCharacterId: 'char-2' } })
    const rows = wrapper.findAll('.party-row')

    expect(rows[0]?.classes()).not.toContain('highlighted')
    expect(rows[1]?.classes()).toContain('highlighted')
  })

  it('shows the French empty-state note when party is empty — never a blank card', () => {
    mockParty.mockReturnValue([])

    const wrapper = mount(PartyStatus)

    expect(wrapper.find('.party-status-empty').exists()).toBe(true)
    expect(wrapper.find('.party-status-empty').text()).toBe('Aucun personnage dans le groupe.')
    expect(wrapper.find('.party-row').exists()).toBe(false)
  })
})
