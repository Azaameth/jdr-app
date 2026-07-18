// Shared inventory classification: splits legacy flat `items` lists into the
// typed schema (categorized backpack items + weapons/armor) used by the app
// since the inventory-slots-dons mission.
//
// Single source of truth for scripts/migrateInventoryFixtures.mjs,
// scripts/seedAll.mjs and scripts/migrateLiveInventoriesAdmin.mjs. Plain Node,
// no Firebase dependency. Re-implements (rather than imports) the parsing
// rules from src/utils/inventoryText.ts, since these are standalone .mjs
// scripts; keep the two in sync if either changes.

export function normalizeMinus(text) {
  return text.replace(/−/g, '-')
}

const DAMAGE_DIE_PATTERN = /^(D4|D6|D8|D10|D12|D20)(?:\/([+-]?\d+))?$/

// Explicit name → category map for every real backpack item name in the
// fixtures (audited by hand against legacy-reference/index.html:3176-3186's
// category list). Unknown names default to 'butin' with a console warning —
// never guessed silently.
export const BACKPACK_CATEGORY_MAP = {
  Rations: 'nourriture',
  'Kit médical': 'soins',
  Bandages: 'soins',
  'Potion vie D6': 'potions',
  'Potion PV D10': 'potions',
  'Boussole magique': 'bivouac',
  'Corde 11m': 'bivouac',
  'Corde 10m': 'bivouac',
  Lanterne: 'bivouac',
  'Sac enchanté': 'speciaux',
  'Kit crochetage': 'speciaux',
  'Parchemin démon': 'docs',
  'Livre Orc': 'docs',
  'Livre de Magie': 'docs',
  Balles: 'munitions',
  'Rune Majeur Feu (50k PO)': 'butin',
}

// Name substrings that mark an item as armor even when it carries no
// parseable RD/damage stats (e.g. bare magic rings): "Anneau du Dieu du
// Vent" (dy), "Anneau de Mana" (mwassa), "Anneau du Dieu du Feu (vs proj.
// magiques)" (azarius, once its unstructured annotation falls through).
const ARMOR_NAME_HINTS = ['Anneau']

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// itemId slugs are stable even when a player renames an item in-app
// (e.g. "Boussole merdique" keeps itemId "inv-9-boussole-magique"), so the
// live migrator can still recover the category from the original name slug.
const CATEGORY_BY_NAME_SLUG = Object.fromEntries(
  Object.entries(BACKPACK_CATEGORY_MAP).map(([name, category]) => [slugify(name), category]),
)

export function categoryFromItemId(itemId) {
  const slug = String(itemId || '').replace(/^inv-\d+-/, '')
  return CATEGORY_BY_NAME_SLUG[slug]
}

function backpackItem(raw, name, quantity, { resolveCategory, warnTag } = {}) {
  const category = BACKPACK_CATEGORY_MAP[name] ?? resolveCategory?.(name, raw.itemId)
  if (!category) {
    console.warn(
      `[${warnTag ?? 'classifyInventory'}] Unknown backpack item "${name}" (itemId=${raw.itemId}) — defaulting to category "butin". Add an explicit BACKPACK_CATEGORY_MAP entry if this is wrong.`,
    )
  }
  return { itemId: raw.itemId, name, quantity, category: category ?? 'butin' }
}

export function classifyItem(raw, opts = {}) {
  const name = String(raw.name ?? '').trim()
  const quantity = typeof raw.quantity === 'number' ? raw.quantity : 1

  // Case A: the whole string is a parenthesized placeholder with no leading
  // name, e.g. "(Armure impossible — Oracle)" (mwassa) — keep it verbatim.
  const wholeParen = name.match(/^\(([^)]*)\)$/)
  if (wholeParen) {
    return { kind: 'armor', item: { itemId: raw.itemId, name } }
  }

  // Case B: "<name> (<annotation>)" — try structured damage/armor extraction.
  const annotated = name.match(/^(.+?)\s*\(([^)]*)\)\s*$/)
  if (annotated) {
    const baseName = annotated[1].trim()
    const annotation = normalizeMinus(annotated[2].trim())

    const damageMatch = annotation.match(DAMAGE_DIE_PATTERN)
    if (damageMatch) {
      const item = { itemId: raw.itemId, name: baseName, damageDie: damageMatch[1] }
      if (damageMatch[2] !== undefined) item.damageBonus = Number.parseInt(damageMatch[2], 10)
      return { kind: 'weapon', item }
    }

    const armorMatch = annotation.match(/^RD(\d+)(?:\s+(.*))?$/)
    if (armorMatch) {
      const item = { itemId: raw.itemId, name: baseName, armorRating: Number.parseInt(armorMatch[1], 10) }
      if (armorMatch[2]) item.statNote = armorMatch[2].trim()
      return { kind: 'armor', item }
    }

    if (ARMOR_NAME_HINTS.some((hint) => baseName.includes(hint))) {
      return { kind: 'armor', item: { itemId: raw.itemId, name: baseName, statNote: annotation } }
    }

    // The annotation carries non-gear info (a price tag, flavor text, …) —
    // keep it as a normal backpack item; the annotation stays in the name.
    return { kind: 'item', item: backpackItem(raw, name, quantity, opts) }
  }

  // Case C: bare "<name> RD<n>" suffix with no parens, e.g. "Anneau
  // anti-magie RD1" (nindey).
  const bareArmor = name.match(/^(.*\S)\s+RD(\d+)$/)
  if (bareArmor) {
    return {
      kind: 'armor',
      item: { itemId: raw.itemId, name: bareArmor[1], armorRating: Number.parseInt(bareArmor[2], 10) },
    }
  }

  // Case D: no annotation, no RD suffix — armor if it's a known gear-name
  // hint (a ring with no stats yet), else a plain backpack item.
  if (ARMOR_NAME_HINTS.some((hint) => name.includes(hint))) {
    return { kind: 'armor', item: { itemId: raw.itemId, name } }
  }

  return { kind: 'item', item: backpackItem(raw, name, quantity, opts) }
}

export function migrateInventoryDoc(doc, opts = {}) {
  const weapons = Array.isArray(doc.weapons) ? [...doc.weapons] : []
  const armor = Array.isArray(doc.armor) ? [...doc.armor] : []
  const items = []

  for (const raw of doc.items ?? []) {
    const { kind, item } = classifyItem(raw, opts)
    if (kind === 'weapon') weapons.push(item)
    else if (kind === 'armor') armor.push(item)
    else items.push(item)
  }

  return {
    uid: doc.uid,
    campaignId: doc.campaignId,
    characterId: doc.characterId,
    items,
    weapons,
    armor,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

/** True when a doc is already in the typed schema the app expects. */
export function isMigratedInventoryDoc(doc) {
  return (
    Array.isArray(doc.weapons) &&
    Array.isArray(doc.armor) &&
    (doc.items ?? []).every((item) => typeof item.category === 'string')
  )
}
