import { test } from '@playwright/test';

test('investigate section children', async ({ browser }) => {
  test.setTimeout(120000);
  const prodPage = await browser.newPage();
  const demoPage = await browser.newPage();

  await Promise.all([
    prodPage.goto('http://localhost:8080/', { waitUntil: 'networkidle' }),
    demoPage.goto('http://localhost:8080/demo-app/', { waitUntil: 'networkidle' }),
  ]);
  await Promise.all([
    prodPage.evaluate(() => { sessionStorage.clear(); localStorage.clear(); }),
    demoPage.evaluate(() => { sessionStorage.clear(); localStorage.clear(); }),
  ]);
  await Promise.all([
    prodPage.goto('http://localhost:8080/', { waitUntil: 'networkidle' }),
    demoPage.goto('http://localhost:8080/demo-app/', { waitUntil: 'networkidle' }),
  ]);
  await Promise.all([prodPage.waitForTimeout(2000), demoPage.waitForTimeout(2000)]);

  // Fast auth both
  async function fastAuth(page) {
    const enter = page.locator('button:has-text("Enter Platform")').first();
    if (await enter.isVisible({ timeout: 3000 }).catch(() => false)) { await enter.click(); await page.waitForTimeout(1000); }
    const consent = page.locator('#dodConsentBanner button').first();
    if (await consent.isVisible({ timeout: 3000 }).catch(() => false)) { await consent.click(); await page.waitForTimeout(1000); }
    const cac = page.locator('button:has-text("Authenticate with CAC"), button:has-text("Start Demo Session")').first();
    if (await cac.isVisible({ timeout: 3000 }).catch(() => false)) { await cac.click(); await page.waitForTimeout(4000); }
    const overlay = page.locator('#onboardOverlay');
    if (await overlay.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.evaluate(() => { const c = document.querySelector('.onboard-tier[data-tier="enterprise"]'); if (c && window.selectOnboardTier) window.selectOnboardTier(c, 'enterprise'); });
      for (let i = 0; i < 5; i++) { await page.evaluate(() => { if (window.onboardNext) window.onboardNext(); }); await page.waitForTimeout(600); }
    }
    await page.waitForTimeout(800);
    await page.evaluate(() => { if (window.applyRole) window.applyRole(); });
    await page.waitForTimeout(1000);
  }
  await fastAuth(prodPage);
  await fastAuth(demoPage);

  // ===== INVESTIGATE TAB-SECTION CHILDREN =====
  console.log('\n=== TAB-SECTION STRUCTURE ===');
  
  const [prodTab, demoTab] = await Promise.all([
    prodPage.evaluate(() => {
      const section = document.querySelector('.tab-section');
      if (!section) return 'NO .tab-section FOUND';
      const children = Array.from(section.children);
      return {
        total: children.length,
        children: children.map(c => ({
          tag: c.tagName,
          id: c.id,
          display: c.style.display || '(unset)',
          computed: getComputedStyle(c).display,
          classes: c.className?.substring(0, 60),
        })),
      };
    }),
    demoPage.evaluate(() => {
      const section = document.querySelector('.tab-section');
      if (!section) return 'NO .tab-section FOUND';
      const children = Array.from(section.children);
      return {
        total: children.length,
        children: children.map(c => ({
          tag: c.tagName,
          id: c.id,
          display: c.style.display || '(unset)',
          computed: getComputedStyle(c).display,
          classes: c.className?.substring(0, 60),
        })),
      };
    }),
  ]);

  console.log('PROD tab-section children:', JSON.stringify(prodTab, null, 2));
  console.log('\nDEMO tab-section children:', JSON.stringify(demoTab, null, 2));

  // ===== INVESTIGATE #platformWorkspace STRUCTURE =====
  console.log('\n=== platformWorkspace direct children ===');
  
  const [prodWS, demoWS] = await Promise.all([
    prodPage.evaluate(() => {
      const ws = document.getElementById('platformWorkspace');
      if (!ws) return 'NOT FOUND';
      return Array.from(ws.children).map(c => ({
        tag: c.tagName,
        id: c.id,
        class: c.className?.substring(0, 60),
        display: c.style.display || '(unset)',
        computed: getComputedStyle(c).display,
      }));
    }),
    demoPage.evaluate(() => {
      const ws = document.getElementById('platformWorkspace');
      if (!ws) return 'NOT FOUND';
      return Array.from(ws.children).map(c => ({
        tag: c.tagName,
        id: c.id,
        class: c.className?.substring(0, 60),
        display: c.style.display || '(unset)',
        computed: getComputedStyle(c).display,
      }));
    }),
  ]);

  console.log('PROD #platformWorkspace children:', JSON.stringify(prodWS, null, 2));
  console.log('\nDEMO #platformWorkspace children:', JSON.stringify(demoWS, null, 2));

  // ===== Check what's AFTER #platformWorkspace =====
  console.log('\n=== BODY-LEVEL ELEMENTS (after platformWorkspace) ===');
  
  const [prodBody, demoBody] = await Promise.all([
    prodPage.evaluate(() => {
      const body = document.body;
      const ws = document.getElementById('platformWorkspace');
      const afterWs = [];
      let foundWs = false;
      for (const child of body.children) {
        if (child === ws) { foundWs = true; continue; }
        if (foundWs) {
          afterWs.push({
            tag: child.tagName,
            id: child.id || '(none)',
            class: child.className?.substring(0, 60) || '(none)',
            display: child.style.display || '(unset)',
            computed: getComputedStyle(child).display,
          });
        }
      }
      return afterWs;
    }),
    demoPage.evaluate(() => {
      const body = document.body;
      const ws = document.getElementById('platformWorkspace');
      const afterWs = [];
      let foundWs = false;
      for (const child of body.children) {
        if (child === ws) { foundWs = true; continue; }
        if (foundWs) {
          afterWs.push({
            tag: child.tagName,
            id: child.id || '(none)',
            class: child.className?.substring(0, 60) || '(none)',
            display: child.style.display || '(unset)',
            computed: getComputedStyle(child).display,
          });
        }
      }
      return afterWs;
    }),
  ]);

  console.log('PROD body after #platformWorkspace:', JSON.stringify(prodBody, null, 2));
  console.log('\nDEMO body after #platformWorkspace:', JSON.stringify(demoBody, null, 2));

  // ===== Check the itarBanner position in the DOM tree =====
  console.log('\n=== ITAR BANNER PARENT ===');
  const itarParent = await prodPage.evaluate(() => {
    const el = document.getElementById('itarBanner');
    if (!el) return 'NOT FOUND';
    return {
      parentTag: el.parentElement?.tagName,
      parentId: el.parentElement?.id,
      parentClass: el.parentElement?.className?.substring(0, 60),
      prevSibling: el.previousElementSibling ? { tag: el.previousElementSibling.tagName, id: el.previousElementSibling.id } : null,
      nextSibling: el.nextElementSibling ? { tag: el.nextElementSibling.tagName, id: el.nextElementSibling.id } : null,
    };
  });
  console.log('ITAR banner parent:', JSON.stringify(itarParent, null, 2));

  // ===== Check AI float wrapper parent =====
  console.log('\n=== AI FLOAT WRAPPER LOCATION ===');
  const [prodAiLoc, demoAiLoc] = await Promise.all([
    prodPage.evaluate(() => {
      const el = document.getElementById('aiFloatWrapper');
      if (!el) return 'NOT FOUND';
      return {
        parentTag: el.parentElement?.tagName,
        parentId: el.parentElement?.id,
        rect: el.getBoundingClientRect(),
        children: Array.from(el.children).map(c => ({
          tag: c.tagName,
          id: c.id,
          class: c.className?.substring(0, 40),
          display: getComputedStyle(c).display,
          rect: c.getBoundingClientRect(),
        })),
      };
    }),
    demoPage.evaluate(() => {
      const el = document.getElementById('aiFloatWrapper');
      if (!el) return 'NOT FOUND';
      return {
        parentTag: el.parentElement?.tagName,
        parentId: el.parentElement?.id,
        rect: el.getBoundingClientRect(),
        children: Array.from(el.children).map(c => ({
          tag: c.tagName,
          id: c.id,
          class: c.className?.substring(0, 40),
          display: getComputedStyle(c).display,
          rect: c.getBoundingClientRect(),
        })),
      };
    }),
  ]);
  console.log('PROD aiFloatWrapper:', JSON.stringify(prodAiLoc, null, 2));
  console.log('\nDEMO aiFloatWrapper:', JSON.stringify(demoAiLoc, null, 2));

  await prodPage.close();
  await demoPage.close();
});
