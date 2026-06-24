import { messageQueue } from './services/message-queue.service';
import { logger } from './utils/logger';
import { randomUUID } from 'crypto';

/**
 * Initialize message processing on application startup
 * Call this from your main server.ts or index.ts
 */
export async function initializeMessageQueue() {
    logger.info('Initializing message grouping queue...');

    // --- Startup Recovery and stuck event processing ---
    try {
        const { getWhatsAppDbClient } = await import('./clients/db.client');
        const client = getWhatsAppDbClient();
        if (client) {
            logger.info('Running startup recovery for stuck message processing states...');
            const recoveryRes = await client.query(
                `UPDATE wa.messages 
                 SET processing_status = 'ready'
                 WHERE processing_status IN ('queued', 'processing')
                   AND (processing_last_attempt IS NULL OR processing_last_attempt < NOW() - INTERVAL '5 minutes')`
            );
            logger.info(`Startup recovery completed. Reset ${recoveryRes.rowCount} stuck messages.`);

            // Recovery of stuck product creation events
            logger.info('Re-emitting stuck product create events for groups in product_create_sent...');
            const stuckGroupsRes = await client.query(
                `SELECT group_id FROM wa.message_groups 
                 WHERE status = 'product_create_sent' AND deeplens_product_id IS NULL`
            );
            if (stuckGroupsRes.rows.length > 0) {
                const { groupReadinessService } = await import('./services/group-readiness.service');
                for (const row of stuckGroupsRes.rows) {
                    logger.info({ groupId: row.group_id }, 'Re-emitting stuck product creation');
                    // Reset status to staging so checkAndEmitGroupEvent triggers re-emission
                    await client.query(
                        `UPDATE wa.message_groups SET status = 'staging' WHERE group_id = $1`,
                        [row.group_id]
                    );
                    await groupReadinessService.checkAndEmitGroupEvent(row.group_id);
                }
            }
        }
    } catch (err: any) {
        logger.error({ err: err.message }, 'Failed to run startup recovery check');
    }

    messageQueue.registerHandler(async (message) => {
        const { getWhatsAppDbClient } = await import('./clients/db.client');
        const client = getWhatsAppDbClient();

        if (!client) {
            logger.warn({ messageId: message.message_id }, 'Database not available for grouping check');
            return;
        }

        // 1. Get Chat Config
        const chatRes = await client.query(
            'SELECT enable_message_grouping, grouping_config FROM wa.chats WHERE jid = $1',
            [message.jid]
        );
        const { enable_message_grouping, grouping_config } = chatRes.rows[0] || {};

        if (!enable_message_grouping) {
            logger.debug({ msgId: message.message_id }, 'Skipping - grouping disabled');
            return;
        }

        // 2. Get Previous Message
        const prevRes = await client.query(
            `SELECT group_id, timestamp, media_type, message_type 
             FROM wa.messages 
             WHERE jid = $1 AND (timestamp < $2 OR (timestamp = $2 AND id < $3)) 
             ORDER BY timestamp DESC, id DESC LIMIT 1`,
            [message.jid, message.timestamp, message.id]
        );
        const prevMsg = prevRes.rows[0];

        // 3. Determine Group ID
        let groupId = randomUUID();
        let isNewGroup = true;

        if (prevMsg) {
            const strategy = grouping_config?.strategy || 'sticker';
            const isPrevSticker = prevMsg.media_type === 'sticker';
            const isCurSticker = message.media_type === 'sticker';

            if (!isPrevSticker && !isCurSticker && prevMsg.group_id) {
                if (strategy === 'sticker') {
                    // Sticker Separator Logic
                    groupId = prevMsg.group_id;
                    isNewGroup = false;
                } else if (strategy === 'time_gap') {
                    // Time Gap Logic
                    const threshold = (grouping_config?.timeGapSeconds || 300); // Default 5 mins
                    const diff = message.timestamp - prevMsg.timestamp;
                    if (diff <= threshold) {
                        groupId = prevMsg.group_id;
                        isNewGroup = false;
                    }
                } else if (strategy === 'hybrid') {
                    // Hybrid Logic: Sticker Separator + Time Gap
                    const threshold = (grouping_config?.timeGapSeconds || 300); // Default 5 mins
                    const diff = message.timestamp - prevMsg.timestamp;
                    if (diff <= threshold) {
                        groupId = prevMsg.group_id;
                        isNewGroup = false;
                    }
                }
            }
        }

        // Apply semantic prefix if creating a new group
        if (isNewGroup) {
            let prefix = 'chat_';
            if (message.media_type === 'sticker') {
                prefix = 'sticker_';
            } else if (message.media_type && ['image', 'photo', 'video'].includes(message.media_type)) {
                prefix = 'product_';
            }
            groupId = `${prefix}${randomUUID()}`;
        }

        // 4. Save Group ID
        await client.query(
            'UPDATE wa.messages SET group_id = $1 WHERE message_id = $2',
            [groupId, message.message_id]
        );

        logger.info({
            msgId: message.message_id,
            groupId,
            isNewGroup,
            strategy: grouping_config?.strategy
        }, 'Message grouped');

        // 5. Evaluate group readiness for products
        try {
            const { groupReadinessService } = await import('./services/group-readiness.service');
            await groupReadinessService.checkAndEmitGroupEvent(groupId);
        } catch (err: any) {
            logger.error({ err: err.message, groupId }, 'Error invoking group readiness service');
        }
    });

    await messageQueue.start();

    // Start background staging buffer poller (45 seconds delay)
    try {
        const { groupReadinessService } = await import('./services/group-readiness.service');
        groupReadinessService.startStagingPoller(45);
    } catch (err: any) {
        logger.error({ err: err.message }, 'Failed to start staging buffer poller');
    }

    logger.info('Message grouping queue initialized successfully');
}

/**
 * Graceful shutdown - stop the queue
 */
export function shutdownMessageQueue() {
    logger.info('Shutting down message processing queue...');
    messageQueue.stopPolling();
    
    // Shut down GroupReadinessService Kafka connection
    import('./services/group-readiness.service').then(({ groupReadinessService }) => {
        groupReadinessService.shutdown().catch(err => {
            logger.error({ err: err.message }, 'Error shutting down GroupReadinessService');
        });
    }).catch(err => {
        logger.error({ err: err.message }, 'Failed to import groupReadinessService for shutdown');
    });

    logger.info('Message processing queue stopped');
}
