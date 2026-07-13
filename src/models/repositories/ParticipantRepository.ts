import { collection, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type {
  CharacterSessionState,
  Participant,
  ParticipantStatus,
  Posture,
} from '../types/Participant'

const PARTICIPANTS_COLLECTION = 'participants'

function mapParticipant(raw: Record<string, unknown>): Participant {
  const rawSession = (raw.session ?? {}) as Record<string, unknown>
  return {
    uid: String(raw.uid ?? ''),
    campaignId: String(raw.campaignId ?? ''),
    characterId: String(raw.characterId ?? ''),
    status: (raw.status as ParticipantStatus) ?? 'pending',
    personalNote: String(raw.personalNote ?? ''),
    session: {
      hp: Number(rawSession.hp ?? 0),
      maxHp: Number(rawSession.maxHp ?? 0),
      mana: Number(rawSession.mana ?? 0),
      maxMana: Number(rawSession.maxMana ?? 0),
      posture: (rawSession.posture as Posture) ?? 'DEFENSIF',
      updatedAt: rawSession.updatedAt ? String(rawSession.updatedAt) : undefined,
    },
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  }
}

export async function listParticipantsByCampaign(campaignId: string): Promise<Participant[]> {
  if (!db) return []
  const q = query(collection(db, PARTICIPANTS_COLLECTION), where('campaignId', '==', campaignId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => mapParticipant(doc.data()))
}

export async function getParticipant(uid: string, campaignId: string): Promise<Participant | null> {
  if (!db) return null
  const q = query(
    collection(db, PARTICIPANTS_COLLECTION),
    where('uid', '==', uid),
    where('campaignId', '==', campaignId),
  )
  const snapshot = await getDocs(q)
  const first = snapshot.docs[0]
  return first ? mapParticipant(first.data()) : null
}

export async function getParticipantByCharacterId(
  characterId: string,
  campaignId: string,
): Promise<Participant | null> {
  if (!db) return null
  const q = query(
    collection(db, PARTICIPANTS_COLLECTION),
    where('characterId', '==', characterId),
    where('campaignId', '==', campaignId),
  )
  const snapshot = await getDocs(q)
  const first = snapshot.docs[0]
  return first ? mapParticipant(first.data()) : null
}

export async function setParticipantSessionByCharacterId(
  characterId: string,
  campaignId: string,
  sessionPatch: Partial<CharacterSessionState>,
): Promise<Participant | null> {
  if (!db) return null

  const q = query(
    collection(db, PARTICIPANTS_COLLECTION),
    where('characterId', '==', characterId),
    where('campaignId', '==', campaignId),
  )
  const snapshot = await getDocs(q)
  const first = snapshot.docs[0]
  if (!first) return null

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    'session.updatedAt': now,
    updatedAt: now,
  }

  if (sessionPatch.hp !== undefined) {
    updates['session.hp'] = Math.trunc(sessionPatch.hp)
  }
  if (sessionPatch.maxHp !== undefined) {
    updates['session.maxHp'] = Math.max(0, Math.trunc(sessionPatch.maxHp))
  }
  if (sessionPatch.mana !== undefined) {
    updates['session.mana'] = Math.trunc(sessionPatch.mana)
  }
  if (sessionPatch.maxMana !== undefined) {
    updates['session.maxMana'] = Math.max(0, Math.trunc(sessionPatch.maxMana))
  }
  if (sessionPatch.posture !== undefined) {
    updates['session.posture'] = sessionPatch.posture
  }

  await updateDoc(first.ref, updates)

  const currentData = first.data() as Record<string, unknown>
  const currentSession = (currentData.session ?? {}) as Record<string, unknown>
  const mergedSession = {
    ...currentSession,
    ...sessionPatch,
    updatedAt: now,
  }

  return mapParticipant({
    ...currentData,
    session: mergedSession,
    updatedAt: now,
  })
}

export async function setParticipantPersonalNoteByCharacterId(
  characterId: string,
  campaignId: string,
  personalNote: string,
): Promise<Participant | null> {
  if (!db) return null

  const q = query(
    collection(db, PARTICIPANTS_COLLECTION),
    where('characterId', '==', characterId),
    where('campaignId', '==', campaignId),
  )
  const snapshot = await getDocs(q)
  const first = snapshot.docs[0]
  if (!first) return null

  const now = new Date().toISOString()

  await updateDoc(first.ref, {
    personalNote,
    updatedAt: now,
  })

  const currentData = first.data() as Record<string, unknown>
  return mapParticipant({
    ...currentData,
    personalNote,
    updatedAt: now,
  })
}

export async function setParticipantPersonalNoteByUid(
  uid: string,
  campaignId: string,
  personalNote: string,
): Promise<Participant | null> {
  if (!db) return null

  const q = query(
    collection(db, PARTICIPANTS_COLLECTION),
    where('uid', '==', uid),
    where('campaignId', '==', campaignId),
  )
  const snapshot = await getDocs(q)
  const first = snapshot.docs[0]
  if (!first) return null

  const now = new Date().toISOString()

  await updateDoc(first.ref, {
    personalNote,
    updatedAt: now,
  })

  const currentData = first.data() as Record<string, unknown>
  return mapParticipant({
    ...currentData,
    personalNote,
    updatedAt: now,
  })
}

export async function resetTeamSessionToMax(campaignId: string): Promise<number> {
  if (!db) return 0

  const q = query(collection(db, PARTICIPANTS_COLLECTION), where('campaignId', '==', campaignId))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return 0

  const now = new Date().toISOString()
  const batch = writeBatch(db)

  snapshot.docs.forEach((participantDoc) => {
    const data = participantDoc.data() as Record<string, unknown>
    const rawSession = (data.session ?? {}) as Record<string, unknown>
    const maxHp = Number(rawSession.maxHp ?? 0)
    const maxMana = Number(rawSession.maxMana ?? 0)

    batch.update(participantDoc.ref, {
      'session.hp': maxHp,
      'session.mana': maxMana,
      'session.updatedAt': now,
      updatedAt: now,
    })
  })

  await batch.commit()
  return snapshot.size
}
