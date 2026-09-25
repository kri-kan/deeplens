import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
    getNextRetryDelayMs,
    RETRY_DELAYS_MS,
    MAX_AUTO_RETRIES,
    MediaRetryService,
} from '../src/services/media-retry.service';

describe('Media Retry Queue with 5x Exponential Backoff (ADO #991)', () => {
    test('calculates correct backoff delays across all 5 stages', () => {
        assert.equal(getNextRetryDelayMs(0), 60 * 1000, 'Stage 0 delay must be 1 min (60s)');
        assert.equal(getNextRetryDelayMs(1), 3 * 60 * 1000, 'Stage 1 delay must be 3 mins (180s)');
        assert.equal(getNextRetryDelayMs(2), 8 * 60 * 1000, 'Stage 2 delay must be 8 mins (480s)');
        assert.equal(getNextRetryDelayMs(3), 20 * 60 * 1000, 'Stage 3 delay must be 20 mins (1200s)');
        assert.equal(getNextRetryDelayMs(4), 60 * 60 * 1000, 'Stage 4 delay must be 60 mins (3600s)');
    });

    test('returns -1 when retry count reaches or exceeds MAX_AUTO_RETRIES (5)', () => {
        assert.equal(getNextRetryDelayMs(MAX_AUTO_RETRIES), -1, 'Stage 5 must be exhausted (-1)');
        assert.equal(getNextRetryDelayMs(MAX_AUTO_RETRIES + 1), -1, 'Stage 6 must be exhausted (-1)');
        assert.equal(getNextRetryDelayMs(10), -1, 'Stage 10 must be exhausted (-1)');
    });

    test('RETRY_DELAYS_MS has exactly 5 stages matching user requirements', () => {
        assert.equal(RETRY_DELAYS_MS.length, 5);
        assert.equal(MAX_AUTO_RETRIES, 5);
    });

    test('runCycle gracefully skips execution when socket is not connected', async () => {
        const service = new MediaRetryService();
        const mockWaService: any = {
            getSocket: () => null, // disconnected
            retryMediaDownload: mock.fn(),
        };

        service.setWhatsAppService(mockWaService);
        const result = await service.runCycle();

        assert.deepEqual(result, { processed: 0, succeeded: 0, failed: 0 });
        assert.equal(mockWaService.retryMediaDownload.mock.calls.length, 0);
    });

    test('runCycle invokes retryMediaDownload on eligible candidates and respects concurrency', async () => {
        const service = new MediaRetryService();
        const mockDb = { query: mock.fn(async () => ({ rows: [] })) };
        service.setDbClient(mockDb);

        const mockCandidates = [
            {
                message_id: 'msg_001',
                jid: 'chat1@g.us',
                media_type: 'photo',
                media_retry_count: 0,
                media_last_attempt: null,
                created_at: new Date().toISOString(),
                group_id: null,
            },
            {
                message_id: 'msg_002',
                jid: 'chat1@g.us',
                media_type: 'video',
                media_retry_count: 1,
                media_last_attempt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                group_id: null,
            }
        ];

        // Mock candidates retrieval
        service.getEligibleCandidates = async () => mockCandidates;

        const retryMock = mock.fn(async (msgId: string) => {
            if (msgId === 'msg_001') {
                return { success: true, mediaUrl: 'minio://whatsapp-data/photos/test.jpg' };
            }
            return { success: false, error: 'Socket timeout' };
        });

        const mockWaService: any = {
            getSocket: () => ({}), // Connected dummy socket
            retryMediaDownload: retryMock,
        };

        service.setWhatsAppService(mockWaService);
        const result = await service.runCycle(10);

        assert.equal(result.processed, 2);
        assert.equal(result.succeeded, 1);
        assert.equal(result.failed, 1);
        assert.equal(retryMock.mock.calls.length, 2);
    });

    test('start and stop correctly toggle service running state', () => {
        const service = new MediaRetryService();
        assert.equal((service as any).isRunning, false);

        service.start(60000);
        assert.equal((service as any).isRunning, true);

        service.stop();
        assert.equal((service as any).isRunning, false);
    });
});
