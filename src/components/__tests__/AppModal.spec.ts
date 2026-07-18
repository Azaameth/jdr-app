import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppModal from '../AppModal.vue'

describe('AppModal', () => {
  it('renders nothing when closed', () => {
    const wrapper = mount(AppModal, { props: { open: false, title: 'Titre' } })

    expect(wrapper.find('.app-modal-overlay').exists()).toBe(false)
  })

  it('renders the panel with dialog semantics when open', () => {
    const wrapper = mount(AppModal, { props: { open: true, title: 'Titre' } })

    const panel = wrapper.find('.app-modal-panel')
    expect(panel.exists()).toBe(true)
    expect(panel.attributes('role')).toBe('dialog')
    expect(panel.attributes('aria-modal')).toBe('true')
    expect(wrapper.text()).toContain('Titre')
  })

  it('renders slotted body content', () => {
    const wrapper = mount(AppModal, {
      props: { open: true },
      slots: { default: '<p class="body-content">Contenu</p>' },
    })

    expect(wrapper.find('.body-content').text()).toBe('Contenu')
  })

  it('emits close when the ✕ button is clicked', async () => {
    const wrapper = mount(AppModal, { props: { open: true, title: 'Titre' } })

    await wrapper.find('.app-modal-close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close on backdrop click but not on content click', async () => {
    const wrapper = mount(AppModal, {
      props: { open: true, title: 'Titre' },
      slots: { default: '<p class="body-content">Contenu</p>' },
    })

    await wrapper.find('.body-content').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()

    await wrapper.find('.app-modal-overlay').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close on Escape key while open', async () => {
    const wrapper = mount(AppModal, { props: { open: true, title: 'Titre' } })

    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    document.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not react to Escape when closed', async () => {
    const wrapper = mount(AppModal, { props: { open: false, title: 'Titre' } })

    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    document.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('moves focus into the modal panel on open', async () => {
    const wrapper = mount(AppModal, {
      props: { open: true, title: 'Titre' },
      attachTo: document.body,
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(wrapper.find('.app-modal-panel').element)
    wrapper.unmount()
  })

  it('renders footer slot only when provided', () => {
    const withoutFooter = mount(AppModal, { props: { open: true } })
    expect(withoutFooter.find('.app-modal-footer').exists()).toBe(false)

    const withFooter = mount(AppModal, {
      props: { open: true },
      slots: { footer: '<button class="footer-btn">Action</button>' },
    })
    expect(withFooter.find('.app-modal-footer').exists()).toBe(true)
    expect(withFooter.find('.footer-btn').exists()).toBe(true)
  })
})
