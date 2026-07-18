import { test, expect } from '@playwright/test'

// Smoke coverage for the inventory/dons surface added by the
// inventory-slots-dons-01KXRF5M mission (armes/armures list, backpack grid,
// dons list — see src/views/PlayerView.vue and src/components/{WeaponArmorList,
// BackpackGrid,DonList}.vue).
//
// Why this is a route-guard smoke test rather than a content assertion:
// The player route (`player`, path `/campaigns/:id/players/:characterId`,
// rendered via PlayerListView -> PlayerView.vue) carries `meta: { requiresAuth:
// true }` in src/router/index.ts, and the guard in router.beforeEach redirects
// to campaign-list whenever `useAuthStore().isAuthenticated` is false. Without
// Firebase secrets (CI's condition — see .github/workflows/ci.yml's comment:
// "today's e2e suite only exercises the unauthenticated redirect path"),
// `auth` is never initialized (src/firebase/config.ts), `user` never becomes
// non-null, and `isAuthenticated` is permanently false — so the guard always
// fires and PlayerView never mounts. This was verified empirically while
// writing this spec: navigating straight to the player route with no
// Firebase secrets present redirects to /campaigns before any inventory
// markup exists in the DOM, exactly like the existing `castes.spec.ts`
// guarded-route case.
//
// So, like castes.spec.ts, this suite exercises the guard/redirect path and
// asserts the app boots cleanly with zero console errors — the only thing
// that's actually observable end-to-end without an auth fixture (none exists
// in this repo yet). The structural assertions the mission's acceptance
// criteria describe (armes/armures headings with >= 3 slots each; the 10
// backpack category headings — "Nourriture", "Munitions", "Matériel de
// bivouac & camp", "Matériel de soins", "Potions, Poisons, Antidotes",
// "Objets de quête", "Objets spéciaux & Reliques", "Documents, Livres,
// Titres", "Gemmes & Pierres précieuses", "Butin à revendre (ou pas)"; the
// "Dons" heading) are covered today at the component level, mounted directly
// (bypassing the router/auth guard) in src/views/__tests__/PlayerView.spec.ts,
// which already asserts those headings/sections render — see e.g. its
// `findCategorySection` helper and the "Nourriture"/"Munitions" cases.
//
// Note the hash-based routing: src/router/index.ts uses
// createWebHashHistory(), so a deep link must include the `#` fragment (e.g.
// `/jdr-app/#/campaigns/...`) to actually reach the named route and exercise
// its per-route `meta.requiresAuth` guard. A path without the `#` (as
// castes.spec.ts uses) never resolves past the router's top-level `/`
// redirect, so it can't be relied on to prove the *player* route specifically
// is guarded — this spec uses the `#` form so the assertion is meaningful.

test.describe('inventory & dons smoke (unauthenticated)', () => {
  test('redirects to campaign list with zero console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    const pageErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.goto('/jdr-app/#/campaigns/some-campaign-id/players/some-character-id')

    // Degraded mode (no Firebase secrets): the requiresAuth guard sends us
    // back to campaign-list, which renders the sign-in prompt.
    await expect(page.getByRole('heading', { level: 1, name: 'Mes campagnes' })).toBeVisible()
    await expect(page.getByText('Connexion requise')).toBeVisible()

    expect(pageErrors, `unexpected page errors: ${pageErrors.join('; ')}`).toEqual([])
    expect(consoleErrors, `unexpected console errors: ${consoleErrors.join('; ')}`).toEqual([])
  })
})
