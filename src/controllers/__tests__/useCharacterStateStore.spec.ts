import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { useCharacterStateStore as UseCharacterStateStoreType } from '../useCharacterStateStore'
import type { CharacterStateDocument } from '../../models/repositories/CharacterStateRepository'

const mocks = vi.hoisted(() => ({
  getCharacterState: vi.fn<(campaignId: string, characterId: string) => Promise<CharacterStateDocument | null>>(),
  setCharacterState: vi.fn<(campaignId: string, characterId: string, state: Partial<CharacterStateDocument>) => Promise<void>>(),
  updateCharacterState: vi.fn<(campaignId: string, characterId: string, state: Partial<CharacterStateDocument>) => Promise<void>>(),
  subscribeCharacterState: vi.fn<(
    campaignId: string,
    characterId: string,
    onChange: (state: CharacterStateDocument | null) => void,
  ) => () => void>(),
}))

vi.mock('../../models/repositories/CharacterStateRepository', () => mocks)

describe('useCharacterStateStore', () => {
  let useCharacterStateStore: typeof UseCharacterStateStoreType

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.subscribeCharacterState.mockReturnValue(() => {})
    ;({ useCharacterStateStore } = await import('../useCharacterStateStore'))
  })

  it('defaults to a neutral live state when none is available yet', () => {
    const store = useCharacterStateStore()

    expect(store.state.value).toMatchObject({
      Health: 0,
      HealthCurrent: 0,
      Mana: 0,
      ManaCurrent: 0,
      PhysicalArmor: 0,
      PhysicalArmorCurrent: 0,
      MagicalArmor: 0,
      MagicalArmorCurrent: 0,
      PhysicalAttack: 0,
      MagicalAttack: 0,
      PhysicalDefense: 0,
      MagicalDefense: 0,
      PlayerId: '',
      CampaignId: '',
    })
  })

  it('subscribes once per character and detaches when switching character', () => {
    const firstUnsubscribe = vi.fn<() => void>()
    mocks.subscribeCharacterState.mockReturnValueOnce(firstUnsubscribe)
    const store = useCharacterStateStore()

    store.subscribe('camp-1', 'char-1')
    store.subscribe('camp-1', 'char-1')
    store.subscribe('camp-1', 'char-2')

    expect(mocks.subscribeCharacterState).toHaveBeenCalledTimes(2)
    expect(firstUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it('updates the live state snapshot from the repository callback', () => {
    mocks.subscribeCharacterState.mockImplementation((_campaignId, _characterId, onChange) => {
      onChange({
        Health: 50,
        HealthCurrent: 42,
        Mana: 20,
        ManaCurrent: 18,
        PhysicalArmor: 4,
        PhysicalArmorCurrent: 4,
        MagicalArmor: 2,
        MagicalArmorCurrent: 2,
        PhysicalAttack: 5,
        MagicalAttack: 0,
        PhysicalDefense: 3,
        MagicalDefense: 1,
        PlayerId: 'uid-1',
        CampaignId: 'camp-1',
      })
      return () => {}
    })

    const store = useCharacterStateStore()
    store.subscribe('camp-1', 'char-1')

    expect(store.state.value).toMatchObject({
      Health: 50,
      HealthCurrent: 42,
      Mana: 20,
      ManaCurrent: 18,
    })
  })
})
