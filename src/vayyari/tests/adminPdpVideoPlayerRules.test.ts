import test, { describe } from 'node:test';
import assert from 'node:assert';

(globalThis as any).__DEV__ = true;

import {
  resolvePdpMediaItem,
  getCarouselPosterUri,
  isVideoMediaItem,
  defaultMediaUrlResolvers,
  RawProductMedia,
  PdpMediaUrlResolvers,
} from '../utils/pdpMediaHelpers';

describe('Admin PDP Video Player & Media Resolution Rules', () => {
  describe('defaultMediaUrlResolvers Contract', () => {
    test('getRawMediaUrl generates correct /api/v1/catalog/media/{id}/raw route', () => {
      const mediaId = 'e2b34a1c-5d6e-7f8a-9b0c-1d2e3f4a5b6c';
      const rawUrl = defaultMediaUrlResolvers.getRawMediaUrl(mediaId);

      assert.ok(rawUrl.includes(`/api/v1/catalog/media/${mediaId}/raw`));
      assert.ok(!rawUrl.includes('/thumbnail'));
    });

    test('getMediaUrlByPath uses /api/v1/Attachment/download instead of 404 serve endpoint', () => {
      const storagePath = 'general/product_123/video.mp4';
      const pathUrl = defaultMediaUrlResolvers.getMediaUrlByPath(storagePath);

      assert.ok(pathUrl.includes('/api/v1/Attachment/download?path='), 'Must point to AttachmentController download endpoint');
      assert.ok(!pathUrl.includes('/catalog/media/serve'), 'Must not point to non-existent serve route');
    });

    test('getThumbnailUrl generates /api/v1/catalog/media/{id}/thumbnail?spec={spec}', () => {
      const mediaId = 'e2b34a1c-5d6e-7f8a-9b0c-1d2e3f4a5b6c';
      const thumbLarge = defaultMediaUrlResolvers.getThumbnailUrl(mediaId, 'large');
      const thumbMedium = defaultMediaUrlResolvers.getThumbnailUrl(mediaId, 'medium');

      assert.ok(thumbLarge.includes(`/api/v1/catalog/media/${mediaId}/thumbnail?spec=large`));
      assert.ok(thumbMedium.includes(`/api/v1/catalog/media/${mediaId}/thumbnail?spec=medium`));
    });
  });

  describe('resolvePdpMediaItem', () => {
    test('resolves video item with raw playable URL for url and poster image for thumbnailUrl', () => {
      const rawVideo: RawProductMedia = {
        id: '11111111-2222-3333-4444-555555555555',
        mediaType: 2,
        storagePath: 'instagram/reel_123.mp4',
        isDefault: false,
      };

      const resolved = resolvePdpMediaItem(rawVideo);

      assert.strictEqual(resolved.id, '11111111-2222-3333-4444-555555555555');
      assert.strictEqual(resolved.mediaType, 'video');
      assert.ok(resolved.url.includes('/api/v1/catalog/media/11111111-2222-3333-4444-555555555555/raw'), 'Video url must be raw stream endpoint');
      assert.ok(resolved.thumbnailUrl?.includes('/api/v1/catalog/media/11111111-2222-3333-4444-555555555555/thumbnail?spec=large'), 'Video thumbnailUrl must be image thumbnail');
    });

    test('resolves video item by storagePath when id is nil UUID or missing', () => {
      const rawVideo: RawProductMedia = {
        id: '00000000-0000-0000-0000-000000000000',
        mediaType: 'video',
        storagePath: 'product/reels/fabric_demo.mp4',
      };

      const resolved = resolvePdpMediaItem(rawVideo);

      assert.strictEqual(resolved.mediaType, 'video');
      assert.ok(resolved.url.includes('/api/v1/Attachment/download?path='), 'Fallback video url must use Attachment download');
      assert.ok(resolved.thumbnailUrl?.includes('thumbnail-by-path?path='), 'Fallback video thumb must use thumbnail-by-path');
    });

    test('supports custom base URL resolver (e.g. host-prefixed productService)', () => {
      const customResolvers: PdpMediaUrlResolvers = {
        getRawMediaUrl: (id) => `https://adminapi.vayyarifashions.com/api/v1/catalog/media/${id}/raw`,
        getMediaUrlByPath: (path) => `https://adminapi.vayyarifashions.com/api/v1/Attachment/download?path=${path}`,
        getThumbnailUrl: (id, spec) => `https://adminapi.vayyarifashions.com/api/v1/catalog/media/${id}/thumbnail?spec=${spec}`,
        getThumbnailUrlByPath: (path, spec) => `https://adminapi.vayyarifashions.com/api/v1/catalog/media/thumbnail-by-path?path=${path}&spec=${spec}`,
      };

      const rawVideo: RawProductMedia = {
        id: 'vid-456',
        mediaType: 2,
      };

      const resolved = resolvePdpMediaItem(rawVideo, customResolvers);
      assert.strictEqual(resolved.url, 'https://adminapi.vayyarifashions.com/api/v1/catalog/media/vid-456/raw');
      assert.strictEqual(resolved.thumbnailUrl, 'https://adminapi.vayyarifashions.com/api/v1/catalog/media/vid-456/thumbnail?spec=large');
    });

    test('resolves image item with high-res thumbnail for url and medium for thumbnailUrl', () => {
      const rawImage: RawProductMedia = {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        mediaType: 1,
        storagePath: 'general/saree_front.jpg',
        isDefault: true,
      };

      const resolved = resolvePdpMediaItem(rawImage);

      assert.strictEqual(resolved.id, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      assert.strictEqual(resolved.mediaType, 'image');
      assert.ok(resolved.url.includes('spec=large'), 'Image url should be high-res large spec');
      assert.ok(resolved.thumbnailUrl?.includes('spec=medium'), 'Image thumbnailUrl should be medium spec');
      assert.strictEqual(resolved.isDefault, true);
    });

    test('handles string mediaType "video" or integer mediaType 2 accurately', () => {
      assert.strictEqual(isVideoMediaItem({ mediaType: 2 }), true);
      assert.strictEqual(isVideoMediaItem({ mediaType: 'video' }), true);
      assert.strictEqual(isVideoMediaItem({ mediaType: 1 }), false);
      assert.strictEqual(isVideoMediaItem({ mediaType: 'image' }), false);
      assert.strictEqual(isVideoMediaItem({}), false);
    });
  });

  describe('getCarouselPosterUri', () => {
    test('returns thumbnailUrl for video item to prevent expo-image from receiving mp4 URL', () => {
      const videoItem = {
        id: 'v1',
        url: 'https://adminapi.vayyarifashions.com/api/v1/catalog/media/v1/raw',
        thumbnailUrl: 'https://adminapi.vayyarifashions.com/api/v1/catalog/media/v1/thumbnail?spec=large',
        mediaType: 'video' as const,
      };

      const poster = getCarouselPosterUri(videoItem);
      assert.strictEqual(poster, videoItem.thumbnailUrl);
    });

    test('returns url for image item', () => {
      const imageItem = {
        id: 'img1',
        url: 'https://adminapi.vayyarifashions.com/api/v1/catalog/media/img1/thumbnail?spec=large',
        thumbnailUrl: 'https://adminapi.vayyarifashions.com/api/v1/catalog/media/img1/thumbnail?spec=medium',
        mediaType: 'image' as const,
      };

      const poster = getCarouselPosterUri(imageItem);
      assert.strictEqual(poster, imageItem.url);
    });
  });
});
