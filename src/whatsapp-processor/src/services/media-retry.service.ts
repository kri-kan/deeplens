import { logger } from '../utils/logger';
import { getWhatsAppDbClient } from '../clients/db.client';
import { WhatsAppService } from './whatsapp.service';

/**
 * 5-Stage Exponential Backoff Schedule:
 * Attempt 0 (initial failure) -> Retry 1 after 1 minute (60s)
 * Attempt 1                   -> Retry 2 after 3 minutes (180s)
 * Attempt 2                   -> Retry 3 after 8 minutes (480s)
 * Attempt 3                   -> Retry 4 after 20 minutes (1200s)
 * Attempt 4                   -> Retry 5 after 60 minutes (3600s)
 * Attempt >= 5                -> Max auto-retries reached. Ignored by automated queue.
 *                               Manual retry remains fully available.
 */
export const RETRY_DELAYS_MS = [
    60 * 1000,        // 1 min
    3 * 60 * 1000,    // 3 mins
    8 * 60 * 1000,    // 8 mins
    20 * 60 * 1000,   // 20 mins
    60 * 60 * 1000,   // 60 mins
];

export const MAX_AUTO_RETRIES = 5;
export const RETRY_CONCURRENCY = 2;
export const INTER_DOWNLOAD_THROTTLE_MS = 250;

export interface MediaRetryCandidate {
    message_id: string;
    jid: string;
    media_type: string;
    media_retry_count: number;
    media_last_attempt: string | null;
    created_at: string;
    group_id: string | null;
}

export interface MediaRetryStatus {
    isRunning: boolean;
    eligibleCount: number;
    inBackoffCount: number;
    exhaustedCount: number;
    totalMissingCount: number;
    downloadedLast24h: number;
}

export function getNextRetryDelayMs(retryCount: number): number {
    if (retryCount >= MAX_AUTO_RETRIES) {
        return -1; // Exhausted automated retries
    }
    return RETRY_DELAYS_MS[Math.min(retryCount, RETRY_DELAYS_MS.length - 1)];
}

export class MediaRetryService {
    private isRunning = false;
    private pollerInterval: NodeJS.Timeout | null = null;
    private isProcessingCycle = false;
    private waService: WhatsAppService | null = null;
    private customDbClient: any = null;

    constructor() {}

    public setWhatsAppService(service: WhatsAppService) {
        this.waService = service;
    }

    public setDbClient(client: any) {
        this.customDbClient = client;
    }

    private getDb(): any {
        return this.customDbClient || getWhatsAppDbClient();
    }

    /**
     * Start the automated background recovery worker
     */
    public start(intervalMs: number = 30000): void {
        if (this.isRunning) {
            logger.warn('MediaRetryService is already running.');
            return;
        }

        this.isRunning = true;
        logger.info({ intervalMs, maxRetries: MAX_AUTO_RETRIES }, '🚀 MediaRetryService started with 5x backoff queue');

        this.pollerInterval = setInterval(async () => {
            try {
                await this.runCycle();
            } catch (err: any) {
                logger.error({ err: err?.message }, 'Unhandled error in MediaRetryService cycle');
            }
        }, intervalMs);
    }

    /**
     * Stop the automated background worker
     */
    public stop(): void {
        if (this.pollerInterval) {
            clearInterval(this.pollerInterval);
            this.pollerInterval = null;
        }
        this.isRunning = false;
        logger.info('🛑 MediaRetryService stopped.');
    }

    /**
     * Query candidate messages eligible for retry based on the backoff schedule
     */
    public async getEligibleCandidates(limit: number = 10): Promise<MediaRetryCandidate[]> {
        const client = this.getDb();
        if (!client) return [];

        const sql = `
            SELECT message_id, jid, media_type, 
                   COALESCE(media_retry_count, 0) as media_retry_count, 
                   media_last_attempt, created_at, group_id
            FROM wa.messages
            WHERE media_type IS NOT NULL
              AND media_url IS NULL
              AND is_deleted = false
              AND COALESCE(media_retry_count, 0) < ${MAX_AUTO_RETRIES}
              AND "timestamp" > EXTRACT(EPOCH FROM (NOW() - INTERVAL '14 days'))::bigint
              AND (
                (COALESCE(media_retry_count, 0) = 0 
                  AND (media_last_attempt IS NULL OR media_last_attempt < NOW() - INTERVAL '1 minute') 
                  AND created_at < NOW() - INTERVAL '1 minute')
                OR (media_retry_count = 1 AND media_last_attempt < NOW() - INTERVAL '3 minutes')
                OR (media_retry_count = 2 AND media_last_attempt < NOW() - INTERVAL '8 minutes')
                OR (media_retry_count = 3 AND media_last_attempt < NOW() - INTERVAL '20 minutes')
                OR (media_retry_count = 4 AND media_last_attempt < NOW() - INTERVAL '60 minutes')
              )
            ORDER BY COALESCE(media_retry_count, 0) ASC, COALESCE(media_last_attempt, created_at) ASC
            LIMIT $1;
        `;

        const res = await client.query(sql, [limit]);
        return res.rows as MediaRetryCandidate[];
    }

    /**
     * Execute one retry cycle across eligible messages
     */
    public async runCycle(batchLimit: number = 6): Promise<{ processed: number; succeeded: number; failed: number }> {
        if (this.isProcessingCycle) {
            logger.debug('MediaRetryService cycle already in flight, skipping overlapping tick');
            return { processed: 0, succeeded: 0, failed: 0 };
        }

        if (!this.waService) {
            logger.debug('MediaRetryService: WhatsAppService not attached yet, skipping cycle');
            return { processed: 0, succeeded: 0, failed: 0 };
        }

        const sock = this.waService.getSocket();
        if (!sock) {
            logger.debug('MediaRetryService: WhatsApp socket not connected, deferring retries');
            return { processed: 0, succeeded: 0, failed: 0 };
        }

        const client = this.getDb();
        if (!client) {
            return { processed: 0, succeeded: 0, failed: 0 };
        }

        this.isProcessingCycle = true;
        let processed = 0;
        let succeeded = 0;
        let failed = 0;

        try {
            const candidates = await this.getEligibleCandidates(batchLimit);
            if (candidates.length === 0) {
                return { processed: 0, succeeded: 0, failed: 0 };
            }

            logger.info({ count: candidates.length }, 'Processing media retry candidates queue...');

            // Process candidates in chunks of RETRY_CONCURRENCY
            for (let i = 0; i < candidates.length; i += RETRY_CONCURRENCY) {
                const chunk = candidates.slice(i, i + RETRY_CONCURRENCY);

                await Promise.all(chunk.map(async (cand) => {
                    processed++;
                    const currentCount = cand.media_retry_count;
                    const nextCount = currentCount + 1;

                    try {
                        logger.info(
                            { messageId: cand.message_id, attempt: nextCount, max: MAX_AUTO_RETRIES, jid: cand.jid },
                            `Attempting background media download (Retry ${nextCount}/${MAX_AUTO_RETRIES})...`
                        );

                        const result = await this.waService!.retryMediaDownload(cand.message_id);

                        if (result.success && result.mediaUrl) {
                            succeeded++;
                            await client.query(
                                `UPDATE wa.messages 
                                 SET media_retry_count = $1, 
                                     media_last_attempt = NOW()
                                 WHERE message_id = $2`,
                                [nextCount, cand.message_id]
                            );
                            logger.info(
                                { messageId: cand.message_id, attempt: nextCount, mediaUrl: result.mediaUrl },
                                `✅ Background media download succeeded on retry ${nextCount}!`
                            );
                        } else {
                            failed++;
                            const nextDelay = getNextRetryDelayMs(nextCount);
                            await client.query(
                                `UPDATE wa.messages 
                                 SET media_retry_count = $1, 
                                     media_last_attempt = NOW()
                                 WHERE message_id = $2`,
                                [nextCount, cand.message_id]
                            );

                            if (nextCount >= MAX_AUTO_RETRIES) {
                                logger.warn(
                                    { messageId: cand.message_id, totalAttempts: nextCount },
                                    `Max automated retries (${MAX_AUTO_RETRIES}) exhausted. Halting auto-retries for this message. Manual retry remains available.`
                                );
                            } else {
                                logger.info(
                                    { messageId: cand.message_id, nextAttempt: nextCount + 1, nextDelayMs: nextDelay },
                                    `Retry ${nextCount} failed; queued for next backoff cycle in ${Math.round(nextDelay / 1000)}s`
                                );
                            }
                        }
                    } catch (itemErr: any) {
                        failed++;
                        logger.error(
                            { messageId: cand.message_id, err: itemErr?.message },
                            'Exception during background media retry'
                        );
                        await client.query(
                            `UPDATE wa.messages 
                             SET media_retry_count = $1, 
                                 media_last_attempt = NOW()
                             WHERE message_id = $2`,
                            [nextCount, cand.message_id]
                        ).catch(() => {});
                    }
                }));

                // Gentle throttle between chunks
                if (i + RETRY_CONCURRENCY < candidates.length) {
                    await new Promise((resolve) => setTimeout(resolve, INTER_DOWNLOAD_THROTTLE_MS));
                }
            }

            return { processed, succeeded, failed };
        } finally {
            this.isProcessingCycle = false;
        }
    }

    /**
     * Returns operational status and health metrics for the media retry queue
     */
    public async getQueueStatus(): Promise<MediaRetryStatus> {
        const client = getWhatsAppDbClient();
        if (!client) {
            return {
                isRunning: this.isRunning,
                eligibleCount: 0,
                inBackoffCount: 0,
                exhaustedCount: 0,
                totalMissingCount: 0,
                downloadedLast24h: 0,
            };
        }

        const countsRes = await client.query(`
            SELECT 
                COUNT(*) FILTER (WHERE media_url IS NULL) as total_missing,
                COUNT(*) FILTER (
                    WHERE media_url IS NULL 
                      AND COALESCE(media_retry_count, 0) < ${MAX_AUTO_RETRIES}
                      AND (
                        (COALESCE(media_retry_count, 0) = 0 AND (media_last_attempt IS NULL OR media_last_attempt < NOW() - INTERVAL '1 minute') AND created_at < NOW() - INTERVAL '1 minute')
                        OR (media_retry_count = 1 AND media_last_attempt < NOW() - INTERVAL '3 minutes')
                        OR (media_retry_count = 2 AND media_last_attempt < NOW() - INTERVAL '8 minutes')
                        OR (media_retry_count = 3 AND media_last_attempt < NOW() - INTERVAL '20 minutes')
                        OR (media_retry_count = 4 AND media_last_attempt < NOW() - INTERVAL '60 minutes')
                      )
                ) as eligible,
                COUNT(*) FILTER (
                    WHERE media_url IS NULL 
                      AND COALESCE(media_retry_count, 0) < ${MAX_AUTO_RETRIES}
                      AND NOT (
                        (COALESCE(media_retry_count, 0) = 0 AND (media_last_attempt IS NULL OR media_last_attempt < NOW() - INTERVAL '1 minute') AND created_at < NOW() - INTERVAL '1 minute')
                        OR (media_retry_count = 1 AND media_last_attempt < NOW() - INTERVAL '3 minutes')
                        OR (media_retry_count = 2 AND media_last_attempt < NOW() - INTERVAL '8 minutes')
                        OR (media_retry_count = 3 AND media_last_attempt < NOW() - INTERVAL '20 minutes')
                        OR (media_retry_count = 4 AND media_last_attempt < NOW() - INTERVAL '60 minutes')
                      )
                ) as in_backoff,
                COUNT(*) FILTER (WHERE media_url IS NULL AND COALESCE(media_retry_count, 0) >= ${MAX_AUTO_RETRIES}) as exhausted
            FROM wa.messages
            WHERE media_type IS NOT NULL
              AND is_deleted = false
              AND "timestamp" > EXTRACT(EPOCH FROM (NOW() - INTERVAL '14 days'))::bigint;
        `);

        const downloadedRes = await client.query(`
            SELECT COUNT(*) as downloaded_24h
            FROM wa.messages
            WHERE media_type IS NOT NULL
              AND media_url IS NOT NULL
              AND media_last_attempt > NOW() - INTERVAL '24 hours'
              AND COALESCE(media_retry_count, 0) > 0;
        `);

        const row = countsRes.rows[0];
        return {
            isRunning: this.isRunning,
            eligibleCount: parseInt(row?.eligible || '0', 10),
            inBackoffCount: parseInt(row?.in_backoff || '0', 10),
            exhaustedCount: parseInt(row?.exhausted || '0', 10),
            totalMissingCount: parseInt(row?.total_missing || '0', 10),
            downloadedLast24h: parseInt(downloadedRes.rows[0]?.downloaded_24h || '0', 10),
        };
    }
}

export const mediaRetryService = new MediaRetryService();
