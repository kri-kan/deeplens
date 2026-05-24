import { ManagementRepository } from '../repositories/management.repository';
import { WhatsAppService } from './whatsapp.service';
import { logger } from '../utils/logger';
import { excludeChat, bulkExcludeChats, includeChat } from '../utils/whitelist';

export class ManagementService {
    private repository: ManagementRepository;

    constructor(private waService: WhatsAppService) {
        this.repository = new ManagementRepository();
    }

    async excludeChat(jid: string) {
        await excludeChat(jid);
        return { success: true, jid };
    }

    async bulkExcludeChats(jids: string[]) {
        await bulkExcludeChats(jids);
        return { success: true, count: jids.length };
    }

    async includeChat(jid: string, resumeMode: 'from_last' | 'from_now') {
        await includeChat(jid, resumeMode);
        return { success: true, jid, resumeMode };
    }

    async getStatus() {
        const state = await this.repository.getProcessingState();
        const settings = await this.repository.getSyncSettings();
        return {
            status: this.waService.getStatus(),
            qr: this.waService.getQrCode(),
            hasSession: this.waService.hasSession(),
            processingState: {
                isPaused: state.isPaused,
                pausedAt: state.pausedAt,
                resumedAt: null,
                trackChats: settings.syncChats,
                trackGroups: settings.syncGroups,
                trackAnnouncements: settings.syncAnnouncements
            },
            systemHealth: this.waService.getSystemHealth()
        };
    }

    async toggleProcessing(pause: boolean) {
        await this.repository.updateProcessingState(pause);
        const state = await this.repository.getProcessingState();
        const settings = await this.repository.getSyncSettings();
        return {
            success: true,
            isPaused: state.isPaused,
            pausedAt: state.pausedAt,
            resumedAt: null,
            trackChats: settings.syncChats,
            trackGroups: settings.syncGroups,
            trackAnnouncements: settings.syncAnnouncements
        };
    }

    async getSyncSettings() {
        return this.repository.getSyncSettings();
    }

    async updateSyncSettings(settings: any) {
        await this.repository.updateSyncSettings(settings);
        const updated = await this.repository.getSyncSettings();
        return { success: true, settings: updated };
    }

    async toggleExclusion(jid: string, exclude: boolean) {
        await this.repository.setExclusion(jid, exclude);
        return { success: true, jid, isExcluded: exclude };
    }
}
