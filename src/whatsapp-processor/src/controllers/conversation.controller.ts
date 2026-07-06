import { Request, Response } from 'express';
import { ConversationService } from '../services/conversation.service';
import { logger } from '../utils/logger';

function parseFilters(req: Request) {
    const { excluded, search, limit, offset } = req.query;
    return {
        excluded: excluded === 'true' ? true : excluded === 'false' ? false : undefined,
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
    };
}

export class ConversationController {
    constructor(private service: ConversationService) {}

    async getAll(req: Request, res: Response) {
        try {
            const conversations = await this.service.getAllConversations();
            res.json(conversations);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get conversations');
            res.status(500).json({ error: err.message });
        }
    }

    async getChats(req: Request, res: Response) {
        try {
            const filters = parseFilters(req);
            const [items, total] = await Promise.all([
                this.service.getChats(filters),
                this.service.countChats(filters),
            ]);
            res.json({ items, total });
        } catch (err: any) {
            logger.error({ err }, 'Failed to get chats');
            res.status(500).json({ error: err.message });
        }
    }

    async getGroups(req: Request, res: Response) {
        try {
            const filters = parseFilters(req);
            const [items, total] = await Promise.all([
                this.service.getGroups(filters),
                this.service.countGroups(filters),
            ]);
            res.json({ items, total });
        } catch (err: any) {
            logger.error({ err }, 'Failed to get groups');
            res.status(500).json({ error: err.message });
        }
    }

    async getAnnouncements(req: Request, res: Response) {
        try {
            const filters = parseFilters(req);
            const [items, total] = await Promise.all([
                this.service.getAnnouncements(filters),
                this.service.countAnnouncements(filters),
            ]);
            res.json({ items, total });
        } catch (err: any) {
            logger.error({ err }, 'Failed to get announcements');
            res.status(500).json({ error: err.message });
        }
    }

    async getOne(req: Request, res: Response) {
        const { jid } = req.params;
        try {
            const conversation = await this.service.getConversation(jid);
            if (!conversation) {
                return res.status(404).json({ error: 'Conversation not found' });
            }
            res.json(conversation);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    async getMessages(req: Request, res: Response) {
        const { jid } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const highlightGroupId = req.query.highlightGroupId as string | undefined;
        const searchQuery = req.query.searchQuery as string | undefined;

        try {
            const result = await this.service.getMessages(jid, limit, offset, highlightGroupId, searchQuery);
            res.json(result);
        } catch (err: any) {
            logger.error({ err, jid }, 'Failed to get messages');
            res.status(500).json({ error: err.message });
        }
    }

    async toggleDeepSync(req: Request, res: Response) {
        try {
            const { jid } = req.params;
            const { enabled } = req.body;
            await this.service.toggleDeepSync(jid, !!enabled);
            res.json({ success: true, jid, deepSyncEnabled: !!enabled });
        } catch (err: any) {
            logger.error({ err }, 'Failed to toggle deep sync');
            res.status(500).json({ error: err.message });
        }
    }

    async syncHistory(req: Request, res: Response) {
        try {
            const { jid } = req.params;
            const { count } = req.body;
            await this.service.syncHistory(jid, count ? parseInt(count.toString()) : 50);
            res.json({ success: true, jid, message: 'History sync triggered' });
        } catch (err: any) {
            logger.error({ err }, 'Failed to trigger history sync');
            res.status(500).json({ error: err.message });
        }
    }

    async toggleGrouping(req: Request, res: Response) {
        const jid = decodeURIComponent(req.params.jid);
        const { enabled, config } = req.body;
        try {
            const result = await this.service.toggleMessageGrouping(jid, enabled, config);
            res.json(result);
        } catch (err: any) {
            logger.error({ err, jid }, 'Failed to toggle message grouping');
            res.status(500).json({ error: err.message });
        }
    }

    async purge(req: Request, res: Response) {
        const jid = decodeURIComponent(req.params.jid);
        try {
            const result = await this.service.purgeChat(jid);
            res.json(result);
        } catch (err: any) {
            logger.error({ err, jid }, 'Failed to purge chat messages');
            res.status(500).json({ error: err.message });
        }
    }

    async getStats(req: Request, res: Response) {
        const { jid } = req.params;
        try {
            const stats = await this.service.getStats(jid);
            if (!stats) {
                return res.status(404).json({ error: 'Conversation not found' });
            }
            res.json(stats);
        } catch (err: any) {
            logger.error({ err, jid }, 'Failed to get conversation stats');
            res.status(500).json({ error: err.message });
        }
    }

    async getChatVendor(req: Request, res: Response) {
        const { jid } = req.params;
        try {
            const result = await this.service.getChatVendor(jid);
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    async assignChatVendor(req: Request, res: Response) {
        const { jid } = req.params;
        const { vendorId, vendorName, assignedBy } = req.body;
        
        if (!vendorId) {
            return res.status(400).json({ error: 'vendorId is required' });
        }

        try {
            const result = await this.service.assignChatVendor(jid, vendorId, vendorName || '', assignedBy || 'system');
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    async removeChatVendor(req: Request, res: Response) {
        try {
            const jid = req.params.jid;
            const result = await this.service.removeChatVendor(jid);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async getChatsByVendor(req: Request, res: Response) {
        try {
            const vendorId = req.params.vendorId;
            const result = await this.service.getChatsByVendor(vendorId);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
