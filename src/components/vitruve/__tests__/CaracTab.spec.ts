import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CaracTab from '../CaracTab.vue'
import { useTickState } from '../tickState'
import type { CharacterProfile, CharacterSkill } from '../../../models/types/Character'
import type { CharacterSessionState, Posture } from '../../../models/types/Participant'
import type { Race } from '../../../models/types/Race'

function makeSkill(overrides: Partial<CharacterSkill> = {}): CharacterSkill {
  return {
    id: 'skill-1',
    name: 'Artisan',
    rank: 1.5,
    domain: 'general',
    ...overrides,
  }
}

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-1',
    campaignId: 'campaign-1',
    ownerUid: 'owner-uid',
    name: 'Nindey Traqué',
    raceId: 'r1',
    classId: 'c1',
    gender: 'Homme',
    elements: ['Foudre'],
    level: 1,
    attributes: {
      primary: { force: 80, social: 20, mental: 50 },
      secondary: { puissance: 5, finesse: 3, aura: 2, relation: 2, instinct: 4, savoir: 1 },
    },
    skills: [
      makeSkill({ id: 's-puissance', name: 'Puissance', rank: 5 }),
      makeSkill({ id: 's-savoir-var', name: 'Savoir (Expert Runique)', rank: 1 }),
      makeSkill({ id: 's-artisan', name: 'Artisan', rank: 1.5 }),
    ],
    gifts: [],
    languages: [],
    img: '',
    backstory: '',
    ...overrides,
  }
}

function makeSession(overrides: Partial<CharacterSessionState> = {}): CharacterSessionState {
  return {
    hp: 11,
    maxHp: 11,
    mana: 9,
    maxMana: 9,
    posture: 'OFFENSIF',
    ...overrides,
  }
}

const postureOptions: Array<{ value: Posture; label: string; tone: string }> = [
  { value: 'DEFENSIF', label: 'Défensif', tone: 'def' },
  { value: 'OFFENSIF', label: 'Offensif', tone: 'off' },
  { value: 'FOCUS', label: 'Focus', tone: 'focus' },
]

describe('CaracTab', () => {
  beforeEach(() => {
    useTickState().reset()
  })

  it('renders the three categories (Physique, Social, Mental) from the fixture character', () => {
    const wrapper = mount(CaracTab, {
      props: {
        character: makeCharacter(),
        session: makeSession(),
        canEdit: false,
        postureOptions,
      },
    })

    const labels = wrapper.findAll('.cat-label').map((el) => el.text())
    expect(labels).toEqual(['Physique', 'Social', 'Mental'])
    // No injuries ⇒ adjusted % equals the base primary attribute.
    const pcts = wrapper.findAll('.cat-pct').map((el) => el.text())
    expect(pcts).toEqual(['80%', '20%', '50%'])
  })

  it('injury click emits set-injury with the next state (saine → jaune)', async () => {
    const wrapper = mount(CaracTab, {
      props: {
        character: makeCharacter(),
        session: makeSession(),
        canEdit: true,
        postureOptions,
      },
    })

    const squares = wrapper.findAll('.injury-square')
    await squares[0]?.trigger('click')

    expect(wrapper.emitted('set-injury')).toEqual([['puissance', 'jaune']])
  })

  it('injury click emits the next state through the full cycle (jaune → rouge → saine)', async () => {
    const wrapper = mount(CaracTab, {
      props: {
        character: makeCharacter(),
        session: makeSession({ injuries: { puissance: 'jaune' } }),
        canEdit: true,
        postureOptions,
      },
    })

    await wrapper.findAll('.injury-square')[0]?.trigger('click')
    expect(wrapper.emitted('set-injury')?.[0]).toEqual(['puissance', 'rouge'])
  })

  it('rouge cycles back to saine (null)', async () => {
    const wrapper = mount(CaracTab, {
      props: {
        character: makeCharacter(),
        session: makeSession({ injuries: { puissance: 'rouge' } }),
        canEdit: true,
        postureOptions,
      },
    })

    await wrapper.findAll('.injury-square')[0]?.trigger('click')
    expect(wrapper.emitted('set-injury')?.[0]).toEqual(['puissance', null])
  })

  it('both subs rouge pins the category percentage at 5', () => {
    const wrapper = mount(CaracTab, {
      props: {
        character: makeCharacter(),
        session: makeSession({ injuries: { puissance: 'rouge', finesse: 'rouge' } }),
        canEdit: false,
        postureOptions,
      },
    })

    const pcts = wrapper.findAll('.cat-pct').map((el) => el.text())
    expect(pcts[0]).toBe('5%')
    expect(pcts).toHaveLength(3)
  })

  it('squares are read-only (disabled) when canEdit is false and clicking does not emit', async () => {
    const wrapper = mount(CaracTab, {
      props: {
        character: makeCharacter(),
        session: makeSession(),
        canEdit: false,
        postureOptions,
      },
    })

    const squares = wrapper.findAll('.injury-square')
    expect(squares.every((sq) => (sq.element as HTMLButtonElement).disabled)).toBe(true)

    await squares[0]?.trigger('click')
    expect(wrapper.emitted('set-injury')).toBeUndefined()
  })

  it('excludes the six secondary-attribute names (and their "savoir (xxx)" variants) from compétences', () => {
    const wrapper = mount(CaracTab, {
      props: {
        character: makeCharacter(),
        session: makeSession(),
        canEdit: false,
        postureOptions,
      },
    })

    const names = wrapper.findAll('.tick-row .tick-label').map((el) => el.text())
    expect(names).toEqual(['Artisan'])
    expect(names).not.toContain('Puissance')
    expect(names).not.toContain('Savoir (Expert Runique)')
  })

  it('shows the empty-compétences note when there are no extra skills', () => {
    const wrapper = mount(CaracTab, {
      props: {
        character: makeCharacter({
          skills: [makeSkill({ id: 's-puissance', name: 'Puissance', rank: 5 })],
        }),
        session: makeSession(),
        canEdit: false,
        postureOptions,
      },
    })

    expect(wrapper.find('.empty-note').text()).toBe('Aucune compétence spéciale.')
  })

  it('renders race bonus/malus entries with checkboxes when race data is present', () => {
    const race: Race = {
      id: 'r1',
      DisplayName: 'Nain',
      Description: '',
      PictureUrl: '',
      Bonuses: {},
      Traits: {},
      StatConstraints: {},
      Strengths: ['Artisanat métal/pierre +20%'],
      Weaknesses: ['Déplacement rapide −10%'],
    }
    const wrapper = mount(CaracTab, {
      props: {
        character: makeCharacter(),
        session: makeSession(),
        canEdit: false,
        race,
        postureOptions,
      },
    })

    expect(wrapper.text()).toContain('Bonus & malus de race')
    const raceRows = wrapper.findAll('.tick-row.bonus, .tick-row.malus')
    expect(raceRows).toHaveLength(2)
  })

  it('omits the race bonus/malus section entirely when no race is provided', () => {
    const wrapper = mount(CaracTab, {
      props: {
        character: makeCharacter(),
        session: makeSession(),
        canEdit: false,
        postureOptions,
      },
    })

    expect(wrapper.text()).not.toContain('Bonus & malus de race')
  })

  it('posture button click emits set-posture with the selected value', async () => {
    const wrapper = mount(CaracTab, {
      props: {
        character: makeCharacter(),
        session: makeSession({ posture: 'FOCUS' }),
        canEdit: true,
        postureOptions,
      },
    })

    const buttons = wrapper.findAll('.posture-btn')
    const defensif = buttons.find((btn) => btn.text() === 'Défensif')
    await defensif?.trigger('click')

    expect(wrapper.emitted('set-posture')).toEqual([['DEFENSIF']])
  })

  it('renders PV/max, Mana/max and Niveau summary cards', () => {
    const wrapper = mount(CaracTab, {
      props: {
        character: makeCharacter({ level: 4 }),
        session: makeSession({ hp: 8, maxHp: 14, mana: 3, maxMana: 9 }),
        canEdit: false,
        postureOptions,
      },
    })

    expect(wrapper.find('.vcard-val.big.pv').text()).toBe('8')
    expect(wrapper.find('.vcard-val.big.mana').text()).toBe('3')
    expect(wrapper.text()).toContain('PV / 14')
    expect(wrapper.text()).toContain('Mana / 9')
    expect(wrapper.text()).toContain('4')
  })
})
