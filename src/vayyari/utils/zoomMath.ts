/**
 * Mathematical utilities and rules for ZoomableImage and Fullscreen Carousel
 * supporting React Native Gesture Handler + Reanimated 4.
 */

export const MIN_SCALE = 1.0;
export const MAX_SCALE = 5.0;
export const DOUBLE_TAP_SCALE = 2.5;
export const ZOOM_ACTIVE_THRESHOLD = 1.05;
export const ADAPTIVE_DOTS_MAX = 8;

export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculates maximum translation allowable for a given scale and viewport dimension
 * to prevent the image edges from pulling inward past the viewport bounds.
 */
export function calculateMaxTranslation(scale: number, dimension: number): number {
  'worklet';
  if (scale <= 1) return 0;
  return ((scale - 1) * dimension) / 2;
}

/**
 * Clamps translation along an axis within bounds.
 */
export function clampTranslation(translation: number, scale: number, dimension: number): number {
  'worklet';
  const max = calculateMaxTranslation(scale, dimension);
  return clamp(translation, -max, max);
}

export interface ZoomTransformTarget {
  scale: number;
  translateX: number;
  translateY: number;
  isZoomed: boolean;
}

/**
 * Calculates target scale and translation on double-tap.
 * If already zoomed in (>1.2x), resets to 1x and (0,0).
 * If at 1x, zooms to targetScale focused on tap position (tapX, tapY).
 */
export function calculateDoubleTapTarget(
  currentScale: number,
  tapX: number,
  tapY: number,
  containerWidth: number,
  containerHeight: number,
  targetScale?: number
): ZoomTransformTarget {
  'worklet';
  const effectiveTargetScale = targetScale ?? DOUBLE_TAP_SCALE;
  if (currentScale > 1.2) {
    return {
      scale: 1,
      translateX: 0,
      translateY: 0,
      isZoomed: false,
    };
  }

  const maxTx = calculateMaxTranslation(effectiveTargetScale, containerWidth);
  const maxTy = calculateMaxTranslation(effectiveTargetScale, containerHeight);

  // Offset from viewport center magnified by scale factor (fallback if tap coordinates are undefined)
  const resolvedTapX = typeof tapX === 'number' && !isNaN(tapX) ? tapX : containerWidth / 2;
  const resolvedTapY = typeof tapY === 'number' && !isNaN(tapY) ? tapY : containerHeight / 2;
  const rawTargetX = (containerWidth / 2 - resolvedTapX) * (effectiveTargetScale - 1);
  const rawTargetY = (containerHeight / 2 - resolvedTapY) * (effectiveTargetScale - 1);

  return {
    scale: effectiveTargetScale,
    translateX: clamp(rawTargetX, -maxTx, maxTx),
    translateY: clamp(rawTargetY, -maxTy, maxTy),
    isZoomed: true,
  };
}

/**
 * Determines whether the image is in a zoomed state requiring pan lock
 * on the parent horizontal FlatList.
 */
export function isZoomedState(scale: number, threshold?: number): boolean {
  'worklet';
  const effectiveThreshold = threshold ?? ZOOM_ACTIVE_THRESHOLD;
  return scale > effectiveThreshold;
}

/**
 * Determines indicator format: 'dots' if <= 8 items, else 'counter' pill.
 */
export function getIndicatorType(totalCount: number): 'dots' | 'counter' {
  return totalCount <= ADAPTIVE_DOTS_MAX ? 'dots' : 'counter';
}

/**
 * Computes thumbnail strip horizontal scroll offset so active thumbnail is centered.
 */
export function calculateThumbnailScrollOffset(
  index: number,
  itemWidth: number,
  itemGap: number,
  stripWidth: number
): number {
  if (index < 0 || stripWidth <= 0) return 0;
  const itemCenter = index * (itemWidth + itemGap) + itemWidth / 2;
  return Math.max(0, itemCenter - stripWidth / 2);
}
