import { getWhatsAppDbClient } from '../clients/db.client';
import { logger } from '../utils/logger';

export class ManagementRepository {
    private get client() {
        const client = getWhatsAppDbClient();
        if (!client) throw new Error('Database not available');
        return client;
    }

    async getExclusionList(): Promise<string[]> {
        const result = await this.client.query('SELECT jid FROM wa.chat_tracking_state WHERE is_excluded = true');
        return result.rows.map(r => r.jid);
    }

    async setExclusion(jid: string, isExcluded: boolean): Promise<void> {
        await this.client.query(`
            INSERT INTO wa.chat_tracking_state (jid, is_excluded, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (jid) DO UPDATE SET is_excluded = $2, updated_at = NOW()
        `, [jid, isExcluded]);
    }

    async getProcessingState(): Promise<any> {
        const result = await this.client.query('SELECT is_paused as "isPaused", paused_at as "pausedAt" FROM wa.processing_state LIMIT 1');
        return result.rows[0] || { isPaused: false, pausedAt: null };
    }

    async updateProcessingState(isPaused: boolean): Promise<void> {
        const now = isPaused ? new Date() : null;
        await this.client.query(`
            INSERT INTO wa.processing_state (id, is_paused, paused_at)
            VALUES (1, $1, $2)
            ON CONFLICT (id) DO UPDATE SET is_paused = $1, paused_at = $2
        `, [isPaused, now]);
    }

    async getSyncSettings(): Promise<any> {
        const result = await this.client.query('SELECT track_chats as "syncChats", track_groups as "syncGroups", track_announcements as "syncAnnouncements" FROM wa.processing_state LIMIT 1');
        return result.rows[0] || { syncChats: true, syncGroups: true, syncAnnouncements: true };
    }

    async updateSyncSettings(settings: any): Promise<void> {
        const syncChats = settings.syncChats !== undefined ? settings.syncChats : (settings.sync_chats !== undefined ? settings.sync_chats : true);
        const syncGroups = settings.syncGroups !== undefined ? settings.syncGroups : (settings.sync_groups !== undefined ? settings.sync_groups : true);
        const syncAnnouncements = settings.syncAnnouncements !== undefined ? settings.syncAnnouncements : (settings.sync_announcements !== undefined ? settings.sync_announcements : true);

        await this.client.query(`
            INSERT INTO wa.processing_state (id, track_chats, track_groups, track_announcements)
            VALUES (1, $1, $2, $3)
            ON CONFLICT (id) DO UPDATE SET 
                track_chats = $1, track_groups = $2, track_announcements = $3, updated_at = NOW()
        `, [syncChats, syncGroups, syncAnnouncements]);
    }
}
