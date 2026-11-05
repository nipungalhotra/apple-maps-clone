import { test, expect } from '@playwright/test';

test.describe('RoadReady End-to-End Application Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Skip the first-run onboarding modal.
    await page.addInitScript(() => {
      localStorage.setItem('roadready_guide_shown', 'true');
    });
    await page.goto('/');
  });

  test('Page loads with correct title and map canvas', async ({ page }) => {
    await expect(page).toHaveTitle(/RoadReady/i);
    await expect(page.locator('.maplibregl-canvas')).toBeAttached();
  });

  test('Map shows the attribution required by OSM/CARTO', async ({ page }) => {
    await expect(page.locator('.maplibregl-ctrl-attrib')).toBeAttached();
  });

  test('DeviceModeBar switches to the mobile layout', async ({ page }) => {
    const mobileButton = page.getByRole('button', { name: 'Switch to iOS iPhone Mobile Simulator' });
    await expect(mobileButton).toBeVisible();
    await mobileButton.click();
    await expect(page.locator('input[placeholder*="Search"]').first()).toBeVisible();
  });

  test('Search input filters preset places', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Golden');
    await expect(page.getByText('Golden Gate Bridge').first()).toBeVisible();
  });

  test('Learner PRO paywall opens and closes cleanly', async ({ page }) => {
    await page.getByRole('button', { name: 'Unlock Learner PRO Pass for $29.99' }).click();
    const heading = page.getByText('Practice smarter for your road test');
    await expect(heading).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(heading).toBeHidden();
  });
});
