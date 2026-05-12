
const { test, expect } = require('@playwright/test');

test('Criteria search works', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Wait for table to load
  await page.waitForSelector('.audit-table tbody tr');

  const searchInput = page.locator('#criteria-search');
  await searchInput.fill('1.1.1');

  // Should show 1.1.1 and hide others
  const visibleRows = page.locator('.audit-table tbody tr:not([hidden])');
  const rowCount = await visibleRows.count();

  // In standard WCAG there is one 1.1.1
  expect(rowCount).toBeGreaterThan(0);

  for (let i = 0; i < rowCount; i++) {
    const text = await visibleRows.nth(i).innerText();
    expect(text).toContain('1.1.1');
  }

  // Clear search
  await searchInput.fill('');
  const allRowsCount = await page.locator('.audit-table tbody tr').count();
  const visibleRowsAfterClear = await page.locator('.audit-table tbody tr:not([hidden])').count();
  expect(visibleRowsAfterClear).toBe(allRowsCount);
});
