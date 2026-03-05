import { test, expect } from '@playwright/test';

/**
 * Visual audit — screenshots at EVERY step of the user flow.
 * This is what the user actually sees.
 */
test('visual walkthrough of entire prod-app user flow', async ({ page }) => {
  test.setTimeout(120000);
  const shots = '/tmp/prod-visual';
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  // Fresh session
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${shots}-01-landing.png`, fullPage: true });
  console.log('SHOT 01: Landing page');

  // Step 1: Enter Platform
  const enterBtn = page.locator('button:has-text("Enter Platform")').first();
  if (await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await enterBtn.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: `${shots}-02-after-enter.png`, fullPage: true });
  console.log('SHOT 02: After Enter Platform');

  // Step 2: DoD Consent
  const consentBtn = page.locator('#dodConsentBanner button').first();
  if (await consentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await consentBtn.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: `${shots}-03-after-consent.png`, fullPage: true });
  console.log('SHOT 03: After DoD Consent');

  // Step 3: CAC Auth
  const cacBtn = page.locator('button:has-text("Authenticate with CAC")').first();
  if (await cacBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cacBtn.click();
    await page.waitForTimeout(4000);
  }
  await page.screenshot({ path: `${shots}-04-after-cac.png`, fullPage: true });
  console.log('SHOT 04: After CAC Auth');

  // Step 4: Onboarding
  const overlay = page.locator('#onboardOverlay');
  if (await overlay.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.screenshot({ path: `${shots}-05-onboard-step0.png`, fullPage: false });
    console.log('SHOT 05: Onboarding step 0');

    // Select enterprise tier
    await page.evaluate(() => {
      const card = document.querySelector('.onboard-tier[data-tier="enterprise"]');
      if (card && window.selectOnboardTier) window.selectOnboardTier(card, 'enterprise');
    });
    await page.waitForTimeout(300);

    // Step through all onboarding steps with screenshots
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => { if (window.onboardNext) window.onboardNext(); });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${shots}-06-onboard-step${i+1}.png`, fullPage: false });
      console.log(`SHOT 06-${i+1}: Onboarding step ${i+1}`);
    }
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${shots}-07-after-onboard.png`, fullPage: false });
  console.log('SHOT 07: After onboarding complete');

  // Step 5: Role selector
  const roleModal = page.locator('#roleModal');
  if (await roleModal.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.screenshot({ path: `${shots}-08-role-selector.png`, fullPage: false });
    console.log('SHOT 08: Role selector');
    
    // Select first role card and apply
    await page.evaluate(() => {
      const card = document.querySelector('.role-card');
      if (card) card.click();
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (window.applyRole) window.applyRole(); });
    await page.waitForTimeout(1000);
  } else {
    console.log('NO ROLE MODAL - applying role directly');
    await page.evaluate(() => { if (window.applyRole) window.applyRole(); });
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: `${shots}-09-workspace.png`, fullPage: false });
  console.log('SHOT 09: Main workspace after role applied');

  // ===== NOW TEST EACH FEATURE THE USER REPORTED =====

  // FEATURE 1: AI Agent
  console.log('\n--- FEATURE: AI AGENT ---');
  const aiState1 = await page.evaluate(() => {
    const w = document.getElementById('aiFloatWrapper');
    return w ? { display: w.style.display, computed: getComputedStyle(w).display, html: w.outerHTML.substring(0, 200) } : 'NOT FOUND';
  });
  console.log('AI wrapper state:', JSON.stringify(aiState1));
  
  await page.evaluate(() => { if (window.toggleAiAgent) window.toggleAiAgent(); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}-10-ai-agent-open.png`, fullPage: false });
  console.log('SHOT 10: AI agent toggled open');
  
  const aiState2 = await page.evaluate(() => {
    const w = document.getElementById('aiFloatWrapper');
    const p = document.getElementById('aiFloatPanel');
    return {
      wrapper: w ? { display: w.style.display, computed: getComputedStyle(w).display } : 'NOT FOUND',
      panel: p ? { classes: p.className, display: p.style.display, computed: getComputedStyle(p).display } : 'NOT FOUND',
    };
  });
  console.log('AI state after toggle:', JSON.stringify(aiState2));

  // Close AI
  await page.evaluate(() => { if (window.toggleAiAgent) window.toggleAiAgent(); });
  await page.waitForTimeout(500);

  // FEATURE 2: Verify Channel Hub
  console.log('\n--- FEATURE: VERIFY CHANNEL HUB ---');
  await page.evaluate(() => { window.showSection('sectionVerify'); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}-11-verify-section.png`, fullPage: false });
  console.log('SHOT 11: Verify section');
  
  const verifyState = await page.evaluate(() => {
    const tab = document.getElementById('tabVerify');
    const input = document.getElementById('verifyInput');
    const btn = document.getElementById('verifyBtn');
    return {
      tab: tab ? { display: tab.style.display, visible: tab.offsetParent !== null } : 'NOT FOUND',
      input: input ? { visible: input.offsetParent !== null } : 'NOT FOUND',
      btn: btn ? { visible: btn.offsetParent !== null, text: btn.textContent?.trim()?.substring(0,30) } : 'NOT FOUND',
    };
  });
  console.log('Verify state:', JSON.stringify(verifyState));

  // FEATURE 3: ILS Section with tools
  console.log('\n--- FEATURE: ILS / ANCHOR-S4 TOOLS ---');
  await page.evaluate(() => { window.showSection('sectionILS'); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}-12-ils-section.png`, fullPage: false });
  console.log('SHOT 12: ILS section (tool grid)');

  // Open each tool and screenshot
  const tools = ['anchor', 'hub-analysis', 'hub-team', 'hub-vault', 'hub-dmsms', 'hub-verify'];
  for (const tool of tools) {
    await page.evaluate((t) => { if (window.openILSTool) window.openILSTool(t); }, tool);
    await page.waitForTimeout(600);
    const state = await page.evaluate((t) => {
      const el = document.getElementById(t);
      if (!el) return { id: t, found: false };
      return { id: t, found: true, visible: el.offsetParent !== null, display: el.style.display, classes: el.className };
    }, tool);
    console.log(`Tool "${tool}":`, JSON.stringify(state));
  }

  // Screenshot anchor tool specifically
  await page.evaluate(() => { window.openILSTool('anchor'); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}-13-anchor-tool.png`, fullPage: false });
  console.log('SHOT 13: Anchor tool open');

  // Check anchor inputs/buttons
  const anchorState = await page.evaluate(() => {
    const input = document.getElementById('recordInput');
    const btn = document.getElementById('anchorBtn');
    const catDrop = document.getElementById('categorySelect');
    const priDrop = document.getElementById('prioritySelect');
    return {
      recordInput: input ? { visible: input.offsetParent !== null, tag: input.tagName } : 'NOT FOUND',
      anchorBtn: btn ? { visible: btn.offsetParent !== null, text: btn.textContent?.trim() } : 'NOT FOUND',
      categorySelect: catDrop ? { visible: catDrop.offsetParent !== null, options: catDrop.options?.length } : 'NOT FOUND',
      prioritySelect: priDrop ? { visible: priDrop.offsetParent !== null, options: priDrop.options?.length } : 'NOT FOUND',
    };
  });
  console.log('Anchor tool state:', JSON.stringify(anchorState));

  // FEATURE 4: My Team
  console.log('\n--- FEATURE: MY TEAM ---');
  await page.evaluate(() => { window.openILSTool('hub-team'); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}-14-team.png`, fullPage: false });
  console.log('SHOT 14: Team panel');

  // FEATURE 5: My Analysis
  console.log('\n--- FEATURE: MY ANALYSIS ---');
  await page.evaluate(() => { window.openILSTool('hub-analysis'); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}-15-analysis.png`, fullPage: false });
  console.log('SHOT 15: Analysis panel');

  // FEATURE 6: Unclassified bar
  console.log('\n--- FEATURE: UNCLASSIFIED BAR ---');
  const bannerState = await page.evaluate(() => {
    const itar = document.getElementById('itarBanner');
    const classif = document.getElementById('s4ClassificationBanner');
    const slsBar = document.getElementById('slsBar');
    return {
      itarBanner: itar ? { 
        visible: itar.offsetParent !== null, 
        position: getComputedStyle(itar).position,
        top: getComputedStyle(itar).top,
        text: itar.textContent?.trim()?.substring(0,60)
      } : 'NOT FOUND',
      classificationBanner: classif ? {
        visible: classif.offsetParent !== null,
        position: getComputedStyle(classif).position,
        text: classif.textContent?.trim()
      } : 'NOT FOUND',
      slsBar: slsBar ? {
        visible: slsBar.offsetParent !== null,
        display: slsBar.style.display,
        text: slsBar.textContent?.trim()?.substring(0,80)
      } : 'NOT FOUND',
    };
  });
  console.log('Banner state:', JSON.stringify(bannerState));

  // FEATURE 7: Wallet/SLS area  
  console.log('\n--- FEATURE: WALLET ---');
  await page.evaluate(() => { window.showSection('sectionWallet'); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}-16-wallet.png`, fullPage: false });
  console.log('SHOT 16: Wallet section');

  // FEATURE 8: Metrics
  console.log('\n--- FEATURE: METRICS ---');
  await page.evaluate(() => { window.showSection('sectionMetrics'); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}-17-metrics.png`, fullPage: false });
  console.log('SHOT 17: Metrics section');

  // FEATURE 9: Anchor section (the main anchor tab, not ILS tool)
  console.log('\n--- FEATURE: ANCHOR SECTION ---');
  await page.evaluate(() => { window.showSection('sectionAnchor'); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}-18-anchor-section.png`, fullPage: false });
  console.log('SHOT 18: Anchor main section');

  // Dump full DOM visibility summary
  const domSummary = await page.evaluate(() => {
    const ids = ['platformWorkspace', 'tabAnchor', 'tabVerify', 'tabLog', 'sectionSystems', 
                 'tabMetrics', 'tabOffline', 'tabILS', 'tabWallet', 'aiFloatWrapper', 'aiFloatPanel',
                 'itarBanner', 's4ClassificationBanner', 'slsBar', 'onboardOverlay', 'roleModal',
                 'anchor', 'hub-analysis', 'hub-team', 'hub-vault', 'hub-dmsms', 'hub-verify',
                 'recordInput', 'anchorBtn', 'verifyInput', 'verifyBtn'];
    const result = {};
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) { result[id] = 'NOT IN DOM'; return; }
      result[id] = {
        display: el.style.display || '(unset)',
        computed: getComputedStyle(el).display,
        visible: el.offsetParent !== null,
      };
    });
    return result;
  });
  console.log('\n=== FULL DOM VISIBILITY SUMMARY ===');
  console.log(JSON.stringify(domSummary, null, 2));

  console.log('\n=== PAGE ERRORS ===');
  console.log(JSON.stringify(errors));
  console.log('Total errors:', errors.length);
});
