
const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 960 });

    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);

    // Test Dark Mode
    await page.click('#theme-toggle-btn');
    await page.waitForTimeout(500);

    // Check input backgrounds in Dark Mode (specifically focus)
    await page.fill('#app-name', 'Test App');
    await page.focus('#app-name');
    await page.screenshot({ path: 'verification/theme_check_v2/dark_mode_focus.png' });

    // Check Header
    await page.screenshot({ path: 'verification/theme_check_v2/dark_mode_header.png', clip: { x: 0, y: 0, width: 1280, height: 400 } });

    // Test New Audit Collision Loop
    // First, find an existing audit name
    const auditSelector = await page.$('#audit-selector');
    const existingName = await page.evaluate(el => el.options[0].text.split(' (')[0], auditSelector);

    await page.fill('#app-name', existingName);
    await page.click('#create-audit-btn');
    await page.waitForSelector('.modal-overlay');
    await page.click('#modal-confirm'); // "Utwórz nowy"

    await page.waitForSelector('.kawaii-modal');
    await page.screenshot({ path: 'verification/theme_check_v2/collision_dialog.png' });

    // Click "Zmień nazwę" (confirmLabel)
    await page.click('#kawaii-confirm');
    await page.waitForSelector('#kawaii-prompt-input');
    await page.screenshot({ path: 'verification/theme_check_v2/prompt_dialog.png' });

    await browser.close();
})();
