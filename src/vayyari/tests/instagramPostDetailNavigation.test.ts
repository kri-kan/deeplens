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
});
