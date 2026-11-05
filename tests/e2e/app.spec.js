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

  test('Learner practice features open first', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Switch to RoadReady Learner Driver Mode' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: /Practice Spots/ })).toBeVisible();
  });

  test('Developer device switcher is not shown to customers', async ({ page }) => {
    await expect(page.getByRole('group', { name: 'Device Viewport Switcher' })).toHaveCount(0);
  });

  test('Phone-sized screens get the phone layout without sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await expect(page.getByRole('tablist', { name: 'Mobile Navigation Modes' })).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'Main Navigation Tabs' })).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('Search input filters preset places', async ({ page }) => {
    await page.getByRole('tab', { name: 'Explore map' }).click();
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Golden');
    await expect(page.getByText('Golden Gate Bridge').first()).toBeVisible();
  });

  test('Learner PRO paywall opens and closes cleanly', async ({ page }) => {
    await page.getByRole('button', { name: 'Unlock Learner PRO for $4.99 a month' }).click();
    const heading = page.getByText('Practice smarter for your road test');
    await expect(heading).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(heading).toBeHidden();
  });

  test('Site is installable: manifest with PNG icons and a service worker file', async ({ page, request }) => {
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifest = await (await request.get(manifestHref)).json();
    expect(manifest.display).toBe('standalone');
    const sizes = manifest.icons.filter((i) => i.type === 'image/png').map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
    expect((await request.get('/sw.js')).status()).toBe(200);
  });

  test('California guide page is served as plain HTML and links into the app', async ({ page }) => {
    await page.goto('/guides/california-learner-permit-practice-hours/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('California learner');
    await expect(page.getByText('50 hours with a licensed adult aged 25 or older')).toBeVisible();
    const cta = page.getByRole('link', { name: 'Open RoadReady' }).first();
    await expect(cta).toHaveAttribute('href', /utm_source=guide/);
  });
});
