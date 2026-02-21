import { test, expect } from '@playwright/test';
import phase3Data from './fixtures/layout_after_phase3.json' with { type: 'json' };

test.describe('Layout Regression - Phase 4: Styles & Layout Verification', () => {
  test.setTimeout(60000);
  test.beforeEach(async ({ page }) => {
    await page.goto('/?nosample=1');
    await page.evaluate(() => localStorage.clear());
    await page.waitForSelector('.mindmap-node');
    // Load Phase 3 end state
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    await page.evaluate((data) => (window as any).kakidash.loadData(data), phase3Data as any);
    await page.waitForTimeout(1000);
  });

  test('should apply styles and verify layout', async ({ page }) => {
    // Select NewNode4-3 directly by clicking (avoids unstable auto-pan from navigation)
    const node4_3 = page
      .locator('.mindmap-node')
      .filter({ hasText: 'In what distant deeps' })
      .first();
    await node4_3.scrollIntoViewIfNeeded();
    await node4_3.click();
    await expect(node4_3).toHaveCSS('outline-style', 'solid');

    // Apply Styles
    // Font Size Up (Shift + >) x 2
    await page.keyboard.press('Shift+>');
    await page.keyboard.press('Shift+>');

    // Color 4
    await page.keyboard.press('4');

    // Italic
    await page.keyboard.press('Shift+i');

    // Bold
    await page.keyboard.press('Shift+b');

    // Reset viewport before snapshot for consistent position
    await page.locator('button[title="Reset Zoom"]').click();
    await page.waitForTimeout(500);

    // Snapshot: Style Changed
    await expect(page).toHaveScreenshot('06-style-changed.png');

    // Select NewNode4-10 directly by clicking
    const node4_10 = page.locator('.mindmap-node').filter({ hasText: 'NewNode4-10' }).first();
    await node4_10.scrollIntoViewIfNeeded();
    await node4_10.click();
    await expect(node4_10).toHaveCSS('outline-style', 'solid');

    // Reset viewport before snapshot for consistent position
    await page.locator('button[title="Reset Zoom"]').click();
    await page.waitForTimeout(500);

    // Snapshot: After Navigation
    await expect(page).toHaveScreenshot('07-after-style-nav.png');
  });
});
