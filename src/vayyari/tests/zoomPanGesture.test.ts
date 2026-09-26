import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  clamp,
  calculateMaxTranslation,
  clampTranslation,
  calculateDoubleTapTarget,
  isZoomedState,
  getIndicatorType,
  calculateThumbnailScrollOffset,
  MIN_SCALE,
  MAX_SCALE,
  DOUBLE_TAP_SCALE,
} from '../utils/zoomMath';

describe('Zoom and Pan Gesture Handling Rules', () => {
  const containerWidth = 400;
  const containerHeight = 800;

  test('clamp correctly constrains values between min and max', () => {
    assert.strictEqual(clamp(0.5, 1, 5), 1);
    assert.strictEqual(clamp(3, 1, 5), 3);
    assert.strictEqual(clamp(6, 1, 5), 5);
  });

  test('calculateMaxTranslation returns 0 when scale is <= 1', () => {
    assert.strictEqual(calculateMaxTranslation(1.0, containerWidth), 0);
    assert.strictEqual(calculateMaxTranslation(0.8, containerWidth), 0);
  });

  test('calculateMaxTranslation scales translation limits proportionally to zoom factor', () => {
    // At scale 2.0 on 400px width: max translation = (2.0 - 1) * 400 / 2 = 200px
    const maxTx = calculateMaxTranslation(2.0, containerWidth);
    assert.strictEqual(maxTx, 200);

    // At scale 3.0 on 800px height: max translation = (3.0 - 1) * 800 / 2 = 800px
    const maxTy = calculateMaxTranslation(3.0, containerHeight);
    assert.strictEqual(maxTy, 800);
  });

  test('clampTranslation restricts translation strictly within bounded viewport limits', () => {
    const scale = 2.0;
    // max allowable is 200
    assert.strictEqual(clampTranslation(150, scale, containerWidth), 150);
    assert.strictEqual(clampTranslation(250, scale, containerWidth), 200);
    assert.strictEqual(clampTranslation(-350, scale, containerWidth), -200);
  });

  test('calculateDoubleTapTarget zooms from 1x to 2.5x centered around tap coordinates', () => {
    // Tap at center (200, 400)
    const centerTap = calculateDoubleTapTarget(1.0, 200, 400, containerWidth, containerHeight);
    assert.strictEqual(centerTap.scale, DOUBLE_TAP_SCALE);
    assert.strictEqual(centerTap.isZoomed, true);
    assert.strictEqual(centerTap.translateX, 0);
    assert.strictEqual(centerTap.translateY, 0);

    // Tap at top-left quadrant (100, 200)
    const offCenterTap = calculateDoubleTapTarget(1.0, 100, 200, containerWidth, containerHeight);
    assert.strictEqual(offCenterTap.scale, DOUBLE_TAP_SCALE);
    assert.strictEqual(offCenterTap.isZoomed, true);
    // containerWidth/2 - 100 = 100 * (2.5 - 1) = 150
    assert.strictEqual(offCenterTap.translateX, 150);
    // containerHeight/2 - 200 = 200 * (2.5 - 1) = 300
    assert.strictEqual(offCenterTap.translateY, 300);
  });

  test('calculateDoubleTapTarget clamps translation to max viewport bounds on edge taps', () => {
    // Tap at extreme right edge (400, 400)
    const edgeTap = calculateDoubleTapTarget(1.0, 400, 400, containerWidth, containerHeight);
    const maxTx = calculateMaxTranslation(DOUBLE_TAP_SCALE, containerWidth); // 300
    assert.strictEqual(edgeTap.scale, DOUBLE_TAP_SCALE);
    assert.strictEqual(edgeTap.translateX, -maxTx);
  });

  test('calculateDoubleTapTarget toggles back to 1x and resets (0,0) when already zoomed in', () => {
    const reset = calculateDoubleTapTarget(2.5, 100, 200, containerWidth, containerHeight);
    assert.strictEqual(reset.scale, 1.0);
    assert.strictEqual(reset.translateX, 0);
    assert.strictEqual(reset.translateY, 0);
    assert.strictEqual(reset.isZoomed, false);
  });

  test('isZoomedState correctly determines zoom activation threshold for FlatList scroll lock', () => {
    assert.strictEqual(isZoomedState(1.0), false);
    assert.strictEqual(isZoomedState(1.02), false);
    assert.strictEqual(isZoomedState(1.06), true);
    assert.strictEqual(isZoomedState(2.5), true);
  });

  test('getIndicatorType selects dots for <= 8 items and counter pill for > 8 items', () => {
    assert.strictEqual(getIndicatorType(1), 'dots');
    assert.strictEqual(getIndicatorType(5), 'dots');
    assert.strictEqual(getIndicatorType(8), 'dots');
    assert.strictEqual(getIndicatorType(9), 'counter');
    assert.strictEqual(getIndicatorType(14), 'counter');
  });

  test('calculateThumbnailScrollOffset centers active item within thumbnail strip', () => {
    const itemWidth = 56;
    const itemGap = 8;
    const stripWidth = 360;

    // Item 0: center is 28. Offset = max(0, 28 - 180) = 0
    assert.strictEqual(calculateThumbnailScrollOffset(0, itemWidth, itemGap, stripWidth), 0);

    // Item 5: center is 5 * 64 + 28 = 348. Offset = 348 - 180 = 168
    assert.strictEqual(calculateThumbnailScrollOffset(5, itemWidth, itemGap, stripWidth), 168);
  });
});
