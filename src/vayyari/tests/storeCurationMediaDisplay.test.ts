import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StoreCurationMediaItem } from '../types/curation';
import { getMediaDisplayUri } from '../utils/curationMediaRules';

describe('Storefront Media Display URI Resolution Rules', () => {
  it('returns empty string when item is null or undefined', () => {
    assert.equal(getMediaDisplayUri(null), '');
    assert.equal(getMediaDisplayUri(undefined), '');
  });

  it('resolves modifiedUri when activeDisplaySource is modified and modifiedUri is present', () => {
    const item: StoreCurationMediaItem = {
      id: 'm-1',
      uri: 'http://192.168.0.170:9000/raw/photo1.jpg',
      originalUri: 'http://192.168.0.170:9000/raw/photo1.jpg',
      modifiedUri: 'http://192.168.0.170:9000/curated/photo1-lensproof.webp',
      activeDisplaySource: 'modified',
      hasModified: true,
      mediaType: 'image',
      sortOrder: 1,
      isHero: true,
      isQualified: true,
      isCommon: false,
    };

    const resolved = getMediaDisplayUri(item);
    assert.ok(resolved.includes('photo1-lensproof.webp'), 'Must resolve modified WebP');
  });

  it('resolves originalUri when activeDisplaySource is original even if modifiedUri exists', () => {
    const item: StoreCurationMediaItem = {
      id: 'm-2',
      uri: 'http://192.168.0.170:9000/raw/photo2.jpg',
      originalUri: 'http://192.168.0.170:9000/raw/photo2.jpg',
      modifiedUri: 'http://192.168.0.170:9000/curated/photo2-lensproof.webp',
      activeDisplaySource: 'original',
      hasModified: true,
      mediaType: 'image',
      sortOrder: 2,
      isHero: false,
      isQualified: true,
      isCommon: false,
    };

    const resolved = getMediaDisplayUri(item);
    assert.ok(resolved.includes('photo2.jpg'), 'Must resolve original photo');
    assert.ok(!resolved.includes('photo2-lensproof.webp'), 'Must not resolve modified photo when original is active');
  });

  it('falls back to uri when modifiedUri is null or deleted', () => {
    const item: StoreCurationMediaItem = {
      id: 'm-3',
      uri: 'http://192.168.0.170:9000/raw/photo3.jpg',
      originalUri: 'http://192.168.0.170:9000/raw/photo3.jpg',
      modifiedUri: null,
      activeDisplaySource: 'modified', // Target source was modified, but file was deleted/null
      hasModified: false,
      mediaType: 'image',
      sortOrder: 3,
      isHero: false,
      isQualified: true,
      isCommon: false,
    };

    const resolved = getMediaDisplayUri(item);
    assert.ok(resolved.includes('photo3.jpg'), 'Must fall back to uri');
  });

  it('falls back to thumbnailUri when primary uri is absent', () => {
    const item: StoreCurationMediaItem = {
      id: 'm-4',
      uri: '',
      thumbnailUri: 'http://192.168.0.170:9000/thumbs/photo4-thumb.jpg',
      mediaType: 'image',
      sortOrder: 4,
      isHero: false,
      isQualified: true,
      isCommon: false,
    };

    const resolved = getMediaDisplayUri(item);
    assert.ok(resolved.includes('photo4-thumb.jpg'), 'Must fall back to thumbnailUri');
  });
});
