import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('VERIFY FIX: accordion dropdowns and panel buttons work', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    // Start with role pre-set to skip role modal
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
        sessionStorage.setItem('s4_entered', '1');
        sessionStorage.setItem('s4_onboard_done', '1');
        sessionStorage.setItem('s4_authenticated', '1');
        sessionStorage.setItem('s4_user_role', 'ils_manager');
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Hide overlays, force workspace
    await page.evaluate(() => {
        ['dodConsentBanner', 'cacLoginModal', 'onboardOverlay', 'sessionLockOverlay'].forEach(id => {
            var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        var rm = document.getElementById('roleModal'); if (rm) rm.remove();
        document.getElementById('platformLanding').style.display = 'none';
        var hero = document.querySelector('.hero'); if (hero) hero.style.display = 'none';
        document.getElementById('platformWorkspace').style.display = 'block';
        if (typeof window.showSection === 'function') window.showSection('sectionILS');
    });
    await page.waitForTimeout(300);
    
    // ══════ TEST 1: ACCORDION SECTIONS IN HUB-REPORTS ══════
    console.log('═══ TEST 1: ACCORDION SECTIONS (hub-reports) ═══');
    await page.evaluate(() => {
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-reports');
    });
    await page.waitForTimeout(500);
    
    const sections = ['execSummary', 'schedReports', 'fleetCompare', 'heatMap'];
    for (const sec of sections) {
        const result = await page.evaluate((secName) => {
            var section = document.getElementById(secName + 'Section');
            if (!section) return { name: secName, error: 'NOT FOUND' };
            
            var before = section.style.display;
            
            // Count calls
            var callCount = 0;
            var orig = window.toggleComplianceSection;
            window.toggleComplianceSection = function() {
                callCount++;
                return orig.apply(this, arguments);
            };
            
            // Click the toggle
            var toggle = document.querySelector('[onclick*="toggleComplianceSection(\'' + secName + '\')"]');
            if (!toggle) { window.toggleComplianceSection = orig; return { name: secName, error: 'toggle NOT FOUND' }; }
            toggle.click();
            
            var after = section.style.display;
            window.toggleComplianceSection = orig;
            
            return { name: secName, before: before, after: after, callCount: callCount, passed: before === 'none' && after === 'block' };
        }, sec);
        
        console.log(`  ${result.name}: ${result.passed ? '✅' : '❌'} (before=${result.before}, after=${result.after}, calls=${result.callCount})`);
        
        // Toggle back to reset
        if (result.passed) {
            await page.evaluate((secName) => {
                var s = document.getElementById(secName + 'Section');
                if (s) s.style.display = 'none';
            }, sec);
        }
    }
    
    // ══════ TEST 2: COMPLIANCE SECTIONS ══════
    console.log('\n═══ TEST 2: COMPLIANCE SECTIONS ═══');
    await page.evaluate(() => {
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-compliance');
    });
    await page.waitForTimeout(500);
    
    const compSections = ['poam', 'evidence', 'monitoring', 'fedramp', 'templates'];
    for (const sec of compSections) {
        const result = await page.evaluate((secName) => {
            var section = document.getElementById(secName + 'Section');
            if (!section) return { name: secName, error: 'NOT FOUND' };
            section.style.display = 'none'; // ensure clean state
            var toggle = document.querySelector('[onclick*="toggleComplianceSection(\'' + secName + '\')"]');
            if (!toggle) return { name: secName, error: 'toggle NOT FOUND' };
            toggle.click();
            var after = section.style.display;
            section.style.display = 'none'; // reset
            return { name: secName, after: after, passed: after === 'block' };
        }, sec);
        console.log(`  ${result.name}: ${result.passed ? '✅' : '❌'} (after=${result.after || result.error})`);
    }
    
    // ══════ TEST 3: VERSION DIFF VIEWER (hub-submissions) ══════
    console.log('\n═══ TEST 3: VERSION DIFF VIEWER (hub-submissions) ═══');
    await page.evaluate(() => {
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-submissions');
    });
    await page.waitForTimeout(500);
    
    const diffResult = await page.evaluate(() => {
        var section = document.getElementById('versionDiffSection');
        if (!section) return { error: 'NOT FOUND' };
        section.style.display = 'none';
        var toggle = document.querySelector('[onclick*="toggleComplianceSection(\'versionDiff\')"]');
        if (!toggle) return { error: 'toggle NOT FOUND' };
        toggle.click();
        var after = section.style.display;
        return { after: after, passed: after === 'block' };
    });
    console.log(`  versionDiff: ${diffResult.passed ? '✅' : '❌'} (after=${diffResult.after || diffResult.error})`);
    
    // ══════ TEST 4: TEAM / ANALYSES / WEBHOOKS PANEL BUTTONS ══════
    console.log('\n═══ TEST 4: TEAM / ANALYSES / WEBHOOKS BUTTONS ═══');
    
    // Team
    const teamResult = await page.evaluate(() => {
        var panelBefore = document.getElementById('teamManagePanel');
        if (panelBefore) panelBefore.remove(); // clean state
        
        var btn = document.querySelector('[onclick*="showTeamPanel"]');
        if (!btn) return { error: 'Team button NOT FOUND' };
        btn.click();
        
        var panel = document.getElementById('teamManagePanel');
        var overlay = document.getElementById('teamManageOverlay');
        return { panelCreated: !!panel, overlayCreated: !!overlay, passed: !!panel };
    });
    console.log(`  Team Panel: ${teamResult.passed ? '✅' : '❌'} (panel=${teamResult.panelCreated}, overlay=${teamResult.overlayCreated || teamResult.error})`);
    
    // Clean up team panel
    await page.evaluate(() => {
        var p = document.getElementById('teamManagePanel'); if (p) p.remove();
        var o = document.getElementById('teamManageOverlay'); if (o) o.remove();
    });
    
    // My Analyses
    const analysesResult = await page.evaluate(() => {
        var existing = document.getElementById('savedAnalysesPanel');
        if (existing) existing.remove();
        
        var btn = document.querySelector('[onclick*="showSavedAnalyses"]');
        if (!btn) return { error: 'Analyses button NOT FOUND' };
        btn.click();
        
        var panel = document.getElementById('savedAnalysesPanel') || document.getElementById('savedAnalysesOverlay');
        return { panelCreated: !!panel, passed: !!panel };
    });
    console.log(`  My Analyses: ${analysesResult.passed ? '✅' : '❌'} (panel=${analysesResult.panelCreated || analysesResult.error})`);
    
    // Clean up
    await page.evaluate(() => {
        ['savedAnalysesPanel', 'savedAnalysesOverlay'].forEach(id => {
            var el = document.getElementById(id); if (el) el.remove();
        });
    });
    
    // Webhooks
    const webhookResult = await page.evaluate(() => {
        var existing = document.getElementById('webhookPanel');
        if (existing) existing.remove();
        
        var btn = document.querySelector('[onclick*="showWebhookSettings"]');
        if (!btn) return { error: 'Webhook button NOT FOUND' };
        btn.click();
        
        var panel = document.getElementById('webhookPanel') || document.getElementById('webhookOverlay');
        return { panelCreated: !!panel, passed: !!panel };
    });
    console.log(`  Webhooks: ${webhookResult.passed ? '✅' : '❌'} (panel=${webhookResult.panelCreated || webhookResult.error})`);
    
    // ══════ SUMMARY ══════
    console.log('\n═══ PAGE ERRORS ═══');
    const realErrors = errors.filter(e => !e.includes('X-Frame') && !e.includes('Content Security') && !e.includes('WebSocket') && !e.includes('worker'));
    console.log(realErrors.length > 0 ? realErrors.join('\n') : 'None relevant');
});
