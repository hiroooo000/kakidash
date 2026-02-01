
import { test, expect } from '@playwright/test';

test.describe('Layout Regression', () => {
    test.beforeEach(async ({ page }) => {
        // Ensure clean state from persistence, but keep index.html structure
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
    });

    test('should maintain layout stability on consecutive adds and text wrapping', async ({ page }) => {
        // 1. Initial State
        await expect(page).toHaveScreenshot('00-initial-state.png');

        // Select Root
        const rootNode = page.locator('.mindmap-node[data-id="root"]');
        await rootNode.click();

        // 2. Add 10 Nodes
        for (let i = 1; i <= 10; i++) {
            const newNodeText = `NewNode${i}`;

            if (i === 1) {
                // First node: Add Child to Root
                await page.keyboard.press('Tab');
            } else {
                // Subsequent: Add Sibling to previous NewNode
                await page.keyboard.press('Enter');
            }

            // The new node should be the last one added to the DOM.
            const newNode = page.locator('.mindmap-node').last();
            // Wait for usage
            await expect(newNode).toBeVisible();
            await newNode.scrollIntoViewIfNeeded();

            // Node creation triggers auto-edit, so the textarea should appear automatically.
            const editor = page.locator('textarea');
            await expect(editor).toBeVisible();

            await editor.fill(newNodeText);
            await page.keyboard.press('Enter');

            await expect(editor).not.toBeVisible();

            // Ensure text is set
            await expect(newNode).toHaveText(newNodeText);

            // Snapshot
            await expect(page).toHaveScreenshot(`01-step-${String(i).padStart(2, '0')}-${newNodeText}.png`);
        }

        // 3. Update NewNode3 with multiline
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

        // Verify update (Use new text to find it, as old locator 'NewNode3' is invalid now)
        const updatedNode3 = page.locator('.mindmap-node').filter({ hasText: 'Tyger Tyger' }).first();
        await expect(updatedNode3).toBeVisible();
        await expect(updatedNode3).toHaveText(multilineText);

        // Snapshot
        await expect(page).toHaveScreenshot('02-multiline-update.png');
    });
});
