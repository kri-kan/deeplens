import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_RECIPE,
  getLensProofPreset,
  calculateCropBounds,
  calculateTargetCanvasDimensions,
  calculateShearFactors,
  TransformRecipe,
} from '../utils/MediaCanvasEngine';

describe('MediaCanvasEngine Client-Side Image Transformation Rules', () => {
  test('DEFAULT_RECIPE has pristine initial state with watermark and flips disabled', () => {
    assert.strictEqual(DEFAULT_RECIPE.rotateDegrees, 0);
    assert.strictEqual(DEFAULT_RECIPE.flipH, false);
    assert.strictEqual(DEFAULT_RECIPE.flipV, false);
    assert.strictEqual(DEFAULT_RECIPE.tiltAngleX, 0);
    assert.strictEqual(DEFAULT_RECIPE.tiltAngleY, 0);
    assert.strictEqual(DEFAULT_RECIPE.crop?.x, 0);
    assert.strictEqual(DEFAULT_RECIPE.crop?.y, 0);
    assert.strictEqual(DEFAULT_RECIPE.crop?.width, 1);
    assert.strictEqual(DEFAULT_RECIPE.crop?.height, 1);
    assert.strictEqual(DEFAULT_RECIPE.watermark?.enabled, false);
  });

  test('getLensProofPreset creates anti-lens transforms with flipH, tilt shear, and brand watermark', () => {
    const preset = getLensProofPreset('VAYYARI');

    // Anti-Google Lens formula assertions:
    // 1. Horizontal flip breaks asymmetrical zari borders
    assert.strictEqual(preset.flipH, true);
    assert.strictEqual(preset.flipV, false);

    // 2. Perspective shear creates non-affine keypoint displacement
    assert.strictEqual(preset.tiltAngleX, 3.5);
    assert.strictEqual(preset.tiltAngleY, -2.0);

    // 3. Subtle 3% edge crop strips supplier watermarks/borders
    assert.strictEqual(preset.crop?.x, 0.03);
    assert.strictEqual(preset.crop?.y, 0.03);
    assert.strictEqual(preset.crop?.width, 0.94);
    assert.strictEqual(preset.crop?.height, 0.94);
    assert.strictEqual(preset.crop?.aspectRatio, '4:5');

    // 4. Brand watermark overlay active
    assert.strictEqual(preset.watermark?.enabled, true);
    assert.strictEqual(preset.watermark?.text, 'VAYYARI');
    assert.strictEqual(preset.watermark?.preset, 'corner-bottom-right');
  });

  test('calculateCropBounds correctly maps normalized ratios to source pixel dimensions', () => {
    const origW = 1000;
    const origH = 1500;

    // 10% inset crop
    const bounds = calculateCropBounds(origW, origH, {
      x: 0.1,
      y: 0.1,
      width: 0.8,
      height: 0.8,
    });

    assert.strictEqual(bounds.sx, 100);
    assert.strictEqual(bounds.sy, 150);
    assert.strictEqual(bounds.sw, 800);
    assert.strictEqual(bounds.sh, 1200);
  });

  test('calculateCropBounds clamps out-of-bounds coordinates safely', () => {
    const bounds = calculateCropBounds(1000, 1000, {
      x: -0.2, // negative
      y: 1.5, // beyond height
      width: 2.0, // exceeding width
      height: 0.5,
    });

    assert.strictEqual(bounds.sx, 0); // clamped to 0
    assert.strictEqual(bounds.sy, 1000); // clamped to max
    assert.strictEqual(bounds.sw, 1000); // clamped to remaining
  });

  test('calculateTargetCanvasDimensions swaps width and height on 90° and 270° rotation', () => {
    // Landscape input: 1200 x 800
    const rotated90 = calculateTargetCanvasDimensions(1200, 800, 90);
    assert.strictEqual(rotated90.width, 800);
    assert.strictEqual(rotated90.height, 1200);
    assert.strictEqual(rotated90.isRotated90or270, true);

    const rotated270 = calculateTargetCanvasDimensions(1200, 800, 270);
    assert.strictEqual(rotated270.width, 800);
    assert.strictEqual(rotated270.height, 1200);
    assert.strictEqual(rotated270.isRotated90or270, true);

    // 0° or 180° rotation preserves orientation
    const rotated180 = calculateTargetCanvasDimensions(1200, 800, 180);
    assert.strictEqual(rotated180.width, 1200);
    assert.strictEqual(rotated180.height, 800);
    assert.strictEqual(rotated180.isRotated90or270, false);
  });

  test('calculateTargetCanvasDimensions downscales oversized images to maxDimension ceiling', () => {
    // 4000 x 3000 image, maxDimension 2000
    const dims = calculateTargetCanvasDimensions(4000, 3000, 0, 2000);
    assert.strictEqual(dims.width, 2000);
    assert.strictEqual(dims.height, 1500); // Preserves exact 4:3 aspect ratio
  });

  test('calculateShearFactors clamps angles to +/- 15 degrees to prevent geometric collapse', () => {
    // Normal 3.5 deg
    const normal = calculateShearFactors(3.5, -2.0);
    assert.ok(normal.tanX > 0.05 && normal.tanX < 0.07);
    assert.ok(normal.tanY < 0 && normal.tanY > -0.05);

    // Extreme 45 deg gets clamped to 15 deg
    const extreme = calculateShearFactors(45, -45);
    const expectedTan15 = Math.tan((15 * Math.PI) / 180);
    assert.strictEqual(Math.round(extreme.tanX * 1000), Math.round(expectedTan15 * 1000));
    assert.strictEqual(Math.round(extreme.tanY * 1000), Math.round(-expectedTan15 * 1000));
  });

  test('TransformRecipe serialization and parsing roundtrip preserves all transform fields', () => {
    const originalRecipe: TransformRecipe = {
      rotateDegrees: 90,
      flipH: true,
      flipV: false,
      tiltAngleX: 4.2,
      tiltAngleY: -1.8,
      crop: { x: 0.05, y: 0.05, width: 0.9, height: 0.9, aspectRatio: '1:1' },
      watermark: {
        enabled: true,
        text: 'VAYYARI STORE',
        preset: 'center-emboss',
        opacity: 0.75,
        color: '#D4AF37',
      },
    };

    const json = JSON.stringify(originalRecipe);
    const parsed: TransformRecipe = JSON.parse(json);

    assert.deepStrictEqual(parsed, originalRecipe);
  });
});
