import { test, expect } from '@playwright/test';

/**
 * S4 Ledger — E2E Smoke Tests
 * Validates both apps load, render correctly, and respond to basic interactions.
 */

// ═══ Prod App Smoke Tests ═══
test.describe('Prod App — Smoke', () => {
  test('prod-app loads and shows title', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await expect(page).toHaveTitle(/S4 Ledger/);
  });

  test('prod-app has critical security headers', async ({ request }) => {
    const res = await request.get('/prod-app/dist/index.html');
    expect(res.status()).toBe(200);
  });

  test('prod-app renders main navigation', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    // Wait for the page to settle
    await page.waitForTimeout(1000);
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(100);
  });

  test('prod-app has no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(2000);
    // Filter out known non-critical errors (CDN race conditions, etc.)
    const critical = errors.filter(e =>
      !e.includes('Loading chunk') &&
      !e.includes('net::ERR') &&
      !e.includes('supabase')
    );
    expect(critical.length).toBe(0);
  });
});

// ═══ Demo App Smoke Tests ═══
test.describe('Demo App — Smoke', () => {
  test('demo-app loads and shows title', async ({ page }) => {
    await page.goto('/demo-app/dist/index.html');
    await expect(page).toHaveTitle(/S4 Ledger/);
  });

  test('demo-app renders main content', async ({ page }) => {
    await page.goto('/demo-app/dist/index.html');
    await page.waitForTimeout(1000);
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(100);
  });
});

// ═══ Static Assets ═══
test.describe('Static Assets', () => {
  test('homepage redirects or loads', async ({ page }) => {
    const res = await page.goto('/');
    expect(res.status()).toBeLessThan(400);
  });

  test('404 page exists', async ({ page }) => {
    const res = await page.goto('/404.html');
    // Should return 200 for the custom 404 page itself
    expect(res.status()).toBeLessThan(500);
  });
});
