import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BackpackGrid from '../BackpackGrid.vue'
import type { InventoryItem } from '../../models/types/Inventory'

function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    itemId: 'item-1',
    name: 'Trousse de soins',
    quantity: 1,
    category: 'soins',
    ...overrides,
  }
}

describe('BackpackGrid', () => {
  it('renders no items with all slots empty (T012 no-backend degradation)', () => {
    const wrapper = mount(BackpackGrid, { props: { items: [] } })

    const emptySlots = wrapper.findAll('.slot-empty')
    // Sum of all BACKPACK_MAX_SLOTS values: 1+2+15+15+15+7+7+9+9+16 = 96
    expect(emptySlots).toHaveLength(96)
    expect(wrapper.findAll('.slot')).toHaveLength(96)
  })

  it('computes 14 empty slots when soins has 1 filled item (max 15)', () => {
    const wrapper = mount(BackpackGrid, {
      props: { items: [makeItem({ itemId: 'soins-1', category: 'soins' })] },
    })

    const soinsHeader = wrapper
      .findAll('.category-header')
      .find((h) => h.text().startsWith('Matériel de soins'))
    expect(soinsHeader).toBeTruthy()

    const soinsSection = soinsHeader?.element.closest('.category')
    expect(soinsSection).toBeTruthy()
    const soinsSlots = soinsSection ? Array.from(soinsSection.querySelectorAll('.slot')) : []
    expect(soinsSlots).toHaveLength(15)
    const soinsEmpty = soinsSlots.filter((el) => el.classList.contains('slot-empty'))
    expect(soinsEmpty).toHaveLength(14)
  })

  it('shows the item name without a quantity suffix when quantity is 1', () => {
    const wrapper = mount(BackpackGrid, {
      props: { items: [makeItem({ category: 'quete', name: 'Carte au trésor', quantity: 1 })] },
    })

    expect(wrapper.text()).toContain('Carte au trésor')
    expect(wrapper.text()).not.toContain('Carte au trésor ×')
  })

  it('shows the ×N suffix only when quantity is greater than 1', () => {
    const wrapper = mount(BackpackGrid, {
      props: { items: [makeItem({ category: 'munitions', name: 'Flèches', quantity: 4 })] },
    })

    expect(wrapper.text()).toContain('Flèches ×4')
  })

  it('renders the exact French category labels with slot counts, singular for nourriture', () => {
    const wrapper = mount(BackpackGrid, { props: { items: [] } })

    const headers = wrapper.findAll('.category-header').map((h) => h.text())
    expect(headers).toContain('Nourriture — 1 emplacement')
    expect(headers).toContain('Munitions — 2 emplacements')
    expect(headers).toContain('Matériel de bivouac & camp — 15 emplacements')
    expect(headers).toContain('Matériel de soins — 15 emplacements')
    expect(headers).toContain('Potions, Poisons, Antidotes — 15 emplacements')
    expect(headers).toContain('Objets de quête — 7 emplacements')
    expect(headers).toContain('Objets spéciaux & Reliques — 7 emplacements')
    expect(headers).toContain('Documents, Livres, Titres — 9 emplacements')
    expect(headers).toContain('Gemmes & Pierres précieuses — 9 emplacements')
    expect(headers).toContain('Butin à revendre (ou pas) — 16 emplacements')
  })

  it('renders slots as real button elements for keyboard accessibility', () => {
    const wrapper = mount(BackpackGrid, { props: { items: [] } })

    const slots = wrapper.findAll('.slot')
    expect(slots.length).toBeGreaterThan(0)
    for (const slot of slots) {
      expect(slot.element.tagName).toBe('BUTTON')
    }
  })

  it('emits slot-click with category and item for a filled slot', async () => {
    const item = makeItem({ itemId: 'gemmes-1', category: 'gemmes', name: 'Rubis' })
    const wrapper = mount(BackpackGrid, { props: { items: [item] } })

    const filledSlot = wrapper.find('.slot:not(.slot-empty)')
    await filledSlot.trigger('click')

    expect(wrapper.emitted('slot-click')).toHaveLength(1)
    expect(wrapper.emitted('slot-click')?.[0]?.[0]).toEqual({ category: 'gemmes', item })
  })

  it('emits slot-click with category and no item for an empty slot', async () => {
    const wrapper = mount(BackpackGrid, { props: { items: [] } })

    const emptySlot = wrapper.find('.slot-empty')
    await emptySlot.trigger('click')

    expect(wrapper.emitted('slot-click')).toHaveLength(1)
    const payload = wrapper.emitted('slot-click')?.[0]?.[0] as { category: string; item?: unknown }
    expect(payload.item).toBeUndefined()
  })

  it('never renders an "équipé" badge for backpack items', () => {
    const item = makeItem({ category: 'docs', name: 'Grimoire' })
    const wrapper = mount(BackpackGrid, { props: { items: [item] } })

    expect(wrapper.text()).not.toContain('équipé')
  })

  it('renders a Gold cell on the same row as Rations/Munitions, showing the gold prop', () => {
    const wrapper = mount(BackpackGrid, { props: { items: [], gold: 42 } })

    const goldHeader = wrapper.findAll('.category-header').find((h) => h.text() === 'Or')
    expect(goldHeader).toBeTruthy()

    const goldSection = goldHeader?.element.closest('.category')
    expect(goldSection).toBeTruthy()

    const nourritureHeader = wrapper
      .findAll('.category-header')
      .find((h) => h.text().startsWith('Nourriture'))
    const row = goldSection?.closest('.backpack-row')
    expect(row?.contains(nourritureHeader?.element ?? null)).toBe(true)

    const input = wrapper.find('.gold-input')
    expect((input.element as HTMLInputElement).value).toBe('42')
  })

  it('emits update-gold with the parsed value when the gold input is committed', async () => {
    const wrapper = mount(BackpackGrid, { props: { items: [], gold: 10 } })

    const input = wrapper.find('.gold-input')
    await input.setValue('25')
    await input.trigger('blur')

    expect(wrapper.emitted('update-gold')).toHaveLength(1)
    expect(wrapper.emitted('update-gold')?.[0]).toEqual([25])
  })

  it('does not emit update-gold when the committed value is unchanged', async () => {
    const wrapper = mount(BackpackGrid, { props: { items: [], gold: 10 } })

    const input = wrapper.find('.gold-input')
    await input.setValue('10')
    await input.trigger('blur')

    expect(wrapper.emitted('update-gold')).toBeUndefined()
  })

  it('disables the gold input when not editable', () => {
    const wrapper = mount(BackpackGrid, { props: { items: [], gold: 5, editable: false } })

    const input = wrapper.find('.gold-input')
    expect((input.element as HTMLInputElement).disabled).toBe(true)
  })
})
