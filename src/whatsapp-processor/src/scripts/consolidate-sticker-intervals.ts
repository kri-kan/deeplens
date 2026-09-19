import { getWhatsAppDbClient, initializeDbClient } from '../clients/db.client';
import { groupReadinessService } from '../services/group-readiness.service';
import { isStandaloneEmoji } from '../services/zoning.service';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

interface StickerConsolidationStats {
    totalChats: number;
    chatsProcessed: number;
    totalIntervals: number;
    enrichedProducts: number;
    orphanMediaAbsorbed: number;
    draftZonesUnified: number;
    skippedMultiProductIntervals: number;
}

export async function runConsolidation(): Promise<StickerConsolidationStats> {
    await initializeDbClient();
    const client = getWhatsAppDbClient();
    if (!client) {
        logger.error('Failed to get database client');
        process.exit(1);
    }

    const stats: StickerConsolidationStats = {
        totalChats: 0,
        chatsProcessed: 0,
        totalIntervals: 0,
        enrichedProducts: 0,
        orphanMediaAbsorbed: 0,
        draftZonesUnified: 0,
        skippedMultiProductIntervals: 0
    };

    try {
        // 1. Fetch all chats configured for sticker strategy
        const chatsRes = await client.query(
            `SELECT jid, name, grouping_config 
             FROM wa.chats 
             WHERE enable_message_grouping = true 
               AND grouping_config->>'strategy' = 'sticker'
             ORDER BY name ASC`
        );

        const chats = chatsRes.rows;
        stats.totalChats = chats.length;
        logger.info(`Starting Targeted Sticker Consolidation across ${chats.length} sticker communities...`);

        for (const chat of chats) {
            const { jid, name } = chat;
            logger.info({ jid, name }, 'Consolidating sticker intervals for chat...');

            // Fetch all messages chronologically
            const messagesRes = await client.query(
                `SELECT id, message_id, jid, content, media_type, timestamp, group_id, metadata 
                 FROM wa.messages 
                 WHERE jid = $1 AND is_deleted = false 
                 ORDER BY timestamp ASC, id ASC`,
                [jid]
            );

            const messages = messagesRes.rows;
            if (messages.length === 0) continue;

            // Partition messages into sticker/emoji-bounded intervals
            const intervals: Array<{
                stickerMsg?: any;
                items: any[];
            }> = [];

            let currentIntervalItems: any[] = [];

            for (const msg of messages) {
                const isSticker = msg.media_type === 'sticker' 
                    || msg.metadata?.stickerMessage !== undefined
                    || (typeof msg.metadata === 'string' && msg.metadata.includes('stickerMessage'));
                const isEmojiBoundary = isStandaloneEmoji(msg.content);
                const isDelimiter = isSticker || isEmojiBoundary;

                if (isDelimiter) {
                    if (currentIntervalItems.length > 0) {
                        intervals.push({ items: currentIntervalItems });
                        currentIntervalItems = [];
                    }
                    intervals.push({ stickerMsg: msg, items: [] });
                } else {
                    currentIntervalItems.push(msg);
                }
            }

            if (currentIntervalItems.length > 0) {
                intervals.push({ items: currentIntervalItems });
            }

            // Process each interval
            for (const interval of intervals) {
                stats.totalIntervals++;

                // Handle delimiter message itself (sticker or standalone emoji)
                if (interval.stickerMsg) {
                    if (!interval.stickerMsg.group_id || !interval.stickerMsg.group_id.startsWith('sticker_')) {
                        const stickerGroupId = `sticker_${randomUUID()}`;
                        if (interval.stickerMsg.media_type === 'sticker' || interval.stickerMsg.metadata?.stickerMessage !== undefined) {
                            await client.query(
                                `UPDATE wa.messages SET group_id = $1, media_type = 'sticker' WHERE id = $2`,
                                [stickerGroupId, interval.stickerMsg.id]
                            );
                        } else {
                            await client.query(
                                `UPDATE wa.messages SET group_id = $1 WHERE id = $2`,
                                [stickerGroupId, interval.stickerMsg.id]
                            );
                        }
                    }
                    continue;
                }

                const items = interval.items;
                if (items.length === 0) continue;

                // Find distinct group_ids in this interval (excluding sticker groups)
                const distinctGroupIds = Array.from(new Set(
                    items.map(m => m.group_id).filter(g => g && !g.startsWith('sticker_'))
                ));

                // Check which of these groups are already published catalog products
                let existingProducts: any[] = [];
                if (distinctGroupIds.length > 0) {
                    const prodRes = await client.query(
                        `SELECT group_id, deeplens_product_id, deeplens_listing_id, status 
                         FROM wa.message_groups 
                         WHERE group_id = ANY($1) 
                           AND (deeplens_product_id IS NOT NULL OR status = 'product_created')`,
                        [distinctGroupIds]
                    );
                    existingProducts = prodRes.rows;
                }

                // SCENARIO 1: Exactly 1 group has an existing catalog product
                if (existingProducts.length === 1) {
                    const winnerGroupId = existingProducts[0].group_id;
                    const itemsToAbsorb = items.filter(m => m.group_id !== winnerGroupId);

                    if (itemsToAbsorb.length > 0) {
                        const absorbIds = itemsToAbsorb.map(m => m.id);
                        await client.query(
                            `UPDATE wa.messages SET group_id = $1 WHERE id = ANY($2)`,
                            [winnerGroupId, absorbIds]
                        );

                        const mediaAbsorbed = itemsToAbsorb.filter(m => 
                            m.media_type && ['image', 'video', 'photo'].includes(m.media_type)
                        ).length;

                        stats.enrichedProducts++;
                        stats.orphanMediaAbsorbed += mediaAbsorbed;

                        logger.info({
                            jid,
                            winnerGroupId,
                            absorbedCount: itemsToAbsorb.length,
                            mediaAbsorbed
                        }, 'Enriched existing catalog product with orphan media from sticker interval');

                        // Emit media.added event so worker service attaches media to catalog product
                        try {
                            await groupReadinessService.checkAndEmitGroupEvent(winnerGroupId);
                        } catch (err: any) {
                            logger.error({ err: err.message, winnerGroupId }, 'Error updating readiness for enriched product');
                        }
                    }
                }
                // SCENARIO 2: Multiple distinct catalog products exist within this interval
                else if (existingProducts.length > 1) {
                    // Safety protection: Do not merge two already-published SKUs together
                    stats.skippedMultiProductIntervals++;
                    logger.warn({
                        jid,
                        existingProductGroupIds: existingProducts.map(p => p.group_id)
                    }, 'Multiple published products found in single interval without separating sticker; preserving distinct product groups.');
                }
                // SCENARIO 3: No catalog products created yet (all draft / staging)
                else {
                    let targetGroupId = distinctGroupIds[0];
                    if (!targetGroupId) {
                        targetGroupId = `product_${randomUUID()}`;
                    }

                    const itemsToUpdate = items.filter(m => m.group_id !== targetGroupId);
                    if (itemsToUpdate.length > 0) {
                        const updateIds = itemsToUpdate.map(m => m.id);
                        await client.query(
                            `UPDATE wa.messages SET group_id = $1 WHERE id = ANY($2)`,
                            [targetGroupId, updateIds]
                        );
                        stats.draftZonesUnified++;
                    }

                    // Check and stage complete unified draft
                    try {
                        await groupReadinessService.checkAndEmitGroupEvent(targetGroupId);
                    } catch (err: any) {
                        logger.error({ err: err.message, targetGroupId }, 'Error updating readiness for draft zone');
                    }
                }
            }

            // Clean up empty / stale message groups that have no messages and no catalog product
            await client.query(
                `DELETE FROM wa.message_groups 
                 WHERE jid = $1 
                   AND deeplens_product_id IS NULL 
                   AND group_id NOT IN (SELECT DISTINCT group_id FROM wa.messages WHERE jid = $1 AND group_id IS NOT NULL)`,
                [jid]
            );

            stats.chatsProcessed++;
            logger.info({ jid, name }, 'Completed consolidation for chat.');
        }

        logger.info(stats, 'Targeted Sticker Consolidation successfully completed!');
        return stats;
    } catch (err: any) {
        logger.error({ err: err.message }, 'Fatal error during Targeted Sticker Consolidation');
        throw err;
    }
}

// Direct execution entrypoint
if (require.main === module) {
    runConsolidation()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
