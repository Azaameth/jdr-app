import { doc, getDoc, onSnapshot, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore'

import { db } from '../../firebase/config'

export type CampaignNotesBucket = 'Gm' | 'Shared' | 'Collaborative'

export interface CampaignNoteEntry {
  Content: string
  UpdatedAt?: string
  UpdatedBy?: string
}

export interface CampaignNotesDocument {
  Entries: Record<string, CampaignNoteEntry>
  UpdatedAt?: string
}

function getNotesRef(campaignId: string, bucket: CampaignNotesBucket) {
  if (!db) return null
  return doc(db, 'Campaigns', campaignId, 'Notes', bucket)
}

export async function getCampaignNotes(
  campaignId: string,
  bucket: CampaignNotesBucket,
): Promise<CampaignNotesDocument | null> {
  if (!db) return null

  const ref = getNotesRef(campaignId, bucket)
  if (!ref) return null

  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return null

  return { id: snapshot.id, ...snapshot.data() } as CampaignNotesDocument & { id: string }
}

export async function setCampaignNotes(
  campaignId: string,
  bucket: CampaignNotesBucket,
  notes: Partial<CampaignNotesDocument>,
): Promise<void> {
  if (!db) return

  const ref = getNotesRef(campaignId, bucket)
  if (!ref) return

  await setDoc(ref, { ...notes, UpdatedAt: new Date().toISOString() }, { merge: true })
}

export async function updateCampaignNotes(
  campaignId: string,
  bucket: CampaignNotesBucket,
  notes: Partial<CampaignNotesDocument>,
): Promise<void> {
  if (!db) return

  const ref = getNotesRef(campaignId, bucket)
  if (!ref) return

  await updateDoc(ref, { ...notes, UpdatedAt: new Date().toISOString() })
}

export function subscribeCampaignNotes(
  campaignId: string,
  bucket: CampaignNotesBucket,
  onChange: (notes: CampaignNotesDocument | null) => void,
): Unsubscribe {
  if (!db) return () => {}

  const ref = getNotesRef(campaignId, bucket)
  if (!ref) return () => {}

  return onSnapshot(ref, (snapshot) => {
    onChange(
      snapshot.exists()
        ? ({ id: snapshot.id, ...snapshot.data() } as CampaignNotesDocument & { id: string })
        : null,
    )
  })
}
