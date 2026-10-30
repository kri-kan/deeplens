import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface WhatsAppUpdatePostItem {
  id: string;
  channelUsername: string;
  permalink?: string;
  caption?: string;
  isShared: boolean;
  sharedGroupName?: string;
  sharedAt?: string;
}

export function filterWhatsAppUpdateFeed(
  posts: WhatsAppUpdatePostItem[],
  options: {
    selectedChannel?: string | null;
    includeShared: boolean;
    searchQuery?: string;
  }
): WhatsAppUpdatePostItem[] {
  return posts.filter((post) => {
    // 1. Channel Filter
    if (options.selectedChannel && post.channelUsername.toLowerCase() !== options.selectedChannel.toLowerCase()) {
      return false;
    }

    // 2. Diligence / Shared Filter: if includeShared is false, hide marked items
    if (!options.includeShared && post.isShared) {
      return false;
    }

    // 3. Search Query Filter
    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.trim().toLowerCase();
      const inCaption = (post.caption || '').toLowerCase().includes(q);
      const inUser = post.channelUsername.toLowerCase().includes(q);
      if (!inCaption && !inUser) {
        return false;
      }
    }

    return true;
  });
}

export function buildWhatsAppSharePayload(
  post: WhatsAppUpdatePostItem,
  target: 'customer' | 'reseller',
  groupName: string,
  notes?: string
) {
  const permalink = post.permalink || `https://www.instagram.com/p/${post.id}`;
  const captionSnippet = post.caption ? `\n\n${post.caption.slice(0, 150)}...` : '';
  const messageText = `Check out this update from @${post.channelUsername}:\n${permalink}${captionSnippet}`;

  return {
    postId: post.id,
    target,
    groupName,
    notes,
    shareUrl: `whatsapp://send?text=${encodeURIComponent(messageText)}`,
    webShareUrl: `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`,
  };
}

describe('WhatsApp Updates Feed & Sharing Rules', () => {
  const samplePosts: WhatsAppUpdatePostItem[] = [
    {
      id: 'post-1',
      channelUsername: 'vayyari_fashions',
      permalink: 'https://www.instagram.com/p/ABC123/',
      caption: 'Pure Kanchi Pattu Silk Saree with rich pallu',
      isShared: false,
    },
    {
      id: 'post-2',
      channelUsername: 'everydayvayyari',
      permalink: 'https://www.instagram.com/p/DEF456/',
      caption: 'Everyday linen co-ord sets now live',
      isShared: true,
      sharedGroupName: 'Customer VIP Group',
      sharedAt: '2026-10-29T10:00:00Z',
    },
    {
      id: 'post-3',
      channelUsername: 'theblouseedition',
      permalink: 'https://www.instagram.com/p/GHI789/',
      caption: 'Handcrafted zardozi blouse design',
      isShared: false,
    },
  ];

  it('hides shared items by default in diligent mode (includeShared = false)', () => {
    const unshared = filterWhatsAppUpdateFeed(samplePosts, { includeShared: false });
    assert.equal(unshared.length, 2);
    assert.deepEqual(
      unshared.map((p) => p.id),
      ['post-1', 'post-3']
    );
  });

  it('includes shared items when includeShared is toggled to true', () => {
    const all = filterWhatsAppUpdateFeed(samplePosts, { includeShared: true });
    assert.equal(all.length, 3);
    assert.equal(all.find((p) => p.id === 'post-2')?.sharedGroupName, 'Customer VIP Group');
  });

  it('filters posts strictly by channel selection', () => {
    const channelFiltered = filterWhatsAppUpdateFeed(samplePosts, {
      selectedChannel: 'theblouseedition',
      includeShared: true,
    });
    assert.equal(channelFiltered.length, 1);
    assert.equal(channelFiltered[0].id, 'post-3');
  });

  it('filters posts by search query across caption and username', () => {
    const searched = filterWhatsAppUpdateFeed(samplePosts, {
      includeShared: true,
      searchQuery: 'kanchi',
    });
    assert.equal(searched.length, 1);
    assert.equal(searched[0].id, 'post-1');
  });

  it('correctly constructs WhatsApp share payload with formatted URL and group metadata', () => {
    const payload = buildWhatsAppSharePayload(
      samplePosts[0],
      'customer',
      'Customer VIP Group',
      'Shared with promo code'
    );

    assert.equal(payload.postId, 'post-1');
    assert.equal(payload.target, 'customer');
    assert.equal(payload.groupName, 'Customer VIP Group');
    assert.equal(payload.notes, 'Shared with promo code');
    assert.ok(payload.shareUrl.startsWith('whatsapp://send?text='));
    assert.ok(payload.shareUrl.includes(encodeURIComponent('https://www.instagram.com/p/ABC123/')));
    assert.ok(payload.shareUrl.includes(encodeURIComponent('@vayyari_fashions')));
  });

  it('simulates marking post as shared: hides from unshared view and decrements unshared count', () => {
    let posts = [...samplePosts];
    let unsharedCount = posts.filter((p) => !p.isShared).length;
    assert.equal(unsharedCount, 2);

    // Share post-1
    posts = posts.map((p) =>
      p.id === 'post-1'
        ? { ...p, isShared: true, sharedGroupName: 'Resellers Exclusive', sharedAt: new Date().toISOString() }
        : p
    );

    const remainingUnshared = filterWhatsAppUpdateFeed(posts, { includeShared: false });
    assert.equal(remainingUnshared.length, 1);
    assert.equal(remainingUnshared[0].id, 'post-3');
  });
});
