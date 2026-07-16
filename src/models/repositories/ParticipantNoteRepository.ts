import { doc, getDoc, setDoc } from 'firebase/firestore'

import { db } from '../../firebase/config'

const PARTICIPANT_NOTES_COLLECTION = 'participantNotes'

export async function getParticipantNote(participantId: string): Promise<string> {
  if (!db) return ''
  const ref = doc(db, PARTICIPANT_NOTES_COLLECTION, participantId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return ''
  return String((snap.data() as Record<string, unknown>).personalNote ?? '')
}

export async function setParticipantNote(participantId: string, personalNote: string): Promise<void> {
  if (!db) return
  const ref = doc(db, PARTICIPANT_NOTES_COLLECTION, participantId)
  await setDoc(ref, { personalNote, updatedAt: new Date().toISOString() })
}
