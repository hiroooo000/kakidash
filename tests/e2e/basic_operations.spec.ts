import { test, expect } from '@playwright/test';

test.describe('Basic Mindmap Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state by clearing potential local storage persistence
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test('should verify initial state', async ({ page }) => {
    // Root node should exist
    const rootNode = page.locator('.mindmap-node[data-id="root"]');
    await expect(rootNode).toBeVisible();
    await expect(rootNode).toHaveText('Root Topic');
    // index.html adds 4 sample nodes + Root = 5
    await expect(page.locator('.mindmap-node')).toHaveCount(5);
  });

  test('should add a child node using Tab', async ({ page }) => {
    const rootNode = page.locator('.mindmap-node[data-id="root"]');

    // Select root node
    await rootNode.click();

    // Press Tab to add child
    await page.keyboard.press('Tab');

    // Verify a new node appears
    const nodes = page.locator('.mindmap-node');
    // Root(1) + Sample(4) + New(1) = 6 nodes
    await expect(nodes).toHaveCount(6);

    // Verify the new node has default text "New topic"
    const newNodes = page.locator('.mindmap-node').filter({ hasText: 'New topic' });
    await expect(newNodes).toBeVisible();
  });

  test('should edit a node topic', async ({ page }) => {
    // Use one of the existing sample nodes "Child 1"
    const childNode = page.locator('.mindmap-node').filter({ hasText: 'Child 1' }).first();
    await childNode.click();

    // Enter edit mode (Double click)
    await childNode.dblclick();

    // Wait for textarea/input
    const editor = page.locator('textarea');
    await expect(editor).toBeVisible();

    // Type new text
    await editor.fill('Updated Child');
    await page.keyboard.press('Enter');

    // Wait for editor to close
    await expect(editor).not.toBeVisible();

    // Verify text updated by finding the node with new text
    const updatedNode = page.locator('.mindmap-node').filter({ hasText: 'Updated Child' });
    await expect(updatedNode).toBeVisible();
  });

  test('should delete a node', async ({ page }) => {
    // Determine initial count (should be 5)
    await expect(page.locator('.mindmap-node')).toHaveCount(5);

    const childNode = page.locator('.mindmap-node').filter({ hasText: 'Child 2' }).first();
    await childNode.click();

    // Send Delete/Backspace
    await page.keyboard.press('Backspace');

    // Verify count reduces by 1 -> 4
    await expect(page.locator('.mindmap-node')).toHaveCount(4);

    // Verify Child 2 is gone
    await expect(page.locator('.mindmap-node').filter({ hasText: 'Child 2' })).toHaveCount(0);
  });
});
