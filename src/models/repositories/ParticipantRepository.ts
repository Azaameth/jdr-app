import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '../../firebase/config'
import type {
  CharacterSessionState,
  Participant,
  ParticipantStatus,
  Posture,
} from '../types/Participant'

function getCampaignPlayersCollection(campaignId: string) {
  if (!db) {
    return null
  }
  return collection(db, 'Campaigns', campaignId, 'Players')
}

function mapSessionState(raw: Record<string, unknown>): CharacterSessionState {
  return {
    hp: Number(raw.hp ?? 0),
    maxHp: Number(raw.maxHp ?? 0),
    mana: Number(raw.mana ?? 0),
    maxMana: Number(raw.maxMana ?? 0),
    posture: (raw.posture as Posture) ?? 'DEFENSIF',
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    injuries: (raw.injuries as CharacterSessionState['injuries']) ?? undefined,
    advantage: typeof raw.advantage === 'boolean' ? raw.advantage : undefined,
    disadvantage: typeof raw.disadvantage === 'boolean' ? raw.disadvantage : undefined,
  }
}

function mapParticipant(id: string, raw: Record<string, unknown>): Participant {
  const rawSession = (raw.session ?? {}) as Record<string, unknown>
  const rawChildSessions = raw.childSessions as Record<string, unknown> | undefined
  const childSessions = rawChildSessions
    ? Object.fromEntries(
        Object.entries(rawChildSessions).map(([childId, value]) => [
          childId,
          mapSessionState((value ?? {}) as Record<string, unknown>),
        ]),
      )
    : undefined

  return {
    id,
    uid: String(raw.uid ?? ''),
    campaignId: String(raw.campaignId ?? ''),
    characterId: String(raw.characterId ?? ''),
    status: (raw.status as ParticipantStatus) ?? 'pending',
    session: mapSessionState(rawSession),
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    childSessions,
  }
}

export async function listParticipantsByCampaign(campaignId: string): Promise<Participant[]> {
  if (!db) return []

  const nestedRef = getCampaignPlayersCollection(campaignId)
  if (!nestedRef) return []

  const nestedSnapshot = await getDocs(nestedRef)
  return nestedSnapshot.docs.map((docSnap) => mapParticipant(docSnap.id, docSnap.data()))
}

export function subscribeParticipantsByCampaign(
  campaignId: string,
  onChange: (participants: Participant[]) => void,
): Unsubscribe {
  if (!db) return () => {}

  const nestedRef = getCampaignPlayersCollection(campaignId)
  if (!nestedRef) return () => {}

  return onSnapshot(nestedRef, (snapshot) => {
    onChange(snapshot.docs.map((docSnap) => mapParticipant(docSnap.id, docSnap.data())))
  })
}

export async function getParticipant(uid: string, campaignId: string): Promise<Participant | null> {
  if (!db) return null

  const nestedRef = getCampaignPlayersCollection(campaignId)
  if (!nestedRef) return null

  const q = query(nestedRef, where('uid', '==', uid))
  const nestedSnapshot = await getDocs(q)
  const first = nestedSnapshot.docs[0]
  return first ? mapParticipant(first.id, first.data()) : null
}

export async function getParticipantByCharacterId(
  characterId: string,
  campaignId: string,
): Promise<Participant | null> {
  if (!db) return null

  const nestedRef = getCampaignPlayersCollection(campaignId)
  if (!nestedRef) return null

  const q = query(nestedRef, where('characterId', '==', characterId))
  const nestedSnapshot = await getDocs(q)
  const first = nestedSnapshot.docs[0]
  return first ? mapParticipant(first.id, first.data()) : null
}

export async function setParticipantSessionByCharacterId(
  characterId: string,
  campaignId: string,
  sessionPatch: Partial<CharacterSessionState>,
): Promise<Participant | null> {
  if (!db) return null

  const nestedRef = getCampaignPlayersCollection(campaignId)
  if (!nestedRef) return null

  const q = query(nestedRef, where('characterId', '==', characterId))
  const snapshot = await getDocs(q)
  const first = snapshot.docs[0] ?? null

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

  return mapParticipant(first.id, {
    ...currentData,
    session: mergedSession,
    updatedAt: now,
  })
}

export async function resetTeamSessionToMax(campaignId: string): Promise<number> {
  if (!db) return 0

  const nestedRef = getCampaignPlayersCollection(campaignId)
  if (!nestedRef) return 0

  const snapshot = await getDocs(nestedRef)
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

export async function updateSessionFields(
  participantId: string,
  fields: Partial<
    Pick<CharacterSessionState, 'hp' | 'mana' | 'posture' | 'injuries' | 'advantage' | 'disadvantage'>
  >,
): Promise<void> {
  if (!db) return

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    'session.updatedAt': now,
    updatedAt: now,
  }

  if (fields.hp !== undefined) {
    updates['session.hp'] = Math.trunc(fields.hp)
  }
  if (fields.mana !== undefined) {
    updates['session.mana'] = Math.trunc(fields.mana)
  }
  if (fields.posture !== undefined) {
    updates['session.posture'] = fields.posture
  }
  if (fields.injuries !== undefined) {
    updates['session.injuries'] = fields.injuries
  }
  if (fields.advantage !== undefined) {
    updates['session.advantage'] = fields.advantage
  }
  if (fields.disadvantage !== undefined) {
    updates['session.disadvantage'] = fields.disadvantage
  }

  const ref = doc(db, 'Participants', participantId)
  await updateDoc(ref, updates)
}

export async function updateChildSession(
  participantId: string,
  childCharacterId: string,
  fields: Partial<CharacterSessionState>,
): Promise<void> {
  if (!db) return

  const now = new Date().toISOString()
  const prefix = `childSessions.${childCharacterId}`
  const updates: Record<string, unknown> = {
    [`${prefix}.updatedAt`]: now,
    updatedAt: now,
  }

  if (fields.hp !== undefined) {
    updates[`${prefix}.hp`] = Math.trunc(fields.hp)
  }
  if (fields.maxHp !== undefined) {
    updates[`${prefix}.maxHp`] = Math.max(0, Math.trunc(fields.maxHp))
  }
  if (fields.mana !== undefined) {
    updates[`${prefix}.mana`] = Math.trunc(fields.mana)
  }
  if (fields.maxMana !== undefined) {
    updates[`${prefix}.maxMana`] = Math.max(0, Math.trunc(fields.maxMana))
  }
  if (fields.posture !== undefined) {
    updates[`${prefix}.posture`] = fields.posture
  }
  if (fields.injuries !== undefined) {
    updates[`${prefix}.injuries`] = fields.injuries
  }
  if (fields.advantage !== undefined) {
    updates[`${prefix}.advantage`] = fields.advantage
  }
  if (fields.disadvantage !== undefined) {
    updates[`${prefix}.disadvantage`] = fields.disadvantage
  }

  const ref = doc(db, 'Participants', participantId)
  await updateDoc(ref, updates)
}
