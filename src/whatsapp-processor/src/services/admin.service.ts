import { getWhatsAppDbClient } from '../clients/db.client';
import { logger } from '../utils/logger';

/**
 * Reset database to clean slate
 * Deletes all chats, messages, and sync state
 */
export async function resetDatabase(): Promise<{
    success: boolean;
    message: string;
    deletedCounts: {
        chats: number;
        messages: number;
        syncState: number;
    };
}> {
    const client = getWhatsAppDbClient();
    if (!client) {
        return {
            success: false,
            message: 'Database client not available',
            deletedCounts: { chats: 0, messages: 0, syncState: 0 }
        };
    }

    try {
        logger.warn('🗑️  Starting database reset...');

        // Count before deletion
        const chatsCount = await client.query('SELECT COUNT(*) as count FROM chats');
        const messagesCount = await client.query('SELECT COUNT(*) as count FROM messages');
        const syncCount = await client.query('SELECT COUNT(*) as count FROM conversation_sync_state');

        const counts = {
            chats: parseInt(chatsCount.rows[0]?.count || '0'),
            messages: parseInt(messagesCount.rows[0]?.count || '0'),
            syncState: parseInt(syncCount.rows[0]?.count || '0')
        };

        logger.warn({ counts }, 'Current database state before reset');

        // Delete in correct order (respect foreign keys)
        await client.query('DELETE FROM conversation_sync_state');
        logger.info('✅ Deleted conversation_sync_state');

        await client.query('DELETE FROM messages');
        logger.info('✅ Deleted messages');

        await client.query('DELETE FROM chats');
        logger.info('✅ Deleted chats');

        logger.warn({ deletedCounts: counts }, '🗑️  Database reset complete');

        return {
            success: true,
            message: `Database reset successful. Deleted ${counts.chats} chats, ${counts.messages} messages, ${counts.syncState} sync states.`,
            deletedCounts: counts
        };
    } catch (err: any) {
        logger.error({ err }, 'Failed to reset database');
        return {
            success: false,
            message: `Database reset failed: ${err.message}`,
            deletedCounts: { chats: 0, messages: 0, syncState: 0 }
        };
    }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
    chats: {
        total: number;
        groups: number;
        individual: number;
        announcements: number;
        withUnread: number;
    };
    messages: {
        total: number;
        fromMe: number;
        fromOthers: number;
        edited: number;
        deleted: number;
    };
    syncState: {
        total: number;
        fullySynced: number;
        inProgress: number;
    };
}> {
    const client = getWhatsAppDbClient();
    if (!client) {
        throw new Error('Database client not available');
    }

    try {
        // Chat stats
        const chatStats = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_group = true AND is_announcement = false) as groups,
                COUNT(*) FILTER (WHERE is_group = false AND is_announcement = false) as individual,
                COUNT(*) FILTER (WHERE is_announcement = true) as announcements,
                COUNT(*) FILTER (WHERE unread_count > 0) as with_unread
            FROM chats
        `);

        // Message stats
        const messageStats = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_from_me = true) as from_me,
                COUNT(*) FILTER (WHERE is_from_me = false) as from_others,
                COUNT(*) FILTER (WHERE metadata->>'edited' = 'true') as edited,
                COUNT(*) FILTER (WHERE metadata->>'deleted' = 'true') as deleted
            FROM messages
        `);

        // Sync state stats
        const syncStats = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_fully_synced = true) as fully_synced,
                COUNT(*) FILTER (WHERE sync_in_progress = true) as in_progress
            FROM conversation_sync_state
        `);

        const stats = {
            chats: {
                total: parseInt(chatStats.rows[0]?.total || '0'),
                groups: parseInt(chatStats.rows[0]?.groups || '0'),
                individual: parseInt(chatStats.rows[0]?.individual || '0'),
                announcements: parseInt(chatStats.rows[0]?.announcements || '0'),
                withUnread: parseInt(chatStats.rows[0]?.with_unread || '0'),
            },
            messages: {
                total: parseInt(messageStats.rows[0]?.total || '0'),
                fromMe: parseInt(messageStats.rows[0]?.from_me || '0'),
                fromOthers: parseInt(messageStats.rows[0]?.from_others || '0'),
                edited: parseInt(messageStats.rows[0]?.edited || '0'),
                deleted: parseInt(messageStats.rows[0]?.deleted || '0'),
            },
            syncState: {
                total: parseInt(syncStats.rows[0]?.total || '0'),
                fullySynced: parseInt(syncStats.rows[0]?.fully_synced || '0'),
                inProgress: parseInt(syncStats.rows[0]?.in_progress || '0'),
            }
        };

        logger.info({ stats }, 'Database statistics retrieved');
        return stats;
    } catch (err) {
        logger.error({ err }, 'Failed to get database stats');
        throw err;
    }
}

/**
 * Get sample data from database
 */
export async function getSampleData(): Promise<{
    recentChats: any[];
    recentMessages: any[];
}> {
    const client = getWhatsAppDbClient();
    if (!client) {
        throw new Error('Database client not available');
    }

    try {
        const chats = await client.query(`
            SELECT jid, name, is_group, is_announcement, unread_count, 
                   last_message_text, last_message_timestamp
            FROM chats
            ORDER BY last_message_timestamp DESC NULLS LAST
            LIMIT 10
        `);

        const messages = await client.query(`
            SELECT message_id, jid, content, timestamp, is_from_me,
                   metadata->>'edited' as is_edited,
                   metadata->>'deleted' as is_deleted
            FROM messages
            ORDER BY timestamp DESC
            LIMIT 10
        `);

        return {
            recentChats: chats.rows,
            recentMessages: messages.rows
        };
    } catch (err) {
        logger.error({ err }, 'Failed to get sample data');
        throw err;
    }
}
