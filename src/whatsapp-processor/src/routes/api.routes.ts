import { WhatsAppService } from '../services/whatsapp.service';
import { Router, Request, Response } from 'express';
import { getWhatsAppDbClient } from '../clients/db.client';
import {
    getExclusionList,
    excludeChat,
    includeChat,
    getAllTrackingStates
} from '../utils/whitelist';
import {
    pauseProcessing,
    resumeProcessing,
    getProcessingState
} from '../utils/processing-state';
import { TENANT_NAME } from '../config';
import { getRedisClient } from '../clients/redis.client';
import { getPresignedUrl } from '../clients/media.client';

export function createApiRoutes(waService: WhatsAppService): Router {
    const router = Router();

    /**
     * GET /api/status
     * Returns the current connection status, QR code, tenant name, and session existence
     */
    router.get('/status', async (req: Request, res: Response) => {
        res.json({
            status: waService.getStatus(),
            qr: waService.getQrCode(),
            tenant: TENANT_NAME,
            hasSession: waService.hasSession(),
            processingState: await waService.getProcessingState()
        });
    });

    /**
     * GET /api/groups
     * Returns all standalone groups (not part of communities) with their exclusion status
     */
    router.get('/groups', async (req: Request, res: Response) => {
        const exclusionList = await getExclusionList();
        const groups = waService.getGroups();
        const result = groups.map(g => ({
            ...g,
            isExcluded: exclusionList.includes(g.id)
        }));
        res.json(result);
    });

    /**
     * GET /api/chats
     * Returns all individual 1-on-1 chats with their exclusion status
     */
    router.get('/chats', async (req: Request, res: Response) => {
        const exclusionList = await getExclusionList();
        const chats = waService.getIndividualChats();
        const result = chats.map(c => ({
            ...c,
            isExcluded: exclusionList.includes(c.id)
        }));
        res.json(result);
    });

    /**
     * GET /api/announcements
     * Returns all community announcement channels with their exclusion status
     */
    router.get('/announcements', async (req: Request, res: Response) => {
        const exclusionList = await getExclusionList();
        const announcements = waService.getAnnouncements();
        const result = announcements.map(a => ({
            ...a,
            isExcluded: exclusionList.includes(a.id)
        }));
        res.json(result);
    });

    /**
     * POST /api/chats/exclude
     * Excludes a chat from tracking
     */
    router.post('/chats/exclude', async (req: Request, res: Response) => {
        const { jid } = req.body;

        if (!jid) {
            return res.status(400).json({ error: 'JID is required' });
        }

        await excludeChat(jid);
        res.json({ success: true, jid, action: 'excluded' });
    });

    /**
     * POST /api/chats/include
     * Includes a chat for tracking with resume mode
     */
    router.post('/chats/include', async (req: Request, res: Response) => {
        const { jid, resumeMode } = req.body;

        if (!jid || !resumeMode) {
            return res.status(400).json({ error: 'JID and resumeMode are required' });
        }

        if (resumeMode !== 'from_last' && resumeMode !== 'from_now') {
            return res.status(400).json({ error: 'Invalid resumeMode. Must be "from_last" or "from_now"' });
        }

        await includeChat(jid, resumeMode);
        res.json({ success: true, jid, action: 'included', resumeMode });
    });

    /**
     * GET /api/tracking-states
     * Returns all chat tracking states
     */
    router.get('/tracking-states', async (req: Request, res: Response) => {
        const states = await getAllTrackingStates();
        res.json(states);
    });

    /**
     * POST /api/processing/pause
     * Pauses message processing
     */
    router.post('/processing/pause', async (req: Request, res: Response) => {
        await pauseProcessing();
        res.json({ success: true, state: await getProcessingState() });
    });

    /**
     * POST /api/processing/resume
     * Resumes message processing
     */
    router.post('/processing/resume', async (req: Request, res: Response) => {
        await resumeProcessing();
        res.json({ success: true, state: await getProcessingState() });
    });

    /**
     * GET /api/processing/state
     * Gets the current processing state
     */
    router.get('/processing/state', async (req: Request, res: Response) => {
        res.json(await getProcessingState());
    });

    /**
     * POST /api/sync/manual
     * Manually triggers a sync of chats and contacts
     */
    router.post('/sync/manual', async (req: Request, res: Response) => {
        try {
            await waService.manualSync();
            res.json({ success: true, message: 'Manual sync started' });
        } catch (err: any) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    /**
     * GET /api/debug/db
     * DEBUG ONLY: Returns counts of records in the database
     */
    router.get('/debug/db', async (req: Request, res: Response) => {
        const client = getWhatsAppDbClient();
        if (!client) return res.status(503).json({ error: 'DB client not available' });

        try {
            const chats = await client.query('SELECT COUNT(*) FROM chats');
            const messages = await client.query('SELECT COUNT(*) FROM messages');
            const tracking = await client.query('SELECT COUNT(*) FROM chat_tracking_state');
            const paused = await client.query('SELECT * FROM processing_state');

            res.json({
                chats_count: chats.rows[0].count,
                messages_count: messages.rows[0].count,
                tracking_count: tracking.rows[0].count,
                processing_state: paused.rows
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/media/:messageId
     * Media Read-Through: Returns a presigned URL for the media associated with a message
     */
    router.get('/media/:messageId', async (req: Request, res: Response) => {
        const { messageId } = req.params;
        const redis = getRedisClient();
        const cacheKey = `media_presigned_${messageId}`;

        try {
            // 1. Check Redis
            const cachedUrl = await redis.get(cacheKey);
            if (cachedUrl) {
                return res.redirect(cachedUrl);
            }

            // 2. Miss: Get from DB
            const db = getWhatsAppDbClient();
            if (!db) return res.status(503).json({ error: 'DB not available' });

            const result = await db.query('SELECT media_url FROM messages WHERE message_id = $1', [messageId]);
            if (result.rows.length === 0 || !result.rows[0].media_url) {
                return res.status(404).json({ error: 'Media not found' });
            }

            const mediaUrl = result.rows[0].media_url;
            if (!mediaUrl.startsWith('minio://')) {
                return res.status(400).json({ error: 'Invalid media URL format' });
            }

            // Extract object name
            const objectName = mediaUrl.replace(/^minio:\/\/[^\/]+\//, '');

            // 3. Request Presigned URL from MinIO (valid for 1 hour)
            const presignedUrl = await getPresignedUrl(objectName, 3600);

            // 4. Save to Redis with 55-minute TTL
            await redis.set(cacheKey, presignedUrl, 'EX', 3300);

            // 5. Redirect
            res.redirect(presignedUrl);
        } catch (err: any) {
            console.error('Media read-through failed:', err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}

