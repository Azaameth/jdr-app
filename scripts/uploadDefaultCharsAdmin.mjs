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
  const membershipsPath = path.resolve(process.cwd(), 'scripts', 'data', 'memberships.json')

  const characters = readJsonOrFail(charactersPath)
  const memberships = readJsonOrFail(membershipsPath)

  console.log(
    `Seeding ${characters.length} characters and ${memberships.length} memberships to project ${sa.project_id}`,
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

  for (const membership of memberships) {
    const membershipId = `${membership.campaignId}_${membership.uid}`
    if (!dryRun) {
      await db.collection('memberships').doc(membershipId).set(membership, { merge: true })
    }
    console.log('membership ->', membershipId)
  }

  console.log(dryRun ? 'Dry run complete' : 'Seed complete')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err && err.message ? err.message : err)
  process.exit(1)
})
