import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DonList from '../DonList.vue'
import type { CharacterGift } from '../../models/types/Character'

function makeGift(overrides: Partial<CharacterGift> = {}): CharacterGift {
  return {
    id: 'gift-1',
    name: 'Lame de Foudre',
    description: 'Une lame crépitante de foudre.',
    ...overrides,
  }
}

describe('DonList', () => {
  it('shows the italic empty state when there are no gifts', () => {
    const wrapper = mount(DonList, { props: { gifts: [] } })

    const empty = wrapper.find('.dons-empty')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toBe('Aucun don.')
    expect(wrapper.find('.gift-card').exists()).toBe(false)
  })

  it('renders one card per gift with the emoji-stripped name', () => {
    const gifts = [
      makeGift({ id: 'g-1', name: '⚡ Lame de Foudre' }),
      makeGift({ id: 'g-2', name: 'Maîtrise des Armes' }),
    ]
    const wrapper = mount(DonList, { props: { gifts } })

    const cards = wrapper.findAll('.gift-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]?.find('.gift-name').text()).toBe('Lame de Foudre')
    expect(cards[1]?.find('.gift-name').text()).toBe('Maîtrise des Armes')
  })

  it('strips a leading emoji from the name and reuses it as the card icon', () => {
    const gifts = [makeGift({ name: '⚡ Lame de Foudre' })]
    const wrapper = mount(DonList, { props: { gifts } })

    expect(wrapper.find('.gift-icon').text()).toBe('⚡')
    expect(wrapper.find('.gift-name').text()).toBe('Lame de Foudre')
  })

  it('renders no icon element when the name has no leading emoji', () => {
    const gifts = [makeGift({ name: 'Maîtrise des Armes' })]
    const wrapper = mount(DonList, { props: { gifts } })

    expect(wrapper.find('.gift-icon').exists()).toBe(false)
    expect(wrapper.find('.gift-name').text()).toBe('Maîtrise des Armes')
  })

  it('shows a short first line of the description as an effect teaser', () => {
    const gifts = [makeGift({ description: 'Inflige des dégâts électriques.' })]
    const wrapper = mount(DonList, { props: { gifts } })

    expect(wrapper.find('.gift-effect').text()).toBe('Inflige des dégâts électriques.')
  })

  it('omits the effect teaser when the first line is long', () => {
    const longFirstLine =
      'Dy concentre ses pouvoirs sur les courants environnants, créant un couloir ' +
      "d'air tourbillonnant capable de déplacer les cibles sur une distance définie."
    const gifts = [makeGift({ description: longFirstLine })]
    const wrapper = mount(DonList, { props: { gifts } })

    expect(wrapper.find('.gift-effect').exists()).toBe(false)
  })

  it('omits the effect teaser when the description is empty', () => {
    const gifts = [makeGift({ description: '' })]
    const wrapper = mount(DonList, { props: { gifts } })

    expect(wrapper.find('.gift-effect').exists()).toBe(false)
  })

  it('shows both MANA and DÉGÂTS badges for an enriched combat gift', () => {
    const gifts = [makeGift({ manaCost: 4, damageDice: '1D6', damageBonus: 1 })]
    const wrapper = mount(DonList, { props: { gifts } })

    const manaBadge = wrapper.find('.gift-badge-mana')
    const damageBadge = wrapper.find('.gift-badge-damage')
    expect(manaBadge.find('.badge-value').text()).toBe('4')
    expect(manaBadge.find('.badge-label').text()).toBe('MANA')
    expect(damageBadge.find('.badge-value').text()).toBe('1D6 +1')
    expect(damageBadge.find('.badge-label').text()).toBe('DÉGÂTS')
  })

  it('shows the MANA badge from manaNote when manaCost is absent (formula mana)', () => {
    const gifts = [makeGift({ manaNote: '2+(1/5m)' })]
    const wrapper = mount(DonList, { props: { gifts } })

    expect(wrapper.find('.gift-badge-mana .badge-value').text()).toBe('2+(1/5m)')
  })

  it('shows a DÉGÂTS badge with no bonus suffix when damageBonus is absent', () => {
    const gifts = [makeGift({ damageDice: '1D10' })]
    const wrapper = mount(DonList, { props: { gifts } })

    expect(wrapper.find('.gift-badge-damage .badge-value').text()).toBe('1D10')
  })

  it('shows a negative signed bonus in the DÉGÂTS badge', () => {
    const gifts = [makeGift({ damageDice: '1D4', damageBonus: -1 })]
    const wrapper = mount(DonList, { props: { gifts } })

    expect(wrapper.find('.gift-badge-damage .badge-value').text()).toBe('1D4 -1')
  })

  it('renders no badges at all for a passive gift (FR-010, never fake zeros)', () => {
    const gifts = [
      makeGift({
        name: 'Maîtrise des Armes',
        description: 'Capacité passive. Maîtrise avancée du maniement des armes.',
      }),
    ]
    const wrapper = mount(DonList, { props: { gifts } })

    expect(wrapper.find('.gift-badges').exists()).toBe(false)
    expect(wrapper.find('.gift-badge-mana').exists()).toBe(false)
    expect(wrapper.find('.gift-badge-damage').exists()).toBe(false)
  })

  it('omits the DÉGÂTS badge when damageBonus is 0 and damageDice is absent (no synthesized zero)', () => {
    const gifts = [makeGift({ damageBonus: 0 })]
    const wrapper = mount(DonList, { props: { gifts } })

    expect(wrapper.find('.gift-badge-damage').exists()).toBe(false)
  })

  it('renders each card as a real button element for keyboard accessibility', () => {
    const gifts = [makeGift()]
    const wrapper = mount(DonList, { props: { gifts } })

    expect(wrapper.find('.gift-card').element.tagName).toBe('BUTTON')
  })

  it('emits open with the gift payload when a card is clicked', async () => {
    const gift = makeGift()
    const wrapper = mount(DonList, { props: { gifts: [gift] } })

    await wrapper.find('.gift-card').trigger('click')

    expect(wrapper.emitted('open')).toHaveLength(1)
    expect(wrapper.emitted('open')?.[0]?.[0]).toEqual(gift)
  })
})
