import { WASocket, WAMessage, downloadMediaMessage } from '@whiskeysockets/baileys';
import { getWhatsAppDbClient } from '../clients/db.client';
import { saveMessage, MessageRecord } from '../utils/messages';
import pino from 'pino';

const logger = pino({ level: 'info' });

export interface ConversationSyncStatus {
    jid: string;
    isFullySynced: boolean;
    syncInProgress: boolean;
    totalMessagesSynced: number;
    estimatedTotalMessages?: number;
    lastSyncAt?: Date;
    firstSyncAt?: Date;
}

/**
 * Get the sync status for a conversation
 */
export async function getConversationSyncStatus(jid: string): Promise<ConversationSyncStatus | null> {
    const client = getWhatsAppDbClient();
    if (!client) return null;

    try {
        const result = await client.query(
            `SELECT 
                jid,
                is_fully_synced,
                sync_in_progress,
                total_messages_synced,
                estimated_total_messages,
                last_sync_at,
                first_sync_at
            FROM conversation_sync_state
            WHERE jid = $1`,
            [jid]
        );

        if (result.rows.length === 0) {
            return {
                jid,
                isFullySynced: false,
                syncInProgress: false,
                totalMessagesSynced: 0
            };
        }

        const row = result.rows[0];
        return {
            jid: row.jid,
            isFullySynced: row.is_fully_synced,
            syncInProgress: row.sync_in_progress,
            totalMessagesSynced: row.total_messages_synced,
            estimatedTotalMessages: row.estimated_total_messages,
            lastSyncAt: row.last_sync_at,
            firstSyncAt: row.first_sync_at
        };
    } catch (err) {
        logger.error({ err, jid }, 'Failed to get conversation sync status');
        return null;
    }
}

/**
 * Initialize sync state for a conversation
 */
async function initializeSyncState(jid: string): Promise<void> {
    const client = getWhatsAppDbClient();
    if (!client) return;

    try {
        await client.query(
            `INSERT INTO conversation_sync_state (jid, created_at, updated_at)
            VALUES ($1, NOW(), NOW())
            ON CONFLICT (jid) DO NOTHING`,
            [jid]
        );
    } catch (err) {
        logger.error({ err, jid }, 'Failed to initialize sync state');
    }
}

/**
 * Update sync state after syncing messages
 */
async function updateSyncState(
    jid: string,
    messagesSynced: number,
    oldestMessageTimestamp: number,
    isComplete: boolean
): Promise<void> {
    const client = getWhatsAppDbClient();
    if (!client) return;

    try {
        await client.query(
            `INSERT INTO conversation_sync_state (
                jid, 
                is_fully_synced, 
                sync_in_progress,
                total_messages_synced,
                last_synced_message_timestamp,
                last_sync_at,
                first_sync_at,
                updated_at
            )
            VALUES ($1, $2, false, $3, $4, NOW(), NOW(), NOW())
            ON CONFLICT (jid) DO UPDATE SET
                is_fully_synced = EXCLUDED.is_fully_synced,
                sync_in_progress = false,
                total_messages_synced = conversation_sync_state.total_messages_synced + EXCLUDED.total_messages_synced,
                last_synced_message_timestamp = LEAST(
                    COALESCE(conversation_sync_state.last_synced_message_timestamp, EXCLUDED.last_synced_message_timestamp),
                    EXCLUDED.last_synced_message_timestamp
                ),
                last_sync_at = NOW(),
                first_sync_at = COALESCE(conversation_sync_state.first_sync_at, NOW()),
                updated_at = NOW()`,
            [jid, isComplete, messagesSynced, oldestMessageTimestamp]
        );
    } catch (err) {
        logger.error({ err, jid }, 'Failed to update sync state');
    }
}

/**
 * Mark sync as in progress
 */
async function markSyncInProgress(jid: string, inProgress: boolean): Promise<void> {
    const client = getWhatsAppDbClient();
    if (!client) return;

    try {
        await client.query(
            `UPDATE conversation_sync_state
            SET sync_in_progress = $2, updated_at = NOW()
            WHERE jid = $1`,
            [jid, inProgress]
        );
    } catch (err) {
        logger.error({ err, jid }, 'Failed to mark sync progress');
    }
}

/**
 * Sync conversation history from WhatsApp
 * @param sock WhatsApp socket
 * @param jid Conversation JID
 * @param limit Number of messages to fetch (default: 50 for sparse, 1000 for full)
 * @param fullSync Whether to sync all history or just recent messages
 */
export async function syncConversationHistory(
    sock: WASocket,
    jid: string,
    limit: number = 50,
    fullSync: boolean = false
): Promise<{ success: boolean; messagesSynced: number; error?: string }> {
    try {
        // Initialize sync state if not exists
        await initializeSyncState(jid);

        // Check if already syncing
        const status = await getConversationSyncStatus(jid);
        if (status?.syncInProgress) {
            return {
                success: false,
                messagesSynced: 0,
                error: 'Sync already in progress for this conversation'
            };
        }

        // Mark as in progress
        await markSyncInProgress(jid, true);

        logger.info({ jid, limit, fullSync }, 'Starting conversation history sync');

        let totalSynced = 0;
        let oldestTimestamp = Date.now();
        let hasMore = true;
        const batchSize = 50; // Fetch in batches of 50

        try {
            while (hasMore) {
                const messagesToFetch = fullSync ? batchSize : Math.min(limit - totalSynced, batchSize);
                if (messagesToFetch <= 0) break;

                // Fetch messages from WhatsApp
                const messages = await sock.fetchMessagesFromWA(jid, messagesToFetch, {
                    before: oldestTimestamp
                });

                if (!messages || messages.length === 0) {
                    hasMore = false;
                    break;
                }

                // Save each message to database
                for (const msg of messages) {
                    if (msg.message) {
                        await saveMessage(msg, jid);

                        // Track oldest timestamp
                        if (msg.messageTimestamp) {
                            const timestamp = typeof msg.messageTimestamp === 'number'
                                ? msg.messageTimestamp
                                : parseInt(msg.messageTimestamp.toString());
                            oldestTimestamp = Math.min(oldestTimestamp, timestamp * 1000);
                        }
                    }
                }

                totalSynced += messages.length;

                // If we got fewer messages than requested, we've reached the end
                if (messages.length < messagesToFetch) {
                    hasMore = false;
                }

                // For sparse sync, stop after first batch
                if (!fullSync) {
                    hasMore = false;
                }

                logger.info({ jid, totalSynced, hasMore }, 'Synced batch of messages');
            }

            // Update sync state
            await updateSyncState(jid, totalSynced, oldestTimestamp, !hasMore || !fullSync);

            logger.info({ jid, totalSynced }, 'Conversation history sync completed');

            return {
                success: true,
                messagesSynced: totalSynced
            };
        } catch (err: any) {
            logger.error({ err, jid }, 'Error during message sync');
            await markSyncInProgress(jid, false);
            return {
                success: false,
                messagesSynced: totalSynced,
                error: err.message
            };
        }
    } catch (err: any) {
        logger.error({ err, jid }, 'Failed to sync conversation history');
        await markSyncInProgress(jid, false);
        return {
            success: false,
            messagesSynced: 0,
            error: err.message
        };
    }
}

/**
 * Get conversations with their sync status
 */
export async function getConversationsWithSyncStatus(): Promise<any[]> {
    const client = getWhatsAppDbClient();
    if (!client) return [];

    try {
        const result = await client.query(
            `SELECT 
                c.jid,
                c.name,
                c.is_group,
                c.last_message_at,
                c.metadata,
                COALESCE(s.is_fully_synced, false) as is_fully_synced,
                COALESCE(s.sync_in_progress, false) as sync_in_progress,
                COALESCE(s.total_messages_synced, 0) as total_messages_synced,
                s.last_sync_at,
                (SELECT COUNT(*) FROM messages WHERE chat_jid = c.jid) as message_count,
                (SELECT message_text FROM messages WHERE chat_jid = c.jid ORDER BY timestamp DESC LIMIT 1) as last_message
            FROM chats c
            LEFT JOIN conversation_sync_state s ON c.jid = s.jid
            ORDER BY c.last_message_at DESC NULLS LAST`
        );

        return result.rows;
    } catch (err) {
        logger.error({ err }, 'Failed to get conversations with sync status');
        return [];
    }
}
