import fs from 'fs'
import path from 'path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

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

  const base = path.resolve(process.cwd(), 'scripts', 'data')
  const races = JSON.parse(fs.readFileSync(path.join(base, 'races.json'), 'utf8'))
  const classes = JSON.parse(fs.readFileSync(path.join(base, 'classes.json'), 'utf8'))
  const factions = JSON.parse(fs.readFileSync(path.join(base, 'factions.json'), 'utf8'))
  const cosmology = JSON.parse(fs.readFileSync(path.join(base, 'cosmology.json'), 'utf8'))

  console.log(
    `Uploading ${races.length} races, ${classes.length} classes, ${factions.length} factions and ${cosmology.length} cosmology tiers to project ${sa.project_id}`,
  )

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
      .set({ ...r, img: imgPath, campaignTags: ['alesia'] })
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
      .set({ ...c, img: imgPath, campaignTags: ['alesia'] })
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

  for (const c of cosmology) {
    await db.collection('cosmology').doc(c.id).set(c)
    console.log('cosmology ->', c.id)
  }

  console.log('Upload complete')
  process.exit(0)
}

main().catch((err) => {
  console.error('Upload failed:', err && err.message ? err.message : err)
  process.exit(1)
})
