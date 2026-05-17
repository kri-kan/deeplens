import { Router } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import { AdminController } from '../controllers/admin.controller';

export function createAdminRoutes(waService: WhatsAppService): Router {
    const router = Router();
    const controller = new AdminController(waService);

    /**
     * GET /api/admin/stats
     * Get database statistics
     */
    router.get('/stats', (req, res) => controller.getStats(req, res));

    /**
     * GET /api/admin/sample-data
     * Get sample data from database
     */
    router.get('/sample-data', (req, res) => controller.getSampleData(req, res));

    /**
     * POST /api/admin/reset-database
     * Reset database to clean slate
     */
    router.post('/reset-database', (req, res) => controller.resetDatabase(req, res));

    /**
     * POST /api/admin/sync
     * Manually trigger full sync (groups, newsletters, contacts, chats)
     */
    router.post('/sync', (req, res) => controller.manualSync(req, res));

    /**
     * POST /api/admin/force-initial-sync
     * Force initial sync (manually trigger chats.set logic)
     */
    router.post('/force-initial-sync', (req, res) => controller.forceInitialSync(req, res));

    /**
     * POST /api/admin/refresh-groups
     * Manually refresh groups cache
     */
    router.post('/refresh-groups', (req, res) => controller.refreshGroups(req, res));

    return router;
}
