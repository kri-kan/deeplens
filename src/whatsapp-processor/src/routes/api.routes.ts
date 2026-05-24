import { WhatsAppService } from '../services/whatsapp.service';
import { Router, Request, Response } from 'express';
import { ManagementService } from '../services/management.service';
import { ManagementController } from '../controllers/management.controller';
import { logger } from '../utils/logger';

export function createApiRoutes(waService: WhatsAppService): Router {
    const router = Router();
    const service = new ManagementService(waService);
    const controller = new ManagementController(service);

    /**
     * GET /api/status
     * Returns the current connection status, QR code, and system health
     */
    router.get('/status', (req, res) => controller.getStatus(req, res));

    /**
     * POST /api/auth/logout
     * Log out the current WhatsApp session and clear auth state
     */
    router.post('/auth/logout', async (req: Request, res: Response) => {
        try {
            logger.info('Logout requested via API');
            await waService.logout();
            res.json({ success: true, message: 'Logged out successfully. Reconnecting...' });
        } catch (err: any) {
            logger.error({ err }, 'Logout failed');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * POST /api/sync/manual
     * Manually trigger a full sync (groups, contacts, chats)
     */
    router.post('/sync/manual', async (req: Request, res: Response) => {
        try {
            if (waService.getStatus() !== 'connected') {
                return res.status(400).json({ success: false, message: 'WhatsApp not connected' });
            }
            await waService.manualSync();
            res.json({ success: true, message: 'Manual sync completed' });
        } catch (err: any) {
            logger.error({ err }, 'Manual sync failed');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * POST /api/processing/toggle
     * Pause or resume message processing
     */
    router.post('/processing/toggle', (req, res) => controller.toggleProcessing(req, res));

    /**
     * GET /api/sync/settings
     * Returns current sync settings
     */
    router.get('/sync/settings', (req, res) => controller.getSyncSettings(req, res));

    /**
     * POST /api/sync/settings
     * Updates sync settings
     */
    router.post('/sync/settings', (req, res) => controller.updateSyncSettings(req, res));

    /**
     * POST /api/exclude
     * Toggles chat exclusion status
     */
    router.post('/exclude', (req, res) => controller.toggleExclusion(req, res));

    /**
     * POST /api/chats/exclude
     * Exclude a chat from tracking
     */
    router.post('/chats/exclude', (req, res) => controller.excludeChat(req, res));

    /**
     * POST /api/chats/bulk-exclude
     * Bulk exclude chats from tracking
     */
    router.post('/chats/bulk-exclude', (req, res) => controller.bulkExcludeChats(req, res));

    /**
     * POST /api/chats/include
     * Include a chat for tracking with resume mode
     */
    router.post('/chats/include', (req, res) => controller.includeChat(req, res));


    return router;
}
