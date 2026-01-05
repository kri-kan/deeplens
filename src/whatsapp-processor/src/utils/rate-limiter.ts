import { logger } from './logger';

export interface RateLimitConfig {
    maxRequestsPerMinute: number;
    minDelayMs: number;
    maxDelayMs: number;
    jitterPercent: number; // 0-100, adds randomness to delays
}

export interface QueuedAction {
    id: string;
    action: () => Promise<any>;
    priority: number; // Higher = more important
    createdAt: number;
}

/**
 * Rate-limited action queue with jitter (uneven spacing)
 * Prevents flooding WhatsApp API with requests
 */
export class RateLimitedQueue {
    private queue: QueuedAction[] = [];
    private processing: boolean = false;
    private lastExecutionTime: number = 0;
    private config: RateLimitConfig;
    private executionCount: number = 0;
    private windowStart: number = Date.now();

    constructor(config?: Partial<RateLimitConfig>) {
        this.config = {
            maxRequestsPerMinute: config?.maxRequestsPerMinute || 30,
            minDelayMs: config?.minDelayMs || 1000,
            maxDelayMs: config?.maxDelayMs || 3000,
            jitterPercent: config?.jitterPercent || 30,
        };

        logger.info({ config: this.config }, 'Rate limiter initialized');
    }

    /**
     * Add action to queue
     */
    async enqueue(action: () => Promise<any>, priority: number = 0): Promise<string> {
        const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.queue.push({
            id,
            action,
            priority,
            createdAt: Date.now(),
        });

        // Sort by priority (higher first)
        this.queue.sort((a, b) => b.priority - a.priority);

        logger.debug({ id, queueSize: this.queue.length, priority }, 'Action enqueued');

        // Start processing if not already running
        if (!this.processing) {
            this.processQueue();
        }

        return id;
    }

    /**
     * Process queue with rate limiting and jitter
     */
    private async processQueue(): Promise<void> {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            // Check rate limit
            await this.enforceRateLimit();

            // Get next action
            const queuedAction = this.queue.shift();
            if (!queuedAction) break;

            try {
                const waitTime = this.getNextDelay();
                logger.debug({
                    actionId: queuedAction.id,
                    waitTime,
                    queueSize: this.queue.length
                }, 'Executing action');

                // Wait with jitter
                await this.sleep(waitTime);

                // Execute action
                await queuedAction.action();

                this.lastExecutionTime = Date.now();
                this.executionCount++;

                logger.debug({
                    actionId: queuedAction.id,
                    executionTime: Date.now() - queuedAction.createdAt
                }, 'Action completed');

            } catch (err: any) {
                logger.error({
                    err,
                    actionId: queuedAction.id
                }, 'Action failed');
            }
        }

        this.processing = false;
        logger.debug('Queue processing completed');
    }

    /**
     * Enforce rate limit (max requests per minute)
     */
    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();
        const windowDuration = 60 * 1000; // 1 minute

        // Reset window if needed
        if (now - this.windowStart >= windowDuration) {
            this.windowStart = now;
            this.executionCount = 0;
            return;
        }

        // Check if we've hit the limit
        if (this.executionCount >= this.config.maxRequestsPerMinute) {
            const timeUntilReset = windowDuration - (now - this.windowStart);
            logger.warn({
                timeUntilReset,
                executionCount: this.executionCount,
                limit: this.config.maxRequestsPerMinute
            }, 'Rate limit reached, waiting for window reset');

            await this.sleep(timeUntilReset);

            // Reset window
            this.windowStart = Date.now();
            this.executionCount = 0;
        }
    }

    /**
     * Calculate next delay with jitter (uneven spacing)
     */
    private getNextDelay(): number {
        const { minDelayMs, maxDelayMs, jitterPercent } = this.config;

        // Base delay (random between min and max)
        const baseDelay = minDelayMs + Math.random() * (maxDelayMs - minDelayMs);

        // Add jitter (±jitterPercent)
        const jitterAmount = baseDelay * (jitterPercent / 100);
        const jitter = (Math.random() * 2 - 1) * jitterAmount; // Random between -jitter and +jitter

        const finalDelay = Math.max(minDelayMs, baseDelay + jitter);

        return Math.floor(finalDelay);
    }

    /**
     * Sleep for specified milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get queue statistics
     */
    getStats() {
        return {
            queueSize: this.queue.length,
            processing: this.processing,
            executionCount: this.executionCount,
            windowStart: this.windowStart,
            config: this.config,
        };
    }

    /**
     * Clear queue
     */
    clear(): void {
        this.queue = [];
        logger.info('Queue cleared');
    }
}

// Singleton instance
let queueInstance: RateLimitedQueue | null = null;

/**
 * Get or create rate limiter instance
 */
export function getRateLimiter(config?: Partial<RateLimitConfig>): RateLimitedQueue {
    if (!queueInstance) {
        queueInstance = new RateLimitedQueue(config);
    }
    return queueInstance;
}

/**
 * Enqueue an action with rate limiting
 */
export async function enqueueAction(
    action: () => Promise<any>,
    priority: number = 0
): Promise<string> {
    const limiter = getRateLimiter();
    return limiter.enqueue(action, priority);
}

/**
 * Example usage:
 * 
 * // Enqueue a WhatsApp API call
 * await enqueueAction(async () => {
 *     await sock.sendMessage(jid, { text: 'Hello!' });
 * }, 5); // Priority 5
 * 
 * // Enqueue another call
 * await enqueueAction(async () => {
 *     await sock.groupMetadata(groupId);
 * }, 3); // Priority 3 (lower, will execute after priority 5)
 */
