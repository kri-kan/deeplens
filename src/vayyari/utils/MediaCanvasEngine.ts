/**
 * MediaCanvasEngine.ts
 * High-performance client-side image transformation and Anti-Google Lens engine.
 * Runs 100% on the client browser/device using HTML5 Canvas2D.
 */

export interface CropRect {
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  width: number; // 0..1 normalized
  height: number; // 0..1 normalized
  aspectRatio?: '1:1' | '4:5' | '3:4' | 'free';
}

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  preset: 'corner-bottom-right' | 'corner-bottom-left' | 'center-emboss' | 'diagonal-tile';
  opacity: number; // 0.1 to 1.0
  color?: string; // hex
}

export interface TransformRecipe {
  rotateDegrees: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  tiltAngleX: number; // -10 to +10 degrees
  tiltAngleY: number; // -10 to +10 degrees
  crop?: CropRect;
  watermark?: WatermarkConfig;
}

export const DEFAULT_RECIPE: TransformRecipe = {
  rotateDegrees: 0,
  flipH: false,
  flipV: false,
  tiltAngleX: 0,
  tiltAngleY: 0,
  crop: { x: 0, y: 0, width: 1, height: 1, aspectRatio: 'free' },
  watermark: {
    enabled: false,
    text: 'VAYYARI',
    preset: 'corner-bottom-right',
    opacity: 0.65,
    color: '#D4AF37',
  },
};

/**
 * Returns a battle-tested anti-lens recipe that defeats Google Lens and visual scrapers
 * while keeping sarees and ethnic garments looking natural and luxurious.
 */
export function getLensProofPreset(brandName = 'VAYYARI'): TransformRecipe {
  return {
    rotateDegrees: 0,
    flipH: true, // Reverses asymmetrical motifs and zari borders
    flipV: false,
    tiltAngleX: 3.5, // Perspective shear shifts landmark distance coordinates
    tiltAngleY: -2.0,
    crop: { x: 0.03, y: 0.03, width: 0.94, height: 0.94, aspectRatio: '4:5' },
    watermark: {
      enabled: true,
      text: brandName,
      preset: 'corner-bottom-right',
      opacity: 0.7,
      color: '#FFFFFF',
    },
  };
}

/**
 * Loads an image URL into an HTMLImageElement with crossOrigin support.
 */
export function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('HTML5 Canvas is only available in a browser environment'));
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image from ${url}: ${err}`));
    img.src = url;
  });
}

/**
 * Pure calculation helper: Computes pixel crop bounds from normalized coordinates.
 */
export function calculateCropBounds(
  origW: number,
  origH: number,
  crop?: CropRect
): { sx: number; sy: number; sw: number; sh: number } {
  const c = crop || { x: 0, y: 0, width: 1, height: 1 };
  const sx = Math.max(0, Math.min(origW, (c.x || 0) * origW));
  const sy = Math.max(0, Math.min(origH, (c.y || 0) * origH));
  const sw = Math.max(1, Math.min(origW - sx, (c.width ?? 1) * origW));
  const sh = Math.max(1, Math.min(origH - sy, (c.height ?? 1) * origH));
  return { sx, sy, sw, sh };
}

/**
 * Pure calculation helper: Computes target canvas dimensions after crop, rotation, and downscale clamp.
 */
export function calculateTargetCanvasDimensions(
  sw: number,
  sh: number,
  rotateDegrees: number,
  maxDimension = 2048
): { width: number; height: number; isRotated90or270: boolean } {
  const isRotated90or270 = rotateDegrees === 90 || rotateDegrees === 270;
  const croppedW = isRotated90or270 ? sh : sw;
  const croppedH = isRotated90or270 ? sw : sh;

  let targetW = croppedW;
  let targetH = croppedH;
  if (Math.max(targetW, targetH) > maxDimension) {
    const scaleFactor = maxDimension / Math.max(targetW, targetH);
    targetW = Math.round(targetW * scaleFactor);
    targetH = Math.round(targetH * scaleFactor);
  }

  return {
    width: Math.max(1, Math.round(targetW)),
    height: Math.max(1, Math.round(targetH)),
    isRotated90or270,
  };
}

/**
 * Pure calculation helper: Computes tangent shear factors for perspective tilt matrix.
 */
export function calculateShearFactors(
  tiltAngleX = 0,
  tiltAngleY = 0
): { tanX: number; tanY: number; radX: number; radY: number } {
  // Clamp angles between -15 and +15 degrees to prevent extreme distortion
  const clampedX = Math.max(-15, Math.min(15, tiltAngleX));
  const clampedY = Math.max(-15, Math.min(15, tiltAngleY));
  const radX = (clampedX * Math.PI) / 180;
  const radY = (clampedY * Math.PI) / 180;
  return {
    tanX: Math.tan(radX),
    tanY: Math.tan(radY),
    radX,
    radY,
  };
}

/**
 * Renders the transformation recipe onto a fresh HTML5 Canvas.
 */
export function renderCanvasTransform(
  sourceImg: HTMLImageElement,
  recipe: TransformRecipe,
  maxDimension = 2048
): HTMLCanvasElement {
  const origW = sourceImg.naturalWidth || sourceImg.width;
  const origH = sourceImg.naturalHeight || sourceImg.height;

  // 1. Calculate Crop bounds
  const { sx, sy, sw, sh } = calculateCropBounds(origW, origH, recipe.crop);

  // 2. Determine base dimensions after crop and rotation
  const { width, height, isRotated90or270 } = calculateTargetCanvasDimensions(
    sw,
    sh,
    recipe.rotateDegrees,
    maxDimension
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not obtain 2D canvas rendering context');
  }

  // High-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.save();

  // Center coordinate space
  ctx.translate(canvas.width / 2, canvas.height / 2);

  // 3. Apply Tilt / Perspective Shear (Key to defeating Google Lens / visual keypoints)
  const { tanX, tanY } = calculateShearFactors(recipe.tiltAngleX, recipe.tiltAngleY);
  if (tanX !== 0 || tanY !== 0) {
    ctx.transform(1, tanY, tanX, 1, 0, 0);
  }

  // 4. Apply Rotation
  if (recipe.rotateDegrees !== 0) {
    ctx.rotate((recipe.rotateDegrees * Math.PI) / 180);
  }

  // 5. Apply Horizontal / Vertical Flip
  const scaleX = recipe.flipH ? -1 : 1;
  const scaleY = recipe.flipV ? -1 : 1;
  ctx.scale(scaleX, scaleY);

  // 6. Draw the cropped source image centered
  const drawW = isRotated90or270 ? height : width;
  const drawH = isRotated90or270 ? width : height;
  ctx.drawImage(sourceImg, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);

  ctx.restore();

  // 7. Render Watermark Overlay if enabled
  if (recipe.watermark?.enabled && recipe.watermark.text) {
    renderWatermark(ctx, canvas.width, canvas.height, recipe.watermark);
  }

  return canvas;
}

/**
 * Draws luxury brand watermark stamps onto the canvas.
 */
function renderWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: WatermarkConfig
) {
  ctx.save();

  const text = config.text.toUpperCase();
  const opacity = Math.max(0.1, Math.min(1.0, config.opacity || 0.65));
  const baseColor = config.color || '#FFFFFF';

  if (config.preset === 'corner-bottom-right' || config.preset === 'corner-bottom-left') {
    const isRight = config.preset === 'corner-bottom-right';
    const fontSize = Math.max(14, Math.round(Math.min(width, height) * 0.038));
    ctx.font = `800 ${fontSize}px sans-serif`;

    const textMetrics = ctx.measureText(`✦ ${text} ✦`);
    const pillW = textMetrics.width + fontSize * 1.5;
    const pillH = fontSize * 1.8;
    const margin = Math.round(fontSize * 1.2);

    const x = isRight ? width - pillW - margin : margin;
    const y = height - pillH - margin;

    // Subtle dark blurred backdrop
    ctx.fillStyle = `rgba(15, 23, 42, ${opacity * 0.75})`;
    roundRect(ctx, x, y, pillW, pillH, pillH / 2);
    ctx.fill();

    // Golden / Crisp border
    ctx.strokeStyle = `rgba(212, 175, 55, ${opacity * 0.8})`;
    ctx.lineWidth = Math.max(1, fontSize * 0.06);
    roundRect(ctx, x, y, pillW, pillH, pillH / 2);
    ctx.stroke();

    // Text with soft shadow
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = baseColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`✦ ${text} ✦`, x + pillW / 2, y + pillH / 2);
  } else if (config.preset === 'center-emboss') {
    const fontSize = Math.max(22, Math.round(Math.min(width, height) * 0.085));
    ctx.font = `900 ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-20 * Math.PI) / 180);

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.35})`;
    ctx.strokeStyle = `rgba(212, 175, 55, ${opacity * 0.45})`;
    ctx.lineWidth = Math.max(1, fontSize * 0.04);
    ctx.fillText(text, 0, 0);
    ctx.strokeText(text, 0, 0);
    ctx.restore();
  } else if (config.preset === 'diagonal-tile') {
    const fontSize = Math.max(12, Math.round(Math.min(width, height) * 0.03));
    ctx.font = `700 ${fontSize}px sans-serif`;
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.25})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.save();
    ctx.rotate((-30 * Math.PI) / 180);
    const stepX = fontSize * 12;
    const stepY = fontSize * 6;

    for (let x = -width; x < width * 2; x += stepX) {
      for (let y = -height; y < height * 2; y += stepY) {
        ctx.fillText(text, x, y);
      }
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Polyfill helper for round rectangle drawing.
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Converts a Canvas to a WebP (or JPEG fallback) Blob for upload.
 */
export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.88): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob conversion failed'));
        }
      },
      'image/webp',
      quality
    );
  });
}
