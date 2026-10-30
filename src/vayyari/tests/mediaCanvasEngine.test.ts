import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_RECIPE,
  getLensProofPreset,
  calculateCropBounds,
  calculateTargetCanvasDimensions,
  calculateShearFactors,
  computeCoverCrop,
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

  test('cumulative 90-degree step rotations correctly cycle and normalize 0 to 360 degrees', () => {
    let rotate = 0;
    const rotateStep = (delta: number) => {
      rotate = (rotate + delta + 360) % 360;
    };

    rotateStep(90);
    assert.strictEqual(rotate, 90);

    rotateStep(90);
    assert.strictEqual(rotate, 180);

    rotateStep(90);
    assert.strictEqual(rotate, 270);

    rotateStep(90);
    assert.strictEqual(rotate, 0); // Wraps back to 0

    rotateStep(-90);
    assert.strictEqual(rotate, 270); // Handles negative delta safely
  });

  test('applying 1-tap lens-proof preset overwrites customized recipe with canonical parameters', () => {
    // Start with dirty, user-customized recipe
    let currentRecipe: TransformRecipe = {
      rotateDegrees: 180,
      flipH: false,
      flipV: true,
      tiltAngleX: -5.0,
      tiltAngleY: 4.0,
      crop: { x: 0.1, y: 0.1, width: 0.5, height: 0.5, aspectRatio: '1:1' },
      watermark: { enabled: false, text: '', preset: 'corner-bottom-right', opacity: 0.65 },
    };

    // Apply canonical lens-proof preset
    currentRecipe = getLensProofPreset('VAYYARI');

    assert.strictEqual(currentRecipe.flipH, true);
    assert.strictEqual(currentRecipe.flipV, false);
    assert.strictEqual(currentRecipe.tiltAngleX, 3.5);
    assert.strictEqual(currentRecipe.tiltAngleY, -2.0);
    assert.strictEqual(currentRecipe.crop?.aspectRatio, '4:5');
    assert.strictEqual(currentRecipe.watermark?.enabled, true);
    assert.strictEqual(currentRecipe.watermark?.text, 'VAYYARI');
  });

  test('reset recipe restores DEFAULT_RECIPE pristine state', () => {
    let currentRecipe: TransformRecipe = getLensProofPreset('VAYYARI');
    assert.strictEqual(currentRecipe.watermark?.enabled, true);

    // Reset
    currentRecipe = { ...DEFAULT_RECIPE };
    assert.strictEqual(currentRecipe.rotateDegrees, 0);
    assert.strictEqual(currentRecipe.flipH, false);
    assert.strictEqual(currentRecipe.flipV, false);
    assert.strictEqual(currentRecipe.tiltAngleX, 0);
    assert.strictEqual(currentRecipe.tiltAngleY, 0);
    assert.strictEqual(currentRecipe.watermark?.enabled, false);
  });

  test('computeCoverCrop zooms to fit 1:1 square from 4:5 portrait photo and sacrifices extra height', () => {
    // 800w x 1000h (4:5 ratio). Target 1:1 square.
    // 1:1 requires 800x800. 200px of extra height overflows and is sacrificed.
    const crop = computeCoverCrop(800, 1000, '1:1', { x: 0, y: 0 }, 1.0);

    assert.strictEqual(crop.aspectRatio, '1:1');
    assert.strictEqual(crop.width, 1.0); // 800/800 = 100% width
    assert.strictEqual(crop.height, 0.8); // 800/1000 = 80% height (20% sacrificed)
    assert.strictEqual(crop.x, 0);
    assert.strictEqual(crop.y, 0.1); // Centered: (1 - 0.8) / 2 = 0.10
  });

  test('computeCoverCrop allows vertical repositioning within sacrificed height without blank borders', () => {
    // Top Focus (y pan = -1): crop window aligns to very top (showing blouse/face)
    const topCrop = computeCoverCrop(800, 1000, '1:1', { x: 0, y: -1 }, 1.0);
    assert.strictEqual(topCrop.y, 0);
    assert.strictEqual(topCrop.height, 0.8);

    // Bottom Focus (y pan = 1): crop window aligns to bottom (showing pleats/hem)
    const bottomCrop = computeCoverCrop(800, 1000, '1:1', { x: 0, y: 1 }, 1.0);
    assert.strictEqual(bottomCrop.y, 0.2); // y from 0.2 to 1.0
    assert.strictEqual(bottomCrop.height, 0.8);

    // Over-panning clamped safely (no blank/dark areas)
    const overCrop = computeCoverCrop(800, 1000, '1:1', { x: 0, y: 5 }, 1.0);
    assert.strictEqual(overCrop.y, 0.2);
  });

  test('computeCoverCrop zooms to fit 4:5 portrait from landscape photo and sacrifices extra width', () => {
    // 1200w x 800h (3:2 ratio). Target 4:5 portrait (target ratio = 0.8).
    // Target width = 800 * 0.8 = 640px. 560px of extra width overflows and is sacrificed.
    const crop = computeCoverCrop(1200, 800, '4:5', { x: 0, y: 0 }, 1.0);

    assert.strictEqual(crop.aspectRatio, '4:5');
    assert.strictEqual(crop.height, 1.0); // Uses 100% of height
    assert.strictEqual(Math.round(crop.width * 1000), Math.round((640 / 1200) * 1000));
    assert.strictEqual(crop.y, 0);
    assert.strictEqual(Math.round(crop.x * 1000), Math.round(((1200 - 640) / 2 / 1200) * 1000)); // Centered
  });

  test('computeCoverCrop allows horizontal repositioning (left/right focus) without blank space', () => {
    // Left Focus (x pan = -1)
    const leftCrop = computeCoverCrop(1200, 800, '4:5', { x: -1, y: 0 }, 1.0);
    assert.strictEqual(leftCrop.x, 0);

    // Right Focus (x pan = 1)
    const rightCrop = computeCoverCrop(1200, 800, '4:5', { x: 1, y: 0 }, 1.0);
    assert.strictEqual(Math.round(rightCrop.x * 1000), Math.round(((1200 - 640) / 1200) * 1000));
  });

  test('computeCoverCrop with zoom scale > 1.0 reduces window allowing 2D repositioning', () => {
    // 800x800 square with 2.0x zoom -> crop window becomes 400x400
    const zoomedCenter = computeCoverCrop(800, 800, '1:1', { x: 0, y: 0 }, 2.0);
    assert.strictEqual(zoomedCenter.width, 0.5);
    assert.strictEqual(zoomedCenter.height, 0.5);
    assert.strictEqual(zoomedCenter.x, 0.25);
    assert.strictEqual(zoomedCenter.y, 0.25);

    // Pan to top-left corner
    const zoomedTopLeft = computeCoverCrop(800, 800, '1:1', { x: -1, y: -1 }, 2.0);
    assert.strictEqual(zoomedTopLeft.x, 0);
    assert.strictEqual(zoomedTopLeft.y, 0);
  });
});
