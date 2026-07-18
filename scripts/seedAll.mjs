/**
 * Cascade seed script.
 * Order: campaign → races → classes → characters → participants → inventories
 *
 * Usage:
 *   node scripts/seedAll.mjs [serviceAccountPath]
 *   SERVICE_ACCOUNT=path/to/key.json node scripts/seedAll.mjs
 *   DRY_RUN=1 node scripts/seedAll.mjs
 */

import fs from 'fs'
import path from 'path'
import { cert, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

import { migrateInventoryDoc } from './lib/classifyInventory.mjs'

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

function loadServiceAccount() {
  const defaultPath = path.resolve(process.cwd(), 'scripts', 'keys', 'serviceAccountKey.json')
  const p = process.env.SERVICE_ACCOUNT || process.argv[2] || defaultPath
  if (!fs.existsSync(p)) {
    console.error('Service account file not found:', p)
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('Missing file:', filePath)
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

// ---------------------------------------------------------------------------
// Character mapping helpers (inlined from generateCharacterData.mjs)
// ---------------------------------------------------------------------------

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
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseElements(value) {
  if (!value) return []
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseQuantity(entry) {
  const compact = String(entry || '')
    .replace(/\s+/g, ' ')
    .trim()
  const match = compact.match(/(?:x|×)\s*(\d+)$/i)
  return match
    ? {
        name: compact.replace(/\s*(?:x|×)\s*\d+$/i, '').trim(),
        quantity: Number.parseInt(match[1], 10) || 1,
      }
    : { name: compact, quantity: 1 }
}

function parseSecondaryAttributes(competences) {
  const secondary = { puissance: 0, finesse: 0, aura: 0, relation: 0, instinct: 0, savoir: 0 }
  for (const c of competences || []) {
    const base = normalize(c?.n)
      .replace(/\s*\(.*\)\s*/g, '')
      .trim()
    if (base in secondary) secondary[base] = c.v
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
  )
    return 'force'
  if (
    n.includes('aura') ||
    n.includes('relation') ||
    n.includes('persuasion') ||
    n.includes('charme') ||
    n.includes('social')
  )
    return 'social'
  if (n.includes('instinct') || n.includes('savoir') || n.includes('erudit')) return 'mental'
  return 'general'
}

function parseSkills(competences) {
  const secondaryKeys = ['puissance', 'finesse', 'aura', 'relation', 'instinct', 'savoir']
  return (competences || [])
    .filter(
      (item) =>
        !secondaryKeys.includes(
          normalize(item?.n)
            .replace(/\s*\(.*\)\s*/g, '')
            .trim(),
        ),
    )
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
    if (manaMatch) item.manaCost = Number.parseInt(manaMatch[1], 10)
    return item
  })
}

function parseSessionInventory(raw) {
  const lines = [
    ...splitLines(raw.armes),
    ...splitLines(raw.armures),
    ...String(raw.equip || '')
      .split(',')
      .map((s) => s.trim())
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

function cleanUndefined(value) {
  if (Array.isArray(value)) return value.map(cleanUndefined)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = cleanUndefined(v)
    }
    return out
  }
  return value
}

function mapCharacter(characterId, raw, campaignId, ownerUid = characterId) {
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
      .map((s) => s.trim())
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

  // parseSessionInventory yields the legacy flat list; split it into the
  // typed schema (categorized items + weapons/armor) the app reads.
  const inventory = migrateInventoryDoc(
    {
      uid: ownerUid,
      campaignId,
      characterId,
      items: parseSessionInventory(raw),
      createdAt: now,
      updatedAt: now,
    },
    { warnTag: 'seedAll' },
  )

  return {
    profile: cleanUndefined(profile),
    participant: cleanUndefined(participant),
    inventory: cleanUndefined(inventory),
  }
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

function toDocId(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '')
}

function toImagePath(img) {
  if (!img || /^https?:/.test(img)) return img || null
  return `/images/${img}`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const sa = loadServiceAccount()
  initializeApp({ credential: cert(sa) })
  const db = getFirestore()
  const dryRun = process.env.DRY_RUN === '1'

  const base = path.resolve(process.cwd(), 'scripts', 'data')
  const campaignsConfig = readJson(path.join(base, 'campaigns-config.json'))
  const racesData = readJson(path.join(base, 'races.json'))
  const classesData = readJson(path.join(base, 'classes.json'))
  const defaultChars = readJson(path.join(base, 'defaultChars.json'))

  console.log(`Project: ${sa.project_id}  |  dry-run: ${dryRun}`)

  for (const campaignConfig of campaignsConfig) {
    const { slug, title, summary, lore, globalNote, status } = campaignConfig

    // ------------------------------------------------------------------
    // Step 1 — Campaign: find by slug or create
    // ------------------------------------------------------------------
    console.log(`\n[1/5] Campaign "${slug}"...`)
    let campaignId

    const existing = await db.collection('campaigns').where('slug', '==', slug).limit(1).get()
    if (!existing.empty) {
      campaignId = existing.docs[0].id
      console.log(`  found  -> ${campaignId}`)
      if (!dryRun) {
        await db
          .collection('campaigns')
          .doc(campaignId)
          .update({ title, summary, lore, globalNote, status })
      }
    } else {
      if (!dryRun) {
        const ref = db.collection('campaigns').doc()
        campaignId = ref.id
        await ref.set({
          slug,
          title,
          summary: summary ?? '',
          lore: lore ?? '',
          globalNote: globalNote ?? '',
          gmId: '',
          status: status ?? 'recrutement',
          createdAt: new Date(),
        })
      } else {
        campaignId = `dry-run-${slug}`
      }
      console.log(`  created -> ${campaignId}`)
    }

    // ------------------------------------------------------------------
    // Step 2 — Races
    // ------------------------------------------------------------------
    console.log(`[2/5] Races (${racesData.length})...`)
    for (const r of racesData) {
      const id = toDocId(r.n)
      const payload = {
        ...r,
        img: toImagePath(r.img),
        campaignTags: FieldValue.arrayUnion(campaignId, slug),
      }
      if (!dryRun) await db.collection('races').doc(id).set(payload, { merge: true })
      console.log(`  race -> ${id}`)
    }

    // ------------------------------------------------------------------
    // Step 3 — Classes
    // ------------------------------------------------------------------
    console.log(`[3/5] Classes (${classesData.length})...`)
    for (const c of classesData) {
      const id = toDocId(c.n)
      const payload = {
        ...c,
        img: toImagePath(c.img),
        campaignTags: FieldValue.arrayUnion(campaignId, slug),
      }
      if (!dryRun) await db.collection('classes').doc(id).set(payload, { merge: true })
      console.log(`  class -> ${id}`)
    }

    // ------------------------------------------------------------------
    // Step 4, 5 & 6 — Characters + Participants + Inventories
    // ------------------------------------------------------------------
    const entries = Object.entries(defaultChars)
    console.log(`[4/6] Characters (${entries.length})...`)
    console.log(`[5/6] Participants (${entries.length})...`)
    console.log(`[6/6] Inventories (${entries.length})...`)

    for (const [characterId, raw] of entries) {
      const ownerUid = resolveOwnerUid(raw, characterId)
      const { profile, participant, inventory } = mapCharacter(
        characterId,
        raw,
        campaignId,
        ownerUid,
      )
      if (!dryRun) {
        await db
          .collection('characters')
          .doc(profile.id)
          .set({ ...profile, raceBonusNotes: FieldValue.delete() }, { merge: true })
        const participantId = `${participant.campaignId}_${participant.uid}`
        const inventoryId = `${inventory.campaignId}_${inventory.characterId}`
        await db.collection('participants').doc(participantId).set(participant, { merge: true })
        await db.collection('inventories').doc(inventoryId).set(inventory, { merge: true })
      }
      console.log(
        `  character -> ${profile.id}  |  participant -> ${participant.campaignId}_${participant.uid}  |  inventory -> ${inventory.campaignId}_${inventory.characterId}`,
      )
    }

    console.log(`\n✓ Campaign "${slug}" (${campaignId}) seeded.`)
  }

  console.log('\nAll done.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err?.message ?? err)
  process.exit(1)
})
