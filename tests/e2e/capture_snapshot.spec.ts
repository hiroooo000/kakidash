import { test } from '@playwright/test';
import path from 'path';

test('capture snapshot', async ({ page }) => {
  console.log('Navigating to Home');
  await page.goto('/');

  // Wait for content. Adjust selector based on actual app.
  // Assuming 'svg' or standard body content.
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000); // Wait for any JS rendering

  const outputPath = path.resolve(process.cwd(), 'test-results/kakidash_snapshot.png');
  console.log(`Saving snapshot to ${outputPath}`);

  await page.screenshot({ path: outputPath, fullPage: true });
});
