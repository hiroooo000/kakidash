import { test, expect } from '@playwright/test';

test.describe('Layout Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state from persistence, but keep index.html structure
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test('should maintain layout stability on consecutive adds and text wrapping', async ({
    page,
  }) => {
    // 1. Initial State
    await test.step('Phase 1: Initial State & Add 10 Nodes', async () => {
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

        // Snapshot
        await expect(page).toHaveScreenshot(
          `01-step-${String(i).padStart(2, '0')}-${newNodeText}.png`,
        );
      }
    });

    // 3. Phase 2: Update NewNode3 with multiline
    await test.step('Phase 2: Multiline Text Update', async () => {
      const node3 = page.locator('.mindmap-node').filter({ hasText: 'NewNode3' }).first();
      await node3.click();
      await node3.dblclick();

      const editor = page.locator('textarea');
      await expect(editor).toBeVisible();

      const multilineText = `Tyger Tyger, burning bright, 
In the forests of the night; 
What immortal hand or eye, 
Could frame thy fearful symmetry?`;

      await editor.fill(multilineText);
      await page.keyboard.press('Enter');
      await expect(editor).not.toBeVisible();

      // Verify update
      const updatedNode3 = page.locator('.mindmap-node').filter({ hasText: 'Tyger Tyger' }).first();
      await expect(updatedNode3).toBeVisible();
      await expect(updatedNode3).toHaveText(multilineText);

      // Snapshot
      await expect(page).toHaveScreenshot('02-multiline-update.png');
    });

    // 4. Phase 3: Child nodes for NewNode4
    await test.step('Phase 3: Deep Nesting & Navigation', async () => {
      const node4 = page.locator('.mindmap-node').filter({ hasText: 'NewNode4' }).first();
      await node4.click();

      // Add 10 Children to NewNode4 (Deep Nesting: Chain of children)
      for (let i = 1; i <= 10; i++) {
        const childText = `NewNode4-${i}`;
        // Always add child to previous node to create deep hierarchy
        await page.keyboard.press('Tab');

        const childEditor = page.locator('textarea');
        await expect(childEditor).toBeVisible();
        await childEditor.fill(childText);
        await page.keyboard.press('Enter');
        await expect(childEditor).not.toBeVisible();

        // Verify the new node exists with the correct text
        const finalNode = page.locator('.mindmap-node').filter({ hasText: childText }).first();
        await expect(finalNode).toBeVisible();
        await finalNode.scrollIntoViewIfNeeded();
      }

      // Snapshot after adding children
      await expect(page).toHaveScreenshot('03-children-added.png');

      // Ensure we start navigation from the last node (NewNode4-10)
      const lastChild = page.locator('.mindmap-node').filter({ hasText: 'NewNode4-10' }).first();
      await lastChild.click();
      await expect(lastChild).toHaveCSS('outline-style', 'solid');

      // Navigation check: Press 'h' (Left/Parent) 7 times to go from 4-10 to 4-3
      for (let k = 0; k < 7; k++) {
        await page.keyboard.press('h');
        await page.waitForTimeout(100);
      }

      // Verify NewNode4-3 is selected
      const node4_3 = page.locator('.mindmap-node').filter({ hasText: 'NewNode4-3' }).first();
      await expect(node4_3).toBeVisible();
      await expect(node4_3).toHaveCSS('outline-style', 'solid');

      // Update NewNode4-3
      await node4_3.dblclick();
      const subEditor = page.locator('textarea');
      await expect(subEditor).toBeVisible();

      const childMultiline = `In what distant deeps or skies. 
Burnt the fire of thine eyes?
On what wings dare he aspire?
What the hand, dare seize the fire?`;

      await subEditor.fill(childMultiline);
      await page.keyboard.press('Enter');
      await expect(subEditor).not.toBeVisible();

      const updatedNode4_3 = page
        .locator('.mindmap-node')
        .filter({ hasText: 'In what distant deeps' })
        .first();
      await expect(updatedNode4_3).toBeVisible();
      await expect(updatedNode4_3).toHaveText(childMultiline);

      // Snapshot
      await expect(page).toHaveScreenshot('04-subnode-multiline.png');

      // Reverse Navigation: 'l' (Right/Child) 7 times to verify layout below
      for (let k = 0; k < 7; k++) {
        await page.keyboard.press('l');
        await page.waitForTimeout(100);
      }

      // Snapshot
      await expect(page).toHaveScreenshot('05-after-navigation.png');
    });

    // 5. Phase 4: Styles & Layout Verification
    await test.step('Phase 4: Styles & Layout Verification', async () => {
      // Current state: Selection is at NewNode4-10 (end of Phase 3)

      // 1. Navigate 'h' (Left/Parent) 6 times to go from 4-10 to 4-4
      for (let k = 0; k < 7; k++) {
        await page.keyboard.press('h');
        await page.waitForTimeout(100);
      }

      // Verify NewNode4-3 is selected (7 steps from 4-10)
      const node4_3_p4 = page
        .locator('.mindmap-node')
        .filter({ hasText: 'In what distant deeps' })
        .first();
      await expect(node4_3_p4).toBeVisible();
      await expect(node4_3_p4).toHaveCSS('outline-style', 'solid');

      // 2. Apply Styles
      // Font Size Up (Shift + >) x 2
      await page.keyboard.press('Shift+>');
      await page.waitForTimeout(100);
      await page.keyboard.press('Shift+>');
      await page.waitForTimeout(100);

      // Color 4
      await page.keyboard.press('4');
      await page.waitForTimeout(100);

      // Italic
      await page.keyboard.press('Shift+i');
      await page.waitForTimeout(100);

      // Bold
      await page.keyboard.press('Shift+b');
      await page.waitForTimeout(100);

      // Snapshot: Style Changed
      await expect(page).toHaveScreenshot('06-style-changed.png');

      // 3. Navigate 'l' (Right/Child) 6 times to return to 4-10
      for (let k = 0; k < 7; k++) {
        await page.keyboard.press('l');
        await page.waitForTimeout(100);
      }

      // Verify NewNode4-10 is selected (implicit check by navigation success)
      const node4_10 = page.locator('.mindmap-node').filter({ hasText: 'NewNode4-10' }).first();
      await expect(node4_10).toHaveCSS('outline-style', 'solid');

      // Snapshot: After Navigation
      await expect(page).toHaveScreenshot('07-after-style-nav.png');
    });

    // 6. Phase 5: Layout Mode Verification
    await test.step('Phase 5: Layout Mode Verification', async () => {
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
        await page.waitForTimeout(100);
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

      // Explicitly select Parent NewNode4 (Stable starting point)
      const node4 = page
        .locator('.mindmap-node')
        .filter({ hasText: /^NewNode4$/ })
        .first();
      await node4.click({ force: true });
      await expect(node4).toHaveCSS('outline-style', 'solid');

      // Navigate to 4-2 (Child/Left x 2)
      for (let k = 0; k < 2; k++) {
        await page.keyboard.press('h');
        await page.waitForTimeout(100);
      }

      const node4_2_both = page.locator('.mindmap-node').filter({ hasText: 'NewNode4-2' }).first();
      await expect(node4_2_both).toBeVisible();
      await expect(node4_2_both).toHaveCSS('outline-style', 'solid');

      // Navigate to 4-10 (Child/Left x 8)
      for (let k = 0; k < 8; k++) {
        await page.keyboard.press('h');
        await page.waitForTimeout(100);
      }

      const node4_10_both = page
        .locator('.mindmap-node')
        .filter({ hasText: 'NewNode4-10' })
        .first();
      await expect(node4_10_both).toBeVisible();
      await expect(node4_10_both).toHaveCSS('outline-style', 'solid');
    });
  });
});
