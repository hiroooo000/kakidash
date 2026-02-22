import { test, expect } from '@playwright/test';

test.describe('Selection Sync during Node Addition', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear storage for clean state
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test('should clear old selection when adding a child node by Tab', async ({ page }) => {
    const rootNode = page.locator('.mindmap-node[data-id="root"]');

    // 1. Initial Selection: Select Root
    await rootNode.click();
    await expect(rootNode).toHaveAttribute('data-selected', 'true');

    // 2. Add Child: Press Tab
    await page.keyboard.press('Tab');

    // 3. Verification:
    // Root should NOT be selected anymore
    await expect(rootNode).not.toHaveAttribute('data-selected', 'true');

    // The new node should be selected
    const newNode = page.locator('.mindmap-node').filter({ hasText: 'New topic' });
    await expect(newNode).toHaveAttribute('data-selected', 'true');
    await expect(newNode).toHaveCount(1);
  });

  test('should clear old selection when adding a sibling node by Enter', async ({ page }) => {
    // Select root
    const root = page.locator('.mindmap-node[data-id="root"]');
    await root.click();

    // 1. Add first child (and automatically start editing)
    await page.keyboard.press('Tab');

    // 2. Finish editing the first child by pressing Enter once
    await page.keyboard.press('Enter');

    // Get the ID of the child 1
    const child1Id = await page
      .locator('.mindmap-node[data-selected="true"]')
      .getAttribute('data-id');
    expect(child1Id).toBeTruthy();
    const child1 = page.locator(`.mindmap-node[data-id="${child1Id}"]`);
    await expect(child1).toHaveAttribute('data-selected', 'true');

    // 3. Add sibling to child 1 by pressing Enter again
    await page.keyboard.press('Enter');

    // Verification:
    // Only ONE node should be selected in the entire mindmap
    const selectedNodes = page.locator('.mindmap-node[data-selected="true"]');
    await expect(selectedNodes).toHaveCount(1);

    // That one selected node should NOT be child1
    await expect(child1).not.toHaveAttribute('data-selected', 'true');

    // Get the ID of the newly added sibling
    const child2Id = await selectedNodes.getAttribute('data-id');
    expect(child2Id).toBeTruthy();
    expect(child2Id).not.toBe(child1Id);

    const child2 = page.locator(`.mindmap-node[data-id="${child2Id}"]`);
    await expect(child2).toHaveText('New topic');

    // Verify count increased (Root=1, Sample=4, Child1=1, Child2=1 -> total 7)
    await expect(page.locator('.mindmap-node')).toHaveCount(7);
  });
});
