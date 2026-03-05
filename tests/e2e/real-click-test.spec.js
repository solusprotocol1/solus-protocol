import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('Real mouse click test on accordion dropdowns', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    const consoleMsgs = [];
    page.on('console', msg => { if (msg.type() === 'error' || msg.text().includes('toggle') || msg.text().includes('Team') || msg.text().includes('CSP')) consoleMsgs.push(msg.text()); });
    
    await page.goto(BASE, { waitUntil: 'networkidle' });
    
    // Force into platform
    await page.evaluate(() => {
        sessionStorage.setItem('s4_entered', '1');
        sessionStorage.setItem('s4_onboard_done', '1');
        sessionStorage.setItem('s4_user_role', 'logistics_officer');
        var landing = document.getElementById('platformLanding');
        if (landing) landing.style.display = 'none';
        var hero = document.querySelector('.hero');
        if (hero) hero.style.display = 'none';
        var ws = document.getElementById('platformWorkspace');
        if (ws) ws.style.display = 'block';
        if (typeof window.showSection === 'function') window.showSection('sectionILS');
        var aiWrap = document.getElementById('aiFloatWrapper');
        if (aiWrap) aiWrap.style.display = 'flex';
    });
    await page.waitForTimeout(500);

    // Navigate to hub-reports (Automated Audit Report Generator)
    await page.evaluate(() => {
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-reports');
    });
    await page.waitForTimeout(500);

    // === TEST 1: Real playwright click on Executive Summary accordion ===
    console.log('=== TEST 1: EXEC SUMMARY ACCORDION ===');
    
    // Find the exec summary toggle by text
    const execToggle = page.locator('[onclick*="toggleComplianceSection(\'execSummary\')"]');
    const execCount = await execToggle.count();
    console.log('  execSummary locators found:', execCount);
    
    if (execCount > 0) {
        const isVis = await execToggle.first().isVisible();
        console.log('  Is visible:', isVis);
        
        // Check section before click
        const beforeDisplay = await page.evaluate(() => {
            var s = document.getElementById('execSummarySection');
            return s ? s.style.display : 'NOT_FOUND';
        });
        console.log('  execSummarySection before click:', beforeDisplay);
        
        // Real Playwright click!
        try {
            await execToggle.first().click({ timeout: 5000 });
            console.log('  Playwright click succeeded');
        } catch (e) {
            console.log('  Playwright click FAILED:', e.message);
        }
        await page.waitForTimeout(300);
        
        const afterDisplay = await page.evaluate(() => {
            var s = document.getElementById('execSummarySection');
            return s ? s.style.display : 'NOT_FOUND';
        });
        console.log('  execSummarySection after click:', afterDisplay);
    }

    // === TEST 2: Scheduled Reports ===
    console.log('\n=== TEST 2: SCHEDULED REPORTS ACCORDION ===');
    const schedToggle = page.locator('[onclick*="toggleComplianceSection(\'schedReports\')"]');
    if (await schedToggle.count() > 0) {
        const beforeDisplay = await page.evaluate(() => {
            var s = document.getElementById('schedReportsSection');
            return s ? s.style.display : 'NOT_FOUND';
        });
        console.log('  schedReportsSection before:', beforeDisplay);
        try {
            await schedToggle.first().click({ timeout: 5000 });
            console.log('  click succeeded');
        } catch (e) {
            console.log('  click FAILED:', e.message);
        }
        await page.waitForTimeout(300);
        const afterDisplay = await page.evaluate(() => {
            var s = document.getElementById('schedReportsSection');
            return s ? s.style.display : 'NOT_FOUND';
        });
        console.log('  schedReportsSection after:', afterDisplay);
    }

    // === TEST 3: Team button with REAL click ===
    console.log('\n=== TEST 3: TEAM BUTTON ===');
    const teamBtn = page.locator('[onclick*="showTeamPanel"]');
    if (await teamBtn.count() > 0) {
        const isVis = await teamBtn.first().isVisible();
        console.log('  Team button visible:', isVis);
        if (isVis) {
            try {
                await teamBtn.first().click({ timeout: 5000 });
                console.log('  click succeeded');
            } catch (e) {
                console.log('  click FAILED:', e.message);
            }
            await page.waitForTimeout(300);
            const panelExists = await page.evaluate(() => {
                return !!document.getElementById('teamManagePanel');
            });
            console.log('  teamManagePanel exists after click:', panelExists);
        }
    } else {
        console.log('  Team button NOT FOUND');
    }

    // === TEST 4: Check if CSP blocks inline handlers ===
    console.log('\n=== TEST 4: CSP CHECK ===');
    const cspCheck = await page.evaluate(() => {
        // Check meta CSP
        var metaCsp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        var cspContent = metaCsp ? metaCsp.getAttribute('content') : 'NO_CSP_META';
        
        // Try creating a test element with onclick
        var testDiv = document.createElement('div');
        testDiv.id = 'cspTestDiv';
        testDiv.setAttribute('onclick', 'window._cspTestFired=true');
        document.body.appendChild(testDiv);
        window._cspTestFired = false;
        testDiv.click();
        var result = window._cspTestFired;
        testDiv.remove();
        
        return { cspMeta: cspContent, inlineOnclickWorks: result };
    });
    console.log('  CSP:', JSON.stringify(cspCheck));

    // === TEST 5: Check for overlapping elements at click target ===
    console.log('\n=== TEST 5: OVERLAPPING ELEMENT CHECK ===');
    const overlapCheck = await page.evaluate(() => {
        // First make sure hub-reports is visible
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-reports');
        
        var toggle = document.querySelector('[onclick*="toggleComplianceSection(\'execSummary\')"]');
        if (!toggle) return { error: 'toggle not found' };
        
        var rect = toggle.getBoundingClientRect();
        var cx = rect.x + rect.width / 2;
        var cy = rect.y + rect.height / 2;
        
        var topEl = document.elementFromPoint(cx, cy);
        
        return {
            toggleTag: toggle.tagName,
            toggleId: toggle.id || '(no id)',
            toggleClasses: toggle.className,
            elementAtPoint: topEl ? {
                tag: topEl.tagName,
                id: topEl.id || '(no id)',
                classes: topEl.className,
                isSameAsToggle: topEl === toggle,
                isChildOfToggle: toggle.contains(topEl),
                text: topEl.textContent.substring(0, 50)
            } : 'NOTHING_AT_POINT',
            clickPoint: { x: Math.round(cx), y: Math.round(cy) },
            toggleRect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) }
        };
    });
    console.log('  Overlap:', JSON.stringify(overlapCheck));

    // === PAGE ERRORS ===
    console.log('\n=== PAGE ERRORS ===');
    const realErrors = errors.filter(e => !e.includes('X-Frame') && !e.includes('Content Security') && !e.includes('WebSocket') && !e.includes('worker'));
    console.log(realErrors.length > 0 ? realErrors.join('\n') : 'None relevant');
    
    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMsgs.forEach(m => console.log('  ' + m.substring(0, 100)));
});
