import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InventorySlotModal, {
  type InventorySlotContext,
} from '../InventorySlotModal.vue'
import type { GearEntry } from '../../models/repositories/EquipmentRepository'
import type { BagItemDocument } from '../../models/repositories/ItemRepository'

function mountModal(context: InventorySlotContext, errorMessage: string | null = null) {
  return mount(InventorySlotModal, {
    props: { open: true, context, errorMessage },
  })
}

describe('InventorySlotModal', () => {
  it('renders name + description + quantity fields for a bag context', () => {
    const wrapper = mountModal({ kind: 'bag' })

    expect(wrapper.find('#inv-slot-name').exists()).toBe(true)
    expect(wrapper.find('#inv-slot-description').exists()).toBe(true)
    expect(wrapper.find('#inv-slot-quantity').exists()).toBe(true)
  })

  it('renders name + description fields with no quantity for a Weapons/Armor context', () => {
    const wrapper = mountModal({ kind: 'Weapons' })

    expect(wrapper.find('#inv-slot-name').exists()).toBe(true)
    expect(wrapper.find('#inv-slot-description').exists()).toBe(true)
    expect(wrapper.find('#inv-slot-quantity').exists()).toBe(false)
  })

  it('pre-fills name, description and quantity when editing an existing bag item', () => {
    const item: BagItemDocument = {
      EntryId: 'item-1',
      DisplayName: 'Rations',
      Description: 'Nourriture séchée',
      Quantity: 4,
      PlayerId: 'uid-1',
      CampaignId: 'camp-1',
    }
    const wrapper = mountModal({ kind: 'bag', item })

    expect((wrapper.find('#inv-slot-name').element as HTMLInputElement).value).toBe('Rations')
    expect((wrapper.find('#inv-slot-description').element as HTMLTextAreaElement).value).toBe(
      'Nourriture séchée',
    )
    expect((wrapper.find('#inv-slot-quantity').element as HTMLInputElement).value).toBe('4')
  })

  it('leaves quantity blank when pre-filling a bag item with quantity 1', () => {
    const item: BagItemDocument = {
      EntryId: 'item-1',
      DisplayName: 'Carte',
      Quantity: 1,
      PlayerId: 'uid-1',
      CampaignId: 'camp-1',
    }
    const wrapper = mountModal({ kind: 'bag', item })

    expect((wrapper.find('#inv-slot-quantity').element as HTMLInputElement).value).toBe('')
  })

  it('pre-fills a BonusRaw row when editing an existing equipped item', () => {
    const item: GearEntry = {
      EntryId: 'a-ring',
      DisplayName: 'Anneau de Mana',
      BonusRaw: { Mana: 4 },
    }
    const wrapper = mountModal({ kind: 'Armor', item })

    const statSelect = wrapper.find('.bonus-stat').element as HTMLSelectElement
    const amountInput = wrapper.find('.bonus-amount').element as HTMLInputElement
    expect(statSelect.value).toBe('Mana')
    expect(amountInput.value).toBe('4')
  })

  it('shows the delete button only when editing an existing item', () => {
    const withoutItem = mountModal({ kind: 'Weapons' })
    expect(withoutItem.find('.inventory-slot-delete').exists()).toBe(false)

    const withItem = mountModal({
      kind: 'Weapons',
      item: { EntryId: 'w-1', DisplayName: 'Dague' },
    })
    expect(withItem.find('.inventory-slot-delete').exists()).toBe(true)
  })

  it('closes without emitting save when the name is empty on submit', async () => {
    const wrapper = mountModal({ kind: 'bag' })

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits a bag save payload with quantity defaulting to 1 when left blank', async () => {
    const wrapper = mountModal({ kind: 'bag' })

    await wrapper.find('#inv-slot-name').setValue('Trousse de soins')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      kind: 'bag',
      item: { EntryId: undefined, DisplayName: 'Trousse de soins', Quantity: 1 },
    })
  })

  it('emits a bag save payload including quantity and description when set', async () => {
    const wrapper = mountModal({ kind: 'bag' })

    await wrapper.find('#inv-slot-name').setValue('Flèches')
    await wrapper.find('#inv-slot-description').setValue('Munitions standard')
    await wrapper.find('#inv-slot-quantity').setValue('12')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      kind: 'bag',
      item: {
        EntryId: undefined,
        DisplayName: 'Flèches',
        Description: 'Munitions standard',
        Quantity: 12,
      },
    })
  })

  it('emits an equipped-item save payload with a BonusRaw built from the bonus row', async () => {
    const wrapper = mountModal({ kind: 'Weapons' })

    await wrapper.find('#inv-slot-name').setValue('Arc long')
    await wrapper.find('.bonus-add').trigger('click')
    await wrapper.find('.bonus-stat').setValue('PhysicalAttack')
    await wrapper.find('.bonus-amount').setValue('2')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      kind: 'Weapons',
      item: {
        EntryId: undefined,
        DisplayName: 'Arc long',
        BonusRaw: { PhysicalAttack: 2 },
      },
    })
  })

  it('emits a BonusConditional entry built from a conditional row', async () => {
    const wrapper = mountModal({ kind: 'Armor' })

    await wrapper.find('#inv-slot-name').setValue('Bottes enracinées')
    const addButtons = wrapper.findAll('.bonus-add')
    await addButtons[1]?.trigger('click')
    await wrapper.find('.bonus-name').setValue('Enraciné')
    await wrapper.find('.bonus-stat').setValue('PhysicalDefense')
    await wrapper.find('.bonus-amount').setValue('2')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      kind: 'Armor',
      item: {
        EntryId: undefined,
        DisplayName: 'Bottes enracinées',
        BonusConditional: [{ Name: 'Enraciné', Effects: { PhysicalDefense: 2 } }],
      },
    })
  })

  it('preserves the EntryId on save when editing an existing item', async () => {
    const wrapper = mountModal({
      kind: 'Armor',
      item: { EntryId: 'a-1', DisplayName: 'Cotte de mailles', BonusRaw: { PhysicalArmor: 2 } },
    })

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      kind: 'Armor',
      item: {
        EntryId: 'a-1',
        DisplayName: 'Cotte de mailles',
        BonusRaw: { PhysicalArmor: 2 },
      },
    })
  })

  it('emits delete with kind and entryId when the delete button is clicked', async () => {
    const wrapper = mountModal({
      kind: 'bag',
      item: { EntryId: 'item-1', DisplayName: 'Trousse', Quantity: 1, PlayerId: 'uid-1', CampaignId: 'camp-1' },
    })

    await wrapper.find('.inventory-slot-delete').trigger('click')

    expect(wrapper.emitted('delete')?.[0]?.[0]).toEqual({ kind: 'bag', entryId: 'item-1' })
  })

  it('shows equip buttons only for an existing bag item, and emits move on click', async () => {
    const wrapper = mountModal({
      kind: 'bag',
      item: { EntryId: 'item-1', DisplayName: 'Épée', Quantity: 1, PlayerId: 'uid-1', CampaignId: 'camp-1' },
    })

    const moveButtons = wrapper.findAll('.inventory-slot-move-btn')
    expect(moveButtons).toHaveLength(2)

    await moveButtons[0]?.trigger('click')
    expect(wrapper.emitted('move')?.[0]?.[0]).toEqual({
      direction: 'equip',
      kind: 'Weapons',
      entryId: 'item-1',
    })
  })

  it('shows an unequip button for an existing equipped item, and emits move on click', async () => {
    const wrapper = mountModal({
      kind: 'Armor',
      item: { EntryId: 'a-1', DisplayName: 'Cotte de mailles' },
    })

    const moveButtons = wrapper.findAll('.inventory-slot-move-btn')
    expect(moveButtons).toHaveLength(1)

    await moveButtons[0]?.trigger('click')
    expect(wrapper.emitted('move')?.[0]?.[0]).toEqual({
      direction: 'unequip',
      kind: 'Armor',
      entryId: 'a-1',
    })
  })

  it('shows no move buttons for a brand-new (unsaved) item', () => {
    const wrapper = mountModal({ kind: 'bag' })

    expect(wrapper.findAll('.inventory-slot-move-btn')).toHaveLength(0)
  })

  it('displays the errorMessage prop (e.g. a slot-cap rejection) when set', () => {
    const wrapper = mountModal({ kind: 'bag' }, 'Capacité du sac atteinte : 30/30.')

    expect(wrapper.text()).toContain('Capacité du sac atteinte : 30/30.')
  })
})
