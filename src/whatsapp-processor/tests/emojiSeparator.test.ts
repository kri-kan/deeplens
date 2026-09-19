process.env.NODE_ENV = 'test';
process.env.NO_LOG_ROTATION = 'true';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isStandaloneEmoji, isBoundaryDelimiter, ZoningService } from '../src/services/zoning.service';

describe('Standalone Emoji Boundary Detection (ADO #610)', () => {
    test('identifies common boundary emojis correctly', () => {
        const commonBoundaryEmojis = [
            '🔚',
            '🛑',
            '⛔',
            '🚫',
            '⏹️',
            '🔶🔶🔶🔶',
            '✨',
            '🙏',
            '🇮🇳',
            '♥️♥️',
            '🎥🎥🎥'
        ];

        for (const emoji of commonBoundaryEmojis) {
            assert.equal(isStandaloneEmoji(emoji), true, `Expected "${emoji}" to be recognized as standalone emoji`);
        }
    });

    test('handles WhatsApp markdown formatting and whitespace around emojis', () => {
        const formattedEmojis = [
            '*🔚*',
            '_🛑_',
            '  🔚  ',
            '\n🛑\n',
            '*🛑🛑*',
            '~🔚~',
            '`🛑`'
        ];

        for (const formatted of formattedEmojis) {
            assert.equal(isStandaloneEmoji(formatted), true, `Expected formatted emoji "${formatted}" to be recognized`);
        }
    });

    test('rejects messages containing actual text alongside emojis', () => {
        const nonBoundaryMessages = [
            'Product price 1200 🔚',
            '🛑 New Collection Launch',
            'Pure Kanchi Pattu Saree 🌸 Price 2500',
            'Hello world',
            '12345',
            'Price: 999/-',
            '...',
            '[image]',
            '[video]',
            '[sticker]'
        ];

        for (const msg of nonBoundaryMessages) {
            assert.equal(isStandaloneEmoji(msg), false, `Expected "${msg}" to NOT be recognized as standalone emoji`);
        }
    });

    test('rejects empty, null, or undefined inputs', () => {
        assert.equal(isStandaloneEmoji(''), false);
        assert.equal(isStandaloneEmoji('   '), false);
        assert.equal(isStandaloneEmoji(null), false);
        assert.equal(isStandaloneEmoji(undefined), false);
    });

    test('rejects excessively long emoji spam strings (> 10 graphemes)', () => {
        const longEmojiSpam = '🔚'.repeat(25);
        assert.equal(isStandaloneEmoji(longEmojiSpam), false);
    });
});

describe('Boundary Delimiter Resolution (isBoundaryDelimiter)', () => {
    test('recognizes sticker media types as boundary delimiters', () => {
        assert.equal(isBoundaryDelimiter({ media_type: 'sticker' }), true);
        assert.equal(isBoundaryDelimiter({ message_type: 'sticker' }), true);
        assert.equal(isBoundaryDelimiter({ metadata: { stickerMessage: {} } }), true);
        assert.equal(isBoundaryDelimiter({ metadata: JSON.stringify({ stickerMessage: {} }) }), true);
    });

    test('recognizes standalone emojis as delimiters when isStickerChat is true', () => {
        assert.equal(isBoundaryDelimiter({ content: '🔚' }, true), true);
        assert.equal(isBoundaryDelimiter({ content: '*🛑*' }, true), true);
        assert.equal(isBoundaryDelimiter({ metadata: { conversation: '🔚' } }, true), true);
        assert.equal(isBoundaryDelimiter({ metadata: { extendedTextMessage: { text: '🛑' } } }, true), true);
    });

    test('does NOT treat standalone emojis as boundary delimiters when isStickerChat is false', () => {
        assert.equal(isBoundaryDelimiter({ content: '🔚' }, false), false);
        assert.equal(isBoundaryDelimiter({ content: '🛑' }, false), false);
    });

    test('does NOT treat regular text as boundary delimiter even in sticker chat', () => {
        assert.equal(isBoundaryDelimiter({ content: 'Pure cotton dress material' }, true), false);
        assert.equal(isBoundaryDelimiter({ content: 'Price 1500 with shipping' }, true), false);
    });
});

describe('ZoningService with Emoji Boundary Separator (ADO #610)', () => {
    const zoningService = new ZoningService();

    test('assigns standalone emoji message to a sticker_ boundary zone', async () => {
        const queries: Array<{ sql: string; params: any[] }> = [];
        const mockClient = {
            query: async (sql: string, params: any[]) => {
                queries.push({ sql, params });
                if (sql.includes('SELECT group_id FROM wa.messages') && sql.includes('ABS(timestamp - $2) <= 5')) {
                    // No adjacent delimiter burst
                    return { rows: [] };
                }
                return { rows: [] };
            }
        };

        const result = await zoningService.assignMessageToZone(
            {
                message_id: 'MSG_EMOJI_1',
                jid: 'chat1@g.us',
                media_type: null,
                content: '🔚',
                timestamp: 1000
            },
            { strategy: 'sticker' },
            mockClient
        );

        assert.equal(result.strategyUsed, 'sticker_first');
        assert.equal(result.isNewGroup, true);
        assert.ok(result.groupId.startsWith('sticker_'), `Expected groupId to start with sticker_, got ${result.groupId}`);

        // Verify it was updated in wa.messages
        const updateQuery = queries.find(q => q.sql.includes('UPDATE wa.messages SET group_id = $1 WHERE message_id = $2'));
        assert.ok(updateQuery, 'Expected update query on wa.messages');
        assert.equal(updateQuery.params[0], result.groupId);
        assert.equal(updateQuery.params[1], 'MSG_EMOJI_1');
    });

    test('coalesces adjacent burst emojis within 5s into same delimiter zone', async () => {
        const mockClient = {
            query: async (sql: string, params: any[]) => {
                if (sql.includes('ABS(timestamp - $2) <= 5')) {
                    return { rows: [{ group_id: 'sticker_burst_existing_123' }] };
                }
                return { rows: [] };
            }
        };

        const result = await zoningService.assignMessageToZone(
            {
                message_id: 'MSG_EMOJI_2',
                jid: 'chat1@g.us',
                media_type: null,
                content: '🛑',
                timestamp: 1002
            },
            { strategy: 'sticker' },
            mockClient
        );

        assert.equal(result.groupId, 'sticker_burst_existing_123');
        assert.equal(result.isNewGroup, false);
    });

    test('splits product messages across an emoji boundary in sticker-first mode', async () => {
        // Message 1: Photo after previous emoji delimiter
        const mockClient = {
            query: async (sql: string, params: any[]) => {
                if (sql.includes('ORDER BY timestamp DESC, id DESC LIMIT 1') && sql.includes('group_id LIKE \'sticker_%\'')) {
                    // Prev delimiter was an emoji boundary at ts 1000
                    return { rows: [{ timestamp: 1000, id: 5 }] };
                }
                if (sql.includes('ORDER BY timestamp ASC, id ASC LIMIT 1') && sql.includes('group_id LIKE \'sticker_%\'')) {
                    // Next delimiter is at ts 2000
                    return { rows: [{ timestamp: 2000, id: 20 }] };
                }
                if (sql.includes('SELECT group_id FROM wa.messages') && sql.includes('product_%')) {
                    // No existing product group in this interval yet
                    return { rows: [] };
                }
                return { rows: [] };
            }
        };

        const result = await zoningService.assignMessageToZone(
            {
                message_id: 'MSG_PHOTO_1',
                jid: 'chat1@g.us',
                media_type: 'photo',
                content: '[image]',
                timestamp: 1050
            },
            { strategy: 'sticker' },
            mockClient
        );

        assert.equal(result.strategyUsed, 'sticker_first');
        assert.equal(result.isNewGroup, true);
        assert.ok(result.groupId.startsWith('product_'), `Expected product_ groupId, got ${result.groupId}`);
    });

    test('falls back to time-based grouping if chat has strategy = time_gap', async () => {
        const mockClient = {
            query: async (sql: string, params: any[]) => {
                if (sql.includes('ORDER BY timestamp DESC, id DESC LIMIT 1')) {
                    // Previous product message 20 seconds ago
                    return { rows: [{ group_id: 'product_time_gap_123', timestamp: 980 }] };
                }
                return { rows: [] };
            }
        };

        const result = await zoningService.assignMessageToZone(
            {
                message_id: 'MSG_EMOJI_TIMEGAP',
                jid: 'chat_timegap@g.us',
                media_type: null,
                content: '🔚',
                timestamp: 1000
            },
            { strategy: 'time_gap', timeGapSeconds: 300 },
            mockClient
        );

        assert.equal(result.strategyUsed, 'time_fallback');
        // Because time gap was within 300s, it joins the existing group
        assert.equal(result.groupId, 'product_time_gap_123');
    });

    test('rezoneChat splits messages at standalone emoji boundaries', async () => {
        const messages = [
            { id: 1, message_id: 'M1', jid: 'chat1@g.us', content: '[image]', media_type: 'image', timestamp: 100 },
            { id: 2, message_id: 'M2', jid: 'chat1@g.us', content: 'Banarasi Saree Rs 2200', media_type: null, timestamp: 102 },
            { id: 3, message_id: 'M3', jid: 'chat1@g.us', content: '🔚', media_type: null, timestamp: 105 }, // Emoji boundary
            { id: 4, message_id: 'M4', jid: 'chat1@g.us', content: '[image]', media_type: 'image', timestamp: 110 },
            { id: 5, message_id: 'M5', jid: 'chat1@g.us', content: 'Kanchi Pattu Rs 4500', media_type: null, timestamp: 112 },
            { id: 6, message_id: 'M6', jid: 'chat1@g.us', content: '🛑', media_type: null, timestamp: 115 }, // Emoji boundary
            { id: 7, message_id: 'M7', jid: 'chat1@g.us', content: '[image]', media_type: 'image', timestamp: 120 }
        ];

        const updates: Array<{ id: number; groupId: string; isSticker?: boolean }> = [];
        const mockClient = {
            query: async (sql: string, params?: any[]) => {
                if (sql.includes('SELECT enable_message_grouping, grouping_config')) {
                    return { rows: [{ grouping_config: { strategy: 'sticker' } }] };
                }
                if (sql.includes('SELECT id, message_id, jid, content, media_type, timestamp, metadata')) {
                    return { rows: messages };
                }
                if (sql.includes('UPDATE wa.messages SET group_id = $1')) {
                    updates.push({ id: params![1], groupId: params![0] });
                    return { rowCount: 1 };
                }
                if (sql.includes('DELETE FROM wa.message_groups')) {
                    return { rowCount: 0 };
                }
                return { rows: [] };
            }
        };

        const stats = await zoningService.rezoneChat('chat1@g.us', mockClient);

        assert.equal(stats.totalMessages, 7);
        // Delimiters found: M3 ('🔚') and M6 ('🛑') -> 2 delimiters
        assert.equal(stats.stickersFound, 2);
        // Zones created: Zone 1 (M1, M2), Zone 2 (M4, M5), Zone 3 (M7) -> 3 product zones
        assert.equal(stats.zonesCreated, 3);

        // M1 and M2 must share the same product group
        const m1Update = updates.find(u => u.id === 1);
        const m2Update = updates.find(u => u.id === 2);
        assert.ok(m1Update && m2Update);
        assert.equal(m1Update.groupId, m2Update.groupId);
        assert.ok(m1Update.groupId.startsWith('product_'));

        // M3 (emoji boundary) must have a sticker_ group
        const m3Update = updates.find(u => u.id === 3);
        assert.ok(m3Update);
        assert.ok(m3Update.groupId.startsWith('sticker_'));

        // M4 and M5 must share a DIFFERENT product group
        const m4Update = updates.find(u => u.id === 4);
        const m5Update = updates.find(u => u.id === 5);
        assert.ok(m4Update && m5Update);
        assert.equal(m4Update.groupId, m5Update.groupId);
        assert.ok(m4Update.groupId.startsWith('product_'));
        assert.notEqual(m4Update.groupId, m1Update.groupId, 'M4 should belong to a new zone separate from M1');

        // M6 (emoji boundary) must have a sticker_ group
        const m6Update = updates.find(u => u.id === 6);
        assert.ok(m6Update);
        assert.ok(m6Update.groupId.startsWith('sticker_'));

        // M7 must be in a third distinct product group
        const m7Update = updates.find(u => u.id === 7);
        assert.ok(m7Update);
        assert.ok(m7Update.groupId.startsWith('product_'));
        assert.notEqual(m7Update.groupId, m4Update.groupId, 'M7 should belong to a new zone separate from M4');
    });
});
