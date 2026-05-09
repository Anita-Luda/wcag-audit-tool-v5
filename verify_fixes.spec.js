import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('verify three-state filters and header buttons', async ({ page }) => {
  const url = 'http://localhost:3000';
  await page.goto(url);

  // Wait for app to load
  await page.waitForSelector('#app-name');

  // 1. Verify Filters
  const firstFilterLabel = await page.locator('.filter-group label').first();
  const firstFilterInput = firstFilterLabel.locator('input');

  // Initial state: neutral
  await expect(firstFilterLabel).not.toHaveClass(/filter-include/);
  await expect(firstFilterLabel).not.toHaveClass(/filter-exclude/);

  // Click 1: include
  await firstFilterInput.click();
  await expect(firstFilterLabel).toHaveClass(/filter-include/);
  await expect(firstFilterLabel).not.toHaveClass(/filter-exclude/);

  // Click 2: exclude
  await firstFilterInput.click();
  await expect(firstFilterLabel).toHaveClass(/filter-exclude/);
  await expect(firstFilterLabel).not.toHaveClass(/filter-include/);

  // Click 3: neutral
  await firstFilterInput.click();
  await expect(firstFilterLabel).not.toHaveClass(/filter-include/);
  await expect(firstFilterLabel).not.toHaveClass(/filter-exclude/);

  // 2. Verify Save Version Button (should alert if no project)
  // We need to handle dialogs
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('Najpierw wybierz lub utwórz projekt');
    await dialog.dismiss();
  });
  await page.click('#save-version-btn');

  // 3. Verify App Name sync (no cursor jump is hard to test but we can check value)
  await page.fill('#app-name', 'Test App');
  const val = await page.inputValue('#app-name');
  expect(val).toBe('Test App');

  await page.screenshot({ path: 'verification/fix_verification.png', fullPage: true });
});
