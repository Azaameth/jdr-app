import { beforeEach, describe, expect, it, vi } from 'vitest'

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn<(...args: unknown[]) => unknown>(() => 'doc-ref'),
  getDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  setDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  onSnapshot: vi.fn<(...args: unknown[]) => unknown>(() => () => {}),
}))

vi.mock('firebase/firestore', () => firestoreMocks)

describe('CampaignNotesRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('reads a campaign note bucket from the nested Notes path', async () => {
    vi.doMock('../../../firebase/config', () => ({ db: {} }))
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      id: 'Shared',
      data: () => ({
        Entries: {
          'scene-1': {
            Content: 'Le village est calme.',
            UpdatedAt: '2026-01-01T00:00:00.000Z',
            UpdatedBy: 'uid-1',
          },
        },
        UpdatedAt: '2026-01-01T00:00:00.000Z',
      }),
    })

    const { getCampaignNotes } = await import('../CampaignNotesRepository')
    const result = await getCampaignNotes('camp-1', 'Shared')

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      {},
      'Campaigns',
      'camp-1',
      'Notes',
      'Shared',
    )
    expect(result).toMatchObject({
      Entries: {
        'scene-1': { Content: 'Le village est calme.' },
      },
    })
  })

  it('subscribes to the fixed bucket document', async () => {
    vi.doMock('../../../firebase/config', () => ({ db: {} }))
    const unsubscribe = vi.fn<() => void>()
    firestoreMocks.onSnapshot.mockImplementation((...args: unknown[]) => {
      const callback = args[1] as (snapshot: {
        exists: () => boolean
        data: () => Record<string, unknown>
      }) => void

      callback({
        exists: () => true,
        data: () => ({
          Entries: {
            'scene-2': { Content: 'Une alerte monte dans la ville.', UpdatedBy: 'uid-2' },
          },
          UpdatedAt: '2026-01-02T00:00:00.000Z',
        }),
      })
      return unsubscribe
    })

    const { subscribeCampaignNotes } = await import('../CampaignNotesRepository')
    const onChange = vi.fn<(value: unknown) => void>()
    const stop = subscribeCampaignNotes('camp-1', 'Gm', onChange)

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      {},
      'Campaigns',
      'camp-1',
      'Notes',
      'Gm',
    )
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        Entries: expect.objectContaining({
          'scene-2': expect.objectContaining({ Content: 'Une alerte monte dans la ville.' }),
        }),
      }),
    )

    stop()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
