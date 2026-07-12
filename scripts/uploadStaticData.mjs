import fs from 'fs'
import path from 'path'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

function resolveEnv() {
  const env = process.env
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || env.FIREBASE_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID,
  }
}

async function main() {
  const cfg = resolveEnv()
  if (!cfg.apiKey || !cfg.projectId) {
    console.error('Missing Firebase config in env. Set VITE_FIREBASE_* or FIREBASE_* variables.')
    process.exit(1)
  }

  const app = initializeApp({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain || '',
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket || '',
    messagingSenderId: cfg.messagingSenderId || '',
    appId: cfg.appId || '',
  })

  const db = getFirestore(app)

  const base = path.resolve(process.cwd(), 'scripts', 'data')
  const races = JSON.parse(fs.readFileSync(path.join(base, 'races.json'), 'utf-8'))
  const classes = JSON.parse(fs.readFileSync(path.join(base, 'classes.json'), 'utf-8'))

  console.log(
    `Uploading ${races.length} races and ${classes.length} classes to project ${cfg.projectId}`,
  )

  for (const r of races) {
    const id = (r.n || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9]+/g, '_')
    const imgPath = r.img && !/^https?:/.test(r.img) ? `/images/${r.img}` : r.img || null
    const ref = doc(db, 'races', id)
    await setDoc(ref, { ...r, img: imgPath, campaignTags: ['alesia'] })
    console.log('races ->', id)
  }

  for (const c of classes) {
    const id = (c.n || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9]+/g, '_')
    const imgPath = c.img && !/^https?:/.test(c.img) ? `/images/${c.img}` : c.img || null
    const ref = doc(db, 'classes', id)
    await setDoc(ref, { ...c, img: imgPath, campaignTags: ['alesia'] })
    console.log('classes ->', id)
  }

  console.log('Upload complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
