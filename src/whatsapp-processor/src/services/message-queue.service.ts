/**
 * Message Processing Queue System (Kafka Backed)
 * 
 * Ensures messages are processed sequentially per Chat JID using Kafka Partitioning.
 * Flow:
 * 1. DB: 'pending' -> 'ready' (via Media Download or initial save)
 * 2. Poller: DB 'ready' -> Kafka Produce -> DB 'queued'
 * 3. Consumer: Kafka Consume -> Grouping Logic (Handler) -> DB 'processed'
 */

import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { logger } from '../utils/logger';
import { getWhatsAppDbClient } from '../clients/db.client';
import { KAFKA_CONFIG } from '../config';

export type MessageStatus = 'pending' | 'media_downloading' | 'ready' | 'queued' | 'processing' | 'processed' | 'failed';

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

class MessageProcessingQueue {
    private kafka: Kafka;
    private producer: Producer;
    private consumer: Consumer;
    private handler: ((message: ProcessableMessage) => Promise<void>) | null = null;
    private isPolling = false;
    private processingInterval: NodeJS.Timeout | null = null;
    private readonly POLL_INTERVAL = parseInt(process.env.KAFKA_POLL_INTERVAL_MS || '5000'); // 5 seconds between polls
    private readonly BATCH_SIZE = parseInt(process.env.KAFKA_BATCH_SIZE || '10'); // Process 10 messages per batch
    private readonly MESSAGE_DELAY_MS = parseInt(process.env.KAFKA_MESSAGE_DELAY_MS || '500'); // 500ms delay between messages

    constructor() {
        this.kafka = new Kafka({
            clientId: KAFKA_CONFIG.clientId,
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
        this.consumer = this.kafka.consumer({
            groupId: KAFKA_CONFIG.groupId,
            retry: {
                initialRetryTime: 300,
                retries: 8
            }
        });
    }

    public async start() {
        await this.initialize();
    }

    private get pool() {
        return getWhatsAppDbClient();
    }

    private async initialize() {
        try {
            logger.info({ brokers: KAFKA_CONFIG.brokers }, 'Connecting to Kafka...');

            // Add timeout to prevent hanging
            const connectTimeout = 10000; // 10 seconds
            await Promise.race([
                Promise.all([
                    this.producer.connect(),
                    this.consumer.connect()
                ]),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Kafka connection timeout')), connectTimeout)
                )
            ]);

            logger.info({ topic: KAFKA_CONFIG.topic }, 'Subscribing to topic');
            await this.consumer.subscribe({ topic: KAFKA_CONFIG.topic, fromBeginning: false });

            // Start Consumer
            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    const msgContent = message.value?.toString();
                    if (!msgContent) return;

                    try {
                        const parsedMsg = JSON.parse(msgContent) as ProcessableMessage;
                        await this.handleConsumedMessage(parsedMsg);
                    } catch (err) {
                        logger.error({ err }, 'Failed to process consumed Kafka message');
                    }
                }
            });

            // Start Producer Poller (Transition 'ready' -> Kafka)
            this.startProducerPoller();

            logger.info('Message Processing Queue (Kafka) Initialized');
        } catch (err: any) {
            logger.error({ err: err.message, brokers: KAFKA_CONFIG.brokers }, 'Failed to initialize Kafka Queue - message grouping will be disabled');
            // Don't throw - allow app to continue without Kafka
        }
    }

    /**
     * Register the logic handler (Grouping Logic)
     */
    public registerHandler(handler: (message: ProcessableMessage) => Promise<void>) {
        this.handler = handler;
    }

    /**
     * Consumed Message Logic
     * 1. Update DB to 'processing'
     * 2. Run Handler
     * 3. Update DB to 'processed'
     */
    private async handleConsumedMessage(message: ProcessableMessage) {
        if (!this.handler) {
            logger.warn('No handler registered for message processing');
            return;
        }

        const client = this.pool;
        if (!client) {
            logger.error('DB not connected, skipping message processing');
            return;
        }

        const { message_id } = message;

        try {
            // Mark as processing
            await client.query(
                `UPDATE messages 
                 SET processing_status = 'processing',
                     processing_last_attempt = NOW()
                 WHERE message_id = $1`,
                [message_id]
            );

            // Execute Handler (Strictly Awaited)
            await this.handler(message);

            // Mark as processed
            await client.query(
                `UPDATE messages 
                 SET processing_status = 'processed',
                     processing_completed_at = NOW()
                 WHERE message_id = $1`,
                [message_id]
            );

            logger.debug({ messageId: message_id }, 'Message processed successfully via Kafka');

        } catch (err: any) {
            logger.error({ err, messageId: message_id }, 'Failed to process message (Handler Error)');

            // Mark failed
            await client.query(
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
     * Polling Loop: Finds 'ready' messages in DB and pushes to Kafka
     */
    private startProducerPoller() {
        this.processingInterval = setInterval(async () => {
            if (this.isPolling) return;
            this.isPolling = true;

            const client = this.pool;
            if (!client) {
                this.isPolling = false;
                return;
            }

            try {
                const result = await client.query<ProcessableMessage>(
                    `SELECT * FROM messages 
                     WHERE processing_status = 'ready' 
                     ORDER BY timestamp ASC
                     LIMIT $1`,
                    [this.BATCH_SIZE]
                );

                if (result.rows.length > 0) {
                    logger.debug(`Found ${result.rows.length} messages ready for Kafka (rate-limited processing)`);

                    for (const msg of result.rows) {
                        await this.produceToKafka(msg);
                        // Add delay between messages to prevent WhatsApp rate limiting
                        if (this.MESSAGE_DELAY_MS > 0) {
                            await new Promise(resolve => setTimeout(resolve, this.MESSAGE_DELAY_MS));
                        }
                    }
                }
            } catch (err) {
                logger.error({ err }, 'Producer Poller Error');
            } finally {
                this.isPolling = false;
            }
        }, this.POLL_INTERVAL);
    }

    /**
     * Push a message to Kafka and update status to 'queued'
     */
    private async produceToKafka(message: ProcessableMessage) {
        const client = this.pool;
        if (!client) return;

        try {
            // Send to Kafka
            await this.producer.send({
                topic: KAFKA_CONFIG.topic,
                messages: [{
                    key: message.jid, // PARTITION KEY: Critical for ordering!
                    value: JSON.stringify(message)
                }]
            });

            // Update DB
            await client.query(
                `UPDATE messages SET processing_status = 'queued' WHERE message_id = $1`,
                [message.message_id]
            );
        } catch (err) {
            logger.error({ err, msgId: message.message_id }, 'Failed to produce to Kafka');
        }
    }

    // Helper methods for other services
    async markMessagePending(messageId: string): Promise<void> {
        const client = this.pool;
        if (!client) return;
        try {
            await client.query(
                `UPDATE messages SET processing_status = 'pending', processing_retry_count = 0, processing_last_attempt = NULL WHERE message_id = $1`,
                [messageId]
            );
        } catch (err) { logger.error({ err }, 'Error marking pending'); }
    }

    async markMessageReady(messageId: string): Promise<void> {
        const client = this.pool;
        if (!client) return;
        try {
            await client.query(
                `UPDATE messages SET processing_status = 'ready' WHERE message_id = $1`,
                [messageId]
            );
            // Poller will pick it up next tick
        } catch (err) { logger.error({ err }, 'Error marking ready'); }
    }

    async triggerProcessing(messageId: string): Promise<void> {
        // Force reset to ready so poller grabs it
        await this.markMessageReady(messageId);
    }

    stopPolling() {
        if (this.processingInterval) clearInterval(this.processingInterval);
        this.consumer.disconnect();
        this.producer.disconnect();
    }
}

export const messageQueue = new MessageProcessingQueue();
