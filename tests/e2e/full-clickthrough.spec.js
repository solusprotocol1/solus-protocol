// Full click-through test — simulates a real user clicking through prod-app
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('Full prod-app clickthrough', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // 1. Load page
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/ct-01-loaded.png', fullPage: false });

  // 2. Check if onboarding overlay is visible
  const onboard = await page.$('#onboardOverlay');
  const onboardVisible = onboard ? await onboard.isVisible() : false;
  console.log(`STEP 1 - Onboarding visible: ${onboardVisible}`);

  // 3. Click "Enter Platform" button
  const enterBtn = await page.$('.onboard-btn');
  if (enterBtn && await enterBtn.isVisible()) {
    await enterBtn.click();
    console.log('STEP 2 - Clicked Enter Platform');
    await page.waitForTimeout(1500);
  } else {
    console.log('STEP 2 - No Enter Platform button visible');
  }
  await page.screenshot({ path: '/tmp/ct-02-after-enter.png', fullPage: false });

  // 4. Check role selection
  const roleModal = await page.$('#roleModal');
  const roleVisible = roleModal ? await roleModal.isVisible() : false;
  console.log(`STEP 3 - Role modal visible: ${roleVisible}`);

  // If role modal visible, select a role
  if (roleVisible) {
    const roleCards = await page.$$('.role-card');
    console.log(`  Role cards found: ${roleCards.length}`);
    if (roleCards.length > 0) {
      await roleCards[0].click();
      console.log('  Clicked first role card');
      await page.waitForTimeout(1500);
    }
  }
  await page.screenshot({ path: '/tmp/ct-03-after-role.png', fullPage: false });

  // 5. Check what's visible now — the main workspace
  const workspace = await page.$('#platformWorkspace');
  const wsVisible = workspace ? await workspace.isVisible() : false;
  console.log(`STEP 4 - platformWorkspace visible: ${wsVisible}`);

  const aiWrapper = await page.$('#aiFloatWrapper');
  const aiWrapperDisplay = aiWrapper ? await aiWrapper.evaluate(el => getComputedStyle(el).display) : 'NOT_FOUND';
  console.log(`STEP 4 - aiFloatWrapper display: ${aiWrapperDisplay}`);

  // 6. Check platform hub
  const platformHub = await page.$('#platformHub');
  const hubVisible = platformHub ? await platformHub.isVisible() : false;
  console.log(`STEP 5 - platformHub visible: ${hubVisible}`);

  // 7. Check hub cards
  const hubCards = ['hub-analysis', 'hub-team', 'hub-vault', 'hub-dmsms', 'hub-verify', 'hub-anchor'];
  for (const id of hubCards) {
    const el = await page.$(`#${id}`);
    if (el) {
      const vis = await el.isVisible();
      const rect = await el.evaluate(e => {
        const r = e.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      });
      console.log(`  Hub card #${id}: visible=${vis} rect=${JSON.stringify(rect)}`);
    } else {
      console.log(`  Hub card #${id}: NOT IN DOM`);
    }
  }
  await page.screenshot({ path: '/tmp/ct-04-hub.png', fullPage: false });

  // 8. Try clicking each hub card
  for (const id of ['hub-analysis', 'hub-team', 'hub-vault']) {
    const card = await page.$(`#${id}`);
    if (card && await card.isVisible()) {
      await card.click();
      console.log(`STEP 6 - Clicked #${id}`);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `/tmp/ct-05-clicked-${id}.png`, fullPage: false });
    }
  }

  // 9. Check tab navigation
  const tabNav = await page.$('#hiddenTabNav');
  const tabNavVisible = tabNav ? await tabNav.isVisible() : false;
  console.log(`STEP 7 - hiddenTabNav visible: ${tabNavVisible}`);

  // 10. Find all tab links and try clicking them
  const tabLinks = await page.$$('#hiddenTabNav a[data-bs-toggle="pill"]');
  console.log(`  Tab links found: ${tabLinks.length}`);
  for (const link of tabLinks) {
    const text = await link.evaluate(el => el.textContent.trim().substring(0, 30));
    const href = await link.evaluate(el => el.getAttribute('href'));
    const vis = await link.isVisible();
    console.log(`    Tab: "${text}" href=${href} visible=${vis}`);
  }

  // 11. Try clicking Anchor tab
  const anchorTab = await page.$('a[href="#tabAnchor"]');
  if (anchorTab) {
    const anchorVis = await anchorTab.isVisible();
    console.log(`STEP 8 - Anchor tab visible: ${anchorVis}`);
    if (anchorVis) {
      await anchorTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/ct-06-anchor-tab.png', fullPage: false });

      // Check anchor form
      const anchorForm = await page.$('#tabAnchor');
      const formVis = anchorForm ? await anchorForm.isVisible() : false;
      console.log(`  tabAnchor pane visible: ${formVis}`);
      
      // Check form elements
      for (const sel of ['#categorySelect', '#prioritySelect', '#anchorRecordId', '#anchorDescription']) {
        const el = await page.$(sel);
        const elVis = el ? await el.isVisible() : false;
        console.log(`    ${sel}: ${el ? `exists, visible=${elVis}` : 'NOT IN DOM'}`);
      }
    }
  } else {
    console.log('STEP 8 - Anchor tab NOT IN DOM');
  }

  // 12. Try clicking ILS tab
  const ilsTab = await page.$('a[href="#tabILS"]');
  if (ilsTab) {
    const ilsVis = await ilsTab.isVisible();
    console.log(`STEP 9 - ILS tab visible: ${ilsVis}`);
    if (ilsVis) {
      await ilsTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/ct-07-ils-tab.png', fullPage: false });

      const ilsPane = await page.$('#tabILS');
      const ilsPaneActive = ilsPane ? await ilsPane.evaluate(el => el.classList.contains('active')) : false;
      console.log(`  tabILS active: ${ilsPaneActive}`);
    }
  }

  // 13. Try AI toggle button
  const aiToggle = await page.$('.ai-float-toggle');
  if (aiToggle) {
    const toggleVis = await aiToggle.isVisible();
    console.log(`STEP 10 - AI toggle visible: ${toggleVis}`);
    if (toggleVis) {
      await aiToggle.click();
      await page.waitForTimeout(500);
      const panel = await page.$('#aiFloatPanel');
      const panelVis = panel ? await panel.isVisible() : false;
      console.log(`  After click - aiFloatPanel visible: ${panelVis}`);
      await page.screenshot({ path: '/tmp/ct-08-ai-panel.png', fullPage: false });
    }
  } else {
    console.log('STEP 10 - AI toggle NOT IN DOM');
  }

  // 14. Check Verify tab
  const verifyTab = await page.$('a[href="#tabVerify"]');
  if (verifyTab) {
    const vVis = await verifyTab.isVisible();
    console.log(`STEP 11 - Verify tab visible: ${vVis}`);
    if (vVis) {
      await verifyTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/ct-09-verify-tab.png', fullPage: false });
    }
  }

  // 15. Check sidebar items
  const sidebarItems = await page.$$('#ilsSidebar .sidebar-item');
  console.log(`STEP 12 - Sidebar items: ${sidebarItems.length}`);
  for (const item of sidebarItems) {
    const text = await item.evaluate(el => el.textContent.trim().substring(0, 40));
    const vis = await item.isVisible();
    const onclick = await item.evaluate(el => el.getAttribute('onclick') || '');
    console.log(`  Sidebar: "${text}" visible=${vis} onclick=${onclick.substring(0, 50)}`);
  }

  // 16. Try clicking each sidebar item
  for (let i = 0; i < Math.min(sidebarItems.length, 6); i++) {
    const item = sidebarItems[i];
    const vis = await item.isVisible();
    if (vis) {
      const text = await item.evaluate(el => el.textContent.trim().substring(0, 20));
      await item.click();
      await page.waitForTimeout(800);
      console.log(`  Clicked sidebar item ${i}: "${text}"`);
      await page.screenshot({ path: `/tmp/ct-10-sidebar-${i}.png`, fullPage: false });
    }
  }

  // 17. Check ITAR banner
  const itarBanner = await page.$('#itarBanner');
  if (itarBanner) {
    const itarVis = await itarBanner.isVisible();
    const itarPos = await itarBanner.evaluate(el => getComputedStyle(el).position);
    console.log(`STEP 13 - ITAR banner visible: ${itarVis}, position: ${itarPos}`);
  } else {
    console.log('STEP 13 - ITAR banner NOT IN DOM');
  }

  // 18. Check for security policy link
  const secLink = await page.$('a[href*="security"]');
  console.log(`STEP 14 - Security link: ${secLink ? 'found' : 'NOT FOUND'}`);

  // 19. Check SLS balance bar
  const slsBar = await page.$('#slsBalanceBar');
  const slsBarVis = slsBar ? await slsBar.isVisible() : false;
  console.log(`STEP 15 - slsBalanceBar: ${slsBar ? `exists, visible=${slsBarVis}` : 'NOT IN DOM'}`);

  // 20. Check wallet tab
  const walletTab = await page.$('a[href="#tabWallet"]');
  if (walletTab) {
    const wVis = await walletTab.isVisible();
    console.log(`STEP 16 - Wallet tab visible: ${wVis}`);
    if (wVis) {
      await walletTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/ct-11-wallet-tab.png', fullPage: false });
    }
  }

  // Summary
  console.log('\n=== PAGE ERRORS ===');
  if (errors.length === 0) console.log('NONE');
  else errors.forEach(e => console.log(`  ERROR: ${e}`));

  // Final full-page screenshot
  await page.screenshot({ path: '/tmp/ct-12-final.png', fullPage: true });
  console.log('\nDone. Screenshots in /tmp/ct-*.png');
});
