import { describe, expect, it } from 'vitest'
import {
  formatWeaponArmorStat,
  parseLegacyGiftText,
  parseQuantityText,
  parseWeaponArmorText,
} from '../inventoryText'

describe('inventoryText', () => {
  describe('parseWeaponArmorText', () => {
    it('parses a damage die with a negative Unicode-minus bonus', () => {
      expect(parseWeaponArmorText('Vieille épée (D4/−1)')).toEqual({
        name: 'Vieille épée',
        damageDie: 'D4',
        damageBonus: -1,
      })
    })

    it('parses a damage die with a positive ASCII-plus bonus', () => {
      expect(parseWeaponArmorText('Deux haches à une main (D10/+4)')).toEqual({
        name: 'Deux haches à une main',
        damageDie: 'D10',
        damageBonus: 4,
      })
    })

    it('parses a bare armor rating with no note', () => {
      expect(parseWeaponArmorText("Robe d'Arcaniste enchantée (RD2)")).toEqual({
        name: "Robe d'Arcaniste enchantée",
        armorRating: 2,
      })
    })

    it('parses an armor rating plus a trailing note', () => {
      expect(parseWeaponArmorText('Anneau du Dieu du Feu (RD2 vs proj. magiques)')).toEqual({
        name: 'Anneau du Dieu du Feu',
        armorRating: 2,
        statNote: 'vs proj. magiques',
      })
    })

    it('falls back to a verbatim statNote when nothing structured matches', () => {
      expect(parseWeaponArmorText('Anneau du Dieu du Feu (vs proj. magiques)')).toEqual({
        name: 'Anneau du Dieu du Feu',
        statNote: 'vs proj. magiques',
      })
    })

    it('treats a whole-string placeholder with no leading name as a bare name, untouched', () => {
      expect(parseWeaponArmorText('Armure impossible — Oracle')).toEqual({
        name: 'Armure impossible — Oracle',
      })
    })

    it('treats an entirely parenthesized string (no leading name) as a bare name too', () => {
      expect(parseWeaponArmorText('(Armure impossible — Oracle)')).toEqual({
        name: '(Armure impossible — Oracle)',
      })
    })

    it('returns just the name when there is no annotation at all', () => {
      expect(parseWeaponArmorText('Rations')).toEqual({ name: 'Rations' })
    })

    it('accepts an unsigned zero bonus', () => {
      expect(parseWeaponArmorText('Wok (D4/0)')).toEqual({
        name: 'Wok',
        damageDie: 'D4',
        damageBonus: 0,
      })
    })

    describe('round-trip losslessness (format(parse(s)) reproduces the annotation)', () => {
      const cases: Array<[raw: string, expectedAnnotation: string]> = [
        ['Vieille épée (D4/−1)', 'D4/-1'],
        ['Deux haches à une main (D10/+4)', 'D10/+4'],
        ["Robe d'Arcaniste enchantée (RD2)", 'RD2'],
        ['Anneau du Dieu du Feu (RD2 vs proj. magiques)', 'RD2 vs proj. magiques'],
        ['Anneau du Dieu du Feu (vs proj. magiques)', 'vs proj. magiques'],
      ]

      it.each(cases)('round-trips %s', (raw, expectedAnnotation) => {
        const parsed = parseWeaponArmorText(raw)
        expect(formatWeaponArmorStat(parsed)).toBe(expectedAnnotation)
      })

      it('produces an empty badge when there is no annotation to reproduce', () => {
        const parsed = parseWeaponArmorText('Armure impossible — Oracle')
        expect(formatWeaponArmorStat(parsed)).toBe('')
      })
    })
  })

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
