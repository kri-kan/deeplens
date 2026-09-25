process.env.NODE_ENV = 'test';
process.env.NO_LOG_ROTATION = 'true';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isStandaloneEmoji, isBoundaryDelimiter, ZoningService, dynamicSeparatorsCache } from '../src/services/zoning.service';

describe('Dynamic Emoji Separator Matching (ADO #985)', () => {
    test('matches dynamically registered custom separator patterns', () => {
        // Register custom emoji combinations
        dynamicSeparatorsCache.add('🌸🌸🌸');
        dynamicSeparatorsCache.add('--- END ---');
        dynamicSeparatorsCache.add('🔻🔻🔻');

        assert.equal(isStandaloneEmoji('🌸🌸🌸'), true);
        assert.equal(isStandaloneEmoji('*🌸🌸🌸*'), true);
        assert.equal(isStandaloneEmoji('  --- END ---  '), true);
        assert.equal(isStandaloneEmoji('🔻🔻🔻'), true);

        // Standard emojis still match
        assert.equal(isStandaloneEmoji('🔚'), true);
        assert.equal(isStandaloneEmoji('🛑'), true);
        assert.equal(isStandaloneEmoji('🔶🔶🔶🔶'), true);

        // Non-matching regular text should fail
        assert.equal(isStandaloneEmoji('Party wear kurti set Rs 999'), false);
    });

    test('isBoundaryDelimiter recognizes registered custom separator', () => {
        dynamicSeparatorsCache.add('💎💎💎');

        assert.equal(isBoundaryDelimiter({ content: '💎💎💎' }, true), true);
        assert.equal(isBoundaryDelimiter({ content: '*💎💎💎*' }, true), true);
        assert.equal(isBoundaryDelimiter({ content: 'Unregistered text' }, true), false);
    });

    test('refreshDynamicSeparators populates cache from database client', async () => {
        const zoningService = new ZoningService();
        const mockClient = {
            query: async (sql: string) => {
                if (sql.includes('SELECT pattern FROM wa.emoji_separators WHERE is_active = true')) {
                    return {
                        rows: [
                            { pattern: '🔚' },
                            { pattern: '🛑' },
                            { pattern: '⭐️⭐️⭐️' },
                            { pattern: '🔱' }
                        ]
                    };
                }
                return { rows: [] };
            }
        };

        const patterns = await zoningService.refreshDynamicSeparators(mockClient);
        assert.ok(patterns.includes('⭐️⭐️⭐️'));
        assert.ok(patterns.includes('🔱'));
        assert.equal(isStandaloneEmoji('⭐️⭐️⭐️'), true);
        assert.equal(isStandaloneEmoji('🔱'), true);
    });

    test('repartitionForSeparator re-splits messages and syncs groups', async () => {
        const zoningService = new ZoningService();
        const executedQueries: Array<{ sql: string; params?: any[] }> = [];

        const mockClient = {
            query: async (sql: string, params?: any[]) => {
                executedQueries.push({ sql, params });

                if (sql.includes('SELECT pattern FROM wa.emoji_separators')) {
                    return { rows: [{ pattern: '🔚' }, { pattern: '🌸🌸🌸' }] };
                }
                if (sql.includes('SELECT DISTINCT jid FROM wa.messages')) {
                    return { rows: [{ jid: 'chat_test@g.us' }] };
                }
                if (sql.includes('SELECT enable_message_grouping')) {
                    return { rows: [{ grouping_config: { strategy: 'sticker' } }] };
                }
                if (sql.includes('SELECT id, message_id, jid, content')) {
                    return {
                        rows: [
                            { id: 1, message_id: 'm1', jid: 'chat_test@g.us', content: '[image]', media_type: 'image', timestamp: 100 },
                            { id: 2, message_id: 'm2', jid: 'chat_test@g.us', content: 'Kurti description', media_type: null, timestamp: 101 },
                            { id: 3, message_id: 'm3', jid: 'chat_test@g.us', content: '🌸🌸🌸', media_type: null, timestamp: 102 },
                            { id: 4, message_id: 'm4', jid: 'chat_test@g.us', content: '[image]', media_type: 'image', timestamp: 105 },
                        ]
                    };
                }
                if (sql.includes('UPDATE wa.messages SET group_id = $1 WHERE id = $2')) {
                    return { rowCount: 1 };
                }
                if (sql.includes('UPDATE wa.emoji_separators s SET match_count')) {
                    return { rowCount: 1 };
                }
                return { rows: [], rowCount: 1 };
            }
        };

        const result = await zoningService.repartitionForSeparator('🌸🌸🌸', 'chat_test@g.us', mockClient);

        assert.equal(result.affectedChats.length, 1);
        assert.equal(result.affectedChats[0], 'chat_test@g.us');
        assert.equal(result.totalMessages, 4);
        assert.equal(result.stickersFound, 1); // m3 is detected as separator
        assert.equal(result.zonesCreated, 2);  // zone before separator and zone after separator

        // Verify UPDATE query assigned sticker delimiter
        const delimiterUpdate = executedQueries.find(q => 
            q.sql.includes('UPDATE wa.messages') && q.sql.includes('sticker_')
        );
        assert.ok(delimiterUpdate, 'Expected messages matching pattern to be flagged as sticker delimiter');
    });
});
