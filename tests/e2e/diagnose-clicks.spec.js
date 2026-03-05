import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('Diagnose broken clicks: Team, Analyses, Webhooks, tool dropdowns', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });

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

    // Open Gap Analysis tool first (Team, Analyses, Webhooks are in its header)
    await page.evaluate(() => {
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-analysis');
    });
    await page.waitForTimeout(500);

    // === 1. TEST Team, My Analyses, Webhooks BUTTONS ===
    console.log('=== 1. HEADER BUTTONS (Team, My Analyses, Webhooks) ===');
    
    const headerBtns = await page.evaluate(() => {
        var results = [];
        var teamBtn = document.querySelector('[onclick*="showTeamPanel"]');
        var analysesBtn = document.querySelector('[onclick*="showSavedAnalyses"]');
        var webhooksBtn = document.querySelector('[onclick*="showWebhookSettings"]');
        
        results.push({
            name: 'Team',
            exists: !!teamBtn,
            visible: teamBtn ? window.getComputedStyle(teamBtn).display !== 'none' && window.getComputedStyle(teamBtn).visibility !== 'hidden' : false,
            parentVisible: teamBtn ? window.getComputedStyle(teamBtn.parentElement).display !== 'none' : false,
            fnAvailable: typeof window.showTeamPanel === 'function'
        });
        results.push({
            name: 'My Analyses',
            exists: !!analysesBtn,
            visible: analysesBtn ? window.getComputedStyle(analysesBtn).display !== 'none' && window.getComputedStyle(analysesBtn).visibility !== 'hidden' : false,
            parentVisible: analysesBtn ? window.getComputedStyle(analysesBtn.parentElement).display !== 'none' : false,
            fnAvailable: typeof window.showSavedAnalyses === 'function'
        });
        results.push({
            name: 'Webhooks',
            exists: !!webhooksBtn,
            visible: webhooksBtn ? window.getComputedStyle(webhooksBtn).display !== 'none' && window.getComputedStyle(webhooksBtn).visibility !== 'hidden' : false,
            parentVisible: webhooksBtn ? window.getComputedStyle(webhooksBtn.parentElement).display !== 'none' : false,
            fnAvailable: typeof window.showWebhookSettings === 'function'
        });
        return results;
    });
    headerBtns.forEach(b => console.log(`  ${b.name}: exists=${b.exists}, visible=${b.visible}, parentVisible=${b.parentVisible}, fn=${b.fnAvailable}`));

    // Try clicking Team
    const teamResult = await page.evaluate(() => {
        try {
            if (typeof window.showTeamPanel === 'function') {
                window.showTeamPanel();
                return 'showTeamPanel() called OK';
            }
            return 'showTeamPanel NOT available';
        } catch (e) { return 'ERROR: ' + e.message; }
    });
    console.log('  Team click result: ' + teamResult);

    // Try clicking Analyses
    const analysesResult = await page.evaluate(() => {
        try {
            if (typeof window.showSavedAnalyses === 'function') {
                window.showSavedAnalyses();
                return 'showSavedAnalyses() called OK';
            }
            return 'showSavedAnalyses NOT available';
        } catch (e) { return 'ERROR: ' + e.message; }
    });
    console.log('  Analyses click result: ' + analysesResult);

    // Try clicking Webhooks
    const webhooksResult = await page.evaluate(() => {
        try {
            if (typeof window.showWebhookSettings === 'function') {
                window.showWebhookSettings();
                return 'showWebhookSettings() called OK';
            }
            return 'showWebhookSettings NOT available';
        } catch (e) { return 'ERROR: ' + e.message; }
    });
    console.log('  Webhooks click result: ' + webhooksResult);

    // === 2. TEST DETAILS/SUMMARY (Dropdowns) ===
    console.log('\n=== 2. DETAILS/SUMMARY ELEMENTS (Tool Dropdowns) ===');
    
    const detailsInfo = await page.evaluate(() => {
        var results = [];
        // Check all details elements in hub-analysis
        var panel = document.getElementById('hub-analysis');
        if (!panel) return ['hub-analysis NOT FOUND'];
        var details = panel.querySelectorAll('details');
        details.forEach(function(d, i) {
            var summary = d.querySelector('summary');
            var cs = window.getComputedStyle(d);
            results.push({
                index: i,
                display: cs.display,
                visibility: cs.visibility,
                inlineDisplay: d.style.display,
                summaryText: summary ? summary.textContent.trim().substring(0, 60) : 'NO SUMMARY',
                hasOpen: d.hasAttribute('open')
            });
        });
        return results;
    });
    detailsInfo.forEach(d => {
        if (typeof d === 'string') { console.log('  ' + d); return; }
        console.log(`  [${d.index}] "${d.summaryText}" display=${d.display} inline="${d.inlineDisplay}" vis=${d.visibility}`);
    });

    // === 3. CHECK AUDIT REPORT GENERATOR ===
    console.log('\n=== 3. AUDIT REPORT GENERATOR (Automated Audit) ===');
    await page.evaluate(() => {
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-audit');
    });
    await page.waitForTimeout(300);

    const auditDetails = await page.evaluate(() => {
        var panel = document.getElementById('hub-audit');
        if (!panel) return ['hub-audit NOT FOUND'];
        var results = [];
        var details = panel.querySelectorAll('details');
        details.forEach(function(d, i) {
            var summary = d.querySelector('summary');
            var cs = window.getComputedStyle(d);
            results.push({
                index: i,
                display: cs.display,
                inlineDisplay: d.style.display,
                summaryText: summary ? summary.textContent.trim().substring(0, 60) : 'NO SUMMARY',
                pointerEvents: cs.pointerEvents
            });
        });
        // Also check selects
        var selects = panel.querySelectorAll('select');
        selects.forEach(function(s, i) {
            var cs = window.getComputedStyle(s);
            results.push({ type: 'select', index: i, display: cs.display, id: s.id, pointerEvents: cs.pointerEvents, visibility: cs.visibility });
        });
        return results;
    });
    auditDetails.forEach(d => {
        if (typeof d === 'string') { console.log('  ' + d); return; }
        if (d.type === 'select') {
            console.log(`  SELECT[${d.index}] id=${d.id} display=${d.display} pointer=${d.pointerEvents}`);
        } else {
            console.log(`  DETAILS[${d.index}] "${d.summaryText}" display=${d.display} inline="${d.inlineDisplay}" pointer=${d.pointerEvents}`);
        }
    });

    // === 4. CHECK SUBMISSIONS TOOL ===
    console.log('\n=== 4. SUBMISSIONS TOOL ===');
    await page.evaluate(() => {
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-submission');
    });
    await page.waitForTimeout(300);

    const submissionDetails = await page.evaluate(() => {
        var panel = document.getElementById('hub-submission');
        if (!panel) return ['hub-submission NOT FOUND'];
        var results = [];
        var details = panel.querySelectorAll('details');
        details.forEach(function(d, i) {
            var summary = d.querySelector('summary');
            var cs = window.getComputedStyle(d);
            results.push({
                index: i,
                display: cs.display,
                inlineDisplay: d.style.display,
                summaryText: summary ? summary.textContent.trim().substring(0, 60) : 'NO SUMMARY',
                pointerEvents: cs.pointerEvents
            });
        });
        var selects = panel.querySelectorAll('select');
        selects.forEach(function(s, i) {
            var cs = window.getComputedStyle(s);
            results.push({ type: 'select', index: i, display: cs.display, id: s.id, pointerEvents: cs.pointerEvents });
        });
        return results;
    });
    submissionDetails.forEach(d => {
        if (typeof d === 'string') { console.log('  ' + d); return; }
        if (d.type === 'select') {
            console.log(`  SELECT[${d.index}] id=${d.id} display=${d.display} pointer=${d.pointerEvents}`);
        } else {
            console.log(`  DETAILS[${d.index}] "${d.summaryText}" display=${d.display} inline="${d.inlineDisplay}" pointer=${d.pointerEvents}`);
        }
    });

    // === 5. CHECK ALL TOOL PANELS FOR HIDDEN DETAILS ===
    console.log('\n=== 5. ALL HIDDEN DETAILS ACROSS ALL TOOL PANELS ===');
    const allHiddenDetails = await page.evaluate(() => {
        var results = [];
        document.querySelectorAll('.ils-hub-panel details').forEach(function(d) {
            if (d.style.display === 'none') {
                var panel = d.closest('.ils-hub-panel');
                var summary = d.querySelector('summary');
                results.push({
                    panelId: panel ? panel.id : 'unknown',
                    summaryText: summary ? summary.textContent.trim().substring(0, 60) : 'NO SUMMARY'
                });
            }
        });
        return results;
    });
    console.log('  Total hidden details: ' + allHiddenDetails.length);
    allHiddenDetails.forEach(d => console.log(`  ${d.panelId}: "${d.summaryText}"`));

    // === 6. COMPARE WITH DEMO ===
    console.log('\n=== 6. CHECK INLINE onclick HANDLER DELEGATION ===');
    const delegationStatus = await page.evaluate(() => {
        // Check if the universal delegated handler is present
        var results = {};
        results.execHandler = typeof window._s4ExecHandler === 'function';
        results.delegatedClickActive = document.body.dataset.s4delegated === '1' || document.documentElement.dataset.s4delegated === '1';
        
        // Test if a real onclick fires
        var testBtn = document.querySelector('[onclick*="showTeamPanel"]');
        if (testBtn) {
            var fired = false;
            var origFn = window.showTeamPanel;
            window.showTeamPanel = function() { fired = true; if (origFn) origFn.call(this); };
            testBtn.click();
            window.showTeamPanel = origFn;
            results.teamClickFired = fired;
        } else {
            results.teamClickFired = 'NO BUTTON FOUND';
        }
        
        return results;
    });
    console.log('  Delegation:', JSON.stringify(delegationStatus));

    // === 7. PAGE ERRORS ===
    console.log('\n=== 7. PAGE ERRORS ===');
    console.log(errors.length > 0 ? errors.join('\n') : 'NONE');
});
