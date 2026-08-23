import { describe, expect, it } from 'vitest'
import { parseLegacyGiftText, parseQuantityText } from '../inventoryText'

describe('inventoryText', () => {
  describe('parseQuantityText', () => {
    it('extracts a name and quantity from a ×N suffix', () => {
      expect(parseQuantityText('Kit médical ×4')).toEqual({ name: 'Kit médical', quantity: 4 })
    })

    it('defaults quantity to 1 when there is no suffix', () => {
      expect(parseQuantityText('Rations')).toEqual({ name: 'Rations', quantity: 1 })
    })

    it('also accepts an ASCII x separator', () => {
      expect(parseQuantityText('Flèches x12')).toEqual({ name: 'Flèches', quantity: 12 })
    })
  })

  describe('parseLegacyGiftText', () => {
    it('splits an em-dash gift with mana + a single-dice bonus', () => {
      expect(parseLegacyGiftText('Turbo Fist — 2 mana / 1D10+2')).toEqual({
        name: 'Turbo Fist',
        description: '2 mana / 1D10+2',
        manaCost: 2,
        damageDice: '1D10',
        damageBonus: 2,
      })
    })

    it('splits an em-dash gift with mana + chained dice + a bonus', () => {
      expect(parseLegacyGiftText('Say My Name — 8 mana / 1D6+1D8+1')).toEqual({
        name: 'Say My Name',
        description: '8 mana / 1D6+1D8+1',
        manaCost: 8,
        damageDice: '1D6+1D8',
        damageBonus: 1,
      })
    })

    it('is a passive with no mana/dice fields when the colon-split effect has neither', () => {
      const result = parseLegacyGiftText('Maîtrise des Armes : relance 1×/combat')
      expect(result).toEqual({
        name: 'Maîtrise des Armes',
        description: 'relance 1×/combat',
      })
      expect(result.manaCost).toBeUndefined()
      expect(result.manaNote).toBeUndefined()
      expect(result.damageDice).toBeUndefined()
      expect(result.damageBonus).toBeUndefined()
    })

    it('does not synthesize a damageBonus from an unrelated "+N" with no dice present', () => {
      const result = parseLegacyGiftText("Baroud d'Honneur : <30% PV → +2 dégâts")
      expect(result).toEqual({
        name: "Baroud d'Honneur",
        description: '<30% PV → +2 dégâts',
      })
      expect(result.damageDice).toBeUndefined()
      expect(result.damageBonus).toBeUndefined()
    })

    it('prefers the em-dash split over a colon that appears later in the string', () => {
      const result = parseLegacyGiftText('Foo — 1 mana : bar')
      expect(result.name).toBe('Foo')
      expect(result.description).toBe('1 mana : bar')
    })

    it('keeps the whole string as name with empty description when no separator is present', () => {
      expect(parseLegacyGiftText('Invocations démoniques')).toEqual({
        name: 'Invocations démoniques',
        description: '',
      })
    })
  })
})
