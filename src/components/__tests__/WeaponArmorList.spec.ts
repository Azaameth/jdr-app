import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WeaponArmorList from '../WeaponArmorList.vue'
import type { GearEntry } from '../../models/repositories/EquipmentRepository'

function makeWeapon(overrides: Partial<GearEntry> = {}): GearEntry {
  return {
    EntryId: 'w-1',
    DisplayName: 'Épée longue',
    ...overrides,
  }
}

describe('WeaponArmorList', () => {
  it('renders no items with 3 empty placeholder slots (pad to minimum)', () => {
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armes', kind: 'Weapons', items: [] },
    })

    expect(wrapper.findAll('.slot')).toHaveLength(3)
    expect(wrapper.findAll('.slot-empty')).toHaveLength(3)
  })

  it('pads 1 item up to 3 slots', () => {
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armes', kind: 'Weapons', items: [makeWeapon()] },
    })

    expect(wrapper.findAll('.slot')).toHaveLength(3)
    expect(wrapper.findAll('.slot-empty')).toHaveLength(2)
  })

  it('renders all 4 slots without padding when items exceed the minimum', () => {
    const items = [
      makeWeapon({ EntryId: 'w-1', DisplayName: 'Épée' }),
      makeWeapon({ EntryId: 'w-2', DisplayName: 'Dague' }),
      makeWeapon({ EntryId: 'w-3', DisplayName: 'Arc' }),
      makeWeapon({ EntryId: 'w-4', DisplayName: 'Hache' }),
    ]
    const wrapper = mount(WeaponArmorList, { props: { title: 'Armes', kind: 'Weapons', items } })

    expect(wrapper.findAll('.slot')).toHaveLength(4)
    expect(wrapper.findAll('.slot-empty')).toHaveLength(0)
  })

  it('caps slots at maxSlots instead of the 3-slot default when provided', () => {
    const items = [makeWeapon()]
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armes', kind: 'Weapons', items, maxSlots: 2 },
    })

    expect(wrapper.findAll('.slot')).toHaveLength(2)
    expect(wrapper.findAll('.slot-empty')).toHaveLength(1)
  })

  it('shows a bonus summary badge built from BonusRaw', () => {
    const item = makeWeapon({ BonusRaw: { PhysicalAttack: 4 } })
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armes', kind: 'Weapons', items: [item] },
    })

    expect(wrapper.find('.stat-badge').text()).toBe('+4 ATQ.PHY')
  })

  it('joins multiple BonusRaw entries in the summary badge', () => {
    const item: GearEntry = {
      EntryId: 'a-robe',
      DisplayName: "Robe d'Arcaniste",
      BonusRaw: { MagicalArmor: 2, Health: -1 },
    }
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armures & Protections', kind: 'Armor', items: [item] },
    })

    expect(wrapper.find('.stat-badge').text()).toBe('+2 AM, -1 PV')
  })

  it('omits the badge entirely when the item has no BonusRaw at all (FR-010, never synthesized)', () => {
    const item = makeWeapon({ DisplayName: 'Bâton simple' })
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armes', kind: 'Weapons', items: [item] },
    })

    expect(wrapper.find('.stat-badge').exists()).toBe(false)
    expect(wrapper.text()).toContain('Bâton simple')
  })

  it('surfaces BonusConditional names as the slot title, never materialized into the badge', () => {
    const item: GearEntry = {
      EntryId: 'a-cloak',
      DisplayName: 'Cape du Vent',
      BonusConditional: [{ Name: 'Enraciné', Effects: { PhysicalDefense: 2 } }],
    }
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armures & Protections', kind: 'Armor', items: [item] },
    })

    expect(wrapper.find('.slot').attributes('title')).toBe('Enraciné')
    expect(wrapper.find('.stat-badge').exists()).toBe(false)
  })

  it('renders slots as real button elements for keyboard accessibility', () => {
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armes', kind: 'Weapons', items: [makeWeapon()] },
    })

    for (const slot of wrapper.findAll('.slot')) {
      expect(slot.element.tagName).toBe('BUTTON')
    }
  })

  it('emits slot-click with kind and item for a filled slot', async () => {
    const item = makeWeapon()
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armes', kind: 'Weapons', items: [item] },
    })

    await wrapper.find('.slot:not(.slot-empty)').trigger('click')

    expect(wrapper.emitted('slot-click')).toHaveLength(1)
    expect(wrapper.emitted('slot-click')?.[0]?.[0]).toEqual({ kind: 'Weapons', item })
  })

  it('emits slot-click with kind and no item for an empty slot', async () => {
    const wrapper = mount(WeaponArmorList, {
      props: { title: 'Armures & Protections', kind: 'Armor', items: [] },
    })

    await wrapper.find('.slot-empty').trigger('click')

    expect(wrapper.emitted('slot-click')).toHaveLength(1)
    const payload = wrapper.emitted('slot-click')?.[0]?.[0] as { kind: string; item?: unknown }
    expect(payload.kind).toBe('Armor')
    expect(payload.item).toBeUndefined()
  })
})
