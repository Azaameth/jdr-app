import { beforeEach, describe, expect, it, vi } from 'vitest'

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn<(...args: unknown[]) => unknown>(() => 'doc-ref'),
  getDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  setDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  onSnapshot: vi.fn<(...args: unknown[]) => unknown>(() => () => {}),
}))

vi.mock('firebase/firestore', () => firestoreMocks)

describe('RosterRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('reads the campaign roster summary from the fixed nested path', async () => {
    vi.doMock('../../../firebase/config', () => ({ db: {} }))
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        Characters: {
          'char-1': {
            DisplayName: 'Kael',
            PlayerId: 'uid-1',
            Health: 50,
            HealthCurrent: 48,
            Mana: 20,
            ManaCurrent: 18,
            PhysicalArmorCurrent: 6,
            MagicalArmorCurrent: 0,
            ActiveFormId: null,
            Status: 'Alive',
          },
        },
        UpdatedAt: '2026-01-01T00:00:00.000Z',
      }),
    })

    const { getRosterSummary } = await import('../RosterRepository')
    const result = await getRosterSummary('camp-1')

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      {},
      'Campaigns',
      'camp-1',
      'Roster',
      'Summary',
    )
    expect(result).toMatchObject({
      Characters: {
        'char-1': {
          DisplayName: 'Kael',
          PlayerId: 'uid-1',
          Health: 50,
          HealthCurrent: 48,
        },
      },
    })
  })

  it('subscribes to the fixed nested summary document', async () => {
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
          Characters: {
            'char-2': { DisplayName: 'Ari', PlayerId: 'uid-2', Health: 10, HealthCurrent: 10 },
          },
        }),
      })
      return unsubscribe
    })

    const { subscribeRosterSummary } = await import('../RosterRepository')
    const onChange = vi.fn<(value: unknown) => void>()

    const unsub = subscribeRosterSummary('camp-1', onChange)

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      {},
      'Campaigns',
      'camp-1',
      'Roster',
      'Summary',
    )
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        Characters: expect.objectContaining({ 'char-2': expect.objectContaining({ DisplayName: 'Ari' }) }),
      }),
    )
    unsub()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
