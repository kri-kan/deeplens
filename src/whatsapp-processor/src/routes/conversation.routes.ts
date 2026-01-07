import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { WhatsAppService } from '../services/whatsapp.service';
import { getWhatsAppDbClient } from '../clients/db.client';
import { getPresignedUrl } from '../clients/media.client';
import pino from 'pino';

const logger = pino({ level: 'info' });

export function createConversationRoutes(waService: WhatsAppService): Router {
    const router = Router();

    /**
     * GET /api/conversations
     * Returns all conversations with sync status and last message
     */
    router.get('/', async (req: Request, res: Response) => {
        logger.info('GET /api/conversations hit');
        try {
            const client = getWhatsAppDbClient();
            if (!client) {
                return res.status(503).json({ error: 'Database not available' });
            }

            const result = await client.query(`
                SELECT * FROM (
                    SELECT DISTINCT ON (canonical_jid)
                        jid, name, is_group, is_announcement, unread_count,
                        last_message_text, last_message_timestamp, last_message_from_me,
                        is_pinned, is_archived, is_muted, canonical_jid, pin_order
                    FROM chats
                    ORDER BY 
                        canonical_jid,
                        (name !~ '^[0-9]+$') DESC,
                        last_message_timestamp DESC NULLS LAST
                ) sub
                ORDER BY 
                    is_archived ASC,
                    is_pinned DESC,
                    pin_order DESC,
                    last_message_timestamp DESC NULLS LAST
            `);

            res.json(result.rows);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get conversations');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/conversations/chats
     * Returns only individual 1-on-1 chats
     */
    router.get('/chats', async (req: Request, res: Response) => {
        logger.info('GET /api/conversations/chats hit');
        try {
            const client = getWhatsAppDbClient();
            if (!client) {
                return res.status(503).json({ error: 'Database not available' });
            }

            const result = await client.query(`
                SELECT * FROM (
                    SELECT DISTINCT ON (c.canonical_jid)
                        c.jid, c.name, c.is_group, c.is_announcement, c.unread_count,
                        c.last_message_text, c.last_message_timestamp, c.last_message_from_me,
                        c.is_pinned, c.is_archived, c.is_muted, c.canonical_jid, c.pin_order
                    FROM chats c
                    LEFT JOIN chat_tracking_state t ON c.jid = t.jid
                    WHERE c.is_group = false AND c.is_announcement = false
                      AND (t.is_excluded = false OR t.is_excluded IS NULL)
                    ORDER BY 
                        c.canonical_jid,
                        (c.name !~ '^[0-9]+$') DESC,
                        c.last_message_timestamp DESC NULLS LAST
                ) sub
                ORDER BY 
                    is_archived ASC,
                    is_pinned DESC,
                    pin_order DESC,
                    last_message_timestamp DESC NULLS LAST
            `);

            res.json(result.rows);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get chats');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/conversations/groups
     * Returns standalone groups (not part of communities)
     */
    router.get('/groups', async (req: Request, res: Response) => {
        try {
            const client = getWhatsAppDbClient();
            if (!client) {
                return res.status(503).json({ error: 'Database not available' });
            }

            const result = await client.query(`
                SELECT 
                    c.jid,
                    c.name,
                    c.is_group,
                    c.is_announcement,
                    c.unread_count,
                    c.last_message_text,
                    c.last_message_timestamp,
                    c.last_message_from_me,
                    c.is_pinned,
                    c.is_archived,
                    c.is_muted
                FROM chats c
                LEFT JOIN chat_tracking_state t ON c.jid = t.jid
                WHERE c.is_group = true AND c.is_announcement = false
                  AND (t.is_excluded = false OR t.is_excluded IS NULL)
                ORDER BY 
                    c.is_pinned DESC,
                    c.pin_order DESC,
                    c.last_message_timestamp DESC NULLS LAST
            `);

            res.json(result.rows);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get groups');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/conversations/announcements
     * Returns only announcement channels (including former Communities)
     */
    router.get('/announcements', async (req: Request, res: Response) => {
        try {
            const client = getWhatsAppDbClient();
            if (!client) {
                return res.status(503).json({ error: 'Database not available' });
            }

            const result = await client.query(`
                SELECT 
                    c.jid,
                    c.name,
                    c.is_group,
                    c.is_announcement,
                    c.unread_count,
                    c.last_message_text,
                    c.last_message_timestamp,
                    c.last_message_from_me,
                    c.is_pinned,
                    c.is_archived,
                    c.is_muted
                FROM chats c
                LEFT JOIN chat_tracking_state t ON c.jid = t.jid
                WHERE c.is_announcement = true
                  AND (t.is_excluded = false OR t.is_excluded IS NULL)
                ORDER BY 
                    c.is_pinned DESC,
                    c.pin_order DESC,
                    c.last_message_timestamp DESC NULLS LAST
            `);

            res.json(result.rows);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get announcements');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/conversations/:jid
     * Returns details for a single conversation
     */
    router.get('/:jid', async (req: Request, res: Response) => {
        const { jid } = req.params;
        try {
            const client = getWhatsAppDbClient();
            if (!client) {
                return res.status(503).json({ error: 'Database not available' });
            }

            const result = await client.query(
                'SELECT * FROM chats WHERE jid = $1',
                [jid]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Conversation not found' });
            }

            res.json(result.rows[0]);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/conversations/:jid/messages
     * Returns paginated messages for a conversation
     */
    router.get('/:jid/messages', async (req: Request, res: Response) => {
        const { jid } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        try {
            const client = getWhatsAppDbClient();
            if (!client) {
                return res.status(503).json({ error: 'Database not available' });
            }

            const result = await client.query(`
                WITH chat_info AS (
                    SELECT COALESCE(canonical_jid, jid) as base_jid 
                    FROM chats 
                    WHERE jid = $1 
                    LIMIT 1
                )
                SELECT 
                    message_id,
                    jid as chat_jid,
                    sender as sender_jid,
                    content as message_text,
                    message_type,
                    media_type,
                    media_url,
                    timestamp,
                    is_from_me,
                    metadata,
                    group_id
                FROM messages
                WHERE jid = $1 
                   OR jid = (SELECT base_jid FROM chat_info)
                   OR jid IN (SELECT jid FROM chats WHERE canonical_jid = (SELECT base_jid FROM chat_info))
                ORDER BY timestamp DESC
                LIMIT $2 OFFSET $3
            `, [jid, limit, offset]);

            // Resolve media URLs
            const messages = await Promise.all(result.rows.map(async (msg) => {
                if (msg.media_url && msg.media_url.startsWith('minio://')) {
                    try {
                        const objectName = msg.media_url.replace(/^minio:\/\/[^\/]+\//, '');
                        msg.media_url = await getPresignedUrl(objectName);
                    } catch (err) {
                        logger.error({ err, id: msg.message_id }, 'Failed to get presigned URL');
                    }
                }
                return msg;
            }));

            const totalResult = await client.query(`
                WITH chat_info AS (
                    SELECT COALESCE(canonical_jid, jid) as base_jid 
                    FROM chats 
                    WHERE jid = $1 
                    LIMIT 1
                )
                SELECT COUNT(*) FROM messages 
                WHERE jid = $1 
                   OR jid = (SELECT base_jid FROM chat_info)
                   OR jid IN (SELECT jid FROM chats WHERE canonical_jid = (SELECT base_jid FROM chat_info))
            `, [jid]);

            res.json({
                messages: messages.reverse(), // Return in chronological order
                total: parseInt(totalResult.rows[0].count)
            });
        } catch (err: any) {
            logger.error({ err, jid }, 'Failed to get messages');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/conversations/:jid/sync-history
     * Manually trigger deep sync for a specific chat
     */
    router.post('/:jid/sync-history', async (req: Request, res: Response) => {
        const jid = decodeURIComponent(req.params.jid);
        logger.info({ jid }, 'Manual deep sync requested');

        try {
            const sock = waService.getSocket();
            if (!sock) {
                return res.status(503).json({ error: 'WhatsApp not connected' });
            }

            const client = getWhatsAppDbClient();
            if (!client) {
                return res.status(503).json({ error: 'Database not available' });
            }

            // Note: WhatsApp (Baileys) doesn't provide an API to pull historical messages on demand
            // Historical messages are only available through initial sync or real-time arrival

            // Get current message count and deep sync status
            const chatResult = await client.query(
                'SELECT deep_sync_enabled FROM chats WHERE jid = $1',
                [jid]
            );

            const countResult = await client.query(
                'SELECT COUNT(*) as count FROM messages WHERE jid = $1',
                [jid]
            );

            const currentCount = parseInt(countResult.rows[0]?.count || '0');
            const deepSyncEnabled = chatResult.rows[0]?.deep_sync_enabled || false;

            // Get oldest and newest message timestamps
            const rangeResult = await client.query(
                `SELECT 
                    MIN(timestamp) as oldest,
                    MAX(timestamp) as newest
                FROM messages WHERE jid = $1`,
                [jid]
            );

            const oldest = rangeResult.rows[0]?.oldest;
            const newest = rangeResult.rows[0]?.newest;

            res.json({
                success: true,
                messagesSynced: 0,
                totalFetched: 0,
                currentMessageCount: currentCount,
                deepSyncEnabled,
                oldestMessage: oldest ? new Date(oldest * 1000).toISOString() : null,
                newestMessage: newest ? new Date(newest * 1000).toISOString() : null,
                note: 'WhatsApp does not provide an API to fetch historical messages on demand. Messages are synced in real-time as they arrive. To import historical messages, use WhatsApp\'s official export feature or enable full sync on initial connection.'
            });
        } catch (err: any) {
            logger.error({ err, jid }, 'Failed to sync chat history');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/conversations/:jid/deep-sync
     * Enable deep sync for a specific chat
     */
    router.post('/:jid/deep-sync', async (req: Request, res: Response) => {
        const jid = decodeURIComponent(req.params.jid);
        const { enabled } = req.body;
        logger.info({ jid, enabled }, 'Deep sync toggle requested');

        try {
            const client = getWhatsAppDbClient();
            if (!client) {
                return res.status(503).json({ error: 'Database not available' });
            }

            await client.query(
                'UPDATE chats SET deep_sync_enabled = $2 WHERE jid = $1',
                [jid, enabled === true]
            );

            res.json({ success: true, jid, deep_sync_enabled: enabled === true });
        } catch (err: any) {
            logger.error({ err, jid }, 'Failed to toggle deep sync');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/conversations/:jid/message-grouping
     * Enable/disable message grouping and set configuration
     */
    router.post('/:jid/message-grouping', async (req: Request, res: Response) => {
        const jid = decodeURIComponent(req.params.jid);
        const { enabled, config } = req.body;
        logger.info({ jid, enabled, config }, 'Message grouping toggle requested');

        try {
            const client = getWhatsAppDbClient();
            if (!client) {
                return res.status(503).json({ error: 'Database not available' });
            }

            let query = 'UPDATE chats SET enable_message_grouping = $2';
            const params: any[] = [jid, enabled === true];

            if (config && enabled === true) {
                query += ', grouping_config = $3';
                params.push(config);
            }

            query += ' WHERE jid = $1';

            await client.query(query, params);

            res.json({ success: true, jid, enable_message_grouping: enabled === true, grouping_config: config });
        } catch (err: any) {
            logger.error({ err, jid }, 'Failed to toggle message grouping');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/conversations/:jid/messages/:messageId/split-group
     * Splits group at this message (start new group)
     */
    router.post('/:jid/messages/:messageId/split-group', async (req: Request, res: Response) => {
        const { jid, messageId } = req.params;
        try {
            const client = getWhatsAppDbClient();
            if (!client) return res.status(503).json({ error: 'Database not available' });

            // 1. Get current message
            const msgRes = await client.query('SELECT group_id, timestamp, media_type FROM messages WHERE message_id = $1', [messageId]);
            if (msgRes.rows.length === 0) return res.status(404).json({ error: 'Message not found' });

            const msg = msgRes.rows[0];
            if (!msg.group_id) return res.status(400).json({ error: 'Message is not in a group' });

            // 2. Generate New UUID with Prefix
            const rawUUID = randomUUID();
            let prefix = 'chat_';
            if (msg.media_type === 'sticker') {
                prefix = 'sticker_';
            } else if (['image', 'photo', 'video'].includes(msg.media_type)) {
                prefix = 'product_';
            }
            const newGroupId = `${prefix}${rawUUID}`;

            // 3. Update this and subsequent messages in SAME group
            // We verify jid to be safe
            await client.query(`
                UPDATE messages 
                SET group_id = $1 
                WHERE jid = $2 
                  AND group_id = $3 
                  AND timestamp >= $4
            `, [newGroupId, decodeURIComponent(jid), msg.group_id, msg.timestamp]);

            res.json({ success: true, newGroupId });
        } catch (err: any) {
            logger.error({ err }, 'Failed to split group');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/conversations/:jid/messages/:messageId/move-group
     * Move message to previous or next group (Boundary Correction)
     */
    router.post('/:jid/messages/:messageId/move-group', async (req: Request, res: Response) => {
        const { jid, messageId } = req.params;
        const { direction } = req.body; // 'prev' or 'next'

        try {
            const client = getWhatsAppDbClient();
            if (!client) return res.status(503).json({ error: 'Database not available' });

            const msgRes = await client.query('SELECT timestamp, group_id FROM messages WHERE message_id = $1', [messageId]);
            if (msgRes.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
            const currentMsg = msgRes.rows[0];

            let targetQuery = '';
            let targetParams: any[] = [];

            if (direction === 'prev') {
                targetQuery = `SELECT group_id FROM messages WHERE jid = $1 AND timestamp < $2 ORDER BY timestamp DESC LIMIT 1`;
                targetParams = [decodeURIComponent(jid), currentMsg.timestamp];
            } else {
                targetQuery = `SELECT group_id FROM messages WHERE jid = $1 AND timestamp > $2 ORDER BY timestamp ASC LIMIT 1`;
                targetParams = [decodeURIComponent(jid), currentMsg.timestamp];
            }

            const targetRes = await client.query(targetQuery, targetParams);
            if (targetRes.rows.length === 0) return res.status(400).json({ error: 'No adjacent message found' });

            const targetGroupId = targetRes.rows[0].group_id;
            if (!targetGroupId) return res.status(400).json({ error: 'Target message is not in a group' });

            await client.query('UPDATE messages SET group_id = $1 WHERE message_id = $2', [targetGroupId, messageId]);

            res.json({ success: true, newGroupId: targetGroupId });
        } catch (err: any) {
            logger.error({ err }, 'Failed to move message group');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * DELETE /api/conversations/:jid/messages
     * Purges all messages and media for a chat while preserving chat metadata
     */
    router.delete('/:jid/messages', async (req: Request, res: Response) => {
        const jid = decodeURIComponent(req.params.jid);
        logger.info({ jid }, 'Purge messages requested');

        try {
            const client = getWhatsAppDbClient();
            if (!client) {
                return res.status(503).json({ error: 'Database not available' });
            }

            // Start transaction
            await client.query('BEGIN');

            try {
                // Get count of messages to be deleted
                const countResult = await client.query(
                    'SELECT COUNT(*) as count FROM messages WHERE jid = $1',
                    [jid]
                );
                const messageCount = parseInt(countResult.rows[0]?.count || '0');

                // Get all media URLs that need to be cleaned up (for logging/future cleanup)
                const mediaResult = await client.query(
                    'SELECT media_url FROM messages WHERE jid = $1 AND media_url IS NOT NULL',
                    [jid]
                );
                const mediaUrls = mediaResult.rows.map(row => row.media_url);

                // Delete all messages for this chat
                await client.query(
                    'DELETE FROM messages WHERE jid = $1',
                    [jid]
                );

                // Reset chat's last message fields but keep the chat record
                await client.query(`
                    UPDATE chats 
                    SET last_message_text = NULL,
                        last_message_timestamp = NULL,
                        last_message_from_me = NULL,
                        unread_count = 0,
                        updated_at = NOW()
                    WHERE jid = $1
                `, [jid]);

                // Commit transaction
                await client.query('COMMIT');

                logger.info({
                    jid,
                    messagesDeleted: messageCount,
                    mediaFilesReferenced: mediaUrls.length
                }, 'Successfully purged chat messages');

                res.json({
                    success: true,
                    jid,
                    messagesDeleted: messageCount,
                    mediaFilesReferenced: mediaUrls.length,
                    note: 'All messages deleted. Chat metadata preserved. Media files remain in storage for potential recovery.'
                });

            } catch (err) {
                // Rollback on error
                await client.query('ROLLBACK');
                throw err;
            }

        } catch (err: any) {
            logger.error({ err, jid }, 'Failed to purge chat messages');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/conversations/bulk-delete-messages
     * Purges all messages for multiple chats while preserving chat metadata
     */
    router.post('/bulk-delete-messages', async (req: Request, res: Response) => {
        const { jids } = req.body;

        if (!Array.isArray(jids) || jids.length === 0) {
            return res.status(400).json({ error: 'jids array is required and must not be empty' });
        }

        logger.info({ count: jids.length }, 'Bulk purge messages requested');

        try {
            const client = getWhatsAppDbClient();
            if (!client) {
                return res.status(503).json({ error: 'Database not available' });
            }

            // Start transaction
            await client.query('BEGIN');

            try {
                let totalMessagesDeleted = 0;
                let totalMediaFiles = 0;
                const results: Array<{ jid: string; messagesDeleted: number; mediaFiles: number }> = [];

                for (const jid of jids) {
                    // Get count of messages to be deleted
                    const countResult = await client.query(
                        'SELECT COUNT(*) as count FROM messages WHERE jid = $1',
                        [jid]
                    );
                    const messageCount = parseInt(countResult.rows[0]?.count || '0');

                    // Get all media URLs
                    const mediaResult = await client.query(
                        'SELECT media_url FROM messages WHERE jid = $1 AND media_url IS NOT NULL',
                        [jid]
                    );
                    const mediaCount = mediaResult.rows.length;

                    // Delete all messages for this chat
                    await client.query(
                        'DELETE FROM messages WHERE jid = $1',
                        [jid]
                    );

                    // Reset chat's last message fields
                    await client.query(`
                        UPDATE chats 
                        SET last_message_text = NULL,
                            last_message_timestamp = NULL,
                            last_message_from_me = NULL,
                            unread_count = 0,
                            updated_at = NOW()
                        WHERE jid = $1
                    `, [jid]);

                    totalMessagesDeleted += messageCount;
                    totalMediaFiles += mediaCount;
                    results.push({ jid, messagesDeleted: messageCount, mediaFiles: mediaCount });
                }

                // Commit transaction
                await client.query('COMMIT');

                logger.info({
                    chatsProcessed: jids.length,
                    totalMessagesDeleted,
                    totalMediaFiles
                }, 'Successfully bulk purged chat messages');

                res.json({
                    success: true,
                    chatsProcessed: jids.length,
                    totalMessagesDeleted,
                    totalMediaFiles,
                    results,
                    note: 'All messages deleted for selected chats. Chat metadata preserved.'
                });

            } catch (err) {
                // Rollback on error
                await client.query('ROLLBACK');
                throw err;
            }

        } catch (err: any) {
            logger.error({ err, jidsCount: jids.length }, 'Failed to bulk purge chat messages');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/conversations/:jid/stats
     * Get detailed statistics for a conversation
     */
    router.get('/:jid/stats', async (req: Request, res: Response) => {
        const jid = decodeURIComponent(req.params.jid);
        logger.info({ jid }, 'Fetching conversation stats');

        try {
            const client = getWhatsAppDbClient();
            if (!client) {
                return res.status(503).json({ error: 'Database not available' });
            }

            // Get chat metadata
            const chatResult = await client.query(
                'SELECT * FROM chats WHERE jid = $1',
                [jid]
            );

            if (chatResult.rows.length === 0) {
                return res.status(404).json({ error: 'Chat not found' });
            }

            const chat = chatResult.rows[0];

            // Get message statistics
            const messageStats = await client.query(`
                SELECT 
                    COUNT(*) as total_messages,
                    COUNT(CASE WHEN is_from_me = true THEN 1 END) as sent_messages,
                    COUNT(CASE WHEN is_from_me = false THEN 1 END) as received_messages,
                    MIN(timestamp) as oldest_message_timestamp,
                    MAX(timestamp) as newest_message_timestamp
                FROM messages
                WHERE jid = $1
            `, [jid]);

            // Get media statistics
            const mediaStats = await client.query(`
                SELECT 
                    COUNT(CASE WHEN media_type = 'photo' THEN 1 END) as photos,
                    COUNT(CASE WHEN media_type = 'video' THEN 1 END) as videos,
                    COUNT(CASE WHEN media_type = 'audio' THEN 1 END) as audio,
                    COUNT(CASE WHEN media_type = 'document' THEN 1 END) as documents,
                    COUNT(CASE WHEN media_type = 'sticker' THEN 1 END) as stickers,
                    COUNT(CASE WHEN media_url IS NOT NULL THEN 1 END) as total_media
                FROM messages
                WHERE jid = $1
            `, [jid]);

            const stats = messageStats.rows[0];
            const media = mediaStats.rows[0];

            res.json({
                jid: chat.jid,
                name: chat.name,
                is_group: chat.is_group,
                is_announcement: chat.is_announcement,
                is_excluded: chat.is_excluded,
                deep_sync_enabled: chat.deep_sync_enabled,
                enable_message_grouping: chat.enable_message_grouping,
                created_at: chat.created_at,
                updated_at: chat.updated_at,
                last_message_timestamp: chat.last_message_timestamp,
                messages: {
                    total: parseInt(stats.total_messages || '0'),
                    sent: parseInt(stats.sent_messages || '0'),
                    received: parseInt(stats.received_messages || '0'),
                    oldest_timestamp: stats.oldest_message_timestamp,
                    newest_timestamp: stats.newest_message_timestamp
                },
                media: {
                    total: parseInt(media.total_media || '0'),
                    photos: parseInt(media.photos || '0'),
                    videos: parseInt(media.videos || '0'),
                    audio: parseInt(media.audio || '0'),
                    documents: parseInt(media.documents || '0'),
                    stickers: parseInt(media.stickers || '0')
                }
            });

        } catch (err: any) {
            logger.error({ err, jid }, 'Failed to fetch conversation stats');
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
