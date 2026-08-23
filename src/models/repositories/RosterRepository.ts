import { doc, getDoc, onSnapshot, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore'

import { db } from '../../firebase/config'

export interface RosterCharacterSummary {
  DisplayName: string
  PlayerId: string
  Health?: number
  HealthCurrent?: number
  Mana?: number
  ManaCurrent?: number
  PhysicalArmorCurrent?: number
  MagicalArmorCurrent?: number
  ActiveFormId?: string | null
  Status?: string
}

export interface RosterSummaryDocument {
  Characters: Record<string, RosterCharacterSummary>
  UpdatedAt?: string
}

function getRosterSummaryRef(campaignId: string) {
  if (!db) return null
  return doc(db, 'Campaigns', campaignId, 'Roster', 'Summary')
}

export async function getRosterSummary(
  campaignId: string,
): Promise<RosterSummaryDocument | null> {
  if (!db) return null

  const ref = getRosterSummaryRef(campaignId)
  if (!ref) return null

  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return null

  return { id: snapshot.id, ...snapshot.data() } as RosterSummaryDocument & { id: string }
}

export async function setRosterSummary(
  campaignId: string,
  summary: Partial<RosterSummaryDocument>,
): Promise<void> {
  if (!db) return

  const ref = getRosterSummaryRef(campaignId)
  if (!ref) return

  await setDoc(ref, { ...summary, UpdatedAt: new Date().toISOString() }, { merge: true })
}

export async function updateRosterSummary(
  campaignId: string,
  summary: Partial<RosterSummaryDocument>,
): Promise<void> {
  if (!db) return

  const ref = getRosterSummaryRef(campaignId)
  if (!ref) return

  await updateDoc(ref, { ...summary, UpdatedAt: new Date().toISOString() })
}

export function subscribeRosterSummary(
  campaignId: string,
  onChange: (summary: RosterSummaryDocument | null) => void,
): Unsubscribe {
  if (!db) return () => {}

  const ref = getRosterSummaryRef(campaignId)
  if (!ref) return () => {}

  return onSnapshot(ref, (snapshot) => {
    onChange(
      snapshot.exists()
        ? ({ id: snapshot.id, ...snapshot.data() } as RosterSummaryDocument & { id: string })
        : null,
    )
  })
}
