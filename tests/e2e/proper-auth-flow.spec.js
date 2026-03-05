// Full proper auth flow — consent → CAC → onboard → role → check everything
import { test } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('Proper auth flow clickthrough', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log('=== PAGE LOADED ===');

  // Step 1: Click "Enter Platform"
  const enterBtn = page.locator('button:has-text("Enter Platform")').first();
  await enterBtn.waitFor({ state: 'visible', timeout: 5000 });
  await enterBtn.click();
  console.log('1. Clicked Enter Platform');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/auth-01-consent.png', fullPage: false });

  // Step 2: Accept DoD consent
  const consentBtn = page.locator('button:has-text("I Accept")');
  const consentVisible = await consentBtn.isVisible().catch(() => false);
  console.log(`2. Consent button visible: ${consentVisible}`);
  if (consentVisible) {
    await consentBtn.click();
    console.log('   Clicked Accept');
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: '/tmp/auth-02-cac.png', fullPage: false });

  // Step 3: CAC authenticate
  const cacBtn = page.locator('button:has-text("Authenticate with CAC")');
  const cacVisible = await cacBtn.isVisible().catch(() => false);
  console.log(`3. CAC button visible: ${cacVisible}`);
  if (cacVisible) {
    await cacBtn.click();
    console.log('   Clicked CAC auth');
    await page.waitForTimeout(3000); // Wait for simulated auth (1.5s + 0.8s delays)
  }
  await page.screenshot({ path: '/tmp/auth-03-after-cac.png', fullPage: false });

  // Step 4: Onboarding
  const onboard = page.locator('#onboardOverlay');
  const onboardVis = await onboard.isVisible().catch(() => false);
  console.log(`4. Onboarding visible: ${onboardVis}`);
  
  if (onboardVis) {
    // Click through each onboarding step
    for (let i = 0; i < 8; i++) {
      const nextBtn = page.locator('#onboardOverlay button:visible').first();
      const exists = await nextBtn.count() > 0;
      if (!exists) break;
      const text = await nextBtn.textContent();
      console.log(`   Step ${i}: button "${text.trim().substring(0, 40)}"`);
      await nextBtn.click();
      await page.waitForTimeout(800);
      
      const stillVisible = await onboard.isVisible().catch(() => false);
      if (!stillVisible) {
        console.log('   Onboarding dismissed');
        break;
      }
    }
  }
  await page.screenshot({ path: '/tmp/auth-04-after-onboard.png', fullPage: false });
  await page.waitForTimeout(1000);

  // Step 5: Role selector
  const roleModal = page.locator('#roleModal');
  const roleVis = await roleModal.isVisible().catch(() => false);
  console.log(`5. Role modal visible: ${roleVis}`);
  
  if (roleVis) {
    // Click first role card
    const roleCard = page.locator('.role-card').first();
    if (await roleCard.count() > 0) {
      const roleName = await roleCard.textContent();
      await roleCard.click();
      console.log(`   Selected role: "${roleName.trim().substring(0, 30)}"`);
      await page.waitForTimeout(1000);
    }
    
    // Click Apply/Confirm button
    const applyBtn = page.locator('#roleModal button:has-text("Apply"), #roleModal button:has-text("Confirm"), #roleModal .onboard-btn').first();
    if (await applyBtn.count() > 0 && await applyBtn.isVisible()) {
      await applyBtn.click();
      console.log('   Clicked apply role');
      await page.waitForTimeout(1500);
    }
  } else {
    console.log('   No role modal — checking if workspace is visible...');
  }
  await page.screenshot({ path: '/tmp/auth-05-workspace.png', fullPage: false });

  // Step 6: Check workspace state
  console.log('\n=== WORKSPACE STATE ===');
  
  const wsEl = page.locator('#platformWorkspace');
  const wsDisplay = await wsEl.evaluate(e => getComputedStyle(e).display).catch(() => 'NOT_FOUND');
  console.log(`platformWorkspace display: ${wsDisplay}`);
  
  const hubEl = page.locator('#platformHub');
  const hubDisplay = await hubEl.evaluate(e => getComputedStyle(e).display).catch(() => 'NOT_FOUND');
  const hubSize = await hubEl.evaluate(e => { const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }).catch(() => '??');
  console.log(`platformHub display: ${hubDisplay} size: ${hubSize}`);

  // Step 7: Check hub CARDS (the clickable tool cards in the grid)
  console.log('\n=== HUB TOOL CARDS (what user sees & clicks) ===');
  const toolCards = await page.$$('.ils-tool-card');
  console.log(`Total .ils-tool-card elements: ${toolCards.length}`);
  for (const card of toolCards) {
    const text = await card.evaluate(e => e.textContent.trim().substring(0, 40));
    const vis = await card.evaluate(e => {
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      return { display: cs.display, vis: cs.visibility, w: Math.round(r.width), h: Math.round(r.height), opacity: cs.opacity };
    });
    const onclick = await card.evaluate(e => e.getAttribute('onclick') || '');
    console.log(`  "${text}" display=${vis.display} ${vis.w}x${vis.h} opacity=${vis.opacity} onclick=${onclick.substring(0, 40)}`);
  }

  // Step 8: Check hub tab buttons
  console.log('\n=== HUB TAB BUTTONS ===');
  const hubTabs = await page.$$('.ils-hub-tab');
  console.log(`Total .ils-hub-tab elements: ${hubTabs.length}`);
  for (const tab of hubTabs) {
    const text = await tab.evaluate(e => e.textContent.trim());
    const vis = await tab.evaluate(e => getComputedStyle(e).display);
    console.log(`  "${text}" display=${vis}`);
  }

  // Step 9: Try clicking a tool card
  console.log('\n=== CLICKING TOOL CARDS ===');
  const firstVisCard = page.locator('.ils-tool-card:visible').first();
  if (await firstVisCard.count() > 0) {
    const cardText = await firstVisCard.textContent();
    await firstVisCard.click();
    console.log(`Clicked: "${cardText.trim().substring(0, 30)}"`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/auth-06-after-card-click.png', fullPage: false });
    
    // Check what's now visible
    const activePane = await page.$('.tab-pane.active.show');
    if (activePane) {
      const paneId = await activePane.evaluate(e => e.id);
      console.log(`  Active pane: #${paneId}`);
    }
    
    // Check if tab nav appeared
    const tabNav = page.locator('#hiddenTabNav');
    const tabNavVis = await tabNav.isVisible().catch(() => false);
    console.log(`  hiddenTabNav visible: ${tabNavVis}`);
    
    // Check AI toggle
    const aiToggle = page.locator('.ai-float-toggle');
    const aiToggleVis = await aiToggle.isVisible().catch(() => false);
    console.log(`  AI toggle visible: ${aiToggleVis}`);
  } else {
    console.log('NO VISIBLE TOOL CARDS!');
    
    // Debug: what IS visible on the page?
    const visibleElements = await page.evaluate(() => {
      const els = document.querySelectorAll('div, section, button, a');
      const visible = [];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width > 50 && r.height > 20 && r.top < window.innerHeight && r.bottom > 0) {
          visible.push({
            tag: el.tagName,
            id: el.id || '',
            class: (el.className || '').toString().substring(0, 40),
            text: el.textContent?.trim()?.substring(0, 30) || '',
            rect: `${Math.round(r.width)}x${Math.round(r.height)} @${Math.round(r.x)},${Math.round(r.y)}`
          });
        }
      }
      return visible.slice(0, 30);
    });
    console.log('Visible on-screen elements:');
    for (const el of visibleElements) {
      console.log(`  <${el.tag}> #${el.id} .${el.class} "${el.text}" ${el.rect}`);
    }
  }

  // Step 10: Now try ILS navigation directly
  console.log('\n=== DIRECT ILS NAVIGATION ===');
  await page.evaluate(() => {
    if (typeof window.openILSTool === 'function') window.openILSTool('hub-analysis');
  });
  await page.waitForTimeout(1000);
  
  const analysisPanel = page.locator('#hub-analysis');
  const analysisVis = await analysisPanel.isVisible().catch(() => false);
  const analysisDisplay = await analysisPanel.evaluate(e => getComputedStyle(e).display).catch(() => 'none');
  console.log(`After openILSTool('hub-analysis'): visible=${analysisVis} display=${analysisDisplay}`);
  await page.screenshot({ path: '/tmp/auth-07-analysis.png', fullPage: false });

  // Step 11: Check ILS Sidebar
  const sidebar = page.locator('#ilsSidebar');
  const sidebarVis = await sidebar.isVisible().catch(() => false);
  console.log(`\nILS Sidebar visible: ${sidebarVis}`);
  const sidebarItems = await page.$$('#ilsSidebar .sidebar-item');
  console.log(`Sidebar items: ${sidebarItems.length}`);
  for (const item of sidebarItems.slice(0, 8)) {
    const text = await item.evaluate(e => e.textContent.trim().substring(0, 30));
    const vis = await item.evaluate(e => {
      const r = e.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), display: getComputedStyle(e).display };
    });
    console.log(`  "${text}" ${vis.display} ${vis.w}x${vis.h}`);
  }

  // Step 12: Check AI agent
  console.log('\n=== AI AGENT ===');
  const aiWrapper = page.locator('#aiFloatWrapper');
  const aiDisplay = await aiWrapper.evaluate(e => getComputedStyle(e).display).catch(() => 'NOT_FOUND');
  const aiSize = await aiWrapper.evaluate(e => {
    const r = e.getBoundingClientRect();
    return `${Math.round(r.width)}x${Math.round(r.height)}`;
  }).catch(() => '??');
  console.log(`aiFloatWrapper: display=${aiDisplay} size=${aiSize}`);

  const aiToggle2 = page.locator('.ai-float-toggle');
  const toggleVis2 = await aiToggle2.isVisible().catch(() => false);
  console.log(`ai-float-toggle visible: ${toggleVis2}`);
  
  if (toggleVis2) {
    await aiToggle2.click();
    await page.waitForTimeout(500);
    const panelVis = await page.locator('#aiFloatPanel').isVisible().catch(() => false);
    console.log(`After click, aiFloatPanel visible: ${panelVis}`);
    await page.screenshot({ path: '/tmp/auth-08-ai-open.png', fullPage: false });
  }

  // Page errors
  console.log('\n=== PAGE ERRORS ===');
  if (errors.length === 0) console.log('NONE');
  else errors.forEach(e => console.log(`  ${e.substring(0, 150)}`));
  
  await page.screenshot({ path: '/tmp/auth-09-final.png', fullPage: true });
});
