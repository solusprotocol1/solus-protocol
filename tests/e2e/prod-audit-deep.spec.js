import { test, expect } from '@playwright/test';

/**
 * DEEP PROD-APP AUDIT — Phase 2
 * Now that we know the data, test specific issues:
 * 1. Navigate using REAL section IDs
 * 2. Test each ILS tool opening
 * 3. Test AI agent panel
 * 4. Test verify channel
 * 5. Test unclassified bar rendering
 * 6. Test anchor flow end-to-end
 * 7. Screenshot each state
 */

test.describe('Prod App — Deep Audit Phase 2', () => {
  test('comprehensive click-through audit', async ({ page }) => {
    test.setTimeout(120000);
    const errors = [];

    page.on('pageerror', err => {
      errors.push(err.message);
    });

    // Load prod app
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // ---- AUTH FLOW ----
    // Click Enter Platform
    const enterBtn = page.locator('button:has-text("Enter Platform")').first();
    if (await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enterBtn.click();
      await page.waitForTimeout(1000);
    }

    // Accept DoD consent
    const consentBanner = page.locator('#dodConsentBanner');
    if (await consentBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.locator('#dodConsentBanner button').first().click();
      await page.waitForTimeout(1000);
    }

    // CAC Login
    const cacModal = page.locator('#cacLoginModal');
    if (await cacModal.isVisible({ timeout: 3000 }).catch(() => false)) {
      const cacBtn = page.locator('#cacLoginModal button').first();
      if (await cacBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cacBtn.click();
        await page.waitForTimeout(3500);
      }
      if (await cacModal.isVisible().catch(() => false)) {
        await page.evaluate(() => { document.getElementById('cacLoginModal').style.display = 'none'; });
      }
    }

    // Force workspace if needed
    await page.waitForTimeout(2000);
    if (!await page.locator('#platformWorkspace').isVisible().catch(() => false)) {
      await page.evaluate(() => {
        var l = document.getElementById('platformLanding');
        var h = document.querySelector('.hero');
        var w = document.getElementById('platformWorkspace');
        if (l) l.style.display = 'none';
        if (h) h.style.display = 'none';
        if (w) w.style.display = 'block';
        sessionStorage.setItem('s4_entered', '1');
      });
      await page.waitForTimeout(1000);
    }

    // Handle onboarding
    const overlay = page.locator('#onboardOverlay');
    if (await overlay.isVisible({ timeout: 2000 }).catch(() => false)) {
      const tierCard = page.locator('.onboard-tier[data-tier="enterprise"]');
      if (await tierCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tierCard.click();
        await page.waitForTimeout(500);
      }
      const okBtn = page.locator('.onboard-btn').first();
      if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await okBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    if (await overlay.isVisible().catch(() => false)) {
      await page.evaluate(() => { document.getElementById('onboardOverlay').style.display = 'none'; });
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: '/tmp/prod-01-workspace.png', fullPage: false });

    // ---- AUDIT: Workspace initial state ----
    console.log('\n===== WORKSPACE LOADED =====');

    // Check SLS bar (unclassified bar)
    const slsBar = await page.evaluate(() => {
      const bar = document.querySelector('.sls-bar, #slsBar, [class*="sls-bar"]');
      if (!bar) return 'NOT FOUND';
      return {
        html: bar.innerHTML.substring(0, 500),
        visible: bar.offsetParent !== null,
        className: bar.className,
        computedBG: getComputedStyle(bar).backgroundColor,
      };
    });
    console.log('SLS BAR:', JSON.stringify(slsBar, null, 2));

    // Check classification/unclassified banner at top
    const topBanner = await page.evaluate(() => {
      // Look for classification banner - usually the very top bar
      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (el.children.length === 0 && el.textContent?.trim() === 'UNCLASSIFIED') {
          const rect = el.getBoundingClientRect();
          return {
            text: el.textContent.trim(),
            tag: el.tagName,
            class: el.className,
            parentTag: el.parentElement?.tagName,
            parentClass: el.parentElement?.className?.substring(0, 80),
            parentId: el.parentElement?.id,
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
            parentStyle: el.parentElement?.getAttribute('style')?.substring(0, 200),
          };
        }
      }
      return 'NOT FOUND';
    });
    console.log('UNCLASSIFIED BANNER:', JSON.stringify(topBanner, null, 2));

    // ---- TEST: Click Anchor-S4 sidebar ----
    console.log('\n===== TEST: ANCHOR-S4 SECTION =====');
    await page.evaluate(() => { window.showSection('sectionILS'); });
    await page.waitForTimeout(1000);
    
    const sectionILS = await page.evaluate(() => {
      const s = document.getElementById('sectionILS');
      return s ? { visible: s.offsetParent !== null, display: s.style.display, childCount: s.children.length } : 'NOT FOUND';
    });
    console.log('sectionILS after showSection:', JSON.stringify(sectionILS));
    await page.screenshot({ path: '/tmp/prod-02-sectionILS.png', fullPage: false });

    // List ALL sections and their visibility
    const allSections = await page.evaluate(() => {
      const sections = document.querySelectorAll('[id^="section"], .workspace-section, [class*="section"]');
      return Array.from(sections).map(s => ({
        id: s.id,
        visible: s.offsetParent !== null,
        display: s.style.display,
        class: s.className?.substring(0, 60),
      }));
    });
    console.log('ALL SECTIONS:', JSON.stringify(allSections, null, 2));

    // ---- TEST: Open ILS tools ----
    console.log('\n===== TEST: ILS TOOLS =====');
    const ilsToolNames = await page.evaluate(() => {
      const cards = document.querySelectorAll('[onclick*="openILSTool"]');
      return Array.from(cards).map(c => ({
        text: c.textContent?.trim()?.substring(0, 40),
        onclick: c.getAttribute('onclick'),
        visible: c.offsetParent !== null,
      }));
    });
    console.log('ILS TOOL CARDS:', JSON.stringify(ilsToolNames, null, 2));

    // Try opening each tool
    const toolTests = ['anchor', 'supply', 'custody', 'ordnance', 'maintenance', 'crossLogistics',
      'hub-verify', 'hub-team', 'hub-analysis', 'hub-vault', 'hub-ai', 'hub-metrics',
      'hub-submission-review', 'compliance', 'lifecycle', 'readiness',
      'gfp', 'cdrl', 'dmsms', 'sbom', 'roi', 'risk', 'contract', 'predictive'];
    
    for (const tool of toolTests) {
      const result = await page.evaluate((t) => {
        try {
          window.openILSTool(t);
          return { success: true };
        } catch (e) {
          return { error: e.message };
        }
      }, tool);
      if (result.error) {
        console.log(`openILSTool("${tool}"): ERROR - ${result.error}`);
      }
    }
    await page.waitForTimeout(500);
    console.log('ERRORS AFTER ILS TOOLS:', JSON.stringify(errors));
    await page.screenshot({ path: '/tmp/prod-03-ils-tools.png', fullPage: false });

    // ---- TEST: Anchor tool specifically ----
    console.log('\n===== TEST: ANCHOR TOOL =====');
    await page.evaluate(() => { window.openILSTool('anchor'); });
    await page.waitForTimeout(500);

    const anchorTool = await page.evaluate(() => {
      // Find the anchor input textarea
      const textareas = document.querySelectorAll('textarea');
      const inputs = document.querySelectorAll('input[type="text"]');
      const anchorBtns = document.querySelectorAll('button');
      
      const texareaInfo = Array.from(textareas).map(t => ({
        id: t.id,
        placeholder: t.placeholder?.substring(0, 40),
        visible: t.offsetParent !== null,
      }));
      
      const anchorButtons = Array.from(anchorBtns)
        .filter(b => b.textContent?.toLowerCase()?.includes('anchor') || b.getAttribute('onclick')?.includes('anchor'))
        .map(b => ({
          text: b.textContent?.trim()?.substring(0, 40),
          onclick: b.getAttribute('onclick'),
          visible: b.offsetParent !== null,
          id: b.id,
        }));

      // Find the section that's currently visible
      const visibleSection = document.querySelector('.ils-tool-content:not([style*="display: none"]), .tool-panel:not([style*="display: none"])');
      
      return {
        textareas: texareaInfo,
        anchorButtons,
        visibleSection: visibleSection ? { id: visibleSection.id, class: visibleSection.className?.substring(0, 60) } : 'not found',
      };
    });
    console.log('ANCHOR TOOL STATE:', JSON.stringify(anchorTool, null, 2));
    await page.screenshot({ path: '/tmp/prod-04-anchor-tool.png', fullPage: false });

    // ---- TEST: Verify Hub ----
    console.log('\n===== TEST: VERIFY HUB =====');
    await page.evaluate(() => { window.showHub('verify'); });
    await page.waitForTimeout(1000);
    
    const verifyState = await page.evaluate(() => {
      // Look for verify-related panels
      const panels = document.querySelectorAll('[id*="verify"], [id*="Verify"]');
      return Array.from(panels).map(p => ({
        id: p.id,
        visible: p.offsetParent !== null,
        display: p.style.display,
        tag: p.tagName,
        text: p.textContent?.trim()?.substring(0, 60),
      }));
    });
    console.log('VERIFY PANELS:', JSON.stringify(verifyState, null, 2));
    await page.screenshot({ path: '/tmp/prod-05-verify.png', fullPage: false });

    // ---- TEST: AI Agent ----
    console.log('\n===== TEST: AI AGENT =====');
    
    // First check what toggleAiAgent does
    const aiState = await page.evaluate(() => {
      // Get ALL elements with "ai" in their ID
      const aiEls = document.querySelectorAll('[id*="ai"], [id*="Ai"], [id*="AI"]');
      return Array.from(aiEls).map(el => ({
        id: el.id,
        tag: el.tagName,
        visible: el.offsetParent !== null,
        display: el.style.display,
        class: el.className?.substring(0, 60),
      }));
    });
    console.log('AI ELEMENTS (before toggle):', JSON.stringify(aiState, null, 2));

    await page.evaluate(() => { window.toggleAiAgent(); });
    await page.waitForTimeout(500);

    const aiStateAfter = await page.evaluate(() => {
      const aiEls = document.querySelectorAll('[id*="ai"], [id*="Ai"], [id*="AI"]');
      return Array.from(aiEls).map(el => ({
        id: el.id,
        visible: el.offsetParent !== null,
        display: el.style.display,
      }));
    });
    console.log('AI ELEMENTS (after toggle):', JSON.stringify(aiStateAfter, null, 2));
    await page.screenshot({ path: '/tmp/prod-06-ai-agent.png', fullPage: false });
    console.log('ERRORS AFTER AI:', JSON.stringify(errors));

    // ---- TEST: Team / Analysis via hub ----
    console.log('\n===== TEST: TEAM / ANALYSIS =====');
    
    // Navigate to hub-team
    await page.evaluate(() => { window.openILSTool('hub-team'); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/prod-07-team.png', fullPage: false });

    const teamState = await page.evaluate(() => {
      const panels = document.querySelectorAll('[id*="team"], [id*="Team"]');
      return Array.from(panels).filter(p => p.offsetParent !== null).map(p => ({
        id: p.id,
        tag: p.tagName,
        class: p.className?.substring(0, 60),
        visible: true,
      }));
    });
    console.log('VISIBLE TEAM PANELS:', JSON.stringify(teamState, null, 2));

    await page.evaluate(() => { window.openILSTool('hub-analysis'); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/prod-08-analysis.png', fullPage: false });

    const analysisState = await page.evaluate(() => {
      const panels = document.querySelectorAll('[id*="analysis"], [id*="Analysis"], [id*="gap"]');
      return Array.from(panels).filter(p => p.offsetParent !== null).map(p => ({
        id: p.id,
        tag: p.tagName,
        class: p.className?.substring(0, 60),
        visible: true,
      }));
    });
    console.log('VISIBLE ANALYSIS PANELS:', JSON.stringify(analysisState, null, 2));
    console.log('ERRORS AFTER TEAM/ANALYSIS:', JSON.stringify(errors));

    // ---- TEST: Verify section from sidebar ----
    console.log('\n===== TEST: VERIFY SECTION (sidebar) =====');
    await page.evaluate(() => { window.showSection('sectionVerify'); });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/prod-09-sectionVerify.png', fullPage: false });

    const verifySection = await page.evaluate(() => {
      const s = document.getElementById('sectionVerify');
      if (!s) return 'NOT FOUND';
      return {
        visible: s.offsetParent !== null,
        display: s.style.display,
        html: s.innerHTML.substring(0, 300),
      };
    });
    console.log('sectionVerify:', JSON.stringify(verifySection));

    // ---- TEST: Anchor record flow ----
    console.log('\n===== TEST: FULL ANCHOR FLOW =====');
    await page.evaluate(() => { window.showSection('sectionILS'); });
    await page.waitForTimeout(500);
    await page.evaluate(() => { window.openILSTool('anchor'); });
    await page.waitForTimeout(500);

    // Find and fill the anchor textarea
    const anchorInput = await page.evaluate(() => {
      // Try multiple selectors
      const selectors = ['#anchorInput', '#anchorText', '#anchorContent', '#textInput', 
        'textarea.anchor-input', '.ils-tool-active textarea', '#tools textarea'];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return { found: true, selector: sel, id: el.id, visible: el.offsetParent !== null };
      }
      // Last resort - find any visible textarea
      const tAreas = document.querySelectorAll('textarea');
      for (const ta of tAreas) {
        if (ta.offsetParent !== null) return { found: true, id: ta.id, visible: true, placeholder: ta.placeholder?.substring(0, 40) };
      }
      return { found: false };
    });
    console.log('ANCHOR INPUT:', JSON.stringify(anchorInput));

    if (anchorInput.found) {
      const sel = anchorInput.selector || `#${anchorInput.id}` || 'textarea';
      await page.fill(sel, 'Playwright audit test record ' + Date.now());
      await page.waitForTimeout(300);
    }

    // Click the anchor button
    const anchorBtnInfo = await page.evaluate(() => {
      const btn = document.getElementById('anchorBtn');
      if (btn && btn.offsetParent !== null) return { found: true, id: 'anchorBtn' };
      // Find visible button with anchor in onclick
      const btns = document.querySelectorAll('button[onclick*="anchorRecord"]');
      for (const b of btns) {
        if (b.offsetParent !== null) return { found: true, onclick: b.getAttribute('onclick'), text: b.textContent?.trim()?.substring(0, 30) };
      }
      return { found: false };
    });
    console.log('ANCHOR BUTTON:', JSON.stringify(anchorBtnInfo));

    if (anchorBtnInfo.found) {
      if (anchorBtnInfo.id) {
        await page.click('#anchorBtn');
      } else {
        await page.click('button[onclick*="anchorRecord"]');
      }
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: '/tmp/prod-10-after-anchor.png', fullPage: false });

    // Check vault after anchoring
    const vaultAfter = await page.evaluate(() => {
      const vault = document.querySelector('#auditVault, .vault-list, .vault-container');
      const items = document.querySelectorAll('.vault-item, .vault-entry, .vault-row');
      return {
        vaultFound: vault ? { id: vault.id, visible: vault.offsetParent !== null, children: vault.children.length } : 'not found',
        itemCount: items.length,
        balance: document.getElementById('slsBarBalance')?.textContent?.trim(),
      };
    });
    console.log('VAULT AFTER ANCHOR:', JSON.stringify(vaultAfter));
    console.log('ERRORS AFTER ANCHOR:', JSON.stringify(errors));

    // ---- FINAL ERROR CHECK ----
    console.log('\n===== FINAL SUMMARY =====');
    console.log('TOTAL ERRORS:', errors.length);
    if (errors.length > 0) {
      console.log('ALL ERRORS:', JSON.stringify(errors, null, 2));
    }

    // Check for any hidden error overlays
    const errorOverlays = await page.evaluate(() => {
      const overlays = document.querySelectorAll('.error-overlay, .error-modal, [class*="error"]');
      return Array.from(overlays).filter(o => o.offsetParent !== null).map(o => ({
        id: o.id,
        class: o.className?.substring(0, 60),
        text: o.textContent?.trim()?.substring(0, 100),
      }));
    });
    console.log('VISIBLE ERROR OVERLAYS:', JSON.stringify(errorOverlays));

    expect(errors.length).toBe(0);
  });
});
