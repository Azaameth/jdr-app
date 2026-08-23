import { describe, it, expect, vi } from 'vitest'
import { computed } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { CharacterProfile } from '../../models/types/Character'
import type { CharacterStateDocument } from '../../models/repositories/CharacterStateRepository'
import type { CharacterEquipmentDocument, GearEntry } from '../../models/repositories/EquipmentRepository'

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

function makeState(overrides: Partial<CharacterStateDocument> = {}): CharacterStateDocument {
  return {
    Health: 10,
    HealthCurrent: 10,
    Mana: 4,
    ManaCurrent: 4,
    Posture: 'FOCUS',
    PlayerId: 'uid-1',
    CampaignId: 'campaign-1',
    ...overrides,
  }
}

function makeEquipment(
  weapons: GearEntry[] = [],
  armor: GearEntry[] = [],
): CharacterEquipmentDocument & { characterId: string } {
  return {
    characterId: 'char-1',
    Weapons: weapons,
    Armor: armor,
    Currency: 0,
    PlayerId: 'uid-1',
    CampaignId: 'campaign-1',
  }
}

const listCharactersByCampaign = vi.fn<() => Promise<CharacterProfile[]>>()
const getCharacterState = vi.fn<() => Promise<CharacterStateDocument | null>>()
const listEquipmentByCampaign =
  vi.fn<() => Promise<Array<CharacterEquipmentDocument & { characterId: string }>>>()

vi.mock('../../models/repositories/CharacterRepository', () => ({
  listCharactersByCampaign: (...args: unknown[]) => listCharactersByCampaign(...(args as [])),
}))

vi.mock('../../models/repositories/CharacterStateRepository', () => ({
  getCharacterState: (...args: unknown[]) => getCharacterState(...(args as [])),
  resetTeamStatesToMax: vi.fn<() => Promise<number>>(),
}))

vi.mock('../../models/repositories/EquipmentRepository', () => ({
  listEquipmentByCampaign: (...args: unknown[]) => listEquipmentByCampaign(...(args as [])),
}))

import TeamView from '../TeamView.vue'

describe('TeamView', () => {
  it('shows a combined armor total with an AM/AP breakdown for an equipped character', async () => {
    listCharactersByCampaign.mockResolvedValue([makeCharacter()])
    getCharacterState.mockResolvedValue(makeState())
    listEquipmentByCampaign.mockResolvedValue([
      makeEquipment(
        [],
        [
          { EntryId: 'a-1', DisplayName: "Robe d'Arcaniste", BonusRaw: { MagicalArmor: 2 } },
          { EntryId: 'a-2', DisplayName: 'Bouclier', BonusRaw: { PhysicalArmor: 3 } },
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
    getCharacterState.mockResolvedValue(makeState())
    listEquipmentByCampaign.mockResolvedValue([])

    const wrapper = mount(TeamView)
    await flushPromises()

    expect(wrapper.find('.armor-total').text()).toBe('0')
    expect(wrapper.find('.armor-breakdown').text()).toBe('AM 0 · AP 0')
  })

  it('displays effective max PV/Mana (raw stored max plus equipped bonuses), not the raw stored max', async () => {
    listCharactersByCampaign.mockResolvedValue([makeCharacter()])
    getCharacterState.mockResolvedValue(makeState({ Health: 10, HealthCurrent: 10, Mana: 4, ManaCurrent: 4 }))
    listEquipmentByCampaign.mockResolvedValue([
      makeEquipment([], [{ EntryId: 'a-ring', DisplayName: 'Anneau de Mana', BonusRaw: { Mana: 4 } }]),
    ])

    const wrapper = mount(TeamView)
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('10 / 10')
    expect(text).toContain('4 / 8')
  })
})
