import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('AI toggle works correctly after double-toggle fix', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    page.on('pageerror', err => logs.push('PAGE ERROR: ' + err.message));
    
    await page.goto(BASE, { waitUntil: 'networkidle' });
    
    // Skip auth entirely — force into platform state via JS
    await page.evaluate(() => {
        // Set auth state
        sessionStorage.setItem('s4_entered', '1');
        sessionStorage.setItem('s4_onboard_done', '1');
        sessionStorage.setItem('s4_user_role', 'logistics_officer');
        
        // Show workspace, hide landing
        var landing = document.getElementById('platformLanding');
        if (landing) landing.style.display = 'none';
        var hero = document.querySelector('.hero');
        if (hero) hero.style.display = 'none';
        var ws = document.getElementById('platformWorkspace');
        if (ws) ws.style.display = 'block';
        
        // Show ILS tab (AI wrapper is inside tabILS)
        if (typeof window.showSection === 'function') {
            window.showSection('sectionILS');
        }
        
        // Show AI wrapper
        var aiWrap = document.getElementById('aiFloatWrapper');
        if (aiWrap) aiWrap.style.display = 'flex';
    });
    
    await page.waitForTimeout(500);
    
    // === VERIFY AI TOGGLE ===
    const toggleBtn = page.locator('.ai-float-toggle');
    await expect(toggleBtn).toBeVisible({ timeout: 3000 });
    
    // 1. Panel should be CLOSED initially
    const initialState = await page.evaluate(() => {
        var p = document.getElementById('aiFloatPanel');
        var cs = window.getComputedStyle(p);
        return { hasOpen: p.classList.contains('open'), visibility: cs.visibility, opacity: cs.opacity };
    });
    console.log('Initial panel state:', JSON.stringify(initialState));
    expect(initialState.hasOpen).toBe(false);
    expect(initialState.visibility).toBe('hidden');
    
    // 2. FIRST CLICK — should OPEN
    await toggleBtn.click();
    await page.waitForTimeout(400);
    
    const afterFirstClick = await page.evaluate(() => {
        var p = document.getElementById('aiFloatPanel');
        var cs = window.getComputedStyle(p);
        return { hasOpen: p.classList.contains('open'), visibility: cs.visibility, opacity: cs.opacity };
    });
    console.log('After FIRST click:', JSON.stringify(afterFirstClick));
    expect(afterFirstClick.hasOpen).toBe(true);
    expect(afterFirstClick.visibility).toBe('visible');
    
    // 3. SECOND CLICK — should CLOSE
    await toggleBtn.click();
    await page.waitForTimeout(400);
    
    const afterSecondClick = await page.evaluate(() => {
        var p = document.getElementById('aiFloatPanel');
        var cs = window.getComputedStyle(p);
        return { hasOpen: p.classList.contains('open'), visibility: cs.visibility };
    });
    console.log('After SECOND click:', JSON.stringify(afterSecondClick));
    expect(afterSecondClick.hasOpen).toBe(false);
    expect(afterSecondClick.visibility).toBe('hidden');
    
    // 4. THIRD CLICK — should OPEN again
    await toggleBtn.click();
    await page.waitForTimeout(400);
    
    const afterThirdClick = await page.evaluate(() => {
        var p = document.getElementById('aiFloatPanel');
        return { hasOpen: p.classList.contains('open'), visibility: window.getComputedStyle(p).visibility };
    });
    console.log('After THIRD click:', JSON.stringify(afterThirdClick));
    expect(afterThirdClick.hasOpen).toBe(true);
    expect(afterThirdClick.visibility).toBe('visible');
    
    // 5. CLOSE BUTTON — should close
    const closeBtn = page.locator('.ai-close-btn');
    await expect(closeBtn).toBeVisible({ timeout: 2000 });
    await closeBtn.click();
    await page.waitForTimeout(400);
    
    const afterCloseBtn = await page.evaluate(() => {
        var p = document.getElementById('aiFloatPanel');
        return { hasOpen: p.classList.contains('open'), visibility: window.getComputedStyle(p).visibility };
    });
    console.log('After CLOSE btn click:', JSON.stringify(afterCloseBtn));
    expect(afterCloseBtn.hasOpen).toBe(false);
    expect(afterCloseBtn.visibility).toBe('hidden');
    
    // Check for page errors
    const errors = logs.filter(l => l.includes('PAGE ERROR'));
    console.log('\nPage errors:', errors.length > 0 ? errors.join('\n') : 'None');
    
    console.log('\n✅ AI TOGGLE FIX VERIFIED — all click states correct!');
});
