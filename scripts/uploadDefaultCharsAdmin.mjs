import fs from 'fs'
import path from 'path'
import { initializeApp, cert } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

function loadServiceAccount() {
  const defaultPath = path.resolve(process.cwd(), 'scripts', 'keys', 'serviceAccountKey.json')
  const p = process.env.SERVICE_ACCOUNT || process.argv[2] || defaultPath

  if (!p) {
    console.error('Provide service account path via SERVICE_ACCOUNT env or arg')
    process.exit(1)
  }

  if (!fs.existsSync(p)) {
    console.error('Service account file not found:', p)
    process.exit(1)
  }

  const raw = fs.readFileSync(p, 'utf8')
  return JSON.parse(raw)
}

function readJsonOrFail(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing data file: ${filePath}`)
    console.error('Run `npm run data:characters` first to generate seed data.')
    process.exit(1)
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

async function main() {
  const sa = loadServiceAccount()
  initializeApp({ credential: cert(sa) })
  const db = getFirestore()

  const dryRun = process.env.DRY_RUN === '1'
  const charactersPath = path.resolve(process.cwd(), 'scripts', 'data', 'characters.json')
  const participantsPath = path.resolve(process.cwd(), 'scripts', 'data', 'participants.json')
  const inventoriesPath = path.resolve(process.cwd(), 'scripts', 'data', 'inventories.json')

  const characters = readJsonOrFail(charactersPath)
  const participants = readJsonOrFail(participantsPath)
  const inventories = readJsonOrFail(inventoriesPath)

  console.log(
    `Seeding ${characters.length} characters, ${participants.length} participants and ${inventories.length} inventories to project ${sa.project_id}`,
  )

  for (const profile of characters) {
    if (!dryRun) {
      await db
        .collection('characters')
        .doc(profile.id)
        .set({ ...profile, raceBonusNotes: FieldValue.delete() }, { merge: true })
    }
    console.log('character ->', profile.id)
  }

  for (const participant of participants) {
    const participantId = `${participant.campaignId}_${participant.uid}`
    if (!dryRun) {
      await db.collection('participants').doc(participantId).set(participant, { merge: true })
    }
    console.log('participant ->', participantId)
  }

  for (const inventory of inventories) {
    const inventoryId = `${inventory.campaignId}_${inventory.characterId}`
    if (!dryRun) {
      await db.collection('inventories').doc(inventoryId).set(inventory, { merge: true })
    }
    console.log('inventory ->', inventoryId)
  }

  console.log(dryRun ? 'Dry run complete' : 'Seed complete')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err && err.message ? err.message : err)
  process.exit(1)
})
