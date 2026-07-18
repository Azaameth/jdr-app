import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'
import { mount } from '@vue/test-utils'

// AdventureDiceBox consumes useCampaignSessionStore() directly (singleton
// composable — no data props, only the `canAdjust` role gate). Mock the
// store module the same way PartyStatus.spec.ts mocks usePlayerStore.
const mockDice = ref<{ aventure: number; mesaventure: number }>({ aventure: 0, mesaventure: 0 })
const mockError = ref<string | null>(null)
const mockAdjust = vi.fn<(die: 'aventure' | 'mesaventure', delta: number) => void>()
vi.mock('../../../controllers/useCampaignSessionStore', () => ({
  useCampaignSessionStore: () => ({
    adventureDice: computed(() => mockDice.value),
    error: computed(() => mockError.value),
    adjust: mockAdjust,
  }),
}))

import AdventureDiceBox from '../AdventureDiceBox.vue'

describe('AdventureDiceBox', () => {
  beforeEach(() => {
    mockAdjust.mockClear()
    mockDice.value = { aventure: 0, mesaventure: 0 }
    mockError.value = null
  })

  it("affiche l'erreur du store quand un ajustement échoue", async () => {
    const wrapper = mount(AdventureDiceBox, { props: { canAdjust: true } })
    expect(wrapper.find('.adv-dice-error').exists()).toBe(false)

    mockError.value = "Impossible de mettre à jour les dés d'aventure."
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.adv-dice-error').text()).toBe(
      "Impossible de mettre à jour les dés d'aventure.",
    )
  })

  it('renders the Aventure / Mésaventure counters', () => {
    mockDice.value = { aventure: 3, mesaventure: 1 }

    const wrapper = mount(AdventureDiceBox, { props: { canAdjust: false } })

    expect(wrapper.find('.adv-dice-value.aventure').text()).toBe('3')
    expect(wrapper.find('.adv-dice-value.mesaventure').text()).toBe('1')
    expect(wrapper.text()).toContain('Aventure : 3')
    expect(wrapper.text()).toContain('Mésaventure : 1')
  })

  it('renders 0/0 when the campaignSessions doc is missing (store default)', () => {
    mockDice.value = { aventure: 0, mesaventure: 0 }

    const wrapper = mount(AdventureDiceBox, { props: { canAdjust: true } })

    expect(wrapper.find('.adv-dice-value.aventure').text()).toBe('0')
    expect(wrapper.find('.adv-dice-value.mesaventure').text()).toBe('0')
  })

  it('renders no buttons at all when canAdjust is false (read-only, not merely disabled)', () => {
    mockDice.value = { aventure: 3, mesaventure: 2 }

    const wrapper = mount(AdventureDiceBox, { props: { canAdjust: false } })

    expect(wrapper.findAll('.adv-dice-btn')).toHaveLength(0)
  })

  it('renders ± buttons for both counters when canAdjust is true', () => {
    mockDice.value = { aventure: 3, mesaventure: 2 }

    const wrapper = mount(AdventureDiceBox, { props: { canAdjust: true } })

    expect(wrapper.findAll('.adv-dice-btn')).toHaveLength(4)
  })

  it('calls adjust with the correct die and delta when + is clicked', async () => {
    mockDice.value = { aventure: 3, mesaventure: 2 }
    const wrapper = mount(AdventureDiceBox, { props: { canAdjust: true } })

    await wrapper.get('[aria-label="Augmenter Aventure"]').trigger('click')
    expect(mockAdjust).toHaveBeenCalledWith('aventure', 1)

    await wrapper.get('[aria-label="Augmenter Mésaventure"]').trigger('click')
    expect(mockAdjust).toHaveBeenCalledWith('mesaventure', 1)
  })

  it('calls adjust with -1 when − is clicked', async () => {
    mockDice.value = { aventure: 3, mesaventure: 2 }
    const wrapper = mount(AdventureDiceBox, { props: { canAdjust: true } })

    await wrapper.get('[aria-label="Diminuer Aventure"]').trigger('click')
    expect(mockAdjust).toHaveBeenCalledWith('aventure', -1)

    await wrapper.get('[aria-label="Diminuer Mésaventure"]').trigger('click')
    expect(mockAdjust).toHaveBeenCalledWith('mesaventure', -1)
  })

  it('disables the − button at 0 for each counter independently', () => {
    mockDice.value = { aventure: 0, mesaventure: 4 }
    const wrapper = mount(AdventureDiceBox, { props: { canAdjust: true } })

    expect(wrapper.get<HTMLButtonElement>('[aria-label="Diminuer Aventure"]').element.disabled).toBe(
      true,
    )
    expect(
      wrapper.get<HTMLButtonElement>('[aria-label="Diminuer Mésaventure"]').element.disabled,
    ).toBe(false)
  })

  it('does not call adjust when a disabled − button is clicked', async () => {
    mockDice.value = { aventure: 0, mesaventure: 0 }
    const wrapper = mount(AdventureDiceBox, { props: { canAdjust: true } })

    await wrapper.get('[aria-label="Diminuer Aventure"]').trigger('click')

    expect(mockAdjust).not.toHaveBeenCalled()
  })
})
