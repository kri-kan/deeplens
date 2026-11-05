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
    id: number;
    message_id: string;
    jid: string;
    content?: string | null;
    message_text: string | null;
    media_type: string | null;
    media_url: string | null;
    timestamp: number;
    is_from_me: boolean;
    sender: string | null;
    metadata?: any;
    status: MessageStatus;
}

class MessageProcessingQueue {
    private kafka: Kafka;
    private producer: Producer;
    private consumer: Consumer;
    private handler: ((message: ProcessableMessage) => Promise<void>) | null = null;
    private isPolling = false;
    private isConnected = false;
    private isConnecting = false;
    private isStopping = false;
    private processingInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private readonly POLL_INTERVAL = parseInt(process.env.KAFKA_POLL_INTERVAL_MS || '2000'); // 2 seconds between polls
    private readonly BATCH_SIZE = parseInt(process.env.KAFKA_BATCH_SIZE || '50'); // Process 50 messages per batch
    private readonly MESSAGE_DELAY_MS = parseInt(process.env.KAFKA_MESSAGE_DELAY_MS || '0'); // 0ms delay between local Kafka publishes

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

    public isHealthy(): boolean {
        return this.isConnected;
    }

    public async start() {
        this.isStopping = false;
        // Start connection loop in background so app boot isn't blocked if Kafka is still starting
        this.connectWithRetry().catch(err => {
            logger.error({ err: err.message }, 'Unhandled error in Kafka connectWithRetry');
        });
    }

    private get pool() {
        return getWhatsAppDbClient();
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
                logger.info({ brokers: KAFKA_CONFIG.brokers, attempt }, 'Connecting to Kafka message queue...');

                const connectTimeout = 15000; // 15 seconds per attempt
                await Promise.race([
                    Promise.all([
                        this.producer.connect(),
                        this.consumer.connect()
                    ]),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Kafka connection timeout')), connectTimeout)
                    )
                ]);

                logger.info({ topic: KAFKA_CONFIG.topic }, 'Subscribing consumer to Kafka topic');
                await this.consumer.subscribe({ topic: KAFKA_CONFIG.topic, fromBeginning: false });

                // Attach event listeners for unexpected disconnects
                this.setupEventListeners();

                // Start Consumer
                await this.consumer.run({
                    eachMessage: async ({ topic, partition, message }) => {
                        const msgContent = message.value?.toString();
                        if (!msgContent) return;

                        try {
                            const parsedMsg = JSON.parse(msgContent) as ProcessableMessage;
                            await this.handleConsumedMessage(parsedMsg);
                        } catch (err: any) {
                            logger.error({ err: err.message }, 'Failed to process consumed Kafka message');
                        }
                    }
                });

                this.isConnected = true;
                this.isConnecting = false;

                // Start Producer Poller (Transition 'ready' -> Kafka)
                this.startProducerPoller();

                logger.info('Message Processing Queue (Kafka) Initialized successfully and poller active');
                return;
            } catch (err: any) {
                logger.warn(
                    { err: err.message, attempt, nextRetryMs: delayMs, brokers: KAFKA_CONFIG.brokers },
                    'Failed to connect to Kafka. Retrying in background...'
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
            logger.error({ err: e.payload?.error?.message }, 'Kafka consumer crashed, scheduling reconnect');
            this.handleDisconnect();
        });

        this.consumer.on(this.consumer.events.DISCONNECT, () => {
            logger.warn('Kafka consumer disconnected');
            this.handleDisconnect();
        });

        this.producer.on(this.producer.events.DISCONNECT, () => {
            logger.warn('Kafka producer disconnected');
            this.handleDisconnect();
        });
    }

    private handleDisconnect() {
        if (this.isStopping) return;
        this.isConnected = false;

        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }

        if (!this.reconnectTimeout && !this.isConnecting) {
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectTimeout = null;
                this.connectWithRetry().catch(err => {
                    logger.error({ err: err.message }, 'Error during Kafka reconnection');
                });
            }, 3000);
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
                `UPDATE wa.messages 
                 SET processing_status = 'processing',
                     processing_last_attempt = NOW()
                 WHERE message_id = $1`,
                [message_id]
            );

            // Execute Handler (Strictly Awaited)
            await this.handler(message);

            // Mark as processed
            await client.query(
                `UPDATE wa.messages 
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
                `UPDATE wa.messages 
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
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }

        const poll = async () => {
            if (this.isPolling || !this.isConnected || this.isStopping) return;
            this.isPolling = true;

            const client = this.pool;
            if (!client) {
                this.isPolling = false;
                return;
            }

            try {
                const result = await client.query<ProcessableMessage>(
                    `SELECT * FROM wa.messages 
                     WHERE processing_status = 'ready' 
                     ORDER BY timestamp ASC
                     LIMIT $1`,
                    [this.BATCH_SIZE]
                );

                if (result.rows.length > 0) {
                    logger.info(`Found ${result.rows.length} messages ready for Kafka`);

                    for (const msg of result.rows) {
                        if (!this.isConnected || this.isStopping) break;
                        await this.produceToKafka(msg);
                        if (this.MESSAGE_DELAY_MS > 0) {
                            await new Promise(resolve => setTimeout(resolve, this.MESSAGE_DELAY_MS));
                        }
                    }

                    // If a full batch was returned, schedule next batch immediately to drain backlog rapidly
                    if (result.rows.length === this.BATCH_SIZE && this.isConnected && !this.isStopping) {
                        setImmediate(poll);
                    }
                }
            } catch (err: any) {
                logger.error({ err: err.message }, 'Producer Poller Error');
            } finally {
                this.isPolling = false;
            }
        };

        this.processingInterval = setInterval(poll, this.POLL_INTERVAL);
        setImmediate(poll);
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
                `UPDATE wa.messages SET processing_status = 'queued' WHERE message_id = $1`,
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
                `UPDATE wa.messages SET processing_status = 'pending', processing_retry_count = 0, processing_last_attempt = NULL WHERE message_id = $1`,
                [messageId]
            );
        } catch (err) { logger.error({ err }, 'Error marking pending'); }
    }

    async markMessageReady(messageId: string): Promise<void> {
        const client = this.pool;
        if (!client) return;
        try {
            await client.query(
                `UPDATE wa.messages SET processing_status = 'ready' WHERE message_id = $1`,
                [messageId]
            );
            // Poller will pick it up next tick
        } catch (err) { logger.error({ err }, 'Error marking ready'); }
    }

    async triggerProcessing(messageId: string): Promise<void> {
        // Force reset to ready so poller grabs it
        await this.markMessageReady(messageId);
    }

    async stopPolling() {
        this.isStopping = true;
        this.isConnected = false;

        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        try {
            await this.consumer.disconnect();
            await this.producer.disconnect();
        } catch (err: any) {
            logger.warn({ err: err.message }, 'Error disconnecting Kafka producer/consumer during shutdown');
        }
    }
}

export const messageQueue = new MessageProcessingQueue();
