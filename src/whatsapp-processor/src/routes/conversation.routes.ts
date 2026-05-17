import { Router } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import { ConversationService } from '../services/conversation.service';
import { ConversationController } from '../controllers/conversation.controller';

export function createConversationRoutes(waService: WhatsAppService): Router {
    const router = Router();
    const service = new ConversationService(waService);
    const controller = new ConversationController(service);

    /**
     * GET /api/conversations
     * Returns all conversations with sync status and last message
     */
    router.get('/', (req, res) => controller.getAll(req, res));

    /**
     * GET /api/conversations/chats
     * Returns only individual 1-on-1 chats
     */
    router.get('/chats', (req, res) => controller.getChats(req, res));

    /**
     * GET /api/conversations/groups
     * Returns standalone groups (not part of communities)
     */
    router.get('/groups', (req, res) => controller.getGroups(req, res));

    /**
     * GET /api/conversations/announcements
     * Returns only announcement channels (including former Communities)
     */
    router.get('/announcements', (req, res) => controller.getAnnouncements(req, res));

    /**
     * GET /api/conversations/:jid/stats
     * Returns detailed stats (message counts, media breakdown) for a conversation
     */
    router.get('/:jid/stats', (req, res) => controller.getStats(req, res));

    /**
     * GET /api/conversations/:jid
     * Returns details for a single conversation
     */
    router.get('/:jid', (req, res) => controller.getOne(req, res));

    /**
     * GET /api/conversations/:jid/messages
     * Returns paginated messages for a conversation
     */
    router.get('/:jid/messages', (req, res) => controller.getMessages(req, res));

    /**
     * POST /api/conversations/:jid/deep-sync
     * Enable deep sync for a specific chat
     */
    router.post('/:jid/deep-sync', (req, res) => controller.toggleDeepSync(req, res));

    /**
     * POST /api/conversations/:jid/sync-history
     * Trigger a manual history sync for a chat
     */
    router.post('/:jid/sync-history', (req, res) => controller.syncHistory(req, res));

    /**
     * POST /api/conversations/:jid/message-grouping
     * Enable/disable message grouping and set configuration
     */
    router.post('/:jid/message-grouping', (req, res) => controller.toggleGrouping(req, res));

    /**
     * DELETE /api/conversations/:jid/messages
     * Purges all messages and media for a chat while preserving chat metadata
     */
    router.delete('/:jid/messages', (req, res) => controller.purge(req, res));

    return router;
}
