import { Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import { resetDatabase, getDatabaseStats, getSampleData } from '../services/admin.service';
import { logger } from '../utils/logger';

export class AdminController {
    constructor(private waService: WhatsAppService) {}

    async getStats(req: Request, res: Response) {
        try {
            const stats = await getDatabaseStats();
            res.json(stats);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get database stats');
            res.status(500).json({ error: err.message });
        }
    }

    async getSampleData(req: Request, res: Response) {
        try {
            const data = await getSampleData();
            res.json(data);
        } catch (err: any) {
            logger.error({ err }, 'Failed to get sample data');
            res.status(500).json({ error: err.message });
        }
    }

    async resetDatabase(req: Request, res: Response) {
        try {
            logger.warn('⚠️ Database reset requested');
            const result = await resetDatabase();
            res.json(result);
        } catch (err: any) {
            logger.error({ err }, 'Failed to reset database');
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async manualSync(req: Request, res: Response) {
        try {
            if (this.waService.getStatus() !== 'connected') {
                return res.status(400).json({ success: false, message: 'WhatsApp not connected' });
            }
            await this.waService.manualSync();
            res.json({ success: true, message: 'Manual sync completed' });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async forceInitialSync(req: Request, res: Response) {
        try {
            await this.waService.performManualInitialSync();
            res.json({ success: true, message: 'Initial sync triggered' });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async refreshGroups(req: Request, res: Response) {
        try {
            await this.waService.refreshGroups();
            res.json({ success: true, message: 'Groups refreshed' });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}
