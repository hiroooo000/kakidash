import { test, expect } from '@playwright/test';
import phase1Data from './fixtures/layout_after_phase1.json' with { type: 'json' };

test.describe('Layout Regression - Phase 2: Multiline Text Update', () => {
  test.setTimeout(60000);
  test.beforeEach(async ({ page }) => {
    await page.goto('/?nosample=1');
    await page.evaluate(() => localStorage.clear());
    await page.waitForSelector('.mindmap-node');
    // Load Phase 1 end state
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    await page.evaluate((data) => (window as any).kakidash.loadData(data), phase1Data as any);
    // Wait for render to settle
    await page.waitForTimeout(500);
  });

  test('should update node with multiline text', async ({ page }) => {
    const node3 = page.locator('.mindmap-node').filter({ hasText: 'NewNode3' }).first();
    await node3.click();
    await node3.dblclick();

    const editor = page.locator('textarea');
    await expect(editor).toBeVisible();

    const multilineText = `Tyger Tyger, burning bright, \nIn the forests of the night; \nWhat immortal hand or eye, \nCould frame thy fearful symmetry?`;

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
});
