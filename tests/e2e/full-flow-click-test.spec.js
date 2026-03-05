import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('Full user flow: onboard → role → test clicks', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    // Clear session storage first
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    
    // === STEP 1: COMPLETE ONBOARDING ===
    console.log('=== STEP 1: ONBOARDING ===');
    // Click "Enter Platform"
    const enterBtn = page.locator('button:has-text("Enter S4 Ledger"), button:has-text("Enter Platform"), .hero-cta');
    if (await enterBtn.count() > 0) {
        await enterBtn.first().click();
        await page.waitForTimeout(500);
    }
    
    // Complete onboarding steps
    for (let step = 0; step < 6; step++) {
        const nextBtn = page.locator('.onboard-next, button:has-text("Next"), button:has-text("Get Started"), button:has-text("Start"), button:has-text("Finish"), button:has-text("Begin")');
        if (await nextBtn.count() > 0) {
            await nextBtn.first().click({ timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(600);
        }
    }
    
    // Verify we're in the workspace
    const wsVisible = await page.evaluate(() => {
        var ws = document.getElementById('platformWorkspace');
        return ws ? ws.style.display : 'NOT_FOUND';
    });
    console.log('  Workspace visible:', wsVisible);

    // If workspace not visible, force it
    if (wsVisible !== 'block') {
        await page.evaluate(() => {
            sessionStorage.setItem('s4_entered', '1');
            sessionStorage.setItem('s4_onboard_done', '1');
            var landing = document.getElementById('platformLanding');
            if (landing) landing.style.display = 'none';
            var hero = document.querySelector('.hero');
            if (hero) hero.style.display = 'none';
            var ws = document.getElementById('platformWorkspace');
            if (ws) ws.style.display = 'block';
        });
    }
    await page.waitForTimeout(500);

    // === STEP 2: HANDLE ROLE MODAL ===
    console.log('\n=== STEP 2: ROLE MODAL ===');
    // Wait for the role modal to appear (it comes after 2500ms)
    await page.waitForTimeout(3000);
    
    const roleModalPresent = await page.evaluate(() => !!document.getElementById('roleModal'));
    console.log('  Role modal present:', roleModalPresent);
    
    if (roleModalPresent) {
        // Select ILS Manager role
        const ilsCard = page.locator('.role-card[data-role="ils_manager"], .role-card:has-text("ILS Manager")');
        if (await ilsCard.count() > 0) {
            await ilsCard.first().click({ timeout: 3000 }).catch(e => console.log('  Card click error:', e.message));
            await page.waitForTimeout(300);
        }
        
        // Click Apply/Confirm
        const applyBtn = page.locator('#roleModal button:has-text("Apply"), #roleModal button:has-text("Confirm"), #roleModal button:has-text("Save")');
        console.log('  Apply buttons found:', await applyBtn.count());
        if (await applyBtn.count() > 0) {
            await applyBtn.first().click({ timeout: 3000 }).catch(e => console.log('  Apply click error:', e.message));
            await page.waitForTimeout(500);
        }
    }
    
    const roleModalStillPresent = await page.evaluate(() => !!document.getElementById('roleModal'));
    console.log('  Role modal still present after apply:', roleModalStillPresent);
    
    // If modal still here, force-remove it
    if (roleModalStillPresent) {
        await page.evaluate(() => {
            var rm = document.getElementById('roleModal');
            if (rm) rm.remove();
            sessionStorage.setItem('s4_user_role', 'ils_manager');
        });
        console.log('  Force-removed roleModal');
    }

    // === STEP 3: Navigate to ILS and open hub-reports ===
    console.log('\n=== STEP 3: NAVIGATE TO ILS & HUB-REPORTS ===');
    await page.evaluate(() => {
        if (typeof window.showSection === 'function') window.showSection('sectionILS');
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-reports');
    });
    await page.waitForTimeout(500);
    
    // === STEP 4: Check __s4InlineOK flag ===
    const inlineOK = await page.evaluate(() => window.__s4InlineOK);
    console.log('  __s4InlineOK:', inlineOK);
    
    // === STEP 5: TEST ACCORDION CLICKS ===
    console.log('\n=== STEP 4: ACCORDION CLICK TESTS ===');
    
    // Check if ANYTHING is covering the click area
    const coverCheck = await page.evaluate(() => {
        var toggle = document.querySelector('[onclick*="toggleComplianceSection(\'execSummary\')"]');
        if (!toggle) return 'toggle NOT FOUND';
        var rect = toggle.getBoundingClientRect();
        var cx = rect.x + rect.width / 2;
        var cy = rect.y + rect.height / 2;
        var topEl = document.elementFromPoint(cx, cy);
        return {
            topElementTag: topEl ? topEl.tagName : 'null',
            topElementId: topEl ? topEl.id : 'null',
            topElementText: topEl ? topEl.textContent.substring(0, 40) : 'null',
            isSameOrChild: topEl === toggle || toggle.contains(topEl),
            toggleVisible: window.getComputedStyle(toggle).display !== 'none'
        };
    });
    console.log('  Cover check:', JSON.stringify(coverCheck));
    
    // First test: direct function call
    const directTest = await page.evaluate(() => {
        var section = document.getElementById('execSummarySection');
        if (!section) return 'section NOT FOUND';
        var before = section.style.display;
        window.toggleComplianceSection('execSummary');
        var after = section.style.display;
        // Reset
        section.style.display = 'none';
        return { before, after };
    });
    console.log('  Direct call test:', JSON.stringify(directTest));
    
    // Test: Playwright real click
    const execToggle = page.locator('[onclick*="toggleComplianceSection(\'execSummary\')"]').first();
    if (await execToggle.isVisible()) {
        const beforeClick = await page.evaluate(() => {
            var s = document.getElementById('execSummarySection');
            return s ? s.style.display : 'NOT_FOUND';
        });
        
        // Count how many times toggleComplianceSection is called
        await page.evaluate(() => {
            window._toggleCallCount = 0;
            var orig = window.toggleComplianceSection;
            window._origToggle = orig;
            window.toggleComplianceSection = function() {
                window._toggleCallCount++;
                console.log('[TOGGLE-TRACE] Call #' + window._toggleCallCount + ' with arg:', arguments[0]);
                return orig.apply(this, arguments);
            };
        });
        
        try {
            await execToggle.click({ timeout: 5000 });
            console.log('  Playwright click: succeeded');
        } catch (e) {
            console.log('  Playwright click: FAILED -', e.message.split('\n')[0]);
        }
        await page.waitForTimeout(300);
        
        const afterClick = await page.evaluate(() => {
            var s = document.getElementById('execSummarySection');
            var count = window._toggleCallCount;
            // Restore original
            window.toggleComplianceSection = window._origToggle;
            return { display: s ? s.style.display : 'NOT_FOUND', callCount: count };
        });
        console.log('  ExecSummary before:', beforeClick, 'after:', JSON.stringify(afterClick));
    } else {
        console.log('  ExecSummary toggle NOT VISIBLE');
    }

    // === STEP 6: Test Team button ===
    console.log('\n=== STEP 5: TEAM BUTTON TEST ===');
    const teamCheck = await page.evaluate(() => {
        var btn = document.querySelector('[onclick*="showTeamPanel"]');
        if (!btn) return 'Team button NOT FOUND';
        var rect = btn.getBoundingClientRect();
        var cx = rect.x + rect.width / 2;
        var cy = rect.y + rect.height / 2;
        var topEl = document.elementFromPoint(cx, cy);
        return {
            btnVisible: window.getComputedStyle(btn).display !== 'none',
            btnTag: btn.tagName,
            topElement: topEl ? { tag: topEl.tagName, id: topEl.id, isSameOrChild: topEl === btn || btn.contains(topEl) } : 'null',
            roleModalPresent: !!document.getElementById('roleModal')
        };
    });
    console.log('  Team button check:', JSON.stringify(teamCheck));
    
    // Try clicking Team
    const teamBtn = page.locator('[onclick*="showTeamPanel"]').first();
    if (await teamBtn.isVisible().catch(() => false)) {
        try {
            await teamBtn.click({ timeout: 3000 });
            console.log('  Team click: succeeded');
        } catch(e) {
            console.log('  Team click: FAILED -', e.message.split('\n')[0]);
        }
        await page.waitForTimeout(300);
        const panelExists = await page.evaluate(() => !!document.getElementById('teamManagePanel'));
        console.log('  teamManagePanel exists:', panelExists);
    }

    // === SUMMARY ===
    console.log('\n=== PAGE ERRORS ===');
    const realErrors = errors.filter(e => !e.includes('X-Frame') && !e.includes('Content Security') && !e.includes('WebSocket') && !e.includes('worker'));
    console.log(realErrors.length > 0 ? realErrors.join('\n') : 'None relevant');
});
