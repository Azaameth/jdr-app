/**
 * Reverse of seed:static:admin / seed:defaultchars:admin: reads the CURRENT
 * live Firestore data and overwrites the local scripts/data/*.json fixtures
 * with it, so manual edits made through the app (equipment, HP/mana, race
 * bonuses, etc.) don't get silently wiped out the next time someone reseeds.
 *
 * Reverses the known write-time transforms so round-tripping (pull, then
 * seed:static/seed:defaultchars again) reproduces the same live docs:
 *  - races/classes: strips the campaignTags array injected by seedAll.mjs,
 *    un-prefixes img ("/images/x.jpg" -> "x.jpg", matching the local shape
 *    uploadStaticDataAdmin.mjs expects).
 *  - characters: drops raceBonusNotes (uploadDefaultCharsAdmin.mjs always
 *    FieldValue.deletes it on write, so it should never appear locally).
 *  - factions/cosmology/participants/inventories: written back verbatim,
 *    no transform is applied on upload for these.
 *
 * Usage:
 *   node scripts/pullLiveDataAdmin.mjs [serviceAccountPath]
 *   SERVICE_ACCOUNT=path/to/key.json node scripts/pullLiveDataAdmin.mjs
 */

import fs from 'fs'
import path from 'path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function loadServiceAccount() {
  const defaultPath = path.resolve(process.cwd(), 'scripts', 'keys', 'serviceAccountKey.json')
  const p = process.env.SERVICE_ACCOUNT || process.argv[2] || defaultPath
  if (!fs.existsSync(p)) {
    console.error('Service account file not found:', p)
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

// The only real campaign seeded so far (slug "alesia"). Characters,
// participants and inventories are scoped to it so we don't accidentally
// pull in stray test docs from other campaigns.
const CAMPAIGN_ID = '8mEHIVueGKuwUr9DuBH3'

function writeJson(base, filename, data) {
  fs.writeFileSync(path.join(base, filename), JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`${filename} <- ${data.length} docs`)
}

function unprefixImg(img) {
  if (!img || /^https?:/.test(img)) return img ?? null
  return img.replace(/^\/images\//, '')
}

// Firestore's `.get()` order is arbitrary (doc-id order) and has nothing to
// do with the order the local fixture happens to be in. Re-sorting to match
// the CURRENT on-disk order (new items appended, alphabetically among
// themselves) keeps the diff limited to genuine content changes instead of
// noise from every array being reshuffled.
function sortLikeExisting(base, filename, items, keyFn) {
  const existingPath = path.join(base, filename)
  const order = fs.existsSync(existingPath)
    ? JSON.parse(fs.readFileSync(existingPath, 'utf8')).map(keyFn)
    : []
  return [...items].sort((a, b) => {
    const ia = order.indexOf(keyFn(a))
    const ib = order.indexOf(keyFn(b))
    const ra = ia === -1 ? Infinity : ia
    const rb = ib === -1 ? Infinity : ib
    if (ra !== rb) return ra - rb
    return String(keyFn(a)).localeCompare(String(keyFn(b)))
  })
}

async function main() {
  const sa = loadServiceAccount()
  initializeApp({ credential: cert(sa) })
  const db = getFirestore()
  const base = path.resolve(process.cwd(), 'scripts', 'data')

  console.log(`Pulling live data from project ${sa.project_id}...\n`)

  // Races / Classes — strip campaignTags, un-prefix img.
  for (const [collection, filename] of [
    ['races', 'races.json'],
    ['classes', 'classes.json'],
  ]) {
    const snap = await db.collection(collection).get()
    const items = snap.docs.map((doc) => {
      const { campaignTags: _campaignTags, ...rest } = doc.data()
      return { ...rest, img: unprefixImg(rest.img) }
    })
    writeJson(base, filename, sortLikeExisting(base, filename, items, (item) => item.n))
  }

  // Factions / Cosmology — written back as-is.
  for (const [collection, filename, keyFn] of [
    ['factions', 'factions.json', (item) => item.title],
    ['cosmology', 'cosmology.json', (item) => item.id],
  ]) {
    const snap = await db.collection(collection).get()
    const items = snap.docs.map((doc) => doc.data())
    writeJson(base, filename, sortLikeExisting(base, filename, items, keyFn))
  }

  // Characters — campaign-scoped, drop raceBonusNotes.
  const charsSnap = await db
    .collection('characters')
    .where('campaignId', '==', CAMPAIGN_ID)
    .get()
  const characters = charsSnap.docs.map((doc) => {
    const { raceBonusNotes: _raceBonusNotes, ...rest } = doc.data()
    return rest
  })
  writeJson(base, 'characters.json', sortLikeExisting(base, 'characters.json', characters, (c) => c.id))

  // Participants — campaign-scoped.
  const partsSnap = await db
    .collection('participants')
    .where('campaignId', '==', CAMPAIGN_ID)
    .get()
  const participants = partsSnap.docs.map((doc) => doc.data())
  writeJson(
    base,
    'participants.json',
    sortLikeExisting(base, 'participants.json', participants, (p) => p.characterId),
  )

  // Inventories — campaign-scoped.
  const invSnap = await db
    .collection('inventories')
    .where('campaignId', '==', CAMPAIGN_ID)
    .get()
  const inventories = invSnap.docs.map((doc) => doc.data())
  writeJson(
    base,
    'inventories.json',
    sortLikeExisting(base, 'inventories.json', inventories, (i) => i.characterId),
  )

  console.log('\nDone.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Pull failed:', err?.message ?? err)
  process.exit(1)
})
