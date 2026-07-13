import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRoute: () => ({ params: { id: 'campaign-1', characterId: 'char-1' } }),
  }
})

const characterFixture = {
  id: 'char-1',
  campaignId: 'campaign-1',
  ownerUid: 'uid-1',
  name: 'Azarius',
  raceId: 'kitsune',
  classId: 'cogneur',
  gender: 'Homme',
  elements: ['🔥 Feu'],
  level: 3,
  xp: 120,
  attributes: {
    primary: { force: 85, social: 45, mental: 40 },
    secondary: { puissance: 6, finesse: 3, aura: 3, relation: 2, instinct: 2, savoir: 2 },
  },
  skills: [{ id: 'skill-1', name: 'Persuasion', rank: 2, domain: 'social' }],
  gifts: [{ id: 'gift-1', name: 'Frappe Ardente', description: 'Inflige des dégâts de feu.' }],
  languages: ['Commun'],
  lore: { backstory: 'Un guerrier errant.', notesPrivate: 'Craint le froid.' },
}

const membershipFixture = {
  uid: 'uid-1',
  campaignId: 'campaign-1',
  characterId: 'char-1',
  status: 'approved',
  personalNote: '',
  session: {
    hp: 10,
    maxHp: 14,
    mana: 5,
    maxMana: 9,
    posture: 'FOCUS',
    inventory: [{ itemId: 'inv-1', name: 'Vieille épée', quantity: 1, equipped: true }],
  },
}

vi.mock('../../models/repositories/CharacterRepository', () => ({
  getCharacterById: vi.fn<() => Promise<typeof characterFixture>>(async () => characterFixture),
  updateCharacter: vi.fn<() => Promise<void>>(async () => {}),
}))

vi.mock('../../models/repositories/MembershipRepository', () => ({
  getMembershipByCharacterId: vi.fn<() => Promise<typeof membershipFixture>>(
    async () => membershipFixture,
  ),
}))

vi.mock('../../models/repositories/RaceRepository', () => ({
  listRacesByCampaign: vi.fn<() => Promise<unknown[]>>(async () => []),
}))

vi.mock('../../models/repositories/ClassRepository', () => ({
  listClassesByCampaign: vi.fn<() => Promise<unknown[]>>(async () => []),
}))

vi.mock('../../controllers/useAuthStore', () => ({
  useAuthStore: () => ({
    user: { value: { uid: 'uid-1' } },
    isMj: { value: false },
    isAdmin: { value: false },
    isPlayer: { value: true },
  }),
}))

import PlayerView from '../PlayerView.vue'

describe('PlayerView', () => {
  it('renders every section for a fully-populated character in a two-column layout', async () => {
    const wrapper = mount(PlayerView)
    await flushPromises()

    expect(wrapper.find('.player-columns').exists()).toBe(true)
    expect(wrapper.find('.player-col-left').exists()).toBe(true)
    expect(wrapper.find('.player-col-right').exists()).toBe(true)

    // Left column: Identité, Bonus, Attributs
    expect(wrapper.find('h1').text()).toBe('Azarius')
    expect(wrapper.text()).toContain('Bonus de race et de classe')
    expect(wrapper.text()).toContain('Attributs principaux')

    // Right column: Compétences, Dons, Histoire, État de session
    expect(wrapper.text()).toContain('Compétences')
    expect(wrapper.text()).toContain('Dons')
    expect(wrapper.text()).toContain('Histoire')
    expect(wrapper.text()).toContain('État de session')

    const leftHtml = wrapper.find('.player-col-left').html()
    const rightHtml = wrapper.find('.player-col-right').html()
    expect(leftHtml).toContain('Bonus de race et de classe')
    expect(rightHtml).toContain('Compétences')
    expect(rightHtml).toContain('État de session')
  })

  it('renders a portrait image derived from the character id', async () => {
    const wrapper = mount(PlayerView)
    await flushPromises()

    const portrait = wrapper.find('img.portrait')
    expect(portrait.exists()).toBe(true)
    expect(portrait.attributes('src')).toContain('images/portraits/char-1.jpg')
  })
})
