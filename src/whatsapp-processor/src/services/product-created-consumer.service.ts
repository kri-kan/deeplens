import { Kafka, Consumer, logLevel } from 'kafkajs';
import { logger } from '../utils/logger';
import { getWhatsAppDbClient } from '../clients/db.client';
import { KAFKA_CONFIG } from '../config';
import { Server as SocketServer } from 'socket.io';
import { WhatsAppGroupProductCreatedEvent } from '../types/events';

export class ProductCreatedConsumerService {
    private kafka: Kafka;
    private consumer: Consumer;
    private isConnected = false;
    private isConnecting = false;
    private isStopping = false;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private io: SocketServer | null = null;

    constructor() {
        this.kafka = new Kafka({
            clientId: 'whatsapp-product-created-consumer',
            brokers: KAFKA_CONFIG.brokers,
            logLevel: logLevel.ERROR,
            retry: {
                initialRetryTime: 300,
                retries: 8
            }
        });

        this.consumer = this.kafka.consumer({
            groupId: `${KAFKA_CONFIG.groupId}-product-created`,
            retry: {
                initialRetryTime: 300,
                retries: 8
            }
        });
    }

    public isHealthy(): boolean {
        return this.isConnected;
    }

    /**
     * Start the Kafka consumer
     */
    public async start(io: SocketServer): Promise<void> {
        this.io = io;
        this.isStopping = false;
        this.connectWithRetry().catch(err => {
            logger.error({ err: err.message }, 'Unhandled error in ProductCreatedConsumerService connectWithRetry');
        });
    }

    private async connectWithRetry(): Promise<void> {
        if (this.isConnected || this.isConnecting || this.isStopping) return;
        this.isConnecting = true;

        let delayMs = 2000;
        const maxDelayMs = 15000;
        let attempt = 0;

        while (!this.isConnected && !this.isStopping) {
            attempt++;
            try {
                logger.info({ brokers: KAFKA_CONFIG.brokers, attempt }, 'Connecting Kafka consumer for ProductCreatedConsumerService...');
                await this.consumer.connect();

                logger.info({ topic: KAFKA_CONFIG.groupProductCreatedTopic }, 'Subscribing to product created topic');
                await this.consumer.subscribe({ 
                    topic: KAFKA_CONFIG.groupProductCreatedTopic, 
                    fromBeginning: false 
                });

                this.setupEventListeners();

                await this.consumer.run({
                    eachMessage: async ({ topic, partition, message }) => {
                        const value = message.value?.toString();
                        if (!value) return;

                        try {
                            const payload = JSON.parse(value) as WhatsAppGroupProductCreatedEvent;
                            await this.handleProductCreated(payload);
                        } catch (err: any) {
                            logger.error({ err: err.message }, 'Error handling product created message');
                        }
                    }
                });

                this.isConnected = true;
                this.isConnecting = false;
                logger.info('ProductCreatedConsumerService started successfully');
                return;
            } catch (err: any) {
                logger.warn(
                    { err: err.message, attempt, nextRetryMs: delayMs },
                    'Failed to start ProductCreatedConsumerService. Retrying in background...'
                );

                try {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                } catch {
                    break;
                }

                delayMs = Math.min(Math.round(delayMs * 1.5), maxDelayMs);
            }
        }

        this.isConnecting = false;
    }

    private setupEventListeners() {
        this.consumer.on(this.consumer.events.CRASH, (e: any) => {
            logger.error({ err: e.payload?.error?.message }, 'ProductCreatedConsumer crashed, scheduling reconnect');
            this.handleDisconnect();
        });

        this.consumer.on(this.consumer.events.DISCONNECT, () => {
            logger.warn('ProductCreatedConsumer disconnected');
            this.handleDisconnect();
        });
    }

    private handleDisconnect() {
        if (this.isStopping) return;
        this.isConnected = false;

        if (!this.reconnectTimeout && !this.isConnecting) {
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectTimeout = null;
                this.connectWithRetry().catch(err => {
                    logger.error({ err: err.message }, 'Error during ProductCreatedConsumer reconnection');
                });
            }, 3000);
        }
    }

    /**
     * Handle the WhatsApp.group.product.created write-back event
     */
    private async handleProductCreated(payload: WhatsAppGroupProductCreatedEvent): Promise<void> {
        const { groupId, productId, listingId, category, subCategory } = payload;
        if (!groupId || !productId) {
            logger.warn({ payload }, 'Received invalid product created payload');
            return;
        }

        logger.info({ groupId, productId, listingId }, 'Received write-back product created event');

        const client = getWhatsAppDbClient();
        if (!client) {
            logger.error('DB client not available in handleProductCreated');
            return;
        }

        try {
            // Fetch previous group info for audit logging
            const prevGroupRes = await client.query(
                `SELECT status FROM wa.message_groups WHERE group_id = $1`,
                [groupId]
            );
            const prevStatus = prevGroupRes.rows[0]?.status || 'unknown';

            // Update group status in PostgreSQL DB wa.message_groups
            // CRITICAL: Preserve status = 'needs_review' so async writeback never wipes out human review flags!
            const updateRes = await client.query(
                `UPDATE wa.message_groups 
                 SET deeplens_product_id = $1,
                     deeplens_listing_id = $2,
                     category = $3,
                     sub_category = $4,
                     status = CASE WHEN status = 'needs_review' THEN 'needs_review' ELSE 'product_created' END,
                     retry_count = 0,
                     product_created_at = NOW(),
                     updated_at = NOW()
                 WHERE group_id = $5`,
                [productId, listingId || null, category || null, subCategory || null, groupId]
            );

            // Propagate source_group_id to public.vendor_listings for seamless navigation
            if (productId || listingId) {
                await client.query(
                    `UPDATE public.vendor_listings 
                     SET source_group_id = $1, updated_at = NOW()
                     WHERE product_id = $2 OR id = $3`,
                    [groupId, productId || null, listingId || null]
                );
            }

            const newStatus = prevStatus === 'needs_review' ? 'needs_review' : 'product_created';

            // Log to wa.group_audit_log
            await client.query(
                `INSERT INTO wa.group_audit_log (group_id, event, actor, old_value, new_value, occurred_at)
                 VALUES ($1, 'product_created', 'system', $2::jsonb, $3::jsonb, NOW())`,
                [
                    groupId,
                    JSON.stringify({ status: prevStatus }),
                    JSON.stringify({
                        status: newStatus,
                        productId,
                        listingId,
                        category,
                        subCategory
                    })
                ]
            );

            logger.info({ groupId, status: newStatus, rowCount: updateRes.rowCount }, 'Updated message group write-back details');

            // Emit Socket.IO event for real-time dashboard updates
            if (this.io) {
                this.io.emit('group_product_created', {
                    groupId,
                    status: newStatus,
                    productId,
                    listingId,
                    category,
                    subCategory
                });
                logger.debug({ groupId }, 'Emitted group_product_created socket event');
            }
        } catch (err: any) {
            logger.error({ err: err.message, groupId }, 'Error writing product created details to database');
        }
    }

    /**
     * Disconnect the Kafka consumer
     */
    public async shutdown(): Promise<void> {
        this.isStopping = true;
        this.isConnected = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        try {
            await this.consumer.disconnect();
            logger.info('Kafka consumer for ProductCreatedConsumerService disconnected');
        } catch (err: any) {
            logger.warn({ err: err.message }, 'Error disconnecting Kafka consumer during shutdown');
        }
    }
}

export const productCreatedConsumer = new ProductCreatedConsumerService();
