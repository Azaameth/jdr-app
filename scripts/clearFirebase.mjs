/**
 * Clears all documents in campaigns, characters, participants, inventories, races, classes collections.
 * Usage: node scripts/clearFirebase.mjs [serviceAccountPath]
 */

import fs from 'fs'
import path from 'path'
import { cert, initializeApp } from 'firebase-admin/app'
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

const COLLECTIONS = ['campaigns', 'characters', 'participants', 'inventories', 'races', 'classes']

async function clearCollection(db, name) {
  const snapshot = await db.collection(name).get()
  if (snapshot.empty) {
    console.log(`  ${name}: already empty`)
    return
  }
  const batch = db.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
  console.log(`  ${name}: deleted ${snapshot.size} docs`)
}

async function main() {
  const sa = loadServiceAccount()
  initializeApp({ credential: cert(sa) })
  const db = getFirestore()

  console.log(`Clearing project: ${sa.project_id}`)
  for (const col of COLLECTIONS) {
    await clearCollection(db, col)
  }
  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Clear failed:', err?.message ?? err)
  process.exit(1)
})
