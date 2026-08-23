import type { CharacterGift } from '../models/types/Character'

/** Legacy data mixes ASCII '-' and Unicode minus '−' (U+2212) for negative bonuses. */
function normalizeMinus(text: string): string {
  return text.replace(/−/g, '-')
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
