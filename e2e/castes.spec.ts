import { test, expect } from '@playwright/test'

// This only covers the route's requiresAuth guard (redirect when unauthenticated).
// It does not verify faction content renders — that needs an authenticated
// session, which no test in this suite can produce yet (no auth fixture exists).
// There's no separate login route/page — the guard redirects to campaign-list,
// which itself shows a sign-in popup when unauthenticated (see CampaignListView.vue).
//
// Note the /jdr-app/ prefix: unlike '/' (which the preview/prod server 302s to
// the configured base), deep paths under the app's base get no such redirect —
// see vite.config.ts's `base: '/jdr-app/'`.
test('redirects to campaign list when visiting the castes route unauthenticated', async ({ page }) => {
  await page.goto('/jdr-app/campaigns/some-campaign-id/castes')
  await expect(page.locator('h1')).toHaveText('Mes campagnes')
})
