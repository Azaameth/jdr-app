/**
 * One-shot migrator for LIVE Firestore `inventories` docs still in the legacy
 * flat shape (mixed `items` list, no category, no weapons/armor split).
 *
 * Unlike scripts/migrateInventoryFixtures.mjs (which rewrites the JSON
 * fixtures), this transforms the production docs IN PLACE, preserving in-game
 * edits (renamed items, quantity changes): names and quantities are kept
 * as-is, only the shape changes. Renamed backpack items are re-categorized
 * via their stable itemId slug (e.g. "inv-9-boussole-magique" still maps to
 * bivouac even after the item was renamed in-app).
 *
 * Dry-run by default — prints the planned transformation per doc.
 *   node scripts/migrateLiveInventoriesAdmin.mjs            # preview only
 *   node scripts/migrateLiveInventoriesAdmin.mjs --apply    # write
 *
 * Before writing, --apply saves a full JSON backup of the current docs to
 * scripts/backups/inventories-<timestamp>.json (gitignored).
 * Already-migrated docs (weapons/armor arrays present, every item
 * categorized) are skipped, so re-running is safe.
 */

import fs from 'fs'
import path from 'path'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import {
  categoryFromItemId,
  isMigratedInventoryDoc,
  migrateInventoryDoc,
} from './lib/classifyInventory.mjs'

function loadServiceAccount() {
  const defaultPath = path.resolve(process.cwd(), 'scripts', 'keys', 'serviceAccountKey.json')
  const p = process.env.SERVICE_ACCOUNT || defaultPath
  if (!fs.existsSync(p)) {
    console.error('Service account file not found:', p)
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

const apply = process.argv.includes('--apply')

async function main() {
  const sa = loadServiceAccount()
  initializeApp({ credential: cert(sa) })
  const db = getFirestore()

  console.log(`Project: ${sa.project_id}  |  mode: ${apply ? 'APPLY' : 'dry-run'}`)

  const snap = await db.collection('inventories').get()
  console.log(`inventories docs: ${snap.size}\n`)

  const backup = []
  const planned = []

  for (const doc of snap.docs) {
    const data = doc.data()
    if (isMigratedInventoryDoc(data)) {
      console.log(`= ${doc.id}: already migrated — skipped`)
      continue
    }

    backup.push({ id: doc.id, data })
    const migrated = migrateInventoryDoc(data, {
      warnTag: 'migrateLiveInventories',
      resolveCategory: (_name, itemId) => categoryFromItemId(itemId),
    })

    console.log(`~ ${doc.id}:`)
    for (const w of migrated.weapons) {
      console.log(
        `    weapon: ${w.name}${w.damageDie ? ` [${w.damageDie}${w.damageBonus ? `/${w.damageBonus}` : ''}]` : ''}`,
      )
    }
    for (const a of migrated.armor) {
      console.log(
        `    armor : ${a.name}${a.armorRating !== undefined ? ` [RD${a.armorRating}]` : ''}${a.statNote ? ` (${a.statNote})` : ''}`,
      )
    }
    for (const i of migrated.items) {
      console.log(`    item  : ${i.name} ×${i.quantity} → ${i.category}`)
    }

    planned.push({
      ref: doc.ref,
      update: {
        items: migrated.items,
        weapons: migrated.weapons,
        armor: migrated.armor,
        updatedAt: new Date().toISOString(),
      },
    })
  }

  if (!planned.length) {
    console.log('\nNothing to migrate.')
    return
  }

  if (!apply) {
    console.log(`\nDry-run: ${planned.length} doc(s) would be updated. Re-run with --apply.`)
    return
  }

  const backupDir = path.resolve(process.cwd(), 'scripts', 'backups')
  fs.mkdirSync(backupDir, { recursive: true })
  const backupPath = path.join(
    backupDir,
    `inventories-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2) + '\n', 'utf8')
  console.log(`\nBackup written: ${backupPath}`)

  for (const { ref, update } of planned) {
    await ref.update(update)
    console.log(`✓ updated ${ref.id}`)
  }
  console.log(`\nMigrated ${planned.length} doc(s).`)
}

main().catch((err) => {
  console.error('Migration failed:', err?.message ?? err)
  process.exit(1)
})
