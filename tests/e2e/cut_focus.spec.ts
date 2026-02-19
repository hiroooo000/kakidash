import { test, expect } from '@playwright/test';

test.describe('Cut Operation Focus', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?nosample=1');
    // Clear localStorage to ensure a fresh mindmap for each test
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.mindmap-node');
  });

  test('should restore focus to the parent node after cutting a node', async ({ page }) => {
    // 1. Find Root
    const rootNode = page.locator('.mindmap-node[data-id="root"]');
    await expect(rootNode).toBeVisible();

    // 3. Add a child node
    await rootNode.click();
    await page.keyboard.press('Tab');

    // Wait for node to be added and editable
    await page.waitForTimeout(500);
    await page.keyboard.type('Child Node');
    await page.keyboard.press('Enter');

    // Confirm child exists and is selected
    const childNode = page.locator('.mindmap-node').filter({ hasText: /^Child Node$/ });
    await expect(childNode).toBeVisible();
    await expect(childNode).toHaveCSS('outline-style', 'solid');

    // 4. Cut the child node (Ctrl+X)
    await page.keyboard.press('Control+x');

    // Wait for potential async operation
    await page.waitForTimeout(500);

    // 5. Verify child is gone
    await expect(childNode).not.toBeVisible();

    // 6. Verify Focus Restored to Root
    // [BUG]: Currently this might fail because focus is lost
    await expect(rootNode).toHaveCSS('outline-style', 'solid');
  });

  test('should restore focus to parent when multiple nodes are cut', async ({ page }) => {
    const rootNode = page.locator('.mindmap-node[data-id="root"]');
    await rootNode.click();

    // Add two children
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('Child 1');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Click root again to add second child
    await rootNode.click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('Child 2');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const c1 = page.locator('.mindmap-node').filter({ hasText: /^Child 1$/ });
    const c2 = page.locator('.mindmap-node').filter({ hasText: /^Child 2$/ });

    await expect(c1).toBeVisible();
    await expect(c2).toBeVisible();

    // Multi-select them
    await c1.click();
    await page.keyboard.down('Shift');
    await c2.click();
    await page.keyboard.up('Shift');

    // Confirm both selected
    await expect(c1).toHaveCSS('outline-style', 'solid');
    await expect(c2).toHaveCSS('outline-style', 'solid');

    // Cut both
    await page.keyboard.press('Control+x');
    await page.waitForTimeout(500);

    // Verify both gone
    await expect(c1).not.toBeVisible();
    await expect(c2).not.toBeVisible();

    // Verify focus on Root
    await expect(rootNode).toHaveCSS('outline-style', 'solid');
  });
});
