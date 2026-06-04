import { Kafka, Producer, logLevel } from 'kafkajs';
import { logger } from '../utils/logger';
import { getWhatsAppDbClient } from '../clients/db.client';
import { KAFKA_CONFIG, MINIO_CONFIG, TENANT_NAME } from '../config';
import { createHash } from 'crypto';

/**
 * Generate a deterministic UUID from a WhatsApp message ID
 */
export function uuidFromMessageId(messageId: string): string {
    const hash = createHash('md5').update(messageId).digest('hex');
    return [
        hash.substring(0, 8),
        hash.substring(8, 12),
        `4${hash.substring(13, 16)}`, // UUID v4 layout compatibility
        `8${hash.substring(17, 20)}`,
        hash.substring(20, 32)
    ].join('-');
}

export class GroupReadinessService {
    private kafka: Kafka;
    private producer: Producer;
    private isConnected = false;

    constructor() {
        this.kafka = new Kafka({
            clientId: 'group-readiness-service',
            brokers: KAFKA_CONFIG.brokers,
            logLevel: logLevel.ERROR,
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
     * Connect the Kafka producer
     */
    public async initialize(): Promise<void> {
        if (this.isConnected) return;
        try {
            logger.info('Connecting Kafka producer for GroupReadinessService...');
            await this.producer.connect();
            this.isConnected = true;
            logger.info('Kafka producer for GroupReadinessService connected');
        } catch (err: any) {
            logger.error({ err: err.message }, 'Failed to connect Kafka producer for GroupReadinessService');
        }
    }

    /**
     * Log an audit trail entry
     */
    private async logAudit(groupId: string, event: string, actor: string, oldValue: any, newValue: any): Promise<void> {
        const client = getWhatsAppDbClient();
        if (!client) return;
        try {
            await client.query(
                `INSERT INTO wa.group_audit_log (group_id, event, actor, old_value, new_value, occurred_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [groupId, event, actor, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null]
            );
        } catch (err) {
            logger.error({ err, groupId, event }, 'Failed to write group audit log');
        }
    }

    /**
     * Evaluates if a message group qualifies for product pipeline and emits Kafka events
     */
    public async checkAndEmitGroupEvent(groupId: string): Promise<void> {
        const client = getWhatsAppDbClient();
        if (!client) {
            logger.error({ groupId }, 'Database not available in checkAndEmitGroupEvent');
            return;
        }

        try {
            // 1. Fetch messages in group
            const result = await client.query(
                `SELECT message_id, jid, content, media_type, media_url, media_mime_type, timestamp 
                 FROM wa.messages 
                 WHERE group_id = $1 AND is_deleted = false 
                 ORDER BY timestamp ASC`,
                [groupId]
            );
            const messages = result.rows;
            if (messages.length === 0) {
                logger.debug({ groupId }, 'No active messages found in group, skipping check');
                return;
            }

            const jid = messages[0].jid;

            // 2. Count media, texts, and build aggregates
            let mediaCount = 0;
            let textCount = 0;
            let lastMessageAt = new Date(0);
            const descriptionParts: string[] = [];
            const mediaFiles: any[] = [];

            for (const msg of messages) {
                const msgTime = new Date(Number(msg.timestamp) * 1000);
                if (msgTime > lastMessageAt) {
                    lastMessageAt = msgTime;
                }

                if (msg.media_type && ['image', 'video', 'sticker'].includes(msg.media_type) && msg.media_url) {
                    mediaCount++;
                    let mediaUrl = msg.media_url;
                    if (!mediaUrl.startsWith('minio://')) {
                        mediaUrl = `minio://${MINIO_CONFIG.bucket}/${mediaUrl}`;
                    }
                    mediaFiles.push({
                        mediaId: uuidFromMessageId(msg.message_id),
                        messageId: msg.message_id,
                        mediaUrl: mediaUrl,
                        mediaType: msg.media_type === 'sticker' ? 'image' : msg.media_type,
                        mimeType: msg.media_mime_type || (msg.media_type === 'sticker' ? 'image/webp' : 'image/jpeg')
                    });
                }

                if (msg.content && msg.content.trim() !== '') {
                    textCount++;
                    descriptionParts.push(msg.content.trim());
                }
            }

            const description = descriptionParts.join('\n').trim();

            // 3. Fetch chat config (vendor, auto-process, grouping flag)
            const chatRes = await client.query(
                `SELECT vendor_id, auto_process_products, enable_message_grouping 
                 FROM wa.chats 
                 WHERE jid = $1`,
                [jid]
            );
            if (chatRes.rows.length === 0) {
                logger.warn({ jid }, 'Chat not found for group check');
                return;
            }

            const chat = chatRes.rows[0];
            const vendorId = chat.vendor_id;
            const autoProcess = chat.auto_process_products;

            // 4. Query current group status or create if not exists
            const groupRes = await client.query(
                `SELECT status, process_as_product, deeplens_product_id 
                 FROM wa.message_groups 
                 WHERE group_id = $1`,
                [groupId]
            );

            let currentStatus = 'staging';
            let processAsProduct = false;
            let isNewGroup = false;

            if (groupRes.rows.length > 0) {
                currentStatus = groupRes.rows[0].status;
                processAsProduct = groupRes.rows[0].process_as_product;

                // Update details
                await client.query(
                    `UPDATE wa.message_groups 
                     SET media_count = $1, text_count = $2, description = $3, last_message_at = $4, updated_at = NOW() 
                     WHERE group_id = $5`,
                    [mediaCount, textCount, description, lastMessageAt, groupId]
                );
            } else {
                isNewGroup = true;
                await client.query(
                    `INSERT INTO wa.message_groups 
                     (group_id, jid, status, process_as_product, description, media_count, text_count, last_message_at, created_at, updated_at)
                     VALUES ($1, $2, 'staging', FALSE, $3, $4, $5, $6, NOW(), NOW())`,
                    [groupId, jid, description, mediaCount, textCount, lastMessageAt]
                );
                await this.logAudit(groupId, 'group_staged', 'system', null, {
                    status: 'staging',
                    media_count: mediaCount,
                    text_count: textCount
                });
            }

            // 5. Hard Gate: If no vendor assigned, save error_detail and stop
            if (!vendorId) {
                const errMsg = 'Vendor not assigned to chat. Assign a vendor in settings to enable product creation.';
                await client.query(
                    `UPDATE wa.message_groups 
                     SET error_detail = $1, updated_at = NOW() 
                     WHERE group_id = $2`,
                    [errMsg, groupId]
                );
                return;
            } else {
                // Clear vendor error if vendor is now assigned
                await client.query(
                    `UPDATE wa.message_groups 
                     SET error_detail = NULL, updated_at = NOW() 
                     WHERE group_id = $1 AND error_detail LIKE 'Vendor not assigned%'`,
                    [groupId]
                );
            }

            // 6. Check Qualification & Emit Event
            const qualifies = mediaCount >= 1 && textCount >= 1;
            const enabled = processAsProduct || autoProcess;

            if (qualifies && enabled) {
                if (currentStatus === 'staging') {
                    // Transition to product_create_sent
                    await this.initialize();
                    if (!this.isConnected) {
                        throw new Error('Kafka producer not connected, cannot emit create event');
                    }

                    await client.query(
                        `UPDATE wa.message_groups 
                         SET status = 'product_create_sent', error_detail = NULL, updated_at = NOW() 
                         WHERE group_id = $1`,
                        [groupId]
                    );

                    const createPayload = {
                        eventId: uuidFromMessageId(`${groupId}_create`),
                        eventType: 'whatsapp.group.product.create',
                        groupId: groupId,
                        jid: jid,
                        tenantId: TENANT_NAME,
                        vendorId: vendorId,
                        description: description,
                        mediaFiles: mediaFiles,
                        timestamp: new Date().toISOString()
                    };

                    await this.producer.send({
                        topic: KAFKA_CONFIG.groupProductCreateTopic,
                        messages: [{
                            key: jid,
                            value: JSON.stringify(createPayload)
                        }]
                    });

                    await this.logAudit(groupId, 'product_create_sent', 'system', { status: currentStatus }, { status: 'product_create_sent' });
                    logger.info({ groupId, jid }, 'Published WhatsApp.group.product.create event');

                } else if (currentStatus === 'product_created') {
                    // Emit media.added event
                    await this.initialize();
                    if (!this.isConnected) {
                        throw new Error('Kafka producer not connected, cannot emit media added event');
                    }

                    const addedPayload = {
                        eventId: uuidFromMessageId(`${groupId}_media_added_${mediaCount}`),
                        eventType: 'whatsapp.group.media.added',
                        groupId: groupId,
                        jid: jid,
                        tenantId: TENANT_NAME,
                        vendorId: vendorId,
                        mediaFiles: mediaFiles,
                        timestamp: new Date().toISOString()
                    };

                    await this.producer.send({
                        topic: KAFKA_CONFIG.groupMediaAddedTopic,
                        messages: [{
                            key: jid,
                            value: JSON.stringify(addedPayload)
                        }]
                    });

                    await this.logAudit(groupId, 'media_added', 'system', null, { media_count: mediaCount });
                    logger.info({ groupId, jid }, 'Published WhatsApp.group.media.added event');
                }
            }

        } catch (err: any) {
            logger.error({ err: err.message, groupId }, 'Error checking group readiness');
            await client.query(
                `UPDATE wa.message_groups 
                 SET error_detail = $1, status = 'error', updated_at = NOW() 
                 WHERE group_id = $2`,
                [err.message, groupId]
            );
            await this.logAudit(groupId, 'error', 'system', null, { error: err.message });
        }
    }

    /**
     * Emit reprocess event (split or merge) to Kafka
     */
    public async emitReprocessEvent(reprocessType: 'split' | 'merge', groupId: string, targetGroupId?: string): Promise<void> {
        await this.initialize();
        if (!this.isConnected) {
            throw new Error('Kafka producer not connected, cannot emit reprocess event');
        }

        const payload = {
            eventId: uuidFromMessageId(`${groupId}_reprocess_${Date.now()}`),
            eventType: 'whatsapp.group.reprocess',
            groupId: groupId,
            reprocessType: reprocessType,
            targetGroupId: targetGroupId || null,
            timestamp: new Date().toISOString()
        };

        await this.producer.send({
            topic: KAFKA_CONFIG.groupReprocessTopic || 'WhatsApp.group.reprocess',
            messages: [{
                key: groupId,
                value: JSON.stringify(payload)
            }]
        });

        logger.info({ groupId, reprocessType, targetGroupId }, 'Published WhatsApp.group.reprocess event');
        await this.logAudit(groupId, 'reprocess_triggered', 'system', null, { reprocessType, targetGroupId });
    }

    /**
     * Force emits a product.create event for a group, bypassing qualification checks
     */
    public async forceEmitProductCreate(groupId: string): Promise<void> {
        const client = getWhatsAppDbClient();
        if (!client) throw new Error('Database client not available');

        const result = await client.query(
            `SELECT message_id, jid, content, media_type, media_url, media_mime_type, timestamp 
             FROM wa.messages 
             WHERE group_id = $1 AND is_deleted = false 
             ORDER BY timestamp ASC`,
            [groupId]
        );
        const messages = result.rows;
        if (messages.length === 0) throw new Error('No active messages in group');

        const jid = messages[0].jid;
        let mediaCount = 0;
        const descriptionParts: string[] = [];
        const mediaFiles: any[] = [];

        for (const msg of messages) {
            if (msg.media_type && ['image', 'video', 'sticker'].includes(msg.media_type) && msg.media_url) {
                mediaCount++;
                let mediaUrl = msg.media_url;
                if (!mediaUrl.startsWith('minio://')) {
                    mediaUrl = `minio://${MINIO_CONFIG.bucket}/${mediaUrl}`;
                }
                mediaFiles.push({
                    mediaId: uuidFromMessageId(msg.message_id),
                    messageId: msg.message_id,
                    mediaUrl: mediaUrl,
                    mediaType: msg.media_type === 'sticker' ? 'image' : msg.media_type,
                    mimeType: msg.media_mime_type || (msg.media_type === 'sticker' ? 'image/webp' : 'image/jpeg')
                });
            }
            if (msg.content && msg.content.trim() !== '') {
                descriptionParts.push(msg.content.trim());
            }
        }
        const description = descriptionParts.join('\n').trim();

        const chatRes = await client.query(
            `SELECT vendor_id FROM wa.chats WHERE jid = $1`,
            [jid]
        );
        const vendorId = chatRes.rows[0]?.vendor_id;
        if (!vendorId) {
            throw new Error('Vendor not assigned to chat. Assign a vendor before publishing.');
        }

        const groupRes = await client.query(
            `SELECT status FROM wa.message_groups WHERE group_id = $1`,
            [groupId]
        );
        const currentStatus = groupRes.rows[0]?.status || 'staging';

        await this.initialize();
        if (!this.isConnected) {
            throw new Error('Kafka producer not connected');
        }

        await client.query(
            `UPDATE wa.message_groups 
             SET status = 'product_create_sent', error_detail = NULL, process_as_product = TRUE, updated_at = NOW() 
             WHERE group_id = $1`,
            [groupId]
        );

        const createPayload = {
            eventId: uuidFromMessageId(`${groupId}_create`),
            eventType: 'whatsapp.group.product.create',
            groupId: groupId,
            jid: jid,
            tenantId: TENANT_NAME,
            vendorId: vendorId,
            description: description,
            mediaFiles: mediaFiles,
            timestamp: new Date().toISOString()
        };

        await this.producer.send({
            topic: KAFKA_CONFIG.groupProductCreateTopic,
            messages: [{
                key: jid,
                value: JSON.stringify(createPayload)
            }]
        });

        await this.logAudit(groupId, 'product_create_sent', 'system', { status: currentStatus }, { status: 'product_create_sent', force: true });
        logger.info({ groupId, jid }, 'Force published WhatsApp.group.product.create event');
    }

    /**
     * Shut down Kafka connections
     */
    public async shutdown(): Promise<void> {
        if (this.isConnected) {
            await this.producer.disconnect();
            this.isConnected = false;
            logger.info('Kafka producer for GroupReadinessService disconnected');
        }
    }
}

export const groupReadinessService = new GroupReadinessService();
