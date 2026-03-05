import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('Property trap on execSummarySection.style.display', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    
    // Set up session with role pre-set
    await page.evaluate(() => {
        sessionStorage.setItem('s4_entered', '1');
        sessionStorage.setItem('s4_onboard_done', '1');
        sessionStorage.setItem('s4_authenticated', '1');
        sessionStorage.setItem('s4_user_role', 'ils_manager');
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    // Force workspace visible, hide overlays
    await page.evaluate(() => {
        document.getElementById('dodConsentBanner').style.display = 'none';
        document.getElementById('cacLoginModal').style.display = 'none';
        var ob = document.getElementById('onboardOverlay'); if (ob) ob.style.display = 'none';
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
    
    // === Install property trap on the style object ===
    const result = await page.evaluate(() => {
        var el = document.getElementById('execSummarySection');
        if (!el) return 'execSummarySection NOT FOUND';
        
        var log = [];
        
        // Save the original style object
        var origStyle = el.style;
        var origDisplay = origStyle.display;
        log.push('Initial display: ' + origDisplay);
        
        // Override setProperty and direct property setter
        var realSetProperty = origStyle.setProperty.bind(origStyle);
        
        // Install proxy on style.setProperty
        origStyle.setProperty = function(prop, val, priority) {
            if (prop === 'display') {
                log.push('setProperty("display", "' + val + '") from: ' + new Error().stack.split('\n').slice(1,4).join(' << '));
            }
            return realSetProperty(prop, val, priority);
        };
        
        // Capture the CSSStyleDeclaration prototype setter
        var descriptor = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'display');
        if (descriptor && descriptor.set) {
            var originalSetter = descriptor.set;
            Object.defineProperty(origStyle, 'display', {
                get: function() { return descriptor.get.call(this); },
                set: function(val) {
                    log.push('style.display = "' + val + '" from: ' + new Error().stack.split('\n').slice(1,4).join(' << '));
                    return originalSetter.call(this, val);
                },
                configurable: true
            });
        } else {
            log.push('WARNING: Could not install display trap');
        }
        
        // Now trigger .click() on the toggle div
        var toggle = document.querySelector('[onclick*="toggleComplianceSection(\'execSummary\')"]');
        if (!toggle) return 'toggle NOT FOUND';
        
        log.push('--- clicking toggle ---');
        toggle.click();
        log.push('--- after click ---');
        log.push('Final display: ' + el.style.display);
        
        return log;
    });
    
    if (typeof result === 'string') {
        console.log(result);
    } else {
        result.forEach(line => console.log(line));
    }
});
