import { computed, ref } from 'vue'
import {
  getCampaignNotes,
  subscribeCampaignNotes,
  type CampaignNotesBucket,
  type CampaignNotesDocument,
} from '../models/repositories/CampaignNotesRepository'

const emptyNotes: CampaignNotesDocument = {
  Entries: {},
  UpdatedAt: undefined,
}

const notes = ref<CampaignNotesDocument>(emptyNotes)
const loading = ref(false)
const error = ref<string | null>(null)
const currentCampaignId = ref<string | null>(null)
const currentBucket = ref<CampaignNotesBucket | null>(null)
let unsubscribeFn: (() => void) | null = null

export function useCampaignNotesStore() {
  function subscribe(campaignId: string, bucket: CampaignNotesBucket): void {
    if (currentCampaignId.value === campaignId && currentBucket.value === bucket && unsubscribeFn) {
      return
    }

    if (unsubscribeFn) {
      unsubscribeFn()
      unsubscribeFn = null
    }

    currentCampaignId.value = campaignId
    currentBucket.value = bucket
    error.value = null

    unsubscribeFn = subscribeCampaignNotes(campaignId, bucket, (nextNotes) => {
      notes.value = nextNotes ?? { ...emptyNotes, Entries: {} }
    })
  }

  function unsubscribe(): void {
    if (unsubscribeFn) {
      unsubscribeFn()
      unsubscribeFn = null
    }
    currentCampaignId.value = null
    currentBucket.value = null
    notes.value = { ...emptyNotes, Entries: {} }
  }

  async function fetch(campaignId: string, bucket: CampaignNotesBucket): Promise<CampaignNotesDocument | null> {
    loading.value = true
    error.value = null

    try {
      const nextNotes = await getCampaignNotes(campaignId, bucket)
      if (nextNotes) {
        notes.value = nextNotes
      }
      return nextNotes
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des notes de campagne.'
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    notes: computed(() => notes.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    currentCampaignId: computed(() => currentCampaignId.value),
    currentBucket: computed(() => currentBucket.value),
    subscribe,
    unsubscribe,
    fetch,
  }
}
