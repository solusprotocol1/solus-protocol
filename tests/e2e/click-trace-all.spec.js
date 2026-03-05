import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('Trace all click handlers on toggle element', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    
    await page.evaluate(() => {
        sessionStorage.setItem('s4_entered', '1');
        sessionStorage.setItem('s4_onboard_done', '1');
        sessionStorage.setItem('s4_authenticated', '1');
        sessionStorage.setItem('s4_user_role', 'ils_manager');
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
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
    
    await page.evaluate(() => {
        if (typeof window.openILSTool === 'function') window.openILSTool('hub-reports');
    });
    await page.waitForTimeout(500);
    
    // === Trace click event dispatch and ALL calls to toggleComplianceSection ===
    const result = await page.evaluate(() => {
        var log = [];
        var section = document.getElementById('execSummarySection');
        var toggle = document.querySelector('[onclick*="toggleComplianceSection(\'execSummary\')"]');
        if (!section || !toggle) return ['section or toggle NOT FOUND'];
        
        log.push('__s4InlineOK: ' + window.__s4InlineOK);
        log.push('Initial display: ' + section.style.display);
        
        // Wrap toggleComplianceSection to count ALL calls
        var callNum = 0;
        var origToggle = window.toggleComplianceSection;
        window.toggleComplianceSection = function(sec) {
            callNum++;
            var s = document.getElementById(sec + 'Section');
            log.push('CALL #' + callNum + ': toggleComplianceSection("' + sec + '") display=' + (s ? s.style.display : 'N/A'));
            var stack = new Error().stack.split('\n').slice(1, 6).map(function(l) { return l.trim(); });
            log.push('  Stack: ' + stack.join(' | '));
            var result = origToggle.apply(this, arguments);
            log.push('  Result: display=' + (s ? s.style.display : 'N/A'));
            return result;
        };
        
        // Also trace the capture-phase delegation handler
        // Add a NEW capture handler BEFORE the existing one
        document.addEventListener('click', function(evt) {
            var el = evt.target;
            var ocAttr = '';
            for (var d = 0; el && d < 15; d++) {
                var oc = el.getAttribute && el.getAttribute('onclick');
                if (oc) { ocAttr = oc; break; }
                el = el.parentElement;
            }
            log.push('CAPTURE click: target=' + evt.target.tagName + '#' + (evt.target.id||'') + '.' + (evt.target.className||'') + 
                     ' onclick_found=' + (ocAttr ? ocAttr.substring(0,50) : 'NONE') + 
                     ' inlineOK=' + window.__s4InlineOK +
                     ' phase=' + evt.eventPhase);
        }, true);
        
        // Also listen at bubble phase
        document.addEventListener('click', function(evt) {
            log.push('BUBBLE click: target=' + evt.target.tagName + ' phase=' + evt.eventPhase);
        }, false);
        
        // Also listen on the toggle element directly
        toggle.addEventListener('click', function(evt) {
            log.push('TOGGLE-LISTENER click: phase=' + evt.eventPhase + ' display_now=' + section.style.display);
        }, false);
        
        log.push('--- CLICKING ---');
        toggle.click();
        log.push('--- AFTER CLICK ---');
        log.push('Final display: ' + section.style.display);
        log.push('Total toggleComplianceSection calls: ' + callNum);
        
        // Restore
        window.toggleComplianceSection = origToggle;
        
        return log;
    });
    
    result.forEach(line => console.log(line));
});
