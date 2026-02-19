import { test, expect } from '@playwright/test';

test.describe('Undo Paste Focus', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.mindmap-node');
  });

  test('should restore focus to the parent node after undoing a paste', async ({ page }) => {
    // 1. Initial State: Find a node to act as parent (e.g., Root)
    const rootNode = page.locator('.mindmap-node[data-id="root"]');
    await expect(rootNode).toBeVisible();

    // 2. Select Root
    await rootNode.click();
    await expect(rootNode).toHaveCSS('outline-style', 'solid');

    // 3. Copy Root (Ctrl+C)
    await page.keyboard.press('Control+c');

    // 3. Paste the node (Ctrl+V)
    const initialNodeCount = await page.locator('.mindmap-node').count();
    await page.keyboard.press('Control+v');

    // Wait for potential async operation
    await page.waitForTimeout(500);

    const afterPasteNodeCount = await page.locator('.mindmap-node').count();
    expect(afterPasteNodeCount).toBeGreaterThan(initialNodeCount);

    // The root node should NOT be selected anymore
    await expect(rootNode).not.toHaveCSS('outline-style', 'solid');

    // 5. Undo (Ctrl+Z)
    await page.keyboard.press('Control+z');

    // Wait for potential async operation
    await page.waitForTimeout(500);

    // 6. Verify Undo Happened (Node count should decrease)
    const afterUndoNodeCount = await page.locator('.mindmap-node').count();
    expect(afterUndoNodeCount).toBe(initialNodeCount);

    // 7. Verify Focus Restored to Root
    await expect(rootNode).toHaveCSS('outline-style', 'solid');
  });
});
