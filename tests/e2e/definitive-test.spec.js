// Definitive test: full auth flow then verify every feature
import { test } from '@playwright/test';
const BASE = 'http://localhost:8080';

test('Definitive user flow', async ({ page }) => {
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // ── FULL AUTH FLOW ──
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. Enter Platform
  await page.locator('button:has-text("Enter Platform")').first().click();
  await page.waitForTimeout(1000);

  // 2. Accept DoD consent
  const consentBtn = page.locator('button:has-text("I Accept")');
  if (await consentBtn.isVisible().catch(() => false)) {
    await consentBtn.click();
    await page.waitForTimeout(1000);
  }

  // 3. CAC auth
  const cacBtn = page.locator('button:has-text("Authenticate with CAC")');
  if (await cacBtn.isVisible().catch(() => false)) {
    await cacBtn.click();
    await page.waitForTimeout(4000); // Wait for 1.5+0.8s simulated auth
  }

  // 4. Complete onboarding — click ALL steps
  console.log('\n=== ONBOARDING ===');
  const onboard = page.locator('#onboardOverlay');
  for (let step = 0; step < 20; step++) {
    const isVis = await onboard.isVisible().catch(() => false);
    if (!isVis) { console.log('Onboarding complete!'); break; }
    
    // Find ALL visible buttons in the overlay
    const buttons = page.locator('#onboardOverlay button:visible, #onboardOverlay .onboard-btn:visible');
    const count = await buttons.count();
    if (count === 0) {
      console.log(`Step ${step}: No buttons found, forcing dismiss`);
      await page.evaluate(() => {
        var ov = document.getElementById('onboardOverlay');
        if (ov) ov.style.display = 'none';
        sessionStorage.setItem('s4_onboard_done', '1');
      });
      break;
    }
    
    // Click the LAST visible button (usually "Continue" or "Next")
    const btn = buttons.last();
    const text = (await btn.textContent()).trim();
    console.log(`Step ${step}: Clicking "${text.substring(0, 30)}" (${count} buttons visible)`);
    await btn.click();
    await page.waitForTimeout(1200);
  }
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/def-01-after-onboard.png', fullPage: false });

  // 5. Handle role modal
  console.log('\n=== ROLE SELECTION ===');
  const roleModal = page.locator('#roleModal');
  const roleVis = await roleModal.isVisible().catch(() => false);
  console.log(`Role modal visible: ${roleVis}`);
  
  if (roleVis) {
    // List all role cards
    const cards = page.locator('#roleModal .role-card');
    const cardCount = await cards.count();
    console.log(`Role cards: ${cardCount}`);
    for (let i = 0; i < cardCount; i++) {
      const text = (await cards.nth(i).textContent()).trim().substring(0, 40);
      console.log(`  [${i}] ${text}`);
    }
    // Select first
    if (cardCount > 0) {
      await cards.first().click();
      await page.waitForTimeout(500);
    }
    // Click Apply/Set button
    const applyBtn = page.locator('#roleModal button:has-text("Apply"), #roleModal button:has-text("Set"), #roleModal button:has-text("Confirm")');
    if (await applyBtn.count() > 0) {
      await applyBtn.first().click();
      console.log('Clicked apply role');
      await page.waitForTimeout(1500);
    } else {
      // Try clicking any button that's not a role card
      const allBtns = page.locator('#roleModal button:visible');
      const c = await allBtns.count();
      console.log(`Other buttons in role modal: ${c}`);
      for (let i = 0; i < c; i++) {
        const t = (await allBtns.nth(i).textContent()).trim();
        console.log(`  "${t}"`);
      }
      if (c > 0) {
        await allBtns.last().click();
        await page.waitForTimeout(1500);
      }
    }
  } else {
    console.log('No role modal — force applying role');
    // Check if we need to call initRoleSystem  
    await page.evaluate(() => {
      if (!sessionStorage.getItem('s4_user_role')) {
        // This would normally be set by role selector
        sessionStorage.setItem('s4_user_role', 'logistics_officer');
        sessionStorage.setItem('s4_user_title', 'Logistics Officer');
      }
      if (typeof window.initRoleSystem === 'function') {
        window.initRoleSystem();
      }
    });
    await page.waitForTimeout(1000);
  }
  
  await page.screenshot({ path: '/tmp/def-02-workspace.png', fullPage: false });

  // ── WORKSPACE CHECKS ──
  console.log('\n=== WORKSPACE STATE ===');
  
  const wsDisplay = await page.locator('#platformWorkspace').evaluate(e => getComputedStyle(e).display).catch(() => 'MISSING');
  const hubDisplay = await page.locator('#platformHub').evaluate(e => getComputedStyle(e).display).catch(() => 'MISSING');
  console.log(`Workspace: ${wsDisplay}, Hub: ${hubDisplay}`);

  // List visible hub cards
  const hubCards = page.locator('.hub-card:visible');
  const hubCount = await hubCards.count();
  console.log(`\nVisible hub cards: ${hubCount}`);
  for (let i = 0; i < hubCount; i++) {
    const card = hubCards.nth(i);
    const text = (await card.textContent()).trim().substring(0, 40);
    const onclick = await card.evaluate(e => e.getAttribute('onclick') || '');
    console.log(`  [${i}] "${text}" → ${onclick}`);
  }

  // ── TEST: Click "Anchor-S4" hub card ──
  console.log('\n=== TEST: Anchor-S4 Hub Card ===');
  const ilsCard = page.locator('.hub-card:has-text("Anchor-S4")');
  if (await ilsCard.count() > 0) {
    await ilsCard.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/tmp/def-03-ils.png', fullPage: false });
    
    const ilsVis = await page.locator('#tabILS').isVisible().catch(() => false);
    console.log(`ILS tab visible: ${ilsVis}`);
    
    // Tool cards in ILS
    const tools = page.locator('.ils-tool-card:visible');
    const toolCount = await tools.count();
    console.log(`Visible ILS tools: ${toolCount}`);
    
    // Click first tool
    if (toolCount > 0) {
      const firstTool = tools.first();
      const toolText = (await firstTool.textContent()).trim().substring(0, 30);
      const toolOnclick = await firstTool.evaluate(e => e.getAttribute('onclick') || '');
      console.log(`Clicking first tool: "${toolText}" → ${toolOnclick}`);
      await firstTool.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/def-04-tool-opened.png', fullPage: false });
      
      // Check which panel opened
      const openPanels = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.ils-hub-panel')).filter(p => 
          p.classList.contains('active') || getComputedStyle(p).display !== 'none'
        ).map(p => ({ id: p.id, display: getComputedStyle(p).display, active: p.classList.contains('active') }));
      });
      console.log(`Open ILS panels: ${JSON.stringify(openPanels)}`);
      
      // Check hub tab buttons  
      const activeTabs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.ils-hub-tab')).filter(b => 
          b.classList.contains('active')
        ).map(b => b.textContent.trim());
      });
      console.log(`Active hub tabs: ${activeTabs.join(', ')}`);
    }
    
    // AI Agent Toggle
    console.log('\n=== TEST: AI Agent ===');
    const aiToggle = page.locator('.ai-float-toggle:visible');
    if (await aiToggle.count() > 0) {
      console.log('AI toggle is VISIBLE ✓');
      await aiToggle.click();
      await page.waitForTimeout(500);
      const panelVis = await page.locator('#aiFloatPanel').isVisible().catch(() => false);
      console.log(`AI panel after toggle: ${panelVis ? 'VISIBLE ✓' : 'NOT VISIBLE ✗'}`);
      await page.screenshot({ path: '/tmp/def-05-ai.png', fullPage: false });
      // Close it
      await aiToggle.click();
      await page.waitForTimeout(300);
    } else {
      const wrapperInfo = await page.evaluate(() => {
        const w = document.getElementById('aiFloatWrapper');
        if (!w) return 'NOT IN DOM';
        const p = w.parentElement;
        return `parent=${p?.id || p?.tagName}, display=${getComputedStyle(w).display}, parentDisplay=${getComputedStyle(p).display}`;
      });
      console.log(`AI toggle NOT visible. Wrapper: ${wrapperInfo}`);
    }
  }

  // ── TEST: Navigate back to hub and click Verify ──
  console.log('\n=== TEST: Verify Records ===');
  await page.evaluate(() => {
    if (typeof window.showSection === 'function') {
      // First go back to hub
      var hub = document.getElementById('platformHub');
      if (hub) hub.style.display = 'block';
    }
  });
  await page.waitForTimeout(500);
  
  const verifyCard = page.locator('.hub-card:has-text("Verify")');
  if (await verifyCard.count() > 0) {
    await verifyCard.click();
    await page.waitForTimeout(1000);
    
    const verifyVis = await page.locator('#tabVerify').isVisible().catch(() => false);
    console.log(`Verify tab visible: ${verifyVis}`);
    await page.screenshot({ path: '/tmp/def-06-verify.png', fullPage: false });
    
    // Check verify form elements
    const verifyInput = await page.locator('#verifyTxHash, #verifyInput, input[placeholder*="hash"], input[placeholder*="verify"]').count();
    console.log(`Verify input fields: ${verifyInput}`);
  }

  // ── TEST: Anchor Tab ──
  console.log('\n=== TEST: Anchor Tab ===');
  await page.evaluate(() => { if (typeof showSection === 'function') showSection('sectionAnchor'); });
  await page.waitForTimeout(1000);
  
  const anchorVis = await page.locator('#tabAnchor').isVisible().catch(() => false);
  console.log(`Anchor tab visible: ${anchorVis}`);
  
  if (anchorVis) {
    for (const sel of ['#categorySelect', '#prioritySelect', '#anchorRecordId', '#anchorDescription', '#anchorBtn']) {
      const el = page.locator(sel);
      const exists = await el.count() > 0;
      const vis = exists ? await el.isVisible().catch(() => false) : false;
      console.log(`  ${sel}: ${exists ? (vis ? 'VISIBLE ✓' : 'exists but hidden') : 'NOT IN DOM'}`);
    }
    await page.screenshot({ path: '/tmp/def-07-anchor.png', fullPage: false });
  }

  // ── TEST: System Metrics ──
  console.log('\n=== TEST: Systems/Metrics ===');
  await page.evaluate(() => { if (typeof showSection === 'function') showSection('sectionSystems'); });
  await page.waitForTimeout(1000);
  const sysVis = await page.locator('#sectionSystems').isVisible().catch(() => false);
  console.log(`Systems section visible: ${sysVis}`);
  await page.screenshot({ path: '/tmp/def-08-systems.png', fullPage: false });

  // ── TEST: ITAR Banner ──
  console.log('\n=== TEST: ITAR Banner ===');
  const itarVis = await page.locator('#itarBanner').isVisible().catch(() => false);
  const itarText = await page.locator('#itarBanner').textContent().catch(() => 'NOT FOUND');
  console.log(`ITAR visible: ${itarVis}, text: "${itarText.trim().substring(0, 60)}"`);

  // ── ERRORS ──
  console.log('\n=== PAGE ERRORS ===');
  if (errors.length === 0) console.log('NONE ✓');
  else errors.forEach(e => console.log(`  ✗ ${e.substring(0, 120)}`));

  await page.screenshot({ path: '/tmp/def-09-final.png', fullPage: true });
});
