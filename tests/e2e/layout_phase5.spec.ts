import { test, expect } from '@playwright/test';
import phase4Data from './fixtures/layout_after_phase4.json' with { type: 'json' };

test.describe('Layout Regression - Phase 5: Layout Mode Verification', () => {
  test.setTimeout(60000);
  test.beforeEach(async ({ page }) => {
    await page.goto('/?nosample=1');
    await page.evaluate(() => localStorage.clear());
    await page.waitForSelector('.mindmap-node');
    // Load Phase 4 end state
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    await page.evaluate((data) => (window as any).kakidash.loadData(data), phase4Data as any);
    await page.waitForTimeout(500);
  });

  test('should verify layout modes', async ({ page }) => {
    // Current state: Selection is at NewNode4-10

    // --- Left Layout ---
    await page.locator('button[title="Layout: Left"]').click();
    await page.locator('button[title="Reset Zoom"]').click(); // Reset Zoom to ensure visibility
    await page.waitForTimeout(500); // Wait for transition
    await expect(page).toHaveScreenshot('08-layout-left.png');

    // Explicitly select NewNode4-2 (avoid relative nav issues after focus change)
    const node4_2 = page.locator('.mindmap-node').filter({ hasText: 'NewNode4-2' }).first();
    await node4_2.click();
    await expect(node4_2).toBeVisible();
    await expect(node4_2).toHaveCSS('outline-style', 'solid');

    // Return to 4-10 using Keyboard (auto-pan)
    for (let k = 0; k < 8; k++) {
      await page.keyboard.press('h');
    }

    const node4_10 = page.locator('.mindmap-node').filter({ hasText: 'NewNode4-10' }).first();
    await expect(node4_10).toBeVisible(); // Ensures auto-pan worked
    await expect(node4_10).toHaveCSS('outline-style', 'solid');

    // Snapshot: Check for layout collapse at deep node in Left Layout
    await expect(page).toHaveScreenshot('08-layout-left-node10.png');

    // --- Both Layout ---
    await page.locator('button[title="Layout: Both"]').click();
    await page.locator('button[title="Reset Zoom"]').click(); // Reset Zoom to ensure visibility
    await page.waitForTimeout(500); // Wait for transition
    await expect(page).toHaveScreenshot('09-layout-both.png');

    const node4 = page
      .locator('.mindmap-node')
      .filter({ hasText: /^NewNode4$/ })
      .first();
    const nodeId4 = await node4.getAttribute('data-id');
    await page.evaluate(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
      (id) => (window as any).kakidash.controller.ensureNodeVisible(id, true, true),
      nodeId4,
    );
    await page.waitForTimeout(300); // 描画待ち
    await node4.click({ force: true });
    await expect(node4).toHaveCSS('outline-style', 'solid');

    // Navigate to 4-2 (Child/Left x 2)
    for (let k = 0; k < 2; k++) {
      await page.keyboard.press('h');
    }

    const node4_2_both = page.locator('.mindmap-node').filter({ hasText: 'NewNode4-2' }).first();
    await expect(node4_2_both).toBeVisible();
    await expect(node4_2_both).toHaveCSS('outline-style', 'solid');

    // Navigate to 4-10 (Child/Left x 8)
    for (let k = 0; k < 8; k++) {
      await page.keyboard.press('h');
    }

    const node4_10_both = page.locator('.mindmap-node').filter({ hasText: 'NewNode4-10' }).first();
    await expect(node4_10_both).toBeVisible();
    await expect(node4_10_both).toHaveCSS('outline-style', 'solid');
  });
});
