import { test, expect } from '@playwright/test';

test.describe('Layout Regression - Phase 1: Initial State & Add Nodes', () => {
  test.setTimeout(60000);
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test('should maintain layout stability on initial state and consecutive adds', async ({
    page,
  }) => {
    // 1. Initial State
    await expect(page).toHaveScreenshot('00-initial-state.png');

    // Select Root
    const rootNode = page.locator('.mindmap-node[data-id="root"]');
    await rootNode.click();

    // Add 10 Nodes
    for (let i = 1; i <= 10; i++) {
      const newNodeText = `NewNode${i}`;

      if (i === 1) {
        // First node: Add Child to Root
        await page.keyboard.press('Tab');
      } else {
        // Subsequent: Add Sibling to previous NewNode
        await page.keyboard.press('Enter');
      }

      const editor = page.locator('textarea');
      await expect(editor).toBeVisible();

      await editor.fill(newNodeText);
      await page.keyboard.press('Enter');
      await expect(editor).not.toBeVisible();

      // Verify the new node exists with the correct text
      const newNode = page.locator('.mindmap-node').filter({ hasText: newNodeText }).first();
      await expect(newNode).toBeVisible();
      await newNode.scrollIntoViewIfNeeded();
    }
  });
});
