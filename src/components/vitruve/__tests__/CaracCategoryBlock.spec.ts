import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CaracCategoryBlock, { type CaracCategorySub } from '../CaracCategoryBlock.vue'

// WP06 extracted this component out of CaracTab.vue so ChildSheetTab could
// reuse the exact same category-block markup/styling — see CaracTab.spec.ts
// for the pre-existing coverage of the block's behavior when driven through
// CaracTab; these cases test the extracted component directly/in isolation.
function makeSubs(overrides: Partial<CaracCategorySub>[] = []): CaracCategorySub[] {
  const base: CaracCategorySub[] = [
    { attr: 'puissance', label: 'Puissance', value: 5, state: null },
    { attr: 'finesse', label: 'Finesse', value: 3, state: null },
  ]
  return base.map((sub, index) => ({ ...sub, ...overrides[index] }))
}

describe('CaracCategoryBlock', () => {
  it('renders the label, adjusted %, and each sub row', () => {
    const wrapper = mount(CaracCategoryBlock, {
      props: { label: 'Physique', adjPct: 65, pinned: false, subs: makeSubs(), canEdit: true },
    })

    expect(wrapper.find('.cat-label').text()).toBe('Physique')
    expect(wrapper.find('.cat-pct').text()).toBe('65%')
    const rows = wrapper.findAll('.sub-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.find('.sub-label').text()).toBe('Puissance')
    expect(rows[0]?.find('.sub-val').text()).toBe('5')
  })

  it('applies the pinned modifier class when pinned is true', () => {
    const wrapper = mount(CaracCategoryBlock, {
      props: { label: 'Physique', adjPct: 5, pinned: true, subs: makeSubs(), canEdit: false },
    })

    expect(wrapper.find('.carac-cat').classes()).toContain('pinned')
  })

  it('a rouge sub shows "—" instead of its value and strikes through the label', () => {
    const wrapper = mount(CaracCategoryBlock, {
      props: {
        label: 'Physique',
        adjPct: 5,
        pinned: false,
        subs: makeSubs([{ state: 'rouge' }]),
        canEdit: false,
      },
    })

    const rouge = wrapper.findAll('.sub-row')[0]
    expect(rouge?.classes()).toContain('rouge')
    expect(rouge?.find('.sub-val').text()).toBe('—')
  })

  it('emits cycle-injury with the sub attr on square click when canEdit is true', async () => {
    const wrapper = mount(CaracCategoryBlock, {
      props: { label: 'Physique', adjPct: 65, pinned: false, subs: makeSubs(), canEdit: true },
    })

    await wrapper.findAll('.injury-square')[1]?.trigger('click')

    expect(wrapper.emitted('cycle-injury')).toEqual([['finesse']])
  })

  it('squares are disabled and clicking emits nothing when canEdit is false', async () => {
    const wrapper = mount(CaracCategoryBlock, {
      props: { label: 'Physique', adjPct: 65, pinned: false, subs: makeSubs(), canEdit: false },
    })

    const squares = wrapper.findAll('.injury-square')
    expect(squares.every((sq) => (sq.element as HTMLButtonElement).disabled)).toBe(true)

    await squares[0]?.trigger('click')
    expect(wrapper.emitted('cycle-injury')).toBeUndefined()
  })
})
