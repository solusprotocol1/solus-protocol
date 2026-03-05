import { test } from '@playwright/test';

/**
 * Deep comparison: open BOTH prod and demo side by side, 
 * check every interactive element, measure pixel positions.
 */
test('deep prod vs demo comparison', async ({ browser }) => {
  test.setTimeout(180000);

  // Open both pages in parallel
  const prodPage = await browser.newPage();
  const demoPage = await browser.newPage();

  // Navigate both to fresh sessions
  await Promise.all([
    prodPage.goto('http://localhost:8080/', { waitUntil: 'networkidle' }),
    demoPage.goto('http://localhost:8080/demo-app/', { waitUntil: 'networkidle' }),
  ]);

  // Clear storage on both
  await Promise.all([
    prodPage.evaluate(() => { sessionStorage.clear(); localStorage.clear(); }),
    demoPage.evaluate(() => { sessionStorage.clear(); localStorage.clear(); }),
  ]);
  await Promise.all([
    prodPage.goto('http://localhost:8080/', { waitUntil: 'networkidle' }),
    demoPage.goto('http://localhost:8080/demo-app/', { waitUntil: 'networkidle' }),
  ]);
  await Promise.all([
    prodPage.waitForTimeout(2000),
    demoPage.waitForTimeout(2000),
  ]);

  // Fast-forward both through auth
  async function fastAuth(page, label) {
    // Enter
    const enter = page.locator('button:has-text("Enter Platform")').first();
    if (await enter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enter.click();
      await page.waitForTimeout(1000);
    }
    // Consent
    const consent = page.locator('#dodConsentBanner button').first();
    if (await consent.isVisible({ timeout: 3000 }).catch(() => false)) {
      await consent.click();
      await page.waitForTimeout(1000);
    }
    // CAC
    const cac = page.locator('button:has-text("Authenticate with CAC"), button:has-text("Start Demo Session")').first();
    if (await cac.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cac.click();
      await page.waitForTimeout(4000);
    }
    // Onboarding
    const overlay = page.locator('#onboardOverlay');
    if (await overlay.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.evaluate(() => {
        const c = document.querySelector('.onboard-tier[data-tier="enterprise"]');
        if (c && window.selectOnboardTier) window.selectOnboardTier(c, 'enterprise');
      });
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => { if (window.onboardNext) window.onboardNext(); });
        await page.waitForTimeout(600);
      }
    }
    await page.waitForTimeout(800);
    // Role
    await page.evaluate(() => { if (window.applyRole) window.applyRole(); });
    await page.waitForTimeout(1000);
    console.log(`${label}: Auth complete`);
  }

  await fastAuth(prodPage, 'PROD');
  await fastAuth(demoPage, 'DEMO');

  // ===== COMPREHENSIVE COMPARISON =====

  async function getFullState(page) {
    return page.evaluate(() => {
      function info(id) {
        const el = document.getElementById(id);
        if (!el) return { exists: false };
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          exists: true,
          visible: el.offsetParent !== null || cs.position === 'fixed',
          display: cs.display,
          width: Math.round(r.width),
          height: Math.round(r.height),
          top: Math.round(r.top),
          left: Math.round(r.left),
          position: cs.position,
          zIndex: cs.zIndex,
          opacity: cs.opacity,
          overflow: cs.overflow,
          bg: cs.backgroundColor,
          childCount: el.children.length,
          text: el.textContent?.trim()?.substring(0, 60),
        };
      }

      // All major elements
      const ids = [
        'platformWorkspace', 'mainNav', 's4ClassificationBanner', 'itarBanner',
        'tabAnchor', 'tabVerify', 'tabLog', 'sectionSystems', 'tabMetrics', 
        'tabOffline', 'tabILS', 'tabWallet',
        'aiFloatWrapper', 'aiFloatPanel', 'aiFloatToggle',
        'recordInput', 'anchorBtn', 'verifyInput',
        'onboardOverlay', 'slsBar', 'walletSidebar',
        'hub-analysis', 'hub-team', 'hub-vault', 'hub-dmsms',
        'anchor', 'hub-verify',
      ];

      const state = {};
      ids.forEach(id => { state[id] = info(id); });

      // Also check sidebar nav items
      const sidebarItems = Array.from(document.querySelectorAll('.hub-card[data-section], .sidebar-nav-item, [onclick*="showSection"]')).map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim()?.substring(0, 40),
        onclick: el.getAttribute('onclick')?.substring(0, 60),
        visible: el.offsetParent !== null,
        classes: el.className,
      }));
      state._sidebarItems = sidebarItems;

      // Check ILS tool cards
      const toolCards = Array.from(document.querySelectorAll('.ils-tool-card[onclick]')).map(el => ({
        text: el.textContent?.trim()?.substring(0, 30),
        onclick: el.getAttribute('onclick')?.substring(0, 50),
        visible: el.offsetParent !== null,
      }));
      state._toolCards = toolCards;

      // Check floating AI button
      const aiBtn = document.querySelector('.ai-float-toggle, #aiFloatToggle, [onclick*="toggleAi"]');
      state._aiButton = aiBtn ? {
        tag: aiBtn.tagName,
        visible: aiBtn.offsetParent !== null || getComputedStyle(aiBtn).position === 'fixed',
        display: getComputedStyle(aiBtn).display,
        rect: aiBtn.getBoundingClientRect(),
      } : 'NOT FOUND';

      // Check security policy
      const secPol = document.querySelector('[id*="security"], [class*="security-policy"], .security-disclosure');
      state._securityPolicy = secPol ? {
        id: secPol.id,
        class: secPol.className,
        visible: secPol.offsetParent !== null,
        display: getComputedStyle(secPol).display,
        text: secPol.textContent?.trim()?.substring(0, 80),
      } : 'NOT FOUND';

      return state;
    });
  }

  const prodState = await getFullState(prodPage);
  const demoState = await getFullState(demoPage);

  // Print comparison
  console.log('\n' + '='.repeat(80));
  console.log('PROD vs DEMO — Element Comparison');
  console.log('='.repeat(80));

  const allKeys = [...new Set([...Object.keys(prodState), ...Object.keys(demoState)])].filter(k => !k.startsWith('_'));
  
  for (const key of allKeys) {
    const p = prodState[key];
    const d = demoState[key];
    
    // Only print if there's a meaningful difference
    const pExists = p?.exists ?? false;
    const dExists = d?.exists ?? false;
    const pVis = p?.visible ?? false;
    const dVis = d?.visible ?? false;
    const pDisp = p?.display ?? 'n/a';
    const dDisp = d?.display ?? 'n/a';
    
    if (pExists !== dExists || pVis !== dVis || pDisp !== dDisp) {
      console.log(`\n  ${key}:`);
      console.log(`    PROD: exists=${pExists} visible=${pVis} display=${pDisp} pos=${p?.position||'n/a'} size=${p?.width||0}x${p?.height||0}`);
      console.log(`    DEMO: exists=${dExists} visible=${dVis} display=${dDisp} pos=${d?.position||'n/a'} size=${d?.width||0}x${d?.height||0}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SIDEBAR ITEMS');
  console.log('='.repeat(80));
  console.log('PROD sidebar:', JSON.stringify(prodState._sidebarItems?.map(i => i.text), null, 2));
  console.log('DEMO sidebar:', JSON.stringify(demoState._sidebarItems?.map(i => i.text), null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('ILS TOOL CARDS');
  console.log('='.repeat(80));
  console.log('PROD tools:', JSON.stringify(prodState._toolCards?.map(i => ({ t: i.text, v: i.visible })), null, 2));
  console.log('DEMO tools:', JSON.stringify(demoState._toolCards?.map(i => ({ t: i.text, v: i.visible })), null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('AI BUTTON');
  console.log('='.repeat(80));
  console.log('PROD:', JSON.stringify(prodState._aiButton));
  console.log('DEMO:', JSON.stringify(demoState._aiButton));

  console.log('\n' + '='.repeat(80));
  console.log('SECURITY POLICY');
  console.log('='.repeat(80));
  console.log('PROD:', JSON.stringify(prodState._securityPolicy));
  console.log('DEMO:', JSON.stringify(demoState._securityPolicy));

  // ===== Now navigate both to each section and compare =====
  const sections = ['sectionAnchor', 'sectionVerify', 'sectionILS', 'sectionWallet', 'sectionMetrics'];
  
  console.log('\n' + '='.repeat(80));
  console.log('SECTION NAVIGATION TEST');
  console.log('='.repeat(80));
  
  for (const section of sections) {
    await Promise.all([
      prodPage.evaluate((s) => { window.showSection(s); }, section),
      demoPage.evaluate((s) => { window.showSection(s); }, section),
    ]);
    await Promise.all([
      prodPage.waitForTimeout(500),
      demoPage.waitForTimeout(500),
    ]);
    
    const [pActive, dActive] = await Promise.all([
      prodPage.evaluate(() => {
        const visible = Array.from(document.querySelectorAll('.tab-section > *')).filter(el => el.style.display !== 'none' && getComputedStyle(el).display !== 'none');
        return visible.map(el => ({ id: el.id, tag: el.tagName, visible: el.offsetParent !== null, display: getComputedStyle(el).display }));
      }),
      demoPage.evaluate(() => {
        const visible = Array.from(document.querySelectorAll('.tab-section > *')).filter(el => el.style.display !== 'none' && getComputedStyle(el).display !== 'none');
        return visible.map(el => ({ id: el.id, tag: el.tagName, visible: el.offsetParent !== null, display: getComputedStyle(el).display }));
      }),
    ]);
    
    const pIds = pActive.map(a => a.id).join(', ');
    const dIds = dActive.map(a => a.id).join(', ');
    const match = pIds === dIds ? '✓' : '✗ MISMATCH';
    console.log(`  ${section}: PROD=[${pIds}] DEMO=[${dIds}] ${match}`);
  }

  // Test ILS tools navigation
  console.log('\n' + '='.repeat(80));
  console.log('ILS TOOL OPEN TEST');
  console.log('='.repeat(80));
  
  // First go to ILS
  await Promise.all([
    prodPage.evaluate(() => { window.showSection('sectionILS'); }),
    demoPage.evaluate(() => { window.showSection('sectionILS'); }),
  ]);
  await Promise.all([prodPage.waitForTimeout(500), demoPage.waitForTimeout(500)]);

  const ilsTools = ['anchor', 'hub-analysis', 'hub-team', 'hub-vault', 'hub-dmsms', 'hub-verify'];
  for (const tool of ilsTools) {
    await Promise.all([
      prodPage.evaluate((t) => { window.openILSTool(t); }, tool),
      demoPage.evaluate((t) => { window.openILSTool(t); }, tool),
    ]);
    await Promise.all([prodPage.waitForTimeout(400), demoPage.waitForTimeout(400)]);

    const [pTool, dTool] = await Promise.all([
      prodPage.evaluate((t) => {
        const el = document.getElementById(t);
        if (!el) return { exists: false };
        return { exists: true, visible: el.offsetParent !== null, display: getComputedStyle(el).display, active: el.classList.contains('active') };
      }, tool),
      demoPage.evaluate((t) => {
        const el = document.getElementById(t);
        if (!el) return { exists: false };
        return { exists: true, visible: el.offsetParent !== null, display: getComputedStyle(el).display, active: el.classList.contains('active') };
      }, tool),
    ]);

    const match = (pTool.exists === dTool.exists && pTool.visible === dTool.visible) ? '✓' : '✗ DIFF';
    console.log(`  openILSTool('${tool}'): PROD={exists:${pTool.exists},vis:${pTool.visible}} DEMO={exists:${dTool.exists},vis:${dTool.visible}} ${match}`);
  }

  // Test AI toggle
  console.log('\n' + '='.repeat(80));
  console.log('AI AGENT TOGGLE TEST');
  console.log('='.repeat(80));

  // Before toggle
  const [pAiBefore, dAiBefore] = await Promise.all([
    prodPage.evaluate(() => {
      const w = document.getElementById('aiFloatWrapper');
      const p = document.getElementById('aiFloatPanel');
      return {
        wrapper: w ? { display: w.style.display, computed: getComputedStyle(w).display } : 'MISSING',
        panel: p ? { display: p.style.display, computed: getComputedStyle(p).display, open: p.classList.contains('open') } : 'MISSING',
      };
    }),
    demoPage.evaluate(() => {
      const w = document.getElementById('aiFloatWrapper');
      const p = document.getElementById('aiFloatPanel');
      return {
        wrapper: w ? { display: w.style.display, computed: getComputedStyle(w).display } : 'MISSING',
        panel: p ? { display: p.style.display, computed: getComputedStyle(p).display, open: p.classList.contains('open') } : 'MISSING',
      };
    }),
  ]);
  console.log('Before toggle:');
  console.log('  PROD:', JSON.stringify(pAiBefore));
  console.log('  DEMO:', JSON.stringify(dAiBefore));

  // Toggle
  await Promise.all([
    prodPage.evaluate(() => { if (window.toggleAiAgent) window.toggleAiAgent(); }),
    demoPage.evaluate(() => { if (window.toggleAiAgent) window.toggleAiAgent(); }),
  ]);
  await Promise.all([prodPage.waitForTimeout(700), demoPage.waitForTimeout(700)]);

  const [pAiAfter, dAiAfter] = await Promise.all([
    prodPage.evaluate(() => {
      const w = document.getElementById('aiFloatWrapper');
      const p = document.getElementById('aiFloatPanel');
      return {
        wrapper: w ? { display: w.style.display, computed: getComputedStyle(w).display } : 'MISSING',
        panel: p ? { display: p.style.display, computed: getComputedStyle(p).display, open: p.classList.contains('open') } : 'MISSING',
      };
    }),
    demoPage.evaluate(() => {
      const w = document.getElementById('aiFloatWrapper');
      const p = document.getElementById('aiFloatPanel');
      return {
        wrapper: w ? { display: w.style.display, computed: getComputedStyle(w).display } : 'MISSING',
        panel: p ? { display: p.style.display, computed: getComputedStyle(p).display, open: p.classList.contains('open') } : 'MISSING',
      };
    }),
  ]);
  console.log('After toggle:');
  console.log('  PROD:', JSON.stringify(pAiAfter));
  console.log('  DEMO:', JSON.stringify(dAiAfter));

  // Screenshot both workspaces for visual compare
  await Promise.all([
    prodPage.screenshot({ path: '/tmp/compare-prod-workspace.png' }),
    demoPage.screenshot({ path: '/tmp/compare-demo-workspace.png' }),
  ]);

  // Go to ILS and screenshot
  await Promise.all([
    prodPage.evaluate(() => { window.showSection('sectionILS'); }),
    demoPage.evaluate(() => { window.showSection('sectionILS'); }),
  ]);
  await Promise.all([prodPage.waitForTimeout(500), demoPage.waitForTimeout(500)]);
  await Promise.all([
    prodPage.screenshot({ path: '/tmp/compare-prod-ils.png' }),
    demoPage.screenshot({ path: '/tmp/compare-demo-ils.png' }),
  ]);

  await prodPage.close();
  await demoPage.close();
});
