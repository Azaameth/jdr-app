import fs from 'fs'
import path from 'path'

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function slugify(text) {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function stripPrefix(value) {
  return String(value || '')
    .replace(/^[^a-zA-Z0-9]+\s*/, '')
    .trim()
}

function splitLines(text) {
  return String(text || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseElements(value) {
  if (!value) return []

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseQuantity(entry) {
  const compact = String(entry || '')
    .replace(/\s+/g, ' ')
    .trim()
  const explicitQty = compact.match(/(?:x|×)\s*(\d+)$/i)

  if (explicitQty) {
    return {
      name: compact.replace(/\s*(?:x|×)\s*\d+$/i, '').trim(),
      quantity: Number.parseInt(explicitQty[1], 10) || 1,
    }
  }

  return { name: compact, quantity: 1 }
}

function parseSecondaryAttributes(competences) {
  const secondary = {
    puissance: 0,
    finesse: 0,
    aura: 0,
    relation: 0,
    instinct: 0,
    savoir: 0,
  }

  for (const competence of competences || []) {
    const raw = normalize(competence?.n)
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

function toSkillDomain(label) {
  const n = normalize(label)

  if (
    n.includes('puissance') ||
    n.includes('finesse') ||
    n.includes('bagarre') ||
    n.includes('maniement')
  ) {
    return 'force'
  }

  if (
    n.includes('aura') ||
    n.includes('relation') ||
    n.includes('persuasion') ||
    n.includes('charme') ||
    n.includes('social')
  ) {
    return 'social'
  }

  if (n.includes('instinct') || n.includes('savoir') || n.includes('erudit')) {
    return 'mental'
  }

  return 'general'
}

function parseSkills(competences) {
  return (competences || [])
    .filter((item) => {
      const base = normalize(item?.n)
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

function parseGifts(dons) {
  return splitLines(dons).map((line, index) => {
    const trimmed = stripPrefix(line)
    const [namePart, detailPart] = trimmed.split(' - ')
    const manaMatch = trimmed.match(/(\d+)\s*mana/i)

    const item = {
      id: `gift-${index + 1}-${slugify(namePart || trimmed)}`,
      name: (namePart || trimmed).trim(),
      description: (detailPart || trimmed).trim(),
      source: 'class',
    }

    if (manaMatch) {
      item.manaCost = Number.parseInt(manaMatch[1], 10)
    }

    return item
  })
}

function parseSessionInventory(raw) {
  const lines = [
    ...splitLines(raw.armes),
    ...splitLines(raw.armures),
    ...String(raw.equip || '')
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

function toGender(value) {
  const n = normalize(value)
  if (n === 'homme') return 'Homme'
  if (n === 'femme') return 'Femme'
  return 'Autre'
}

function toCharacterImagePath(characterId) {
  return `/images/portraits/${characterId}.jpg`
}

function resolveOwnerUid(raw, fallbackCharacterId) {
  const candidate = String(raw?.ownerUid ?? raw?.uid ?? raw?.userId ?? '').trim()
  return candidate || fallbackCharacterId
}

function mapOne(characterId, raw, campaignId, ownerUid = characterId) {
  const now = new Date().toISOString()

  const profile = {
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
    languages: String(raw.langues || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    img: toCharacterImagePath(characterId),
    backstory: raw.notes || '',
    createdAt: now,
    updatedAt: now,
  }

  const participant = {
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
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  }

  const inventory = {
    uid: ownerUid,
    campaignId,
    characterId,
    items: parseSessionInventory(raw),
    createdAt: now,
    updatedAt: now,
  }

  return { profile, participant, inventory }
}

function cleanUndefined(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanUndefined(item))
  }

  if (value && typeof value === 'object') {
    const output = {}
    for (const [key, nested] of Object.entries(value)) {
      if (nested !== undefined) {
        output[key] = cleanUndefined(nested)
      }
    }
    return output
  }

  return value
}

function main() {
  const campaignId = process.env.CAMPAIGN_ID || process.argv[2] || '2'
  const sourcePath = path.resolve(process.cwd(), 'scripts', 'data', 'defaultChars.json')
  const outputCharactersPath = path.resolve(process.cwd(), 'scripts', 'data', 'characters.json')
  const outputParticipantsPath = path.resolve(process.cwd(), 'scripts', 'data', 'participants.json')
  const outputInventoriesPath = path.resolve(process.cwd(), 'scripts', 'data', 'inventories.json')

  const rawDefaults = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
  const entries = Object.entries(rawDefaults)

  const characters = []
  const participants = []
  const inventories = []

  for (const [characterId, raw] of entries) {
    const ownerUid = resolveOwnerUid(raw, characterId)
    const { profile, participant, inventory } = mapOne(characterId, raw, campaignId, ownerUid)
    characters.push(cleanUndefined(profile))
    participants.push(cleanUndefined(participant))
    inventories.push(cleanUndefined(inventory))
  }

  fs.writeFileSync(outputCharactersPath, JSON.stringify(characters, null, 2) + '\n', 'utf8')
  fs.writeFileSync(outputParticipantsPath, JSON.stringify(participants, null, 2) + '\n', 'utf8')
  fs.writeFileSync(outputInventoriesPath, JSON.stringify(inventories, null, 2) + '\n', 'utf8')

  console.log(`Generated ${characters.length} characters -> ${outputCharactersPath}`)
  console.log(`Generated ${participants.length} participants -> ${outputParticipantsPath}`)
  console.log(`Generated ${inventories.length} inventories -> ${outputInventoriesPath}`)
}

main()
