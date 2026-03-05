import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('Click test: accordion dropdowns plus Team/Analyses/Webhooks', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
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

    // Open Audit Report tool
    console.log('=== 1. AUDIT REPORT GENERATOR - Accordion Sections ===');
    await page.evaluate(() => {
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-reports');
    });
    await page.waitForTimeout(300);

    // Try clicking Executive Summary via toggleComplianceSection
    const execResult = await page.evaluate(() => {
        var section = document.getElementById('execSummarySection');
        var before = section ? section.style.display : 'NO_ELEMENT';
        
        // Try calling the function directly
        if (typeof window.toggleComplianceSection === 'function') {
            window.toggleComplianceSection('execSummary');
            var after = section ? section.style.display : 'NO_ELEMENT';
            return { fn: 'exists', before: before, after: after };
        }
        return { fn: 'MISSING', before: before };
    });
    console.log('  toggleComplianceSection("execSummary"):', JSON.stringify(execResult));

    // Try clicking the actual onclick div
    const clickDivResult = await page.evaluate(() => {
        var section = document.getElementById('execSummarySection');
        // hide again first
        if (section) section.style.display = 'none';
        
        // Find the onclick div
        var toggle = document.querySelector('[onclick*="toggleComplianceSection(\'execSummary\')"]');
        if (!toggle) return { error: 'No matching onclick div found' };
        
        var callCount = 0;
        var orig = window.toggleComplianceSection;
        window.toggleComplianceSection = function() {
            callCount++;
            return orig.apply(this, arguments);
        };
        
        toggle.click();
        
        window.toggleComplianceSection = orig;
        
        var after = section ? section.style.display : 'NO_ELEMENT';
        return { found: true, callCount: callCount, afterDisplay: after };
    });
    console.log('  Clicking onclick div directly:', JSON.stringify(clickDivResult));
    
    // Try Scheduled Reports
    const schedResult = await page.evaluate(() => {
        var section = document.getElementById('schedReportsSection');
        var before = section ? section.style.display : 'NO_ELEMENT';
        if (typeof window.toggleComplianceSection === 'function') {
            window.toggleComplianceSection('schedReports');
        }
        var after = section ? section.style.display : 'NO_ELEMENT';
        return { before: before, after: after };
    });
    console.log('  toggleComplianceSection("schedReports"):', JSON.stringify(schedResult));
    
    // Try Fleet-wide Comparison
    const fleetResult = await page.evaluate(() => {
        var section = document.getElementById('fleetCompareSection');
        var before = section ? section.style.display : 'NO_ELEMENT';
        if (typeof window.toggleComplianceSection === 'function') {
            window.toggleComplianceSection('fleetCompare');
        }
        var after = section ? section.style.display : 'NO_ELEMENT';
        return { before: before, after: after };
    });
    console.log('  toggleComplianceSection("fleetCompare"):', JSON.stringify(fleetResult));

    // === 2. SUBMISSIONS TOOL ===
    console.log('\n=== 2. SUBMISSIONS TOOL - Version Diff Viewer ===');
    await page.evaluate(() => {
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-submissions');
    });
    await page.waitForTimeout(300);

    const diffResult = await page.evaluate(() => {
        var section = document.getElementById('versionDiffSection');
        var before = section ? section.style.display : 'NO_ELEMENT';
        if (typeof window.toggleComplianceSection === 'function') {
            window.toggleComplianceSection('versionDiff');
        }
        var after = section ? section.style.display : 'NO_ELEMENT';
        
        // Check the selects inside
        var selectA = document.getElementById('diffVersionA');
        var selectB = document.getElementById('diffVersionB');
        return {
            before: before,
            after: after,
            selectA: selectA ? { exists: true, display: window.getComputedStyle(selectA).display, pointerEvents: window.getComputedStyle(selectA).pointerEvents } : 'NOT FOUND',
            selectB: selectB ? { exists: true, display: window.getComputedStyle(selectB).display, pointerEvents: window.getComputedStyle(selectB).pointerEvents } : 'NOT FOUND'
        };
    });
    console.log('  versionDiff toggle:', JSON.stringify(diffResult));

    // === 3. TEAM, MY ANALYSES, WEBHOOKS (header buttons) ===
    console.log('\n=== 3. TEAM / MY ANALYSES / WEBHOOKS BUTTONS ===');
    await page.evaluate(() => {
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-analysis');
    });
    await page.waitForTimeout(300);

    // Test showTeamPanel
    const teamResult = await page.evaluate(() => {
        // Check what showTeamPanel does
        var teamBtn = document.querySelector('[onclick*="showTeamPanel"]');
        if (!teamBtn) return { error: 'Team button not found' };
        
        var callResult;
        try {
            // Check if teamPanel element is rendered
            var panelBefore = document.getElementById('teamSidePanel') || document.querySelector('.team-side-panel');
            
            // Try clicking
            var fired = false;
            var origFn = window.showTeamPanel;
            window.showTeamPanel = function() { 
                fired = true; 
                try { return origFn.apply(this, arguments); } catch(e) { return 'ERROR: ' + e.message; }
            };
            teamBtn.click();
            window.showTeamPanel = origFn;
            
            var panelAfter = document.getElementById('teamSidePanel') || document.querySelector('.team-side-panel');
            
            callResult = { 
                fired: fired,
                panelBeforeExists: !!panelBefore,
                panelAfterExists: !!panelAfter
            };
        } catch(e) {
            callResult = { error: e.message };
        }
        return callResult;
    });
    console.log('  Team:', JSON.stringify(teamResult));

    // Test showSavedAnalyses
    const analysesResult = await page.evaluate(() => {
        var btn = document.querySelector('[onclick*="showSavedAnalyses"]');
        if (!btn) return { error: 'Analyses button not found' };
        
        var fired = false;
        var origFn = window.showSavedAnalyses;
        window.showSavedAnalyses = function() {
            fired = true;
            try { return origFn.apply(this, arguments); } catch(e) { return 'ERROR: ' + e.message; }
        };
        btn.click();
        window.showSavedAnalyses = origFn;
        
        var panel = document.getElementById('savedAnalysesPanel') || document.querySelector('.saved-analyses-panel') || document.querySelector('[id*="savedAnalyses"]');
        return { fired: fired, panelFound: !!panel, panelId: panel ? panel.id : 'none' };
    });
    console.log('  My Analyses:', JSON.stringify(analysesResult));

    // Test showWebhookSettings
    const webhookResult = await page.evaluate(() => {
        var btn = document.querySelector('[onclick*="showWebhookSettings"]');
        if (!btn) return { error: 'Webhooks button not found' };
        
        var fired = false;
        var origFn = window.showWebhookSettings;
        window.showWebhookSettings = function() {
            fired = true;
            try { return origFn.apply(this, arguments); } catch(e) { return 'ERROR: ' + e.message; }
        };
        btn.click();
        window.showWebhookSettings = origFn;
        
        var panel = document.getElementById('webhookPanel') || document.querySelector('.webhook-panel') || document.querySelector('[id*="webhook"]');
        return { fired: fired, panelFound: !!panel, panelId: panel ? panel.id : 'none' };
    });
    console.log('  Webhooks:', JSON.stringify(webhookResult));
    
    // === 4. CHECK INLINE ONCLICK DELEGATION ===
    console.log('\n=== 4. UNIVERSAL ONCLICK DELEGATION CHECK ===');
    const delegationCheck = await page.evaluate(() => {
        // The universal delegated handler is in the inline script
        // Check if it's working by looking at the body's click handlers
        // Try clicking an onclick div that calls toggleComplianceSection
        var hub = document.getElementById('hub-reports');
        if (hub && hub.style.display !== 'block') {
            // Show hub-reports first
            var panels = document.querySelectorAll('.ils-hub-panel');
            panels.forEach(function(p) { p.style.display = 'none'; });
            hub.style.display = 'block';
        }
        
        // Find exec summary toggle div
        var toggle = document.querySelector('[onclick*="toggleComplianceSection(\'execSummary\')"]');
        if (!toggle) return { error: 'execSummary toggle div not found' };
        
        var section = document.getElementById('execSummarySection');
        if (section) section.style.display = 'none';
        
        // Check toggle rect (is it clickable?)
        var rect = toggle.getBoundingClientRect();
        var cs = window.getComputedStyle(toggle);
        
        return {
            toggleRect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
            toggleDisplay: cs.display,
            togglePointerEvents: cs.pointerEvents,
            toggleCursor: cs.cursor,
            toggleZIndex: cs.zIndex,
            parentOverflow: window.getComputedStyle(toggle.parentElement).overflow,
            sectionDisplay: section ? section.style.display : 'NO_ELEMENT'
        };
    });
    console.log('  ExecSummary toggle div:', JSON.stringify(delegationCheck));

    // === 5. CHECK ALL SELECTS IN hub-reports ===  
    console.log('\n=== 5. SELECTS IN HUB-REPORTS (Audit Report) ===');
    const selectsCheck = await page.evaluate(() => {
        var hub = document.getElementById('hub-reports');
        if (!hub) return ['hub-reports NOT FOUND'];
        hub.style.display = 'block';
        var results = [];
        hub.querySelectorAll('select').forEach(function(s) {
            var cs = window.getComputedStyle(s);
            var rect = s.getBoundingClientRect();
            results.push({
                id: s.id || '(no id)',
                display: cs.display,
                pointerEvents: cs.pointerEvents,
                opacity: cs.opacity,
                visibility: cs.visibility,
                disabled: s.disabled,
                options: s.options.length,
                w: Math.round(rect.width),
                h: Math.round(rect.height)
            });
        });
        return results;
    });
    selectsCheck.forEach(s => {
        if (typeof s === 'string') { console.log('  ' + s); return; }
        console.log(`  ${s.id}: ${s.options} opts, display=${s.display}, pointer=${s.pointerEvents}, disabled=${s.disabled}, ${s.w}x${s.h}`);
    });

    // === SUMMARY ===
    console.log('\n=== PAGE ERRORS ===');
    const realErrors = errors.filter(e => !e.includes('X-Frame') && !e.includes('Content Security') && !e.includes('WebSocket') && !e.includes('worker'));
    console.log(realErrors.length > 0 ? realErrors.join('\n') : 'None relevant');
});
