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

async function main() {
  const sa = loadServiceAccount()
  initializeApp({ credential: cert(sa) })
  const db = getFirestore()

  const dryRun = process.env.DRY_RUN === '1'

  const snapshot = await db.collection('participants').get()
  console.log(
    `Scanning ${snapshot.size} participants for personalNote in project ${sa.project_id}${dryRun ? ' (dry run)' : ''}`,
  )

  let migrated = 0

  for (const participantDoc of snapshot.docs) {
    const data = participantDoc.data()
    const personalNote = data.personalNote

    if (typeof personalNote !== 'string' || personalNote === '') {
      continue
    }

    migrated += 1

    if (dryRun) {
      console.log(
        `[dry run] would migrate participants/${participantDoc.id} -> participantNotes/${participantDoc.id}`,
      )
      continue
    }

    await db
      .collection('participantNotes')
      .doc(participantDoc.id)
      .set({ personalNote, updatedAt: new Date().toISOString() }, { merge: true })

    await participantDoc.ref.update({ personalNote: FieldValue.delete() })

    console.log(`migrated -> participantNotes/${participantDoc.id}`)
  }

  console.log(
    dryRun
      ? `Dry run complete: ${migrated} participant note(s) would be migrated`
      : `Backfill complete: ${migrated} participant note(s) migrated`,
  )
  process.exit(0)
}

main().catch((err) => {
  console.error('Backfill failed:', err && err.message ? err.message : err)
  process.exit(1)
})
