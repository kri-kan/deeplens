/**
 * DeepLens Image Processing Integration Service
 * 
 * Monitors WhatsApp messages for images and sends them to DeepLens for processing.
 * Also handles message grouping assignment for conversation threading.
 * 
 * Features:
 * - Automatic groupId assignment based on conversation context
 * - Image detection and extraction from WhatsApp messages
 * - Kafka integration with DeepLens image processing pipeline
 * - Configurable processing intervals
 */

import { Kafka, Producer } from 'kafkajs';
import { logger } from '../utils/logger';
import { getWhatsAppDbClient } from '../clients/db.client';
import { KAFKA_CONFIG } from '../config';

interface WhatsAppMessage {
    message_id: string;
    jid: string;
    message_text: string | null;
    media_type: string | null;
    media_url: string | null;
    timestamp: number;
    is_from_me: boolean;
    sender: string | null;
    group_id: string | null;
}

interface DeepLensImageEvent {
    imageId: string;
    tenantId: string;
    fileName: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
    metadata: {
        source: 'whatsapp';
        chatJid: string;
        messageId: string;
        sender: string | null;
        timestamp: number;
        groupId: string | null;
    };
}

export class DeepLensIntegrationService {
    private kafka: Kafka;
    private producer: Producer;
    private isRunning = false;
    private processingInterval: NodeJS.Timeout | null = null;

    // Configuration
    private readonly PROCESSING_INTERVAL_MS = parseInt(process.env.DEEPLENS_PROCESSING_INTERVAL_MS || '10000'); // 10 seconds
    private readonly BATCH_SIZE = parseInt(process.env.DEEPLENS_BATCH_SIZE || '20');
    private readonly GROUPING_TIME_WINDOW_MS = parseInt(process.env.MESSAGE_GROUPING_WINDOW_MS || '300000'); // 5 minutes
    private readonly DEEPLENS_TOPIC = process.env.DEEPLENS_TOPIC || 'WhatsApp.newproduct.received';
    private readonly TENANT_ID = process.env.TENANT_ID || 'whatsapp-tenant';

    constructor() {
        this.kafka = new Kafka({
            clientId: 'whatsapp-deeplens-integration',
            brokers: KAFKA_CONFIG.brokers,
            retry: {
                initialRetryTime: 300,
                retries: 8
            }
        });

        this.producer = this.kafka.producer({
            retry: {
                initialRetryTime: 300,
                retries: 8
            }
        });
    }

    /**
     * Start the DeepLens integration service
     */
    public async start() {
        if (this.isRunning) {
            logger.warn('DeepLens integration service already running');
            return;
        }

        try {
            logger.info('Starting DeepLens integration service...');
            await this.producer.connect();
            logger.info('Connected to Kafka for DeepLens integration');

            this.isRunning = true;
            this.startProcessingLoop();

            logger.info({
                interval: this.PROCESSING_INTERVAL_MS,
                batchSize: this.BATCH_SIZE,
                topic: this.DEEPLENS_TOPIC
            }, 'DeepLens integration service started');
        } catch (err) {
            logger.error({ err }, 'Failed to start DeepLens integration service');
            throw err;
        }
    }

    /**
     * Stop the DeepLens integration service
     */
    public async stop() {
        logger.info('Stopping DeepLens integration service...');
        this.isRunning = false;

        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }

        await this.producer.disconnect();
        logger.info('DeepLens integration service stopped');
    }

    /**
     * Main processing loop - runs at regular intervals
     */
    private startProcessingLoop() {
        this.processingInterval = setInterval(async () => {
            try {
                // Step 1: Assign/update group IDs for ungrouped messages
                await this.assignGroupIds();

                // Step 2: Process images and send to DeepLens
                await this.processImagesForDeepLens();
            } catch (err) {
                logger.error({ err }, 'Error in DeepLens processing loop');
            }
        }, this.PROCESSING_INTERVAL_MS);
    }

    /**
     * Assign group IDs to messages based on conversation context
     * Groups messages within a time window from the same chat
     */
    private async assignGroupIds() {
        const client = getWhatsAppDbClient();
        if (!client) return;

        try {
            // Find messages without group_id
            const ungroupedMessages = await client.query<WhatsAppMessage>(
                `SELECT message_id, jid, timestamp, sender, is_from_me
                 FROM messages
                 WHERE group_id IS NULL
                 ORDER BY jid, timestamp ASC
                 LIMIT $1`,
                [this.BATCH_SIZE]
            );

            if (ungroupedMessages.rows.length === 0) return;

            logger.debug(`Found ${ungroupedMessages.rows.length} messages needing group assignment`);

            // Group messages by chat (jid)
            const messagesByChat = new Map<string, WhatsAppMessage[]>();
            for (const msg of ungroupedMessages.rows) {
                if (!messagesByChat.has(msg.jid)) {
                    messagesByChat.set(msg.jid, []);
                }
                messagesByChat.get(msg.jid)!.push(msg);
            }

            // Process each chat's messages
            for (const [jid, messages] of messagesByChat.entries()) {
                await this.assignGroupIdsForChat(jid, messages);
            }

            logger.info(`Assigned group IDs to ${ungroupedMessages.rows.length} messages`);
        } catch (err) {
            logger.error({ err }, 'Error assigning group IDs');
        }
    }

    /**
     * Assign group IDs for messages in a specific chat
     */
    private async assignGroupIdsForChat(jid: string, messages: WhatsAppMessage[]) {
        const client = getWhatsAppDbClient();
        if (!client) return;

        try {
            // Get the most recent group for this chat
            const recentGroup = await client.query(
                `SELECT group_id, MAX(timestamp) as last_timestamp
                 FROM messages
                 WHERE jid = $1 AND group_id IS NOT NULL
                 GROUP BY group_id
                 ORDER BY last_timestamp DESC
                 LIMIT 1`,
                [jid]
            );

            let currentGroupId: string | null = null;
            let lastTimestamp = 0;

            if (recentGroup.rows.length > 0) {
                currentGroupId = recentGroup.rows[0].group_id;
                lastTimestamp = recentGroup.rows[0].last_timestamp;
            }

            // Process messages in chronological order
            for (const msg of messages) {
                // Check if we should start a new group
                const timeSinceLastMessage = msg.timestamp - lastTimestamp;

                if (!currentGroupId || timeSinceLastMessage > this.GROUPING_TIME_WINDOW_MS) {
                    // Create new group ID: chat_jid_timestamp
                    currentGroupId = `${jid}_${msg.timestamp}`;
                    logger.debug({ jid, groupId: currentGroupId }, 'Created new message group');
                }

                // Assign group ID to message
                await client.query(
                    `UPDATE messages 
                     SET group_id = $1, updated_at = NOW()
                     WHERE message_id = $2`,
                    [currentGroupId, msg.message_id]
                );

                lastTimestamp = msg.timestamp;
            }
        } catch (err) {
            logger.error({ err, jid }, 'Error assigning group IDs for chat');
        }
    }

    /**
     * Process images and send to DeepLens for processing
     */
    private async processImagesForDeepLens() {
        const client = getWhatsAppDbClient();
        if (!client) return;

        try {
            // Find messages with images that haven't been sent to DeepLens
            const imageMessages = await client.query<WhatsAppMessage>(
                `SELECT message_id, jid, media_type, media_url, timestamp, sender, is_from_me, group_id
                 FROM messages
                 WHERE media_type IN ('image', 'sticker')
                   AND media_url IS NOT NULL
                   AND deeplens_processed = false
                 ORDER BY timestamp ASC
                 LIMIT $1`,
                [this.BATCH_SIZE]
            );

            if (imageMessages.rows.length === 0) return;

            logger.debug(`Found ${imageMessages.rows.length} images to send to DeepLens`);

            for (const msg of imageMessages.rows) {
                await this.sendImageToDeepLens(msg);
            }

            logger.info(`Sent ${imageMessages.rows.length} images to DeepLens`);
        } catch (err) {
            logger.error({ err }, 'Error processing images for DeepLens');
        }
    }

    /**
     * Send a single image to DeepLens via Kafka
     */
    private async sendImageToDeepLens(message: WhatsAppMessage) {
        const client = getWhatsAppDbClient();
        if (!client) return;

        try {
            // Extract file name from URL
            const fileName = message.media_url!.split('/').pop() || `${message.message_id}.jpg`;

            // Create DeepLens image event
            const imageEvent: DeepLensImageEvent = {
                imageId: `wa_${message.message_id}`,
                tenantId: this.TENANT_ID,
                fileName: fileName,
                storagePath: message.media_url!,
                mimeType: message.media_type === 'sticker' ? 'image/webp' : 'image/jpeg',
                sizeBytes: 0, // Will be determined by DeepLens
                uploadedAt: new Date(message.timestamp).toISOString(),
                metadata: {
                    source: 'whatsapp',
                    chatJid: message.jid,
                    messageId: message.message_id,
                    sender: message.sender,
                    timestamp: message.timestamp,
                    groupId: message.group_id
                }
            };

            // Send to Kafka
            await this.producer.send({
                topic: this.DEEPLENS_TOPIC,
                messages: [{
                    key: message.jid, // Partition by chat for ordering
                    value: JSON.stringify(imageEvent)
                }]
            });

            // Mark as processed
            await client.query(
                `UPDATE messages 
                 SET deeplens_processed = true, deeplens_sent_at = NOW()
                 WHERE message_id = $1`,
                [message.message_id]
            );

            logger.debug({
                messageId: message.message_id,
                imageId: imageEvent.imageId,
                jid: message.jid
            }, 'Sent image to DeepLens');
        } catch (err) {
            logger.error({ err, messageId: message.message_id }, 'Failed to send image to DeepLens');
        }
    }

    /**
     * Manually trigger group ID assignment for a specific chat
     */
    public async assignGroupIdsForChatManual(jid: string) {
        const client = getWhatsAppDbClient();
        if (!client) return;

        const messages = await client.query<WhatsAppMessage>(
            `SELECT message_id, jid, timestamp, sender, is_from_me
             FROM messages
             WHERE jid = $1 AND group_id IS NULL
             ORDER BY timestamp ASC`,
            [jid]
        );

        if (messages.rows.length > 0) {
            await this.assignGroupIdsForChat(jid, messages.rows);
            logger.info({ jid, count: messages.rows.length }, 'Manually assigned group IDs');
        }
    }

    /**
     * Manually trigger image processing for a specific message
     */
    public async processImageManual(messageId: string) {
        const client = getWhatsAppDbClient();
        if (!client) return;

        const result = await client.query<WhatsAppMessage>(
            `SELECT * FROM messages WHERE message_id = $1`,
            [messageId]
        );

        if (result.rows.length > 0 && result.rows[0].media_type === 'image') {
            await this.sendImageToDeepLens(result.rows[0]);
            logger.info({ messageId }, 'Manually processed image');
        }
    }
}

// Export singleton instance
export const deepLensIntegration = new DeepLensIntegrationService();
