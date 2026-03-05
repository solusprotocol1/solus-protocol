import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('AI toggle debug + verify fix', async ({ page }) => {
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    await page.goto(BASE, { waitUntil: 'networkidle' });
    
    // Skip auth — force into platform
    const debug = await page.evaluate(() => {
        sessionStorage.setItem('s4_entered', '1');
        sessionStorage.setItem('s4_onboard_done', '1');
        sessionStorage.setItem('s4_user_role', 'logistics_officer');
        
        var landing = document.getElementById('platformLanding');
        if (landing) landing.style.display = 'none';
        var hero = document.querySelector('.hero');
        if (hero) hero.style.display = 'none';
        var ws = document.getElementById('platformWorkspace');
        if (ws) ws.style.display = 'block';
        
        // Show ILS tab
        document.querySelectorAll('.tab-pane').forEach(function(p) {
            p.classList.remove('show','active');
            p.style.display = 'none';
        });
        var ils = document.getElementById('tabILS');
        if (ils) {
            ils.style.display = 'block';
            ils.classList.add('show', 'active');
        }
        
        // Show AI wrapper
        var aiWrap = document.getElementById('aiFloatWrapper');
        if (aiWrap) aiWrap.style.display = 'flex';
        
        // Debug
        var toggle = document.querySelector('.ai-float-toggle');
        var wrapCS = aiWrap ? window.getComputedStyle(aiWrap) : null;
        var toggleCS = toggle ? window.getComputedStyle(toggle) : null;
        var ilsCS = ils ? window.getComputedStyle(ils) : null;
        
        return {
            ws: ws ? ws.style.display : 'NOT FOUND',
            ils: ils ? { display: ils.style.display, comp: ilsCS.display, vis: ilsCS.visibility } : 'NOT FOUND',
            aiWrap: aiWrap ? { display: aiWrap.style.display, comp: wrapCS.display, vis: wrapCS.visibility, pointerEvents: wrapCS.pointerEvents, rect: aiWrap.getBoundingClientRect() } : 'NOT FOUND',
            toggle: toggle ? { comp: toggleCS.display, vis: toggleCS.visibility, pointerEvents: toggleCS.pointerEvents, opacity: toggleCS.opacity, rect: toggle.getBoundingClientRect() } : 'NOT FOUND',
            panel: document.getElementById('aiFloatPanel') ? 'exists' : 'NOT FOUND'
        };
    });
    console.log('DEBUG STATE:', JSON.stringify(debug, null, 2));
    
    // The toggle's pointer-events might be none from parent. Check if we need to override
    // Try clicking via JS evaluation instead of Playwright click
    const result = await page.evaluate(() => {
        var results = [];
        var panel = document.getElementById('aiFloatPanel');
        
        // Check initial state
        results.push('Initial: .open=' + panel.classList.contains('open'));
        
        // Call toggleAiAgent directly (what onclick does)
        if (typeof window.toggleAiAgent === 'function') {
            window.toggleAiAgent();
            results.push('After 1st toggle: .open=' + panel.classList.contains('open') + ' vis=' + window.getComputedStyle(panel).visibility);
            
            window.toggleAiAgent();
            results.push('After 2nd toggle: .open=' + panel.classList.contains('open') + ' vis=' + window.getComputedStyle(panel).visibility);
            
            window.toggleAiAgent();
            results.push('After 3rd toggle: .open=' + panel.classList.contains('open') + ' vis=' + window.getComputedStyle(panel).visibility);
        } else {
            results.push('toggleAiAgent NOT AVAILABLE on window!');
        }
        
        return results;
    });
    console.log('\nTOGGLE TEST RESULTS:');
    result.forEach(r => console.log('  ' + r));
    
    // Now try actual DOM click to see if double-fire happens
    const clickResult = await page.evaluate(() => {
        var panel = document.getElementById('aiFloatPanel');
        // Reset state
        if (panel.classList.contains('open')) {
            window.toggleAiAgent(); // close it
        }
        
        // Verify closed
        var r = ['Reset: .open=' + panel.classList.contains('open')];
        
        // Simulate what a real click does: fire the onclick handler
        var btn = document.querySelector('.ai-float-toggle');
        if (btn) {
            // Count how many times toggleAiAgent fires from a single click event
            var callCount = 0;
            var origToggle = window.toggleAiAgent;
            window.toggleAiAgent = function() {
                callCount++;
                origToggle.call(this);
            };
            
            btn.click(); // triggers onclick attribute + any addEventListener handlers
            
            r.push('Click fired toggleAiAgent ' + callCount + ' time(s)');
            r.push('After click: .open=' + panel.classList.contains('open') + ' vis=' + window.getComputedStyle(panel).visibility);
            
            // Restore
            window.toggleAiAgent = origToggle;
        }
        return r;
    });
    console.log('\nCLICK SIMULATION RESULTS:');
    clickResult.forEach(r => console.log('  ' + r));
    
    // Verify: after single click, panel should be open (callCount should be 1)
    expect(clickResult[1]).toContain('1 time(s)');
    expect(clickResult[2]).toContain('.open=true');
    expect(clickResult[2]).toContain('vis=visible');
    
    console.log('\n✅ AI TOGGLE FIX VERIFIED!');
});
