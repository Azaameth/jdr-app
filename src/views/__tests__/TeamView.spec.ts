import { describe, it, expect, vi } from 'vitest'
import { computed } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { CharacterProfile } from '../../models/types/Character'
import type { Participant } from '../../models/types/Participant'
import type { CharacterInventory, WeaponArmorItem } from '../../models/types/Inventory'

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

// Avoid real Firebase network calls (this dev box has live credentials
// configured) — TeamView only reads isMj/isAdmin off auth and campaigns off
// the campaign store, neither of which this suite exercises.
vi.mock('../../controllers/useAuthStore', () => ({
  useAuthStore: () => ({
    user: computed(() => null),
    isAdmin: computed(() => false),
    isMj: computed(() => false),
  }),
}))
vi.mock('../../controllers/useCampaignStore', () => ({
  useCampaignStore: () => ({
    campaigns: computed(() => []),
    fetchCampaigns: vi.fn<() => Promise<void>>(async () => {}),
  }),
}))

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-1',
    campaignId: 'campaign-1',
    ownerUid: 'uid-1',
    name: 'Mwassa',
    raceId: 'humain',
    classId: 'oracle',
    gender: 'Femme',
    elements: [],
    level: 3,
    attributes: {
      primary: { force: 0, social: 0, mental: 0 },
      secondary: { puissance: 0, finesse: 0, aura: 0, relation: 0, instinct: 0, savoir: 0 },
    },
    skills: [],
    gifts: [],
    languages: [],
    img: '',
    backstory: '',
    ...overrides,
  }
}

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 'part-1',
    uid: 'uid-1',
    campaignId: 'campaign-1',
    characterId: 'char-1',
    status: 'Approved',
    session: { hp: 10, maxHp: 10, mana: 4, maxMana: 4, posture: 'FOCUS' },
    ...overrides,
  }
}

function makeInventory(
  weapons: WeaponArmorItem[] = [],
  armor: WeaponArmorItem[] = [],
): CharacterInventory {
  return {
    id: 'inv-1',
    uid: 'uid-1',
    campaignId: 'campaign-1',
    characterId: 'char-1',
    items: [],
    weapons,
    armor,
    gold: 0,
  }
}

const listCharactersByCampaign = vi.fn<() => Promise<CharacterProfile[]>>()
const listParticipantsByCampaign = vi.fn<() => Promise<Participant[]>>()
const listInventoriesByCampaign = vi.fn<() => Promise<CharacterInventory[]>>()

vi.mock('../../models/repositories/CharacterRepository', () => ({
  listCharactersByCampaign: (...args: unknown[]) => listCharactersByCampaign(...(args as [])),
}))

vi.mock('../../models/repositories/ParticipantRepository', () => ({
  listParticipantsByCampaign: (...args: unknown[]) => listParticipantsByCampaign(...(args as [])),
  resetTeamSessionToMax: vi.fn<() => Promise<void>>(),
}))

vi.mock('../../models/repositories/InventoryRepository', () => ({
  listInventoriesByCampaign: (...args: unknown[]) => listInventoriesByCampaign(...(args as [])),
}))

import TeamView from '../TeamView.vue'

describe('TeamView', () => {
  it('shows a combined armor total with an AM/AP breakdown for an equipped character', async () => {
    listCharactersByCampaign.mockResolvedValue([makeCharacter()])
    listParticipantsByCampaign.mockResolvedValue([makeParticipant()])
    listInventoriesByCampaign.mockResolvedValue([
      makeInventory(
        [],
        [
          {
            itemId: 'a-1',
            name: "Robe d'Arcaniste",
            equipped: true,
            statBonus: { stat: 'armorMagique', amount: 2 },
          },
          {
            itemId: 'a-2',
            name: 'Bouclier',
            equipped: true,
            statBonus: { stat: 'armorPhysique', amount: 3 },
          },
        ],
      ),
    ])

    const wrapper = mount(TeamView)
    await flushPromises()

    expect(wrapper.findAll('th')[4]?.text()).toBe('Armure')
    expect(wrapper.find('.armor-total').text()).toBe('5')
    expect(wrapper.find('.armor-breakdown').text()).toBe('AM 2 · AP 3')
  })

  it('shows a zero armor total for a character with no equipped bonuses', async () => {
    listCharactersByCampaign.mockResolvedValue([makeCharacter()])
    listParticipantsByCampaign.mockResolvedValue([makeParticipant()])
    listInventoriesByCampaign.mockResolvedValue([])

    const wrapper = mount(TeamView)
    await flushPromises()

    expect(wrapper.find('.armor-total').text()).toBe('0')
    expect(wrapper.find('.armor-breakdown').text()).toBe('AM 0 · AP 0')
  })

  it('displays effective max PV/Mana (raw stored max plus equipped bonuses), not the raw stored max', async () => {
    listCharactersByCampaign.mockResolvedValue([makeCharacter()])
    listParticipantsByCampaign.mockResolvedValue([
      makeParticipant({ session: { hp: 10, maxHp: 10, mana: 4, maxMana: 4, posture: 'FOCUS' } }),
    ])
    listInventoriesByCampaign.mockResolvedValue([
      makeInventory([], [
        {
          itemId: 'a-ring',
          name: 'Anneau de Mana',
          equipped: true,
          statBonus: { stat: 'maxMana', amount: 4 },
        },
      ]),
    ])

    const wrapper = mount(TeamView)
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('10 / 10')
    expect(text).toContain('4 / 8')
  })
})
