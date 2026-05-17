import { ConversationRepository, ChatRow } from '../repositories/conversation.repository';
import { getPresignedUrl } from '../clients/media.client';
import { logger } from '../utils/logger';
import { WhatsAppService } from './whatsapp.service';

export class ConversationService {
    private repository: ConversationRepository;

    constructor(private waService: WhatsAppService) {
        this.repository = new ConversationRepository();
    }

    private async resolveProfilePic(url: string | null): Promise<string | null> {
        if (url && url.startsWith('minio://')) {
            try {
                const objectName = url.replace(/^minio:\/\/[^\/]+\//, '');
                return await getPresignedUrl(objectName);
            } catch (err) {
                logger.warn({ err, url }, 'Failed to get presigned URL for profile pic');
            }
        }
        return url;
    }

    async getAllConversations(): Promise<ChatRow[]> {
        const rows = await this.repository.findAll();
        return Promise.all(rows.map(async row => ({
            ...row,
            profilePicUrl: await this.resolveProfilePic(row.profilePicUrl)
        })));
    }

    async getChats(filters: { excluded?: boolean; search?: string; limit?: number; offset?: number } = {}) {
        return this.repository.findChats(filters);
    }

    async getGroups(filters: { excluded?: boolean; search?: string; limit?: number; offset?: number } = {}) {
        return this.repository.findGroups(filters);
    }

    async getAnnouncements(filters: { excluded?: boolean; search?: string; limit?: number; offset?: number } = {}) {
        return this.repository.findAnnouncements(filters);
    }

    async syncHistory(jid: string, count?: number) {
        return this.waService.syncChatHistory(jid, count);
    }

    async countChats(filters: { excluded?: boolean; search?: string } = {}) {
        return this.repository.countChats(filters);
    }

    async countGroups(filters: { excluded?: boolean; search?: string } = {}) {
        return this.repository.countGroups(filters);
    }

    async countAnnouncements(filters: { excluded?: boolean; search?: string } = {}) {
        return this.repository.countAnnouncements(filters);
    }

    async getConversation(jid: string): Promise<ChatRow | null> {
        const chat = await this.repository.findByJid(jid);
        if (chat) {
            chat.profilePicUrl = await this.resolveProfilePic(chat.profilePicUrl);
        }
        return chat;
    }

    async getMessages(jid: string, limit: number, offset: number) {
        const messages = await this.repository.findMessages(jid, limit, offset);
        const total = await this.repository.countMessages(jid);

        const resolvedMessages = await Promise.all(messages.map(async msg => {
            if (msg.mediaUrl && msg.mediaUrl.startsWith('minio://')) {
                try {
                    const objectName = msg.mediaUrl.replace(/^minio:\/\/[^\/]+\//, '');
                    msg.mediaUrl = await getPresignedUrl(objectName);
                } catch (err) {
                    logger.error({ err, id: msg.messageId }, 'Failed to get presigned URL');
                }
            }
            return msg;
        }));

        return {
            messages: resolvedMessages.reverse(),
            total
        };
    }

    async toggleDeepSync(jid: string, enabled: boolean) {
        await this.repository.updateDeepSync(jid, enabled);
        return { success: true, jid, deepSyncEnabled: enabled };
    }

    async toggleMessageGrouping(jid: string, enabled: boolean, config?: any) {
        await this.repository.updateMessageGrouping(jid, enabled, config);
        return { success: true, jid, enableMessageGrouping: enabled, groupingConfig: config };
    }

    async purgeChat(jid: string) {
        const result = await this.repository.purgeMessages(jid);
        logger.info({ jid, ...result }, 'Successfully purged chat messages');
        return {
            success: true,
            jid,
            ...result,
            note: 'All messages deleted. Chat metadata preserved.'
        };
    }

    async getStats(jid: string) {
        const stats = await this.repository.getStats(jid);
        if (stats) {
            stats.profilePicUrl = await this.resolveProfilePic(stats.profilePicUrl);
        }
        return stats;
    }
}
