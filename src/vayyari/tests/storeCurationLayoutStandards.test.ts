import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sharedTokens } from '../theme/tokens';
import { layout as designLayoutTokens } from '../theme/designTokens';
import { commonLayoutStyles, resolveLayoutTokens, getResponsiveLayoutStyles } from '../theme/layout';

describe('Store Curation & App Standard Responsive Layout Hardening', () => {
  it('enforces app standard responsive layout design tokens across form factors', () => {
    // Mobile tokens (Narrow edge-to-edge app standard)
    assert.deepEqual(sharedTokens.layout.containerMaxWidth, {
      mobile: '100%',
      tablet: 768,
      desktop: 1240,
    });
    assert.deepEqual(sharedTokens.layout.pagePaddingHorizontal, {
      mobile: 12,
      tablet: 20,
      desktop: 28,
    });
    assert.deepEqual(sharedTokens.layout.pagePaddingVertical, {
      mobile: 12,
      tablet: 16,
      desktop: 24,
    });
    assert.deepEqual(sharedTokens.layout.cardPadding, {
      mobile: 12,
      tablet: 16,
      desktop: 20,
    });
    assert.deepEqual(sharedTokens.layout.gridGutter, {
      mobile: 8,
      tablet: 12,
      desktop: 16,
    });
    assert.deepEqual(sharedTokens.layout.modalMaxWidth, {
      mobile: '100%',
      tablet: 640,
      desktop: 720,
    });
  });

  it('mirrors responsive layout tokens in designTokens export', () => {
    assert.equal(designLayoutTokens.containerMaxWidth.mobile, '100%');
    assert.equal(designLayoutTokens.containerMaxWidth.tablet, 768);
    assert.equal(designLayoutTokens.containerMaxWidth.desktop, 1240);

    assert.equal(designLayoutTokens.pagePaddingHorizontal.mobile, 12);
    assert.equal(designLayoutTokens.pagePaddingHorizontal.tablet, 20);
    assert.equal(designLayoutTokens.pagePaddingHorizontal.desktop, 28);

    assert.equal(designLayoutTokens.modalMaxWidth.mobile, '100%');
    assert.equal(designLayoutTokens.modalMaxWidth.tablet, 640);
    assert.equal(designLayoutTokens.modalMaxWidth.desktop, 720);
  });

  it('resolves responsive tokens accurately per form factor', () => {
    const mobileResolved = resolveLayoutTokens('mobile');
    assert.equal(mobileResolved.containerMaxWidth, '100%');
    assert.equal(mobileResolved.pagePaddingHorizontal, 12);
    assert.equal(mobileResolved.cardPadding, 12);
    assert.equal(mobileResolved.modalMaxWidth, '100%');

    const tabletResolved = resolveLayoutTokens('tablet');
    assert.equal(tabletResolved.containerMaxWidth, 768);
    assert.equal(tabletResolved.pagePaddingHorizontal, 20);
    assert.equal(tabletResolved.cardPadding, 16);
    assert.equal(tabletResolved.modalMaxWidth, 640);

    const desktopResolved = resolveLayoutTokens('desktop');
    assert.equal(desktopResolved.containerMaxWidth, 1240);
    assert.equal(desktopResolved.pagePaddingHorizontal, 28);
    assert.equal(desktopResolved.cardPadding, 20);
    assert.equal(desktopResolved.modalMaxWidth, 720);
  });

  it('commonLayoutStyles provides hardened CSS rules aligned with mobile defaults', () => {
    assert.equal(commonLayoutStyles.pageRoot.maxWidth, '100%');
    assert.equal(commonLayoutStyles.pageRoot.alignSelf, 'center');
    assert.equal(commonLayoutStyles.headerBar.paddingHorizontal, 12);
    assert.equal(commonLayoutStyles.scrollContent.paddingHorizontal, 12);
    assert.equal(commonLayoutStyles.modalSheet.maxWidth, '100%');
    assert.equal(commonLayoutStyles.modalSheet.alignSelf, 'center');
  });

  it('getResponsiveLayoutStyles scales styles correctly for tablet and desktop', () => {
    const tabletStyles = getResponsiveLayoutStyles('tablet');
    assert.equal(tabletStyles.pageRoot.maxWidth, 768);
    assert.equal(tabletStyles.headerBar.paddingHorizontal, 20);
    assert.equal(tabletStyles.scrollContent.paddingHorizontal, 20);
    assert.equal(tabletStyles.modalSheet.maxWidth, 640);

    const desktopStyles = getResponsiveLayoutStyles('desktop');
    assert.equal(desktopStyles.pageRoot.maxWidth, 1240);
    assert.equal(desktopStyles.headerBar.paddingHorizontal, 28);
    assert.equal(desktopStyles.scrollContent.paddingHorizontal, 28);
    assert.equal(desktopStyles.modalSheet.maxWidth, 720);
  });

  it('verifies store curation page layout contract prevents empty gutters on phone viewports', () => {
    // Standard phone screen widths in modern market (e.g., Pixel 7/8/9: 412px, iPhone 14/15/16 Pro Max: 430px)
    const phoneWidths = [360, 390, 412, 430];
    const mobileTokens = resolveLayoutTokens('mobile');

    for (const width of phoneWidths) {
      // Container width must evaluate to '100%' so the workbench expands to screen bounds
      assert.equal(
        mobileTokens.containerMaxWidth,
        '100%',
        `Phone width ${width}px must use fluid 100% container instead of fixed pixel clamp`
      );

      // Inner gutter margin is always exact standard 12px
      const availableInnerWidth = width - (mobileTokens.pagePaddingHorizontal * 2);
      assert.equal(
        availableInnerWidth,
        width - 24,
        `Usable content area must have exactly 12px padding on each side (total 24px gutter)`
      );
    }
  });

  it('verifies modal sheets adapt responsively from full-width mobile to clamped dialog on wide screens', () => {
    const mobileModal = resolveLayoutTokens('mobile');
    const tabletModal = resolveLayoutTokens('tablet');
    const desktopModal = resolveLayoutTokens('desktop');

    // On mobile: bottom sheet is edge-to-edge (100%)
    assert.equal(mobileModal.modalMaxWidth, '100%');

    // On tablet & desktop: dialog/sheet clamps to prevent overly stretched modals
    assert.equal(typeof tabletModal.modalMaxWidth, 'number');
    assert.equal(tabletModal.modalMaxWidth, 640);

    assert.equal(typeof desktopModal.modalMaxWidth, 'number');
    assert.equal(desktopModal.modalMaxWidth, 720);
  });
});
