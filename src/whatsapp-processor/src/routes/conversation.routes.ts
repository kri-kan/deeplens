import { Router, Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import {
    syncConversationHistory,
    getConversationSyncStatus,
    getConversationsWithSyncStatus
} from '../services/conversation-sync.service';
import { getWhatsAppDbClient } from '../clients/db.client';
import pino from 'pino';

const logger = pino({ level: 'info' });

export function createConversationRoutes(waService: WhatsAppService): Router {
    const router = Router();

    /**
     * GET /api/conversations
     * Returns all conversations with sync status and last message
     */
    router.get('/', async (req: Request, res: Response) => {
        try {
            const conversations = await getConversationsWithSyncStatus();
            res.json(conversations);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get conversations');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/conversations/chats
     * Returns only individual 1-on-1 chats with sync status
     */
    router.get('/chats', async (req: Request, res: Response) => {
        try {
            const conversations = await getConversationsWithSyncStatus();
            const chats = conversations.filter(c => !c.is_group && !c.metadata?.isAnnouncement);
            res.json(chats);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get chats');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/conversations/groups
     * Returns only group conversations with sync status
     */
    router.get('/groups', async (req: Request, res: Response) => {
        try {
            const conversations = await getConversationsWithSyncStatus();
            const groups = conversations.filter(c => c.is_group && !c.metadata?.isAnnouncement);
            res.json(groups);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get groups');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/conversations/announcements
     * Returns only announcement channels with sync status
     */
    router.get('/announcements', async (req: Request, res: Response) => {
        try {
            const conversations = await getConversationsWithSyncStatus();
            const announcements = conversations.filter(c => c.metadata?.isAnnouncement === true);
            res.json(announcements);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get announcements');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/conversations/:jid/sync-status
     * Returns the sync status for a specific conversation
     */
    router.get('/:jid/sync-status', async (req: Request, res: Response) => {
        try {
            const { jid } = req.params;
            const status = await getConversationSyncStatus(jid);

            if (!status) {
                return res.status(404).json({ error: 'Conversation not found' });
            }

            res.json(status);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get sync status');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/conversations/:jid/sync
     * Triggers a history sync for a conversation
     * Body: { fullSync?: boolean, limit?: number }
     */
    router.post('/:jid/sync', async (req: Request, res: Response) => {
        try {
            const { jid } = req.params;
            const { fullSync = false, limit = 50 } = req.body;

            const sock = waService.getSocket();
            if (!sock) {
                return res.status(503).json({ error: 'WhatsApp not connected' });
            }

            // Start sync in background
            syncConversationHistory(sock, jid, limit, fullSync)
                .then(result => {
                    logger.info({ jid, result }, 'Sync completed');
                })
                .catch(err => {
                    logger.error({ err, jid }, 'Sync failed');
                });

            res.json({
                success: true,
                message: 'Sync started',
                jid,
                fullSync,
                limit
            });
        } catch (err: any) {
            logger.error({ err }, 'Failed to start sync');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/conversations/:jid/messages
     * Returns messages for a conversation with pagination
     * Query params: limit (default 50), offset (default 0)
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
                    chat_jid,
                    sender_jid,
                    message_text,
                    message_type,
                    timestamp,
                    is_from_me,
                    media_url,
                    metadata
                FROM messages
                WHERE chat_jid = $1
                ORDER BY timestamp DESC
                LIMIT $2 OFFSET $3`,
                [jid, limit, offset]
            );

            // Get total count
            const countResult = await client.query(
                'SELECT COUNT(*) FROM messages WHERE chat_jid = $1',
                [jid]
            );

            res.json({
                messages: result.rows,
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
