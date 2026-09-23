import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export const COLLAB_PAGE_SIZE = 90;

export function calculateHasMore(skip: number, returnedCount: number, totalCount?: number): boolean {
  if (returnedCount === 0) return false;
  if (totalCount !== undefined) {
    return skip + returnedCount < totalCount;
  }
  return returnedCount === COLLAB_PAGE_SIZE;
}

export function deduplicateAndAppendPosts<T extends { id: string }>(existing: T[], fresh: T[]): T[] {
  const existingIds = new Set(existing.map((item) => item.id));
  const newItems = fresh.filter((item) => !existingIds.has(item.id));
  return [...existing, ...newItems];
}

export function filterCollabPosts<T extends { ownerUsername: string; curationStatus?: string }>(
  posts: T[],
  activeChannel: string,
  showCurated: boolean
): T[] {
  const channelLower = (activeChannel || '').toLowerCase();
  const channelFiltered = posts.filter(
    (p) => p.ownerUsername?.toLowerCase() === channelLower
  );
  if (showCurated) {
    return channelFiltered;
  }
  return channelFiltered.filter(
    (p) => !p.curationStatus || p.curationStatus === 'pending'
  );
}

export function formatHeaderSubtitle(
  loadedCount: number,
  showCurated: boolean,
  totalCount?: number,
  fallbackPending = 0,
  fallbackTotal = 0
): string {
  if (showCurated) {
    if (totalCount !== undefined) {
      return `Showing ${loadedCount} of ${totalCount} posts`;
    }
    return `Showing all ${fallbackTotal} posts`;
  }

  if (totalCount !== undefined) {
    return `${totalCount} uncurated post${totalCount === 1 ? '' : 's'} (${loadedCount} loaded)`;
  }
  return `${fallbackPending} uncurated post${fallbackPending === 1 ? '' : 's'}`;
}

describe('Collab Planner Pagination & Infinite Scroll Logic', () => {
  it('calculateHasMore correctly evaluates pagination with totalCount', () => {
    // 1st page: 45 returned out of 1407 total
    assert.strictEqual(calculateHasMore(0, 45, 1407), true);

    // 2nd page: skip 45, returned 45 (90 loaded out of 1407)
    assert.strictEqual(calculateHasMore(45, 45, 1407), true);

    // Last page: skip 1395, returned 12 (1407 total)
    assert.strictEqual(calculateHasMore(1395, 12, 1407), false);

    // Empty result
    assert.strictEqual(calculateHasMore(1407, 0, 1407), false);
  });

  it('calculateHasMore falls back to COLLAB_PAGE_SIZE check when totalCount is undefined', () => {
    assert.strictEqual(calculateHasMore(0, 90, undefined), true);
    assert.strictEqual(calculateHasMore(90, 45, undefined), false);
    assert.strictEqual(calculateHasMore(0, 0, undefined), false);
  });

  it('deduplicateAndAppendPosts discards overlapping IDs', () => {
    const existing = [
      { id: 'post-1', title: 'Post 1' },
      { id: 'post-2', title: 'Post 2' },
    ];
    const incoming = [
      { id: 'post-2', title: 'Post 2 Duplicate' },
      { id: 'post-3', title: 'Post 3' },
    ];
    const combined = deduplicateAndAppendPosts(existing, incoming);
    assert.strictEqual(combined.length, 3);
    assert.deepStrictEqual(combined.map((p) => p.id), ['post-1', 'post-2', 'post-3']);
  });

  it('filterCollabPosts strictly scopes posts by active channel case-insensitively', () => {
    const mockPosts = [
      { id: '1', ownerUsername: 'Vayyari_Fashions', curationStatus: 'pending' },
      { id: '2', ownerUsername: 'vayyari_fashions', curationStatus: 'curated' },
      { id: '3', ownerUsername: 'editionsbyvayyari', curationStatus: 'pending' },
    ];

    const vfPending = filterCollabPosts(mockPosts, 'vayyari_fashions', false);
    assert.strictEqual(vfPending.length, 1);
    assert.strictEqual(vfPending[0].id, '1');

    const vfAll = filterCollabPosts(mockPosts, 'vayyari_fashions', true);
    assert.strictEqual(vfAll.length, 2);

    const editions = filterCollabPosts(mockPosts, 'editionsbyvayyari', false);
    assert.strictEqual(editions.length, 1);
    assert.strictEqual(editions[0].id, '3');
  });

  it('formatHeaderSubtitle formats loaded vs total posts accurately', () => {
    // Uncurated mode with totalCount
    const sub1 = formatHeaderSubtitle(90, false, 1403);
    assert.strictEqual(sub1, '1403 uncurated posts (90 loaded)');

    // Single uncurated post
    const sub2 = formatHeaderSubtitle(1, false, 1);
    assert.strictEqual(sub2, '1 uncurated post (1 loaded)');

    // Curated mode with totalCount
    const sub3 = formatHeaderSubtitle(180, true, 1407);
    assert.strictEqual(sub3, 'Showing 180 of 1407 posts');

    // Fallbacks without totalCount
    const sub4 = formatHeaderSubtitle(15, false, undefined, 15, 20);
    assert.strictEqual(sub4, '15 uncurated posts');
  });

  it('simulates ref-guarded pagination traversing all 1403 posts without stall', () => {
    const totalCount = 1403;
    let pageRef = 0;
    let loadingMoreRef = false;
    let hasMoreRef = true;
    let totalLoaded = 0;
    let fetchCount = 0;

    // Simulate paging until hasMore is false
    while (hasMoreRef) {
      if (loadingMoreRef) break; // guarded
      loadingMoreRef = true;

      const skip = pageRef * COLLAB_PAGE_SIZE;
      const remaining = totalCount - skip;
      const batchSize = Math.min(COLLAB_PAGE_SIZE, remaining);

      totalLoaded += batchSize;
      fetchCount++;

      hasMoreRef = calculateHasMore(skip, batchSize, totalCount);
      pageRef++;
      loadingMoreRef = false;
    }

    assert.strictEqual(totalLoaded, 1403);
    // 1403 / 90 = 15.58 -> exactly 16 pages
    assert.strictEqual(fetchCount, 16);
    assert.strictEqual(hasMoreRef, false);
  });

  it('ref guard blocks concurrent fetch requests during rapid scrolling', () => {
    let loadingMoreRef = false;
    let networkCalls = 0;

    const simulateTrigger = () => {
      if (loadingMoreRef) return false;
      loadingMoreRef = true;
      networkCalls++;
      return true;
    };

    // First trigger initiates fetch
    assert.strictEqual(simulateTrigger(), true);
    assert.strictEqual(networkCalls, 1);

    // Rapid successive scroll events while in flight are safely dropped
    assert.strictEqual(simulateTrigger(), false);
    assert.strictEqual(simulateTrigger(), false);
    assert.strictEqual(networkCalls, 1);

    // Fetch finishes
    loadingMoreRef = false;

    // Next trigger executes cleanly
    assert.strictEqual(simulateTrigger(), true);
    assert.strictEqual(networkCalls, 2);
  });
});
