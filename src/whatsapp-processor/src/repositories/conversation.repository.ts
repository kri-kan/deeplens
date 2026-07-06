import { getWhatsAppDbClient } from '../clients/db.client';
import { logger } from '../utils/logger';

export interface ChatRow {
    jid: string;
    name: string;
    isGroup: boolean;
    isAnnouncement: boolean;
    unreadCount: number;
    lastMessageText: string | null;
    lastMessageTimestamp: number | null;
    lastMessageFromMe: boolean;
    isPinned: boolean;
    isArchived: boolean;
    isMuted: boolean;
    canonicalJid: string;
    pinOrder: number;
    profilePicId: string | null;
    profilePicUrl: string | null;
    metadata?: any;
    communityName?: string;
    isExcluded?: boolean;
    deepSyncEnabled?: boolean;
    messageCount?: number;
}

/**
 * ConversationRepository
 * 
 * Data access layer for WhatsApp conversations (chats, groups, announcements).
 * 
 * @remarks
 * **Performance Critical**: The methods in this repository power the main 
 * WhatsApp list screens in the DeepLens utility app. 
 * 
 * We specifically DO NOT include an inline `COUNT(*)` subquery for messages 
 * in the main `findAll`, `findChats`, `findGroups`, and `findAnnouncements` 
 * methods. Executing a subquery count on `wa.messages` per row leads to 
 * catastrophic N+1 performance degradation as message volume scales.
 * 
 * For full message counts, use `countMessages(jid)` or `getStats(jid)` 
 * on an as-needed basis (e.g. within a specific conversation detail screen).
 */
export class ConversationRepository {
    private get client() {
        const client = getWhatsAppDbClient();
        if (!client) throw new Error('Database not available');
        return client;
    }

    async findAll(): Promise<ChatRow[]> {
        const result = await this.client.query(`
            SELECT 
                sub.jid,
                sub.name,
                sub.is_group as "isGroup",
                sub.is_announcement as "isAnnouncement",
                sub.unread_count as "unreadCount",
                sub.last_message_text as "lastMessageText",
                sub.last_message_timestamp as "lastMessageTimestamp",
                sub.last_message_from_me as "lastMessageFromMe",
                sub.is_pinned as "isPinned",
                sub.is_archived as "isArchived",
                sub.is_muted as "isMuted",
                sub.canonical_jid as "canonicalJid",
                sub.pin_order as "pinOrder",
                sub.metadata,
                sub.profile_pic_id as "profilePicId",
                sub.profile_pic_url as "profilePicUrl",
                sub.deep_sync_enabled as "deepSyncEnabled",
                COALESCE(sub.is_excluded, CASE WHEN sub.is_group = false AND sub.is_announcement = false THEN true ELSE false END) as "isExcluded",
                p.name as "communityName"
            FROM (
                SELECT DISTINCT ON (c.canonical_jid)
                    c.jid, 
                    COALESCE(c.metadata->>'subject', c.name) as name, 
                    c.is_group, 
                    c.is_announcement, 
                    c.unread_count,
                    c.last_message_text, 
                    c.last_message_timestamp, 
                    c.last_message_from_me,
                    c.is_pinned, 
                    c.is_archived, 
                    c.is_muted, 
                    c.canonical_jid, 
                    c.pin_order, 
                    c.metadata,
                    c.profile_pic_id, 
                    c.profile_pic_url,
                    c.deep_sync_enabled,
                    t.is_excluded
                FROM wa.chats c
                LEFT JOIN wa.chat_tracking_state t ON c.jid = t.jid
                WHERE NOT (c.metadata->>'isCommunity' = 'true' AND (c.metadata->>'isCommunityAnnounce' IS NULL OR c.metadata->>'isCommunityAnnounce' = 'false'))
                ORDER BY 
                    c.canonical_jid,
                    (c.name !~ '^[0-9]+$') DESC,
                    c.last_message_timestamp DESC NULLS LAST
            ) sub
            LEFT JOIN wa.chats p ON p.jid = (sub.metadata->>'linkedParent')
            ORDER BY 
                sub.is_archived ASC,
                sub.is_pinned DESC,
                sub.pin_order DESC,
                sub.last_message_timestamp DESC NULLS LAST
        `);
        return result.rows;
    }

    async findChats(filters: { excluded?: boolean; search?: string; limit?: number; offset?: number } = {}): Promise<ChatRow[]> {
        const { excluded, search, limit = 500, offset = 0 } = filters;
        const params: any[] = [];

        // Build exclusion clause
        let exclusionClause: string;
        if (excluded === true) {
            exclusionClause = '(t.is_excluded = true OR t.is_excluded IS NULL)';
        } else if (excluded === false) {
            exclusionClause = 't.is_excluded = false';
        } else {
            exclusionClause = 'TRUE'; // no filter — show all
        }

        // Build search clause
        let searchClause = '';
        if (search) {
            params.push(`%${search}%`);
            searchClause = `AND c.name ILIKE $${params.length}`;
        }

        params.push(limit, offset);
        const limitParam = `$${params.length - 1}`;
        const offsetParam = `$${params.length}`;

        const result = await this.client.query(`
            SELECT 
                sub.jid, sub.name,
                sub.is_group as "isGroup", sub.is_announcement as "isAnnouncement",
                sub.unread_count as "unreadCount", sub.last_message_text as "lastMessageText",
                sub.last_message_timestamp as "lastMessageTimestamp", sub.last_message_from_me as "lastMessageFromMe",
                sub.is_pinned as "isPinned", sub.is_archived as "isArchived", sub.is_muted as "isMuted",
                sub.canonical_jid as "canonicalJid", sub.pin_order as "pinOrder",
                sub.profile_pic_id as "profilePicId", sub.profile_pic_url as "profilePicUrl",
                sub.is_excluded as "isExcluded",
                sub.deep_sync_enabled as "deepSyncEnabled"
            FROM (
                SELECT DISTINCT ON (c.canonical_jid)
                    c.jid, c.name, c.is_group, c.is_announcement, c.unread_count,
                    c.last_message_text, c.last_message_timestamp, c.last_message_from_me,
                    c.is_pinned, c.is_archived, c.is_muted, c.canonical_jid, c.pin_order,
                    c.profile_pic_id, c.profile_pic_url,
                    COALESCE(t.is_excluded, true) as is_excluded,
                    c.deep_sync_enabled
                FROM wa.chats c
                LEFT JOIN wa.chat_tracking_state t ON c.jid = t.jid
                WHERE c.is_group = false AND c.is_announcement = false
                  AND ${exclusionClause}
                  ${searchClause}
                ORDER BY c.canonical_jid, (c.name !~ '^[0-9]+$') DESC, c.last_message_timestamp DESC NULLS LAST
            ) sub
            ORDER BY sub.is_archived ASC, sub.is_pinned DESC, sub.pin_order DESC, sub.last_message_timestamp DESC NULLS LAST
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `, params);
        return result.rows;
    }

    async findGroups(filters: { excluded?: boolean; search?: string; limit?: number; offset?: number } = {}): Promise<ChatRow[]> {
        const { excluded, search, limit = 500, offset = 0 } = filters;
        const params: any[] = [];

        let exclusionClause: string;
        if (excluded === true) {
            exclusionClause = 't.is_excluded = true';
        } else if (excluded === false) {
            exclusionClause = '(t.is_excluded = false OR t.is_excluded IS NULL)';
        } else {
            exclusionClause = 'TRUE';
        }

        let searchClause = '';
        if (search) {
            params.push(`%${search}%`);
            searchClause = `AND c.name ILIKE $${params.length}`;
        }

        params.push(limit, offset);
        const limitParam = `$${params.length - 1}`;
        const offsetParam = `$${params.length}`;

        const result = await this.client.query(`
            SELECT 
                c.jid, COALESCE(c.metadata->>'subject', c.name) as name,
                c.is_group as "isGroup", c.is_announcement as "isAnnouncement",
                c.unread_count as "unreadCount", c.last_message_text as "lastMessageText",
                c.last_message_timestamp as "lastMessageTimestamp", c.last_message_from_me as "lastMessageFromMe",
                c.is_pinned as "isPinned", c.is_archived as "isArchived", c.is_muted as "isMuted",
                COALESCE(t.is_excluded, false) as "isExcluded",
                c.deep_sync_enabled as "deepSyncEnabled"
            FROM wa.chats c
            LEFT JOIN wa.chat_tracking_state t ON c.jid = t.jid
            WHERE c.is_group = true AND c.is_announcement = false
              AND ${exclusionClause}
              AND NOT (c.metadata->>'isCommunity' = 'true' AND (c.metadata->>'isCommunityAnnounce' IS NULL OR c.metadata->>'isCommunityAnnounce' = 'false'))
              ${searchClause}
            ORDER BY c.is_pinned DESC, c.pin_order DESC, c.last_message_timestamp DESC NULLS LAST
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `, params);
        return result.rows;
    }

    async findAnnouncements(filters: { excluded?: boolean; search?: string; limit?: number; offset?: number } = {}): Promise<ChatRow[]> {
        const { excluded, search, limit = 500, offset = 0 } = filters;
        const params: any[] = [];

        let exclusionClause: string;
        if (excluded === true) {
            exclusionClause = 't.is_excluded = true';
        } else if (excluded === false) {
            exclusionClause = '(t.is_excluded = false OR t.is_excluded IS NULL)';
        } else {
            exclusionClause = 'TRUE';
        }

        let searchClause = '';
        if (search) {
            params.push(`%${search}%`);
            searchClause = `AND c.name ILIKE $${params.length}`;
        }

        params.push(limit, offset);
        const limitParam = `$${params.length - 1}`;
        const offsetParam = `$${params.length}`;

        const result = await this.client.query(`
            SELECT 
                c.jid, COALESCE(c.metadata->>'subject', c.name) as name,
                c.is_group as "isGroup", c.is_announcement as "isAnnouncement",
                c.unread_count as "unreadCount", c.last_message_text as "lastMessageText",
                c.last_message_timestamp as "lastMessageTimestamp", c.last_message_from_me as "lastMessageFromMe",
                c.is_pinned as "isPinned", c.is_archived as "isArchived", c.is_muted as "isMuted",
                COALESCE(t.is_excluded, false) as "isExcluded",
                c.deep_sync_enabled as "deepSyncEnabled"
            FROM wa.chats c
            LEFT JOIN wa.chat_tracking_state t ON c.jid = t.jid
            WHERE c.is_announcement = true
              AND ${exclusionClause}
              AND NOT (c.metadata->>'isCommunity' = 'true' AND (c.metadata->>'isCommunityAnnounce' IS NULL OR c.metadata->>'isCommunityAnnounce' = 'false'))
              ${searchClause}
            ORDER BY c.is_pinned DESC, c.pin_order DESC, c.last_message_timestamp DESC NULLS LAST
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `, params);
        return result.rows;
    }

    async countChats(filters: { excluded?: boolean; search?: string } = {}): Promise<number> {
        const { excluded, search } = filters;
        const params: any[] = [];
        const exclusionClause = excluded === true ? '(t.is_excluded = true OR t.is_excluded IS NULL)' : excluded === false ? 't.is_excluded = false' : 'TRUE';
        let searchClause = '';
        if (search) { params.push(`%${search}%`); searchClause = `AND c.name ILIKE $${params.length}`; }
        const result = await this.client.query(
            `SELECT COUNT(DISTINCT c.canonical_jid) FROM wa.chats c LEFT JOIN wa.chat_tracking_state t ON c.jid = t.jid WHERE c.is_group = false AND c.is_announcement = false AND ${exclusionClause} ${searchClause}`,
            params
        );
        return parseInt(result.rows[0].count);
    }

    async countGroups(filters: { excluded?: boolean; search?: string } = {}): Promise<number> {
        const { excluded, search } = filters;
        const params: any[] = [];
        const exclusionClause = excluded === true ? 't.is_excluded = true' : excluded === false ? '(t.is_excluded = false OR t.is_excluded IS NULL)' : 'TRUE';
        let searchClause = '';
        if (search) { params.push(`%${search}%`); searchClause = `AND c.name ILIKE $${params.length}`; }
        const result = await this.client.query(
            `SELECT COUNT(*) FROM wa.chats c LEFT JOIN wa.chat_tracking_state t ON c.jid = t.jid WHERE c.is_group = true AND c.is_announcement = false AND ${exclusionClause} AND NOT (c.metadata->>'isCommunity' = 'true' AND (c.metadata->>'isCommunityAnnounce' IS NULL OR c.metadata->>'isCommunityAnnounce' = 'false')) ${searchClause}`,
            params
        );
        return parseInt(result.rows[0].count);
    }

    async countAnnouncements(filters: { excluded?: boolean; search?: string } = {}): Promise<number> {
        const { excluded, search } = filters;
        const params: any[] = [];
        const exclusionClause = excluded === true ? 't.is_excluded = true' : excluded === false ? '(t.is_excluded = false OR t.is_excluded IS NULL)' : 'TRUE';
        let searchClause = '';
        if (search) { params.push(`%${search}%`); searchClause = `AND c.name ILIKE $${params.length}`; }
        const result = await this.client.query(
            `SELECT COUNT(*) FROM wa.chats c LEFT JOIN wa.chat_tracking_state t ON c.jid = t.jid WHERE c.is_announcement = true AND ${exclusionClause} AND NOT (c.metadata->>'isCommunity' = 'true' AND (c.metadata->>'isCommunityAnnounce' IS NULL OR c.metadata->>'isCommunityAnnounce' = 'false')) ${searchClause}`,
            params
        );
        return parseInt(result.rows[0].count);
    }

    async findByJid(jid: string): Promise<ChatRow | null> {
        const result = await this.client.query('SELECT * FROM wa.chats WHERE jid = $1', [jid]);
        return result.rows[0] || null;
    }

    async findMessages(jid: string, limit: number, offset: number, aroundGroupId?: string, searchQuery?: string): Promise<any[]> {
        let searchCondition = "";
        if (searchQuery) {
            searchCondition = `AND content ILIKE '%${searchQuery.replace(/'/g, "''")}%'`;
        }
        const params: any[] = [jid, limit, offset];
        let query: string;

        if (aroundGroupId) {
            params.push(aroundGroupId);
            query = `
                WITH chat_info AS (
                    SELECT COALESCE(canonical_jid, jid) as base_jid 
                    FROM wa.chats 
                    WHERE jid = $1 
                    LIMIT 1
                ),
                chat_jids AS (
                    SELECT jid FROM wa.chats WHERE canonical_jid = (SELECT base_jid FROM chat_info)
                    UNION
                    SELECT (SELECT base_jid FROM chat_info)
                    UNION
                    SELECT $1
                ),
                target_msg AS (
                    SELECT MIN(timestamp) as min_ts
                    FROM wa.messages
                    WHERE jid IN (SELECT jid FROM chat_jids)
                      AND group_id = $4
                ),
                count_newer AS (
                    SELECT COUNT(*) as cnt
                    FROM wa.messages
                    WHERE jid IN (SELECT jid FROM chat_jids)
                      AND timestamp >= (SELECT min_ts FROM target_msg)
                )
                SELECT 
                    message_id as "messageId",
                    jid as "chatJid",
                    sender as "senderJid",
                    content as "messageText",
                    message_type as "messageType",
                    media_type as "mediaType",
                    media_url as "mediaUrl",
                    timestamp,
                    is_from_me as "isFromMe",
                    metadata,
                    group_id as "groupId"
                FROM wa.messages
                WHERE jid IN (SELECT jid FROM chat_jids) ${searchCondition}
                ORDER BY timestamp DESC
                LIMIT CASE 
                    WHEN (SELECT min_ts FROM target_msg) IS NOT NULL THEN GREATEST($2, (SELECT cnt FROM count_newer) + 20)
                    ELSE $2
                END
                OFFSET $3
            `;
        } else {
            query = `
                WITH chat_info AS (
                    SELECT COALESCE(canonical_jid, jid) as base_jid 
                    FROM wa.chats 
                    WHERE jid = $1 
                    LIMIT 1
                )
                SELECT 
                    message_id as "messageId",
                    jid as "chatJid",
                    sender as "senderJid",
                    content as "messageText",
                    message_type as "messageType",
                    media_type as "mediaType",
                    media_url as "mediaUrl",
                    timestamp,
                    is_from_me as "isFromMe",
                    metadata,
                    group_id as "groupId"
                FROM wa.messages
                WHERE (jid = $1 OR jid = (SELECT base_jid FROM chat_info) OR jid IN (SELECT jid FROM wa.chats WHERE canonical_jid = (SELECT base_jid FROM chat_info))) ${searchCondition}
                ORDER BY timestamp DESC
                LIMIT $2 OFFSET $3
            `;
        }

        const result = await this.client.query(query, params);
        return result.rows;
    }

    async countMessages(jid: string): Promise<number> {
        const result = await this.client.query(`
            WITH chat_info AS (
                SELECT COALESCE(canonical_jid, jid) as base_jid 
                FROM wa.chats 
                WHERE jid = $1 
                LIMIT 1
            )
            SELECT COUNT(*) FROM wa.messages 
            WHERE jid = $1 
               OR jid = (SELECT base_jid FROM chat_info)
               OR jid IN (SELECT jid FROM wa.chats WHERE canonical_jid = (SELECT base_jid FROM chat_info))
        `, [jid]);
        return parseInt(result.rows[0].count);
    }

    async updateDeepSync(jid: string, enabled: boolean): Promise<void> {
        await this.client.query('UPDATE wa.chats SET deep_sync_enabled = $2 WHERE jid = $1', [jid, enabled]);
        if (enabled) {
            await this.client.query(`
                INSERT INTO wa.chat_tracking_state (jid, is_excluded, updated_at)
                VALUES ($1, FALSE, NOW())
                ON CONFLICT (jid) DO UPDATE SET is_excluded = FALSE, updated_at = NOW()
            `, [jid]);
        }
    }

    async updateMessageGrouping(jid: string, enabled: boolean, config?: any): Promise<void> {
        let query = 'UPDATE wa.chats SET enable_message_grouping = $2';
        const params: any[] = [jid, enabled];
        if (config && enabled) {
            query += ', grouping_config = $3';
            params.push(config);
        }
        query += ' WHERE jid = $1';
        await this.client.query(query, params);
    }

    async purgeMessages(jid: string): Promise<{ messagesDeleted: number; mediaUrls: string[] }> {
        await this.client.query('BEGIN');
        try {
            const countRes = await this.client.query('SELECT COUNT(*) FROM wa.messages WHERE jid = $1', [jid]);
            const mediaRes = await this.client.query('SELECT media_url FROM wa.messages WHERE jid = $1 AND media_url IS NOT NULL', [jid]);
            
            await this.client.query('DELETE FROM wa.messages WHERE jid = $1', [jid]);
            await this.client.query(`
                UPDATE wa.chats 
                SET last_message_text = NULL, last_message_timestamp = NULL, last_message_from_me = NULL, unread_count = 0, updated_at = NOW()
                WHERE jid = $1
            `, [jid]);
            
            await this.client.query('COMMIT');
            return {
                messagesDeleted: parseInt(countRes.rows[0].count),
                mediaUrls: mediaRes.rows.map(r => r.media_url)
            };
        } catch (err) {
            await this.client.query('ROLLBACK');
            throw err;
        }
    }

    async getStats(jid: string): Promise<any> {
        // 1. Get Chat Info
        const chatRes = await this.client.query(`
            SELECT 
                jid, COALESCE(metadata->>'subject', name) as name, is_group as "isGroup", is_announcement as "isAnnouncement", 
                is_pinned as "isPinned", is_archived as "isArchived", is_muted as "isMuted",
                unread_count as "unreadCount", last_message_text as "lastMessageText",
                last_message_timestamp as "lastMessageTimestamp",
                profile_pic_id as "profilePicId", profile_pic_url as "profilePicUrl",
                deep_sync_enabled as "deepSyncEnabled", enable_message_grouping as "enableMessageGrouping",
                vendor_id as "vendorId", auto_process_products as "autoProcessProducts",
                created_at as "createdAt", updated_at as "updatedAt"
            FROM wa.chats 
            WHERE jid = $1
        `, [jid]);

        if (chatRes.rows.length === 0) return null;
        const chat = chatRes.rows[0];

        // 2. Get Message Stats
        const msgStats = await this.client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_from_me = true) as sent,
                COUNT(*) FILTER (WHERE is_from_me = false) as received,
                MIN(timestamp) as "oldestTimestamp",
                MAX(timestamp) as "newestTimestamp"
            FROM wa.messages
            WHERE jid = $1
        `, [jid]);

        // 3. Get Media Stats
        const mediaStats = await this.client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE media_type = 'image') as photos,
                COUNT(*) FILTER (WHERE media_type = 'video') as videos,
                COUNT(*) FILTER (WHERE media_type = 'audio' OR media_type = 'ptt') as audio,
                COUNT(*) FILTER (WHERE media_type = 'document') as documents,
                COUNT(*) FILTER (WHERE media_type = 'sticker') as stickers
            FROM wa.messages
            WHERE jid = $1 AND media_url IS NOT NULL
        `, [jid]);

        return {
            ...chat,
            messages: {
                total: parseInt(msgStats.rows[0].total),
                sent: parseInt(msgStats.rows[0].sent),
                received: parseInt(msgStats.rows[0].received),
                oldestTimestamp: msgStats.rows[0].oldestTimestamp,
                newestTimestamp: msgStats.rows[0].newestTimestamp,
            },
            media: {
                total: parseInt(mediaStats.rows[0].total),
                photos: parseInt(mediaStats.rows[0].photos),
                videos: parseInt(mediaStats.rows[0].videos),
                audio: parseInt(mediaStats.rows[0].audio),
                documents: parseInt(mediaStats.rows[0].documents),
                stickers: parseInt(mediaStats.rows[0].stickers),
            }
        };
    }

    async getChatVendor(jid: string): Promise<any> {
        const result = await this.client.query('SELECT vendor_id, vendor_name, vendor_assigned_at, vendor_assigned_by FROM wa.chats WHERE jid = $1', [jid]);
        return result.rows[0] || null;
    }

    async assignChatVendor(jid: string, vendorId: string, vendorName: string, assignedBy: string): Promise<void> {
        await this.client.query(`
            UPDATE wa.chats 
            SET vendor_id = $1, vendor_name = $2, vendor_assigned_at = NOW(), vendor_assigned_by = $3 
            WHERE jid = $4
        `, [vendorId, vendorName, assignedBy, jid]);
    }

    async removeChatVendor(jid: string): Promise<void> {
        await this.client.query(`
            UPDATE wa.chats 
            SET vendor_id = NULL, vendor_name = NULL, vendor_assigned_at = NULL, vendor_assigned_by = NULL 
            WHERE jid = $1
        `, [jid]);
    }

    async getChatsByVendor(vendorId: string): Promise<any[]> {
        const result = await this.client.query(`
            SELECT 
                jid, 
                COALESCE(metadata->>'subject', name) as name, 
                is_group as "isGroup", 
                profile_pic_url as "profilePicUrl",
                vendor_name as "vendorName", 
                vendor_assigned_at as "assignedAt", 
                vendor_assigned_by as "assignedBy"
            FROM wa.chats 
            WHERE vendor_id = $1
            ORDER BY vendor_assigned_at DESC NULLS LAST
        `, [vendorId]);
        
        return result.rows;
    }
}
