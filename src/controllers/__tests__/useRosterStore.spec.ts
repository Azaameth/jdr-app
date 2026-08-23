import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { useRosterStore as UseRosterStoreType } from '../useRosterStore'

const mocks = vi.hoisted(() => ({
  getRosterSummary: vi.fn<(
    campaignId: string,
  ) => Promise<
    | {
        Characters: Record<string, { DisplayName: string; PlayerId: string; Health: number }>
        UpdatedAt?: string
      }
    | null
  >>(),
  subscribeRosterSummary: vi.fn<(
    campaignId: string,
    onChange: (summary: unknown) => void,
  ) => () => void>(),
}))

vi.mock('../../models/repositories/RosterRepository', () => ({
  getRosterSummary: mocks.getRosterSummary,
  subscribeRosterSummary: mocks.subscribeRosterSummary,
}))

describe('useRosterStore', () => {
  let useRosterStore: typeof UseRosterStoreType

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.subscribeRosterSummary.mockReturnValue(() => {})
    ;({ useRosterStore } = await import('../useRosterStore'))
  })

  it('subscribes once per campaign and detaches when switching campaign', () => {
    const firstUnsubscribe = vi.fn<() => void>()
    mocks.subscribeRosterSummary.mockReturnValueOnce(firstUnsubscribe)

    const store = useRosterStore()
    store.subscribe('camp-1')
    store.subscribe('camp-1')
    store.subscribe('camp-2')

    expect(mocks.subscribeRosterSummary).toHaveBeenCalledTimes(2)
    expect(firstUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it('updates the summary snapshot from the repository callback', () => {
    mocks.subscribeRosterSummary.mockImplementation((_campaignId, onChange) => {
      onChange({
        Characters: {
          'char-1': { DisplayName: 'Kael', PlayerId: 'uid-1', Health: 50, HealthCurrent: 48 },
        },
        UpdatedAt: '2026-01-01T00:00:00Z',
      })
      return () => {}
    })

    const store = useRosterStore()
    store.subscribe('camp-1')

    expect(store.summary.value).toMatchObject({
      Characters: {
        'char-1': { DisplayName: 'Kael', PlayerId: 'uid-1', Health: 50 },
      },
    })
  })
})
