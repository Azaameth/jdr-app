import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdvantageToggles from '../AdvantageToggles.vue'
import type { CharacterSessionState } from '../../../models/types/Participant'

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

describe('AdvantageToggles', () => {
  it('reflects session.advantage / session.disadvantage as the checkbox state', () => {
    const wrapper = mount(AdvantageToggles, {
      props: {
        session: makeSession({ advantage: true, disadvantage: false }),
        canEdit: true,
      },
    })

    const advantageBox = wrapper.get<HTMLInputElement>('.avdis-row.advantage input')
    const disadvantageBox = wrapper.get<HTMLInputElement>('.avdis-row.disadvantage input')
    expect(advantageBox.element.checked).toBe(true)
    expect(disadvantageBox.element.checked).toBe(false)
  })

  it('both can be active simultaneously (FR-008)', () => {
    const wrapper = mount(AdvantageToggles, {
      props: {
        session: makeSession({ advantage: true, disadvantage: true }),
        canEdit: true,
      },
    })

    const advantageBox = wrapper.get<HTMLInputElement>('.avdis-row.advantage input')
    const disadvantageBox = wrapper.get<HTMLInputElement>('.avdis-row.disadvantage input')
    expect(advantageBox.element.checked).toBe(true)
    expect(disadvantageBox.element.checked).toBe(true)
  })

  it('treats an absent advantage/disadvantage field as false (unchecked)', () => {
    const wrapper = mount(AdvantageToggles, {
      props: { session: makeSession(), canEdit: true },
    })

    const advantageBox = wrapper.get<HTMLInputElement>('.avdis-row.advantage input')
    const disadvantageBox = wrapper.get<HTMLInputElement>('.avdis-row.disadvantage input')
    expect(advantageBox.element.checked).toBe(false)
    expect(disadvantageBox.element.checked).toBe(false)
  })

  it('handles a null session (unchecked, does not throw)', () => {
    const wrapper = mount(AdvantageToggles, {
      props: { session: null, canEdit: true },
    })

    const advantageBox = wrapper.get<HTMLInputElement>('.avdis-row.advantage input')
    expect(advantageBox.element.checked).toBe(false)
  })

  it('clicking the Avantage checkbox emits set-advantage with the new value', async () => {
    const wrapper = mount(AdvantageToggles, {
      props: { session: makeSession({ advantage: false }), canEdit: true },
    })

    const advantageBox = wrapper.get<HTMLInputElement>('.avdis-row.advantage input')
    advantageBox.element.checked = true
    await advantageBox.trigger('change')

    expect(wrapper.emitted('set-advantage')).toEqual([[true]])
  })

  it('clicking the Désavantage checkbox emits set-disadvantage with the new value', async () => {
    const wrapper = mount(AdvantageToggles, {
      props: { session: makeSession({ disadvantage: true }), canEdit: true },
    })

    const disadvantageBox = wrapper.get<HTMLInputElement>('.avdis-row.disadvantage input')
    disadvantageBox.element.checked = false
    await disadvantageBox.trigger('change')

    expect(wrapper.emitted('set-disadvantage')).toEqual([[false]])
  })

  it('is inert (disabled) when canEdit is false', () => {
    const wrapper = mount(AdvantageToggles, {
      props: { session: makeSession(), canEdit: false },
    })

    const advantageBox = wrapper.get<HTMLInputElement>('.avdis-row.advantage input')
    const disadvantageBox = wrapper.get<HTMLInputElement>('.avdis-row.disadvantage input')
    expect(advantageBox.element.disabled).toBe(true)
    expect(disadvantageBox.element.disabled).toBe(true)
  })

  it('does not shadow the session value with local state: a prop update after mount is reflected without any click', async () => {
    const wrapper = mount(AdvantageToggles, {
      props: { session: makeSession({ advantage: false }), canEdit: true },
    })

    await wrapper.setProps({ session: makeSession({ advantage: true }) })

    const advantageBox = wrapper.get<HTMLInputElement>('.avdis-row.advantage input')
    expect(advantageBox.element.checked).toBe(true)
  })
})
