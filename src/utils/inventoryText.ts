import type { CharacterGift } from '../models/types/Character'
import type { WeaponArmorItem } from '../models/types/Inventory'

const DAMAGE_DICE = ['D4', 'D6', 'D8', 'D10', 'D12', 'D20'] as const

/** Legacy data mixes ASCII '-' and Unicode minus '−' (U+2212) for negative bonuses. */
function normalizeMinus(text: string): string {
  return text.replace(/−/g, '-')
}

/**
 * Parses a legacy weapon/armor display string into structured stats.
 * '(D10/+4)' | '(RD2)' | '(RD2 vs proj. magiques)' → structured fields.
 * Anything that doesn't reduce to a recognized damage/armor pattern falls back
 * to `statNote` verbatim — no information is ever dropped. Lossless.
 */
export function parseWeaponArmorText(raw: string): Omit<WeaponArmorItem, 'itemId'> {
  const trimmed = raw.trim()

  // An annotation requires non-empty text before the trailing "(...)" — a
  // string that is *entirely* wrapped in parens (no leading name) is treated
  // as a literal whole name instead of "name + empty annotation".
  const match = trimmed.match(/^(.+?)\s*\(([^)]*)\)\s*$/)
  if (!match) {
    return { name: trimmed }
  }

  const name = (match[1] ?? '').trim()
  const annotation = normalizeMinus((match[2] ?? '').trim())

  const damagePattern = new RegExp(`^(${DAMAGE_DICE.join('|')})(?:/([+-]?\\d+))?$`)
  const damageMatch = annotation.match(damagePattern)
  if (damageMatch) {
    const result: Omit<WeaponArmorItem, 'itemId'> = {
      name,
      damageDie: damageMatch[1] as WeaponArmorItem['damageDie'],
    }
    if (damageMatch[2] !== undefined) {
      result.damageBonus = Number.parseInt(damageMatch[2], 10)
    }
    return result
  }

  const armorMatch = annotation.match(/^RD(\d+)(?:\s+(.*))?$/)
  if (armorMatch) {
    const result: Omit<WeaponArmorItem, 'itemId'> = {
      name,
      armorRating: Number.parseInt(armorMatch[1] ?? '', 10),
    }
    if (armorMatch[2]) {
      result.statNote = armorMatch[2].trim()
    }
    return result
  }

  return { name, statNote: annotation }
}

/**
 * Inverse of parseWeaponArmorText, for display badges.
 * 'D10/+4' | 'RD2' | 'RD2 vs proj. magiques' | bare statNote | '' when no stats.
 */
export function formatWeaponArmorStat(
  item: Pick<WeaponArmorItem, 'damageDie' | 'damageBonus' | 'armorRating' | 'statNote'>,
): string {
  if (item.damageDie) {
    if (item.damageBonus === undefined) {
      return item.damageDie
    }
    const sign = item.damageBonus >= 0 ? '+' : '-'
    return `${item.damageDie}/${sign}${Math.abs(item.damageBonus)}`
  }

  if (item.armorRating !== undefined) {
    return item.statNote ? `RD${item.armorRating} ${item.statNote}` : `RD${item.armorRating}`
  }

  if (item.statNote) {
    return item.statNote
  }

  return ''
}

/** 'Kit médical ×4' → { name: 'Kit médical', quantity: 4 }; 'Rations' → { name: 'Rations', quantity: 1 } */
export function parseQuantityText(raw: string): { name: string; quantity: number } {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(.*?)\s*[x×]\s*(\d+)\s*$/)
  if (match) {
    return { name: match[1] ?? '', quantity: Number.parseInt(match[2] ?? '', 10) }
  }
  return { name: trimmed, quantity: 1 }
}

/**
 * Splits a legacy gift string into name + effect text on the first of
 * ' — ' (em dash) or ' : ' (colon) — legacy priority order — then extracts
 * mana cost and dice/bonus from the effect. Passive gifts (no mana, no dice)
 * return only name + description — never synthesized zeros.
 */
export function parseLegacyGiftText(
  raw: string,
): Pick<CharacterGift, 'name' | 'manaCost' | 'manaNote' | 'damageDice' | 'damageBonus' | 'description'> {
  const trimmed = raw.trim()

  const emDashIdx = trimmed.indexOf(' — ')
  const colonIdx = trimmed.indexOf(' : ')

  let name = trimmed
  let effect = ''

  if (emDashIdx !== -1) {
    name = trimmed.slice(0, emDashIdx).trim()
    effect = trimmed.slice(emDashIdx + 3).trim()
  } else if (colonIdx !== -1) {
    name = trimmed.slice(0, colonIdx).trim()
    effect = trimmed.slice(colonIdx + 3).trim()
  }

  const result: Pick<
    CharacterGift,
    'name' | 'manaCost' | 'manaNote' | 'damageDice' | 'damageBonus' | 'description'
  > = {
    name,
    description: effect,
  }

  if (!effect) {
    return result
  }

  const normalized = normalizeMinus(effect)

  const manaMatch = normalized.match(/(\d+)\s*mana\b/)
  if (manaMatch) {
    result.manaCost = Number.parseInt(manaMatch[1] ?? '', 10)
  }

  const diceMatch = normalized.match(/(\d*D\d+(?:\+\d*D\d+)*)\s*([+-]\d+)?/)
  if (diceMatch) {
    result.damageDice = diceMatch[1]
    if (diceMatch[2]) {
      result.damageBonus = Number.parseInt(diceMatch[2], 10)
    }
  }

  return result
}
