import { Router } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import { resetDatabase, getDatabaseStats, getSampleData } from '../services/admin.service';
import pino from 'pino';

const logger = pino({ level: 'info' });

export function createAdminRoutes(waService: WhatsAppService): Router {
    const router = Router();

    /**
     * GET /api/admin/stats
     * Get database statistics
     */
    router.get('/stats', async (req, res) => {
        try {
            const stats = await getDatabaseStats();
            res.json(stats);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get database stats');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/admin/sample-data
     * Get sample data from database
     */
    router.get('/sample-data', async (req, res) => {
        try {
            const data = await getSampleData();
            res.json(data);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get sample data');
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/admin/reset-database
     * Reset database to clean slate
     */
    router.post('/reset-database', async (req, res) => {
        try {
            logger.warn('⚠️  Database reset requested');
            const result = await resetDatabase();

            if (result.success) {
                logger.warn({ deletedCounts: result.deletedCounts }, '✅ Database reset successful');
            }

            res.json(result);
        } catch (err: any) {
            logger.error({ err }, 'Failed to reset database');
            res.status(500).json({
                success: false,
                message: err.message,
                deletedCounts: { chats: 0, messages: 0, syncState: 0 }
            });
        }
    });

    /**
     * POST /api/admin/force-initial-sync
     * Force initial sync (manually trigger chats.set logic)
     */
    router.post('/force-initial-sync', async (req, res) => {
        try {
            logger.info('🔄 Force initial sync requested');

            const sock = waService.getSocket();
            if (!sock) {
                return res.status(400).json({
                    success: false,
                    message: 'WhatsApp not connected'
                });
            }

            // Call the manual sync method
            // We'll expose this as a public method
            await (waService as any).performManualInitialSync();

            res.json({
                success: true,
                message: 'Initial sync triggered successfully'
            });
        } catch (err: any) {
            logger.error({ err }, 'Failed to force initial sync');
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    });

    /**
     * POST /api/admin/refresh-groups
     * Manually refresh groups cache
     */
    router.post('/refresh-groups', async (req, res) => {
        try {
            logger.info('🔄 Manual group refresh requested');
            await waService.refreshGroups();

            res.json({
                success: true,
                message: 'Groups refreshed successfully'
            });
        } catch (err: any) {
            logger.error({ err }, 'Failed to refresh groups');
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    });

    return router;
}
