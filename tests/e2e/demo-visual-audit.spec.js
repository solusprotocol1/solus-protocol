import { test } from '@playwright/test';

/**
 * Visual audit of DEMO-APP for comparison with prod-app.
 */
test('visual walkthrough of demo-app', async ({ page }) => {
  test.setTimeout(120000);
  const shots = '/tmp/demo-visual';
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  // Go to demo-app
  await page.goto('http://localhost:8080/demo-app/', { waitUntil: 'networkidle' });
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.goto('http://localhost:8080/demo-app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Enter platform
  const enterBtn = page.locator('button:has-text("Enter Platform")').first();
  if (await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await enterBtn.click();
    await page.waitForTimeout(1000);
  }
  // DoD Consent
  const consentBtn = page.locator('#dodConsentBanner button').first();
  if (await consentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await consentBtn.click();
    await page.waitForTimeout(1000);
  }
  // CAC login
  const cacBtn = page.locator('button:has-text("Authenticate with CAC"), button:has-text("Start Demo Session")').first();
  if (await cacBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cacBtn.click();
    await page.waitForTimeout(4000);
  }
  // Onboarding
  const overlay = page.locator('#onboardOverlay');
  if (await overlay.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.evaluate(() => {
      const card = document.querySelector('.onboard-tier[data-tier="enterprise"]');
      if (card && window.selectOnboardTier) window.selectOnboardTier(card, 'enterprise');
    });
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => { if (window.onboardNext) window.onboardNext(); });
      await page.waitForTimeout(800);
    }
  }
  await page.waitForTimeout(1000);
  // Role
  await page.evaluate(() => { if (window.applyRole) window.applyRole(); });
  await page.waitForTimeout(1000);

  // WORKSPACE
  await page.screenshot({ path: `${shots}-09-workspace.png`, fullPage: false });
  console.log('DEMO SHOT 09: workspace');

  // AI Agent
  await page.evaluate(() => { if (window.toggleAiAgent) window.toggleAiAgent(); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}-10-ai-agent.png`, fullPage: false });
  console.log('DEMO SHOT 10: AI agent');
  await page.evaluate(() => { if (window.toggleAiAgent) window.toggleAiAgent(); });
  await page.waitForTimeout(300);

  // Verify
  await page.evaluate(() => { window.showSection('sectionVerify'); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}-11-verify.png`, fullPage: false });

  // ILS
  await page.evaluate(() => { window.showSection('sectionILS'); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}-12-ils.png`, fullPage: false });

  // Hub tools
  await page.evaluate(() => { window.openILSTool('hub-analysis'); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}-15-analysis.png`, fullPage: false });

  await page.evaluate(() => { window.openILSTool('hub-team'); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}-14-team.png`, fullPage: false });

  // Anchor section
  await page.evaluate(() => { window.showSection('sectionAnchor'); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}-18-anchor.png`, fullPage: false });

  // Wallet
  await page.evaluate(() => { window.showSection('sectionWallet'); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}-16-wallet.png`, fullPage: false });

  // DOM summary
  const domSummary = await page.evaluate(() => {
    const ids = ['platformWorkspace', 'tabAnchor', 'tabVerify', 'tabILS', 'tabWallet', 
                 'aiFloatWrapper', 'aiFloatPanel', 'itarBanner', 's4ClassificationBanner', 
                 'slsBar', 'anchor', 'hub-analysis', 'hub-team', 'hub-vault', 'hub-verify',
                 'recordInput', 'anchorBtn', 'verifyInput', 'verifyBtn'];
    const result = {};
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) { result[id] = 'NOT IN DOM'; return; }
      result[id] = { display: el.style.display || '(unset)', computed: getComputedStyle(el).display, visible: el.offsetParent !== null };
    });
    return result;
  });
  console.log('\n=== DEMO DOM SUMMARY ===');
  console.log(JSON.stringify(domSummary, null, 2));
  console.log('Errors:', JSON.stringify(errors));
});
