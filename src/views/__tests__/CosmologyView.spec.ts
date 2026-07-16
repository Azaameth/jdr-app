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

const fixtureTiers = [
  {
    id: 'deique',
    order: 0,
    title: '① CRÉATURES DÉÏQUES PRIMORDIALES',
    legendLabel: 'Déïque',
    subtitle: "Sommet absolu — La Lumière & l'Obscurité",
    description:
      "Deux entités incompréhensibles. L'une incarne la Lumière, l'autre l'Obscurité. À l'origine du cycle cosmique, elles n'interviennent presque jamais directement. Leur trône peut être renversé : une créature légendaire qui les vainc devient à son tour une déité.",
    examples: [],
  },
  {
    id: 'legendaire',
    order: 1,
    title: '② LES 12 BÊTES LÉGENDAIRES',
    legendLabel: 'Légendaire',
    subtitle: 'Vythranax · Vindrasil · et 10 autres…',
    description:
      'Leur identité est inconnue du commun. Chacune règne sur un aspect fondamental du réel : magie, saisons, émotions, guerre, mémoire… Pleine conscience et volonté propre.',
    ruleNote: "Seul moyen d'en devenir une : tuer et remplacer l'une des 12.",
    examples: [
      { name: 'Vythranax', epithet: 'Le Dragon Légendaire' },
      { name: 'Vindrasil', epithet: 'Le Serpent des Profondeurs' },
    ],
  },
  {
    id: 'effroyable',
    order: 2,
    title: '③ BÊTES EFFROYABLES',
    legendLabel: 'Effroyable',
    subtitle: 'Titans · Aberrations · Horreurs',
    description:
      "Nombre inconnu, chaotiques, sans conscience, guidées par l'instinct de destruction. Incarnent des catastrophes vivantes : titans, aberrations, horreurs anciennes.",
    ruleNote:
      '⬆ Une Bête Effroyable qui tue une Légendaire devient soudain intelligente et consciente.',
    footnote: '→ Peut accéder au rang Légendaire',
    examples: [
      { name: 'Kraken', epithet: 'Terreur des profondeurs' },
      { name: "Dragon de l'Ombre", epithet: 'Ravageur' },
    ],
    branch: 'left',
  },
  {
    id: 'rare',
    order: 3,
    title: '④ BÊTES RARES',
    legendLabel: 'Rare',
    subtitle: 'Dragons · Créatures conscientes',
    description:
      'Ont une conscience, contrairement aux Effroyables. Créatures puissantes, exotiques, souvent uniques ou très peu nombreuses.',
    ruleNote:
      '⬇ Peuvent basculer en Bêtes Effroyables par une chute morale : massacres ou perte de conscience.',
    footnote: '↑ Ascension depuis les Communes possible',
    examples: [{ name: 'Dragon de Brume', epithet: 'Spectre des cieux' }],
    branch: 'middle',
  },
  {
    id: 'commune',
    order: 4,
    title: '⑤ CRÉATURES COMMUNES',
    legendLabel: 'Commune',
    subtitle: 'Races · Monstres · Esprits faibles',
    description:
      "Les races d'Alésia (humains, nains, elfes, kitsune…), les créatures ordinaires (gobelins, orcs, animaux) et les esprits faibles. Les plus nombreux, les moins proches du cycle divin.",
    ruleNote:
      '⬆ Certaines peuvent devenir des Bêtes Rares par ascension, mutation ou quête épique.',
    footnote: 'Base du cycle — la plus grande diversité',
    examples: [
      { name: 'Créature de la Terre', epithet: 'Peuples des royaumes' },
      { name: 'Créature de la Mer', epithet: 'Vie des profondeurs' },
      { name: 'Créature du Ciel', epithet: 'Volatiles des cieux' },
      { name: 'Créature Magique', epithet: 'Petits esprits étranges' },
    ],
    branch: 'right',
  },
]

vi.mock('../../models/repositories/CosmologyRepository', () => ({
  listCosmologyTiers: vi.fn<() => Promise<unknown[]>>(async () => fixtureTiers),
}))

import CosmologyView from '../CosmologyView.vue'

describe('CosmologyView', () => {
  it('renders all 5 tier titles in order', async () => {
    const wrapper = mount(CosmologyView)
    await flushPromises()

    const titles = wrapper.findAll('.tier-title').map((el) => el.text())
    expect(titles).toEqual([
      '① CRÉATURES DÉÏQUES PRIMORDIALES',
      '② LES 12 BÊTES LÉGENDAIRES',
      '③ BÊTES EFFROYABLES',
      '④ BÊTES RARES',
      '⑤ CRÉATURES COMMUNES',
    ])
  })

  it('starts with every tier closed', async () => {
    const wrapper = mount(CosmologyView)
    await flushPromises()

    const headers = wrapper.findAll('.tier-header')
    expect(headers).toHaveLength(5)
    for (const header of headers) {
      expect(header.attributes('aria-expanded')).toBe('false')
    }

    const bodies = wrapper.findAll('.tier-body')
    expect(bodies).toHaveLength(5)
    for (const body of bodies) {
      expect(body.isVisible()).toBe(false)
    }
  })

  it('toggles only the clicked tier open, leaving the others closed', async () => {
    const wrapper = mount(CosmologyView)
    await flushPromises()

    const headers = wrapper.findAll('.tier-header')
    // Click the "effroyable" tier (index 2)
    await headers[2]?.trigger('click')

    const headersAfter = wrapper.findAll('.tier-header')
    expect(headersAfter[0]?.attributes('aria-expanded')).toBe('false')
    expect(headersAfter[1]?.attributes('aria-expanded')).toBe('false')
    expect(headersAfter[2]?.attributes('aria-expanded')).toBe('true')
    expect(headersAfter[3]?.attributes('aria-expanded')).toBe('false')
    expect(headersAfter[4]?.attributes('aria-expanded')).toBe('false')

    const bodiesAfter = wrapper.findAll('.tier-body')
    expect(bodiesAfter[2]?.isVisible()).toBe(true)
  })

  it('closes a tier again when its header is clicked a second time', async () => {
    const wrapper = mount(CosmologyView)
    await flushPromises()

    const headers = wrapper.findAll('.tier-header')
    await headers[0]?.trigger('click')
    expect(wrapper.findAll('.tier-header')[0]?.attributes('aria-expanded')).toBe('true')

    await wrapper.findAll('.tier-header')[0]?.trigger('click')
    expect(wrapper.findAll('.tier-header')[0]?.attributes('aria-expanded')).toBe('false')
    expect(wrapper.findAll('.tier-body')[0]?.isVisible()).toBe(false)
  })

  it('reveals Vythranax and Vindrasil when opening the légendaire tier', async () => {
    const wrapper = mount(CosmologyView)
    await flushPromises()

    await wrapper.findAll('.tier-header')[1]?.trigger('click')
    const text = wrapper.findAll('.tier-body')[1]?.text() ?? ''
    expect(text).toContain('Vythranax')
    expect(text).toContain('Vindrasil')
  })

  it('reveals Kraken and Dragon de l’Ombre when opening the effroyable tier', async () => {
    const wrapper = mount(CosmologyView)
    await flushPromises()

    await wrapper.findAll('.tier-header')[2]?.trigger('click')
    const text = wrapper.findAll('.tier-body')[2]?.text() ?? ''
    expect(text).toContain('Kraken')
    expect(text).toContain("Dragon de l'Ombre")
  })

  it('reveals Dragon de Brume when opening the rare tier', async () => {
    const wrapper = mount(CosmologyView)
    await flushPromises()

    await wrapper.findAll('.tier-header')[3]?.trigger('click')
    const text = wrapper.findAll('.tier-body')[3]?.text() ?? ''
    expect(text).toContain('Dragon de Brume')
  })

  it('reveals all 4 generic categories when opening the commune tier', async () => {
    const wrapper = mount(CosmologyView)
    await flushPromises()

    await wrapper.findAll('.tier-header')[4]?.trigger('click')
    const text = wrapper.findAll('.tier-body')[4]?.text() ?? ''
    expect(text).toContain('Créature de la Terre')
    expect(text).toContain('Créature de la Mer')
    expect(text).toContain('Créature du Ciel')
    expect(text).toContain('Créature Magique')
  })

  it('renders footnotes only for the 3 branch tiers', async () => {
    const wrapper = mount(CosmologyView)
    await flushPromises()

    const footnotes = wrapper.findAll('.tier-footnote')
    expect(footnotes).toHaveLength(3)
    expect(footnotes.map((el) => el.text())).toEqual([
      '→ Peut accéder au rang Légendaire',
      '↑ Ascension depuis les Communes possible',
      'Base du cycle — la plus grande diversité',
    ])
  })

  it('renders a legend row with exactly 5 items matching the tier legend labels', async () => {
    const wrapper = mount(CosmologyView)
    await flushPromises()

    const legendItems = wrapper.findAll('.legend-item')
    expect(legendItems).toHaveLength(5)
    expect(legendItems.map((el) => el.text())).toEqual([
      'Déïque',
      'Légendaire',
      'Effroyable',
      'Rare',
      'Commune',
    ])
  })
})
