import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BackpackGrid from '../BackpackGrid.vue'
import type { BagItemDocument } from '../../models/repositories/ItemRepository'

function makeItem(overrides: Partial<BagItemDocument> = {}): BagItemDocument {
  return {
    EntryId: 'item-1',
    DisplayName: 'Trousse de soins',
    Quantity: 1,
    PlayerId: 'uid-1',
    CampaignId: 'camp-1',
    ...overrides,
  }
}

describe('BackpackGrid', () => {
  it('renders no items with a minimum of empty slots (no-backend degradation)', () => {
    const wrapper = mount(BackpackGrid, { props: { items: [] } })

    expect(wrapper.findAll('.slot-empty').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.slot')).toHaveLength(wrapper.findAll('.slot-empty').length)
  })

  it('caps the grid at maxItems, showing N filled + remaining empty slots', () => {
    const wrapper = mount(BackpackGrid, {
      props: { items: [makeItem()], maxItems: 3 },
    })

    expect(wrapper.findAll('.slot')).toHaveLength(3)
    expect(wrapper.findAll('.slot-empty')).toHaveLength(2)
  })

  it('shows the item name without a quantity suffix when quantity is 1', () => {
    const wrapper = mount(BackpackGrid, {
      props: { items: [makeItem({ DisplayName: 'Carte au trésor', Quantity: 1 })] },
    })

    expect(wrapper.text()).toContain('Carte au trésor')
    expect(wrapper.text()).not.toContain('Carte au trésor ×')
  })

  it('shows the ×N suffix only when quantity is greater than 1', () => {
    const wrapper = mount(BackpackGrid, {
      props: { items: [makeItem({ DisplayName: 'Flèches', Quantity: 4 })] },
    })

    expect(wrapper.text()).toContain('Flèches ×4')
  })

  it('shows the item count against maxItems in the header when a cap is set', () => {
    const wrapper = mount(BackpackGrid, { props: { items: [makeItem()], maxItems: 30 } })

    expect(wrapper.text()).toContain('1/30')
  })

  it('renders slots as real button elements for keyboard accessibility', () => {
    const wrapper = mount(BackpackGrid, { props: { items: [] } })

    const slots = wrapper.findAll('.slot')
    expect(slots.length).toBeGreaterThan(0)
    for (const slot of slots) {
      expect(slot.element.tagName).toBe('BUTTON')
    }
  })

  it('emits slot-click with the item for a filled slot', async () => {
    const item = makeItem({ EntryId: 'gemmes-1', DisplayName: 'Rubis' })
    const wrapper = mount(BackpackGrid, { props: { items: [item] } })

    const filledSlot = wrapper.find('.slot:not(.slot-empty)')
    await filledSlot.trigger('click')

    expect(wrapper.emitted('slot-click')).toHaveLength(1)
    expect(wrapper.emitted('slot-click')?.[0]?.[0]).toEqual(item)
  })

  it('emits slot-click with no item for an empty slot', async () => {
    const wrapper = mount(BackpackGrid, { props: { items: [] } })

    const emptySlot = wrapper.find('.slot-empty')
    await emptySlot.trigger('click')

    expect(wrapper.emitted('slot-click')).toHaveLength(1)
    expect(wrapper.emitted('slot-click')?.[0]?.[0]).toBeUndefined()
  })

  it('renders a currency cell showing the currency prop', () => {
    const wrapper = mount(BackpackGrid, { props: { items: [], currency: 42 } })

    const currencyHeader = wrapper.findAll('.category-header').find((h) => h.text() === 'Monnaie')
    expect(currencyHeader).toBeTruthy()

    const input = wrapper.find('.currency-input')
    expect((input.element as HTMLInputElement).value).toBe('42')
  })

  it('emits update-currency with the parsed value when the input is committed', async () => {
    const wrapper = mount(BackpackGrid, { props: { items: [], currency: 10 } })

    const input = wrapper.find('.currency-input')
    await input.setValue('25')
    await input.trigger('blur')

    expect(wrapper.emitted('update-currency')).toHaveLength(1)
    expect(wrapper.emitted('update-currency')?.[0]).toEqual([25])
  })

  it('does not emit update-currency when the committed value is unchanged', async () => {
    const wrapper = mount(BackpackGrid, { props: { items: [], currency: 10 } })

    const input = wrapper.find('.currency-input')
    await input.setValue('10')
    await input.trigger('blur')

    expect(wrapper.emitted('update-currency')).toBeUndefined()
  })

  it('disables the currency input when not editable', () => {
    const wrapper = mount(BackpackGrid, { props: { items: [], currency: 5, editable: false } })

    const input = wrapper.find('.currency-input')
    expect((input.element as HTMLInputElement).disabled).toBe(true)
  })
})
