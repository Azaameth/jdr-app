import fs from 'fs'
import path from 'path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const DEFAULT_CAMPAIGN_ID = '8mEHIVueGKuwUr9DuBH3'

async function clearCollection(db, collectionName) {
  const docs = await db.collection(collectionName).listDocuments()
  if (docs.length === 0) {
    return
  }

  const batch = db.batch()
  for (const ref of docs) {
    batch.delete(ref)
  }
  await batch.commit()
}

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
  const campaignId = process.env.STATIC_DATA_CAMPAIGN_ID || DEFAULT_CAMPAIGN_ID

  const base = path.resolve(process.cwd(), 'scripts', 'data')
  const races = JSON.parse(fs.readFileSync(path.join(base, 'races.json'), 'utf8'))
  const classes = JSON.parse(fs.readFileSync(path.join(base, 'classes.json'), 'utf8'))
  const factions = JSON.parse(fs.readFileSync(path.join(base, 'factions.json'), 'utf8'))

  console.log(
    `Uploading ${races.length} races, ${classes.length} classes and ${factions.length} factions to project ${sa.project_id}`,
  )

  console.log('Clearing existing races/classes...')
  await clearCollection(db, 'races')
  await clearCollection(db, 'classes')

  for (const r of races) {
    const id = (r.n || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9]+/g, '_')
    const imgPath = r.img && !/^https?:/.test(r.img) ? `/images/${r.img}` : r.img || null
    await db
      .collection('races')
      .doc(id)
      .set({ ...r, img: imgPath, campaignId })
    console.log('races ->', id)
  }

  for (const c of classes) {
    const id = (c.n || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9]+/g, '_')
    const imgPath = c.img && !/^https?:/.test(c.img) ? `/images/${c.img}` : c.img || null
    await db
      .collection('classes')
      .doc(id)
      .set({ ...c, img: imgPath, campaignId })
    console.log('classes ->', id)
  }

  for (const f of factions) {
    const id = (f.title || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9]+/g, '_')
    await db.collection('factions').doc(id).set(f)
    console.log('factions ->', id)
  }

  console.log('Upload complete')
  process.exit(0)
}

main().catch((err) => {
  console.error('Upload failed:', err && err.message ? err.message : err)
  process.exit(1)
})
