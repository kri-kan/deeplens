import { getWhatsAppDbClient } from '../clients/db.client';
import { logger } from './logger';

export interface ProcessingState {
    isPaused: boolean;
    pausedAt: Date | null;
    resumedAt: Date | null;
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
            resumedAt: null
        };
    }

    try {
        const res = await client.query('SELECT * FROM processing_state WHERE id = 1');
        if (res.rows.length === 0) {
            return {
                isPaused: false,
                pausedAt: null,
                resumedAt: null
            };
        }

        const row = res.rows[0];
        return {
            isPaused: row.is_paused,
            pausedAt: row.paused_at,
            resumedAt: row.resumed_at
        };
    } catch (err) {
        logger.error({ err }, 'Failed to get processing state from DB');
        return {
            isPaused: false,
            pausedAt: null,
            resumedAt: null
        };
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
