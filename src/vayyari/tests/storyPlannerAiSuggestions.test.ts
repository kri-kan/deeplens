import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Story Planner Merging AI Suggestion Logic', () => {
  it('extracts post IDs correctly from both loose posts and groups', () => {
    const destinationItem = {
      type: 'group',
      id: 'group-1',
      group: {
        id: 'group-1',
        posts: [{ id: 'post-1' }, { id: 'post-2' }]
      }
    };

    const mergedItems = [
      {
        type: 'post',
        id: 'post-3'
      },
      {
        type: 'group',
        id: 'group-2',
        group: {
          id: 'group-2',
          posts: [{ id: 'post-4' }]
        }
      }
    ];

    const postIds: string[] = [];
    if (destinationItem.type === 'post') {
      postIds.push(destinationItem.id);
    } else if (destinationItem.type === 'group' && destinationItem.group?.posts) {
      destinationItem.group.posts.forEach((p: any) => postIds.push(p.id));
    }

    mergedItems.forEach((item: any) => {
      if (item.type === 'post') {
        postIds.push(item.id);
      } else if (item.type === 'group' && item.group?.posts) {
        item.group.posts.forEach((p: any) => postIds.push(p.id));
      }
    });

    assert.deepStrictEqual(postIds, ['post-1', 'post-2', 'post-3', 'post-4']);
  });

  it('handles empty post list safely', () => {
    const destinationItem = { type: 'group', id: 'empty-group', group: { posts: [] } };
    const mergedItems: any[] = [];

    const postIds: string[] = [];
    if (destinationItem.type === 'post') {
      postIds.push(destinationItem.id);
    } else if (destinationItem.type === 'group' && (destinationItem as any).group?.posts) {
      (destinationItem as any).group.posts.forEach((p: any) => postIds.push(p.id));
    }

    mergedItems.forEach((item: any) => {
      if (item.type === 'post') {
        postIds.push(item.id);
      } else if (item.type === 'group' && item.group?.posts) {
        item.group.posts.forEach((p: any) => postIds.push(p.id));
      }
    });

    assert.strictEqual(postIds.length, 0);
  });

  it('safely populates title and keywords from response', () => {
    let groupName = '';
    let keywords = '';

    const res = {
      title: 'Kanchi Pattu Silk Saree',
      keywords: 'kanchi, pattu, silk, saree, bridal'
    };

    if (res?.title) groupName = res.title;
    if (res?.keywords) keywords = res.keywords;

    assert.strictEqual(groupName, 'Kanchi Pattu Silk Saree');
    assert.strictEqual(keywords, 'kanchi, pattu, silk, saree, bridal');
  });

  it('handles partial response where only title or keywords exists', () => {
    let groupName = 'Original';
    let keywords = 'original_kw';

    const resPartial = {
      title: 'New Saree Edit',
      keywords: ''
    };

    if (resPartial?.title) groupName = resPartial.title;
    if (resPartial?.keywords) keywords = resPartial.keywords;

    assert.strictEqual(groupName, 'New Saree Edit');
    assert.strictEqual(keywords, 'original_kw'); // preserved
  });
});
