import { test, expect } from '@playwright/test';

test.describe('Storefront Responsive Visual Regression', () => {
  test('renders storefront home page correctly on configured viewport', async ({ page }) => {
    await page.goto('/');
    
    // Ensure body or primary container is loaded
    await expect(page.locator('body')).toBeVisible();

    // Visual comparison against baseline screenshot
    await expect(page).toHaveScreenshot('storefront-home.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});
