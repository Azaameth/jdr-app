import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WeaponArmorList from '../WeaponArmorList.vue'
import type { WeaponArmorItem } from '../../models/types/Inventory'

function makeWeapon(overrides: Partial<WeaponArmorItem> = {}): WeaponArmorItem {
  return {
    itemId: 'w-1',
    name: 'Épée longue',
    ...overrides,
  }
}

describe('WeaponArmorList', () => {
  it('renders no items with 3 empty placeholder slots (pad to minimum)', () => {
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armes', kind: 'weapons', items: [] },
    })

    expect(wrapper.findAll('.slot')).toHaveLength(3)
    expect(wrapper.findAll('.slot-empty')).toHaveLength(3)
  })

  it('pads 1 item up to 3 slots', () => {
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armes', kind: 'weapons', items: [makeWeapon()] },
    })

    expect(wrapper.findAll('.slot')).toHaveLength(3)
    expect(wrapper.findAll('.slot-empty')).toHaveLength(2)
  })

  it('renders all 4 slots without padding when items exceed the minimum', () => {
    const items = [
      makeWeapon({ itemId: 'w-1', name: 'Épée' }),
      makeWeapon({ itemId: 'w-2', name: 'Dague' }),
      makeWeapon({ itemId: 'w-3', name: 'Arc' }),
      makeWeapon({ itemId: 'w-4', name: 'Hache' }),
    ]
    const wrapper = mount(WeaponArmorList, { props: { title: 'Armes', kind: 'weapons', items } })

    expect(wrapper.findAll('.slot')).toHaveLength(4)
    expect(wrapper.findAll('.slot-empty')).toHaveLength(0)
  })

  it('shows a DÉGÂTS badge with the structured damage stat for weapons', () => {
    const item = makeWeapon({ damageDie: 'D10', damageBonus: 4 })
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armes', kind: 'weapons', items: [item] },
    })

    expect(wrapper.find('.stat-value').text()).toBe('D10/+4')
    expect(wrapper.find('.stat-label').text()).toBe('DÉGÂTS')
  })

  it('shows an ARMURE badge with the structured armor rating for armor', () => {
    const item: WeaponArmorItem = { itemId: 'a-1', name: 'Cotte de mailles', armorRating: 2 }
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armures & Protections', kind: 'armor', items: [item] },
    })

    expect(wrapper.find('.stat-value').text()).toBe('RD2')
    expect(wrapper.find('.stat-label').text()).toBe('ARMURE')
  })

  it('shows the badge value from a bare statNote when there are no structured stats', () => {
    const item: WeaponArmorItem = {
      itemId: 'a-2',
      name: 'Cape légère',
      statNote: 'vs proj. magiques',
    }
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armures & Protections', kind: 'armor', items: [item] },
    })

    expect(wrapper.find('.stat-value').text()).toBe('vs proj. magiques')
  })

  it('omits the badge entirely when the item has no stats at all (FR-010, never synthesized)', () => {
    const item = makeWeapon({ name: 'Bâton simple' })
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armes', kind: 'weapons', items: [item] },
    })

    expect(wrapper.find('.stat-badge').exists()).toBe(false)
    expect(wrapper.text()).toContain('Bâton simple')
  })

  it('renders slots as real button elements for keyboard accessibility', () => {
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armes', kind: 'weapons', items: [makeWeapon()] },
    })

    for (const slot of wrapper.findAll('.slot')) {
      expect(slot.element.tagName).toBe('BUTTON')
    }
  })

  it('emits slot-click with kind and item for a filled slot', async () => {
    const item = makeWeapon()
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armes', kind: 'weapons', items: [item] },
    })

    await wrapper.find('.slot:not(.slot-empty)').trigger('click')

    expect(wrapper.emitted('slot-click')).toHaveLength(1)
    expect(wrapper.emitted('slot-click')?.[0]?.[0]).toEqual({ kind: 'weapons', item })
  })

  it('emits slot-click with kind and no item for an empty slot', async () => {
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armures & Protections', kind: 'armor', items: [] },
    })

    await wrapper.find('.slot-empty').trigger('click')

    expect(wrapper.emitted('slot-click')).toHaveLength(1)
    const payload = wrapper.emitted('slot-click')?.[0]?.[0] as { kind: string; item?: unknown }
    expect(payload.kind).toBe('armor')
    expect(payload.item).toBeUndefined()
  })
})
