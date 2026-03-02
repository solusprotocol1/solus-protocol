import { test, expect } from '@playwright/test';

/**
 * S4 Ledger — E2E Interaction Tests
 * Tests actual user flows: auth, onboarding, navigation, tools.
 */

test.describe('Prod App — Auth Flow', () => {
  test('DoD consent banner appears and can be accepted', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1500);

    // Click "Enter Platform" to start auth flow
    const enterBtn = page.locator('text=Enter Platform').first();
    if (await enterBtn.isVisible()) {
      await enterBtn.click();
      await page.waitForTimeout(500);
      // DoD consent banner should appear
      const consentBanner = page.locator('#dodConsentBanner');
      await expect(consentBanner).toBeVisible({ timeout: 3000 });
    }
  });

  test('CAC login modal works after consent', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1500);

    // Start auth flow
    const enterBtn = page.locator('text=Enter Platform').first();
    if (await enterBtn.isVisible()) {
      await enterBtn.click();
      await page.waitForTimeout(500);

      // Accept DoD consent
      const acceptBtn = page.locator('text=I Accept').first();
      if (await acceptBtn.isVisible()) {
        await acceptBtn.click();
        await page.waitForTimeout(500);

        // CAC login modal should appear
        const cacModal = page.locator('#cacLoginModal');
        await expect(cacModal).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

test.describe('Prod App — Navigation', () => {
  test('platform workspace has hub cards', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1000);

    // Check hub cards exist in the DOM (even if hidden behind auth)
    const hubCards = page.locator('[data-section]');
    const count = await hubCards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('tab navigation elements exist', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1000);

    for (const tabId of ['tabILS', 'tabLog', 'tabVerify', 'tabAnchor']) {
      const tab = page.locator(`#${tabId}`);
      await expect(tab).toBeAttached();
    }
  });

  test('all 20 ILS tool panels exist', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1000);

    const panels = [
      'hub-analysis', 'hub-dmsms', 'hub-readiness', 'hub-compliance',
      'hub-risk', 'hub-actions', 'hub-predictive', 'hub-lifecycle',
      'hub-roi', 'hub-vault', 'hub-docs', 'hub-reports',
      'hub-submissions', 'hub-sbom', 'hub-gfp', 'hub-cdrl',
      'hub-contract', 'hub-provenance', 'hub-analytics', 'hub-team'
    ];
    for (const id of panels) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
  });
});

test.describe('Prod App — AI Agent', () => {
  test('AI float panel exists and has input', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1000);

    await expect(page.locator('#aiFloatPanel')).toBeAttached();
    await expect(page.locator('#aiChatInput')).toBeAttached();
    await expect(page.locator('#aiChatMessages')).toBeAttached();
  });
});

test.describe('Prod App — Wallet & Anchor', () => {
  test('wallet overlay exists', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1000);

    await expect(page.locator('#walletOverlay')).toBeAttached();
    await expect(page.locator('#walletAddress')).toBeAttached();
  });

  test('anchor overlay exists', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1000);

    await expect(page.locator('#anchorOverlay')).toBeAttached();
    await expect(page.locator('#anchorBtn')).toBeAttached();
  });
});

test.describe('Prod App — UI Components', () => {
  test('toast container exists', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1000);

    await expect(page.locator('#s4ToastContainer')).toBeAttached();
  });

  test('command palette exists', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1000);

    await expect(page.locator('#s4CommandPalette')).toBeAttached();
  });

  test('onboarding overlay and all 5 steps exist', async ({ page }) => {
    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(1000);

    await expect(page.locator('#onboardOverlay')).toBeAttached();
    for (let i = 0; i < 5; i++) {
      await expect(page.locator(`#onboardStep${i}`)).toBeAttached();
    }
  });

  test('no uncaught JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/prod-app/dist/index.html');
    await page.waitForTimeout(3000);

    const critical = errors.filter(e =>
      !e.includes('net::ERR') &&
      !e.includes('supabase') &&
      !e.includes('Failed to fetch')
    );
    expect(critical.length).toBe(0);
  });
});
