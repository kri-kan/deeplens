import { Router, Request, Response } from 'express';
import { getWhatsAppDbClient } from '../clients/db.client';
import { groupReadinessService } from '../services/group-readiness.service';
import { fetchReviewInboxData } from '../services/review-inbox.service';
import { isStandaloneEmoji } from '../services/zoning.service';
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
                 WHERE mg.status IN ('error', 'enrichment_failed', 'media_missing')
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

            // 6. Groups needing review with stage breakdown
            const stageCountsRes = await client.query(`
                SELECT 
                    COUNT(*) as "all",
                    COUNT(*) FILTER (WHERE review_stage = 'zoning') as "zoning",
                    COUNT(*) FILTER (WHERE review_stage = 'media_sync') as "media_sync",
                    COUNT(*) FILTER (WHERE review_stage = 'qualification') as "qualification",
                    COUNT(*) FILTER (WHERE review_stage = 'catalog_ingestion') as "catalog_ingestion",
                    COUNT(*) FILTER (WHERE review_stage = 'enrichment') as "enrichment"
                FROM wa.message_groups
                WHERE status = 'needs_review'
            `);
            const countsRow = stageCountsRes.rows[0] || {};
            const stageCounts = {
                all: parseInt(countsRow.all || '0', 10),
                zoning: parseInt(countsRow.zoning || '0', 10),
                media_sync: parseInt(countsRow.media_sync || '0', 10),
                qualification: parseInt(countsRow.qualification || '0', 10),
                catalog_ingestion: parseInt(countsRow.catalog_ingestion || '0', 10),
                enrichment: parseInt(countsRow.enrichment || '0', 10),
            };

            const reqStage = ((req.query.stage as string) || 'all').toLowerCase().trim();
            let stageFilterSql = '';
            const needsReviewParams: any[] = [];
            if (reqStage !== 'all' && ['zoning', 'media_sync', 'qualification', 'catalog_ingestion', 'enrichment'].includes(reqStage)) {
                needsReviewParams.push(reqStage);
                stageFilterSql = `AND mg.review_stage = $1`;
            }

            const needsReviewRes = await client.query(
                `SELECT 
                    mg.group_id as "groupId",
                    mg.jid,
                    c.name as "chatName",
                    c.vendor_name as "vendorName",
                    mg.status,
                    mg.review_stage as "reviewStage",
                    mg.error_detail as "errorDetail",
                    mg.media_count as "mediaCount",
                    mg.text_count as "textCount",
                    mg.description,
                    mg.updated_at as "updatedAt",
                    mg.created_at as "createdAt"
                 FROM wa.message_groups mg
                 LEFT JOIN wa.chats c ON mg.jid = c.jid
                 WHERE mg.status = 'needs_review' ${stageFilterSql}
                 ORDER BY mg.updated_at DESC`,
                needsReviewParams
            );

            const summary = {
                stuckSentCount: stuckSentRes.rows.length,
                erroredCount: erroredRes.rows.length,
                missingVendorChatsCount: missingVendorChatsRes.rows.length,
                disabledAutoProcessCount: disabledAutoProcessRes.rows.length,
                pendingMediaCount: pendingMediaRes.rows.length,
                needsReviewCount: stageCounts.all,
                stageCounts,
                totalActionRequired: stuckSentRes.rows.length + erroredRes.rows.length + missingVendorChatsRes.rows.length + stageCounts.all
            };

            res.json({
                success: true,
                summary,
                stageCounts,
                needsReview: needsReviewRes.rows,
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
     * GET /api/admin/review-inbox
     * Unified review inbox endpoint for administrative review queue
     */
    router.get('/review-inbox', async (req: Request, res: Response) => {
        const client = getWhatsAppDbClient();
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            const data = await fetchReviewInboxData(
                client,
                req.query.stage as string,
                req.query.limit,
                req.query.offset
            );
            res.json(data);
        } catch (err: any) {
            logger.error({ err: err.message }, 'Failed to fetch review inbox');
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
                } else if (type === 'error' || type === 'media_missing') {
                    query += ` AND status IN ('error', 'enrichment_failed', 'media_missing')`;
                } else if (type === 'all') {
                    query += ` AND (status IN ('error', 'enrichment_failed', 'media_missing') OR (status = 'product_create_sent' AND deeplens_product_id IS NULL))`;
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
                recoveredStaleMedia: scanResult.recoveredStaleMedia,
                recoveredMediaMissing: scanResult.recoveredMediaMissing
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
                    const isCurSticker = msg.media_type === 'sticker' || (strategy !== 'time_gap' && isStandaloneEmoji(msg.content));

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
                    COUNT(CASE WHEN m.media_type NOT IN ('image', 'photo', 'video', 'sticker') AND NOT (m.group_id LIKE 'sticker_%') AND m.content IS NOT NULL THEN 1 END),
                    STRING_AGG(CASE WHEN m.media_type NOT IN ('sticker') AND NOT (m.group_id LIKE 'sticker_%') THEN m.content END, E'\n'),
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

    /**
     * GET /api/admin/pipeline-events
     * Provides a consolidated live view of all queued operations, recent events, 
     * gauge metrics, and the platform event architecture catalog.
     */
    router.get('/pipeline-events', async (req: Request, res: Response) => {
        const client = getWhatsAppDbClient();
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        const filter = (req.query.filter as string) || 'all';
        const limit = Math.min(200, Math.max(10, parseInt(req.query.limit as string) || 50));
        const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

        try {
            // 1. Metric Gauges
            const metricsRes = await client.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'staging') as "stagingCount",
                    COUNT(*) FILTER (WHERE status = 'product_create_sent' AND deeplens_product_id IS NULL) as "awaitingCreationCount",
                    COUNT(*) FILTER (WHERE has_pending_media = true) as "pendingMediaSyncCount",
                    COUNT(*) FILTER (WHERE status IN ('error', 'enrichment_failed', 'media_missing')) as "errorCount",
                    COUNT(*) FILTER (WHERE status = 'needs_review') as "needsReviewCount"
                FROM wa.message_groups
            `);

            const reprocess24hRes = await client.query(`
                SELECT COUNT(*) as "reprocessCount24h"
                FROM wa.group_audit_log
                WHERE event IN ('split', 'merged', 'reprocess_triggered', 'split_reprocess')
                  AND occurred_at >= NOW() - INTERVAL '24 hours'
            `);

            const metrics = {
                stagingCount: parseInt(metricsRes.rows[0]?.stagingCount || '0', 10),
                awaitingCreationCount: parseInt(metricsRes.rows[0]?.awaitingCreationCount || '0', 10),
                pendingMediaSyncCount: parseInt(metricsRes.rows[0]?.pendingMediaSyncCount || '0', 10),
                errorCount: parseInt(metricsRes.rows[0]?.errorCount || '0', 10),
                needsReviewCount: parseInt(metricsRes.rows[0]?.needsReviewCount || '0', 10),
                reprocessCount24h: parseInt(reprocess24hRes.rows[0]?.reprocessCount24h || '0', 10),
            };

            // 2. Event Architecture Catalog (What each queue is for)
            const catalog = [
                {
                    topic: 'WhatsApp.group.reprocess',
                    name: 'Group Split / Merge Reprocess',
                    direction: 'WhatsApp Processor ➔ .NET Worker Service',
                    consumer: 'WhatsAppGroupWorker',
                    purpose: 'Unlinks split-off media from products during group splits, or transfers and deduplicates media links and vendor listings during group merges.',
                    trigger: 'User executes "Split Group" or "Merge Above" in WhatsApp message browser.',
                    priority: 'High (Immediate)'
                },
                {
                    topic: 'WhatsApp.group.media.added',
                    name: 'Late-Arrival Media Synchronization',
                    direction: 'WhatsApp Processor ➔ .NET Worker Service',
                    consumer: 'WhatsAppGroupWorker',
                    purpose: 'Imports newly arrived photos or video documents into MinIO and links them to already published catalog products.',
                    trigger: 'Vendor posts additional media items into an existing product zone.',
                    priority: 'Normal'
                },
                {
                    topic: 'WhatsApp.group.product.create',
                    name: 'Product Auto-Promotion Queue',
                    direction: 'WhatsApp Processor ➔ .NET Worker Service',
                    consumer: 'WhatsAppGroupWorker',
                    purpose: 'Promotes qualified WhatsApp message groups (≥2 photos, valid caption text, vendor assigned) into DeepLens products and vendor listings.',
                    trigger: 'Automated 45-second staging buffer expiry or manual "Publish" button press.',
                    priority: 'Normal'
                },
                {
                    topic: 'WhatsApp.group.product.created',
                    name: 'Worker Write-Back Confirmation',
                    direction: '.NET Worker Service ➔ WhatsApp Processor',
                    consumer: 'ProductCreatedConsumer',
                    purpose: 'Confirms product ID and vendor listing ID generated in PostgreSQL, transitioning the group status to "product_created".',
                    trigger: 'Successful product insertion in DeepLens PostgreSQL.',
                    priority: 'Immediate'
                },
                {
                    topic: 'WhatsApp.group.product.enrich',
                    name: 'Product Attribute Extraction (LLM)',
                    direction: '.NET Worker Service ➔ Enrichment Worker',
                    consumer: 'ProductEnrichmentWorker',
                    purpose: 'Extracts taxonomy attributes (fabric, craft, border, price, colors) from raw vendor message descriptions using AI models.',
                    trigger: 'Product promotion completion.',
                    priority: 'Background'
                },
                {
                    topic: 'deeplens.videos.uploaded',
                    name: 'Video Transcoding & Frame Extraction',
                    direction: 'SearchAPI / WhatsApp ➔ Worker Service',
                    consumer: 'VideoProcessingWorker',
                    purpose: 'Extracts representative video keyframes and generates optimized WebP thumbnail previews.',
                    trigger: 'Video upload or document .mov/.mp4 detection.',
                    priority: 'Background'
                },
                {
                    topic: 'deeplens.features.extraction',
                    name: 'Visual Embedding Extraction',
                    direction: 'Worker Service ➔ Python ML Service',
                    consumer: 'DeepLens.ReasoningService',
                    purpose: 'Extracts 512-dimensional visual vector embeddings via ResNet/CLIP for visual lens similarity search.',
                    trigger: 'Image ingestion completion in WorkerService.',
                    priority: 'Background'
                }
            ];

            // 3. Filtered Audit Events
            let eventFilterSql = '';
            const filterParams: any[] = [limit, offset];
            if (filter === 'reprocess') {
                eventFilterSql = `AND gal.event IN ('split', 'merged', 'reprocess_triggered', 'split_reprocess')`;
            } else if (filter === 'product_create') {
                eventFilterSql = `AND gal.event IN ('product_create_sent', 'product_created', 'group_staged', 'force_published')`;
            } else if (filter === 'media_sync') {
                eventFilterSql = `AND gal.event IN ('media_added', 'media_missing', 'redownload_requested', 'media_downloaded')`;
            } else if (filter === 'needs_review') {
                eventFilterSql = `AND (gal.event IN ('flagged_needs_review', 'dismissed_review') OR mg.status = 'needs_review')`;
            } else if (filter === 'errors') {
                eventFilterSql = `AND (gal.event LIKE '%fail%' OR gal.event LIKE '%error%' OR mg.status IN ('error', 'enrichment_failed', 'media_missing', 'needs_review'))`;
            }

            const eventsQuery = `
                SELECT 
                    gal.id,
                    gal.group_id as "groupId",
                    gal.event,
                    gal.actor,
                    gal.old_value as "oldValue",
                    gal.new_value as "newValue",
                    gal.occurred_at as "occurredAt",
                    mg.jid,
                    mg.status as "groupStatus",
                    mg.media_count as "mediaCount",
                    mg.text_count as "textCount",
                    mg.has_pending_media as "hasPendingMedia",
                    mg.error_detail as "errorDetail",
                    mg.deeplens_product_id as "productId",
                    p.base_sku as "productCode",
                    p.title as "productTitle",
                    c.name as "chatName",
                    c.vendor_name as "vendorName"
                FROM wa.group_audit_log gal
                LEFT JOIN wa.message_groups mg ON gal.group_id = mg.group_id
                LEFT JOIN wa.chats c ON mg.jid = c.jid
                LEFT JOIN public.products p ON mg.deeplens_product_id = p.id
                WHERE 1=1 ${eventFilterSql}
                ORDER BY gal.id DESC
                LIMIT $1 OFFSET $2
            `;

            const eventsRes = await client.query(eventsQuery, filterParams);

            const formatEventItem = (row: any) => {
                let category: 'reprocess' | 'product_create' | 'media_sync' | 'error' | 'lifecycle' = 'lifecycle';
                let purposeDescription = '';
                const evt = row.event;
                const pCode = row.productCode ? `[${row.productCode}]` : (row.productId ? `[Prod ${row.productId.substring(0, 8)}]` : '');

                if (['split', 'split_reprocess'].includes(evt)) {
                    category = 'reprocess';
                    const target = row.newValue?.targetGroupId ? `into Zone ${row.newValue.targetGroupId.substring(0, 8)}` : '';
                    purposeDescription = `Split Zone: Subtracted media from ${pCode || 'Zone'} ${target} • Media unlinked from original product`;
                } else if (evt === 'merged') {
                    category = 'reprocess';
                    const target = row.newValue?.mergedInto ? `into Zone ${row.newValue.mergedInto.substring(0, 8)}` : (row.newValue?.absorbedGroup ? `absorbed Zone ${row.newValue.absorbedGroup.substring(0, 8)}` : '');
                    purposeDescription = `Merged Zone: Transferred media ${target} • Product media links unified`;
                } else if (evt === 'reprocess_triggered') {
                    category = 'reprocess';
                    purposeDescription = `Reprocess Queued: Dispatched WhatsApp.group.reprocess event to Kafka`;
                } else if (evt === 'product_created') {
                    category = 'product_create';
                    purposeDescription = `Product Created: Successfully generated product ${pCode} in catalog`;
                } else if (evt === 'product_create_sent') {
                    category = 'product_create';
                    purposeDescription = `Promotion Queued: Dispatched WhatsApp.group.product.create to worker`;
                } else if (evt === 'group_staged') {
                    category = 'lifecycle';
                    purposeDescription = `Zone Staged: New product zone detected with ${row.mediaCount ?? 0} media and ${row.textCount ?? 0} texts`;
                } else if (evt === 'media_added') {
                    category = 'media_sync';
                    purposeDescription = `Media Sync: Added late-arriving media to ${pCode || 'product'}`;
                } else if (evt === 'flagged_needs_review') {
                    category = 'lifecycle';
                    purposeDescription = `Needs Review: Flagged at [${row.newValue?.review_stage || 'review'}] stage - ${row.newValue?.error || row.errorDetail || 'Operator review required'}`;
                } else if (evt === 'dismissed_review') {
                    category = 'lifecycle';
                    purposeDescription = `Review Dismissed: Group marked archived by operator`;
                } else if (evt.includes('error') || evt.includes('fail')) {
                    category = 'error';
                    purposeDescription = `Pipeline Alert: ${row.newValue?.error || row.errorDetail || 'Operation encountered an issue'}`;
                } else {
                    purposeDescription = `Event: ${evt} on ${row.groupId?.substring(0, 8) || 'zone'}`;
                }

                return {
                    id: row.id,
                    groupId: row.groupId,
                    event: row.event,
                    category,
                    actor: row.actor || 'system',
                    occurredAt: row.occurredAt,
                    purposeDescription,
                    productCode: row.productCode,
                    productId: row.productId,
                    chatName: row.chatName,
                    vendorName: row.vendorName,
                    jid: row.jid,
                    mediaCount: row.mediaCount,
                    textCount: row.textCount,
                    hasPendingMedia: row.hasPendingMedia,
                    groupStatus: row.groupStatus,
                    errorDetail: row.errorDetail,
                    details: row.newValue || row.oldValue || null,
                };
            };

            const recentEvents = eventsRes.rows.map(formatEventItem);

            // 4. Active In-Flight Queue (Staging, Sent, or Pending Media)
            const activeQueueRes = await client.query(`
                SELECT 
                    mg.group_id as "groupId",
                    mg.jid,
                    mg.status,
                    mg.review_stage as "reviewStage",
                    mg.has_pending_media as "hasPendingMedia",
                    mg.media_count as "mediaCount",
                    mg.text_count as "textCount",
                    mg.description,
                    mg.error_detail as "errorDetail",
                    mg.last_message_at as "lastMessageAt",
                    mg.updated_at as "updatedAt",
                    c.name as "chatName",
                    c.vendor_name as "vendorName",
                    p.base_sku as "productCode",
                    mg.deeplens_product_id as "productId"
                FROM wa.message_groups mg
                LEFT JOIN wa.chats c ON mg.jid = c.jid
                LEFT JOIN public.products p ON mg.deeplens_product_id = p.id
                WHERE mg.status IN ('staging', 'product_create_sent', 'needs_review') 
                   OR mg.has_pending_media = true
                   OR mg.status IN ('error', 'enrichment_failed')
                ORDER BY mg.updated_at DESC
                LIMIT 50
            `);

            res.json({
                success: true,
                metrics,
                catalog,
                recentEvents,
                activeQueue: activeQueueRes.rows,
                totalEvents: recentEvents.length,
            });
        } catch (err: any) {
            logger.error({ err: err.message }, 'Failed to fetch pipeline events');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    return router;
}
