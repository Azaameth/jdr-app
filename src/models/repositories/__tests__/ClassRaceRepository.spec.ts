import { beforeEach, describe, expect, it, vi } from 'vitest'

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn<(...args: unknown[]) => unknown>(() => 'collection-ref'),
  getDocs: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  query: vi.fn<(...args: unknown[]) => unknown>(() => 'query-ref'),
  where: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('firebase/firestore', () => firestoreMocks)

describe('Class and Race repository migration', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('reads campaign classes from the nested collection first', async () => {
    vi.doMock('../../../firebase/config', () => ({ db: {} }))
    firestoreMocks.getDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'cogneur', data: () => ({ n: 'Cogneur' }) }],
    })

    const { listClassesByCampaign } = await import('../ClassRepository')
    const result = await listClassesByCampaign('camp-1')

    expect(firestoreMocks.collection).toHaveBeenCalledWith({}, 'Campaigns', 'camp-1', 'Classes')
    expect(result).toEqual([{ id: 'cogneur', n: 'Cogneur' }])
  })

  it('reads campaign races from the nested collection first', async () => {
    vi.doMock('../../../firebase/config', () => ({ db: {} }))
    firestoreMocks.getDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'kitsune', data: () => ({ n: 'Kitsune' }) }],
    })

    const { listRacesByCampaign } = await import('../RaceRepository')
    const result = await listRacesByCampaign('camp-1')

    expect(firestoreMocks.collection).toHaveBeenCalledWith({}, 'Campaigns', 'camp-1', 'Races')
    expect(result).toEqual([{ id: 'kitsune', n: 'Kitsune' }])
  })
})
