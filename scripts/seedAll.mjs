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
import { getFirestore } from 'firebase-admin/firestore'

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

// campaigns-config.json still carries the legacy French status values;
// map them onto the target Campaign.Status contract (docs/rpg-data-model.md §4.2).
const CAMPAIGN_STATUS_MAP = {
  recrutement: 'Recruiting',
  active: 'Active',
  terminee: 'Closed',
}

function mapCampaignStatus(status) {
  return CAMPAIGN_STATUS_MAP[status] ?? 'Recruiting'
}

// Class `caps` entries are consistently "Name : Effect" in the fixtures —
// split reliably instead of guessing at a numeric Bonuses/StatConstraints
// mapping the source data doesn't actually specify (see NEXTSTEPS.md's
// migration ledger, Cluster 2: don't invent numbers the fixtures don't have).
function buildClassTraits(caps) {
  const traits = {}
  for (const [index, cap] of (caps ?? []).entries()) {
    const [name, ...rest] = String(cap).split(' : ')
    traits[`Cap${index + 1}`] = {
      Description: name?.trim() ?? '',
      Value: rest.join(' : ').trim(),
    }
  }
  return traits
}

// Matches the portrait convention already used by scripts/data/characters.json
// (e.g. "/images/portraits/azarius.jpg") and the actual files in
// public/images/portraits/, named exactly by characterId.
function toCharacterImagePath(characterId) {
  return `/images/portraits/${characterId}.jpg`
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isNaN(parsed) ? fallback : parsed
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

// classifyInventory.mjs still classifies into the legacy WeaponArmorItem
// vocabulary (damageDie/damageBonus/armorRating/statNote) — the target
// GearEntry schema (docs/rpg-data-model.md §4.9) has no mechanic for those at
// all (see the equipment-stats-dice mechanics note: gear only affects base
// stats via a flat, human-assigned BonusRaw, never an automated damage/armor
// roll). Preserve the legacy annotation as descriptive prose instead of
// silently dropping it — BonusRaw stays empty until a human assigns a real
// value.
function legacyGearAnnotation(item) {
  const parts = []
  if (item.damageDie) {
    const bonus =
      typeof item.damageBonus === 'number'
        ? `/${item.damageBonus >= 0 ? '+' : ''}${item.damageBonus}`
        : ''
    parts.push(`${item.damageDie}${bonus}`)
  }
  if (typeof item.armorRating === 'number') {
    parts.push(`RD${item.armorRating}`)
  }
  if (item.statNote) {
    parts.push(item.statNote)
  }
  return parts.join(' — ')
}

function toGearEntry(item) {
  const description = legacyGearAnnotation(item)
  return {
    EntryId: item.itemId,
    DisplayName: item.name,
    ...(description ? { Description: description } : {}),
  }
}

function toGender(value) {
  const n = normalize(value)
  if (n === 'homme') return 'Homme'
  if (n === 'femme') return 'Femme'
  return 'Autre'
}

export function resolveOwnerUid(raw, fallbackCharacterId) {
  const emailCandidates = [
    raw?.email,
    raw?.userEmail,
    raw?.user?.email,
    raw?.ownerEmail,
    raw?.playerEmail,
  ]

  const email = emailCandidates
    .map((value) => String(value ?? '').trim())
    .find((value) => value.length > 0)

  if (email) return email

  const legacyCandidate = String(
    raw?.ownerUid ?? raw?.uid ?? raw?.userId ?? raw?.playerId ?? '',
  ).trim()

  if (legacyCandidate && legacyCandidate !== fallbackCharacterId) {
    return legacyCandidate
  }

  return 'unknown-user'
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function buildCampaignRules() {
  return {
    Statistics: {
      Primary: [
        { Key: 'Force', Label: 'Force', Min: 0, Max: 100 },
        { Key: 'Social', Label: 'Social', Min: 0, Max: 100 },
        { Key: 'Mental', Label: 'Mental', Min: 0, Max: 100 },
      ],
      Secondary: [
        { Key: 'Puissance', Label: 'Puissance', LinkedPrimary: 'Force', Formula: 'Force * 0.1' },
        { Key: 'Finesse', Label: 'Finesse', LinkedPrimary: 'Force', Formula: 'Force * 0.1' },
        { Key: 'Aura', Label: 'Aura', LinkedPrimary: 'Social', Formula: 'Social * 0.1' },
        { Key: 'Relation', Label: 'Relation', LinkedPrimary: 'Social', Formula: 'Social * 0.1' },
        { Key: 'Instinct', Label: 'Instinct', LinkedPrimary: 'Mental', Formula: 'Mental * 0.1' },
        { Key: 'Savoir', Label: 'Savoir', LinkedPrimary: 'Mental', Formula: 'Mental * 0.1' },
      ],
    },
    Dice: {
      DiceNotation: 'd20',
      RoundingMode: 'RoundNearest',
      SuccessDirection: 'AboveOrEqual',
      CriticalThreshold: 1,
    },
    CharacterCreation: {
      HealthMaxFormula: '20 + Force * 2 + Class.Bonuses.Health',
      ManaMaxFormula: '10 + Mental * 3 + Class.Bonuses.Mana',
      PointBuyBudget: 20,
      FormulaRounding: 'RoundDown',
    },
    CurrencyName: 'Pièces',
    AdvantageDiceCount: 1,
    DisadvantageDiceCount: 0,
    MaxItems: 30,
    MaxArmorSlots: 4,
    MaxWeaponSlots: 2,
  }
}

function buildRosterEntry(characterId, displayName, ownerUid, state) {
  return {
    DisplayName: displayName,
    PlayerId: ownerUid,
    Health: Number(state?.Health ?? 0),
    HealthCurrent: Number(state?.HealthCurrent ?? state?.Health ?? 0),
    Mana: Number(state?.Mana ?? 0),
    ManaCurrent: Number(state?.ManaCurrent ?? state?.Mana ?? 0),
    PhysicalArmorCurrent: Number(state?.PhysicalArmorCurrent ?? state?.PhysicalArmor ?? 0),
    MagicalArmorCurrent: Number(state?.MagicalArmorCurrent ?? state?.MagicalArmor ?? 0),
    ActiveFormId: null,
    Status: 'Alive',
  }
}

async function writeDocIfNeeded(db, pathValue, payload) {
  await db.doc(pathValue).set(payload, { merge: true })
}

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
  // Legacy dev fixture: defaultChars.json carries no owner data at all, so
  // every character used to collapse onto one shared 'unknown-user' Player
  // doc (each write clobbering the last). participants.json still has real
  // distinct per-character uid + session values — use it to give each seeded
  // character its own owner and a believable starting posture/injuries (its
  // hp/mana/posture live on Characters/{id}/States/Current per
  // docs/rpg-data-model.md §4.8, NEXTSTEPS.md Cluster 3b — Players/{uid}
  // itself carries no characterId/session, per §4.6).
  const participantsData = readJson(path.join(base, 'participants.json'))
  const participantsByCharacterId = new Map(participantsData.map((p) => [p.characterId, p]))

  console.log(`Project: ${sa.project_id}  |  dry-run: ${dryRun}`)

  for (const campaignConfig of campaignsConfig) {
    const { slug, title, summary, lore, globalNote, status } = campaignConfig
    const campaignId = slugify(slug)

    console.log(`\n[1/7] Campaign "${slug}" -> ${campaignId}`)
    const campaignPayload = {
      DisplayName: title ?? slug,
      Description: summary ?? '',
      Lore: lore ?? '',
      GlobalNote: globalNote ?? '',
      Status: mapCampaignStatus(status),
      GmId: '',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    }
    if (!dryRun) await writeDocIfNeeded(db, `Campaigns/${campaignId}`, campaignPayload)

    const rulesPayload = buildCampaignRules()
    if (!dryRun) await writeDocIfNeeded(db, `Campaigns/${campaignId}/CampaignRules/Main`, rulesPayload)

    console.log(`[2/7] Races (${racesData.length})...`)
    for (const race of racesData) {
      const raceId = slugify(race.n)
      const payload = {
        DisplayName: race.n ?? raceId,
        Description: race.sub ?? '',
        PictureUrl: race.img ?? '',
        Bonuses: {},
        Traits: {},
        StatConstraints: {},
        Strengths: race.bon ?? [],
        Weaknesses: race.mal ?? [],
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
      }
      if (!dryRun) await writeDocIfNeeded(db, `Campaigns/${campaignId}/Races/${raceId}`, payload)
      console.log(`  race -> ${raceId}`)
    }

    console.log(`[3/7] Classes (${classesData.length})...`)
    for (const classEntry of classesData) {
      const classId = slugify(classEntry.n)
      const payload = {
        DisplayName: classEntry.n ?? classId,
        Description: classEntry.sub ?? '',
        PictureUrl: classEntry.img ?? '',
        Bonuses: {},
        Traits: buildClassTraits(classEntry.caps),
        StatConstraints: {},
        HealthNote: classEntry.pv ?? '',
        ManaNote: classEntry.mana ?? '',
        ArmorNote: classEntry.arm ?? '',
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
      }
      if (!dryRun) await writeDocIfNeeded(db, `Campaigns/${campaignId}/Classes/${classId}`, payload)
      console.log(`  class -> ${classId}`)
    }

    console.log(`[4/7] Notes ...`)
    const notesBase = { Entries: {}, UpdatedAt: new Date().toISOString() }
    if (!dryRun) {
      await writeDocIfNeeded(db, `Campaigns/${campaignId}/Notes/Gm`, notesBase)
      await writeDocIfNeeded(db, `Campaigns/${campaignId}/Notes/Shared`, notesBase)
      await writeDocIfNeeded(db, `Campaigns/${campaignId}/Notes/Collaborative`, notesBase)
    }

    const entries = Object.entries(defaultChars)
    console.log(`[5/7] Characters (${entries.length})...`)
    console.log(`[6/7] Players and state (${entries.length})...`)
    const rosterCharacters = {}

    for (const [characterId, raw] of entries) {
      const participantFixture = participantsByCharacterId.get(characterId)
      const ownerUid = participantFixture?.uid ?? resolveOwnerUid(raw, characterId)
      const classId = slugify(raw.classe)
      const raceId = slugify(raw.race)
      const now = new Date().toISOString()
      const primary = {
        Force: { Base: toInt(raw.phys, 0), Bonus: 0 },
        Social: { Base: toInt(raw.social, 0), Bonus: 0 },
        Mental: { Base: toInt(raw.mental, 0), Bonus: 0 },
      }
      const secondary = parseSecondaryAttributes(raw.competences)
      const charSheet = {
        ParentCharacterId: null,
        ActiveFormId: null,
        DisplayName: raw.name,
        Description: raw.notes || '',
        PictureUrl: toCharacterImagePath(characterId),
        Gender: toGender(raw.genre),
        Level: toInt(raw.niveau, 1),
        Status: 'Alive',
        ClassId: classId,
        RaceId: raceId,
        Statistics: primary,
        Secondaries: {
          Puissance: Number(secondary.puissance ?? 0),
          Finesse: Number(secondary.finesse ?? 0),
          Aura: Number(secondary.aura ?? 0),
          Relation: Number(secondary.relation ?? 0),
          Instinct: Number(secondary.instinct ?? 0),
          Savoir: Number(secondary.savoir ?? 0),
        },
        Actions: {},
        Skills: Object.fromEntries(
          parseSkills(raw.competences).map((skill) => [skill.id, { Description: skill.name, Value: skill.rank }]),
        ),
        AdvantageDiceCount: 0,
        DisadvantageDiceCount: 0,
        Elements: parseElements(raw.element),
        Languages: String(raw.langues || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        PlayerId: ownerUid,
        CampaignId: campaignId,
        CreatedAt: now,
        UpdatedAt: now,
      }

      const stateDoc = {
        Health: toInt(raw.pv_max, 0),
        HealthCurrent: toInt(raw.pv, 0),
        Mana: toInt(raw.mana_max, 0),
        ManaCurrent: toInt(raw.mana, 0),
        PhysicalArmor: 0,
        PhysicalArmorCurrent: 0,
        MagicalArmor: 0,
        MagicalArmorCurrent: 0,
        PhysicalAttack: 0,
        MagicalAttack: 0,
        PhysicalDefense: 0,
        MagicalDefense: 0,
        Posture: participantFixture?.session?.posture ?? 'DEFENSIF',
        Injuries: participantFixture?.session?.injuries ?? {},
        PlayerId: ownerUid,
        CampaignId: campaignId,
        UpdatedAt: now,
      }

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

      const playerDoc = {
        Status: 'Approved',
        Email: ownerUid,
        Notes: {},
        CreatedAt: now,
        UpdatedAt: now,
      }

      const equipmentDoc = {
        Armor: (inventory.armor ?? []).map(toGearEntry),
        Weapons: (inventory.weapons ?? []).map(toGearEntry),
        Currency: Number(inventory.gold ?? 0),
        PlayerId: ownerUid,
        CampaignId: campaignId,
        UpdatedAt: now,
      }

      if (!dryRun) {
        await writeDocIfNeeded(db, `Campaigns/${campaignId}/Players/${ownerUid}`, playerDoc)
        await writeDocIfNeeded(db, `Campaigns/${campaignId}/Characters/${characterId}`, charSheet)
        await writeDocIfNeeded(db, `Campaigns/${campaignId}/Characters/${characterId}/States/Current`, stateDoc)
        await writeDocIfNeeded(db, `Campaigns/${campaignId}/Characters/${characterId}/Equipment/Main`, equipmentDoc)

        for (const item of inventory.items ?? []) {
          const itemId = item.itemId || `item-${Date.now()}-${Math.random().toString(16).slice(2)}`
          await writeDocIfNeeded(db, `Campaigns/${campaignId}/Characters/${characterId}/Items/${itemId}`, {
            DisplayName: item.name,
            Quantity: Number(item.quantity ?? 1),
            PlayerId: ownerUid,
            CampaignId: campaignId,
            UpdatedAt: now,
          })
        }
      }

      rosterCharacters[characterId] = buildRosterEntry(characterId, raw.name, ownerUid, stateDoc)
      console.log(`  character -> ${characterId} (${ownerUid})`)
    }

    console.log(`[7/7] Roster/Summary ...`)
    if (!dryRun) {
      await writeDocIfNeeded(db, `Campaigns/${campaignId}/Roster/Summary`, {
        Characters: rosterCharacters,
        UpdatedAt: new Date().toISOString(),
      })
    }

    console.log(`\n✓ Campaign "${slug}" (${campaignId}) seeded in canonical nested structure.`)
  }

  console.log('\nAll done.')
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Seed failed:', err?.message ?? err)
    process.exit(1)
  })
}
