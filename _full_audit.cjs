// Full platform audit — screenshot every tool, check all issues
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, '_audit_shots');
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Navigate and bypass auth
  await page.goto('http://localhost:8080/demo-app/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem('s4_auth_token', 'audit-session');
    localStorage.setItem('s4_onboarded', 'true');
    localStorage.setItem('s4_demo_mode', 'true');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Dismiss DoD consent banner
  await page.evaluate(() => {
    var banner = document.getElementById('dodConsentBanner');
    if (banner) banner.style.display = 'none';
    var overlay = document.querySelector('.consent-overlay, .modal-backdrop');
    if (overlay) overlay.style.display = 'none';
    // Click accept if available
    var acceptBtn = document.querySelector('#dodConsentBanner button, #dodConsentBanner .btn');
    if (acceptBtn) acceptBtn.click();
  });
  await page.waitForTimeout(500);

  // Enter platform
  const enterBtn = await page.$('button:has-text("Enter Platform"), .onboard-btn');
  if (enterBtn) { 
    await page.evaluate(() => {
      // Force click without Playwright click (avoids interception issues)
      var btn = document.querySelector('.onboard-btn, button[onclick*="enter"], button[onclick*="start"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500); 
  }

  // Make sure workspace is visible and all overlays dismissed
  await page.evaluate(() => {
    var ws = document.getElementById('platformWorkspace');
    if (ws) ws.style.display = 'block';
    var ob = document.getElementById('onboardOverlay');
    if (ob) ob.style.display = 'none';
    var sp = document.getElementById('splashOverlay');
    if (sp) sp.style.display = 'none';
    var banner = document.getElementById('dodConsentBanner');
    if (banner) banner.style.display = 'none';
    // Remove any modal backdrops
    document.querySelectorAll('.modal-backdrop, .consent-overlay').forEach(el => el.remove());
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  });
  await page.waitForTimeout(1000);

  // Screenshot the main workspace first 
  await page.screenshot({ path: path.join(DIR, '00_workspace.png'), fullPage: false });

  // ──────────────────────────────────────────────
  // 1. Screenshot the FAB (lightning bolt)
  // ──────────────────────────────────────────────
  console.log('=== FAB AUDIT ===');
  const fabTrigger = await page.$('.s4-fab-trigger');
  if (fabTrigger) {
    await fabTrigger.screenshot({ path: path.join(DIR, '01_fab_button.png') });
    // Check for white box
    const fabStyles = await page.evaluate(() => {
      const btn = document.querySelector('.s4-fab-trigger');
      if (!btn) return null;
      const s = getComputedStyle(btn);
      return {
        background: s.background,
        backgroundColor: s.backgroundColor,
        border: s.border,
        borderRadius: s.borderRadius,
        boxShadow: s.boxShadow,
        outline: s.outline,
        padding: s.padding,
        width: s.width,
        height: s.height,
      };
    });
    console.log('FAB trigger styles:', JSON.stringify(fabStyles, null, 2));

    // Check parent for white box
    const fabParentStyles = await page.evaluate(() => {
      const fab = document.getElementById('s4QuickFab');
      if (!fab) return null;
      const s = getComputedStyle(fab);
      return {
        background: s.background,
        backgroundColor: s.backgroundColor,
        border: s.border,
        boxShadow: s.boxShadow,
        padding: s.padding,
      };
    });
    console.log('FAB parent styles:', JSON.stringify(fabParentStyles, null, 2));

    // Click to open menu using evaluate to avoid interception
    await page.evaluate(() => { 
      var btn = document.querySelector('.s4-fab-trigger'); 
      if (btn) btn.click(); 
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(DIR, '01_fab_menu_open.png'), fullPage: false });
    await page.evaluate(() => { 
      var btn = document.querySelector('.s4-fab-trigger'); 
      if (btn) btn.click(); 
    });
    await page.waitForTimeout(300);
  } else {
    console.log('FAB NOT FOUND');
  }

  // ──────────────────────────────────────────────
  // 2. Go to ILS Hub and screenshot each tool
  // ──────────────────────────────────────────────
  // Click ILS tab
  await page.evaluate(() => {
    var ilsTab = document.querySelector('[onclick*="showSection"][onclick*="ILS"], .nav-link[data-target="sectionILS"]');
    if (ilsTab) ilsTab.click();
    else if (typeof window.showSection === 'function') window.showSection('sectionILS');
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(DIR, '02_ils_hub_overview.png'), fullPage: false });

  // Get all tool tabs
  const toolTabs = [
    'hub-analysis', 'hub-actions', 'hub-dmsms', 'hub-readiness', 'hub-roi',
    'hub-lifecycle', 'hub-vault', 'hub-docs', 'hub-compliance', 'hub-risk',
    'hub-reports', 'hub-predictive', 'hub-submissions', 'hub-sbom',
    'hub-acquisition', 'hub-milestones'
  ];

  const issues = [];

  for (const tabId of toolTabs) {
    console.log(`\n=== TOOL: ${tabId} ===`);
    
    // Click the tab
    const clicked = await page.evaluate((id) => {
      var tab = document.querySelector(`[data-tab="${id}"], [onclick*="${id}"]`);
      if (tab) { tab.click(); return true; }
      // Try direct show
      var panel = document.getElementById(id);
      if (panel) {
        // Hide all other panels
        document.querySelectorAll('.ils-hub-panel').forEach(p => p.style.display = 'none');
        panel.style.display = 'block';
        return true;
      }
      return false;
    }, tabId);

    if (!clicked) {
      console.log(`  COULD NOT OPEN: ${tabId}`);
      issues.push({ tool: tabId, issue: 'Could not open tab' });
      continue;
    }

    await page.waitForTimeout(800);

    // Full panel screenshot
    await page.screenshot({ path: path.join(DIR, `T_${tabId}.png`), fullPage: false });

    // Scroll down to see full content
    const panel = await page.$(`#${tabId}`);
    if (panel) {
      // Get panel height
      const panelHeight = await page.evaluate((id) => {
        const el = document.getElementById(id);
        return el ? el.scrollHeight : 0;
      }, tabId);
      
      if (panelHeight > 900) {
        // Scroll to middle
        await page.evaluate((id) => {
          const el = document.getElementById(id);
          if (el) el.scrollTop = el.scrollHeight / 3;
        }, tabId);
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(DIR, `T_${tabId}_mid.png`), fullPage: false });

        // Scroll to bottom
        await page.evaluate((id) => {
          const el = document.getElementById(id);
          if (el) el.scrollTop = el.scrollHeight;
        }, tabId);
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(DIR, `T_${tabId}_bot.png`), fullPage: false });

        // Reset scroll
        await page.evaluate((id) => {
          const el = document.getElementById(id);
          if (el) el.scrollTop = 0;
        }, tabId);
      }
    }

    // ── Check for issues in this tool ──

    // A) Button sizes
    const buttonInfo = await page.evaluate((id) => {
      const panel = document.getElementById(id);
      if (!panel || panel.style.display === 'none') return [];
      const btns = panel.querySelectorAll('button, .btn-accent, .btn-gold, .btn-anchor, .btn-export');
      const info = [];
      btns.forEach(b => {
        if (b.offsetHeight === 0 || b.offsetWidth === 0) return;
        const s = getComputedStyle(b);
        info.push({
          text: b.textContent.trim().substring(0, 40),
          className: b.className,
          height: b.offsetHeight,
          width: b.offsetWidth,
          padding: s.padding,
          fontSize: s.fontSize,
          borderRadius: s.borderRadius,
          background: s.backgroundColor,
          color: s.color,
        });
      });
      return info;
    }, tabId);
    
    if (buttonInfo.length > 0) {
      const heights = [...new Set(buttonInfo.map(b => b.height))].sort();
      const fontSizes = [...new Set(buttonInfo.map(b => b.fontSize))].sort();
      const radii = [...new Set(buttonInfo.map(b => b.borderRadius))].sort();
      console.log(`  Buttons: ${buttonInfo.length} total, heights: [${heights}], fonts: [${fontSizes}], radii: [${radii}]`);
      
      // Flag if more than 2 height tiers
      if (heights.length > 3) {
        issues.push({ tool: tabId, issue: `${heights.length} different button heights: [${heights}]`, buttons: buttonInfo });
      }
    }

    // B) Check for code leaks (raw HTML, template artifacts, backticks, undefined, [object, NaN)
    const codeLeaks = await page.evaluate((id) => {
      const panel = document.getElementById(id);
      if (!panel) return [];
      const leaks = [];
      const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const t = walker.currentNode.textContent;
        if (!t || t.trim().length < 2) continue;
        if (/undefined|NaN|\[object|<\/?\w+>|{{|}}|`|\\n|function\s*\(|=>\s*{|\.querySelector|\.getElementById|\.innerHTML|\.style\./i.test(t.trim())) {
          const parent = walker.currentNode.parentElement;
          if (parent && parent.offsetHeight > 0 && parent.offsetWidth > 0) {
            leaks.push({
              text: t.trim().substring(0, 100),
              parent: parent.tagName + '.' + parent.className,
            });
          }
        }
      }
      return leaks;
    }, tabId);

    if (codeLeaks.length > 0) {
      console.log(`  ⚠️ CODE LEAKS: ${codeLeaks.length}`);
      codeLeaks.forEach(l => console.log(`    "${l.text}" in ${l.parent}`));
      issues.push({ tool: tabId, issue: 'Code leaks found', leaks: codeLeaks });
    }

    // C) Check for action bolt (lightning bolt within the tool)
    const hasActionBolt = await page.evaluate((id) => {
      const panel = document.getElementById(id);
      if (!panel) return false;
      const bolt = panel.querySelector('.fa-bolt, [class*="action-bolt"], [class*="tool-action"]');
      return !!bolt;
    }, tabId);
    console.log(`  Action bolt present: ${hasActionBolt}`);
    if (!hasActionBolt) {
      issues.push({ tool: tabId, issue: 'Missing action lightning bolt' });
    }

    // D) Check spacing/padding — look for excessive empty space
    const spacingInfo = await page.evaluate((id) => {
      const panel = document.getElementById(id);
      if (!panel) return null;
      const s = getComputedStyle(panel);
      const cards = panel.querySelectorAll('.s4-card, .card, [class*="breakdown"], [class*="result"]');
      const cardInfo = [];
      cards.forEach(c => {
        if (c.offsetHeight === 0) return;
        const cs = getComputedStyle(c);
        cardInfo.push({
          class: c.className.substring(0, 60),
          height: c.offsetHeight,
          padding: cs.padding,
          margin: cs.margin,
          gap: cs.gap,
        });
      });
      return {
        panelPadding: s.padding,
        panelHeight: panel.scrollHeight,
        cardCount: cards.length,
        cards: cardInfo,
      };
    }, tabId);
    
    if (spacingInfo) {
      console.log(`  Panel height: ${spacingInfo.panelHeight}px, cards: ${spacingInfo.cardCount}`);
      spacingInfo.cards.forEach(c => {
        console.log(`    Card [${c.class.substring(0,30)}]: h=${c.height} pad=${c.padding} margin=${c.margin}`);
      });
    }

    // E) Check ? help icon exists
    const hasHelpIcon = await page.evaluate((id) => {
      const panel = document.getElementById(id);
      if (!panel) return false;
      return !!panel.querySelector('.s4-tool-help');
    }, tabId);
    console.log(`  Help ? icon: ${hasHelpIcon}`);
  }

  // ──────────────────────────────────────────────
  // 3. Check the digital thread specifically
  // ──────────────────────────────────────────────
  console.log('\n=== DIGITAL THREAD ===');
  // Navigate to vault which has digital thread
  await page.evaluate(() => {
    var tab = document.querySelector('[data-tab="hub-vault"]');
    if (tab) tab.click();
  });
  await page.waitForTimeout(1000);

  const dtInfo = await page.evaluate(() => {
    // Look for digital thread elements
    const dtPanel = document.querySelector('.digital-thread-panel, [id*="digitalThread"], [class*="digital-thread"], [id*="digital-thread"]');
    const dtExit = document.querySelector('[onclick*="closeDigital"], [onclick*="hideDigital"], .digital-thread-close, [class*="digital-thread"] .close, [class*="digital-thread"] button[onclick*="close"], [class*="digital-thread"] button[onclick*="hide"]');
    return {
      panelFound: !!dtPanel,
      panelClass: dtPanel ? dtPanel.className : null,
      panelId: dtPanel ? dtPanel.id : null,
      panelHeight: dtPanel ? dtPanel.offsetHeight : 0,
      exitFound: !!dtExit,
      exitClass: dtExit ? dtExit.className : null,
      exitText: dtExit ? dtExit.textContent.trim() : null,
    };
  });
  console.log('Digital Thread:', JSON.stringify(dtInfo, null, 2));
  await page.screenshot({ path: path.join(DIR, '03_digital_thread.png'), fullPage: false });

  // ──────────────────────────────────────────────
  // 4. Check ROI, Readiness, Lifecycle specifically for spacing
  // ──────────────────────────────────────────────
  console.log('\n=== ROI SPACING ===');
  await page.evaluate(() => {
    var tab = document.querySelector('[data-tab="hub-roi"]'); if (tab) tab.click();
  });
  await page.waitForTimeout(800);

  // Run the ROI calc with sample data to see the output
  await page.evaluate(() => {
    // Fill in some sample values
    var fields = {
      'roiPrograms': '3', 'roiRecords': '500', 'roiFtes': '4', 
      'roiLaborRate': '95', 'roiAuditCost': '50000', 'roiErrorCost': '8000',
      'roiIncidents': '12', 'roiLicense': '3000'
    };
    for (var [k, v] of Object.entries(fields)) {
      var el = document.getElementById(k);
      if (el) { el.value = v; }
    }
    if (typeof window.calcROI === 'function') window.calcROI();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(DIR, '04_roi_with_data.png'), fullPage: false });

  // Get ROI output spacing
  const roiSpacing = await page.evaluate(() => {
    const panel = document.getElementById('hub-roi');
    if (!panel) return null;
    const outputs = panel.querySelectorAll('.stat-mini, .result-panel, [id*="roi"], .s4-card');
    const info = [];
    outputs.forEach(el => {
      if (el.offsetHeight === 0) return;
      const s = getComputedStyle(el);
      info.push({
        id: el.id || '',
        class: el.className.substring(0, 50),
        tag: el.tagName,
        height: el.offsetHeight,
        width: el.offsetWidth,
        padding: s.padding,
        margin: s.margin,
        fontSize: s.fontSize,
      });
    });
    return info;
  });
  console.log('ROI breakdown elements:');
  roiSpacing && roiSpacing.forEach(e => console.log(`  [${e.id||e.class.substring(0,30)}] h=${e.height} w=${e.width} p=${e.padding} m=${e.margin} fs=${e.fontSize}`));

  // Scroll ROI panel
  await page.evaluate(() => {
    const p = document.getElementById('hub-roi');
    if (p) p.scrollTop = p.scrollHeight;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(DIR, '04_roi_bottom.png'), fullPage: false });

  console.log('\n=== READINESS SPACING ===');
  await page.evaluate(() => {
    var tab = document.querySelector('[data-tab="hub-readiness"]'); if (tab) tab.click();
  });
  await page.waitForTimeout(800);

  // Run readiness calc 
  await page.evaluate(() => {
    var fields = { 'ramMtbf': '500', 'ramMttr': '4', 'ramMldt': '24' };
    for (var [k, v] of Object.entries(fields)) {
      var el = document.getElementById(k);
      if (el) el.value = v;
    }
    if (typeof window.checkReadiness === 'function') window.checkReadiness();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(DIR, '05_readiness_with_data.png'), fullPage: false });

  const readinessSpacing = await page.evaluate(() => {
    const panel = document.getElementById('hub-readiness');
    if (!panel) return null;
    const outputs = panel.querySelectorAll('.stat-mini, .result-panel, [id*="readiness"], .s4-card, table');
    const info = [];
    outputs.forEach(el => {
      if (el.offsetHeight === 0) return;
      const s = getComputedStyle(el);
      info.push({
        id: el.id || '',
        class: el.className.substring(0, 50),
        height: el.offsetHeight,
        width: el.offsetWidth,
        padding: s.padding,
        margin: s.margin,
      });
    });
    return info;
  });
  console.log('Readiness elements:');
  readinessSpacing && readinessSpacing.forEach(e => console.log(`  [${e.id||e.class.substring(0,30)}] h=${e.height} w=${e.width} p=${e.padding} m=${e.margin}`));

  // Scroll readiness
  await page.evaluate(() => {
    const p = document.getElementById('hub-readiness');
    if (p) p.scrollTop = p.scrollHeight;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(DIR, '05_readiness_bottom.png'), fullPage: false });

  console.log('\n=== LIFECYCLE COST SPACING ===');
  await page.evaluate(() => {
    var tab = document.querySelector('[data-tab="hub-lifecycle"]'); if (tab) tab.click();
  });
  await page.waitForTimeout(800);

  // Run lifecycle calc
  await page.evaluate(() => {
    var fields = {
      'lcServiceLife': '20', 'lcOperatingHours': '2000',
      'lcAcquisitionCost': '5000000', 'lcFleetSize': '10', 'lcSustainmentRate': '8'
    };
    for (var [k, v] of Object.entries(fields)) {
      var el = document.getElementById(k);
      if (el) el.value = v;
    }
    if (typeof window.calcLifecycle === 'function') window.calcLifecycle();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(DIR, '06_lifecycle_with_data.png'), fullPage: false });

  // Scroll lifecycle
  await page.evaluate(() => {
    const p = document.getElementById('hub-lifecycle');
    if (p) p.scrollTop = p.scrollHeight;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(DIR, '06_lifecycle_bottom.png'), fullPage: false });

  // ──────────────────────────────────────────────
  // 5. Global button audit — ALL buttons in platform 
  // ──────────────────────────────────────────────
  console.log('\n=== GLOBAL BUTTON AUDIT ===');
  const allButtons = await page.evaluate(() => {
    const btns = document.querySelectorAll('button, .btn-accent, .btn-gold, .btn-anchor, .btn-export, .back-btn');
    const info = [];
    btns.forEach(b => {
      if (b.offsetHeight === 0 || b.offsetWidth === 0) return;
      const s = getComputedStyle(b);
      const parent = b.closest('.ils-hub-panel, .tab-pane, .s4-card');
      info.push({
        text: b.textContent.trim().substring(0, 30),
        class: b.className.substring(0, 50),
        parentId: parent ? parent.id : 'root',
        height: b.offsetHeight,
        width: b.offsetWidth,
        padding: s.padding,
        fontSize: s.fontSize,
        borderRadius: s.borderRadius,
        bg: s.backgroundColor,
        color: s.color,
      });
    });
    return info;
  });

  const heightGroups = {};
  allButtons.forEach(b => {
    const h = b.height;
    if (!heightGroups[h]) heightGroups[h] = [];
    heightGroups[h].push(b);
  });

  console.log(`Total visible buttons: ${allButtons.length}`);
  Object.keys(heightGroups).sort((a,b) => Number(a)-Number(b)).forEach(h => {
    console.log(`  Height ${h}px: ${heightGroups[h].length} buttons`);
    heightGroups[h].forEach(b => console.log(`    "${b.text}" [${b.class.substring(0,20)}] in ${b.parentId} | pad=${b.padding} fs=${b.fontSize} bg=${b.bg}`));
  });

  // ──────────────────────────────────────────────
  // 6. Check the ? help text detail level
  // ──────────────────────────────────────────────
  console.log('\n=== HELP TEXT AUDIT ===');
  // Click ? on current tool
  const helpBtns = await page.$$('.s4-tool-help');
  if (helpBtns.length > 0) {
    await page.evaluate(() => {
      var btn = document.querySelector('.s4-tool-help');
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);
    const helpText = await page.evaluate(() => {
      const pop = document.querySelector('.s4-help-popover');
      return pop ? pop.textContent.trim() : null;
    });
    console.log('Sample help text length:', helpText ? helpText.length : 0);
    console.log('Content:', helpText ? helpText.substring(0, 200) : 'NONE');
    await page.screenshot({ path: path.join(DIR, '07_help_popover.png'), fullPage: false });
  }

  // ──────────────────────────────────────────────
  // 7. Also check other main sections 
  // ──────────────────────────────────────────────
  const mainSections = ['sectionAnchor', 'sectionVerify', 'sectionLog', 'sectionMetrics'];
  for (const sec of mainSections) {
    await page.evaluate((s) => {
      if (typeof window.showSection === 'function') window.showSection(s);
    }, sec);
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(DIR, `S_${sec}.png`), fullPage: false });
  }

  // ──────────────────────────────────────────────
  // 8. Summary
  // ──────────────────────────────────────────────
  console.log('\n\n========================================');
  console.log('ISSUES SUMMARY');
  console.log('========================================');
  issues.forEach((iss, i) => {
    console.log(`${i+1}. [${iss.tool}] ${iss.issue}`);
    if (iss.leaks) iss.leaks.forEach(l => console.log(`     Leak: "${l.text}"`));
    if (iss.buttons) iss.buttons.forEach(b => console.log(`     Btn: "${b.text}" h=${b.height} pad=${b.padding}`));
  });
  console.log(`\nTotal issues: ${issues.length}`);
  console.log(`Screenshots saved to: ${DIR}`);

  await browser.close();
  console.log('\nAUDIT COMPLETE');
})();
