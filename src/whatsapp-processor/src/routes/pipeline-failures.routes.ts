import { Router, Request, Response } from 'express';
import { getWhatsAppDbClient } from '../clients/db.client';
import { groupReadinessService } from '../services/group-readiness.service';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

export function createPipelineFailuresRoutes(): Router {
    const router = Router();

    /**
     * GET /api/admin/pipeline-failures
     * Consolidates all pipeline errors, stuck states, missing vendor assignments, and pending media issues.
     */
    router.get('/pipeline-failures', async (req: Request, res: Response) => {
        const client = getWhatsAppDbClient();
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            // 1. Groups stuck in product_create_sent (> 5 minutes without deeplens_product_id)
            const stuckSentRes = await client.query(
                `SELECT 
                    mg.group_id as "groupId",
                    mg.jid,
                    c.name as "chatName",
                    c.vendor_name as "vendorName",
                    mg.status,
                    mg.media_count as "mediaCount",
                    mg.text_count as "textCount",
                    mg.description,
                    mg.updated_at as "updatedAt"
                 FROM wa.message_groups mg
                 LEFT JOIN wa.chats c ON mg.jid = c.jid
                 WHERE mg.status = 'product_create_sent' 
                   AND mg.deeplens_product_id IS NULL
                 ORDER BY mg.updated_at ASC`
            );

            // 2. Groups in error or enrichment_failed status
            const erroredRes = await client.query(
                `SELECT 
                    mg.group_id as "groupId",
                    mg.jid,
                    c.name as "chatName",
                    c.vendor_name as "vendorName",
                    mg.status,
                    mg.error_detail as "errorDetail",
                    mg.media_count as "mediaCount",
                    mg.text_count as "textCount",
                    mg.description,
                    mg.updated_at as "updatedAt"
                 FROM wa.message_groups mg
                 LEFT JOIN wa.chats c ON mg.jid = c.jid
                 WHERE mg.status IN ('error', 'enrichment_failed')
                 ORDER BY mg.updated_at DESC`
            );

            // 3. Unassigned vendor chats with staged groups
            const missingVendorChatsRes = await client.query(
                `SELECT 
                    c.jid,
                    c.name as "chatName",
                    COUNT(mg.group_id) as "stagedGroupsCount",
                    MAX(mg.updated_at) as "lastMessageAt"
                 FROM wa.chats c
                 JOIN wa.message_groups mg ON c.jid = mg.jid
                 WHERE c.vendor_id IS NULL AND mg.status IN ('staging', 'error')
                 GROUP BY c.jid, c.name
                 ORDER BY COUNT(mg.group_id) DESC`
            );

            // 4. Staged groups in chats where auto_process_products is OFF
            const disabledAutoProcessRes = await client.query(
                `SELECT 
                    mg.group_id as "groupId",
                    mg.jid,
                    c.name as "chatName",
                    c.vendor_name as "vendorName",
                    mg.media_count as "mediaCount",
                    mg.text_count as "textCount",
                    mg.description,
                    mg.updated_at as "updatedAt"
                 FROM wa.message_groups mg
                 JOIN wa.chats c ON mg.jid = c.jid
                 WHERE mg.status = 'staging' 
                   AND c.auto_process_products = FALSE
                   AND mg.process_as_product = FALSE
                   AND c.vendor_id IS NOT NULL
                 ORDER BY mg.updated_at DESC`
            );

            // 5. Messages with pending/stalled media downloads
            const pendingMediaRes = await client.query(
                `SELECT 
                    m.message_id as "messageId",
                    m.group_id as "groupId",
                    m.jid,
                    c.name as "chatName",
                    m.media_type as "mediaType",
                    m.processing_status as "processingStatus",
                    m.processing_error as "processingError",
                    m.timestamp
                 FROM wa.messages m
                 LEFT JOIN wa.chats c ON m.jid = c.jid
                 WHERE m.media_type IN ('image', 'photo', 'video')
                   AND m.processing_status IN ('queued', 'processing', 'failed')
                 ORDER BY m.timestamp DESC LIMIT 100`
            );

            const summary = {
                stuckSentCount: stuckSentRes.rows.length,
                erroredCount: erroredRes.rows.length,
                missingVendorChatsCount: missingVendorChatsRes.rows.length,
                disabledAutoProcessCount: disabledAutoProcessRes.rows.length,
                pendingMediaCount: pendingMediaRes.rows.length,
                totalActionRequired: stuckSentRes.rows.length + erroredRes.rows.length + missingVendorChatsRes.rows.length
            };

            res.json({
                success: true,
                summary,
                stuckSent: stuckSentRes.rows,
                errored: erroredRes.rows,
                missingVendorChats: missingVendorChatsRes.rows,
                disabledAutoProcess: disabledAutoProcessRes.rows,
                pendingMedia: pendingMediaRes.rows
            });
        } catch (err: any) {
            logger.error({ err: err.message }, 'Failed to fetch pipeline failures');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * POST /api/admin/pipeline-failures/retry
     * Bulk retries failed, stuck, or un-processed message groups
     */
    router.post('/pipeline-failures/retry', async (req: Request, res: Response) => {
        const { groupIds, type } = req.body; // groupIds array or type = 'all' | 'stuck' | 'error'
        const client = getWhatsAppDbClient();

        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            let targetGroupIds: string[] = [];

            if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
                targetGroupIds = groupIds;
            } else if (type === 'all' || type === 'stuck' || type === 'error') {
                let query = `SELECT group_id FROM wa.message_groups WHERE 1=1`;
                if (type === 'stuck') {
                    query += ` AND status = 'product_create_sent' AND deeplens_product_id IS NULL`;
                } else if (type === 'error') {
                    query += ` AND status IN ('error', 'enrichment_failed')`;
                } else if (type === 'all') {
                    query += ` AND (status IN ('error', 'enrichment_failed') OR (status = 'product_create_sent' AND deeplens_product_id IS NULL))`;
                }
                const resGroups = await client.query(query);
                targetGroupIds = resGroups.rows.map(r => r.group_id);
            }

            if (targetGroupIds.length === 0) {
                return res.json({ success: true, message: 'No target groups found for retry', retriedCount: 0 });
            }

            let retriedCount = 0;
            for (const groupId of targetGroupIds) {
                await client.query(
                    `UPDATE wa.message_groups SET status = 'staging', error_detail = NULL, updated_at = NOW() WHERE group_id = $1`,
                    [groupId]
                );
                await groupReadinessService.checkAndEmitGroupEvent(groupId);
                retriedCount++;
            }

            logger.info({ retriedCount }, 'Bulk retried pipeline failure groups');
            res.json({ success: true, message: `Successfully queued ${retriedCount} groups for processing`, retriedCount });
        } catch (err: any) {
            logger.error({ err: err.message }, 'Failed bulk retry of pipeline failures');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * POST /api/admin/pipeline-failures/auto-fix
     * Triggers complete 1-click self-healing scan and optional auto-process enablement
     */
    router.post('/pipeline-failures/auto-fix', async (req: Request, res: Response) => {
        const { enableAutoProcessForAssigned } = req.body; // boolean
        const client = getWhatsAppDbClient();

        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            let autoProcessUpdatedCount = 0;

            if (enableAutoProcessForAssigned) {
                const autoProcRes = await client.query(
                    `UPDATE wa.chats 
                     SET auto_process_products = TRUE, updated_at = NOW() 
                     WHERE vendor_id IS NOT NULL AND auto_process_products = FALSE`
                );
                autoProcessUpdatedCount = autoProcRes.rowCount || 0;
            }

            const scanResult = await groupReadinessService.runSelfHealingScan();

            res.json({
                success: true,
                message: 'Auto-fix self-healing pipeline execution completed',
                autoProcessUpdatedCount,
                recoveredStuckSent: scanResult.recoveredStuckSent,
                recoveredVendorErrors: scanResult.recoveredVendorErrors,
                recoveredStaleMedia: scanResult.recoveredStaleMedia
            });
        } catch (err: any) {
            logger.error({ err: err.message }, 'Failed auto-fix execution');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * POST /api/admin/regroup-chat
     * Retroactively re-groups historical messages for a chat (or all chats) using the updated sticker-boundary rule.
     * Splitting multi-product groups into distinct sticker-separated product groups!
     */
    router.post('/regroup-chat', async (req: Request, res: Response) => {
        const { jid } = req.body; // jid or 'all'
        const client = getWhatsAppDbClient();

        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            let targetJids: string[] = [];
            if (jid && jid !== 'all') {
                targetJids = [jid];
            } else {
                const chatRes = await client.query(`SELECT DISTINCT jid FROM wa.messages WHERE is_deleted = false`);
                targetJids = chatRes.rows.map(r => r.jid);
            }

            let totalMessagesReGrouped = 0;
            let totalNewGroupsCreated = 0;

            for (const targetJid of targetJids) {
                const chatRes = await client.query(`SELECT grouping_config FROM wa.chats WHERE jid = $1`, [targetJid]);
                const grouping_config = chatRes.rows[0]?.grouping_config || {};
                const strategy = grouping_config.strategy || 'hybrid';
                const timeGapSeconds = grouping_config.timeGapSeconds || 300;

                const msgsRes = await client.query(
                    `SELECT message_id, timestamp, media_type, content, group_id 
                     FROM wa.messages 
                     WHERE jid = $1 AND is_deleted = false 
                     ORDER BY timestamp ASC, id ASC`,
                    [targetJid]
                );
                const messages = msgsRes.rows;
                if (messages.length === 0) continue;

                let currentGroupId = `product_${randomUUID()}`;
                let isPrevSticker = false;
                let prevTimestamp = 0;
                let isFirstMsgInGroup = true;

                for (const msg of messages) {
                    const isCurSticker = msg.media_type === 'sticker';

                    if (isCurSticker) {
                        currentGroupId = `sticker_${randomUUID()}`;
                        isPrevSticker = true;
                        isFirstMsgInGroup = true;
                    } else if (isPrevSticker || isFirstMsgInGroup) {
                        currentGroupId = `product_${randomUUID()}`;
                        isPrevSticker = false;
                        isFirstMsgInGroup = false;
                        totalNewGroupsCreated++;
                    } else {
                        if (strategy !== 'sticker' && prevTimestamp > 0) {
                            const diff = msg.timestamp - prevTimestamp;
                            if (diff > timeGapSeconds) {
                                currentGroupId = `product_${randomUUID()}`;
                                totalNewGroupsCreated++;
                            }
                        }
                    }

                    prevTimestamp = msg.timestamp;

                    if (msg.group_id !== currentGroupId) {
                        await client.query(
                            `UPDATE wa.messages SET group_id = $1 WHERE message_id = $2`,
                            [currentGroupId, msg.message_id]
                        );
                        totalMessagesReGrouped++;
                    }
                }
            }

            // Sync wa.message_groups table for new groups
            await client.query(
                `INSERT INTO wa.message_groups (group_id, jid, status, process_as_product, media_count, text_count, description, last_message_at, created_at, updated_at)
                 SELECT 
                    m.group_id,
                    m.jid,
                    'staging',
                    c.auto_process_products,
                    COUNT(CASE WHEN m.media_type IN ('image', 'photo', 'video') THEN 1 END),
                    COUNT(CASE WHEN m.media_type NOT IN ('image', 'photo', 'video', 'sticker') AND m.content IS NOT NULL THEN 1 END),
                    STRING_AGG(CASE WHEN m.media_type NOT IN ('sticker') THEN m.content END, E'\n'),
                    COALESCE(TO_TIMESTAMP(MAX(m.timestamp)), NOW()),
                    NOW(),
                    NOW()
                 FROM wa.messages m
                 JOIN wa.chats c ON m.jid = c.jid
                 WHERE m.group_id LIKE 'product_%' AND m.is_deleted = false
                 GROUP BY m.group_id, m.jid, c.auto_process_products
                 ON CONFLICT (group_id) DO UPDATE SET 
                    media_count = EXCLUDED.media_count,
                    text_count = EXCLUDED.text_count,
                    description = EXCLUDED.description,
                    last_message_at = EXCLUDED.last_message_at,
                    updated_at = NOW()`
            );

            logger.info({ totalMessagesReGrouped, totalNewGroupsCreated }, 'Retroactive re-grouping migration completed');

            res.json({
                success: true,
                message: `Successfully re-grouped ${totalMessagesReGrouped} messages into ${totalNewGroupsCreated} new sticker-separated product groups!`,
                totalMessagesReGrouped,
                totalNewGroupsCreated
            });
        } catch (err: any) {
            logger.error({ err: err.message }, 'Failed retroactive re-grouping');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    return router;
}
