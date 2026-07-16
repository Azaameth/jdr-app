import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CosmologyTierCard from '../CosmologyTierCard.vue'
import type { CosmologyTier } from '../../models/types/Cosmology'

const branchedTier: CosmologyTier = {
  id: 'effroyable',
  order: 2,
  title: '③ BÊTES EFFROYABLES',
  legendLabel: 'Effroyable',
  subtitle: 'Titans · Aberrations · Horreurs',
  description: 'Nombre inconnu, chaotiques, sans conscience.',
  ruleNote: '⬆ Une Bête Effroyable qui tue une Légendaire devient soudain consciente.',
  footnote: '→ Peut accéder au rang Légendaire',
  examples: [{ name: 'Kraken', epithet: 'Terreur des profondeurs' }],
  branch: 'left',
}

const plainTier: CosmologyTier = {
  id: 'deique',
  order: 0,
  title: '① CRÉATURES DÉÏQUES PRIMORDIALES',
  legendLabel: 'Déïque',
  subtitle: "Sommet absolu — La Lumière & l'Obscurité",
  description: 'Deux entités incompréhensibles.',
  examples: [],
}

describe('CosmologyTierCard', () => {
  it('renders the header as a real button with correct aria-expanded when closed', () => {
    const wrapper = mount(CosmologyTierCard, {
      props: { tier: branchedTier, open: false },
    })

    const header = wrapper.find('.tier-header')
    expect(header.element.tagName).toBe('BUTTON')
    expect(header.attributes('aria-expanded')).toBe('false')
  })

  it('sets aria-expanded to true when open, and aria-controls matches the body id', () => {
    const wrapper = mount(CosmologyTierCard, {
      props: { tier: branchedTier, open: true },
    })

    const header = wrapper.find('.tier-header')
    expect(header.attributes('aria-expanded')).toBe('true')

    const body = wrapper.find('.tier-body')
    expect(header.attributes('aria-controls')).toBe(body.attributes('id'))
  })

  it('emits toggle exactly once when the header is clicked', async () => {
    const wrapper = mount(CosmologyTierCard, {
      props: { tier: branchedTier, open: false },
    })

    await wrapper.find('.tier-header').trigger('click')

    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('renders .up-tick and .tier-footnote when the tier has a branch and footnote', () => {
    const wrapper = mount(CosmologyTierCard, {
      props: { tier: branchedTier, open: false },
    })

    expect(wrapper.find('.up-tick').exists()).toBe(true)
    expect(wrapper.find('.tier-footnote').exists()).toBe(true)
    expect(wrapper.find('.tier-footnote').text()).toBe('→ Peut accéder au rang Légendaire')
  })

  it('omits .up-tick and .tier-footnote when the tier has neither branch nor footnote', () => {
    const wrapper = mount(CosmologyTierCard, {
      props: { tier: plainTier, open: false },
    })

    expect(wrapper.find('.up-tick').exists()).toBe(false)
    expect(wrapper.find('.tier-footnote').exists()).toBe(false)
  })
})
