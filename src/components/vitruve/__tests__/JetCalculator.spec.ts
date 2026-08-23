import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { CharacterAttributes } from '../../../models/types/Character'
import type { InjuryState, SecondaryAttributeName } from '../../../models/types/Participant'
import { useTickState } from '../tickState'

// Display-only guarantee (NFR): the jet calculator computes a threshold and
// NEVER writes to Firestore. Mock every repository/store surface it could
// conceivably reach and assert none of them are ever invoked, even after a
// full round of user interaction (category switch, mod steps, reset).
const characterRepoMocks = {
  getCharacterByCampaign: vi.fn<() => Promise<null>>(),
  updateCharacter: vi.fn<() => Promise<void>>(),
  listCharactersByCampaign: vi.fn<() => Promise<[]>>(),
}
vi.mock('../../../models/repositories/CharacterRepository', () => characterRepoMocks)

const participantRepoMocks = {
  getParticipant: vi.fn<() => Promise<null>>(),
  subscribeParticipantsByCampaign: vi.fn<() => () => void>(),
}
vi.mock('../../../models/repositories/ParticipantRepository', () => participantRepoMocks)

const characterStateRepoMocks = {
  getCharacterState: vi.fn<() => Promise<null>>(),
  subscribeCharacterState: vi.fn<() => () => void>(),
  updateCharacterState: vi.fn<() => Promise<void>>(),
  resetTeamStatesToMax: vi.fn<() => Promise<number>>(),
}
vi.mock('../../../models/repositories/CharacterStateRepository', () => characterStateRepoMocks)

const playerStoreMocks = {
  setAdvantage: vi.fn<() => Promise<void>>(),
  setDisadvantage: vi.fn<() => Promise<void>>(),
  setInjury: vi.fn<() => Promise<void>>(),
  setSessionResource: vi.fn<() => Promise<null>>(),
  setSessionPosture: vi.fn<() => Promise<null>>(),
}
vi.mock('../../../controllers/usePlayerStore', () => ({
  usePlayerStore: () => playerStoreMocks,
}))

import JetCalculator from '../JetCalculator.vue'

function makeAttributes(overrides: Partial<CharacterAttributes> = {}): CharacterAttributes {
  return {
    primary: { force: 80, social: 20, mental: 50 },
    secondary: { puissance: 5, finesse: 3, aura: 2, relation: 2, instinct: 4, savoir: 1 },
    ...overrides,
  }
}

function allMockFns() {
  return [
    ...Object.values(characterRepoMocks),
    ...Object.values(participantRepoMocks),
    ...Object.values(characterStateRepoMocks),
    ...Object.values(playerStoreMocks),
  ]
}

describe('JetCalculator', () => {
  beforeEach(() => {
    useTickState().reset()
    for (const fn of allMockFns()) fn.mockClear()
  })

  it('base reflects the default (physique) category from attributes.primary.force', () => {
    const wrapper = mount(JetCalculator, {
      props: { attributes: makeAttributes(), injuries: undefined, contextKey: 'char-1' },
    })

    expect(wrapper.find('.jet-base-lbl').text()).toBe('80%')
    expect(wrapper.find('.jet-total').text()).toBe('80%')
  })

  it('category switch changes the base and total', async () => {
    const wrapper = mount(JetCalculator, {
      props: { attributes: makeAttributes(), injuries: undefined, contextKey: 'char-1' },
    })

    const socialBtn = wrapper.findAll('.jet-cat-btn').find((btn) => btn.text() === 'Soc.')
    await socialBtn?.trigger('click')

    expect(wrapper.find('.jet-base-lbl').text()).toBe('20%')
    expect(wrapper.find('.jet-total').text()).toBe('20%')
  })

  it('injuries lower the base per adjustedCategoryPct (one jaune on a physique sub)', () => {
    const injuries: Partial<Record<SecondaryAttributeName, InjuryState>> = { puissance: 'jaune' }
    const wrapper = mount(JetCalculator, {
      props: { attributes: makeAttributes(), injuries, contextKey: 'char-1' },
    })

    // base 80 - 10 (1 jaune) = 70
    expect(wrapper.find('.jet-base-lbl').text()).toBe('70%')
  })

  it('ticked compétences/race entries (useTickState) add to the total and show the Compétences row', async () => {
    const tickState = useTickState()
    tickState.toggle({ key: 'skill:x', label: 'Artisan', value: 15 })

    const wrapper = mount(JetCalculator, {
      props: { attributes: makeAttributes(), injuries: undefined, contextKey: 'char-1' },
    })

    expect(wrapper.find('.jet-check-row').exists()).toBe(true)
    expect(wrapper.find('.jet-check-lbl').text()).toBe('+15%')
    expect(wrapper.find('.jet-total').text()).toBe('95%')
  })

  it('the Compétences row is hidden when the ticked sum is 0', () => {
    const wrapper = mount(JetCalculator, {
      props: { attributes: makeAttributes(), injuries: undefined, contextKey: 'char-1' },
    })

    expect(wrapper.find('.jet-check-row').exists()).toBe(false)
  })

  it('the Compétences row is red-tinted when the ticked sum is negative', () => {
    const tickState = useTickState()
    tickState.toggle({ key: 'race:malus:0', label: 'Lenteur', value: -10 })

    const wrapper = mount(JetCalculator, {
      props: { attributes: makeAttributes(), injuries: undefined, contextKey: 'char-1' },
    })

    expect(wrapper.find('.jet-check-row').classes()).toContain('negative')
    expect(wrapper.find('.jet-check-lbl').text()).toBe('-10%')
  })

  it('the +/- mod buttons step by 5 and the ↺ button resets to 0', async () => {
    const wrapper = mount(JetCalculator, {
      props: { attributes: makeAttributes(), injuries: undefined, contextKey: 'char-1' },
    })

    const plus = wrapper.find('.jet-mod-btn.plus')
    const minus = wrapper.find('.jet-mod-btn.minus')
    const reset = wrapper.find('.jet-mod-reset')

    await plus.trigger('click')
    await plus.trigger('click')
    expect(wrapper.find('.jet-mod-lbl').text()).toBe('+10%')
    expect(wrapper.find('.jet-total').text()).toBe('90%')

    await minus.trigger('click')
    expect(wrapper.find('.jet-mod-lbl').text()).toBe('+5%')

    await reset.trigger('click')
    // Legacy wording keeps the leading '+' even at 0 ((_jetMod>=0?'+':'')+_jetMod+'%').
    expect(wrapper.find('.jet-mod-lbl').text()).toBe('+0%')
    expect(wrapper.find('.jet-total').text()).toBe('80%')
  })

  it('clamps the total at 95 when pushed above the max via the mod stepper', async () => {
    const wrapper = mount(JetCalculator, {
      props: { attributes: makeAttributes(), injuries: undefined, contextKey: 'char-1' },
    })

    const plus = wrapper.find('.jet-mod-btn.plus')
    for (let i = 0; i < 5; i += 1) {
      await plus.trigger('click')
    }
    // base 80 + mod 25 = 105 → clamped to 95
    expect(wrapper.find('.jet-total').text()).toBe('95%')
    expect(wrapper.find('.jet-total').classes()).toContain('favorable')
  })

  it('clamps the total at 5 when pushed below the min via the mod stepper', async () => {
    const wrapper = mount(JetCalculator, {
      props: {
        attributes: makeAttributes({ primary: { force: 10, social: 20, mental: 50 } }),
        injuries: undefined,
        contextKey: 'char-1',
      },
    })

    const minus = wrapper.find('.jet-mod-btn.minus')
    for (let i = 0; i < 4; i += 1) {
      await minus.trigger('click')
    }
    // base 10 + mod -20 = -10 → clamped to 5
    expect(wrapper.find('.jet-total').text()).toBe('5%')
    expect(wrapper.find('.jet-total').classes()).toContain('risky')
  })

  it('resets manualMod and category to physique when contextKey changes', async () => {
    const wrapper = mount(JetCalculator, {
      props: { attributes: makeAttributes(), injuries: undefined, contextKey: 'char-1' },
    })

    const socialBtn = wrapper.findAll('.jet-cat-btn').find((btn) => btn.text() === 'Soc.')
    await socialBtn?.trigger('click')
    await wrapper.find('.jet-mod-btn.plus').trigger('click')
    expect(wrapper.find('.jet-mod-lbl').text()).toBe('+5%')
    expect(wrapper.find('.jet-base-lbl').text()).toBe('20%')

    await wrapper.setProps({ contextKey: 'char-2' })

    expect(wrapper.find('.jet-mod-lbl').text()).toBe('+0%')
    expect(wrapper.find('.jet-base-lbl').text()).toBe('80%')
  })

  it('is provably display-only: no store or repository function is ever called across a full interaction', async () => {
    const tickState = useTickState()
    tickState.toggle({ key: 'skill:x', label: 'Artisan', value: 10 })

    const wrapper = mount(JetCalculator, {
      props: { attributes: makeAttributes(), injuries: { puissance: 'jaune' }, contextKey: 'char-1' },
    })

    const socialBtn = wrapper.findAll('.jet-cat-btn').find((btn) => btn.text() === 'Soc.')
    await socialBtn?.trigger('click')
    await wrapper.find('.jet-mod-btn.plus').trigger('click')
    await wrapper.find('.jet-mod-btn.minus').trigger('click')
    await wrapper.find('.jet-mod-reset').trigger('click')
    await wrapper.setProps({ contextKey: 'char-2' })

    for (const fn of allMockFns()) {
      expect(fn).not.toHaveBeenCalled()
    }
  })
})
