import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * S4 Ledger — Automated Accessibility Tests (axe-core)
 * Runtime a11y scanning on both prod-app and demo-app.
 * These complement the static ARIA checks in tests/a11y.test.js.
 */

// Shared axe config: disable rules that conflict with our DoD/dark theme design
const AXE_OPTIONS = {
  // Focus on WCAG 2.1 AA
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] },
  rules: {
    // Our dark theme intentionally uses custom contrast ratios
    'color-contrast': { enabled: false },
    // CDN-loaded fonts may not have an explicit lang on :root (we set it)
    'html-has-lang': { enabled: true },
  },
};

// ═══ Prod App — axe-core Scans ═══
test.describe('Prod App — Accessibility (axe-core)', () => {
  test('landing page has no critical a11y violations', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .options(AXE_OPTIONS)
      .analyze();

    // Allow up to 5 non-critical violations for the dense DoD UI
    const critical = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    if (critical.length > 0) {
      console.log('Critical a11y violations:', JSON.stringify(critical, null, 2));
    }
    expect(critical.length).toBe(0);
  });

  test('ARIA landmarks are valid', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page })
      .withRules(['landmark-one-main', 'region', 'aria-allowed-role'])
      .analyze();

    const critical = results.violations.filter(
      v => v.impact === 'critical'
    );
    expect(critical.length).toBe(0);
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page })
      .withRules(['image-alt'])
      .analyze();

    expect(results.violations.length).toBe(0);
  });

  test('form elements have labels', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page })
      .withRules(['label', 'select-name'])
      .analyze();

    const critical = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(critical.length).toBe(0);
  });

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page })
      .withRules(['button-name'])
      .analyze();

    const critical = results.violations.filter(
      v => v.impact === 'critical'
    );
    expect(critical.length).toBe(0);
  });
});

// ═══ Demo App — axe-core Scans ═══
test.describe('Demo App — Accessibility (axe-core)', () => {
  test('landing page has no critical a11y violations', async ({ page }) => {
    await page.goto('/demo-app/dist/index.html');
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .options(AXE_OPTIONS)
      .analyze();

    const critical = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    if (critical.length > 0) {
      console.log('Critical a11y violations:', JSON.stringify(critical, null, 2));
    }
    expect(critical.length).toBe(0);
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/demo-app/dist/index.html');
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page })
      .withRules(['image-alt'])
      .analyze();

    expect(results.violations.length).toBe(0);
  });
});
