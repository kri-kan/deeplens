import { WhatsAppService } from '../services/whatsapp.service';
import { Router } from 'express';
import { ManagementService } from '../services/management.service';
import { ManagementController } from '../controllers/management.controller';

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


    return router;
}
