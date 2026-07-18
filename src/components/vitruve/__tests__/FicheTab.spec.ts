import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FicheTab from '../FicheTab.vue'
import type { CharacterProfile } from '../../../models/types/Character'

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-1',
    campaignId: 'campaign-1',
    ownerUid: 'owner-uid',
    name: 'Azarius Desbois',
    raceId: 'r1',
    classId: 'c1',
    gender: 'Homme',
    elements: ['Feu'],
    level: 3,
    attributes: {
      primary: { force: 50, social: 30, mental: 40 },
      secondary: { puissance: 5, finesse: 3, aura: 2, relation: 2, instinct: 4, savoir: 1 },
    },
    skills: [],
    gifts: [],
    languages: ['Commun', 'Draconique'],
    img: '',
    backstory: 'Il était une fois...',
    ...overrides,
  }
}

describe('FicheTab', () => {
  it('renders race, genre, langues and histoire cards from props', () => {
    const wrapper = mount(FicheTab, {
      props: {
        character: makeCharacter(),
        raceName: 'Kitsune',
        canEdit: false,
      },
    })

    const cards = wrapper.findAll('.vcard-val')
    expect(cards[0]?.text()).toBe('Kitsune')
    expect(cards[1]?.text()).toBe('Homme')
    expect(cards[2]?.text()).toBe('Commun, Draconique')
    expect(wrapper.find('.histoire-text').text()).toBe('Il était une fois...')
  })

  it('renders a dash placeholder for empty langues and backstory, and unknown race', () => {
    const wrapper = mount(FicheTab, {
      props: {
        character: makeCharacter({ languages: [], backstory: '' }),
        canEdit: false,
      },
    })

    const cards = wrapper.findAll('.vcard-val')
    expect(cards[0]?.text()).toBe('—')
    expect(cards[2]?.text()).toBe('—')
    expect(wrapper.find('.histoire-text').text()).toBe('—')
  })

  it('hides the edit affordance when canEdit is false', () => {
    const wrapper = mount(FicheTab, {
      props: {
        character: makeCharacter(),
        raceName: 'Kitsune',
        canEdit: false,
      },
    })

    expect(wrapper.find('.edit-btn').exists()).toBe(false)
  })

  it('shows the edit affordance when canEdit is true and switches to a textarea', async () => {
    const wrapper = mount(FicheTab, {
      props: {
        character: makeCharacter(),
        raceName: 'Kitsune',
        canEdit: true,
      },
    })

    const editBtn = wrapper.find('.edit-btn')
    expect(editBtn.exists()).toBe(true)
    expect(editBtn.text()).toBe("Modifier l'histoire")

    await editBtn.trigger('click')

    expect(wrapper.find('.histoire-textarea').exists()).toBe(true)
    expect((wrapper.find('.histoire-textarea').element as HTMLTextAreaElement).value).toBe(
      'Il était une fois...',
    )
  })

  it('save emits save-histoire with the trimmed text', async () => {
    const wrapper = mount(FicheTab, {
      props: {
        character: makeCharacter(),
        raceName: 'Kitsune',
        canEdit: true,
      },
    })

    await wrapper.find('.edit-btn').trigger('click')
    const textarea = wrapper.find('.histoire-textarea')
    await textarea.setValue('  Une nouvelle histoire.  ')
    await wrapper.find('.btn.primary').trigger('click')

    expect(wrapper.emitted('save-histoire')).toEqual([['Une nouvelle histoire.']])
    // Switches back out of edit mode after save.
    expect(wrapper.find('.histoire-textarea').exists()).toBe(false)
  })

  it('cancel discards the draft without emitting', async () => {
    const wrapper = mount(FicheTab, {
      props: {
        character: makeCharacter(),
        raceName: 'Kitsune',
        canEdit: true,
      },
    })

    await wrapper.find('.edit-btn').trigger('click')
    await wrapper.find('.histoire-textarea').setValue('Brouillon jeté.')
    await wrapper.find('.btn.secondary').trigger('click')

    expect(wrapper.emitted('save-histoire')).toBeUndefined()
    expect(wrapper.find('.histoire-textarea').exists()).toBe(false)
    expect(wrapper.find('.histoire-text').text()).toBe('Il était une fois...')
  })
})
