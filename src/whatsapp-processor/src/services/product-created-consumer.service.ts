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

    /**
     * Start the Kafka consumer
     */
    public async start(io: SocketServer): Promise<void> {
        this.io = io;
        try {
            logger.info('Connecting Kafka consumer for ProductCreatedConsumerService...');
            await this.consumer.connect();
            this.isConnected = true;
            logger.info('Kafka consumer for ProductCreatedConsumerService connected');

            logger.info({ topic: KAFKA_CONFIG.groupProductCreatedTopic }, 'Subscribing to product created topic');
            await this.consumer.subscribe({ 
                topic: KAFKA_CONFIG.groupProductCreatedTopic, 
                fromBeginning: false 
            });

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

            logger.info('ProductCreatedConsumerService started successfully');
        } catch (err: any) {
            logger.error({ err: err.message }, 'Failed to start ProductCreatedConsumerService');
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
            const updateRes = await client.query(
                `UPDATE wa.message_groups 
                 SET deeplens_product_id = $1,
                     deeplens_listing_id = $2,
                     category = $3,
                     sub_category = $4,
                     status = 'product_created',
                     product_created_at = NOW(),
                     updated_at = NOW()
                 WHERE group_id = $5`,
                [productId, listingId || null, category || null, subCategory || null, groupId]
            );

            // Log to wa.group_audit_log
            await client.query(
                `INSERT INTO wa.group_audit_log (group_id, event, actor, old_value, new_value, occurred_at)
                 VALUES ($1, 'product_created', 'system', $2::jsonb, $3::jsonb, NOW())`,
                [
                    groupId,
                    JSON.stringify({ status: prevStatus }),
                    JSON.stringify({
                        status: 'product_created',
                        productId,
                        listingId,
                        category,
                        subCategory
                    })
                ]
            );

            logger.info({ groupId, rowCount: updateRes.rowCount }, 'Updated message group status to product_created');

            // Emit Socket.IO event for real-time dashboard updates
            if (this.io) {
                this.io.emit('group_product_created', {
                    groupId,
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
        if (this.isConnected) {
            await this.consumer.disconnect();
            this.isConnected = false;
            logger.info('Kafka consumer for ProductCreatedConsumerService disconnected');
        }
    }
}

export const productCreatedConsumer = new ProductCreatedConsumerService();
