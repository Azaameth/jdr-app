import type {
  CharacterGender,
  CharacterGift,
  CharacterProfile,
  CharacterSkill,
  SecondaryAttributes,
} from '../types/Character'
import type { Membership, SessionInventoryItem } from '../types/Membership'

interface LegacyCompetence {
  n: string
  v: number
}

export interface LegacyDefaultChar {
  name: string
  race: string
  genre: string
  classe: string
  element?: string
  niveau: string
  pv: string
  mana: string
  pv_max: string
  mana_max: string
  phys: string
  social: string
  mental: string
  langues: string
  competences: LegacyCompetence[]
  armes: string
  armures: string
  dons: string
  equip: string
  race_bonus?: string
  notes?: string
  color?: string
  init?: string
}

export interface CharacterSeed {
  profile: CharacterProfile
  membership: Membership
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function slugify(text: string): string {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function toInt(value: string, fallback = 0): number {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function stripPrefix(value: string): string {
  return value.replace(/^[^a-zA-Z0-9]+\s*/, '').trim()
}

function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseElements(value?: string): string[] {
  if (!value) return []

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseQuantity(entry: string): { name: string; quantity: number } {
  const compact = entry.replace(/\s+/g, ' ').trim()
  const explicitQty = compact.match(/(?:x|×)\s*(\d+)$/i)

  if (explicitQty) {
    return {
      name: compact.replace(/\s*(?:x|×)\s*\d+$/i, '').trim(),
      quantity: Number.parseInt(explicitQty[1], 10) || 1,
    }
  }

  return { name: compact, quantity: 1 }
}

function parseSecondaryAttributes(competences: LegacyCompetence[]): SecondaryAttributes {
  const secondary: SecondaryAttributes = {
    puissance: 0,
    finesse: 0,
    aura: 0,
    relation: 0,
    instinct: 0,
    savoir: 0,
  }

  for (const competence of competences) {
    const raw = normalize(competence.n)
    const base = raw.replace(/\s*\(.*\)\s*/g, '').trim()

    if (base === 'puissance') secondary.puissance = competence.v
    if (base === 'finesse') secondary.finesse = competence.v
    if (base === 'aura') secondary.aura = competence.v
    if (base === 'relation') secondary.relation = competence.v
    if (base === 'instinct') secondary.instinct = competence.v
    if (base === 'savoir') secondary.savoir = competence.v
  }

  return secondary
}

function toSkillDomain(label: string): CharacterSkill['domain'] {
  const normalized = normalize(label)

  if (
    normalized.includes('puissance') ||
    normalized.includes('finesse') ||
    normalized.includes('bagarre') ||
    normalized.includes('maniement')
  ) {
    return 'force'
  }

  if (
    normalized.includes('aura') ||
    normalized.includes('relation') ||
    normalized.includes('persuasion') ||
    normalized.includes('charme') ||
    normalized.includes('social')
  ) {
    return 'social'
  }

  if (
    normalized.includes('instinct') ||
    normalized.includes('savoir') ||
    normalized.includes('erudit')
  ) {
    return 'mental'
  }

  return 'general'
}

function parseSkills(competences: LegacyCompetence[]): CharacterSkill[] {
  return competences
    .filter((item) => {
      const base = normalize(item.n)
        .replace(/\s*\(.*\)\s*/g, '')
        .trim()
      return !['puissance', 'finesse', 'aura', 'relation', 'instinct', 'savoir'].includes(base)
    })
    .map((item, index) => ({
      id: `skill-${index + 1}-${slugify(item.n)}`,
      name: item.n,
      rank: item.v,
      domain: toSkillDomain(item.n),
      source: 'base',
    }))
}

function parseGifts(dons: string): CharacterGift[] {
  return splitLines(dons).map((line, index) => {
    const trimmed = stripPrefix(line)
    const [namePart, detailPart] = trimmed.split(' - ')
    const manaMatch = trimmed.match(/(\d+)\s*mana/i)

    return {
      id: `gift-${index + 1}-${slugify(namePart ?? trimmed)}`,
      name: (namePart ?? trimmed).trim(),
      description: (detailPart ?? trimmed).trim(),
      manaCost: manaMatch ? Number.parseInt(manaMatch[1], 10) : undefined,
      source: 'class',
    }
  })
}

function parseSessionInventory(raw: LegacyDefaultChar): SessionInventoryItem[] {
  const lines = [
    ...splitLines(raw.armes),
    ...splitLines(raw.armures),
    ...raw.equip
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  ]

  return lines.map((entry, index) => {
    const parsed = parseQuantity(entry)
    return {
      itemId: `inv-${index + 1}-${slugify(parsed.name)}`,
      name: parsed.name,
      quantity: parsed.quantity,
      equipped: index < 2,
    }
  })
}

function toGender(value: string): CharacterGender {
  const normalized = normalize(value)
  if (normalized === 'homme') return 'Homme'
  if (normalized === 'femme') return 'Femme'
  return 'Autre'
}

function mapOne(
  characterId: string,
  raw: LegacyDefaultChar,
  campaignId: string,
  ownerUid = characterId,
): CharacterSeed {
  const now = new Date().toISOString()

  const profile: CharacterProfile = {
    id: characterId,
    campaignId,
    ownerUid,
    name: raw.name,
    raceId: slugify(raw.race),
    classId: slugify(raw.classe),
    gender: toGender(raw.genre),
    elements: parseElements(raw.element),
    level: toInt(raw.niveau, 1),
    attributes: {
      primary: {
        force: toInt(raw.phys, 0),
        social: toInt(raw.social, 0),
        mental: toInt(raw.mental, 0),
      },
      secondary: parseSecondaryAttributes(raw.competences),
    },
    skills: parseSkills(raw.competences),
    gifts: parseGifts(raw.dons),
    languages: raw.langues
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    lore: {
      backstory: raw.notes ?? '',
      notesPrivate: raw.init ? `Init: ${raw.init}` : undefined,
    },
    createdAt: now,
    updatedAt: now,
  }

  const membership: Membership = {
    uid: ownerUid,
    campaignId,
    characterId,
    status: 'approved',
    personalNote: '',
    session: {
      hp: toInt(raw.pv, 0),
      maxHp: toInt(raw.pv_max, 0),
      mana: toInt(raw.mana, 0),
      maxMana: toInt(raw.mana_max, 0),
      posture: 'FOCUS',
      inventory: parseSessionInventory(raw),
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  }

  return { profile, membership }
}

export function mapDefaultCharsToSeeds(
  campaignId: string,
  defaults: Record<string, LegacyDefaultChar>,
): CharacterSeed[] {
  return Object.entries(defaults).map(([characterId, value]) =>
    mapOne(characterId, value, campaignId),
  )
}

export function mapDefaultCharsToProfiles(
  campaignId: string,
  defaults: Record<string, LegacyDefaultChar>,
): CharacterProfile[] {
  return mapDefaultCharsToSeeds(campaignId, defaults).map((item) => item.profile)
}
