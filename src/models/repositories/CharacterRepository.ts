import { collection, doc, getDoc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { CharacterGender, CharacterProfile } from '../types/Character'
import type { MembershipStatus } from '../types/Membership'

const CHARACTERS_COLLECTION = 'characters'
const MEMBERSHIPS_COLLECTION = 'memberships'

// Some existing Firestore documents predate this schema (seeded under an
// older, flatter character model with no attributes/skills/gifts/lore) — a
// blind cast would let PlayerView.vue crash reading e.g. attributes.primary
// on a document that never had an attributes field at all.
function mapCharacter(id: string, raw: Record<string, unknown>): CharacterProfile {
  const rawAttributes = (raw.attributes ?? {}) as Record<string, unknown>
  const rawPrimary = (rawAttributes.primary ?? {}) as Record<string, unknown>
  const rawSecondary = (rawAttributes.secondary ?? {}) as Record<string, unknown>
  const rawLore = (raw.lore ?? {}) as Record<string, unknown>

  return {
    id,
    campaignId: String(raw.campaignId ?? ''),
    ownerUid: String(raw.ownerUid ?? ''),
    name: String(raw.name ?? ''),
    raceId: String(raw.raceId ?? ''),
    classId: String(raw.classId ?? ''),
    gender: (raw.gender as CharacterGender) ?? 'Autre',
    elements: Array.isArray(raw.elements) ? (raw.elements as string[]) : [],
    level: Number(raw.level ?? 1),
    xp: raw.xp !== undefined ? Number(raw.xp) : undefined,
    attributes: {
      primary: {
        force: Number(rawPrimary.force ?? 0),
        social: Number(rawPrimary.social ?? 0),
        mental: Number(rawPrimary.mental ?? 0),
      },
      secondary: {
        puissance: Number(rawSecondary.puissance ?? 0),
        finesse: Number(rawSecondary.finesse ?? 0),
        aura: Number(rawSecondary.aura ?? 0),
        relation: Number(rawSecondary.relation ?? 0),
        instinct: Number(rawSecondary.instinct ?? 0),
        savoir: Number(rawSecondary.savoir ?? 0),
      },
    },
    skills: Array.isArray(raw.skills) ? (raw.skills as CharacterProfile['skills']) : [],
    gifts: Array.isArray(raw.gifts) ? (raw.gifts as CharacterProfile['gifts']) : [],
    languages: Array.isArray(raw.languages) ? (raw.languages as string[]) : [],
    lore: {
      backstory: String(rawLore.backstory ?? ''),
      notesPrivate: rawLore.notesPrivate ? String(rawLore.notesPrivate) : undefined,
    },
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  }
}

export async function listCharactersByCampaign(campaignId: string): Promise<CharacterProfile[]> {
  if (!db) {
    return []
  }

  const charactersQuery = query(
    collection(db, CHARACTERS_COLLECTION),
    where('campaignId', '==', campaignId),
  )
  const snapshot = await getDocs(charactersQuery)

  return snapshot.docs.map((doc) => mapCharacter(doc.id, doc.data()))
}

export async function getCharacterById(id: string): Promise<CharacterProfile | null> {
  if (!db) return null
  const ref = doc(db, CHARACTERS_COLLECTION, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapCharacter(snap.id, snap.data())
}

export interface CreateCharacterInput {
  campaignId: string
  ownerUid: string
  name: string
  raceId: string
  classId: string
  gender: CharacterGender
  elements: string[]
}

// Writes, unlike reads, must fail loudly when Firebase isn't configured — a
// silent no-op here would make an MJ think they created a character when
// nothing was persisted.
export async function createCharacterWithMembership(
  input: CreateCharacterInput,
): Promise<{ characterId: string }> {
  if (!db) throw new Error('Firebase non configuré.')

  const now = new Date().toISOString()
  const characterRef = doc(collection(db, CHARACTERS_COLLECTION))
  const membershipRef = doc(collection(db, MEMBERSHIPS_COLLECTION))

  const character: Omit<CharacterProfile, 'id'> = {
    campaignId: input.campaignId,
    ownerUid: input.ownerUid,
    name: input.name,
    raceId: input.raceId,
    classId: input.classId,
    gender: input.gender,
    elements: input.elements,
    level: 1,
    attributes: {
      primary: { force: 0, social: 0, mental: 0 },
      secondary: { puissance: 0, finesse: 0, aura: 0, relation: 0, instinct: 0, savoir: 0 },
    },
    skills: [],
    gifts: [],
    languages: [],
    lore: { backstory: '' },
    createdAt: now,
    updatedAt: now,
  }

  const membership = {
    uid: input.ownerUid,
    campaignId: input.campaignId,
    characterId: characterRef.id,
    status: 'approved' as MembershipStatus,
    personalNote: '',
    session: {
      hp: 0,
      maxHp: 0,
      mana: 0,
      maxMana: 0,
      posture: 'DEFENSIF',
      inventory: [],
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  }

  const batch = writeBatch(db)
  batch.set(characterRef, character)
  batch.set(membershipRef, membership)
  await batch.commit()

  return { characterId: characterRef.id }
}

export async function updateCharacter(
  id: string,
  patch: Partial<Pick<CharacterProfile, 'name' | 'level' | 'raceId' | 'classId' | 'gender' | 'elements'>>,
): Promise<void> {
  if (!db) throw new Error('Firebase non configuré.')
  await updateDoc(doc(db, CHARACTERS_COLLECTION, id), { ...patch, updatedAt: new Date().toISOString() })
}
