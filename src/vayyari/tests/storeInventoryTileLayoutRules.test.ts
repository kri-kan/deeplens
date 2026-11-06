import { describe, it } from 'node:test';
import assert from 'node:assert';

export interface StoreInventoryTileLayoutConfig {
  productCode: string;
  price: number;
  rawTitle?: string;
  mediaCount: number;
  swatchesCount: number;
  isReviewPending?: boolean;
}

/**
 * Derives the layout structure and element positioning for an In-Store Inventory card.
 */
export function getStoreInventoryTileLayout(product: StoreInventoryTileLayoutConfig) {
  const isVideoOrFileTitle = (title?: string) => {
    if (!title) return true;
    const lower = title.toLowerCase().trim();
    return (
      lower.endsWith('.mp4') ||
      lower.endsWith('.mov') ||
      lower.endsWith('.avi') ||
      lower.endsWith('.mkv') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.webp') ||
      lower === 'new product' ||
      lower === 'untitled'
    );
  };

  return {
    tile: {
      topLeftBadge: {
        position: 'top-left' as const,
        text: product.isReviewPending ? '⚡ Needs Review' : '🟢 In Store',
        color: product.isReviewPending ? '#B45309' : '#ffffff',
      },
      topRightBadges: {
        position: 'top-right' as const,
        direction: 'vertical' as const,
        items: [
          { type: 'media_count', label: `📸 ${product.mediaCount}` },
          {
            type: 'sku_count',
            label: `${product.swatchesCount} ${product.swatchesCount === 1 ? 'SKU' : 'SKUs'}`,
          },
        ],
      },
      bottomOverlay: null, // Bottom overlay removed to keep product image clean
    },
    cardBody: {
      productCode: product.productCode,
      formattedPrice: `₹${product.price.toLocaleString('en-IN')}`,
      // Title is suppressed from card body to avoid confusing raw .mp4 / filenames
      showTitle: false,
      title: isVideoOrFileTitle(product.rawTitle) ? null : product.rawTitle,
      // Duplicate SKU count and stray green dot removed from below tile
      showDuplicateSkuCount: false,
      showStrayGreenDot: false,
      actionButton: {
        type: 'curate',
        label: product.isReviewPending ? 'Curate' : 'Curate in Store ➔',
      },
    },
  };
}

describe('In-Store Inventory Tile Layout Rules', () => {
  it('places In-Store badge at top-left of tile', () => {
    const layout = getStoreInventoryTileLayout({
      productCode: 'VF2B58',
      price: 8000,
      rawTitle: '85739281.mp4',
      mediaCount: 4,
      swatchesCount: 2,
    });

    assert.strictEqual(layout.tile.topLeftBadge.position, 'top-left');
    assert.strictEqual(layout.tile.topLeftBadge.text, '🟢 In Store');
  });

  it('places Needs Review badge at top-left when product review is pending', () => {
    const layout = getStoreInventoryTileLayout({
      productCode: 'VF2B58',
      price: 8000,
      rawTitle: '85739281.mp4',
      mediaCount: 4,
      swatchesCount: 2,
      isReviewPending: true,
    });

    assert.strictEqual(layout.tile.topLeftBadge.position, 'top-left');
    assert.strictEqual(layout.tile.topLeftBadge.text, '⚡ Needs Review');
  });

  it('stacks SKU count directly below media count in the tile top-right corner', () => {
    const layout = getStoreInventoryTileLayout({
      productCode: 'VF2B58',
      price: 8000,
      rawTitle: '85739281.mp4',
      mediaCount: 5,
      swatchesCount: 3,
    });

    assert.strictEqual(layout.tile.topRightBadges.position, 'top-right');
    assert.strictEqual(layout.tile.topRightBadges.direction, 'vertical');
    assert.strictEqual(layout.tile.topRightBadges.items.length, 2);
    // 1st item: Media count
    assert.strictEqual(layout.tile.topRightBadges.items[0].type, 'media_count');
    assert.strictEqual(layout.tile.topRightBadges.items[0].label, '📸 5');
    // 2nd item (below it): SKU count
    assert.strictEqual(layout.tile.topRightBadges.items[1].type, 'sku_count');
    assert.strictEqual(layout.tile.topRightBadges.items[1].label, '3 SKUs');
  });

  it('has singular SKU label when swatchesCount is 1 in top-right badge', () => {
    const layout = getStoreInventoryTileLayout({
      productCode: 'VF2B99',
      price: 4500,
      rawTitle: 'sample.mp4',
      mediaCount: 1,
      swatchesCount: 1,
    });

    assert.strictEqual(layout.tile.topRightBadges.items[1].label, '1 SKU');
  });

  it('leaves bottom of tile image clean without overlay', () => {
    const layout = getStoreInventoryTileLayout({
      productCode: 'VF2B58',
      price: 8000,
      rawTitle: '85739281.mp4',
      mediaCount: 4,
      swatchesCount: 2,
    });

    assert.strictEqual(layout.tile.bottomOverlay, null);
  });

  it('suppresses raw .mp4 and video filenames from below the tile', () => {
    const layout = getStoreInventoryTileLayout({
      productCode: 'VF2B58',
      price: 12500,
      rawTitle: '09817264.mp4',
      mediaCount: 3,
      swatchesCount: 1,
    });

    assert.strictEqual(layout.cardBody.showTitle, false);
    assert.strictEqual(layout.cardBody.productCode, 'VF2B58');
    assert.strictEqual(layout.cardBody.formattedPrice, '₹12,500');
  });

  it('suppresses duplicate SKU countdown and stray green dot from below the tile', () => {
    const layout = getStoreInventoryTileLayout({
      productCode: 'VF2B58',
      price: 8000,
      rawTitle: 'clip_77.mp4',
      mediaCount: 2,
      swatchesCount: 1,
    });

    assert.strictEqual(layout.cardBody.showDuplicateSkuCount, false);
    assert.strictEqual(layout.cardBody.showStrayGreenDot, false);
  });
});
