import { test, expect } from '@playwright/test';

/**
 * COMPREHENSIVE PROD-APP AUDIT
 * Tests ALL functionality the user reported broken:
 * 1. Page load errors (JS errors, network failures)
 * 2. Auth flow (Enter Platform → DoD Consent → CAC → Workspace)
 * 3. Verify channel hub
 * 4. AI agent opening
 * 5. My Team / My Analysis boxes
 * 6. Anchor-S4 tools and dropdowns
 * 7. Unclassified bar content
 * 8. Security policy visibility
 * 9. All window function exports
 */

test.describe('Prod App — Comprehensive Audit', () => {
  test('full audit with error capture', async ({ page }) => {
    test.setTimeout(120000);
    const errors = [];
    const consoleLogs = [];
    const networkErrors = [];

    // Capture ALL console messages
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      errors.push(err.message);
    });
    page.on('requestfailed', req => {
      networkErrors.push({ url: req.url(), error: req.failure()?.errorText });
    });

    // ========================================
    // PHASE 1: LOAD THE PROD APP
    // ========================================
    console.log('\n========== PHASE 1: PAGE LOAD ==========');
    // Use absolute URL to hit our preview server on 8080 (Vercel-like routing)
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log('PAGE ERRORS:', JSON.stringify(errors));
    console.log('NETWORK ERRORS:', JSON.stringify(networkErrors));

    // Check critical window functions exist
    const windowFunctions = await page.evaluate(() => {
      const funcs = [
        'startAuthFlow', 'anchorRecord', 'renderVault', 'refreshVerifyRecents',
        'addToVault', 'loadStats', 'showSection', 'showHub', 'openILSTool',
        'DOMPurify', '_s4Safe', 'showSampleDigitalThread', 'populateDigitalThreadDropdown',
        '_currentSection', '_currentILSTool', 'updateAiContext', 'ilsResults',
        'acceptDodConsent', 'simulateCacLogin', 'handleCacAuth',
        'showWorkspaceNotification', 'renderAuditTrail',
        'refreshVaultMetrics', '_updateSlsBalance',
        'openAiAgent', 'toggleAiAgent',
      ];
      const result = {};
      for (const f of funcs) {
        result[f] = typeof window[f];
      }
      return result;
    });
    console.log('WINDOW FUNCTIONS:', JSON.stringify(windowFunctions, null, 2));

    // ========================================
    // PHASE 2: AUTH FLOW
    // ========================================
    console.log('\n========== PHASE 2: AUTH FLOW ==========');

    // Click "Enter Platform"
    const enterBtn = page.locator('button:has-text("Enter Platform")').first();
    if (await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Clicking Enter Platform...');
      await enterBtn.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('WARNING: Enter Platform button not found');
    }

    // Accept DoD consent
    const consentBanner = page.locator('#dodConsentBanner');
    if (await consentBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('DoD consent visible, accepting...');
      const acceptBtn = page.locator('#dodConsentBanner button').first();
      await acceptBtn.click();
      await page.waitForTimeout(1000);
    }

    // CAC Login
    const cacModal = page.locator('#cacLoginModal');
    if (await cacModal.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('CAC modal visible...');
      const cacBtn = page.locator('#cacLoginModal button:has-text("Insert"), #cacLoginModal button').first();
      if (await cacBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cacBtn.click();
        await page.waitForTimeout(3500);
      }
      if (await cacModal.isVisible().catch(() => false)) {
        console.log('CAC modal still visible, force-closing...');
        await page.evaluate(() => {
          var m = document.getElementById('cacLoginModal');
          if (m) m.style.display = 'none';
        });
      }
    }

    await page.waitForTimeout(2000);

    // Check workspace visible
    const workspace = page.locator('#platformWorkspace');
    const wsVisible = await workspace.isVisible().catch(() => false);
    console.log('Workspace visible:', wsVisible);

    if (!wsVisible) {
      console.log('Forcing workspace open...');
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

    // Handle onboarding overlay
    const overlay = page.locator('#onboardOverlay');
    if (await overlay.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Onboarding overlay visible, selecting tier...');
      const tierCard = page.locator('.onboard-tier[data-tier="enterprise"]');
      if (await tierCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tierCard.click();
        await page.waitForTimeout(500);
      }
      const okBtn = page.locator('.onboard-btn, button:has-text("Enter Platform")').first();
      if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await okBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    // Dismiss overlay if still there
    if (await overlay.isVisible().catch(() => false)) {
      await page.evaluate(() => {
        var o = document.getElementById('onboardOverlay');
        if (o) o.style.display = 'none';
      });
      await page.waitForTimeout(500);
    }

    console.log('ERRORS AFTER AUTH:', JSON.stringify(errors));

    // ========================================
    // PHASE 3: TEST SIDEBAR / NAVIGATION
    // ========================================
    console.log('\n========== PHASE 3: SIDEBAR NAVIGATION ==========');

    // List all sidebar items
    const sidebarItems = await page.evaluate(() => {
      const items = document.querySelectorAll('.sidebar-item, [onclick*="showSection"], [onclick*="showHub"], [onclick*="openILSTool"]');
      return Array.from(items).map(el => ({
        text: el.textContent?.trim()?.substring(0, 50),
        onclick: el.getAttribute('onclick'),
        visible: el.offsetParent !== null,
        tagName: el.tagName,
      }));
    });
    console.log('SIDEBAR ITEMS:', JSON.stringify(sidebarItems, null, 2));

    // ========================================
    // PHASE 4: VERIFY CHANNEL HUB
    // ========================================
    console.log('\n========== PHASE 4: VERIFY CHANNEL HUB ==========');

    // Click on verify hub in the sidebar
    const verifyResult = await page.evaluate(() => {
      try {
        if (window.showHub) {
          window.showHub('verify');
          return { success: true };
        } else {
          return { success: false, error: 'showHub not defined' };
        }
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    console.log('showHub("verify"):', JSON.stringify(verifyResult));
    await page.waitForTimeout(1000);

    const verifyVisible = await page.evaluate(() => {
      const hub = document.querySelector('#verifyHub, [id*="verify"]');
      return hub ? { visible: hub.offsetParent !== null, id: hub.id, display: hub.style.display } : 'not found';
    });
    console.log('Verify hub state:', JSON.stringify(verifyVisible));
    console.log('ERRORS AFTER VERIFY:', JSON.stringify(errors));

    // ========================================
    // PHASE 5: AI AGENT
    // ========================================
    console.log('\n========== PHASE 5: AI AGENT ==========');

    const aiResult = await page.evaluate(() => {
      const aiPanel = document.querySelector('#aiAgentPanel, #aiPanel, [id*="aiAgent"], [id*="ai-agent"]');
      const openFn = window.openAiAgent || window.toggleAiAgent;
      return {
        panelFound: aiPanel ? { id: aiPanel.id, visible: aiPanel.offsetParent !== null } : 'not found',
        openFnExists: typeof openFn,
      };
    });
    console.log('AI Agent state:', JSON.stringify(aiResult));

    // Try to open AI agent
    const aiOpenResult = await page.evaluate(() => {
      try {
        if (window.openAiAgent) { window.openAiAgent(); return 'openAiAgent called'; }
        if (window.toggleAiAgent) { window.toggleAiAgent(); return 'toggleAiAgent called'; }
        // Search for AI agent buttons
        const btns = document.querySelectorAll('[onclick*="ai"], [onclick*="Ai"], [onclick*="AI"]');
        const btnInfo = Array.from(btns).map(b => ({ text: b.textContent?.trim()?.substring(0, 40), onclick: b.getAttribute('onclick') }));
        return { error: 'no function', buttons: btnInfo };
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log('AI agent open result:', JSON.stringify(aiOpenResult));
    await page.waitForTimeout(1000);
    console.log('ERRORS AFTER AI:', JSON.stringify(errors));

    // ========================================
    // PHASE 6: MY TEAM / MY ANALYSIS
    // ========================================
    console.log('\n========== PHASE 6: MY TEAM / MY ANALYSIS ==========');

    const teamAnalysis = await page.evaluate(() => {
      // Find "My Team" and "My Analysis" elements
      const all = document.querySelectorAll('[onclick], .sidebar-item, .widget-card, .workspace-card, .team-card, .analysis-card');
      const matches = [];
      for (const el of all) {
        const text = el.textContent?.trim()?.substring(0, 60) || '';
        const onclick = el.getAttribute('onclick') || '';
        if (text.toLowerCase().includes('team') || text.toLowerCase().includes('analysis') || 
            onclick.includes('team') || onclick.includes('analysis') || onclick.includes('Team') || onclick.includes('Analysis')) {
          matches.push({
            text: text.substring(0, 60),
            onclick,
            visible: el.offsetParent !== null,
            tagName: el.tagName,
            id: el.id || '',
          });
        }
      }
      return matches;
    });
    console.log('TEAM/ANALYSIS elements:', JSON.stringify(teamAnalysis, null, 2));

    // Try clicking team section
    const teamResult = await page.evaluate(() => {
      try {
        if (window.showSection) {
          window.showSection('team');
          return { success: true, section: 'team' };
        }
        return { success: false, error: 'showSection not defined' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    console.log('showSection("team"):', JSON.stringify(teamResult));
    await page.waitForTimeout(500);

    const analysisResult = await page.evaluate(() => {
      try {
        if (window.showSection) {
          window.showSection('analysis');
          return { success: true, section: 'analysis' };
        }
        return { success: false, error: 'showSection not defined' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    console.log('showSection("analysis"):', JSON.stringify(analysisResult));
    await page.waitForTimeout(500);
    console.log('ERRORS AFTER TEAM/ANALYSIS:', JSON.stringify(errors));

    // ========================================
    // PHASE 7: ANCHOR-S4 TOOLS & DROPDOWNS
    // ========================================
    console.log('\n========== PHASE 7: ANCHOR-S4 TOOLS ==========');

    // Navigate to anchor section first
    await page.evaluate(() => { if (window.showSection) window.showSection('anchor'); });
    await page.waitForTimeout(1000);

    // Check anchor tool state
    const anchorState = await page.evaluate(() => {
      const anchorSection = document.querySelector('#anchorSection, [data-section="anchor"]');
      const anchorContent = document.querySelector('#anchorContent, [id*="anchor"]');
      const dropdowns = document.querySelectorAll('#anchorSection select, [data-section="anchor"] select, .anchor-dropdown');
      const tools = document.querySelectorAll('#anchorSection [onclick], [data-section="anchor"] [onclick]');

      return {
        sectionFound: anchorSection ? { id: anchorSection.id, visible: anchorSection.offsetParent !== null } : 'not found',
        contentFound: anchorContent ? { id: anchorContent.id, visible: anchorContent.offsetParent !== null } : 'not found',
        dropdowns: Array.from(dropdowns).map(d => ({
          id: d.id || '',
          options: d.options ? Array.from(d.options).map(o => o.textContent).slice(0, 5) : [],
          visible: d.offsetParent !== null,
        })),
        tools: Array.from(tools).slice(0, 15).map(t => ({
          text: t.textContent?.trim()?.substring(0, 40),
          onclick: t.getAttribute('onclick'),
          visible: t.offsetParent !== null,
        })),
      };
    });
    console.log('ANCHOR STATE:', JSON.stringify(anchorState, null, 2));

    // Try the different ILS tools
    const ilsTools = ['anchor', 'verify', 'audit', 'custody', 'supply', 'ordnance', 'maintenance', 'logistics'];
    for (const tool of ilsTools) {
      const result = await page.evaluate((toolName) => {
        try {
          if (window.openILSTool) {
            window.openILSTool(toolName);
            return { success: true };
          }
          return { success: false, error: 'openILSTool not defined' };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }, tool);
      if (!result.success) {
        console.log(`openILSTool("${tool}"):`, JSON.stringify(result));
      }
    }
    await page.waitForTimeout(1000);
    console.log('ERRORS AFTER ANCHOR TOOLS:', JSON.stringify(errors));

    // ========================================
    // PHASE 8: UNCLASSIFIED BAR
    // ========================================
    console.log('\n========== PHASE 8: UNCLASSIFIED BAR ==========');

    const unclassifiedBar = await page.evaluate(() => {
      // Find all elements that might be the classification bar
      const bars = document.querySelectorAll('[class*="classif"], [id*="classif"], [class*="unclass"], [id*="unclass"], .sls-bar, #slsBar, .classification-bar');
      const results = [];
      for (const bar of bars) {
        results.push({
          id: bar.id || '',
          className: bar.className?.substring?.(0, 80) || '',
          text: bar.textContent?.trim()?.substring(0, 100),
          visible: bar.offsetParent !== null,
          display: bar.style.display,
          html: bar.innerHTML?.substring(0, 200),
        });
      }
      // Also check for any element containing "unclassified" text
      const allEls = document.querySelectorAll('*');
      const unclEls = [];
      for (const el of allEls) {
        if (el.children.length === 0 && el.textContent?.toLowerCase()?.includes('unclassified')) {
          unclEls.push({
            tagName: el.tagName,
            text: el.textContent?.trim()?.substring(0, 80),
            className: el.className?.substring?.(0, 60) || '',
            parent: el.parentElement?.id || el.parentElement?.className?.substring?.(0, 40) || '',
          });
        }
      }
      return { bars, unclassifiedElements: unclEls };
    });
    console.log('UNCLASSIFIED BAR:', JSON.stringify(unclassifiedBar, null, 2));

    // ========================================
    // PHASE 9: SECURITY POLICY VISIBILITY
    // ========================================
    console.log('\n========== PHASE 9: SECURITY POLICY ==========');

    const secPolicy = await page.evaluate(() => {
      const policyEls = document.querySelectorAll('[class*="security"], [id*="security"], [class*="policy"], [id*="policy"]');
      const results = [];
      for (const el of policyEls) {
        results.push({
          id: el.id || '',
          className: el.className?.substring?.(0, 80) || '',
          text: el.textContent?.trim()?.substring(0, 100),
          visible: el.offsetParent !== null,
          display: el.style?.display,
          tagName: el.tagName,
        });
      }
      return results;
    });
    console.log('SECURITY POLICY elements:', JSON.stringify(secPolicy, null, 2));

    // ========================================
    // PHASE 10: DIGITAL THREAD
    // ========================================
    console.log('\n========== PHASE 10: DIGITAL THREAD ==========');

    const digitalThread = await page.evaluate(() => {
      const dtDropdown = document.querySelector('#digitalThreadDropdown, [id*="digitalThread"], select[id*="thread"]');
      const populateFn = window.populateDigitalThreadDropdown;
      const showFn = window.showSampleDigitalThread;
      return {
        dropdownFound: dtDropdown ? { id: dtDropdown.id, visible: dtDropdown.offsetParent !== null, options: dtDropdown.options ? Array.from(dtDropdown.options).length : 0 } : 'not found',
        populateFn: typeof populateFn,
        showFn: typeof showFn,
      };
    });
    console.log('DIGITAL THREAD:', JSON.stringify(digitalThread, null, 2));

    // ========================================
    // PHASE 11: ANCHOR FLOW TEST
    // ========================================
    console.log('\n========== PHASE 11: ANCHOR FLOW ==========');

    // Navigate back to anchor
    await page.evaluate(() => { if (window.showSection) window.showSection('anchor'); });
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (window.openILSTool) window.openILSTool('anchor'); });
    await page.waitForTimeout(500);

    // Check balance before
    const balanceBefore = await page.evaluate(() => {
      const els = document.querySelectorAll('[id*="balance"], [id*="Balance"], [class*="balance"], .sls-credits');
      return Array.from(els).map(e => ({ id: e.id, text: e.textContent?.trim()?.substring(0, 40), visible: e.offsetParent !== null }));
    });
    console.log('BALANCE ELEMENTS:', JSON.stringify(balanceBefore));

    // Try anchoring
    const anchorTest = await page.evaluate(() => {
      try {
        // Find the text input
        const textarea = document.querySelector('#anchorInput, #anchorText, textarea[id*="anchor"], input[id*="anchor"]');
        if (textarea) {
          textarea.value = 'Playwright audit test record ' + Date.now();
          textarea.dispatchEvent(new Event('input'));
        }
        return { textareaFound: !!textarea, textareaId: textarea?.id };
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log('ANCHOR TEXT INPUT:', JSON.stringify(anchorTest));

    // Click anchor button
    const anchorBtnResult = await page.evaluate(() => {
      const btn = document.querySelector('#anchorBtn, button[onclick*="anchorRecord"], button:has(i.fa-anchor)');
      if (btn) {
        btn.click();
        return { clicked: true, text: btn.textContent?.trim()?.substring(0, 40) };
      }
      // Search more broadly
      const allBtns = document.querySelectorAll('button');
      const anchBtns = Array.from(allBtns).filter(b => b.textContent?.toLowerCase()?.includes('anchor'));
      return { clicked: false, candidates: anchBtns.map(b => ({ text: b.textContent?.trim()?.substring(0, 40), onclick: b.getAttribute('onclick') })) };
    });
    console.log('ANCHOR BUTTON:', JSON.stringify(anchorBtnResult));
    await page.waitForTimeout(3000);

    // Check balance after
    const balanceAfter = await page.evaluate(() => {
      const els = document.querySelectorAll('[id*="balance"], [id*="Balance"], [class*="balance"], .sls-credits');
      return Array.from(els).map(e => ({ id: e.id, text: e.textContent?.trim()?.substring(0, 40), visible: e.offsetParent !== null }));
    });
    console.log('BALANCE AFTER ANCHOR:', JSON.stringify(balanceAfter));

    // ========================================
    // PHASE 12: VAULT CHECK
    // ========================================
    console.log('\n========== PHASE 12: VAULT ==========');

    const vaultState = await page.evaluate(() => {
      const vault = document.querySelector('#auditVault, [id*="vault"], [id*="Vault"]');
      const vaultItems = document.querySelectorAll('.vault-item, .vault-entry, [class*="vault-item"]');
      return {
        vaultFound: vault ? { id: vault.id, visible: vault.offsetParent !== null, childCount: vault.children.length } : 'not found',
        vaultItems: vaultItems.length,
      };
    });
    console.log('VAULT STATE:', JSON.stringify(vaultState));

    // ========================================
    // FINAL SUMMARY
    // ========================================
    console.log('\n========== FINAL SUMMARY ==========');
    console.log('TOTAL PAGE ERRORS:', errors.length);
    console.log('ALL ERRORS:', JSON.stringify(errors));
    console.log('TOTAL NETWORK ERRORS:', networkErrors.length);
    console.log('NETWORK ERRORS:', JSON.stringify(networkErrors));
    console.log('CONSOLE ERRORS:', consoleLogs.filter(l => l.startsWith('[error]')));

    // Dump all onclick handlers on the page for debugging
    const allOnclicks = await page.evaluate(() => {
      const elements = document.querySelectorAll('[onclick]');
      const handlers = new Set();
      for (const el of elements) {
        const onclick = el.getAttribute('onclick');
        // Extract function name
        const match = onclick.match(/^(\w+)\(/);
        if (match) handlers.add(match[1]);
      }
      return Array.from(handlers).sort();
    });
    console.log('ALL ONCLICK FUNCTION NAMES:', JSON.stringify(allOnclicks));

    // Check which of those are actually defined on window
    const undefinedHandlers = await page.evaluate((handlers) => {
      return handlers.filter(h => typeof window[h] !== 'function');
    }, allOnclicks);
    console.log('UNDEFINED ONCLICK HANDLERS:', JSON.stringify(undefinedHandlers));

    // Should have zero page errors
    expect(errors.length).toBe(0);
  });
});
