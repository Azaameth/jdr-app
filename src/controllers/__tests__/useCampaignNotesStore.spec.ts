import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { useCampaignNotesStore as UseCampaignNotesStoreType } from '../useCampaignNotesStore'

const mocks = vi.hoisted(() => ({
  getCampaignNotes: vi.fn<(
    campaignId: string,
    bucket: 'Gm' | 'Shared' | 'Collaborative',
  ) => Promise<
    | {
        Entries: Record<string, { Content: string; UpdatedBy?: string }>
        UpdatedAt?: string
      }
    | null
  >>(),
  subscribeCampaignNotes: vi.fn<(
    campaignId: string,
    bucket: 'Gm' | 'Shared' | 'Collaborative',
    onChange: (notes: unknown) => void,
  ) => () => void>(),
}))

vi.mock('../../models/repositories/CampaignNotesRepository', () => ({
  getCampaignNotes: mocks.getCampaignNotes,
  subscribeCampaignNotes: mocks.subscribeCampaignNotes,
}))

describe('useCampaignNotesStore', () => {
  let useCampaignNotesStore: typeof UseCampaignNotesStoreType

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.subscribeCampaignNotes.mockReturnValue(() => {})
    ;({ useCampaignNotesStore } = await import('../useCampaignNotesStore'))
  })

  it('subscribes once per campaign bucket and detaches when switching bucket', () => {
    const firstUnsubscribe = vi.fn<() => void>()
    mocks.subscribeCampaignNotes.mockReturnValueOnce(firstUnsubscribe)

    const store = useCampaignNotesStore()
    store.subscribe('camp-1', 'Gm')
    store.subscribe('camp-1', 'Gm')
    store.subscribe('camp-1', 'Shared')

    expect(mocks.subscribeCampaignNotes).toHaveBeenCalledTimes(2)
    expect(firstUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it('mirrors the live notes snapshot into the store state', () => {
    mocks.subscribeCampaignNotes.mockImplementation((_campaignId, _bucket, onChange) => {
      onChange({
        Entries: {
          'scene-1': { Content: 'Le village est calme.', UpdatedBy: 'uid-1' },
        },
        UpdatedAt: '2026-01-01T00:00:00Z',
      })
      return () => {}
    })

    const store = useCampaignNotesStore()
    store.subscribe('camp-1', 'Shared')

    expect(store.notes.value).toMatchObject({
      Entries: {
        'scene-1': { Content: 'Le village est calme.' },
      },
    })
  })
})
