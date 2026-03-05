// Complete the FULL flow then test every click
import { test } from '@playwright/test';

const BASE = 'http://localhost:8080';

async function completeFullAuth(page) {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Enter Platform
  await page.locator('button:has-text("Enter Platform")').first().click();
  await page.waitForTimeout(800);

  // Accept consent
  const consent = page.locator('button:has-text("I Accept")');
  if (await consent.isVisible().catch(() => false)) {
    await consent.click();
    await page.waitForTimeout(800);
  }

  // CAC auth
  const cac = page.locator('button:has-text("Authenticate with CAC")');
  if (await cac.isVisible().catch(() => false)) {
    await cac.click();
    await page.waitForTimeout(3500);
  }

  // Complete ALL onboarding steps
  const onboard = page.locator('#onboardOverlay');
  if (await onboard.isVisible().catch(() => false)) {
    for (let i = 0; i < 15; i++) {
      const btn = page.locator('#onboardOverlay button:visible').first();
      if (await btn.count() === 0) break;
      const text = (await btn.textContent()).trim();
      console.log(`  Onboard: "${text.substring(0, 30)}"`);
      await btn.click();
      await page.waitForTimeout(600);
      if (!(await onboard.isVisible().catch(() => false))) {
        console.log('  Onboarding complete!');
        break;
      }
    }
  }
  await page.waitForTimeout(1000);

  // Role selector
  const roleModal = page.locator('#roleModal');
  if (await roleModal.isVisible().catch(() => false)) {
    const roleCard = page.locator('.role-card').first();
    if (await roleCard.count() > 0) {
      await roleCard.click();
      console.log('  Selected role');
      await page.waitForTimeout(500);
    }
    // Look for Apply/Set/Confirm button
    const applyBtn = page.locator('#roleModal button:visible').last();
    if (await applyBtn.count() > 0) {
      const txt = (await applyBtn.textContent()).trim();
      console.log(`  Role button: "${txt.substring(0, 30)}"`);
      await applyBtn.click();
      await page.waitForTimeout(1500);
    }
  }
  console.log('Auth flow complete.');
}

test('After full auth — test every interaction', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await completeFullAuth(page);
  await page.screenshot({ path: '/tmp/flow-01-workspace.png', fullPage: false });

  // Check if workspace is visible
  const wsVis = await page.locator('#platformWorkspace').isVisible().catch(() => false);
  console.log(`\nWorkspace visible: ${wsVis}`);
  
  // Check if onboarding is still showing  
  const onboardStillVis = await page.locator('#onboardOverlay').isVisible().catch(() => false);
  console.log(`Onboarding still showing: ${onboardStillVis}`);

  // If onboarding is stuck, force-dismiss it
  if (onboardStillVis) {
    console.log('FORCING onboarding dismissal...');
    await page.evaluate(() => {
      const ov = document.getElementById('onboardOverlay');
      if (ov) ov.style.display = 'none';
      sessionStorage.setItem('s4_onboard_done', '1');
    });
    await page.waitForTimeout(500);
  }

  // If no role was applied, force it
  const roleStillVis = await page.locator('#roleModal').isVisible().catch(() => false);
  if (roleStillVis) {
    console.log('FORCING role apply...');
  }
  
  // Force role if needed
  await page.evaluate(() => {
    if (typeof window.applyRole === 'function' && !sessionStorage.getItem('s4_user_role')) {
      // Set the role first
      if (typeof window._currentRole !== 'undefined') {
        window._currentRole = 'logistics_officer';
      }
      window.applyRole();
    }
  });
  await page.waitForTimeout(1000);

  // NOW test the actual visible elements
  console.log('\n=== WHAT USER SEES ===');
  
  // Get all visible clickable elements
  const visibleClickables = await page.evaluate(() => {
    const results = [];
    const els = document.querySelectorAll('.hub-card, .ils-tool-card, .sidebar-item, a[data-bs-toggle], .ai-float-toggle, button');
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0) {
        results.push({
          tag: el.tagName,
          class: (el.className || '').toString().substring(0, 50),
          id: el.id || '',
          text: el.textContent?.trim()?.substring(0, 40) || '',
          onclick: el.getAttribute('onclick')?.substring(0, 50) || '',
          href: el.getAttribute('href') || '',
          rect: `${Math.round(r.width)}x${Math.round(r.height)} @${Math.round(r.x)},${Math.round(r.y)}`
        });
      }
    }
    return results;
  });
  
  console.log(`Visible clickable elements: ${visibleClickables.length}`);
  for (const el of visibleClickables) {
    console.log(`  <${el.tag}> .${el.class.substring(0, 30)} #${el.id} "${el.text}" ${el.onclick || el.href} ${el.rect}`);
  }

  await page.screenshot({ path: '/tmp/flow-02-ready.png', fullPage: false });

  // Test hub card clicks
  console.log('\n=== CLICKING HUB CARDS ===');
  const hubCards = page.locator('.hub-card:visible');
  const hubCount = await hubCards.count();
  console.log(`Visible hub cards: ${hubCount}`);
  
  for (let i = 0; i < hubCount; i++) {
    const card = hubCards.nth(i);
    const text = (await card.textContent()).trim().substring(0, 30);
    console.log(`\nClicking hub card ${i}: "${text}"`);
    await card.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `/tmp/flow-03-hub${i}.png`, fullPage: false });
    
    // What tab is now active?
    const activePanes = await page.$$('.tab-pane.active.show');
    for (const pane of activePanes) {
      const paneId = await pane.evaluate(e => e.id);
      const paneVis = await pane.evaluate(e => {
        const r = e.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), display: getComputedStyle(e).display };
      });
      console.log(`  Active pane: #${paneId} ${paneVis.display} ${paneVis.w}x${paneVis.h}`);
    }
    
    // Check tab nav
    const tabNavVis = await page.locator('#hiddenTabNav').isVisible().catch(() => false);
    console.log(`  Tab nav visible: ${tabNavVis}`);
    
    // Check AI toggle  
    const aiToggleVis = await page.locator('.ai-float-toggle').isVisible().catch(() => false);
    console.log(`  AI toggle visible: ${aiToggleVis}`);
    
    // Check sidebar
    const sidebarVis = await page.locator('#ilsSidebar').isVisible().catch(() => false);
    const sidebarCount = await page.locator('#ilsSidebar .sidebar-item:visible').count();
    console.log(`  Sidebar visible: ${sidebarVis}, items: ${sidebarCount}`);
    
    // Check tool cards in ILS
    const toolCardVis = await page.locator('.ils-tool-card:visible').count();
    console.log(`  ILS tool cards visible: ${toolCardVis}`);
    
    // Go back to hub
    await page.evaluate(() => {
      const hub = document.getElementById('platformHub');
      if (hub) hub.scrollIntoView();
    });
  }

  // Test ILS tool card clicks  
  console.log('\n=== CLICKING ILS TOOL CARDS ===');
  // First navigate to ILS
  const ilsLink = page.locator('a[href="#tabILS"]');
  if (await ilsLink.count() > 0) {
    await page.evaluate(() => {
      // Programmatically show ILS tab
      const tab = document.querySelector('a[href="#tabILS"]');
      if (tab) {
        const bsTab = new bootstrap.Tab(tab);
        bsTab.show();
      }
    });
    await page.waitForTimeout(1000);
    
    const ilsVis = await page.locator('#tabILS').isVisible().catch(() => false);
    console.log(`ILS tab visible after activation: ${ilsVis}`);
    
    const visToolCards = page.locator('.ils-tool-card:visible');
    const toolCount = await visToolCards.count();
    console.log(`Visible ILS tool cards: ${toolCount}`);

    // Click first 3 tool cards
    for (let i = 0; i < Math.min(3, toolCount); i++) {
      const tc = visToolCards.nth(i);
      const text = (await tc.textContent()).trim().substring(0, 25);
      await tc.click();
      await page.waitForTimeout(1000);
      console.log(`  Clicked tool: "${text}"`);
      await page.screenshot({ path: `/tmp/flow-04-tool${i}.png`, fullPage: false });
      
      // Check what hub panel opened
      const openPanels = await page.evaluate(() => {
        const panels = document.querySelectorAll('.ils-hub-panel');
        return Array.from(panels).filter(p => getComputedStyle(p).display !== 'none').map(p => p.id);
      });
      console.log(`    Open panels: ${openPanels.join(', ') || 'none'}`);
    }
  }
  
  // Test AI agent
  console.log('\n=== AI AGENT TEST ===');
  const aiWrapDisplay = await page.locator('#aiFloatWrapper').evaluate(e => getComputedStyle(e).display).catch(() => 'MISSING');
  console.log(`aiFloatWrapper display: ${aiWrapDisplay}`);
  
  const aiToggle = page.locator('.ai-float-toggle:visible');
  if (await aiToggle.count() > 0) {
    await aiToggle.click();
    await page.waitForTimeout(500);
    const panelVis = await page.locator('#aiFloatPanel').isVisible().catch(() => false);
    console.log(`After toggle click: panel visible=${panelVis}`);
    await page.screenshot({ path: '/tmp/flow-05-ai.png', fullPage: false });
  } else {
    console.log('AI toggle NOT visible');
    // Check if it exists but hidden
    const toggleExists = await page.locator('.ai-float-toggle').count();
    const wrapperParent = await page.evaluate(() => {
      const w = document.getElementById('aiFloatWrapper');
      if (!w) return 'NOT IN DOM';
      return `parent=${w.parentElement?.id || w.parentElement?.tagName}, display=${getComputedStyle(w).display}, parentDisplay=${getComputedStyle(w.parentElement).display}`;
    });
    console.log(`  toggle exists: ${toggleExists > 0}, wrapper: ${wrapperParent}`);
  }

  // Errors
  console.log('\n=== ERRORS ===');
  errors.forEach(e => console.log(`  ${e.substring(0, 120)}`));
  if (errors.length === 0) console.log('None');

  await page.screenshot({ path: '/tmp/flow-06-final.png', fullPage: true });
});
