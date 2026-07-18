import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DonDetailModal from '../DonDetailModal.vue'
import type { CharacterGift } from '../../models/types/Character'

function makeGift(overrides: Partial<CharacterGift> = {}): CharacterGift {
  return {
    id: 'gift-1',
    name: 'Lame de Foudre',
    description: 'Une lame crépitante de foudre.',
    ...overrides,
  }
}

describe('DonDetailModal', () => {
  it('renders nothing when closed', () => {
    const wrapper = mount(DonDetailModal, { props: { open: false, gift: makeGift() } })

    expect(wrapper.find('.don-modal-tiles').exists()).toBe(false)
  })

  it('shows the leading emoji as the header icon and the stripped name as the title', () => {
    const gift = makeGift({ name: '⚡ Lame de Foudre' })
    const wrapper = mount(DonDetailModal, { props: { open: true, gift } })

    expect(wrapper.find('.don-modal-icon').text()).toBe('⚡')
    expect(wrapper.find('.don-modal-title').text()).toBe('Lame de Foudre')
  })

  it('falls back to a ✦ header icon when the name has no leading emoji', () => {
    const gift = makeGift({ name: 'Maîtrise des Armes' })
    const wrapper = mount(DonDetailModal, { props: { open: true, gift } })

    expect(wrapper.find('.don-modal-icon').text()).toBe('✦')
    expect(wrapper.find('.don-modal-title').text()).toBe('Maîtrise des Armes')
  })

  it('shows all three tiles for an enriched combat gift', () => {
    const gift = makeGift({ manaCost: 4, damageDice: '1D6', damageBonus: 1 })
    const wrapper = mount(DonDetailModal, { props: { open: true, gift } })

    const tiles = wrapper.findAll('.don-tile-value')
    expect(tiles[0]?.text()).toBe('4 mana')
    expect(tiles[1]?.text()).toBe('1D6')
    expect(tiles[2]?.text()).toBe('+1')
  })

  it('shows a negative signed bonus tile', () => {
    const gift = makeGift({ damageDice: '1D4', damageBonus: -1 })
    const wrapper = mount(DonDetailModal, { props: { open: true, gift } })

    expect(wrapper.find('.don-tile-bonus .don-tile-value').text()).toBe('-1')
  })

  it('shows the mana tile from manaNote (formula mana) when manaCost is absent', () => {
    const gift = makeGift({ manaNote: 'X' })
    const wrapper = mount(DonDetailModal, { props: { open: true, gift } })

    expect(wrapper.find('.don-tile-mana .don-tile-value').text()).toBe('X')
  })

  it('shows all-"—" tiles for a passive gift, never fake zeros (FR-010)', () => {
    const gift = makeGift({
      name: 'Maîtrise des Armes',
      description: 'Capacité passive. Maîtrise avancée du maniement des armes.',
    })
    const wrapper = mount(DonDetailModal, { props: { open: true, gift } })

    const tiles = wrapper.findAll('.don-tile-value')
    expect(tiles.map((t) => t.text())).toEqual(['—', '—', '—'])
  })

  it('treats a damageBonus of exactly 0 as "—", not "+0" (FR-010)', () => {
    const gift = makeGift({ damageDice: '1D6', damageBonus: 0 })
    const wrapper = mount(DonDetailModal, { props: { open: true, gift } })

    expect(wrapper.find('.don-tile-bonus .don-tile-value').text()).toBe('—')
  })

  it('preserves description newlines verbatim (rendered via white-space: pre-line, not stripped/escaped)', () => {
    const gift = makeGift({ description: 'Ligne un.\nLigne deux.\n\nLigne quatre.' })
    const wrapper = mount(DonDetailModal, { props: { open: true, gift } })

    const desc = wrapper.find('.don-modal-desc')
    // jsdom does not apply scoped <style> rules, so this asserts the DOM
    // contract (literal \n preserved in text, not collapsed to spaces or
    // rendered as escaped "\n" text) that white-space: pre-line relies on.
    expect(desc.element.textContent).toBe('Ligne un.\nLigne deux.\n\nLigne quatre.')
  })

  it('emits close when AppModal requests a close', async () => {
    const gift = makeGift()
    const wrapper = mount(DonDetailModal, { props: { open: true, gift } })

    await wrapper.find('.app-modal-close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
