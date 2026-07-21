import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InventorySlotModal, {
  type InventorySlotContext,
} from '../InventorySlotModal.vue'
import type { InventoryItem, WeaponArmorItem } from '../../models/types/Inventory'

function mountModal(context: InventorySlotContext, errorMessage: string | null = null) {
  return mount(InventorySlotModal, {
    props: { open: true, context, errorMessage },
  })
}

describe('InventorySlotModal', () => {
  it('renders name + quantity fields for a backpack context', () => {
    const wrapper = mountModal({ kind: 'backpack', category: 'soins' })

    expect(wrapper.find('#inv-slot-name').exists()).toBe(true)
    expect(wrapper.find('#inv-slot-quantity').exists()).toBe(true)
    expect(wrapper.find('#inv-slot-stat').exists()).toBe(false)
  })

  it('renders name + stat fields for a weapons context with the weapons label/placeholder', () => {
    const wrapper = mountModal({ kind: 'weapons' })

    expect(wrapper.find('#inv-slot-name').exists()).toBe(true)
    expect(wrapper.find('#inv-slot-quantity').exists()).toBe(false)
    const statInput = wrapper.find('#inv-slot-stat')
    expect(statInput.exists()).toBe(true)
    expect(wrapper.text()).toContain('Dégâts / particularité')
    expect(statInput.attributes('placeholder')).toBe('ex : D10/+4')
  })

  it('renders a category picker + value + note fields for an armor context, defaulting to Armure Physique', () => {
    const wrapper = mountModal({ kind: 'armor' })

    expect(wrapper.find('#inv-slot-stat').exists()).toBe(false)
    expect((wrapper.find('#inv-slot-category').element as HTMLSelectElement).value).toBe(
      'armorPhysique',
    )
    expect(wrapper.text()).toContain('Bonus (Armure Physique)')
    expect(wrapper.find('#inv-slot-value').exists()).toBe(true)
    expect(wrapper.find('#inv-slot-note').exists()).toBe(true)
  })

  it('pre-fills the Mana category and bonus amount when editing an item with a maxMana statBonus', () => {
    const item: WeaponArmorItem = {
      itemId: 'a-ring',
      name: 'Anneau de Mana',
      equipped: true,
      statBonus: { stat: 'maxMana', amount: 4 },
    }
    const wrapper = mountModal({ kind: 'armor', item })

    expect((wrapper.find('#inv-slot-category').element as HTMLSelectElement).value).toBe(
      'maxMana',
    )
    expect((wrapper.find('#inv-slot-value').element as HTMLInputElement).value).toBe('4')
    expect(wrapper.text()).toContain('Bonus (Mana)')
  })

  it('emits a statBonus save payload when the PV category is chosen for an armor item', async () => {
    const wrapper = mountModal({ kind: 'armor' })

    await wrapper.find('#inv-slot-name').setValue('Amulette de Vie')
    await wrapper.find('#inv-slot-category').setValue('maxHp')
    await wrapper.find('#inv-slot-value').setValue('3')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      kind: 'armor',
      item: {
        itemId: undefined,
        name: 'Amulette de Vie',
        equipped: true,
        statBonus: { stat: 'maxHp', amount: 3 },
      },
    })
  })

  it('emits a statBonus save payload with an optional note when the default Armure Physique category is kept', async () => {
    const wrapper = mountModal({ kind: 'armor' })

    await wrapper.find('#inv-slot-name').setValue('Bouclier renforcé')
    await wrapper.find('#inv-slot-value').setValue('3')
    await wrapper.find('#inv-slot-note').setValue('vs proj. magiques')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      kind: 'armor',
      item: {
        itemId: undefined,
        name: 'Bouclier renforcé',
        equipped: true,
        statBonus: { stat: 'armorPhysique', amount: 3 },
        statNote: 'vs proj. magiques',
      },
    })
  })

  it('emits a statBonus save payload when the Armure Magique category is chosen', async () => {
    const wrapper = mountModal({ kind: 'armor' })

    await wrapper.find('#inv-slot-name').setValue("Robe d'Arcaniste")
    await wrapper.find('#inv-slot-category').setValue('armorMagique')
    await wrapper.find('#inv-slot-value').setValue('2')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      kind: 'armor',
      item: {
        itemId: undefined,
        name: "Robe d'Arcaniste",
        equipped: true,
        statBonus: { stat: 'armorMagique', amount: 2 },
      },
    })
  })

  it('pre-fills name and quantity when editing an existing backpack item', () => {
    const item: InventoryItem = {
      itemId: 'item-1',
      name: 'Rations',
      quantity: 4,
      category: 'nourriture',
    }
    const wrapper = mountModal({ kind: 'backpack', category: 'nourriture', item })

    expect((wrapper.find('#inv-slot-name').element as HTMLInputElement).value).toBe('Rations')
    expect((wrapper.find('#inv-slot-quantity').element as HTMLInputElement).value).toBe('4')
  })

  it('leaves quantity blank when pre-filling a backpack item with quantity 1', () => {
    const item: InventoryItem = {
      itemId: 'item-1',
      name: 'Carte',
      quantity: 1,
      category: 'quete',
    }
    const wrapper = mountModal({ kind: 'backpack', category: 'quete', item })

    expect((wrapper.find('#inv-slot-quantity').element as HTMLInputElement).value).toBe('')
  })

  it('pre-fills name and formatted stat when editing an existing weapon', () => {
    const item: WeaponArmorItem = {
      itemId: 'w-1',
      name: 'Épée longue',
      damageDie: 'D10',
      damageBonus: 4,
    }
    const wrapper = mountModal({ kind: 'weapons', item })

    expect((wrapper.find('#inv-slot-name').element as HTMLInputElement).value).toBe('Épée longue')
    expect((wrapper.find('#inv-slot-stat').element as HTMLInputElement).value).toBe('D10/+4')
  })

  it('shows the delete button only when editing an existing item', () => {
    const withoutItem = mountModal({ kind: 'weapons' })
    expect(withoutItem.find('.inventory-slot-delete').exists()).toBe(false)

    const withItem = mountModal({
      kind: 'weapons',
      item: { itemId: 'w-1', name: 'Dague' },
    })
    expect(withItem.find('.inventory-slot-delete').exists()).toBe(true)
  })

  it('closes without emitting save when the name is empty on submit', async () => {
    const wrapper = mountModal({ kind: 'backpack', category: 'soins' })

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits a backpack save payload shaped for saveBackpackItem', async () => {
    const wrapper = mountModal({ kind: 'backpack', category: 'soins' })

    await wrapper.find('#inv-slot-name').setValue('Trousse de soins')
    await wrapper.find('#inv-slot-quantity').setValue('3')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      kind: 'backpack',
      item: {
        itemId: undefined,
        name: 'Trousse de soins',
        category: 'soins',
        quantity: 3,
      },
    })
  })

  it('defaults quantity to 1 when left blank on a new backpack item', async () => {
    const wrapper = mountModal({ kind: 'backpack', category: 'munitions' })

    await wrapper.find('#inv-slot-name').setValue('Flèches')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
      kind: 'backpack',
      item: { name: 'Flèches', quantity: 1 },
    })
  })

  it('emits a structured equipment save payload parsed from name + stat', async () => {
    const wrapper = mountModal({ kind: 'weapons' })

    await wrapper.find('#inv-slot-name').setValue('Arc long')
    await wrapper.find('#inv-slot-stat').setValue('D8/+2')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      kind: 'weapons',
      item: {
        itemId: undefined,
        name: 'Arc long',
        damageDie: 'D8',
        damageBonus: 2,
      },
    })
  })

  it('preserves the itemId on save when editing an existing item', async () => {
    const wrapper = mountModal({
      kind: 'armor',
      item: {
        itemId: 'a-1',
        name: 'Cotte de mailles',
        equipped: true,
        statBonus: { stat: 'armorPhysique', amount: 2 },
      },
    })

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      kind: 'armor',
      item: {
        itemId: 'a-1',
        name: 'Cotte de mailles',
        equipped: true,
        statBonus: { stat: 'armorPhysique', amount: 2 },
      },
    })
  })

  it('emits delete with kind and itemId when the delete button is clicked', async () => {
    const wrapper = mountModal({
      kind: 'backpack',
      category: 'soins',
      item: { itemId: 'item-1', name: 'Trousse', quantity: 1, category: 'soins' },
    })

    await wrapper.find('.inventory-slot-delete').trigger('click')

    expect(wrapper.emitted('delete')?.[0]?.[0]).toEqual({ kind: 'backpack', itemId: 'item-1' })
  })

  it('displays the errorMessage prop (e.g. the category-full rejection) when set', () => {
    const wrapper = mountModal(
      { kind: 'backpack', category: 'nourriture' },
      'Catégorie pleine : aucun emplacement libre.',
    )

    expect(wrapper.text()).toContain('Catégorie pleine : aucun emplacement libre.')
  })
})
