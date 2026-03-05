import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('Proper auth flow then test clicks', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
        if (msg.text().includes('TOGGLE-TRACE')) console.log('  [trace]', msg.text());
    });
    
    // Fresh start
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    
    // === ENTER PLATFORM ===
    console.log('=== AUTH FLOW ===');
    const enterBtn = page.locator('button:has-text("Enter S4")').first();
    if (await enterBtn.isVisible()) {
        await enterBtn.click();
        await page.waitForTimeout(500);
    }
    
    // DOD Consent Banner should appear
    const consentVis = await page.evaluate(() => {
        var c = document.getElementById('dodConsentBanner');
        return c ? c.style.display : 'NOT_FOUND';
    });
    console.log('  Consent banner display:', consentVis);
    
    if (consentVis === 'flex') {
        // Accept consent
        const acceptBtn = page.locator('button:has-text("I Accept")').first();
        if (await acceptBtn.isVisible()) {
            await acceptBtn.click();
            await page.waitForTimeout(500);
        }
    }
    
    // CAC Login should appear
    const cacVis = await page.evaluate(() => {
        var c = document.getElementById('cacLoginModal');
        return c ? c.style.display : 'NOT_FOUND';
    });
    console.log('  CAC login display:', cacVis);
    
    if (cacVis === 'flex') {
        // Click the CAC authenticate button
        const cacBtn = page.locator('button:has-text("Authenticate with CAC")').first();
        if (await cacBtn.isVisible()) {
            await cacBtn.click();
            await page.waitForTimeout(2000); // wait for animation
        }
    }
    
    // Check if we need account login instead
    const loginPane = await page.evaluate(() => {
        var modal = document.getElementById('cacLoginModal');
        return modal ? modal.style.display : 'gone';
    });
    if (loginPane === 'flex') {
        // Try account login
        const signInBtn = page.locator('button:has-text("Sign In")').first();
        if (await signInBtn.isVisible()) {
            await signInBtn.click();
            await page.waitForTimeout(2000);
        }
    }
    
    // Onboarding
    console.log('  Completing onboarding...');
    for (let step = 0; step < 8; step++) {
        const nextBtns = page.locator('.onboard-next, button:has-text("Next"), button:has-text("Get Started"), button:has-text("Finish"), button:has-text("Begin"), button:has-text("Continue")');
        if (await nextBtns.count() > 0 && await nextBtns.first().isVisible()) {
            await nextBtns.first().click({ timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(800);
        }
    }
    
    // Check workspace state
    const wsState = await page.evaluate(() => {
        return {
            ws: document.getElementById('platformWorkspace')?.style.display,
            consent: document.getElementById('dodConsentBanner')?.style.display,
            cac: document.getElementById('cacLoginModal')?.style.display,
            onboard: document.getElementById('onboardOverlay')?.style.display,
            role: sessionStorage.getItem('s4_user_role'),
            entered: sessionStorage.getItem('s4_entered'),
            auth: sessionStorage.getItem('s4_authenticated')
        };
    });
    console.log('  State:', JSON.stringify(wsState));
    
    // Force workspace if needed
    if (wsState.ws !== 'block') {
        console.log('  Forcing workspace visible...');
        await page.evaluate(() => {
            sessionStorage.setItem('s4_entered', '1');
            sessionStorage.setItem('s4_onboard_done', '1');
            sessionStorage.setItem('s4_authenticated', '1');
            document.getElementById('dodConsentBanner').style.display = 'none';
            document.getElementById('cacLoginModal').style.display = 'none';
            var ob = document.getElementById('onboardOverlay');
            if (ob) ob.style.display = 'none';
            document.getElementById('platformLanding').style.display = 'none';
            var hero = document.querySelector('.hero');
            if (hero) hero.style.display = 'none';
            document.getElementById('platformWorkspace').style.display = 'block';
        });
    }
    await page.waitForTimeout(500);
    
    // Handle role modal if it appears
    await page.waitForTimeout(3000);
    const roleModal = await page.evaluate(() => !!document.getElementById('roleModal'));
    if (roleModal) {
        console.log('  Role modal appeared, applying ILS Manager...');
        await page.evaluate(() => {
            if (typeof window.selectRolePreset === 'function') window.selectRolePreset('ils_manager');
            if (typeof window.applyRole === 'function') window.applyRole();
            else {
                sessionStorage.setItem('s4_user_role', 'ils_manager');
                var rm = document.getElementById('roleModal');
                if (rm) rm.remove();
            }
        });
        await page.waitForTimeout(500);
    }
    
    // === NOW TEST THE CLICKS ===
    console.log('\n=== TESTING CLICKS ===');
    
    // Check for any overlays
    const overlayCheck = await page.evaluate(() => {
        var results = [];
        // Check all fixed/absolute positioned elements covering the viewport
        document.querySelectorAll('*').forEach(function(el) {
            var cs = window.getComputedStyle(el);
            if (cs.position === 'fixed' && cs.display !== 'none' && cs.visibility !== 'hidden') {
                var rect = el.getBoundingClientRect();
                if (rect.width > 500 && rect.height > 500 && parseInt(cs.zIndex) > 100) {
                    results.push({
                        id: el.id || '(no id)',
                        tag: el.tagName,
                        zIndex: cs.zIndex,
                        display: cs.display,
                        w: Math.round(rect.width),
                        h: Math.round(rect.height)
                    });
                }
            }
        });
        return results;
    });
    console.log('  Overlays found:', JSON.stringify(overlayCheck));
    
    // Navigate to ILS hub-reports
    await page.evaluate(() => {
        if (typeof window.showSection === 'function') window.showSection('sectionILS');
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-reports');
    });
    await page.waitForTimeout(500);
    
    // Set up toggle tracking
    await page.evaluate(() => {
        window._toggleCallCount = 0;
        window._origToggle = window.toggleComplianceSection;
        window.toggleComplianceSection = function() {
            window._toggleCallCount++;
            console.log('[TOGGLE-TRACE] Call #' + window._toggleCallCount + ', arg=' + arguments[0]);
            return window._origToggle.apply(this, arguments);
        };
    });
    
    // Check what's at the click point
    const pointCheck = await page.evaluate(() => {
        var toggle = document.querySelector('[onclick*="toggleComplianceSection(\'execSummary\')"]');
        if (!toggle) return 'toggle NOT FOUND';
        var rect = toggle.getBoundingClientRect();
        var cx = rect.x + rect.width / 2;
        var cy = rect.y + rect.height / 2;
        var topEl = document.elementFromPoint(cx, cy);
        return {
            cx: Math.round(cx),
            cy: Math.round(cy),
            rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
            topTag: topEl?.tagName || 'null',
            topId: topEl?.id || 'none',
            topText: topEl?.textContent?.substring(0, 40) || 'empty',
            isSameOrChild: topEl === toggle || toggle.contains(topEl),
            inlineOK: window.__s4InlineOK
        };
    });
    console.log('  ExecSummary point check:', JSON.stringify(pointCheck));
    
    // Try clicking
    const toggle = page.locator('[onclick*="toggleComplianceSection(\'execSummary\')"]').first();
    if (await toggle.isVisible()) {
        const beforeDisplay = await page.evaluate(() => document.getElementById('execSummarySection')?.style.display);
        try {
            await toggle.click({ timeout: 5000 });
            console.log('  Click: OK');
        } catch (e) {
            console.log('  Click: FAILED:', e.message.substring(0, 200));
        }
        await page.waitForTimeout(300);
        const result = await page.evaluate(() => ({
            display: document.getElementById('execSummarySection')?.style.display,
            callCount: window._toggleCallCount
        }));
        console.log('  Before:', beforeDisplay, 'After:', JSON.stringify(result));
    }
    
    // Restore toggle
    await page.evaluate(() => {
        window.toggleComplianceSection = window._origToggle;
    });
    
    // Test Team button click
    console.log('\n=== TEAM BUTTON ===');
    const teamBtn = page.locator('[onclick*="showTeamPanel"]').first();
    const teamVis = await teamBtn.isVisible().catch(() => false);
    console.log('  Team visible:', teamVis);
    if (teamVis) {
        try {
            await teamBtn.click({ timeout: 3000 });
            console.log('  Click: OK');
        } catch (e) {
            console.log('  Click: FAILED:', e.message.substring(0, 200));
        }
        await page.waitForTimeout(300);
        const panelExists = await page.evaluate(() => !!document.getElementById('teamManagePanel'));
        console.log('  Panel exists:', panelExists);
    }
    
    // === ERRORS ===
    console.log('\n=== ERRORS ===');
    const realErrors = errors.filter(e => !e.includes('X-Frame') && !e.includes('Content Security') && !e.includes('WebSocket') && !e.includes('worker'));
    console.log('Page errors:', realErrors.length > 0 ? realErrors.join('\n') : 'None');
    console.log('Console errors:', consoleErrors.length > 0 ? consoleErrors.slice(0, 5).join('\n') : 'None');
});
