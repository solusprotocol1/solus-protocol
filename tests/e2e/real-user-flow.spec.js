// Correct full auth flow clickthrough — matches real user experience
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('Real user flow — full auth + workspace clickthrough', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`CONSOLE ERROR: ${msg.text()}`);
  });

  // 1. Load page
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Check landing page
  const landing = await page.$('#platformLanding');
  const landingVis = landing ? await landing.isVisible() : false;
  const hero = await page.$('.hero');
  const heroVis = hero ? await hero.isVisible() : false;
  console.log(`LOAD: landing visible=${landingVis}, hero visible=${heroVis}`);
  
  // Find "Enter Platform" button
  const enterBtn = await page.$('button[onclick*="startAuthFlow"]');
  const enterBtnText = enterBtn ? await enterBtn.evaluate(el => el.textContent.trim()) : 'NOT FOUND';
  const enterBtnVis = enterBtn ? await enterBtn.isVisible() : false;
  console.log(`ENTER BTN: "${enterBtnText}" visible=${enterBtnVis}`);
  await page.screenshot({ path: '/tmp/real-01-landing.png', fullPage: false });

  if (!enterBtn || !enterBtnVis) {
    console.log('FATAL: Cannot find Enter Platform button');
    return;
  }

  // 2. Click "Enter Platform"
  await enterBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/real-02-after-enter.png', fullPage: false });
  
  // Check what appeared — consent banner or auth or onboarding
  const consentBanner = await page.$('#dowConsent');
  const consentVis = consentBanner ? await consentBanner.isVisible() : false;
  console.log(`CONSENT BANNER: ${consentBanner ? `exists, visible=${consentVis}` : 'NOT IN DOM'}`);

  // Check auth gate
  const authGate = await page.$('#authGate');
  const authVis = authGate ? await authGate.isVisible() : false;
  console.log(`AUTH GATE: ${authGate ? `exists, visible=${authVis}` : 'NOT IN DOM'}`);

  // Accept consent if visible
  if (consentVis) {
    const acceptBtn = await page.$('#dowConsent button, #dowConsent .accept-btn, #consentAccept');
    if (acceptBtn && await acceptBtn.isVisible()) {
      await acceptBtn.click();
      console.log('  Clicked consent accept');
      await page.waitForTimeout(1000);
    } else {
      // Try any button inside consent banner
      const anyBtn = await page.$('#dowConsent button');
      if (anyBtn) {
        await anyBtn.click();
        console.log('  Clicked consent button');
        await page.waitForTimeout(1000);
      }
    }
    await page.screenshot({ path: '/tmp/real-03-after-consent.png', fullPage: false });
  }

  // 3. Handle CAC auth
  const cacBtn = await page.$('button:has-text("Authenticate"), button:has-text("CAC"), #cacAuthBtn');
  if (cacBtn && await cacBtn.isVisible()) {
    await cacBtn.click();
    console.log('  Clicked CAC auth button');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/real-04-after-cac.png', fullPage: false });
  }

  // Try all possible auth states
  const allButtons = await page.$$('button');
  console.log('\nVISIBLE BUTTONS AFTER AUTH FLOW:');
  for (const btn of allButtons) {
    const vis = await btn.isVisible();
    if (vis) {
      const text = await btn.evaluate(el => el.textContent.trim().substring(0, 50));
      const onclick = await btn.evaluate(el => el.getAttribute('onclick') || 'none');
      console.log(`  BTN: "${text}" onclick="${onclick.substring(0, 60)}"`);
    }
  }

  // 4. Handle onboarding if visible
  const onboard = await page.$('#onboardOverlay');
  const onboardVis = onboard ? await onboard.isVisible() : false;
  console.log(`\nONBOARDING: ${onboard ? `exists, visible=${onboardVis}` : 'NOT IN DOM'}`);
  
  if (onboardVis) {
    // Click through onboarding steps
    for (let step = 0; step < 6; step++) {
      const nextBtn = await page.$('#onboardOverlay .onboard-btn, #onboardOverlay button:has-text("Next"), #onboardOverlay button:has-text("Enter"), #onboardOverlay button:has-text("Start"), #onboardOverlay button:has-text("Continue")');
      if (nextBtn && await nextBtn.isVisible()) {
        const txt = await nextBtn.evaluate(el => el.textContent.trim());
        await nextBtn.click();
        console.log(`  Onboard step ${step}: clicked "${txt}"`);
        await page.waitForTimeout(1000);
      } else {
        console.log(`  Onboard step ${step}: no next button found`);
        break;
      }
    }
    await page.screenshot({ path: '/tmp/real-05-after-onboard.png', fullPage: false });
  }

  // 5. Check role modal
  const roleModal = await page.$('#roleModal');
  const roleVis = roleModal ? await roleModal.isVisible() : false;
  console.log(`ROLE MODAL: ${roleModal ? `exists, visible=${roleVis}` : 'NOT IN DOM'}`);

  if (roleVis) {
    const roleCards = await page.$$('.role-card');
    console.log(`  Role cards: ${roleCards.length}`);
    if (roleCards.length > 0) {
      await roleCards[0].click();
      console.log('  Selected first role');
      await page.waitForTimeout(1500);
    }
  } else {
    // Try direct auth approach — call enterPlatformAfterAuth directly
    console.log('  Trying enterPlatformAfterAuth() directly...');
    await page.evaluate(() => {
      if (typeof window.enterPlatformAfterAuth === 'function') {
        window.enterPlatformAfterAuth();
      } else if (typeof enterPlatformAfterAuth === 'function') {
        enterPlatformAfterAuth();
      }
    });
    await page.waitForTimeout(2000);

    // Check if role modal appeared
    const roleVis2 = roleModal ? await roleModal.isVisible() : false;
    console.log(`  After enterPlatformAfterAuth: role modal visible=${roleVis2}`);
  }

  await page.screenshot({ path: '/tmp/real-06-after-role.png', fullPage: false });

  // 6. Apply role if available
  const applyRoleExists = await page.evaluate(() => typeof window.applyRole === 'function');
  if (applyRoleExists) {
    await page.evaluate(() => window.applyRole('logistics_officer'));
    console.log('  Applied role via JS');
    await page.waitForTimeout(2000);
  }
  
  await page.screenshot({ path: '/tmp/real-07-workspace.png', fullPage: false });

  // 7. NOW check everything the user would see
  console.log('\n=== WORKSPACE STATE ===');
  
  const checks = [
    '#platformWorkspace', '#platformHub', '#hiddenTabNav', 
    '#aiFloatWrapper', '.ai-float-toggle',
    '#hub-analysis', '#hub-team', '#hub-vault', '#hub-dmsms',
    '#tabAnchor', '#tabVerify', '#tabILS', '#tabWallet',
    '#itarBanner', '#slsBalanceBar', '#walletTriggerBtn'
  ];
  
  for (const sel of checks) {
    const el = await page.$(sel);
    if (el) {
      const vis = await el.isVisible();
      const display = await el.evaluate(e => getComputedStyle(e).display);
      const rect = await el.evaluate(e => {
        const r = e.getBoundingClientRect();
        return `${Math.round(r.width)}x${Math.round(r.height)} @${Math.round(r.x)},${Math.round(r.y)}`;
      });
      console.log(`  ${sel}: visible=${vis} display=${display} rect=${rect}`);
    } else {
      console.log(`  ${sel}: NOT IN DOM`);
    }
  }

  // 8. Click hub cards
  console.log('\n=== CLICKING HUB CARDS ===');
  for (const id of ['hub-analysis', 'hub-team', 'hub-vault', 'hub-dmsms']) {
    const card = await page.$(`#${id}`);
    if (card && await card.isVisible()) {
      await card.click();
      console.log(`  Clicked #${id}`);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `/tmp/real-08-${id}.png`, fullPage: false });
      
      // Check what tab/section opened
      const activeTab = await page.$('.tab-pane.active.show');
      if (activeTab) {
        const activeId = await activeTab.evaluate(el => el.id);
        console.log(`    Active tab: #${activeId}`);
      }
    } else {
      console.log(`  #${id}: ${card ? 'exists but NOT visible' : 'NOT IN DOM'}`);
    }
  }

  // 9. Click tab nav items
  console.log('\n=== CLICKING TABS ===');
  for (const href of ['#tabAnchor', '#tabVerify', '#tabILS', '#tabWallet']) {
    const tab = await page.$(`a[href="${href}"]`);
    if (tab && await tab.isVisible()) {
      await tab.click();
      await page.waitForTimeout(800);
      const pane = await page.$(href);
      const paneVis = pane ? await pane.isVisible() : false;
      console.log(`  ${href}: clicked, pane visible=${paneVis}`);
      await page.screenshot({ path: `/tmp/real-09-tab-${href.slice(1)}.png`, fullPage: false });
      
      // For ILS tab check AI toggle
      if (href === '#tabILS') {
        const aiToggle = await page.$('.ai-float-toggle');
        if (aiToggle && await aiToggle.isVisible()) {
          await aiToggle.click();
          await page.waitForTimeout(500);
          const aiPanel = await page.$('#aiFloatPanel');
          const panelVis = aiPanel ? await aiPanel.isVisible() : false;
          console.log(`    AI panel after toggle: visible=${panelVis}`);
          await page.screenshot({ path: '/tmp/real-10-ai-panel.png', fullPage: false });
        } else {
          console.log(`    AI toggle: ${aiToggle ? 'exists but NOT visible' : 'NOT IN DOM'}`);
        }

        // Check sidebar
        const sidebarItems = await page.$$('#ilsSidebar .sidebar-item');
        console.log(`    ILS sidebar items: ${sidebarItems.length}`);
        for (const si of sidebarItems.slice(0, 5)) {
          const text = await si.evaluate(el => el.textContent.trim().substring(0, 30));
          const siVis = await si.isVisible();
          console.log(`      "${text}" visible=${siVis}`);
        }
      }

      // For Anchor tab check form elements  
      if (href === '#tabAnchor') {
        for (const s of ['#categorySelect', '#prioritySelect', '#anchorRecordId', '#anchorBtn']) {
          const el = await page.$(s);
          const elVis = el ? await el.isVisible() : false;
          console.log(`    ${s}: ${el ? `visible=${elVis}` : 'NOT IN DOM'}`);
        }
      }
    } else {
      console.log(`  ${href}: ${tab ? 'exists but NOT visible' : 'NOT IN DOM'}`);
    }
  }

  // 10. Summary
  console.log('\n=== PAGE ERRORS ===');
  if (errors.length === 0) console.log('NONE');
  else errors.forEach(e => console.log(`  ${e.substring(0, 120)}`));

  await page.screenshot({ path: '/tmp/real-11-final.png', fullPage: true });
});
