import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('AI toggle opens and closes the panel correctly (no double-toggle)', async ({ page }) => {
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    await page.goto(BASE, { waitUntil: 'networkidle' });
    
    // === AUTH FLOW ===
    // Click "Enter Platform"
    const enterBtn = page.locator('text=Enter Platform').first();
    await enterBtn.waitFor({ state: 'visible', timeout: 5000 });
    await enterBtn.click();
    
    // Accept consent
    const acceptBtn = page.locator('text=I Accept');
    if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await acceptBtn.click();
    }
    
    // CAC login
    const cacBtn = page.locator('#cacLoginBtn');
    if (await cacBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cacBtn.click();
        await page.waitForTimeout(2500); // simulateCacLogin has delays
    }
    
    // Wait for workspace
    await page.waitForSelector('#platformWorkspace[style*="display: block"], #platformWorkspace[style*="display:block"]', { timeout: 5000 });
    
    // === SKIP ONBOARDING + ROLE ===
    // Force through onboarding if shown
    const onboardOv = page.locator('#onboardOverlay');
    if (await onboardOv.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.evaluate(() => {
            if (typeof closeOnboarding === 'function') closeOnboarding();
            else if (typeof window.closeOnboarding === 'function') window.closeOnboarding();
            else {
                var ov = document.getElementById('onboardOverlay');
                if (ov) ov.style.display = 'none';
            }
            sessionStorage.setItem('s4_onboard_done', '1');
        });
        await page.waitForTimeout(300);
    }
    
    // Dismiss role modal if it appeared
    await page.waitForTimeout(500);
    const roleModal = page.locator('#roleModal');
    if (await roleModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click the first role card, then apply
        const roleCard = page.locator('.role-card').first();
        if (await roleCard.isVisible().catch(() => false)) await roleCard.click();
        const applyBtn = page.locator('text=Apply Role');
        if (await applyBtn.isVisible().catch(() => false)) await applyBtn.click();
        await page.waitForTimeout(500);
    }
    
    // Force apply role to ensure AI wrapper is visible
    await page.evaluate(() => {
        if (typeof window.applyRole === 'function') {
            sessionStorage.setItem('s4_user_role', 'logistics_officer');
            window.applyRole();
        }
        var aiWrap = document.getElementById('aiFloatWrapper');
        if (aiWrap) aiWrap.style.display = 'flex';
    });
    
    // Navigate to ILS tab (AI wrapper is inside tabILS)
    await page.evaluate(() => {
        if (typeof window.showSection === 'function') window.showSection('sectionILS');
    });
    await page.waitForTimeout(500);
    
    // === VERIFY AI TOGGLE ===
    // 1. Check AI wrapper is visible
    const aiWrapper = page.locator('#aiFloatWrapper');
    await expect(aiWrapper).toBeVisible({ timeout: 3000 });
    
    // 2. Check toggle button is visible
    const toggleBtn = page.locator('.ai-float-toggle');
    await expect(toggleBtn).toBeVisible({ timeout: 3000 });
    
    // 3. Check panel is initially CLOSED
    const panel = page.locator('#aiFloatPanel');
    const hasOpenBefore = await page.evaluate(() => {
        var p = document.getElementById('aiFloatPanel');
        return p ? p.classList.contains('open') : null;
    });
    console.log('Panel has .open class before toggle:', hasOpenBefore);
    expect(hasOpenBefore).toBe(false);
    
    // 4. Click toggle — panel should OPEN
    await toggleBtn.click();
    await page.waitForTimeout(400);
    
    const hasOpenAfterClick = await page.evaluate(() => {
        var p = document.getElementById('aiFloatPanel');
        if (!p) return { exists: false };
        var cs = window.getComputedStyle(p);
        return {
            exists: true,
            hasOpenClass: p.classList.contains('open'),
            visibility: cs.visibility,
            opacity: cs.opacity,
            display: p.style.display,
            computedDisplay: cs.display
        };
    });
    console.log('Panel state after FIRST toggle click:', JSON.stringify(hasOpenAfterClick));
    expect(hasOpenAfterClick.hasOpenClass).toBe(true);
    expect(hasOpenAfterClick.visibility).toBe('visible');
    
    // 5. Click toggle again — panel should CLOSE
    await toggleBtn.click();
    await page.waitForTimeout(400);
    
    const hasOpenAfterSecondClick = await page.evaluate(() => {
        var p = document.getElementById('aiFloatPanel');
        return p ? {
            hasOpenClass: p.classList.contains('open'),
            visibility: window.getComputedStyle(p).visibility
        } : null;
    });
    console.log('Panel state after SECOND toggle click:', JSON.stringify(hasOpenAfterSecondClick));
    expect(hasOpenAfterSecondClick.hasOpenClass).toBe(false);
    expect(hasOpenAfterSecondClick.visibility).toBe('hidden');
    
    // 6. Click toggle a third time — should open again
    await toggleBtn.click();
    await page.waitForTimeout(400);
    
    const thirdClick = await page.evaluate(() => {
        var p = document.getElementById('aiFloatPanel');
        return p ? p.classList.contains('open') : null;
    });
    console.log('Panel has .open after THIRD click:', thirdClick);
    expect(thirdClick).toBe(true);
    
    // 7. Test close button inside panel
    const closeBtn = page.locator('.ai-close-btn');
    if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(400);
        const afterClose = await page.evaluate(() => {
            var p = document.getElementById('aiFloatPanel');
            return p ? p.classList.contains('open') : null;
        });
        console.log('Panel has .open after close btn click:', afterClose);
        expect(afterClose).toBe(false);
    }
    
    console.log('\n✅ AI TOGGLE FIX VERIFIED — single-toggle works correctly!');
});
