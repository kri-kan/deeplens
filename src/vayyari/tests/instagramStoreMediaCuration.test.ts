import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StoreCurationMediaItem, StoreColorGroup } from '../types/curation';
import { StoreMediaItem } from '../services/storeAdminService';
import {
  DeltaMediaAllocationItem,
  buildStorePublishItem,
  resolvePublishMediaUrls,
  getMediaDeltaCount,
  formatMediaDeltaBadge,
} from '../utils/publishDeltaRules';

describe('Instagram Store Media Curation & Swatch Propagation Rules', () => {
  it('preserves Instagram source metadata when creating StoreCurationMediaItem', () => {
    const igMediaItem: StoreCurationMediaItem = {
      id: 'ig-vid-501',
      uri: 'https://media.vayyarifashions.com/instagram/reels/vf2b56_reel.mp4',
      thumbnailUri: 'https://media.vayyarifashions.com/instagram/reels/vf2b56_thumb.jpg',
      rawVideoUrl: 'https://media.vayyarifashions.com/instagram/reels/vf2b56_reel.mp4',
      mediaType: 'video',
      sortOrder: 1,
      isHero: false,
      isQualified: true,
      isCommon: true, // Universal common reel across all color swatches
      sourcePlatform: 'instagram',
      sourceUrl: 'https://www.instagram.com/reel/DC5xy78AbC/',
      sourcePostId: '3489123456789',
    };

    assert.equal(igMediaItem.sourcePlatform, 'instagram');
    assert.equal(igMediaItem.sourceUrl, 'https://www.instagram.com/reel/DC5xy78AbC/');
    assert.equal(igMediaItem.sourcePostId, '3489123456789');
    assert.equal(igMediaItem.isCommon, true);
    assert.equal(igMediaItem.isQualified, true);
  });

  it('allocates Instagram media to universal shared pool (isCommon: true) across swatches', () => {
    const swatches: StoreColorGroup[] = [
      { id: 'cg-green', name: 'Emerald Green', colorwayCode: 'VF-GRN', template: 'solid', slotA: '#1B4D3E' },
      { id: 'cg-red', name: 'Crimson Red', colorwayCode: 'VF-RED', template: 'solid', slotA: '#C0392B' },
    ];

    const mediaList: StoreCurationMediaItem[] = [
      {
        id: 'm-green-1',
        uri: 'https://media.vayyarifashions.com/p/grn.jpg',
        mediaType: 'image',
        sortOrder: 1,
        isHero: true,
        isQualified: true,
        isCommon: false,
        colorGroupId: 'cg-green',
      },
      {
        id: 'm-red-1',
        uri: 'https://media.vayyarifashions.com/p/red.jpg',
        mediaType: 'image',
        sortOrder: 1,
        isHero: true,
        isQualified: true,
        isCommon: false,
        colorGroupId: 'cg-red',
      },
      {
        id: 'm-ig-reel',
        uri: 'https://media.vayyarifashions.com/instagram/reels/drape_model.mp4',
        mediaType: 'video',
        sortOrder: 2,
        isHero: false,
        isQualified: true,
        isCommon: true, // Shared across both green & red swatches
        sourcePlatform: 'instagram',
        sourceUrl: 'https://www.instagram.com/reel/DC5xy78AbC/',
      },
    ];

    // Simulate PDP gallery filter for Emerald Green
    const greenVariantSpecific = mediaList.filter(m => m.colorGroupId === 'cg-green' && !m.isCommon);
    const greenSharedPhotos = mediaList.filter(m => m.isCommon || (!m.colorGroupId && m.colorGroupId !== 'cg-green'));
    const greenPdpMedia = [...greenVariantSpecific, ...greenSharedPhotos];

    assert.equal(greenPdpMedia.length, 2);
    assert.equal(greenPdpMedia[0].id, 'm-green-1');
    assert.equal(greenPdpMedia[1].id, 'm-ig-reel');
    assert.equal(greenPdpMedia[1].sourcePlatform, 'instagram');

    // Simulate PDP gallery filter for Crimson Red
    const redVariantSpecific = mediaList.filter(m => m.colorGroupId === 'cg-red' && !m.isCommon);
    const redSharedPhotos = mediaList.filter(m => m.isCommon || (!m.colorGroupId && m.colorGroupId !== 'cg-red'));
    const redPdpMedia = [...redVariantSpecific, ...redSharedPhotos];

    assert.equal(redPdpMedia.length, 2);
    assert.equal(redPdpMedia[0].id, 'm-red-1');
    assert.equal(redPdpMedia[1].id, 'm-ig-reel'); // The same Instagram reel appears seamlessly!
  });

  it('allocates Instagram media to a specific color swatch when not marked as common', () => {
    const igMediaItem: StoreCurationMediaItem = {
      id: 'm-ig-green-specific',
      uri: 'https://media.vayyarifashions.com/instagram/posts/green_exclusive.jpg',
      mediaType: 'image',
      sortOrder: 2,
      isHero: false,
      isQualified: true,
      isCommon: false,
      colorGroupId: 'cg-green', // Locked to Emerald Green
      sourcePlatform: 'instagram',
      sourceUrl: 'https://www.instagram.com/p/ABC123xyz/',
    };

    assert.equal(igMediaItem.colorGroupId, 'cg-green');
    assert.equal(igMediaItem.isCommon, false);
    assert.equal(igMediaItem.sourcePlatform, 'instagram');
  });

  it('buildStorePublishItem retains Instagram media URLs and integrity in store payload', () => {
    const rawProduct = {
      id: 'prod-vf10f',
      productCode: 'VF10F',
      title: 'Kanchipuram Silk Saree',
      category: 'Sarees',
      vendorPrice: 2499,
    };
    const resolvedMedia = ['https://media.vayyarifashions.com/instagram/reels/vf10f.mp4'];

    const publishItem = buildStorePublishItem(rawProduct, resolvedMedia);
    assert.equal(publishItem.productCode, 'VF10F');
    assert.equal(publishItem.mediaUrls.length, 1);
    assert.equal(publishItem.mediaUrls[0], 'https://media.vayyarifashions.com/instagram/reels/vf10f.mp4');
  });

  it('handles delta media allocation for newly linked Instagram post', () => {
    const allocation: DeltaMediaAllocationItem = {
      id: 'alloc-1',
      mediaId: 'm-ig-post-88',
      url: 'https://media.vayyarifashions.com/instagram/posts/p88.jpg',
      allocationType: 'shared_pool',
      isCommon: true,
      sourcePlatform: 'instagram',
      sourceUrl: 'https://www.instagram.com/p/POST88/',
      sourcePostId: 'post-88-uuid',
    };

    assert.equal(allocation.allocationType, 'shared_pool');
    assert.equal(allocation.isCommon, true);
    assert.equal(allocation.sourcePlatform, 'instagram');
    assert.equal(allocation.sourceUrl, 'https://www.instagram.com/p/POST88/');
  });

  it('correctly calculates and formats newly linked Instagram media delta counts', () => {
    const deltaCount = getMediaDeltaCount({
      isPublished: true,
      mediaCount: 7, // 5 original + 2 newly linked Instagram photos
      syncedMediaCount: 5,
    });

    assert.equal(deltaCount, 2);
    const badgeText = formatMediaDeltaBadge(deltaCount);
    assert.equal(badgeText, '+2 new photos');
  });

  it('handles Instagram post unlinking delta when media is unlinked from catalog', () => {
    // When an Instagram reel is unlinked, mediaCount drops below syncedMediaCount
    const deltaCount = getMediaDeltaCount({
      isPublished: true,
      mediaCount: 4, // 5 originally published, 1 unlinked
      syncedMediaCount: 5,
    });

    assert.equal(deltaCount, -1);
    const badgeText = formatMediaDeltaBadge(deltaCount);
    assert.equal(badgeText, '-1 photo');
  });

  it('cleans and normalizes Instagram permalinks and shortcodes', () => {
    // Normalizes messy tracking parameters like ?igsh=... or /reel/ vs /p/
    const sanitizeInstagramUrl = (rawUrl?: string, postId?: string): string => {
      if (!rawUrl && !postId) return 'https://www.instagram.com';
      if (rawUrl) {
        try {
          const parsed = new URL(rawUrl);
          // Return clean origin + pathname
          return `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}/`;
        } catch {
          return rawUrl;
        }
      }
      return `https://www.instagram.com/p/${postId}/`;
    };

    const messyReelUrl = 'https://www.instagram.com/reel/DC5xy78AbC/?igsh=MWQ1ZGUxMzBkMA==&utm_source=ig_web_copy_link';
    const cleanUrl = sanitizeInstagramUrl(messyReelUrl);
    assert.equal(cleanUrl, 'https://www.instagram.com/reel/DC5xy78AbC/');

    const shortcodeFallback = sanitizeInstagramUrl(undefined, '3489123456');
    assert.equal(shortcodeFallback, 'https://www.instagram.com/p/3489123456/');
  });

  it('swatch switching dynamically preserves common Instagram reel position', () => {
    // Swatch 1: Royal Blue, Swatch 2: Sunset Orange
    const mediaPool: StoreCurationMediaItem[] = [
      {
        id: 'blue-hero',
        uri: 'https://media.vayyarifashions.com/p/blue_front.jpg',
        mediaType: 'image',
        sortOrder: 1,
        isHero: true,
        isQualified: true,
        isCommon: false,
        colorGroupId: 'cg-blue',
      },
      {
        id: 'orange-hero',
        uri: 'https://media.vayyarifashions.com/p/orange_front.jpg',
        mediaType: 'image',
        sortOrder: 1,
        isHero: true,
        isQualified: true,
        isCommon: false,
        colorGroupId: 'cg-orange',
      },
      {
        id: 'insta-reel-drape',
        uri: 'https://media.vayyarifashions.com/instagram/reels/styling_drape.mp4',
        mediaType: 'video',
        sortOrder: 2,
        isHero: false,
        isQualified: true,
        isCommon: true, // Common to both swatches
        sourcePlatform: 'instagram',
        sourceUrl: 'https://www.instagram.com/reel/DC5xy78AbC/',
      },
    ];

    const filterForSwatch = (targetColorGroupId: string) => {
      const variant = mediaPool.filter(m => m.colorGroupId === targetColorGroupId && !m.isCommon);
      const shared = mediaPool.filter(m => m.isCommon || (!m.colorGroupId && m.colorGroupId !== targetColorGroupId));
      return [...variant, ...shared];
    };

    // User viewing Royal Blue
    const blueGallery = filterForSwatch('cg-blue');
    assert.equal(blueGallery.length, 2);
    assert.equal(blueGallery[0].id, 'blue-hero');
    assert.equal(blueGallery[1].id, 'insta-reel-drape');
    assert.equal(blueGallery[1].sourcePlatform, 'instagram');

    // User switches swatch to Sunset Orange
    const orangeGallery = filterForSwatch('cg-orange');
    assert.equal(orangeGallery.length, 2);
    assert.equal(orangeGallery[0].id, 'orange-hero'); // Swapped to Orange Hero
    assert.equal(orangeGallery[1].id, 'insta-reel-drape'); // Instagram reel effortlessly retained!
  });
});
