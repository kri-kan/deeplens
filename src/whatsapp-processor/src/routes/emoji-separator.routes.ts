import { Router, Request, Response } from 'express';
import { getWhatsAppDbClient } from '../clients/db.client';
import { zoningService } from '../services/zoning.service';
import { logger } from '../utils/logger';

export function createEmojiSeparatorRoutes(): Router {
    const router = Router();

    /**
     * GET /api/emoji-separators
     * Returns all registered emoji and text separators with active status and match counts
     */
    router.get('/', async (_req: Request, res: Response) => {
        const client = getWhatsAppDbClient();
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            const queryRes = await client.query(`
                SELECT 
                    s.id,
                    s.pattern,
                    s.match_type as "matchType",
                    s.description,
                    s.is_active as "isActive",
                    s.match_count as "matchCount",
                    s.created_at as "createdAt",
                    s.updated_at as "updatedAt",
                    (
                        SELECT COUNT(*) 
                        FROM wa.messages m 
                        WHERE m.is_deleted = false 
                          AND (
                              m.content = s.pattern 
                              OR TRIM(m.content) = s.pattern 
                              OR REPLACE(REPLACE(REPLACE(TRIM(m.content), '*', ''), '_', ''), '~', '') = s.pattern
                          )
                    )::int as "liveMatches"
                FROM wa.emoji_separators s
                ORDER BY s.is_active DESC, s.created_at DESC
            `);

            return res.json({
                success: true,
                separators: queryRes.rows
            });
        } catch (err: any) {
            logger.error({ err: err.message }, 'Failed to fetch emoji separators');
            return res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * POST /api/emoji-separators
     * Registers a new emoji or text separator and optionally triggers re-splitting across affected chats
     */
    router.post('/', async (req: Request, res: Response) => {
        const { pattern, description, matchType = 'exact', autoResplit = true, jid } = req.body;
        if (!pattern || typeof pattern !== 'string' || !pattern.trim()) {
            return res.status(400).json({ success: false, message: 'Separator pattern is required and must be non-empty.' });
        }

        const trimmedPattern = pattern.trim();
        const client = getWhatsAppDbClient();
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            // Upsert into wa.emoji_separators
            const upsertRes = await client.query(`
                INSERT INTO wa.emoji_separators (pattern, match_type, description, is_active, updated_at)
                VALUES ($1, $2, $3, true, NOW())
                ON CONFLICT (pattern) DO UPDATE
                SET match_type = EXCLUDED.match_type,
                    description = COALESCE(EXCLUDED.description, wa.emoji_separators.description),
                    is_active = true,
                    updated_at = NOW()
                RETURNING id, pattern, match_type as "matchType", description, is_active as "isActive", match_count as "matchCount", created_at as "createdAt", updated_at as "updatedAt"
            `, [trimmedPattern, matchType, description || null]);

            const separator = upsertRes.rows[0];

            // Refresh zoning cache immediately
            await zoningService.refreshDynamicSeparators(client);

            let resplitResult = null;
            if (autoResplit) {
                logger.info({ pattern: trimmedPattern, jid }, 'Triggering auto-resplit for new emoji separator...');
                resplitResult = await zoningService.repartitionForSeparator(trimmedPattern, jid, client);
            }

            return res.status(201).json({
                success: true,
                message: `Emoji separator '${trimmedPattern}' registered successfully${autoResplit ? ' and auto-resplit completed' : ''}.`,
                separator,
                resplitResult
            });
        } catch (err: any) {
            logger.error({ err: err.message, pattern }, 'Failed to add emoji separator');
            return res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * PUT /api/emoji-separators/:id
     * Updates an existing separator (e.g. toggle is_active, change description)
     */
    router.put('/:id', async (req: Request, res: Response) => {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid separator ID' });
        }

        const { is_active, description, pattern, autoResplit = false } = req.body;
        const client = getWhatsAppDbClient();
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            const updateRes = await client.query(`
                UPDATE wa.emoji_separators
                SET is_active = COALESCE($1, is_active),
                    description = COALESCE($2, description),
                    pattern = COALESCE($3, pattern),
                    updated_at = NOW()
                WHERE id = $4
                RETURNING id, pattern, match_type as "matchType", description, is_active as "isActive", match_count as "matchCount", created_at as "createdAt", updated_at as "updatedAt"
            `, [is_active !== undefined ? is_active : null, description !== undefined ? description : null, pattern !== undefined ? pattern.trim() : null, id]);

            if (updateRes.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Separator not found' });
            }

            const updated = updateRes.rows[0];
            await zoningService.refreshDynamicSeparators(client);

            let resplitResult = null;
            if (autoResplit && updated.isActive) {
                resplitResult = await zoningService.repartitionForSeparator(updated.pattern, undefined, client);
            }

            return res.json({
                success: true,
                message: 'Emoji separator updated successfully',
                separator: updated,
                resplitResult
            });
        } catch (err: any) {
            logger.error({ err: err.message, id }, 'Failed to update emoji separator');
            return res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * DELETE /api/emoji-separators/:id
     * Deletes a separator pattern
     */
    router.delete('/:id', async (req: Request, res: Response) => {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid separator ID' });
        }

        const client = getWhatsAppDbClient();
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            const delRes = await client.query('DELETE FROM wa.emoji_separators WHERE id = $1 RETURNING pattern', [id]);
            if (delRes.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Separator not found' });
            }

            await zoningService.refreshDynamicSeparators(client);

            return res.json({
                success: true,
                message: `Separator '${delRes.rows[0].pattern}' deleted successfully`
            });
        } catch (err: any) {
            logger.error({ err: err.message, id }, 'Failed to delete emoji separator');
            return res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * POST /api/emoji-separators/:id/re-split
     * Manually triggers re-splitting across chats containing this separator
     */
    router.post('/:id/re-split', async (req: Request, res: Response) => {
        const id = parseInt(req.params.id, 10);
        const { jid } = req.body;
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid separator ID' });
        }

        const client = getWhatsAppDbClient();
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            const sepRes = await client.query('SELECT pattern FROM wa.emoji_separators WHERE id = $1', [id]);
            if (sepRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Separator not found' });
            }

            const pattern = sepRes.rows[0].pattern;
            const resplitResult = await zoningService.repartitionForSeparator(pattern, jid, client);

            return res.json({
                success: true,
                message: `Re-splitting completed for separator '${pattern}'`,
                resplitResult
            });
        } catch (err: any) {
            logger.error({ err: err.message, id }, 'Failed to execute re-split for emoji separator');
            return res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * GET /api/emoji-separators/candidates
     * Detects potential emoji/symbol boundary candidates from recent WhatsApp messages
     */
    router.get('/candidates', async (_req: Request, res: Response) => {
        const client = getWhatsAppDbClient();
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            // Find short text messages (1-20 chars) that are not yet in wa.emoji_separators
            const candidatesRes = await client.query(`
                SELECT 
                    TRIM(content) as "candidateText",
                    COUNT(*) as "frequency",
                    COUNT(DISTINCT jid) as "chatCount",
                    MAX(timestamp) as "latestTimestamp"
                FROM wa.messages
                WHERE is_deleted = false
                  AND (media_type IS NULL OR media_type = 'text')
                  AND content IS NOT NULL
                  AND LENGTH(TRIM(content)) BETWEEN 1 AND 25
                  AND content !~* '^[0-9]+$'
                  AND content !~* '^(ok|yes|no|hi|hello|price|rate|size)$'
                  AND NOT EXISTS (
                      SELECT 1 FROM wa.emoji_separators s 
                      WHERE s.pattern = TRIM(content) 
                         OR s.pattern = REPLACE(REPLACE(REPLACE(TRIM(content), '*', ''), '_', ''), '~', '')
                  )
                GROUP BY TRIM(content)
                HAVING COUNT(*) >= 2
                ORDER BY COUNT(*) DESC, MAX(timestamp) DESC
                LIMIT 20
            `);

            return res.json({
                success: true,
                candidates: candidatesRes.rows
            });
        } catch (err: any) {
            logger.error({ err: err.message }, 'Failed to fetch separator candidates');
            return res.status(500).json({ success: false, message: err.message });
        }
    });

    return router;
}
