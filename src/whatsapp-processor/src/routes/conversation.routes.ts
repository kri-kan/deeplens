import { Router, Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import { getWhatsAppDbClient } from '../clients/db.client';
import { getMediaUrl } from '../clients/media.client';
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
                SELECT 
                    jid,
                    name,
                    is_group,
                    is_announcement,
                    unread_count,
                    last_message_text,
                    last_message_timestamp,
                    last_message_from_me,
                    is_pinned,
                    is_archived,
                    is_muted
                FROM chats
                ORDER BY 
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
                SELECT 
                    jid,
                    name,
                    is_group,
                    is_announcement,
                    is_community,
                    unread_count,
                    last_message_text,
                    last_message_timestamp,
                    last_message_from_me,
                    is_pinned,
                    is_archived,
                    is_muted
                FROM chats
                WHERE is_group = false 
                  AND is_announcement = false 
                  AND is_community = false
                ORDER BY 
                    -- Real names first, then numeric
                    (name !~ '^[0-9]+$') DESC,
                    -- Pinned and ordered
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
     * Returns only group conversations
     */
    router.get('/groups', async (req: Request, res: Response) => {
        try {
            const client = getWhatsAppDbClient();
            if (!client) {
                return res.status(503).json({ error: 'Database not available' });
            }

            const result = await client.query(`
                SELECT 
                    jid,
                    name,
                    is_group,
                    is_announcement,
                    is_community,
                    unread_count,
                    last_message_text,
                    last_message_timestamp,
                    last_message_from_me,
                    is_pinned,
                    is_archived,
                    is_muted
                FROM chats
                WHERE is_group = true AND is_announcement = false AND is_community = false
                ORDER BY 
                    is_pinned DESC,
                    pin_order DESC,
                    last_message_timestamp DESC NULLS LAST
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

            // Show all announcements (which now include what were formerly Communities)
            const result = await client.query(`
                SELECT 
                    jid,
                    name,
                    is_group,
                    is_announcement,
                    is_community,
                    unread_count,
                    last_message_text,
                    last_message_timestamp,
                    last_message_from_me,
                    is_pinned,
                    is_archived,
                    is_muted
                FROM chats
                WHERE is_announcement = true
                ORDER BY 
                    is_pinned DESC,
                    pin_order DESC,
                    last_message_timestamp DESC NULLS LAST
            `);

            res.json(result.rows);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get announcements');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/conversations/communities
     * Deprecated: Now returns empty as they are merged into announcements
     */
    router.get('/communities', async (req: Request, res: Response) => {
        res.json([]);
    });

    /**
     * GET /api/conversations/:jid/messages
     * Returns messages for a conversation with pagination
     */
    router.get('/:jid/messages', async (req: Request, res: Response) => {
        try {
            const { jid } = req.params;
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            const client = getWhatsAppDbClient();
            if (!client) {
                return res.status(503).json({ error: 'Database not available' });
            }

            const result = await client.query(
                `SELECT 
                    message_id,
                    jid as chat_jid,
                    sender as sender_jid,
                    content as message_text,
                    message_type,
                    timestamp,
                    is_from_me,
                    media_url,
                    metadata
                FROM messages
                WHERE jid = $1
                ORDER BY timestamp DESC
                LIMIT $2 OFFSET $3`,
                [jid, limit, offset]
            );

            // Get total count
            const countResult = await client.query(
                'SELECT COUNT(*) FROM messages WHERE jid = $1',
                [jid]
            );

            // Resolve media URLs
            const messages = await Promise.all(result.rows.map(async (msg: any) => {
                if (msg.media_url && msg.media_url.startsWith('minio://')) {
                    try {
                        const objectName = msg.media_url.replace('minio://', '').split('/').slice(1).join('/');
                        msg.media_url = await getMediaUrl(objectName);
                    } catch (err) {
                        logger.error({ err, url: msg.media_url }, 'Failed to resolve media URL');
                    }
                }
                return msg;
            }));

            res.json({
                messages,
                total: parseInt(countResult.rows[0].count),
                limit,
                offset
            });
        } catch (err: any) {
            logger.error({ err }, 'Failed to get messages');
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
