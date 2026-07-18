import { test, expect } from '@playwright/test'

// Smoke coverage for the "vitruve" interactive character sheet added by the
// vitruve-character-sheet-01KXSZRT mission (two-column layout, Fiche/
// Caractéristiques/Dons/Inventaire/child tabs, jet calculator — see
// src/views/PlayerView.vue and src/components/vitruve/*.vue).
//
// Why this is a route-guard smoke test rather than a content assertion:
// exactly the same reason documented in e2e/inventory.spec.ts (read that
// file's header comment first — it's the canonical explanation for this
// repo). Recap: the player route (`player`, path
// `/campaigns/:id/players/:characterId`) carries `meta: { requiresAuth: true }`
// in src/router/index.ts. Without Firebase secrets (CI's condition —
// .github/workflows/ci.yml notes "today's e2e suite only exercises the
// unauthenticated redirect path"), `auth` never initializes
// (src/firebase/config.ts), `isAuthenticated` is permanently false, and the
// guard always redirects to campaign-list before PlayerView (or any of the
// two-column layout, tab bar, jet calculator, or child tabs the WP06 task
// describes) ever mounts. Verified empirically while writing this spec, same
// as inventory.spec.ts before it.
//
// So this suite — deliberately, not as a shortcut — only asserts what's
// actually observable end-to-end without an auth fixture (none exists in
// this repo): the guard fires and the app boots with zero console errors.
// The structural assertions the WP06 task describes (two-column layout;
// tab switching to Caractéristiques/Dons/Inventaire; calculator total in the
// 5–95 range) are exercised today at the component level in
// src/views/__tests__/PlayerView.spec.ts (mounted directly, bypassing the
// router/auth guard) and src/components/vitruve/__tests__/
// {CaracTab,JetCalculator,ChildSheetTab}.spec.ts — see those files for the
// content-level coverage. Per decision 01KXT0MF6T7BFAY5M3CZYWDBS9 this stays
// a smoke test with no write assertions.
//
// Note the hash-based routing (createWebHashHistory in src/router/index.ts):
// a deep link must include the `#` fragment to actually reach the named
// route and exercise its per-route guard — see inventory.spec.ts for the
// same note.

test.describe('vitruve character sheet smoke (unauthenticated)', () => {
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

  test('a direct (non-hash) path also redirects cleanly, matching castes.spec.ts', async ({
    page,
  }) => {
    // Mirrors castes.spec.ts's plain-path check: the app boots and the
    // top-level router redirect still lands on campaign-list even without
    // the `#` fragment (belt-and-suspenders against a router regression that
    // would otherwise only show up on the hash-form deep link above).
    await page.goto('/jdr-app/campaigns/some-campaign-id/players/some-character-id')
    await expect(page.locator('h1')).toHaveText('Mes campagnes')
  })
})
