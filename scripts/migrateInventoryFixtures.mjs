// One-shot, idempotent migrator for the typed inventory/dons schema (WP01, T006).
//
// Plain Node, no Firebase dependency — pure JSON in/out. Re-implements (rather
// than imports) the parsing rules from src/utils/inventoryText.ts, since this
// is a standalone .mjs script; keep the two in sync if either changes.
//
//   node scripts/migrateInventoryFixtures.mjs
//
// Safe to re-run: every output field is rebuilt fresh from stable inputs
// (itemId / character id / don name), so a second run produces byte-identical
// JSON (verified by `git diff --exit-code scripts/data/` in CI/T007).

import fs from 'fs'
import path from 'path'

const INVENTORIES_PATH = path.resolve(process.cwd(), 'scripts', 'data', 'inventories.json')
const CHARACTERS_PATH = path.resolve(process.cwd(), 'scripts', 'data', 'characters.json')

// ---------------------------------------------------------------------------
// Shared text helpers (mirror src/utils/inventoryText.ts)
// ---------------------------------------------------------------------------

function normalizeMinus(text) {
  return text.replace(/−/g, '-')
}

const DAMAGE_DIE_PATTERN = /^(D4|D6|D8|D10|D12|D20)(?:\/([+-]?\d+))?$/

// ---------------------------------------------------------------------------
// Inventories: split `items` into categorized backpack items + weapons/armor
// ---------------------------------------------------------------------------

// Explicit name → category map for every real backpack item name in the
// fixtures (audited by hand against legacy-reference/index.html:3176-3186's
// category list). Unknown names default to 'butin' with a console warning —
// never guessed silently.
const BACKPACK_CATEGORY_MAP = {
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

function backpackItem(raw, name, quantity) {
  const category = BACKPACK_CATEGORY_MAP[name]
  if (!category) {
    console.warn(
      `[migrateInventoryFixtures] Unknown backpack item "${name}" (itemId=${raw.itemId}) — defaulting to category "butin". Add an explicit BACKPACK_CATEGORY_MAP entry if this is wrong.`,
    )
  }
  return { itemId: raw.itemId, name, quantity, category: category ?? 'butin' }
}

function classifyItem(raw) {
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
    return { kind: 'item', item: backpackItem(raw, name, quantity) }
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

  return { kind: 'item', item: backpackItem(raw, name, quantity) }
}

function migrateInventoryDoc(doc) {
  const weapons = Array.isArray(doc.weapons) ? [...doc.weapons] : []
  const armor = Array.isArray(doc.armor) ? [...doc.armor] : []
  const items = []

  for (const raw of doc.items ?? []) {
    const { kind, item } = classifyItem(raw)
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

// ---------------------------------------------------------------------------
// Gifts: split legacy "name — mana / dice" strings, merge legacy DONS_DATA
// ---------------------------------------------------------------------------

// Transcribed verbatim from legacy-reference/index.html:3305-3348. Mana is
// string-vs-number by design (numeric cost vs. freeform formula); des is the
// dice expression or '—' for none; bonus is a flat signed damage bonus (may
// be nonzero even for a passive with des:'—', e.g. Baroud d'Honneur).
const DONS_DATA = {
  azarius: {
    'Turbo Fist': {
      mana: 2,
      des: '1D10',
      bonus: 2,
      desc: "Le bras mécanique se verrouille dans un claquement sec.\nUn grondement sourd monte depuis l'intérieur du coude.\nLes plaques d'acier vibrent. Les pistons s'alignent. Puis le réacteur s'allume.\nUne lumière brûlante traverse les conduits du bras. La pression monte brutalement. L'air autour du poing se déforme sous la chaleur.\nLe porteur pivote l'épaule.\nBOUM.",
    },
    'Armagédon sans Bâton': {
      mana: 5,
      des: '1D12',
      bonus: 4,
      desc: "Le bras mécanique se déploie.\nLes plaques du bras coulissent avec un grincement métallique.\nLe poing se désassemble légèrement, révélant une chambre interne incandescente.\nLe réacteur du coude change de tonalité plus grave… plus instable.\nUne pression monte. Les soupapes vibrent.\nUn torrent de flammes jaillit du bras mécanique comme la gueule d'un dragon forgé en acier.",
    },
    'Fire Shield': {
      mana: 3,
      des: '1D6',
      bonus: 1,
      desc: "Un grondement sourd vibre dans le coude mécanique.\nLe réacteur s'embrase à bas régime.\nDes anneaux internes tournent autour de l'avant-bras, créant un champ thermique instable.\nUn cercle de flammes explose vers l'extérieur, formant un bouclier ardent devant le bras.\nLes flammes ne sont pas chaotiques.\nElles tournent en spirale, maintenues par un champ de pression généré par le réacteur.",
    },
    'Say My Name': {
      mana: 8,
      des: '1D6+1D8',
      bonus: 1,
      desc: "Le poing se verrouille.\nLes plaques d'acier glissent, révélant un noyau interne incandescent.\nLe réacteur du coude hurle pas en puissance continue…\nMais en compression extrême. Toute l'énergie est retenue.\nAccumulation maximale. Distance minimale.",
    },
    'Maîtrise des Armes': {
      mana: 0,
      des: '—',
      bonus: 0,
      desc: 'Capacité passive.\nRelance 1 fois par combat un jet raté en combat au corps à corps.',
    },
    "Baroud d'Honneur": {
      mana: 0,
      des: '—',
      bonus: 2,
      desc: 'Capacité passive.\nSi les PV tombent sous 30%, les attaques infligent +2 dégâts bonus automatiquement.',
    },
  },
  dy: {
    "Déplacement d'Air": {
      mana: 'X',
      des: '—',
      bonus: 0,
      desc: "Dy concentre ses pouvoirs sur les courants environnants, créant un couloir d'air tourbillonnant capable de déplacer les cibles sur une distance définie.\n\nCoût en Mana : X par personne touchée\nDistance : X / 3 mètres\n\nPrécision ciblée :\nDy peut viser précisément une ou plusieurs personnes. Elle subit un malus de –20 sur son jet par personne ciblée.\n\nJet de sauvegarde :\nDy peut relancer un seul jet, une seule fois, pour augmenter ses chances de succès.",
    },
    "Mur d'Air": {
      mana: 6,
      des: '—',
      bonus: 0,
      desc: "Dy concentre ses pouvoirs pour ériger un mur invisible mais tangible de vent tourbillonnant.\n\nEffet : Le mur impose un malus de –30 sur les jets de traversée ou d'attaque.\nSi Dy maintient le mur actif, elle ne peut effectuer aucune autre action pendant ce tour.\nCoût : X par tranche de –20 de malus.",
    },
    "Lame d'Air": {
      mana: 3,
      des: '1D8',
      bonus: 2,
      desc: "Dy concentre le flux du vent en une lame tranchante et invisible, capable de fendre l'air avec la précision d'une épée. La lame frappe les ennemis comme une lame physique, infligeant des dégâts de coupure proportionnels à son intensité et à sa maîtrise.",
    },
    'Largage Aérien': {
      mana: '2+(1/5m)',
      des: '—',
      bonus: 0,
      desc: 'Dy utilise la magie du vent pour téléporter sur une courte distance (15m) elle-même ou un autre joueur (une seule personne à la fois).',
    },
    'Invocations démoniques': {
      mana: '?',
      des: '—',
      bonus: 0,
      desc: "Dy peut invoquer des entités démoniques pour l'assister au combat ou en dehors.",
    },
    'La Boule Magique': {
      mana: 'Tout',
      des: '—',
      bonus: 0,
      desc: 'Sort ultime. Dy dépense tout son mana restant pour déclencher une explosion magique massive.',
    },
    'Maîtrise des Arcanes': {
      mana: 0,
      des: '—',
      bonus: 0,
      desc: 'Capacité passive. Maîtrise avancée des sorts arcaniques.',
    },
    'Connaissance Interdite': {
      mana: 0,
      des: '—',
      bonus: 0,
      desc: 'Capacité passive. Accès à des sorts normalement proscrits.',
    },
  },
  firm: {
    Transmutation: {
      mana: '1-2',
      des: '—',
      bonus: 0,
      desc: 'Double ses PV max et réduit le mana à 0. La vie du lanceur varie en fonction de ses PV manquants.',
    },
    Gonflette: {
      mana: 2,
      des: '—',
      bonus: 0,
      desc: "Vous canalisez la puissance tellurique dans les muscles et la peau. Vos fibres se gonflent, votre cuir s'épaissit, vos nerfs se tendent.\nPour chaque palier de 2 points de mana dépensés, vous bénéficiez d'un bonus temporaire de +1 en Armure naturelle et +1 en Attaque physique.",
    },
    'Tarte aux prunes': {
      mana: '1/PV',
      des: '1D4',
      bonus: -1,
      desc: "Renforce une de ses mains de feuilles et de fleurs magiques, puis gifle la personne souhaitée afin de la soigner.\n1 mana par PV soigné.",
    },
    'Extension du territoire': {
      mana: 1,
      des: '—',
      bonus: 0,
      desc: "Prend le contrôle d'un œil et d'une oreille d'un animal à proximité.",
    },
    'Châtiment Sacré': {
      mana: 0,
      des: '—',
      bonus: 0,
      desc: 'Capacité passive de combat sacré.',
    },
    "Provoc' Sauvage": {
      mana: 0,
      des: '—',
      bonus: 0,
      desc: "Provoque un ennemi pour attirer son attention sur Firm.",
    },
  },
  mwassa: {
    'Bénédiction du goupil': {
      mana: 3,
      des: '—',
      bonus: 0,
      desc: "Au rythme frénétique de son tambourin et du claquement de ses castagnettes, Mwassa invoque une bénédiction divine.\nUne vibration invisible parcourt l'air, trouve le cœur des alliés visés et y fait battre la force des hymnes anciens.\n\nEffet : Les personnes dans un rayon de 5m gagnent +10% sur tous leurs jets pendant 2 tours.\n+20% en mono-cible.",
    },
    'Aux armes !': {
      mana: '1+1D4-12',
      des: '—',
      bonus: 0,
      desc: "Mwassa appelle la mémoire des grands Hommes pour l'habiter. Elle projette cette énergie pour revigorer sa cible.\n\nEffet : 25% du dé est consommé en mana. Le résultat du dé est transféré à la cible.",
    },
    Marionette: {
      mana: 6,
      des: '—',
      bonus: 0,
      desc: "Mwassa invoque un djin, fantôme de ses anciennes relations, et le projette dans sa cible.\nElle tisse autour de sa cible un filet invisible de charme et de désir, une promesse douce comme le vice et forte comme un serment.\nL'esprit de l'ennemi s'incline, docile, incapable de discerner l'enchantement de la fascination.\n\nEffet : Soumet un ennemi intelligent à la volonté de Mwassa pendant 1 heure.",
    },
    'Rosée de la vitalité': {
      mana: '1+1D4-12',
      des: '—',
      bonus: 0,
      desc: "Mwassa condense l'eau autour de la cible qu'elle souhaite soigner.\nL'eau glisse dessus pour lui restaurer sa vitalité.\n\nEffet : 25% du dé est consommé en mana. Le résultat du dé est transféré à la cible.",
    },
    'Soin Divin': {
      mana: '?',
      des: '—',
      bonus: 0,
      desc: 'Soin divin canalisé par la grâce des 12.',
    },
    'Pacte des 12': {
      mana: '?',
      des: '—',
      bonus: 0,
      desc: "Invoque l'alliance sacrée des 12 divinités pour un effet puissant.",
    },
  },
  nindey: {
    'Armes Foudroyante': {
      mana: 3,
      des: '—',
      bonus: 2,
      desc: "Ce pouvoir ancien permet au porteur de graver des runes draconiques sur ses armes. Ces runes, issues du langage primordial des Dragons-Tempêtes d'Alésia, servent de catalyseur : elles attirent et canalisent la foudre vivante.\nUne fois activées, l'arme se couvre d'arcs électriques qui tournent autour de la lame comme des serpents d'éclair. (5 Tours)",
    },
    'Marteau de Thor': {
      mana: 2,
      des: '—',
      bonus: 0,
      desc: "Nindey peut lancer l'une de ses deux haches, recouverte de foudre. Un lien électrique relie sa main à la hache : tant qu'elle n'est pas coincée, celle-ci revient automatiquement dans sa main.",
    },
    Blitzer: {
      mana: 4,
      des: '1D6',
      bonus: 1,
      desc: "Vous invoquez une sphère d'électricité pure qui éclate en un instant. L'énergie électrise l'espace autour de vous, zébrant l'air de lignes de foudre qui fauchent tout être imprudent à portée (3m).",
    },
    'Lance de Foudre': {
      mana: 6,
      des: '1D10',
      bonus: 2,
      desc: "Le joueur canalise l'énergie orageuse contenue dans ses runes draconiques pour façonner une lance entièrement faite de foudre pure.\nL'arme n'est pas matérielle : c'est une projection d'énergie condensée, vibrante et instable, prête à être lancée.\nUne fois formée, la lance crépite, illuminant les environs d'un bleu électrique avant de frapper sa cible avec la violence d'un tonnerre.",
    },
    'Maîtrise des Armes': {
      mana: 0,
      des: '—',
      bonus: 0,
      desc: "Capacité passive. Maîtrise avancée du maniement des armes.",
    },
    "Baroud d'Honneur": {
      mana: 0,
      des: '—',
      bonus: 2,
      desc: 'Capacité passive. Si les PV tombent sous 30%, les attaques infligent +2 dégâts bonus.',
    },
  },
}

function splitGiftText(raw) {
  const trimmed = String(raw ?? '').trim()
  const emDashIdx = trimmed.indexOf(' — ')
  const colonIdx = trimmed.indexOf(' : ')

  if (emDashIdx !== -1) {
    return { name: trimmed.slice(0, emDashIdx).trim(), effect: trimmed.slice(emDashIdx + 3).trim() }
  }
  if (colonIdx !== -1) {
    return { name: trimmed.slice(0, colonIdx).trim(), effect: trimmed.slice(colonIdx + 3).trim() }
  }
  return { name: trimmed, effect: '' }
}

function parseGiftEffectFallback(effect) {
  const result = {}
  if (!effect) return result

  const normalized = normalizeMinus(effect)

  const manaMatch = normalized.match(/(\d+)\s*mana\b/)
  if (manaMatch) result.manaCost = Number.parseInt(manaMatch[1], 10)

  const diceMatch = normalized.match(/(\d*D\d+(?:\+\d*D\d+)*)\s*([+-]\d+)?/)
  if (diceMatch) {
    result.damageDice = diceMatch[1]
    if (diceMatch[2]) result.damageBonus = Number.parseInt(diceMatch[2], 10)
  }

  return result
}

function migrateGift(characterId, gift) {
  const { name, effect } = splitGiftText(gift.name)
  const donData = (DONS_DATA[characterId] ?? {})[name]

  // Fixed field order every run: delete the enrichable fields unconditionally
  // first, then re-add only the ones that apply, always in the same order.
  // This is what keeps the script idempotent (no key-order drift on re-run).
  const updated = { ...gift, name }
  delete updated.manaCost
  delete updated.manaNote
  delete updated.damageDice
  delete updated.damageBonus

  if (donData) {
    updated.description = donData.desc

    if (typeof donData.mana === 'number') {
      if (donData.mana !== 0) updated.manaCost = donData.mana
    } else if (typeof donData.mana === 'string') {
      updated.manaNote = donData.mana
    }

    if (donData.des && donData.des !== '—') {
      updated.damageDice = donData.des
    }

    if (typeof donData.bonus === 'number' && donData.bonus !== 0) {
      updated.damageBonus = donData.bonus
    }

    return updated
  }

  console.warn(
    `[migrateInventoryFixtures] No DONS_DATA entry for "${characterId}" / "${name}" — falling back to parsed text.`,
  )
  updated.description = effect || gift.description || ''
  const fallback = parseGiftEffectFallback(effect)
  if (fallback.manaCost !== undefined) updated.manaCost = fallback.manaCost
  if (fallback.damageDice !== undefined) updated.damageDice = fallback.damageDice
  if (fallback.damageBonus !== undefined) updated.damageBonus = fallback.damageBonus

  return updated
}

function migrateCharacterDoc(doc) {
  return {
    ...doc,
    gifts: (doc.gifts ?? []).map((gift) => migrateGift(doc.id, gift)),
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

function main() {
  const inventories = JSON.parse(fs.readFileSync(INVENTORIES_PATH, 'utf8'))
  const migratedInventories = inventories.map(migrateInventoryDoc)
  writeJson(INVENTORIES_PATH, migratedInventories)
  console.log(`Migrated ${migratedInventories.length} inventories -> ${INVENTORIES_PATH}`)

  const characters = JSON.parse(fs.readFileSync(CHARACTERS_PATH, 'utf8'))
  const migratedCharacters = characters.map(migrateCharacterDoc)
  writeJson(CHARACTERS_PATH, migratedCharacters)
  console.log(`Migrated ${migratedCharacters.length} characters -> ${CHARACTERS_PATH}`)
}

main()
