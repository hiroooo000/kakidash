import { test, expect } from '@playwright/test';
import phase2Data from './fixtures/layout_after_phase2.json' with { type: 'json' };

test.describe('Layout Regression - Phase 3: Deep Nesting & Navigation', () => {
  test.setTimeout(60000);
  test.beforeEach(async ({ page }) => {
    await page.goto('/?nosample=1');
    await page.evaluate(() => localStorage.clear());
    await page.waitForSelector('.mindmap-node');
    // Load Phase 2 end state
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    await page.evaluate((data) => (window as any).kakidash.loadData(data), phase2Data as any);
    await page.waitForTimeout(500);
  });

  test('should handle deep nesting and navigation', async ({ page }) => {
    const node4 = page.locator('.mindmap-node').filter({ hasText: 'NewNode4' }).first();
    await node4.click();

    // Add 10 Children to NewNode4 (Deep Nesting: Chain of children)
    for (let i = 1; i <= 10; i++) {
      const childText = `NewNode4-${i}`;
      await page.keyboard.press('Tab');

      const childEditor = page.locator('textarea');
      await expect(childEditor).toBeVisible();
      await childEditor.fill(childText);
      await page.keyboard.press('Enter');
      await expect(childEditor).not.toBeVisible();

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
    }

    // Verify NewNode4-3 is selected
    const node4_3 = page.locator('.mindmap-node').filter({ hasText: 'NewNode4-3' }).first();
    await expect(node4_3).toBeVisible();
    await expect(node4_3).toHaveCSS('outline-style', 'solid');

    // Update NewNode4-3
    await node4_3.dblclick();
    const subEditor = page.locator('textarea');
    await expect(subEditor).toBeVisible();

    const childMultiline = `In what distant deeps or skies. \nBurnt the fire of thine eyes?\nOn what wings dare he aspire?\nWhat the hand, dare seize the fire?`;

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
    }

    // Snapshot
    await expect(page).toHaveScreenshot('05-after-navigation.png');
  });
});
