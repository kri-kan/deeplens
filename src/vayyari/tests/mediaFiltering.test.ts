import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  filterPreviewMedia,
  toggleMediaGroupAssignment,
  toggleMediaCommonStatus,
  unlinkDiscardedMedia,
} from '../utils/curationMediaRules';
import { StoreCurationMediaItem, StoreColorGroup } from '../components/tamagui-ui/organisms/StoreCuration/types';

describe('Store Curation Media Qualification & Filtering Rules', () => {
  const mockGroups: StoreColorGroup[] = [
    { id: 'cg-emerald', name: 'Emerald Green', colorwayCode: 'VF-01', template: 'solid', slotA: '#1E8C4E' },
    { id: 'cg-crimson', name: 'Crimson Red', colorwayCode: 'VF-02', template: 'solid', slotA: '#C0392B' },
  ];

  const sampleMedia: StoreCurationMediaItem[] = [
    {
      id: 'm1',
      uri: 'http://example.com/emerald-front.jpg',
      mediaType: 'image',
      sortOrder: 1,
      isHero: true,
      isQualified: true,
      isCommon: false,
      colorGroupId: 'cg-emerald',
    },
    {
      id: 'm2',
      uri: 'http://example.com/crimson-front.jpg',
      mediaType: 'image',
      sortOrder: 2,
      isHero: false,
      isQualified: true,
      isCommon: false,
      colorGroupId: 'cg-crimson',
    },
    {
      id: 'm3',
      uri: 'http://example.com/weaving-certificate.jpg',
      mediaType: 'image',
      sortOrder: 3,
      isHero: false,
      isQualified: true,
      isCommon: true, // Universal craft asset
    },
    {
      id: 'm4',
      uri: 'http://example.com/emerald-pallu.jpg',
      mediaType: 'image',
      sortOrder: 0, // Should sort first
      isHero: false,
      isQualified: true,
      isCommon: false,
      colorGroupId: 'cg-emerald',
    },
  ];

  test('filters media by active colorway while always including common craft assets', () => {
    // When previewing 'cg-emerald', should get m4, m1, and m3 (common), but NOT m2 (crimson)
    const emeraldMedia = filterPreviewMedia(sampleMedia, mockGroups, 'cg-emerald');

    assert.strictEqual(emeraldMedia.length, 3);
    assert.deepStrictEqual(emeraldMedia.map((m) => m.id), ['m4', 'm1', 'm3']); // Sorted by sortOrder (0, 1, 3)
  });

  test('filters media for crimson colorway correctly', () => {
    // When previewing 'cg-crimson', should get m2 and m3 (common)
    const crimsonMedia = filterPreviewMedia(sampleMedia, mockGroups, 'cg-crimson');

    assert.strictEqual(crimsonMedia.length, 2);
    assert.deepStrictEqual(crimsonMedia.map((m) => m.id), ['m2', 'm3']);
  });

  test('falls back to all qualified media if no items match active filter', () => {
    const fallbackResult = filterPreviewMedia(sampleMedia, mockGroups, 'non-existent-group');
    // Non-existent group has no match, but m3 is common; if non-empty, returns m3
    assert.ok(fallbackResult.length > 0);
  });

  test('toggleMediaGroupAssignment toggles assignment on and resets isCommon', () => {
    const unassigned: StoreCurationMediaItem = {
      id: 'm-test',
      uri: 'http://example.com/test.jpg',
      mediaType: 'image',
      sortOrder: 1,
      isHero: false,
      isQualified: true,
      isCommon: true,
    };

    // Assigning to cg-crimson sets colorGroupId and forces isCommon to false
    const assigned = toggleMediaGroupAssignment(unassigned, 'cg-crimson');
    assert.strictEqual(assigned.colorGroupId, 'cg-crimson');
    assert.strictEqual(assigned.isCommon, false);

    // Toggling again with same group unassigns colorGroupId
    const unassignedAgain = toggleMediaGroupAssignment(assigned, 'cg-crimson');
    assert.strictEqual(unassignedAgain.colorGroupId, undefined);
  });

  test('toggleMediaCommonStatus sets isCommon and clears specific colorGroupId', () => {
    const specificItem: StoreCurationMediaItem = {
      id: 'm-spec',
      uri: 'http://example.com/spec.jpg',
      mediaType: 'image',
      sortOrder: 1,
      isHero: false,
      isQualified: true,
      isCommon: false,
      colorGroupId: 'cg-emerald',
    };

    const commonItem = toggleMediaCommonStatus(specificItem);
    assert.strictEqual(commonItem.isCommon, true);
    assert.strictEqual(commonItem.colorGroupId, undefined);

    const backToSpecific = toggleMediaCommonStatus(commonItem);
    assert.strictEqual(backToSpecific.isCommon, false);
  });
});

describe('unlinkDiscardedMedia', () => {
  test('unassigns colorGroupId on media linked to discarded group without affecting others', () => {
    const media: StoreCurationMediaItem[] = [
      { id: 'm1', uri: 'u1', mediaType: 'image', sortOrder: 0, isHero: false, isQualified: true, isCommon: false, colorGroupId: 'cg-1' },
      { id: 'm2', uri: 'u2', mediaType: 'image', sortOrder: 1, isHero: false, isQualified: true, isCommon: false, colorGroupId: 'cg-2' },
      { id: 'm3', uri: 'u3', mediaType: 'image', sortOrder: 2, isHero: false, isQualified: true, isCommon: true },
    ];

    const unlinked = unlinkDiscardedMedia(media, 'cg-1');
    assert.strictEqual(unlinked[0].colorGroupId, undefined);
    assert.strictEqual(unlinked[1].colorGroupId, 'cg-2');
    assert.strictEqual(unlinked[2].colorGroupId, undefined);
  });
});
