import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RawCharacterEditor from '../RawCharacterEditor.vue'
import type { CharacterProfile } from '../../../models/types/Character'

const { mockUpdateCharacter } = vi.hoisted(() => ({
  mockUpdateCharacter:
    vi.fn<(id: string, fields: Record<string, unknown>) => Promise<void>>(),
}))
vi.mock('../../../models/repositories/CharacterRepository', () => ({
  updateCharacter: mockUpdateCharacter,
}))

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-1',
    campaignId: 'campaign-1',
    ownerUid: 'owner-uid',
    name: 'Firm Bintaggle',
    raceId: 'r1',
    classId: 'c1',
    gender: 'Homme',
    elements: [],
    level: 1,
    attributes: {
      primary: { force: 40, social: 30, mental: 35 },
      secondary: { puissance: 3, finesse: 2, aura: 1, relation: 2, instinct: 3, savoir: 2 },
    },
    skills: [],
    gifts: [],
    languages: [],
    img: '',
    backstory: 'Un vieil aventurier.',
    ...overrides,
  }
}

async function setTextareaValue(wrapper: ReturnType<typeof mount>, value: string) {
  await wrapper.find('.raw-editor-textarea').setValue(value)
}

describe('RawCharacterEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefills the textarea with JSON.stringify(character, null, 2)', () => {
    const character = makeCharacter()
    const wrapper = mount(RawCharacterEditor, { props: { character, open: true } })

    const textarea = wrapper.find('.raw-editor-textarea').element as HTMLTextAreaElement
    expect(textarea.value).toBe(JSON.stringify(character, null, 2))
  })

  it('invalid JSON shows the French error and calls updateCharacter zero times, writing nothing', async () => {
    const character = makeCharacter()
    const wrapper = mount(RawCharacterEditor, { props: { character, open: true } })

    await setTextareaValue(wrapper, '{ this is not json ')
    await wrapper.findAll('.raw-editor-btn').find((btn) => btn.text() === 'Enregistrer')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('JSON invalide — aucune modification enregistrée.')
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('valid JSON that is not an object (e.g. an array) is also rejected as invalid, writing nothing', async () => {
    const character = makeCharacter()
    const wrapper = mount(RawCharacterEditor, { props: { character, open: true } })

    await setTextareaValue(wrapper, '[1, 2, 3]')
    await wrapper.findAll('.raw-editor-btn').find((btn) => btn.text() === 'Enregistrer')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('JSON invalide — aucune modification enregistrée.')
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })

  it('valid JSON calls updateCharacter WITHOUT id/campaignId and emits saved', async () => {
    const character = makeCharacter()
    const wrapper = mount(RawCharacterEditor, { props: { character, open: true } })

    const edited = { ...character, name: 'Firm Bintaggle (modifié)', level: 2 }
    await setTextareaValue(wrapper, JSON.stringify(edited, null, 2))
    await wrapper.findAll('.raw-editor-btn').find((btn) => btn.text() === 'Enregistrer')?.trigger('click')
    await flushPromises()

    expect(mockUpdateCharacter).toHaveBeenCalledTimes(1)
    const [calledId, calledPayload] = mockUpdateCharacter.mock.calls[0] as [string, Record<string, unknown>]
    expect(calledId).toBe('char-1')
    expect(calledPayload).not.toHaveProperty('id')
    expect(calledPayload).not.toHaveProperty('campaignId')
    expect(calledPayload.name).toBe('Firm Bintaggle (modifié)')
    expect(calledPayload.level).toBe(2)
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('strips id/campaignId even when the edited JSON carries different (junk) values for them', async () => {
    // Reviewer guidance: an MJ payload with a mismatched `id`/`campaignId`
    // (typo, copy-paste, or malicious) must never repoint the write target —
    // the component always writes to props.character.id, and the stripped
    // fields never reach updateCharacter's payload argument at all.
    const character = makeCharacter()
    const wrapper = mount(RawCharacterEditor, { props: { character, open: true } })

    const tampered = { ...character, id: 'other-doc', campaignId: 'other-campaign', role: 'admin' }
    await setTextareaValue(wrapper, JSON.stringify(tampered, null, 2))
    await wrapper.findAll('.raw-editor-btn').find((btn) => btn.text() === 'Enregistrer')?.trigger('click')
    await flushPromises()

    expect(mockUpdateCharacter).toHaveBeenCalledTimes(1)
    const [calledId, calledPayload] = mockUpdateCharacter.mock.calls[0] as [string, Record<string, unknown>]
    expect(calledId).toBe('char-1') // still the character being edited, not "other-doc"
    expect(calledPayload).not.toHaveProperty('id')
    expect(calledPayload).not.toHaveProperty('campaignId')
    // `role` isn't a CharacterProfile field at all — it's passed through as
    // unknown extra data (Firestore/updateDoc ignores fields outside the
    // type), same as legacy's editRawChar; only doc-identity fields are
    // specifically stripped.
  })

  it('cancel writes nothing and emits close', async () => {
    const character = makeCharacter()
    const wrapper = mount(RawCharacterEditor, { props: { character, open: true } })

    await setTextareaValue(wrapper, '{ broken')
    await wrapper.findAll('.raw-editor-btn').find((btn) => btn.text() === 'Annuler')?.trigger('click')

    expect(mockUpdateCharacter).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('closing via the modal backdrop/✕ also writes nothing', async () => {
    const character = makeCharacter()
    const wrapper = mount(RawCharacterEditor, { props: { character, open: true } })

    await wrapper.find('.app-modal-close').trigger('click')

    expect(mockUpdateCharacter).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('renders nothing when open is false', () => {
    const wrapper = mount(RawCharacterEditor, { props: { character: makeCharacter(), open: false } })

    expect(wrapper.find('.raw-editor-textarea').exists()).toBe(false)
  })
})
