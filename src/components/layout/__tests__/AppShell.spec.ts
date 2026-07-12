import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    RouterLink: {
      template: '<a><slot /></a>',
      props: ['to', 'class'],
    },
    useRoute: () => ({ path: '/', name: 'home' }),
  }
})

vi.mock('../../controllers/useAuthStore', () => ({
  useAuthStore: () => ({
    user: { value: null },
    loading: { value: false },
    signInWithGoogle: vi.fn<() => void>(),
    signOut: vi.fn<() => void>(),
  }),
}))

import AppShell from '../AppShell.vue'

describe('AppShell', () => {
  it('renders the sidebar navigation labels', () => {
    const wrapper = mount(AppShell, {
      slots: {
        default: '<div class="page-content">Contenu</div>',
      },
    })

    expect(wrapper.text()).toContain('Accueil')
    expect(wrapper.text()).toContain('Campagnes')
  })
})
