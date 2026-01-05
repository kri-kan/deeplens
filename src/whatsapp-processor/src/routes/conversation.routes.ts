import { Router, Request, Response } from 'express';
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
                    metadata
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

    return router;
}
