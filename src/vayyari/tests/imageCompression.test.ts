import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateTargetDimensions,
  buildWebPFileName,
  compressImageToWebP,
} from '../utils/image-compression';

describe('Image WebP Compression & Pre-Upload Optimization Rules', () => {
  it('buildWebPFileName transforms various filenames into clean .webp extensions', () => {
    assert.strictEqual(buildWebPFileName('photo.jpg'), 'photo.webp');
    assert.strictEqual(buildWebPFileName('saree_detail.PNG'), 'saree_detail.webp');
    assert.strictEqual(buildWebPFileName('/path/to/my_image.jpeg'), 'my_image.webp');
    assert.strictEqual(buildWebPFileName('already_webp.webp'), 'already_webp.webp');
  });

  it('calculateTargetDimensions scales down oversized images while maintaining aspect ratio', () => {
    // 4000x3000 landscape scaled to max 1920
    const dimsLandscape = calculateTargetDimensions(4000, 3000, 1920, 1920);
    assert.deepStrictEqual(dimsLandscape, { width: 1920, height: 1440 });

    // 3000x4000 portrait scaled to max 1920
    const dimsPortrait = calculateTargetDimensions(3000, 4000, 1920, 1920);
    assert.deepStrictEqual(dimsPortrait, { width: 1440, height: 1920 });

    // 1200x800 already smaller than max dimensions should not be resized
    const dimsSmall = calculateTargetDimensions(1200, 800, 1920, 1920);
    assert.strictEqual(dimsSmall, null);

    // Missing dimensions defaults to width constraint
    const dimsUnknown = calculateTargetDimensions(undefined, undefined, 1920, 1920);
    assert.deepStrictEqual(dimsUnknown, { width: 1920 });
  });

  it('compressImageToWebP returns fallback result gracefully when native module is absent', async () => {
    const result = await compressImageToWebP('file:///data/cache/test_item.jpg', 'test_item.jpg', {
      originalWidth: 4000,
      originalHeight: 3000,
    });

    assert.strictEqual(typeof result.uri, 'string');
    assert.strictEqual(typeof result.fileName, 'string');
    assert.ok(result.fileName.includes('test_item'));
    assert.strictEqual(result.width, 4000);
    assert.strictEqual(result.height, 3000);
  });
});
