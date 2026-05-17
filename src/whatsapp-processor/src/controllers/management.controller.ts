import { Request, Response } from 'express';
import { ManagementService } from '../services/management.service';
import { logger } from '../utils/logger';

export class ManagementController {
    constructor(private service: ManagementService) {}

    async getStatus(req: Request, res: Response) {
        try {
            const status = await this.service.getStatus();
            res.json(status);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    async toggleProcessing(req: Request, res: Response) {
        const { pause } = req.body;
        try {
            const result = await this.service.toggleProcessing(pause);
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    async getSyncSettings(req: Request, res: Response) {
        try {
            const settings = await this.service.getSyncSettings();
            res.json(settings);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    async updateSyncSettings(req: Request, res: Response) {
        try {
            const result = await this.service.updateSyncSettings(req.body);
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    async toggleExclusion(req: Request, res: Response) {
        const { jid, exclude } = req.body;
        try {
            const result = await this.service.toggleExclusion(jid, exclude);
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }
}
