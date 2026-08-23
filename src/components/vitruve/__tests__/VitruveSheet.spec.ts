import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VitruveSheet from '../VitruveSheet.vue'
import type { CharacterProfile } from '../../../models/types/Character'
import type { Participant } from '../../../models/types/Participant'

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-1',
    campaignId: 'campaign-1',
    ownerUid: 'owner-uid',
    name: 'Azarius Desbois',
    raceId: 'r1',
    classId: 'c1',
    gender: 'Homme',
    elements: ['Feu'],
    level: 3,
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

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 'part-1',
    uid: 'owner-uid',
    campaignId: 'campaign-1',
    characterId: 'char-1',
    status: 'Approved',
    session: {
      hp: 8,
      maxHp: 14,
      mana: 3,
      maxMana: 9,
      posture: 'FOCUS',
    },
    ...overrides,
  }
}

describe('VitruveSheet', () => {
  it('renders the character name, subtitle and vitals from props', () => {
    const wrapper = mount(VitruveSheet, {
      props: {
        character: makeCharacter(),
        participant: makeParticipant(),
        raceName: 'Kitsune',
        className: 'Cogneur',
        canEditSession: true,
        sessionLoading: null,
      },
    })

    expect(wrapper.find('.vit-name').text()).toBe('Azarius Desbois')
    expect(wrapper.find('.vit-sub').text()).toBe('Kitsune · Cogneur · Niv.3 · Feu')
    expect(wrapper.find('.pv-pill .vbig').text()).toBe('8')
    expect(wrapper.find('.pv-pill .vlbl').text()).toBe('PV / 14')
    expect(wrapper.find('.mana-pill .vbig').text()).toBe('3')
    expect(wrapper.find('.mana-pill .vlbl').text()).toBe('Mana / 9')
  })

  it('emits adjust-hp and adjust-mana with the clicked delta', async () => {
    const wrapper = mount(VitruveSheet, {
      props: {
        character: makeCharacter(),
        participant: makeParticipant(),
        canEditSession: true,
        sessionLoading: null,
      },
    })

    const pvButtons = wrapper.findAll('.pv-pill .vbtn')
    await pvButtons[0]?.trigger('click')
    await pvButtons[1]?.trigger('click')

    const manaButtons = wrapper.findAll('.mana-pill .vbtn')
    await manaButtons[0]?.trigger('click')
    await manaButtons[1]?.trigger('click')

    expect(wrapper.emitted('adjust-hp')).toEqual([[-1], [1]])
    expect(wrapper.emitted('adjust-mana')).toEqual([[-1], [1]])
  })

  it('hides the steppers when canEditSession is false', () => {
    const wrapper = mount(VitruveSheet, {
      props: {
        character: makeCharacter(),
        participant: makeParticipant(),
        canEditSession: false,
        sessionLoading: null,
      },
    })

    expect(wrapper.find('.pv-pill .vbtns').exists()).toBe(false)
    expect(wrapper.find('.mana-pill .vbtns').exists()).toBe(false)
    // Values remain visible in read-only mode.
    expect(wrapper.find('.pv-pill .vbig').text()).toBe('8')
  })

  it('disables the steppers while that stat is loading', () => {
    const wrapper = mount(VitruveSheet, {
      props: {
        character: makeCharacter(),
        participant: makeParticipant(),
        canEditSession: true,
        sessionLoading: 'hp',
      },
    })

    const pvButtons = wrapper.findAll('.pv-pill .vbtn')
    expect(pvButtons[0]?.attributes('disabled')).toBeDefined()
    expect(pvButtons[1]?.attributes('disabled')).toBeDefined()
    const manaButtons = wrapper.findAll('.mana-pill .vbtn')
    expect(manaButtons[0]?.attributes('disabled')).toBeDefined()
    expect(manaButtons[1]?.attributes('disabled')).toBeDefined()
  })

  it('renders no vitals strip when the participant has no session', () => {
    const wrapper = mount(VitruveSheet, {
      props: {
        character: makeCharacter(),
        participant: null,
        canEditSession: false,
        sessionLoading: null,
      },
    })

    expect(wrapper.find('.vitals-strip').exists()).toBe(false)
  })

  it('renders the portrait image when character.img is set', () => {
    const wrapper = mount(VitruveSheet, {
      props: {
        character: makeCharacter({ img: 'images/azarius.jpg' }),
        participant: makeParticipant(),
        canEditSession: true,
        sessionLoading: null,
      },
    })

    expect(wrapper.find('img.portrait').exists()).toBe(true)
    expect(wrapper.find('.vit-portrait').exists()).toBe(false)
  })

  it('renders the placeholder icon fallback when character.img is absent', () => {
    const wrapper = mount(VitruveSheet, {
      props: {
        character: makeCharacter({ img: '' }),
        participant: makeParticipant(),
        canEditSession: true,
        sessionLoading: null,
      },
    })

    expect(wrapper.find('img.portrait').exists()).toBe(false)
    expect(wrapper.find('.vit-portrait').exists()).toBe(true)
  })

  it('falls back to the placeholder icon when the portrait image fails to load', async () => {
    const wrapper = mount(VitruveSheet, {
      props: {
        character: makeCharacter({ img: 'images/broken.jpg' }),
        participant: makeParticipant(),
        canEditSession: true,
        sessionLoading: null,
      },
    })

    expect(wrapper.find('img.portrait').exists()).toBe(true)
    await wrapper.find('img.portrait').trigger('error')

    expect(wrapper.find('img.portrait').exists()).toBe(false)
    expect(wrapper.find('.vit-portrait').exists()).toBe(true)
  })

  it('renders the empty widgets slot with no default content', () => {
    const wrapper = mount(VitruveSheet, {
      props: {
        character: makeCharacter(),
        participant: makeParticipant(),
        canEditSession: true,
        sessionLoading: null,
      },
    })

    expect(wrapper.find('.vitruve-widgets').text()).toBe('')
  })

  it('renders a combined armor total with an AM/AP breakdown from equipped items', () => {
    const wrapper = mount(VitruveSheet, {
      props: {
        character: makeCharacter(),
        participant: makeParticipant(),
        canEditSession: true,
        sessionLoading: null,
        equipment: [
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
      },
    })

    expect(wrapper.find('.armor-total').text()).toBe('5')
    expect(wrapper.find('.armor-breakdown').text()).toBe('AM 2 · AP 3')
  })

  it('shows an all-zero armor total when there is no equipment', () => {
    const wrapper = mount(VitruveSheet, {
      props: {
        character: makeCharacter(),
        participant: makeParticipant(),
        canEditSession: true,
        sessionLoading: null,
      },
    })

    expect(wrapper.find('.armor-total').text()).toBe('0')
    expect(wrapper.find('.armor-breakdown').text()).toBe('AM 0 · AP 0')
  })
})
