import { Router, Request, Response } from 'express';
import { mediaRetryService } from '../services/media-retry.service';
import { logger } from '../utils/logger';

export function createMediaRetryRoutes(): Router {
    const router = Router();

    /**
     * GET /api/media-retry/status
     * Returns queue metrics, backoff counts, and runner health
     */
    router.get('/status', async (req: Request, res: Response) => {
        try {
            const status = await mediaRetryService.getQueueStatus();
            res.json({ success: true, ...status });
        } catch (err: any) {
            logger.error({ err: err.message }, 'Failed to fetch media retry queue status');
            res.status(500).json({ success: false, error: err.message });
        }
    });

    /**
     * POST /api/media-retry/cycle
     * Trigger a single retry cycle on-demand
     */
    router.post('/cycle', async (req: Request, res: Response) => {
        try {
            const batchLimit = Math.min(Math.max(parseInt(req.body?.limit || '6', 10), 1), 20);
            const result = await mediaRetryService.runCycle(batchLimit);
            res.json({ success: true, result });
        } catch (err: any) {
            logger.error({ err: err.message }, 'Failed to run on-demand media retry cycle');
            res.status(500).json({ success: false, error: err.message });
        }
    });

    /**
     * POST /api/media-retry/start
     * Start the automated background retry runner
     */
    router.post('/start', (req: Request, res: Response) => {
        const intervalMs = Math.max(parseInt(req.body?.intervalMs || '30000', 10), 10000);
        mediaRetryService.start(intervalMs);
        res.json({ success: true, message: `MediaRetryService started with ${intervalMs}ms interval` });
    });

    /**
     * POST /api/media-retry/stop
     * Stop the automated background retry runner
     */
    router.post('/stop', (req: Request, res: Response) => {
        mediaRetryService.stop();
        res.json({ success: true, message: 'MediaRetryService stopped' });
    });

    return router;
}
