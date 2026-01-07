/**
 * Message Processing Queue System
 * 
 * Ensures messages are only processed after they are fully available (text + media)
 * Handles async media downloads and retry logic
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { getWhatsAppDbClient } from '../clients/db.client';

const pool = getWhatsAppDbClient();

export type MessageStatus = 'pending' | 'media_downloading' | 'ready' | 'processing' | 'processed' | 'failed';

export interface ProcessableMessage {
    message_id: string;
    jid: string;
    message_text: string | null;
    media_type: string | null;
    media_url: string | null;
    timestamp: number;
    is_from_me: boolean;
    sender: string | null;
    status: MessageStatus;
}

class MessageProcessingQueue extends EventEmitter {
    private processingInterval: NodeJS.Timeout | null = null;
    private readonly POLL_INTERVAL = 5000; // Check every 5 seconds
    private readonly MAX_RETRIES = 3;
    private isProcessing = false;

    constructor() {
        super();
        this.recoverStuckMessages().then(() => {
            this.startPolling();
        });
    }

    /**
     * Recover messages that were stuck in 'processing' state due to crash/restart
     * Resets them to 'ready' so they can be retried
     */
    private async recoverStuckMessages(): Promise<void> {
        try {
            const result = await pool.query(
                `UPDATE messages 
                 SET processing_status = 'ready',
                     processing_retry_count = COALESCE(processing_retry_count, 0) + 1
                 WHERE processing_status = 'processing'
                    AND processing_last_attempt < NOW() - INTERVAL '5 minutes'
                 RETURNING message_id`
            );

            if (result.rowCount && result.rowCount > 0) {
                logger.warn(
                    { count: result.rowCount, messageIds: result.rows.map(r => r.message_id) },
                    'Recovered stuck messages from previous crash/restart'
                );
            } else {
                logger.info('No stuck messages found - clean startup');
            }
        } catch (err: any) {
            logger.error({ err }, 'Failed to recover stuck messages');
        }
    }

    /**
     * Mark a message as pending processing
     * Called immediately when message is saved to DB
     */
    async markMessagePending(messageId: string): Promise<void> {
        try {
            await pool.query(
                `UPDATE messages 
                 SET processing_status = 'pending', 
                     processing_retry_count = 0,
                     processing_last_attempt = NULL
                 WHERE message_id = $1`,
                [messageId]
            );
            logger.debug({ messageId }, 'Message marked as pending processing');
        } catch (err: any) {
            logger.error({ err, messageId }, 'Failed to mark message as pending');
        }
    }

    /**
     * Mark message as ready for processing (media downloaded or no media)
     * Called after media download completes
     */
    async markMessageReady(messageId: string): Promise<void> {
        try {
            await pool.query(
                `UPDATE messages 
                 SET processing_status = 'ready'
                 WHERE message_id = $1`,
                [messageId]
            );
            logger.debug({ messageId }, 'Message marked as ready for processing');

            // Trigger immediate processing check
            this.checkAndProcessMessages();
        } catch (err: any) {
            logger.error({ err, messageId }, 'Failed to mark message as ready');
        }
    }

    /**
     * Start polling for messages ready to process
     */
    private startPolling(): void {
        if (this.processingInterval) return;

        this.processingInterval = setInterval(() => {
            this.checkAndProcessMessages();
        }, this.POLL_INTERVAL);

        logger.info('Message processing queue started');
    }

    /**
     * Stop polling
     */
    stopPolling(): void {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
            logger.info('Message processing queue stopped');
        }
    }

    /**
     * Check for messages ready to process
     */
    private async checkAndProcessMessages(): Promise<void> {
        if (this.isProcessing) return; // Prevent concurrent processing

        this.isProcessing = true;

        try {
            // Find messages that are ready to process
            const result = await pool.query<ProcessableMessage>(
                `SELECT 
                    message_id,
                    jid,
                    message_text,
                    media_type,
                    media_url,
                    timestamp,
                    is_from_me,
                    sender,
                    processing_status as status
                 FROM messages
                 WHERE processing_status = 'ready'
                    AND (processing_retry_count IS NULL OR processing_retry_count < $1)
                 ORDER BY timestamp ASC
                 LIMIT 100`,
                [this.MAX_RETRIES]
            );

            if (result.rows.length > 0) {
                logger.info(`Found ${result.rows.length} messages ready for processing`);

                for (const message of result.rows) {
                    await this.processMessage(message);
                }
            }
        } catch (err: any) {
            logger.error({ err }, 'Error checking for processable messages');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process a single message
     */
    private async processMessage(message: ProcessableMessage): Promise<void> {
        const { message_id } = message;

        try {
            // Mark as processing
            await pool.query(
                `UPDATE messages 
                 SET processing_status = 'processing',
                     processing_last_attempt = NOW()
                 WHERE message_id = $1`,
                [message_id]
            );

            // Emit event for custom processing
            this.emit('message:ready', message);

            // Mark as processed
            await pool.query(
                `UPDATE messages 
                 SET processing_status = 'processed',
                     processing_completed_at = NOW()
                 WHERE message_id = $1`,
                [message_id]
            );

            logger.debug({ messageId: message_id }, 'Message processed successfully');

        } catch (err: any) {
            logger.error({ err, messageId: message_id }, 'Failed to process message');

            // Increment retry count
            await pool.query(
                `UPDATE messages 
                 SET processing_status = 'failed',
                     processing_retry_count = COALESCE(processing_retry_count, 0) + 1,
                     processing_error = $2
                 WHERE message_id = $1`,
                [message_id, err.message]
            );
        }
    }

    /**
     * Manually trigger processing for a specific message
     */
    async triggerProcessing(messageId: string): Promise<void> {
        const result = await pool.query<ProcessableMessage>(
            `SELECT 
                message_id,
                jid,
                message_text,
                media_type,
                media_url,
                timestamp,
                is_from_me,
                sender,
                processing_status as status
             FROM messages
             WHERE message_id = $1`,
            [messageId]
        );

        if (result.rows.length > 0) {
            await this.processMessage(result.rows[0]);
        }
    }

    /**
     * Get processing statistics
     */
    async getStats(): Promise<{
        pending: number;
        ready: number;
        processing: number;
        processed: number;
        failed: number;
    }> {
        const result = await pool.query(
            `SELECT 
                processing_status,
                COUNT(*) as count
             FROM messages
             WHERE processing_status IS NOT NULL
             GROUP BY processing_status`
        );

        const stats = {
            pending: 0,
            ready: 0,
            processing: 0,
            processed: 0,
            failed: 0
        };

        result.rows.forEach(row => {
            stats[row.processing_status as keyof typeof stats] = parseInt(row.count);
        });

        return stats;
    }
}

// Singleton instance
export const messageQueue = new MessageProcessingQueue();

// Example usage in your code:
/*
messageQueue.on('message:ready', async (message: ProcessableMessage) => {
    console.log('Processing message:', message.message_id);
    
    // Your custom processing logic here
    // - Extract entities
    // - Analyze sentiment
    // - Generate embeddings
    // - Send to external API
    // etc.
    
    if (message.media_url) {
        console.log('Media available:', message.media_url);
    }
});
*/
