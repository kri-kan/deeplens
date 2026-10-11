export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  originalWidth?: number;
  originalHeight?: number;
}

export interface CompressedImageResult {
  uri: string;
  mimeType: string;
  fileName: string;
  width?: number;
  height?: number;
  isCompressed: boolean;
}

/**
 * Calculates optimal target dimensions preserving aspect ratio without upscaling.
 */
export function calculateTargetDimensions(
  srcWidth?: number,
  srcHeight?: number,
  maxWidth = 1920,
  maxHeight = 1920
): { width?: number; height?: number } | null {
  if (!srcWidth || !srcHeight) {
    return { width: maxWidth };
  }

  if (srcWidth <= maxWidth && srcHeight <= maxHeight) {
    return null; // No resizing needed
  }

  const widthRatio = maxWidth / srcWidth;
  const heightRatio = maxHeight / srcHeight;
  const scale = Math.min(widthRatio, heightRatio);

  return {
    width: Math.round(srcWidth * scale),
    height: Math.round(srcHeight * scale),
  };
}

/**
 * Builds a clean .webp filename from source or fallback name.
 */
export function buildWebPFileName(rawNameOrUri?: string, fallbackPrefix = 'order_item'): string {
  const clean = (rawNameOrUri || `${fallbackPrefix}_${Date.now()}`)
    .split('/')
    .pop() || `${fallbackPrefix}_${Date.now()}`;
  const base = clean.replace(/\.[^/.]+$/, '');
  return `${base}.webp`;
}

/**
 * Compresses and converts an image to WebP format before uploading.
 * Resizes large dimensions to fit within maxWidth/maxHeight (preserving aspect ratio)
 * and encodes as WebP with the given quality (0.0 to 1.0).
 * Gracefully falls back to the original image URI if the compression engine is unavailable.
 */
export async function compressImageToWebP(
  uri: string,
  preferredFileName?: string,
  options: CompressImageOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    originalWidth,
    originalHeight,
  } = options;

  const webpFileName = buildWebPFileName(preferredFileName || uri);

  // Check if native module is actually compiled into the current binary before importing
  let hasNativeManipulator = false;
  try {
    const { requireOptionalNativeModule } = require('expo-modules-core');
    hasNativeManipulator = typeof requireOptionalNativeModule === 'function'
      ? Boolean(requireOptionalNativeModule('ExpoImageManipulator'))
      : false;
  } catch {
    hasNativeManipulator = false;
  }

  if (hasNativeManipulator) {
    try {
      const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');

      const actions: any[] = [];
      const targetDims = calculateTargetDimensions(originalWidth, originalHeight, maxWidth, maxHeight);
      if (targetDims) {
        actions.push({ resize: targetDims });
      }

      const manipulated = await manipulateAsync(
        uri,
        actions,
        {
          compress: quality,
          format: SaveFormat.WEBP,
        }
      );

      return {
        uri: manipulated.uri,
        mimeType: 'image/webp',
        fileName: webpFileName,
        width: manipulated.width,
        height: manipulated.height,
        isCompressed: true,
      };
    } catch (err) {
      console.warn('[compressImageToWebP] Manipulation failed, falling back:', err);
    }
  }

  // Graceful fallback to original image when native manipulator module is absent from binary
  const ext = (preferredFileName || uri).split('.').pop()?.toLowerCase();
    const fallbackMime = ext === 'png' ? 'image/png' : 'image/jpeg';
    const rawBaseName = (preferredFileName || uri.split('/').pop() || `image_${Date.now()}`).replace(/\.[^/.]+$/, '');
    const fallbackFileName = preferredFileName || `${rawBaseName}.${ext || 'jpg'}`;

  return {
    uri,
    mimeType: fallbackMime,
    fileName: fallbackFileName,
    width: originalWidth,
    height: originalHeight,
    isCompressed: false,
  };
}
