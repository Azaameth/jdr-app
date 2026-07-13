import { test, expect } from '@playwright/test'

// This only covers the route's requiresAuth guard (redirect when unauthenticated).
// It does not verify roster content, race/class resolution, or the create-character
// flow — those need an authenticated session, which no test in this suite can
// produce yet (no auth fixture exists), same limitation documented in
// e2e/castes.spec.ts.
test('redirects to login when visiting the team roster route unauthenticated', async ({
  page,
}) => {
  await page.goto('/jdr-app/campaigns/some-campaign-id/team')
  await expect(page.locator('h1')).toHaveText('La Tour des Sorciers')
})
