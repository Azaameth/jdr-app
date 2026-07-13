import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRoute: () => ({ params: { id: 'campaign-1' } }),
    useRouter: () => ({ push: vi.fn<(path: string) => void>() }),
  }
})

vi.mock('../../components/layout/CampaignShell.vue', () => ({
  default: {
    name: 'CampaignShell',
    template: '<div><slot /></div>',
  },
}))

vi.mock('../../controllers/useCampaignStore', () => ({
  useCampaignStore: () => ({
    campaigns: { value: [{ id: 'campaign-1', title: 'Campagne Test' }] },
    fetchCampaigns: vi.fn<() => Promise<void>>(async () => {}),
  }),
}))

const characterFixtures = [
  {
    id: 'char-1',
    campaignId: 'campaign-1',
    ownerUid: 'uid-1',
    name: 'Azarius',
    raceId: 'kitsune',
    classId: 'cogneur',
    gender: 'Homme',
    elements: [],
    level: 3,
    attributes: { primary: { force: 0, social: 0, mental: 0 }, secondary: {} },
    skills: [],
    gifts: [],
    languages: [],
    lore: { backstory: '' },
  },
  {
    id: 'char-2',
    campaignId: 'campaign-1',
    ownerUid: 'uid-2',
    name: 'Orphelin',
    raceId: 'race-inconnue',
    classId: 'classe-inconnue',
    gender: 'Femme',
    elements: [],
    level: 1,
    attributes: { primary: { force: 0, social: 0, mental: 0 }, secondary: {} },
    skills: [],
    gifts: [],
    languages: [],
    lore: { backstory: '' },
  },
]

const membershipFixtures = [
  {
    uid: 'uid-1',
    campaignId: 'campaign-1',
    characterId: 'char-1',
    status: 'approved',
    personalNote: '',
    session: { hp: 10, maxHp: 14, mana: 5, maxMana: 9, posture: 'FOCUS', inventory: [] },
  },
]

const raceFixtures = [{ id: 'kitsune', n: 'Kitsune', sub: '', img: '', bon: [], mal: [] }]
const classFixtures = [
  { id: 'cogneur', n: 'Cogneur', sub: '', img: '', pv: '10', mana: '5', arm: '2', caps: [] },
]

const { createCharacterMock } = vi.hoisted(() => ({
  createCharacterMock: vi.fn<(input: unknown) => Promise<{ characterId: string }>>(),
}))

vi.mock('../../models/repositories/CharacterRepository', () => ({
  listCharactersByCampaign: vi.fn<() => Promise<typeof characterFixtures>>(
    async () => characterFixtures,
  ),
  createCharacterWithMembership: createCharacterMock,
}))

vi.mock('../../models/repositories/MembershipRepository', () => ({
  listMembershipsByCampaign: vi.fn<() => Promise<typeof membershipFixtures>>(
    async () => membershipFixtures,
  ),
}))

vi.mock('../../models/repositories/RaceRepository', () => ({
  listRacesByCampaign: vi.fn<() => Promise<typeof raceFixtures>>(async () => raceFixtures),
}))

vi.mock('../../models/repositories/ClassRepository', () => ({
  listClassesByCampaign: vi.fn<() => Promise<typeof classFixtures>>(async () => classFixtures),
}))

const authStoreState = { role: 'mj' as 'mj' | 'admin' | 'joueur' }

vi.mock('../../controllers/useAuthStore', () => ({
  useAuthStore: () => ({
    isMj: { value: authStoreState.role === 'mj' },
    isAdmin: { value: authStoreState.role === 'admin' },
    isPlayer: { value: authStoreState.role === 'joueur' },
  }),
}))

import TeamView from '../TeamView.vue'

describe('TeamView', () => {
  it('resolves race/class names instead of showing raw IDs', async () => {
    authStoreState.role = 'mj'
    const wrapper = mount(TeamView)
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows[0]?.text()).toContain('Kitsune')
    expect(rows[0]?.text()).toContain('Cogneur')
  })

  it('shows a visible fallback for an orphaned race/class reference', async () => {
    authStoreState.role = 'mj'
    const wrapper = mount(TeamView)
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows[1]?.text()).toContain('(inconnu : race-inconnue)')
    expect(rows[1]?.text()).toContain('(inconnu : classe-inconnue)')
  })

  it('shows the "Nouveau personnage" button for mj/admin but not for joueur', async () => {
    authStoreState.role = 'mj'
    const mjWrapper = mount(TeamView)
    await flushPromises()
    expect(mjWrapper.find('.new-character-btn').exists()).toBe(true)

    authStoreState.role = 'joueur'
    const playerWrapper = mount(TeamView)
    await flushPromises()
    expect(playerWrapper.find('.new-character-btn').exists()).toBe(false)
  })
})
