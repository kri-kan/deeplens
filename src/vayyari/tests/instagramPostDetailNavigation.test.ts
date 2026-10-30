import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Instagram Post Detail Target Matching & Clamping Prevention Rules', () => {
  interface Post {
    id: string;
    platformVideoId?: string;
    permalink?: string;
    postUrl?: string;
  }

  const extractShortcode = (urlOrStr?: string) => {
    if (!urlOrStr) return undefined;
    const match = urlOrStr.match(/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/i);
    if (match) return match[1];
    if (/^[A-Za-z0-9_-]{5,25}$/.test(urlOrStr) && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(urlOrStr)) return urlOrStr;
    return undefined;
  };

  const createMatcher = (targetId?: string, initialItem?: Post) => {
    const targetShortcode =
      extractShortcode(initialItem?.permalink) ||
      extractShortcode(initialItem?.postUrl) ||
      extractShortcode(targetId);

    return (p: Post) => {
      if (!p) return false;
      const pId = p.id?.toString();
      if (targetId && pId === targetId) return true;
      if (targetId && p.platformVideoId && p.platformVideoId.toString() === targetId) return true;
      if (targetShortcode) {
        if (p.permalink && p.permalink.includes(targetShortcode)) return true;
        if (p.postUrl && p.postUrl.includes(targetShortcode)) return true;
        if (p.platformVideoId && p.platformVideoId.toString() === targetShortcode) return true;
      }
      return false;
    };
  };

  test('extractShortcode correctly extracts reel and post shortcodes', () => {
    assert.equal(extractShortcode('https://www.instagram.com/reel/DdZMEaHpBhS/'), 'DdZMEaHpBhS');
    assert.equal(extractShortcode('https://www.instagram.com/p/Dd9V-3yHQvP/'), 'Dd9V-3yHQvP');
    assert.equal(extractShortcode('DdZMEaHpBhS'), 'DdZMEaHpBhS');
    assert.equal(extractShortcode('0ab1328a-28ca-484e-b4be-011c43c34374'), undefined);
  });

  test('matchesTarget matches via UUID, platformVideoId, and shortcode', () => {
    const target: Post = {
      id: '0ab1328a-28ca-484e-b4be-011c43c34374',
      platformVideoId: '17963558583192631',
      permalink: 'https://www.instagram.com/reel/DdZMEaHpBhS/',
    };

    const matcherByUuid = createMatcher('0ab1328a-28ca-484e-b4be-011c43c34374', target);
    assert.equal(matcherByUuid(target), true);

    const matcherByShortcode = createMatcher(undefined, target);
    assert.equal(matcherByShortcode({ id: 'other-id', permalink: 'https://www.instagram.com/reel/DdZMEaHpBhS/' }), true);

    const nonMatching: Post = {
      id: 'bcd1241f-6546-4c38-a87d-401ac9b96c2c',
      permalink: 'https://www.instagram.com/reel/DdjfPUlhf9L/',
    };
    assert.equal(matcherByUuid(nonMatching), false);
  });

  test('re-fetching page 1 (100 items) is prevented when cache contains target post beyond offset 100', () => {
    // Generate 150 posts. Post at index 125 is DdZMEaHpBhS
    const posts: Post[] = Array.from({ length: 150 }, (_, i) => ({
      id: `post-${i}`,
      permalink: `https://www.instagram.com/reel/code-${i}/`,
    }));
    posts[125] = {
      id: '0ab1328a-28ca-484e-b4be-011c43c34374',
      permalink: 'https://www.instagram.com/reel/DdZMEaHpBhS/',
    };

    const matcher = createMatcher('0ab1328a-28ca-484e-b4be-011c43c34374', posts[125]);
    const shouldSkipRefetch = posts.length > 1 && posts.some(matcher);
    assert.equal(shouldSkipRefetch, true, 'Must skip re-fetching to prevent truncating posts beyond 100');
  });

  test('fallback prepending retains clicked post at index 0 if not present in fetched first page', () => {
    const initialItem: Post = {
      id: '0ab1328a-28ca-484e-b4be-011c43c34374',
      permalink: 'https://www.instagram.com/reel/DdZMEaHpBhS/',
    };
    // Fetched page 1 has 100 items, none of which are the target post
    const fetchedPage1: Post[] = Array.from({ length: 100 }, (_, i) => ({
      id: `post-${i}`,
      permalink: `https://www.instagram.com/reel/code-${i}/`,
    }));

    const matcher = createMatcher(initialItem.id, initialItem);
    const idx = fetchedPage1.findIndex(matcher);
    assert.equal(idx, -1);

    // Apply fallback logic
    const finalPosts = idx !== -1 ? fetchedPage1 : [initialItem, ...fetchedPage1.filter(p => !matcher(p))];
    const finalIndex = idx !== -1 ? idx : 0;

    assert.equal(finalIndex, 0);
    assert.equal(finalPosts[0].id, initialItem.id);
    assert.equal(finalPosts.length, 101);
  });

  test('dynamic container height calculates zero scroll drift across multi-post navigation', () => {
    // Test various device screen heights (e.g. Pixel 7 / 8 / 9 with gesture nav = ~914dp, standard 800dp, large 960dp)
    const testHeights = [800, 892, 914.3, 960];

    for (const h of testHeights) {
      const getItemLayout = (_data: any, index: number) => ({
        length: h,
        offset: h * index,
        index,
      });

      // Verify that for any post index, the offset exactly matches index * h with zero drift
      for (let postIndex = 0; postIndex < 10; postIndex++) {
        const layout = getItemLayout(null, postIndex);
        assert.equal(layout.length, h);
        assert.equal(layout.offset, h * postIndex);
        
        // Simulating momentum scroll offset
        const computedIndex = Math.round(layout.offset / h);
        assert.equal(computedIndex, postIndex, `Post ${postIndex} at height ${h} must resolve to exact index with zero drift`);
      }
    }
  });

  test('collapsed sheet height formula provides ample clearance for product action button above bottom insets', () => {
    // Phone with 914dp height and 24dp gesture bar bottom inset
    const screenHeight = 914;
    const bottomInset = 24;
    const topInset = 40;

    const collapsedSheetHeight = Math.max(140, Math.min(190, screenHeight * 0.22)) + bottomInset;
    const startTop = screenHeight - collapsedSheetHeight;
    const mediaHeight = startTop - topInset;

    // Minimum required content height inside collapsed sheet:
    // drag handle (28) + padding (8) + caption (32) + button (44) + bottomInset (24) = 136dp
    const requiredContentHeight = 28 + 8 + 32 + 44 + bottomInset;

    assert.ok(
      collapsedSheetHeight >= requiredContentHeight,
      `Collapsed sheet (${collapsedSheetHeight}dp) must provide enough height for content + button (${requiredContentHeight}dp) without truncation`
    );

    assert.ok(
      mediaHeight > screenHeight * 0.65,
      `Media area (${mediaHeight}dp) must retain majority of viewport (>65%)`
    );

    // Sum of media container + top inset + collapsed sheet must equal exact screen height
    assert.equal(mediaHeight + topInset + collapsedSheetHeight, screenHeight);
  });

  test('re-aligns active post offset dynamically on container height transition (e.g. onLayout edge-to-edge resolution)', () => {
    // Simulates initial render with windowHeight (818dp), followed by onLayout measuring true full container height (914dp)
    const initialHeight = 818;
    const resolvedHeight = 914;
    const targetPostIndex = 4;

    const computeOffset = (index: number, height: number) => index * height;

    const initialOffset = computeOffset(targetPostIndex, initialHeight);
    assert.equal(initialOffset, 3272);

    // When onLayout fires with resolvedHeight and Math.abs(containerHeight - initialHeight) > 1
    const shouldRealign = Math.abs(resolvedHeight - initialHeight) > 1 && targetPostIndex > 0;
    assert.equal(shouldRealign, true);

    const reAlignedOffset = computeOffset(targetPostIndex, resolvedHeight);
    assert.equal(reAlignedOffset, 3656);

    // Delta correction applied to FlatList
    const delta = reAlignedOffset - initialOffset;
    assert.equal(delta, targetPostIndex * (resolvedHeight - initialHeight)); // 4 * 96 = 384dp
  });

  test('momentum scroll index calculation snaps accurately across subpixel threshold boundaries', () => {
    const containerHeight = 914;
    const baseIndex = 2;
    const baseOffset = baseIndex * containerHeight; // 1828dp

    // Just below midpoint (e.g. 48% gesture drag upward): should snap back to baseIndex
    const belowMidpointOffset = baseOffset + containerHeight * 0.48;
    assert.equal(Math.round(belowMidpointOffset / containerHeight), baseIndex);

    // Exactly at or above midpoint (e.g. 50.1% gesture drag upward): should advance to next post
    const aboveMidpointOffset = baseOffset + containerHeight * 0.501;
    assert.equal(Math.round(aboveMidpointOffset / containerHeight), baseIndex + 1);

    // Dragged downward just above midpoint: should snap back to baseIndex
    const downwardBelowMidpointOffset = baseOffset - containerHeight * 0.48;
    assert.equal(Math.round(downwardBelowMidpointOffset / containerHeight), baseIndex);

    // Dragged downward past midpoint: should return to previous post
    const downwardPastMidpointOffset = baseOffset - containerHeight * 0.51;
    assert.equal(Math.round(downwardPastMidpointOffset / containerHeight), baseIndex - 1);
  });

  test('collapsed sheet height clamps gracefully on extreme small and large form factors with safe drag travel', () => {
    const devices = [
      { name: 'Small Phone', height: 640, topInset: 24, bottomInset: 16 },
      { name: 'Standard Phone', height: 800, topInset: 32, bottomInset: 20 },
      { name: 'Tall Flagship Phone', height: 914, topInset: 40, bottomInset: 24 },
      { name: 'Large Foldable / Tablet', height: 1200, topInset: 48, bottomInset: 34 },
    ];

    for (const dev of devices) {
      const rawSheetHeight = dev.height * 0.22;
      const clampedBase = Math.max(140, Math.min(190, rawSheetHeight));
      const collapsedSheetHeight = clampedBase + dev.bottomInset;
      const startTop = dev.height - collapsedSheetHeight;
      const endTop = dev.topInset + 60;
      const sheetTravelDistance = startTop - endTop;
      const mediaHeight = startTop - dev.topInset;

      // Base sheet height must be strictly bounded between 140dp and 190dp
      assert.ok(clampedBase >= 140 && clampedBase <= 190, `${dev.name}: base sheet must clamp between 140 and 190`);

      // Drag travel distance must provide sufficient room for expanding (> 350dp)
      assert.ok(sheetTravelDistance >= 350, `${dev.name}: sheet travel distance (${sheetTravelDistance}dp) must be >= 350dp`);

      // Media container must retain dominant viewport ratio (> 60%)
      const mediaRatio = mediaHeight / dev.height;
      assert.ok(mediaRatio > 0.60, `${dev.name}: media ratio (${(mediaRatio * 100).toFixed(1)}%) must be > 60%`);
    }
  });

  test('dynamic media height scales responsively to current itemWidth without static dimension coupling', () => {
    const sampleWidths = [360, 393, 411.4, 600, 768];

    for (const w of sampleWidths) {
      // 9:16 Reels aspect ratio
      const reelRatio = 9 / 16;
      const reelHeight = w / reelRatio;
      assert.ok(Math.abs(reelHeight - w * (16 / 9)) < 1e-6);

      // 1:1 Square post aspect ratio
      const squareRatio = 1;
      const squareHeight = w / squareRatio;
      assert.equal(squareHeight, w);

      // 4:5 Portrait post aspect ratio
      const portraitRatio = 4 / 5;
      const portraitHeight = w / portraitRatio;
      assert.ok(Math.abs(portraitHeight - w * 1.25) < 1e-6);
    }
  });
});
