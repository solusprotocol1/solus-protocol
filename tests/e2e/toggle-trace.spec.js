import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('Toggle function deep trace', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    
    // Set up proper session
    await page.evaluate(() => {
        sessionStorage.setItem('s4_entered', '1');
        sessionStorage.setItem('s4_onboard_done', '1');
        sessionStorage.setItem('s4_authenticated', '1');
        sessionStorage.setItem('s4_user_role', 'ils_manager');
    });
    // Reload so roles.js reads the session vars at load time
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    // Verify workspace is showing
    const wsVis = await page.evaluate(() => {
        var ws = document.getElementById('platformWorkspace');
        // Force show if needed
        if (ws && ws.style.display !== 'block') {
            ws.style.display = 'block';
            var landing = document.getElementById('platformLanding');
            if (landing) landing.style.display = 'none';
            var hero = document.querySelector('.hero');
            if (hero) hero.style.display = 'none';
        }
        return ws ? ws.style.display : 'NOT_FOUND';
    });
    console.log('Workspace:', wsVis);
    
    // Remove any overlays
    await page.evaluate(() => {
        ['dodConsentBanner', 'cacLoginModal', 'onboardOverlay', 'roleModal', 'sessionLockOverlay'].forEach(id => {
            var el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    });
    
    // Navigate to ILS + hub-reports
    await page.evaluate(() => {
        if (typeof window.showSection === 'function') window.showSection('sectionILS');
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-reports');
    });
    await page.waitForTimeout(500);
    
    // Check that roleModal isn't present
    const roleModalPresent = await page.evaluate(() => !!document.getElementById('roleModal'));
    console.log('roleModal present:', roleModalPresent);
    
    // === DEEP TRACE on toggleComplianceSection ===
    console.log('\n=== DEEP TRACE ===');
    
    const traceResult = await page.evaluate(() => {
        var el = document.getElementById('execSummarySection');
        if (!el) return { error: 'execSummarySection NOT FOUND' };
        
        var trace = [];
        
        // Check initial state
        trace.push('Initial display: ' + el.style.display);
        trace.push('Initial computed display: ' + window.getComputedStyle(el).display);
        
        // Instrument the function
        var origFn = window.toggleComplianceSection;
        window.toggleComplianceSection = function(sec) {
            var section = document.getElementById(sec + 'Section');
            trace.push('--- fn called with: ' + sec);
            trace.push('section found: ' + !!section);
            if (section) {
                trace.push('section.style.display BEFORE toggle: ' + section.style.display);
                trace.push('computed display BEFORE: ' + window.getComputedStyle(section).display);
            }
            // Call original
            var result = origFn.call(this, sec);
            if (section) {
                trace.push('section.style.display AFTER toggle: ' + section.style.display);
                trace.push('computed display AFTER: ' + window.getComputedStyle(section).display);
            }
            return result;
        };
        
        // Now call it directly
        window.toggleComplianceSection('execSummary');
        trace.push('--- After direct call ---');
        trace.push('display: ' + el.style.display);
        trace.push('computed: ' + window.getComputedStyle(el).display);
        
        // Call it again to toggle back
        window.toggleComplianceSection('execSummary');
        trace.push('--- After second call ---');
        trace.push('display: ' + el.style.display);
        
        // Reset to none
        el.style.display = 'none';
        
        // Now simulate what an onclick handler would do
        // 1. Create a synthetic click event
        var toggle = document.querySelector('[onclick*="toggleComplianceSection(\'execSummary\')"]');
        trace.push('\ntoggle div found: ' + !!toggle);
        if (toggle) {
            trace.push('toggle onclick attr: ' + toggle.getAttribute('onclick'));
            
            // Set up a MutationObserver to catch any changes to the section
            var mutations = [];
            var observer = new MutationObserver(function(list) {
                list.forEach(function(m) {
                    mutations.push({
                        type: m.type,
                        attr: m.attributeName,
                        oldValue: m.oldValue,
                        newValue: m.target.style ? m.target.style.display : 'N/A'
                    });
                });
            });
            observer.observe(el, { attributes: true, attributeOldValue: true, attributeFilter: ['style'] });
            
            trace.push('display before click: ' + el.style.display);
            
            // Dispatch a real click
            toggle.click();
            
            trace.push('display after .click(): ' + el.style.display);
            trace.push('mutations: ' + JSON.stringify(mutations));
            
            observer.disconnect();
        }
        
        window.toggleComplianceSection = origFn;
        
        return trace;
    });
    
    console.log(traceResult.error || traceResult.join('\n'));
    
    // === Also check: is there any CSS rule hiding sections? ===
    console.log('\n=== CSS CHECK ===');
    const cssCheck = await page.evaluate(() => {
        var el = document.getElementById('execSummarySection');
        if (!el) return 'NOT FOUND';
        
        // Check all stylesheets for rules that match this element
        var rules = [];
        for (var i = 0; i < document.styleSheets.length; i++) {
            try {
                var sheet = document.styleSheets[i];
                for (var j = 0; j < sheet.cssRules.length; j++) {
                    var rule = sheet.cssRules[j];
                    if (rule.selectorText && el.matches(rule.selectorText)) {
                        if (rule.style.display) {
                            rules.push(rule.selectorText + ' { display: ' + rule.style.display + ' }' + (rule.style.getPropertyPriority('display') ? ' !important' : ''));
                        }
                    }
                }
            } catch(e) { /* cross-origin */ }
        }
        return rules;
    });
    console.log('CSS display rules matching execSummarySection:', JSON.stringify(cssCheck));
    
    // Check parent visibility
    const parentCheck = await page.evaluate(() => {
        var el = document.getElementById('execSummarySection');
        if (!el) return 'NOT FOUND';
        var results = [];
        var cur = el;
        for (var d = 0; cur && d < 10; d++) {
            var cs = window.getComputedStyle(cur);
            results.push({
                tag: cur.tagName,
                id: cur.id || '(none)',
                display: cs.display,
                visibility: cs.visibility,
                overflow: cs.overflow
            });
            cur = cur.parentElement;
        }
        return results;
    });
    console.log('Parent chain:');
    parentCheck.forEach(p => console.log('  ' + p.tag + '#' + p.id + ' display=' + p.display + ' vis=' + p.visibility + ' overflow=' + p.overflow));
});
