const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Verify visual theme improvements', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Create verification directory
  const vDir = path.join(__dirname, 'verification');
  if (!fs.existsSync(vDir)) fs.mkdirSync(vDir);

  // 1. Check Light Mode Header & Export Buttons
  await page.screenshot({ path: path.join(vDir, 'light_mode_header.png'), fullPage: false });

  // 2. Open a modal in Light Mode to see secondary buttons
  await page.click('button:has-text("Nowy")');
  await page.waitForSelector('.kawaii-modal');
  await page.screenshot({ path: path.join(vDir, 'light_mode_modal.png') });
  await page.click('#kawaii-cancel');

  // 3. Switch to Dark Mode
  await page.click('#theme-toggle-btn');
  await page.waitForTimeout(500); // Wait for transition

  // 4. Check Dark Mode Header
  await page.screenshot({ path: path.join(vDir, 'dark_mode_header.png'), fullPage: false });

  // 5. Check Summary in Dark Mode (Bright spot check)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(vDir, 'dark_mode_summary.png') });

  // 6. Check Modal in Dark Mode (White button check)
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('button:has-text("Nowy")');
  await page.waitForSelector('.kawaii-modal');

  // Select an option to see the "selected" background
  await page.click('.modal-option:first-child');

  await page.screenshot({ path: path.join(vDir, 'dark_mode_modal.png') });
});
