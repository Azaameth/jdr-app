/**
 * Recursively clears the canonical nested Firestore tree used by the RPG model.
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

async function deleteCollectionRecursively(collectionRef) {
  const snapshot = await collectionRef.get()
  if (snapshot.empty) return

  const batch = collectionRef.firestore.batch()
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref)
  }
  await batch.commit()

  for (const doc of snapshot.docs) {
    const subcollections = await doc.ref.listCollections()
    for (const sub of subcollections) {
      await deleteCollectionRecursively(sub)
    }
  }
}

async function clearTopLevelCollection(db, name) {
  const ref = db.collection(name)
  await deleteCollectionRecursively(ref)
  console.log(`  ${name}: deleted recursively`)
}

async function main() {
  const sa = loadServiceAccount()
  initializeApp({ credential: cert(sa) })
  const db = getFirestore()

  const collectionsToClear = ['Campaigns', 'Users', 'characters', 'participants', 'inventories', 'campaigns']

  console.log(`Clearing project: ${sa.project_id}`)
  for (const name of collectionsToClear) {
    await clearTopLevelCollection(db, name)
  }
  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Clear failed:', err?.message ?? err)
  process.exit(1)
})
