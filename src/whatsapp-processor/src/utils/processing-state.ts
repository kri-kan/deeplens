import { getWhatsAppDbClient } from '../clients/db.client';
import { logger } from './logger';

export interface ProcessingState {
    isPaused: boolean;
    pausedAt: Date | null;
    resumedAt: Date | null;
    trackChats: boolean;
    trackGroups: boolean;
    trackAnnouncements: boolean;
}

/**
 * Gets the current processing state from the database
 */
export async function getProcessingState(): Promise<ProcessingState> {
    const client = getWhatsAppDbClient();
    if (!client) {
        return {
            isPaused: false,
            pausedAt: null,
            resumedAt: null,
            trackChats: true,
            trackGroups: true,
            trackAnnouncements: true
        };
    }

    try {
        const res = await client.query('SELECT * FROM processing_state WHERE id = 1');
        if (res.rows.length === 0) {
            return {
                isPaused: false,
                pausedAt: null,
                resumedAt: null,
                trackChats: true,
                trackGroups: true,
                trackAnnouncements: true
            };
        }

        const row = res.rows[0];
        return {
            isPaused: row.is_paused,
            pausedAt: row.paused_at,
            resumedAt: row.resumed_at,
            trackChats: row.track_chats ?? true,
            trackGroups: row.track_groups ?? true,
            trackAnnouncements: row.track_announcements ?? true
        };
    } catch (err) {
        logger.error({ err }, 'Failed to get processing state from DB');
        return {
            isPaused: false,
            pausedAt: null,
            resumedAt: null,
            trackChats: true,
            trackGroups: true,
            trackAnnouncements: true
        };
    }
}

/**
 * Updates sync settings for different sections
 */
export async function updateSyncSettings(settings: {
    trackChats?: boolean;
    trackGroups?: boolean;
    trackAnnouncements?: boolean
}): Promise<void> {
    const client = getWhatsAppDbClient();
    if (!client) return;

    try {
        const fields: string[] = [];
        const values: any[] = [];
        let i = 1;

        if (settings.trackChats !== undefined) {
            fields.push(`track_chats = $${i++}`);
            values.push(settings.trackChats);
        }
        if (settings.trackGroups !== undefined) {
            fields.push(`track_groups = $${i++}`);
            values.push(settings.trackGroups);
        }
        if (settings.trackAnnouncements !== undefined) {
            fields.push(`track_announcements = $${i++}`);
            values.push(settings.trackAnnouncements);
        }

        if (fields.length === 0) return;

        await client.query(
            `UPDATE processing_state SET ${fields.join(', ')}, updated_at = NOW() WHERE id = 1`,
            values
        );
    } catch (err) {
        logger.error({ err }, 'Failed to update sync settings in DB');
    }
}

/**
 * Pauses message processing
 */
export async function pauseProcessing(): Promise<void> {
    const client = getWhatsAppDbClient();
    if (!client) return;

    try {
        await client.query(
            `UPDATE processing_state 
             SET is_paused = TRUE, 
                 paused_at = NOW(), 
                 updated_at = NOW() 
             WHERE id = 1`
        );
    } catch (err) {
        logger.error({ err }, 'Failed to pause processing in DB');
    }
}

/**
 * Resumes message processing
 */
export async function resumeProcessing(): Promise<void> {
    const client = getWhatsAppDbClient();
    if (!client) return;

    try {
        await client.query(
            `UPDATE processing_state 
             SET is_paused = FALSE, 
                 resumed_at = NOW(), 
                 updated_at = NOW() 
             WHERE id = 1`
        );
    } catch (err) {
        logger.error({ err }, 'Failed to resume processing in DB');
    }
}

/**
 * Checks if processing is currently paused
 */
export async function isProcessingPaused(): Promise<boolean> {
    const state = await getProcessingState();
    return state.isPaused;
}
