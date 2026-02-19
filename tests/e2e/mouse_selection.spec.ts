import { test, expect } from '@playwright/test';

test.describe('Mouse Selection Interactions', () => {
  test.setTimeout(60000);
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.mindmap-node');
  });

  test('should select multiple nodes using Shift+Click', async ({ page }) => {
    // 1. Initial State: Verify default nodes from index.html exist
    // Child 1 and Child 2 are created by the demo script
    const child1 = page
      .locator('.mindmap-node')
      .filter({ hasText: /^Child 1$/ })
      .first();
    const child2 = page
      .locator('.mindmap-node')
      .filter({ hasText: /^Child 2$/ })
      .first();

    await expect(child1).toBeVisible();
    await expect(child2).toBeVisible();

    // 2. Select Child 1
    await child1.click();

    // 3. Shift+Click Child 2
    await page.keyboard.down('Shift');
    await child2.click();
    await page.keyboard.up('Shift');

    // 4. Verify both are selected
    // Visual check: outline style
    await expect(child1).toHaveCSS('outline-style', 'solid');
    await expect(child2).toHaveCSS('outline-style', 'solid');

    // Functional check: Delete them
    await page.keyboard.press('Delete');

    await expect(child1).toBeHidden();
    await expect(child2).toBeHidden();

    // Root should still be there
    const rootNode = page.locator('.mindmap-node[data-id="root"]');
    await expect(rootNode).toBeVisible();
  });
});
