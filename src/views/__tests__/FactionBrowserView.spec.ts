import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRoute: () => ({ params: { id: 'campaign-1' } }),
  }
})

vi.mock('../../components/layout/CampaignShell.vue', () => ({
  default: {
    name: 'CampaignShell',
    template: '<div><slot /></div>',
  },
}))

vi.mock('../../models/repositories/FactionRepository', () => ({
  listFactions: vi.fn<() => Promise<unknown[]>>(async () => [
    {
      id: 'f1',
      order: 0,
      icon: '⚔',
      title: 'Les Téméraires',
      subtitle: 's1',
      badge: 'Alliance active',
      accent: '#000',
      description: 'd1',
      facts: [
        { label: 'Structure', value: 'v1' },
        { label: 'Objectif', value: 'v2' },
        { label: 'Statut', value: 'v3' },
        { label: 'Base', value: 'v4' },
      ],
    },
    {
      id: 'f2',
      order: 1,
      icon: '🌹',
      title: 'La Rose Noire',
      subtitle: 's2',
      badge: 'Hostile',
      accent: '#000',
      description: 'd2',
      facts: [
        { label: 'Rôle', value: 'v5' },
        { label: 'Rapport', value: 'v6' },
      ],
    },
  ]),
}))

import FactionBrowserView from '../FactionBrowserView.vue'

describe('FactionBrowserView', () => {
  it('switches displayed faction content when a tab is clicked', async () => {
    const wrapper = mount(FactionBrowserView)
    await flushPromises()

    // Both tab labels are always rendered — the fiche card is what switches, so
    // assertions target `.fiche-title` specifically, not the whole wrapper text.
    expect(wrapper.find('.fiche-title').text()).toBe('Les Téméraires')

    const tabs = wrapper.findAll('.tab')
    await tabs[1]?.trigger('click')

    expect(wrapper.find('.fiche-title').text()).toBe('La Rose Noire')
  })

  it('renders subtitle, badge, description and a facts grid sized to the faction', async () => {
    const wrapper = mount(FactionBrowserView)
    await flushPromises()

    // First faction: 4 facts (spec.md User Story 2, scenario 1).
    expect(wrapper.find('.fiche-sub').text()).toBe('s1')
    expect(wrapper.find('.badge').text()).toBe('Alliance active')
    expect(wrapper.find('.fiche-text').text()).toBe('d1')
    expect(wrapper.findAll('.fiche-cell')).toHaveLength(4)

    // Second faction: 2 facts — the layout must not break with fewer cells
    // (spec.md User Story 2, scenario 2).
    const tabs = wrapper.findAll('.tab')
    await tabs[1]?.trigger('click')

    expect(wrapper.find('.fiche-sub').text()).toBe('s2')
    expect(wrapper.find('.badge').text()).toBe('Hostile')
    expect(wrapper.findAll('.fiche-cell')).toHaveLength(2)
  })
})
