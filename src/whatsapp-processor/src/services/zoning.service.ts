import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

export interface ZoneAssignmentResult {
    groupId: string;
    isNewGroup: boolean;
    strategyUsed: 'sticker_first' | 'time_fallback';
}

export class ZoningService {
    /**
     * Determines whether a chat uses Sticker-First zoning or Time-Based fallback.
     * Chats with strategy='sticker' or chats that contain stickers default to Sticker-First.
     */
    public async isStickerDelimitedChat(jid: string, groupingConfig: any, client: any): Promise<boolean> {
        if (groupingConfig?.strategy === 'sticker') {
            return true;
        }
        if (groupingConfig?.strategy === 'time_gap') {
            return false;
        }
        // Default / Hybrid: Check if chat contains any sticker messages
        const res = await client.query(
            `SELECT EXISTS (
                SELECT 1 FROM wa.messages 
                WHERE jid = $1 
                  AND (media_type = 'sticker' OR (metadata->>'stickerMessage') IS NOT NULL)
             ) AS has_stickers`,
            [jid]
        );
        return res.rows[0]?.has_stickers === true;
    }

    /**
     * Core Zoning Engine: Assigns a message to its proper product Zone or sticker delimiter.
     * Ensures all photos, videos, MOV documents, audios, and text descriptions between
     * bounding stickers belong to the exact same Zone (message_group).
     */
    public async assignMessageToZone(
        message: {
            id?: number;
            message_id: string;
            jid: string;
            media_type: string | null;
            timestamp: number;
            metadata?: any;
        },
        groupingConfig: any,
        client: any
    ): Promise<ZoneAssignmentResult> {
        const isSticker = message.media_type === 'sticker' 
            || message.metadata?.stickerMessage !== undefined
            || (typeof message.metadata === 'string' && message.metadata.includes('stickerMessage'));

        // CASE 1: The message is a Sticker -> It is a Zone boundary delimiter
        if (isSticker) {
            // Check if there is an adjacent sticker within 5 seconds to avoid micro-splitting duplicate sticker bursts
            const adjRes = await client.query(
                `SELECT group_id FROM wa.messages 
                 WHERE jid = $1 
                   AND (media_type = 'sticker' OR (metadata->>'stickerMessage') IS NOT NULL)
                   AND group_id LIKE 'sticker_%'
                   AND ABS(timestamp - $2) <= 5
                 ORDER BY timestamp DESC LIMIT 1`,
                [message.jid, message.timestamp]
            );

            let groupId: string;
            let isNewGroup = false;
            if (adjRes.rows.length > 0 && adjRes.rows[0].group_id) {
                groupId = adjRes.rows[0].group_id;
            } else {
                groupId = `sticker_${randomUUID()}`;
                isNewGroup = true;
            }

            await client.query(
                `UPDATE wa.messages SET group_id = $1, media_type = 'sticker' WHERE message_id = $2`,
                [groupId, message.message_id]
            );

            return { groupId, isNewGroup, strategyUsed: 'sticker_first' };
        }

        // Check if chat is sticker-delimited
        const isStickerChat = await this.isStickerDelimitedChat(message.jid, groupingConfig, client);

        if (isStickerChat) {
            // STICKER-FIRST ZONING:
            // Find the bounding stickers (S_prev and S_next) in chronological order
            const prevStickerRes = await client.query(
                `SELECT timestamp, id FROM wa.messages 
                 WHERE jid = $1 
                   AND (media_type = 'sticker' OR (metadata->>'stickerMessage') IS NOT NULL)
                   AND (timestamp < $2 OR (timestamp = $2 AND id < COALESCE($3, 2147483647)))
                 ORDER BY timestamp DESC, id DESC LIMIT 1`,
                [message.jid, message.timestamp, message.id || null]
            );

            const nextStickerRes = await client.query(
                `SELECT timestamp, id FROM wa.messages 
                 WHERE jid = $1 
                   AND (media_type = 'sticker' OR (metadata->>'stickerMessage') IS NOT NULL)
                   AND (timestamp > $2 OR (timestamp = $2 AND id > COALESCE($3, 0)))
                 ORDER BY timestamp ASC, id ASC LIMIT 1`,
                [message.jid, message.timestamp, message.id || null]
            );

            const prevSticker = prevStickerRes.rows[0];
            const nextSticker = nextStickerRes.rows[0];

            // Search for an existing product group_id within this sticker-bounded zone
            const existingGroupRes = await client.query(
                `SELECT group_id FROM wa.messages 
                 WHERE jid = $1 
                   AND group_id IS NOT NULL 
                   AND group_id LIKE 'product_%'
                   AND (media_type != 'sticker' OR media_type IS NULL)
                   AND ($2::bigint IS NULL OR timestamp > $2 OR (timestamp = $2 AND id > $3))
                   AND ($4::bigint IS NULL OR timestamp < $4 OR (timestamp = $4 AND id < $5))
                 ORDER BY timestamp ASC, id ASC LIMIT 1`,
                [
                    message.jid,
                    prevSticker ? prevSticker.timestamp : null,
                    prevSticker ? prevSticker.id : null,
                    nextSticker ? nextSticker.timestamp : null,
                    nextSticker ? nextSticker.id : null,
                ]
            );

            let groupId: string;
            let isNewGroup = false;

            if (existingGroupRes.rows.length > 0 && existingGroupRes.rows[0].group_id) {
                groupId = existingGroupRes.rows[0].group_id;
            } else {
                groupId = `product_${randomUUID()}`;
                isNewGroup = true;
            }

            // Assign this message
            await client.query(
                `UPDATE wa.messages SET group_id = $1 WHERE message_id = $2`,
                [groupId, message.message_id]
            );

            // Auto-heal / unify ALL non-sticker messages in this sticker-bounded interval
            await client.query(
                `UPDATE wa.messages 
                 SET group_id = $1 
                 WHERE jid = $2 
                   AND (media_type != 'sticker' OR media_type IS NULL)
                   AND NOT (group_id LIKE 'sticker_%')
                   AND ($3::bigint IS NULL OR timestamp > $3 OR (timestamp = $3 AND id > $4))
                   AND ($5::bigint IS NULL OR timestamp < $5 OR (timestamp = $5 AND id < $6))
                   AND (group_id IS NULL OR group_id != $1)`,
                [
                    groupId,
                    message.jid,
                    prevSticker ? prevSticker.timestamp : null,
                    prevSticker ? prevSticker.id : null,
                    nextSticker ? nextSticker.timestamp : null,
                    nextSticker ? nextSticker.id : null,
                ]
            );

            return { groupId, isNewGroup, strategyUsed: 'sticker_first' };
        } else {
            // FALLBACK: TIME-BASED GROUPING (Only for chats with zero stickers)
            const timeGapThreshold = groupingConfig?.timeGapSeconds || 300; // Default 5 minutes

            const prevMsgRes = await client.query(
                `SELECT group_id, timestamp FROM wa.messages 
                 WHERE jid = $1 
                   AND group_id IS NOT NULL 
                   AND group_id LIKE 'product_%'
                   AND (timestamp < $2 OR (timestamp = $2 AND id < COALESCE($3, 2147483647)))
                 ORDER BY timestamp DESC, id DESC LIMIT 1`,
                [message.jid, message.timestamp, message.id || null]
            );

            const prevMsg = prevMsgRes.rows[0];
            let groupId: string;
            let isNewGroup = true;

            if (prevMsg && (message.timestamp - prevMsg.timestamp) <= timeGapThreshold) {
                groupId = prevMsg.group_id;
                isNewGroup = false;
            } else {
                groupId = `product_${randomUUID()}`;
                isNewGroup = true;
            }

            await client.query(
                `UPDATE wa.messages SET group_id = $1 WHERE message_id = $2`,
                [groupId, message.message_id]
            );

            return { groupId, isNewGroup, strategyUsed: 'time_fallback' };
        }
    }

    /**
     * Re-zones all messages in a chat from scratch or repairs fragmented groups.
     */
    public async rezoneChat(jid: string, client: any): Promise<{ totalMessages: number; zonesCreated: number; stickersFound: number }> {
        logger.info({ jid }, 'Starting chat re-zoning...');

        const chatRes = await client.query(
            `SELECT enable_message_grouping, grouping_config FROM wa.chats WHERE jid = $1`,
            [jid]
        );
        const { grouping_config } = chatRes.rows[0] || {};

        const messagesRes = await client.query(
            `SELECT id, message_id, jid, media_type, timestamp, metadata 
             FROM wa.messages 
             WHERE jid = $1 AND is_deleted = false 
             ORDER BY timestamp ASC, id ASC`,
            [jid]
        );

        const messages = messagesRes.rows;
        if (messages.length === 0) {
            return { totalMessages: 0, zonesCreated: 0, stickersFound: 0 };
        }

        const isStickerChat = await this.isStickerDelimitedChat(jid, grouping_config, client);
        let currentGroupId = `product_${randomUUID()}`;
        let zonesCreated = 0;
        let stickersFound = 0;
        const processedGroupIds = new Set<string>();

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            const isSticker = msg.media_type === 'sticker' 
                || msg.metadata?.stickerMessage !== undefined
                || (typeof msg.metadata === 'string' && msg.metadata.includes('stickerMessage'));

            if (isSticker) {
                stickersFound++;
                const stickerGroupId = `sticker_${randomUUID()}`;
                await client.query(
                    `UPDATE wa.messages SET group_id = $1, media_type = 'sticker' WHERE id = $2`,
                    [stickerGroupId, msg.id]
                );
                // Start a fresh product zone for subsequent messages
                currentGroupId = `product_${randomUUID()}`;
            } else {
                if (isStickerChat) {
                    await client.query(
                        `UPDATE wa.messages SET group_id = $1 WHERE id = $2`,
                        [currentGroupId, msg.id]
                    );
                    if (!processedGroupIds.has(currentGroupId)) {
                        processedGroupIds.add(currentGroupId);
                        zonesCreated++;
                    }
                } else {
                    const timeGapThreshold = grouping_config?.timeGapSeconds || 300;
                    if (i > 0) {
                        const prev = messages[i - 1];
                        if (msg.timestamp - prev.timestamp > timeGapThreshold) {
                            currentGroupId = `product_${randomUUID()}`;
                            zonesCreated++;
                        }
                    } else {
                        zonesCreated++;
                    }
                    await client.query(
                        `UPDATE wa.messages SET group_id = $1 WHERE id = $2`,
                        [currentGroupId, msg.id]
                    );
                    processedGroupIds.add(currentGroupId);
                }
            }
        }

        // Clean up empty / stale message groups
        await client.query(
            `DELETE FROM wa.message_groups 
             WHERE jid = $1 AND group_id NOT IN (SELECT DISTINCT group_id FROM wa.messages WHERE jid = $1 AND group_id IS NOT NULL)`,
            [jid]
        );

        logger.info({ jid, totalMessages: messages.length, zonesCreated, stickersFound }, 'Chat re-zoning completed.');
        return { totalMessages: messages.length, zonesCreated, stickersFound };
    }
}

export const zoningService = new ZoningService();
