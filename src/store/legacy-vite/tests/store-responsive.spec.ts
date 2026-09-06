import { test, expect } from '@playwright/test';

test.describe('Storefront Responsive Visual Regression', () => {
  test('renders storefront home page correctly on configured viewport', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Ensure body and primary catalog container are loaded
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#catalog-section')).toBeVisible();

    // Ensure all images are loaded completely
    await page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        images.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) {
                resolve(true);
              } else {
                img.onload = () => resolve(true);
                img.onerror = () => resolve(true);
              }
            })
        )
      );
    });

    // Brief stabilization pause for layout and font rendering
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Visual comparison against baseline screenshot
    await expect(page).toHaveScreenshot('storefront-home.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });
});
