import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Models the timeline message merge and deterministic tie-breaking logic
 * implemented in useIntelligentChatTimeline (and wa-processor.service.ts).
 */
describe('Chat Timeline Deterministic Same-Second Ordering Rules', () => {
  interface Message {
    id?: number;
    messageId: string;
    timestamp: number;
    groupId?: string;
    content?: string;
    mediaType?: string | null;
  }

  // Exact mergeMessages implementation from useIntelligentChatTimeline.ts
  function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
    const map = new Map<string, Message>();
    existing.forEach((m) => map.set(m.messageId, m));
    incoming.forEach((m) => map.set(m.messageId, m));
    const merged = Array.from(map.values());
    merged.sort((a, b) => {
      if (b.timestamp !== a.timestamp) {
        return b.timestamp - a.timestamp; // DESC: newest first
      }
      if (b.id !== undefined && a.id !== undefined) {
        return b.id - a.id;
      }
      return (b.messageId || '').localeCompare(a.messageId || '');
    });
    return merged;
  }

  test('primary sort: orders messages with different timestamps in DESC order (newest first for inverted FlatList)', () => {
    const messages: Message[] = [
      { id: 101, messageId: 'm1', timestamp: 1787800000, content: 'First' },
      { id: 102, messageId: 'm2', timestamp: 1787800050, content: 'Second' },
      { id: 103, messageId: 'm3', timestamp: 1787800020, content: 'Third' },
    ];

    const sorted = mergeMessages([], messages);
    assert.deepEqual(
      sorted.map((m) => m.messageId),
      ['m2', 'm3', 'm1'],
      'Expected timestamp DESC order: 1787800050 -> 1787800020 -> 1787800000'
    );
  });

  test('deterministic tie-breaker: same-second messages break tie via insertion id DESC', () => {
    // Two messages arriving in the exact same second:
    // id 193001 was inserted earlier (e.g. text description)
    // id 193002 was inserted later (e.g. delimiter sticker)
    const messages: Message[] = [
      { id: 193001, messageId: 'msg_text', timestamp: 1787800738, content: 'Product description' },
      { id: 193002, messageId: 'msg_sticker', timestamp: 1787800738, mediaType: 'sticker' },
    ];

    const sorted = mergeMessages([], messages);
    // In inverted FlatList (index 0 = bottom/newest), the later-inserted message must be at index 0
    assert.equal(sorted[0].id, 193002, 'Expected higher id to sort first in DESC list');
    assert.equal(sorted[1].id, 193001, 'Expected lower id to sort second in DESC list');
  });

  test('delimiter sticker vs product text: preserves product group boundary without creating rogue sub-zones', () => {
    // Simulates the JC Fashion - Surat scenario:
    // 1. Previous product text sent at 03:18:58 (id: 193001, ts: 1787800738, group: product_prev)
    // 2. Delimiter sticker sent at 03:18:58 (id: 193002, ts: 1787800738, group: sticker_delim)
    // 3. Next product images sent at 03:19:10 (id: 193010, ts: 1787800750, group: product_next)
    const rawMessages: Message[] = [
      {
        id: 193001,
        messageId: '3A2F54689AA6098049CA',
        timestamp: 1787800738,
        groupId: 'product_a34d1896',
        content: '*Design-Sunhari*\nPure silk saree with contrast pallu',
      },
      {
        id: 193002,
        messageId: '3A288E34B4D5808923BF',
        timestamp: 1787800738,
        groupId: 'sticker_e1806502',
        mediaType: 'sticker',
      },
      {
        id: 193010,
        messageId: '3A57C8A440F557D88304',
        timestamp: 1787800750,
        groupId: 'product_b68b326f',
        mediaType: 'image',
      },
    ];

    const sorted = mergeMessages([], rawMessages);

    // Inverted FlatList index 0 is at the bottom of the screen (most recent)
    // Chronological flow from past -> present is sorted.slice().reverse()
    const chronological = [...sorted].reverse();

    assert.equal(chronological[0].groupId, 'product_a34d1896', 'Product description must precede sticker');
    assert.equal(chronological[1].groupId, 'sticker_e1806502', 'Sticker must come between product_prev and product_next');
    assert.equal(chronological[2].groupId, 'product_b68b326f', 'New product must come after sticker delimiter');

    // Confirm the delimiter sticker cleanly bounds product_prev before product_next
    const stickerIndex = chronological.findIndex((m) => m.groupId?.startsWith('sticker_'));
    const prevProductIndices = chronological
      .map((m, idx) => (m.groupId === 'product_a34d1896' ? idx : -1))
      .filter((idx) => idx !== -1);
    const nextProductIndices = chronological
      .map((m, idx) => (m.groupId === 'product_b68b326f' ? idx : -1))
      .filter((idx) => idx !== -1);

    assert.ok(prevProductIndices.every((idx) => idx < stickerIndex), 'All previous product messages must be before sticker');
    assert.ok(nextProductIndices.every((idx) => idx > stickerIndex), 'All next product messages must be after sticker');
  });

  test('fallback tie-breaker: falls back to deterministic localeCompare when id is undefined', () => {
    const messagesWithoutIds: Message[] = [
      { messageId: 'uuid-alpha', timestamp: 1787800738, content: 'Alpha' },
      { messageId: 'uuid-zeta', timestamp: 1787800738, content: 'Zeta' },
      { messageId: 'uuid-beta', timestamp: 1787800738, content: 'Beta' },
    ];

    const sorted = mergeMessages([], messagesWithoutIds);
    // 'uuid-zeta' > 'uuid-beta' > 'uuid-alpha' in DESC localeCompare
    assert.deepEqual(
      sorted.map((m) => m.messageId),
      ['uuid-zeta', 'uuid-beta', 'uuid-alpha'],
      'Expected deterministic lexicographical tie-break when id is missing'
    );
  });

  test('deduplication: updates existing message without creating duplicates while preserving ordering', () => {
    const existing: Message[] = [
      { id: 10, messageId: 'm1', timestamp: 1000, content: 'Original text' },
      { id: 11, messageId: 'm2', timestamp: 1005, content: 'Message 2' },
    ];

    const incoming: Message[] = [
      { id: 10, messageId: 'm1', timestamp: 1000, content: 'Updated text with media_url' },
      { id: 12, messageId: 'm3', timestamp: 1010, content: 'New message 3' },
    ];

    const merged = mergeMessages(existing, incoming);
    assert.equal(merged.length, 3, 'Expected 3 deduplicated messages');
    const updatedM1 = merged.find((m) => m.messageId === 'm1');
    assert.equal(updatedM1?.content, 'Updated text with media_url');
    assert.deepEqual(
      merged.map((m) => m.messageId),
      ['m3', 'm2', 'm1'],
      'Expected newest first (m3 -> m2 -> m1)'
    );
  });
});
