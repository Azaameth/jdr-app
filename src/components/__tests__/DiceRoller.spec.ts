import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DiceRoller from '../DiceRoller.vue'

describe('DiceRoller', () => {
  it('renders all supported dice buttons', () => {
    const wrapper = mount(DiceRoller)
    const labels = wrapper.findAll('.die-btn').map((button) => button.text().replace(/\s+/g, ''))

    expect(labels).toEqual(['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'])
  })

  it('rolls a d100 and displays an in-range value', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const wrapper = mount(DiceRoller)

    await wrapper.findAll('.die-btn')[6]?.trigger('click')

    expect(wrapper.find('.dice-num').text()).toBe('100')
    expect(wrapper.text()).toContain('Résultat du d100')
    randomSpy.mockRestore()
  })

  it('adds rolls to history with the latest roll first', async () => {
    const randomSpy = vi.spyOn(Math, 'random')
    randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0.5)
    const wrapper = mount(DiceRoller)

    await wrapper.findAll('.die-btn')[0]?.trigger('click')
    await wrapper.findAll('.die-btn')[1]?.trigger('click')

    const rows = wrapper.findAll('.dh-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text().replace(/\s+/g, '')).toContain('d6')
    expect(rows[0]?.text().replace(/\s+/g, '')).toContain('4')
    expect(rows[1]?.text().replace(/\s+/g, '')).toContain('d4')
    expect(rows[1]?.text().replace(/\s+/g, '')).toContain('1')

    randomSpy.mockRestore()
  })

  it('resets displayed result when component is remounted', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.6)
    const firstMount = mount(DiceRoller)

    await firstMount.findAll('.die-btn')[0]?.trigger('click')
    expect(firstMount.text()).toContain('Résultat du d4')
    firstMount.unmount()

    const secondMount = mount(DiceRoller)
    expect(secondMount.text()).not.toContain('Résultat du d4')
    expect(secondMount.text()).toContain('Choisissez un dé')
    expect(secondMount.text()).toContain('Aucun lancer pour le moment.')

    randomSpy.mockRestore()
  })
})
