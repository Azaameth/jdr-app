import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChildSheetTab from '../ChildSheetTab.vue'
import type { CharacterProfile } from '../../../models/types/Character'
import type { CharacterSessionState } from '../../../models/types/Participant'

function makeChild(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'furmiaou',
    campaignId: 'campaign-1',
    ownerUid: 'owner-uid',
    parentCharacterId: 'firm',
    name: 'Furmiaou',
    raceId: 'r1',
    classId: 'c1',
    gender: 'Autre',
    elements: ['Nature', 'Transmutation'],
    level: 1,
    attributes: {
      primary: { force: 65, social: 50, mental: 55 },
      secondary: { puissance: 5, finesse: 2, aura: 3, relation: 2, instinct: 5, savoir: 1 },
    },
    skills: [],
    gifts: [],
    languages: [],
    img: '/images/portraits/furmiaou.jpg',
    backstory: '',
    ...overrides,
  }
}

function makeSession(overrides: Partial<CharacterSessionState> = {}): CharacterSessionState {
  return {
    hp: 48,
    maxHp: 48,
    mana: 0,
    maxMana: 0,
    posture: 'FOCUS',
    ...overrides,
  }
}

describe('ChildSheetTab', () => {
  it('renders the "«name» — Forme" header', () => {
    const wrapper = mount(ChildSheetTab, {
      props: { child: makeChild(), childSession: makeSession(), canEdit: false },
    })

    expect(wrapper.find('.child-head').text()).toBe('Furmiaou — Forme')
  })

  it('renders PV/max and Mana/max from the childSession prop', () => {
    const wrapper = mount(ChildSheetTab, {
      props: {
        child: makeChild(),
        childSession: makeSession({ hp: 40, maxHp: 48, mana: 0, maxMana: 0 }),
        canEdit: false,
      },
    })

    expect(wrapper.find('.vcard-val.big.pv').text()).toBe('40')
    expect(wrapper.text()).toContain('PV / 48')
    expect(wrapper.find('.vcard-val.big.mana').text()).toBe('0')
    expect(wrapper.text()).toContain('Mana / 0')
  })

  it('shows the "Aucune magie" italic note when maxMana is 0', () => {
    const wrapper = mount(ChildSheetTab, {
      props: { child: makeChild(), childSession: makeSession({ maxMana: 0 }), canEdit: false },
    })

    expect(wrapper.find('.no-mana-note').exists()).toBe(true)
    expect(wrapper.find('.no-mana-note').text()).toBe('Aucune magie')
  })

  it('hides the "Aucune magie" note when the child actually has mana', () => {
    const wrapper = mount(ChildSheetTab, {
      props: {
        child: makeChild(),
        childSession: makeSession({ mana: 3, maxMana: 6 }),
        canEdit: false,
      },
    })

    expect(wrapper.find('.no-mana-note').exists()).toBe(false)
  })

  it('falls back to an all-zero session (never NaN) when childSession is null', () => {
    const wrapper = mount(ChildSheetTab, {
      props: { child: makeChild(), childSession: null, canEdit: true },
    })

    expect(wrapper.text()).toContain('PV / 0')
    expect(wrapper.find('.vcard-val.big.pv').text()).toBe('0')
    expect(wrapper.find('.no-mana-note').exists()).toBe(true)
    // Both steppers read as disabled: hp (0) already sits at both the floor
    // (-maxHp = 0) and the ceiling (maxHp = 0) of the fallback's clamp range.
    const minus = wrapper.find('[aria-label="Diminuer les PV"]')
    const plus = wrapper.find('[aria-label="Augmenter les PV"]')
    expect(minus.attributes('disabled')).toBeDefined()
    expect(plus.attributes('disabled')).toBeDefined()
  })

  it('renders element badges from child.elements', () => {
    const wrapper = mount(ChildSheetTab, {
      props: { child: makeChild(), childSession: makeSession(), canEdit: false },
    })

    const badges = wrapper.findAll('.element-badge').map((el) => el.text())
    expect(badges).toEqual(['Nature', 'Transmutation'])
  })

  it('omits the element-badges row entirely when the child has no elements', () => {
    const wrapper = mount(ChildSheetTab, {
      props: { child: makeChild({ elements: [] }), childSession: makeSession(), canEdit: false },
    })

    expect(wrapper.find('.element-badges').exists()).toBe(false)
  })

  it('renders the three carac categories (Physique/Social/Mental) with the CHILD attributes', () => {
    const wrapper = mount(ChildSheetTab, {
      props: { child: makeChild(), childSession: makeSession(), canEdit: false },
    })

    const labels = wrapper.findAll('.cat-label').map((el) => el.text())
    expect(labels).toEqual(['Physique', 'Social', 'Mental'])
    const pcts = wrapper.findAll('.cat-pct').map((el) => el.text())
    // No injuries ⇒ adjusted % equals the base primary attribute (65/50/55).
    expect(pcts).toEqual(['65%', '50%', '55%'])
  })

  it('emits adjust-hp(1)/(-1) when the PV steppers are clicked', async () => {
    const wrapper = mount(ChildSheetTab, {
      props: { child: makeChild(), childSession: makeSession({ hp: 20, maxHp: 48 }), canEdit: true },
    })

    await wrapper.find('[aria-label="Augmenter les PV"]').trigger('click')
    await wrapper.find('[aria-label="Diminuer les PV"]').trigger('click')

    expect(wrapper.emitted('adjust-hp')).toEqual([[1], [-1]])
  })

  it('disables the PV steppers when canEdit is false', () => {
    const wrapper = mount(ChildSheetTab, {
      props: { child: makeChild(), childSession: makeSession({ hp: 20, maxHp: 48 }), canEdit: false },
    })

    expect(wrapper.find('.child-hp-btns').exists()).toBe(false)
  })

  it('emits set-injury with the next state through the full cycle (saine → jaune → rouge → saine)', async () => {
    const wrapperSaine = mount(ChildSheetTab, {
      props: { child: makeChild(), childSession: makeSession(), canEdit: true },
    })
    await wrapperSaine.findAll('.injury-square')[0]?.trigger('click')
    expect(wrapperSaine.emitted('set-injury')).toEqual([['puissance', 'jaune']])

    const wrapperJaune = mount(ChildSheetTab, {
      props: {
        child: makeChild(),
        childSession: makeSession({ injuries: { puissance: 'jaune' } }),
        canEdit: true,
      },
    })
    await wrapperJaune.findAll('.injury-square')[0]?.trigger('click')
    expect(wrapperJaune.emitted('set-injury')).toEqual([['puissance', 'rouge']])

    const wrapperRouge = mount(ChildSheetTab, {
      props: {
        child: makeChild(),
        childSession: makeSession({ injuries: { puissance: 'rouge' } }),
        canEdit: true,
      },
    })
    await wrapperRouge.findAll('.injury-square')[0]?.trigger('click')
    expect(wrapperRouge.emitted('set-injury')).toEqual([['puissance', null]])
  })

  it('both subs rouge pins the category percentage at 5', () => {
    const wrapper = mount(ChildSheetTab, {
      props: {
        child: makeChild(),
        childSession: makeSession({ injuries: { puissance: 'rouge', finesse: 'rouge' } }),
        canEdit: false,
      },
    })

    expect(wrapper.findAll('.cat-pct')[0]?.text()).toBe('5%')
  })

  it('injury squares are disabled and clicking does not emit when canEdit is false', async () => {
    const wrapper = mount(ChildSheetTab, {
      props: { child: makeChild(), childSession: makeSession(), canEdit: false },
    })

    const squares = wrapper.findAll('.injury-square')
    expect(squares.every((sq) => (sq.element as HTMLButtonElement).disabled)).toBe(true)

    await squares[0]?.trigger('click')
    expect(wrapper.emitted('set-injury')).toBeUndefined()
  })

  it('renders a combined armor total with an AM/AP breakdown from the child’s own equipment', () => {
    const wrapper = mount(ChildSheetTab, {
      props: {
        child: makeChild(),
        childSession: makeSession(),
        canEdit: false,
        equipment: [
          {
            itemId: 'a-1',
            name: 'Collier runique',
            equipped: true,
            statBonus: { stat: 'armorMagique', amount: 1 },
          },
          {
            itemId: 'a-2',
            name: 'Griffes renforcées',
            equipped: true,
            statBonus: { stat: 'armorPhysique', amount: 4 },
          },
        ],
      },
    })

    expect(wrapper.find('.armor-total').text()).toBe('5')
    expect(wrapper.find('.armor-breakdown').text()).toBe('AM 1 · AP 4')
  })

  it('shows an all-zero armor total when the child has no equipment prop', () => {
    const wrapper = mount(ChildSheetTab, {
      props: { child: makeChild(), childSession: makeSession(), canEdit: false },
    })

    expect(wrapper.find('.armor-total').text()).toBe('0')
    expect(wrapper.find('.armor-breakdown').text()).toBe('AM 0 · AP 0')
  })
})
