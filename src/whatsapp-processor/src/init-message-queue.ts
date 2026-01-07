/**
 * Integration Script: Message Processing Queue
 * 
 * This file integrates the message queue into the WhatsApp service
 */

import { messageQueue } from './services/message-queue.service';
import { logger } from './utils/logger';
import { randomUUID } from 'crypto';

/**
 * Initialize message processing on application startup
 * Call this from your main server.ts or index.ts
 */
export async function initializeMessageQueue() {
    logger.info('Initializing message grouping queue...');

    messageQueue.on('message:ready', async (message) => {
        const { getWhatsAppDbClient } = await import('./clients/db.client');
        const client = getWhatsAppDbClient();

        if (!client) {
            logger.warn({ messageId: message.message_id }, 'Database not available for grouping check');
            return;
        }

        // 1. Get Chat Config
        const chatRes = await client.query(
            'SELECT enable_message_grouping, grouping_config FROM chats WHERE jid = $1',
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
             FROM messages 
             WHERE jid = $1 AND timestamp < $2 
             ORDER BY timestamp DESC LIMIT 1`,
            [message.jid, message.timestamp]
        );
        const prevMsg = prevRes.rows[0];

        // 3. Determine Group ID
        let groupId = randomUUID();
        let isNewGroup = true;

        if (prevMsg) {
            const strategy = grouping_config?.strategy || 'sticker';

            if (strategy === 'sticker') {
                // Sticker Separator Logic
                const isPrevSticker = prevMsg.media_type === 'sticker';
                const isCurSticker = message.media_type === 'sticker';

                if (!isPrevSticker && !isCurSticker && prevMsg.group_id) {
                    groupId = prevMsg.group_id;
                    isNewGroup = false;
                }
            } else if (strategy === 'time_gap') {
                // Time Gap Logic
                const threshold = (grouping_config?.timeGapSeconds || 300); // Default 5 mins
                const diff = message.timestamp - prevMsg.timestamp;

                // Sticker Exception: Stickers should never be grouped
                const isPrevSticker = prevMsg.media_type === 'sticker';
                const isCurSticker = message.media_type === 'sticker';

                if (diff <= threshold && prevMsg.group_id && !isPrevSticker && !isCurSticker) {
                    groupId = prevMsg.group_id;
                    isNewGroup = false;
                }
            }
        }

        // Apply semantic prefix if creating a new group
        if (isNewGroup) {
            let prefix = 'chat_';
            // Check media type of the current message (which is starting the group)
            if (message.media_type === 'sticker') {
                prefix = 'sticker_';
            } else if (['image', 'photo', 'video'].includes(message.media_type)) {
                prefix = 'product_';
            }
            // Ensure we don't double-generate if line 50 already made a UUID (it did)
            // But we need to be careful not to keep the raw UUID if we want prefix.
            // Line 50: let groupId = randomUUID(); 
            // So just prepend.
            // Note: UUID is 36 chars. Prefix is max 8. Total 44. Fits in VARCHAR(50).
            // Be careful if groupId was assigned from prevMsg (isNewGroup=false), we DO NOT change it.
            // The logic above ensures isNewGroup is correct.

            // However, line 50 set groupId to a raw UUID.
            // We must overwrite it with prefixed version.
            groupId = `${prefix}${randomUUID()}`; // Generate fresh one to be clean, or use existing? 
            // Existing is fine, but cleaner to be explicit.
        }

        // 4. Save Group ID
        await client.query(
            'UPDATE messages SET group_id = $1 WHERE message_id = $2',
            [groupId, message.message_id]
        );

        logger.info({
            msgId: message.message_id,
            groupId,
            isNewGroup,
            strategy: grouping_config?.strategy
        }, 'Message grouped');
    });

    logger.info('Message grouping queue initialized successfully');
}

/**
 * Graceful shutdown - stop the queue
 */
export function shutdownMessageQueue() {
    logger.info('Shutting down message processing queue...');
    messageQueue.stopPolling();
    logger.info('Message processing queue stopped');
}
