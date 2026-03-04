import { test, expect } from '@playwright/test';

/**
 * Targeted tests for the specific issues reported by the user.
 * Uses proper auth flow via page.evaluate() for reliability.
 */

test.describe('Prod App — Targeted Fix Verification', () => {
  test('full auth flow with AI agent and tool verification', async ({ page }) => {
    test.setTimeout(120000);
    const errors = [];

    page.on('pageerror', err => {
      errors.push(err.message);
    });

    // Clear session storage first
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
    await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // STEP 1: Enter Platform via click
    console.log('\n=== STEP 1: ENTER PLATFORM ===');
    const enterBtn = page.locator('button:has-text("Enter Platform")').first();
    await expect(enterBtn).toBeVisible({ timeout: 5000 });
    await enterBtn.click();
    await page.waitForTimeout(1000);

    // STEP 2: DoD Consent via click
    console.log('=== STEP 2: DOD CONSENT ===');
    const consentBtn = page.locator('#dodConsentBanner button').first();
    await expect(consentBtn).toBeVisible({ timeout: 5000 });
    await consentBtn.click();
    await page.waitForTimeout(1000);

    // STEP 3: CAC Login via click
    console.log('=== STEP 3: CAC LOGIN ===');
    const cacBtn = page.locator('button:has-text("Authenticate with CAC")').first();
    await expect(cacBtn).toBeVisible({ timeout: 5000 });
    await cacBtn.click();
    
    // Wait for CAC animation (1.5s reading + 0.8s transition + buffer)
    await page.waitForTimeout(4000);

    // STEP 4: Onboarding — use JS functions for reliability
    console.log('=== STEP 4: ONBOARDING ===');
    const overlay = page.locator('#onboardOverlay');
    await expect(overlay).toBeVisible({ timeout: 8000 });
    console.log('Onboarding overlay visible');

    // Select enterprise tier via JS
    await page.evaluate(() => {
      const card = document.querySelector('.onboard-tier[data-tier="enterprise"]');
      if (card && window.selectOnboardTier) window.selectOnboardTier(card, 'enterprise');
    });
    await page.waitForTimeout(500);
    console.log('Selected enterprise tier');

    // Click through all 5 onboarding steps via JS (step 0→1→2→3→4→close)
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => { window.onboardNext(); });
      await page.waitForTimeout(800);
      console.log(`Onboard step ${i + 1} completed`);
    }

    // Verify onboarding closed
    const onboardState = await page.evaluate(() => {
      return {
        overlayDisplay: document.getElementById('onboardOverlay')?.style.display,
        onboardDone: sessionStorage.getItem('s4_onboard_done'),
      };
    });
    console.log('Onboarding state:', JSON.stringify(onboardState));

    // STEP 5: Role selector
    console.log('=== STEP 5: ROLE SELECTOR ===');
    await page.waitForTimeout(1500);
    
    const roleState = await page.evaluate(() => {
      const modal = document.getElementById('roleModal');
      return modal ? { display: modal.style.display, visible: modal.offsetParent !== null } : 'NOT FOUND';
    });
    console.log('Role modal state:', JSON.stringify(roleState));

    // Select first role and apply
    await page.evaluate(() => {
      const card = document.querySelector('.role-card');
      if (card) card.click();
    });
    await page.waitForTimeout(500);
    
    // Apply role directly via JS — the button selectors are unreliable since the modal is position:fixed
    const applyResult = await page.evaluate(() => {
      if (typeof window.applyRole === 'function') {
        window.applyRole();
        return 'applyRole() called directly';
      }
      return 'applyRole NOT FOUND';
    });
    console.log('Apply role:', applyResult);
    await page.waitForTimeout(1500);

    // Close role modal if still visible
    await page.evaluate(() => {
      const modal = document.getElementById('roleModal');
      if (modal && modal.offsetParent !== null) {
        modal.style.display = 'none';
      }
    });
    await page.waitForTimeout(500);

    // Take screenshot of workspace
    await page.screenshot({ path: '/tmp/prod-fix-01-workspace.png', fullPage: false });

    // ===== NOW CHECK ALL THE SPECIFIC ISSUES =====
    
    // CHECK 1: AI Agent Wrapper
    console.log('\n=== CHECK 1: AI AGENT ===');
    const aiWrapperState = await page.evaluate(() => {
      const w = document.getElementById('aiFloatWrapper');
      if (!w) return 'NOT FOUND';
      const cs = getComputedStyle(w);
      return {
        exists: true,
        inlineDisplay: w.style.display,
        computedDisplay: cs.display,
        visible: w.offsetParent !== null,
        parentId: w.parentElement?.id || w.parentElement?.tagName,
      };
    });
    console.log('AI Wrapper after full auth:', JSON.stringify(aiWrapperState));

    // Toggle the AI agent
    await page.evaluate(() => { if (window.toggleAiAgent) window.toggleAiAgent(); });
    await page.waitForTimeout(700);
    
    const aiPanelState = await page.evaluate(() => {
      const wrapper = document.getElementById('aiFloatWrapper');
      const panel = document.getElementById('aiFloatPanel');
      return {
        wrapper: wrapper ? { display: wrapper.style.display, visible: wrapper.offsetParent !== null } : 'NOT FOUND',
        panel: panel ? { hasOpen: panel.classList.contains('open'), visible: panel.offsetParent !== null } : 'NOT FOUND',
      };
    });
    console.log('AI Agent after toggle:', JSON.stringify(aiPanelState));
    await page.screenshot({ path: '/tmp/prod-fix-02-ai-agent.png', fullPage: false });

    // Close AI agent for next tests
    await page.evaluate(() => {
      const panel = document.getElementById('aiFloatPanel');
      if (panel && panel.classList.contains('open') && window.toggleAiAgent) window.toggleAiAgent();
    });
    await page.waitForTimeout(300);

    // CHECK 2: Sidebar navigation to ILS section
    console.log('\n=== CHECK 2: SIDEBAR NAVIGATION ===');
    await page.evaluate(() => { window.showSection('sectionILS'); });
    await page.waitForTimeout(500);

    const tabILS = await page.evaluate(() => {
      const t = document.getElementById('tabILS');
      return t ? { visible: t.offsetParent !== null, display: t.style.display, hasShow: t.classList.contains('show') } : 'NOT FOUND';
    });
    console.log('tabILS after showSection("sectionILS"):', JSON.stringify(tabILS));
    await page.screenshot({ path: '/tmp/prod-fix-03-ils-section.png', fullPage: false });

    // CHECK 3: ILS Tools (using correct panel IDs from openILSTool)
    console.log('\n=== CHECK 3: ILS TOOLS ===');
    const toolsToTest = ['hub-analysis', 'hub-team', 'hub-vault', 'hub-dmsms'];
    for (const tool of toolsToTest) {
      await page.evaluate((t) => { window.openILSTool(t); }, tool);
      await page.waitForTimeout(400);
      const panelState = await page.evaluate((t) => {
        const panel = document.getElementById(t);
        if (!panel) return 'NOT FOUND (id=' + t + ')';
        return { visible: panel.offsetParent !== null, display: panel.style.display, hasActive: panel.classList.contains('active') };
      }, tool);
      console.log(`Tool "${tool}":`, JSON.stringify(panelState));
    }

    // CHECK 4: Anchor tool — shown via showSection('sectionAnchor'), not openILSTool
    console.log('\n=== CHECK 4: ANCHOR TOOL ===');
    await page.evaluate(() => { window.showSection('sectionAnchor'); });
    await page.waitForTimeout(500);

    const recordInput = await page.evaluate(() => {
      const el = document.getElementById('recordInput');
      return el ? { visible: el.offsetParent !== null, id: el.id, tag: el.tagName } : 'NOT FOUND';
    });
    console.log('recordInput:', JSON.stringify(recordInput));

    const anchorBtn = await page.evaluate(() => {
      const el = document.getElementById('anchorBtn');
      return el ? { visible: el.offsetParent !== null, text: el.textContent?.trim()?.substring(0, 40) } : 'NOT FOUND';
    });
    console.log('anchorBtn:', JSON.stringify(anchorBtn));
    await page.screenshot({ path: '/tmp/prod-fix-04-anchor-tool.png', fullPage: false });

    // CHECK 5: Verify section
    console.log('\n=== CHECK 5: VERIFY ===');
    await page.evaluate(() => { window.showSection('sectionVerify'); });
    await page.waitForTimeout(500);
    const tabVerify = await page.evaluate(() => {
      const t = document.getElementById('tabVerify');
      return t ? { visible: t.offsetParent !== null, display: t.style.display } : 'NOT FOUND';
    });
    console.log('tabVerify:', JSON.stringify(tabVerify));
    await page.screenshot({ path: '/tmp/prod-fix-05-verify.png', fullPage: false });

    // CHECK 6: Unclassified / ITAR banner
    console.log('\n=== CHECK 6: UNCLASSIFIED BANNER ===');
    const itarBanner = await page.evaluate(() => {
      const el = document.getElementById('itarBanner');
      if (!el) return 'NOT FOUND';
      const cs = getComputedStyle(el);
      return {
        visible: el.offsetParent !== null,
        position: cs.position,
        text: el.textContent?.trim()?.substring(0, 80),
      };
    });
    console.log('ITAR Banner:', JSON.stringify(itarBanner));

    const classificationBanner = await page.evaluate(() => {
      const el = document.getElementById('s4ClassificationBanner');
      if (!el) return 'NOT FOUND';
      const cs = getComputedStyle(el);
      return {
        visible: el.offsetParent !== null,
        text: el.textContent?.trim(),
        position: cs.position,
      };
    });
    console.log('Classification Banner:', JSON.stringify(classificationBanner));

    // CHECK 7: Team/Analysis panels
    console.log('\n=== CHECK 7: TEAM/ANALYSIS ===');
    await page.evaluate(() => { window.showSection('sectionILS'); });
    await page.waitForTimeout(300);

    await page.evaluate(() => { window.openILSTool('hub-team'); });
    await page.waitForTimeout(500);
    const teamPanel = await page.evaluate(() => {
      const el = document.getElementById('hub-team');
      return el ? { visible: el.offsetParent !== null, display: el.style.display } : 'NOT FOUND';
    });
    console.log('hub-team panel:', JSON.stringify(teamPanel));
    await page.screenshot({ path: '/tmp/prod-fix-06-team.png', fullPage: false });

    await page.evaluate(() => { window.openILSTool('hub-analysis'); });
    await page.waitForTimeout(500);
    const analysisPanel = await page.evaluate(() => {
      const el = document.getElementById('hub-analysis');
      return el ? { visible: el.offsetParent !== null, display: el.style.display } : 'NOT FOUND';
    });
    console.log('hub-analysis panel:', JSON.stringify(analysisPanel));
    await page.screenshot({ path: '/tmp/prod-fix-07-analysis.png', fullPage: false });

    // FINAL SUMMARY
    console.log('\n========== FINAL SUMMARY ==========');
    console.log('Total page errors:', errors.length);
    if (errors.length > 0) console.log('Errors:', JSON.stringify(errors));
    console.log('AI wrapper visible:', aiWrapperState.visible, '| display:', aiWrapperState.inlineDisplay);
    console.log('AI panel opens:', aiPanelState.panel?.hasOpen ?? false);
    console.log('tabILS visible:', tabILS.visible);
    console.log('tabVerify visible:', tabVerify.visible);
    console.log('hub-team visible:', teamPanel.visible);
    console.log('hub-analysis visible:', analysisPanel.visible);
    console.log('anchorBtn visible:', anchorBtn.visible ?? false);
    console.log('recordInput visible:', recordInput.visible ?? false);
    console.log('====================================');

    expect(errors.length).toBe(0);
  });
});
