import { Router, Request, Response } from 'express';
import { getWhatsAppDbClient } from '../clients/db.client';
import { groupReadinessService } from '../services/group-readiness.service';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

export function createGroupReviewRoutes(): Router {
    const router = Router();

    /**
     * Helper to log audit entries from route handlers
     */
    async function logAudit(groupId: string, event: string, actor: string, oldValue: any, newValue: any): Promise<void> {
        const client = getWhatsAppDbClient();
        if (!client) return;
        try {
            await client.query(
                `INSERT INTO wa.group_audit_log (group_id, event, actor, old_value, new_value, occurred_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [groupId, event, actor, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null]
            );
        } catch (err) {
            logger.error({ err, groupId, event }, 'Failed to write group audit log from route');
        }
    }

    /**
     * GET /api/group-review/:jid
     * Returns all message groups for a given chat, including their nested messages
     */
    router.get('/group-review/:jid', async (req: Request, res: Response) => {
        const { jid } = req.params;
        const client = getWhatsAppDbClient();
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            // Fetch groups
            const groupsRes = await client.query(
                `SELECT 
                    mg.group_id as "groupId",
                    mg.jid,
                    mg.status,
                    mg.process_as_product as "processAsProduct",
                    mg.description,
                    mg.media_count as "mediaCount",
                    mg.text_count as "textCount",
                    mg.deeplens_product_id as "deeplensProductId",
                    mg.has_pending_media as "hasPendingMedia",
                    p.base_sku as "productCode",
                    mg.deeplens_listing_id as "deeplensListingId",
                    mg.category,
                    mg.sub_category as "subCategory",
                    mg.detected_price as "detectedPrice",
                    CASE WHEN mg.is_plus_shipping = false THEN 'free' ELSE 'plus' END as "detectedShipping",
                    mg.last_message_at as "lastMessageAt",
                    mg.product_created_at as "productCreatedAt",
                    mg.error_detail as "errorDetail",
                    mg.created_at as "createdAt",
                    mg.updated_at as "updatedAt"
                 FROM wa.message_groups mg
                 LEFT JOIN public.products p ON mg.deeplens_product_id = p.id
                 WHERE mg.jid = $1
                 ORDER BY mg.last_message_at DESC`,
                [jid]
            );

            // Fetch messages in groups
            const messagesRes = await client.query(
                `SELECT 
                    message_id as "messageId",
                    group_id as "groupId",
                    content,
                    media_type as "mediaType",
                    media_url as "mediaUrl",
                    media_mime_type as "mimeType",
                    timestamp,
                    sender,
                    is_from_me as "isFromMe"
                 FROM wa.messages
                 WHERE jid = $1 AND group_id IS NOT NULL AND is_deleted = false
                 ORDER BY timestamp ASC`,
                [jid]
            );

            // Group messages by groupId
            const messagesByGroup = new Map<string, any[]>();
            for (const msg of messagesRes.rows) {
                if (!messagesByGroup.has(msg.groupId)) {
                    messagesByGroup.set(msg.groupId, []);
                }
                // Construct standard media properties
                messagesByGroup.get(msg.groupId)!.push(msg);
            }

            // Nest messages inside groups
            const groups = groupsRes.rows.map(group => ({
                ...group,
                messages: messagesByGroup.get(group.groupId) || []
            }));

            res.json(groups);
        } catch (err: any) {
            logger.error({ err: err.message, jid }, 'Failed to fetch groups');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * GET /api/group-review/:groupId/audit
     * Returns full audit log for a group
     */
    router.get('/group-review/:groupId/audit', async (req: Request, res: Response) => {
        const { groupId } = req.params;
        const client = getWhatsAppDbClient();
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            const auditRes = await client.query(
                `SELECT id, group_id as "groupId", event, actor, old_value as "oldValue", new_value as "newValue", occurred_at as "occurredAt"
                 FROM wa.group_audit_log
                 WHERE group_id = $1
                 ORDER BY occurred_at DESC`,
                [groupId]
            );
            res.json(auditRes.rows);
        } catch (err: any) {
            logger.error({ err: err.message, groupId }, 'Failed to fetch audit log');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * PATCH /api/group-review/:groupId/flag
     * Toggle process_as_product flag on/off
     */
    router.patch('/group-review/:groupId/flag', async (req: Request, res: Response) => {
        const { groupId } = req.params;
        const { processAsProduct } = req.body;
        const client = getWhatsAppDbClient();

        if (processAsProduct === undefined) {
            return res.status(400).json({ success: false, message: 'processAsProduct is required' });
        }
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            // Get current value
            const currentRes = await client.query(
                `SELECT process_as_product, status FROM wa.message_groups WHERE group_id = $1`,
                [groupId]
            );

            if (currentRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Group not found' });
            }

            const oldVal = currentRes.rows[0].process_as_product;

            // Update database
            await client.query(
                `UPDATE wa.message_groups 
                 SET process_as_product = $1, updated_at = NOW() 
                 WHERE group_id = $2`,
                [processAsProduct, groupId]
            );

            await logAudit(
                groupId, 
                'process_flag_enabled', 
                'operator', 
                { processAsProduct: oldVal }, 
                { processAsProduct }
            );

            // Re-evaluate group readiness
            await groupReadinessService.checkAndEmitGroupEvent(groupId);

            res.json({ success: true, message: `process_as_product updated to ${processAsProduct}` });
        } catch (err: any) {
            logger.error({ err: err.message, groupId }, 'Failed to update flag');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * POST /api/group-review/:groupId/ignore
     * Mark group as ignored/unignored
     */
    router.post('/group-review/:groupId/ignore', async (req: Request, res: Response) => {
        const { groupId } = req.params;
        const { ignore } = req.body;
        const client = getWhatsAppDbClient();

        if (ignore === undefined) {
            return res.status(400).json({ success: false, message: 'ignore is required' });
        }
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            const currentRes = await client.query(
                `SELECT status FROM wa.message_groups WHERE group_id = $1`,
                [groupId]
            );

            if (currentRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Group not found' });
            }

            const oldStatus = currentRes.rows[0].status;
            const newStatus = ignore ? 'ignored' : 'staging';

            await client.query(
                `UPDATE wa.message_groups 
                 SET status = $1, updated_at = NOW() 
                 WHERE group_id = $2`,
                [newStatus, groupId]
            );

            await logAudit(
                groupId,
                ignore ? 'ignored' : 'unignored',
                'operator',
                { status: oldStatus },
                { status: newStatus }
            );

            if (!ignore) {
                // If unignoring, re-evaluate group readiness
                await groupReadinessService.checkAndEmitGroupEvent(groupId);
            }

            res.json({ success: true, message: `Group status updated to ${newStatus}` });
        } catch (err: any) {
            logger.error({ err: err.message, groupId }, 'Failed to ignore group');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * POST /api/group-review/:groupId/split
     * Splits a group at a specific message
     */
    router.post('/group-review/:groupId/split', async (req: Request, res: Response) => {
        const { groupId } = req.params;
        const { messageId } = req.body;
        const client = getWhatsAppDbClient();

        if (!messageId) {
            return res.status(400).json({ success: false, message: 'messageId is required' });
        }
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            // Find message and check context
            const msgRes = await client.query(
                `SELECT timestamp, jid, group_id FROM wa.messages WHERE message_id = $1 AND is_deleted = false`,
                [messageId]
            );

            if (msgRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Message not found' });
            }

            const msg = msgRes.rows[0];
            if (msg.group_id !== groupId) {
                return res.status(400).json({ success: false, message: 'Message does not belong to specified group' });
            }

            // Check if group is already created as product
            const groupRes = await client.query(
                `SELECT status, process_as_product FROM wa.message_groups WHERE group_id = $1`,
                [groupId]
            );
            const isProductCreated = groupRes.rows[0]?.status === 'product_created';
            const processAsProduct = groupRes.rows[0]?.process_as_product || false;

            const newGroupId = `product_${randomUUID()}`;

            // Update message group references for splitting
            const updateRes = await client.query(
                `UPDATE wa.messages
                 SET group_id = $1, updated_at = NOW()
                 WHERE group_id = $2 AND timestamp >= $3 AND jid = $4`,
                [newGroupId, groupId, msg.timestamp, msg.jid]
            );

            await logAudit(groupId, 'split', 'operator', { action: 'split_at', messageId }, { targetGroupId: newGroupId });

            // Create staging record for the new group
            await client.query(
                `INSERT INTO wa.message_groups 
                 (group_id, jid, status, process_as_product, description, media_count, text_count, last_message_at, created_at, updated_at)
                 VALUES ($1, $2, 'staging', $3, 'Split group', 0, 0, NOW(), NOW(), NOW())`,
                [newGroupId, msg.jid, processAsProduct]
            );
            await logAudit(newGroupId, 'group_staged', 'operator', null, { status: 'staging', splitFrom: groupId });

            // Re-evaluate old group
            await groupReadinessService.checkAndEmitGroupEvent(groupId);
            // Re-evaluate new group
            await groupReadinessService.checkAndEmitGroupEvent(newGroupId);

            // If old group was already a product, emit reprocessing event to unlink media on C# side
            if (isProductCreated) {
                await groupReadinessService.emitReprocessEvent('split', groupId, newGroupId);
            }

            res.json({ success: true, message: 'Group split successful', newGroupId, splitCount: updateRes.rowCount });
        } catch (err: any) {
            logger.error({ err: err.message, groupId }, 'Failed to split group');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * POST /api/group-review/:groupId/merge
     * Merges current group (source) into target group
     */
    router.post('/group-review/:groupId/merge', async (req: Request, res: Response) => {
        const { groupId } = req.params;
        const { targetGroupId } = req.body;
        const client = getWhatsAppDbClient();

        if (!targetGroupId) {
            return res.status(400).json({ success: false, message: 'targetGroupId is required' });
        }
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            // Fetch groups
            const sourceGroupRes = await client.query(
                `SELECT status FROM wa.message_groups WHERE group_id = $1`,
                [groupId]
            );
            const targetGroupRes = await client.query(
                `SELECT status FROM wa.message_groups WHERE group_id = $1`,
                [targetGroupId]
            );

            if (sourceGroupRes.rows.length === 0 || targetGroupRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Source or target group not found' });
            }

            const sourceStatus = sourceGroupRes.rows[0].status;
            const targetStatus = targetGroupRes.rows[0].status;
            const isReprocessNeeded = sourceStatus === 'product_created' || targetStatus === 'product_created';

            // Merge messages to target group
            const updateRes = await client.query(
                `UPDATE wa.messages
                 SET group_id = $1, updated_at = NOW()
                 WHERE group_id = $2`,
                [targetGroupId, groupId]
            );

            // Audit logging
            await logAudit(groupId, 'merged', 'operator', { status: sourceStatus }, { mergedInto: targetGroupId });
            await logAudit(targetGroupId, 'merged', 'operator', { status: targetStatus }, { absorbedGroup: groupId });

            // Mark source group as ignored
            await client.query(
                `UPDATE wa.message_groups 
                 SET status = 'ignored', error_detail = $1, updated_at = NOW() 
                 WHERE group_id = $2`,
                [`Merged into ${targetGroupId}`, groupId]
            );

            // Re-evaluate target group
            await groupReadinessService.checkAndEmitGroupEvent(targetGroupId);

            // Emit Kafka reprocess if either was product_created
            if (isReprocessNeeded) {
                await groupReadinessService.emitReprocessEvent('merge', groupId, targetGroupId);
            }

            res.json({ success: true, message: 'Groups merged successfully', mergedCount: updateRes.rowCount });
        } catch (err: any) {
            logger.error({ err: err.message, groupId }, 'Failed to merge groups');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * PATCH /api/group-review/:groupId/reassign-message
     * Move a single message to another group
     */
    router.patch('/group-review/:groupId/reassign-message', async (req: Request, res: Response) => {
        const { groupId } = req.params;
        const { messageId, targetGroupId } = req.body;
        const client = getWhatsAppDbClient();

        if (!messageId || !targetGroupId) {
            return res.status(400).json({ success: false, message: 'messageId and targetGroupId are required' });
        }
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            // Verify source
            const msgRes = await client.query(
                `SELECT group_id FROM wa.messages WHERE message_id = $1 AND is_deleted = false`,
                [messageId]
            );

            if (msgRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Message not found' });
            }

            if (msgRes.rows[0].group_id !== groupId) {
                return res.status(400).json({ success: false, message: 'Message does not belong to specified source group' });
            }

            // Check target group exists
            const targetRes = await client.query(
                `SELECT status FROM wa.message_groups WHERE group_id = $1`,
                [targetGroupId]
            );

            if (targetRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Target group not found' });
            }

            const oldGroupRes = await client.query(
                `SELECT status FROM wa.message_groups WHERE group_id = $1`,
                [groupId]
            );
            const isOldProductCreated = oldGroupRes.rows[0]?.status === 'product_created';

            // Update message group assignment
            await client.query(
                `UPDATE wa.messages
                 SET group_id = $1, updated_at = NOW()
                 WHERE message_id = $2`,
                [targetGroupId, messageId]
            );

            await logAudit(groupId, 'message_reassigned', 'operator', { messageId }, { targetGroupId });
            await logAudit(targetGroupId, 'message_reassigned', 'operator', null, { messageId, reassignedFrom: groupId });

            // Re-evaluate both groups
            await groupReadinessService.checkAndEmitGroupEvent(groupId);
            await groupReadinessService.checkAndEmitGroupEvent(targetGroupId);

            // If the old group was already a product, emit reprocessing event to clean up media
            if (isOldProductCreated) {
                await groupReadinessService.emitReprocessEvent('split', groupId, targetGroupId);
            }

            res.json({ success: true, message: 'Message reassigned successfully' });
        } catch (err: any) {
            logger.error({ err: err.message, groupId }, 'Failed to reassign message');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * POST /api/group-review/:groupId/force-publish
     * Force publish a group as a product, bypassing qualifies checks
     */
    router.post('/group-review/:groupId/force-publish', async (req: Request, res: Response) => {
        const { groupId } = req.params;
        const client = getWhatsAppDbClient();

        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            await groupReadinessService.forceEmitProductCreate(groupId);
            res.json({ success: true, message: 'Force publish event triggered successfully' });
        } catch (err: any) {
            logger.error({ err: err.message, groupId }, 'Failed to force publish group');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * PATCH /api/chats/:jid/vendor
     * Assigns vendor (seller) to a WhatsApp chat
     */
    router.patch('/chats/:jid/vendor', async (req: Request, res: Response) => {
        const { jid } = req.params;
        const { vendorId } = req.body; // UUID or null
        const client = getWhatsAppDbClient();

        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            let vendorName: string | null = null;
            if (vendorId) {
                const vendorRes = await client.query(
                    'SELECT vendor_name FROM public.vendors WHERE id = $1',
                    [vendorId]
                );
                if (vendorRes.rows.length > 0) {
                    vendorName = vendorRes.rows[0].vendor_name;
                }
            }

            // Update vendor ID and name
            const updateRes = await client.query(
                `UPDATE wa.chats
                 SET vendor_id = $1, vendor_name = $2, updated_at = NOW()
                 WHERE jid = $3`,
                [vendorId || null, vendorName, jid]
            );

            if (updateRes.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Chat not found' });
            }

            logger.info({ jid, vendorId }, 'Assigned vendor to chat');

            // If a vendor was assigned, auto-recover groups that were in "error" state because of missing vendor
            if (vendorId) {
                const affectedGroups = await client.query(
                    `SELECT group_id FROM wa.message_groups 
                     WHERE jid = $1 AND error_detail LIKE 'Vendor not assigned%'`,
                    [jid]
                );

                for (const row of affectedGroups.rows) {
                    await groupReadinessService.checkAndEmitGroupEvent(row.group_id);
                }
            }

            res.json({ success: true, message: 'Vendor assigned successfully' });
        } catch (err: any) {
            logger.error({ err: err.message, jid }, 'Failed to assign vendor to chat');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    /**
     * PATCH /api/chats/:jid/auto-process
     * Toggles auto_process_products setting for a chat
     */
    router.patch('/chats/:jid/auto-process', async (req: Request, res: Response) => {
        const { jid } = req.params;
        const { autoProcess } = req.body; // boolean
        const client = getWhatsAppDbClient();

        if (autoProcess === undefined) {
            return res.status(400).json({ success: false, message: 'autoProcess is required' });
        }
        if (!client) {
            return res.status(500).json({ success: false, message: 'Database client not available' });
        }

        try {
            const updateRes = await client.query(
                `UPDATE wa.chats
                 SET auto_process_products = $1, updated_at = NOW()
                 WHERE jid = $2`,
                [autoProcess, jid]
            );

            if (updateRes.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Chat not found' });
            }

            logger.info({ jid, autoProcess }, 'Updated auto-process setting for chat');

            // If auto-process was turned ON, evaluate all staging groups in this chat
            if (autoProcess) {
                const affectedGroups = await client.query(
                    `SELECT group_id FROM wa.message_groups 
                     WHERE jid = $1 AND status = 'staging'`,
                    [jid]
                );

                for (const row of affectedGroups.rows) {
                    await groupReadinessService.checkAndEmitGroupEvent(row.group_id);
                }
            }

            res.json({ success: true, message: `auto_process_products toggled to ${autoProcess}` });
        } catch (err: any) {
            logger.error({ err: err.message, jid }, 'Failed to toggle auto process setting');
            res.status(500).json({ success: false, message: err.message });
        }
    });

    return router;
}
