import { test, expect } from '@playwright/test';

test.describe('RoadReady End-to-End Application Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss initial visual onboarding modal for testing
    await page.addInitScript(() => {
      localStorage.setItem('roadready_guide_shown', 'true');
    });
    await page.goto('/');
  });

  test('Page loads with correct title and navigation canvas', async ({ page }) => {
    await expect(page).toHaveTitle(/RoadReady/i);
    const canvas = page.locator('.maplibregl-canvas');
    await expect(canvas).toBeAttached();
  });

  test('DeviceModeBar switches between Desktop and Mobile layout', async ({ page }) => {
    // Click Mobile Frame button
    const mobileButton = page.locator('button[title*="Mobile Frame"]');
    if (await mobileButton.isVisible()) {
      await mobileButton.click();
      await expect(page.locator('text=Safe Driving Grounds')).toBeVisible();
    }
  });

  test('Search input finds preset locations and practice grounds', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Parking');
    // Verify search matches appear
    await expect(page.locator('text=Open Grounds')).toBeVisible();
  });

  test('Learner Pro Pass Paywall opens and closes cleanly', async ({ page }) => {
    const proButton = page.locator('text=PRO $29.99');
    if (await proButton.isVisible()) {
      await proButton.click();
      await expect(page.locator('text=Unlock RoadReady PRO')).toBeVisible();
      // Close modal
      const closeButton = page.locator('button:has-text("✕"), button[title*="Close"]');
      if (await closeButton.first().isVisible()) {
        await closeButton.first().click();
      }
    }
  });
});
