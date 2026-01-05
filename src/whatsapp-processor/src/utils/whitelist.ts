import { getWhatsAppDbClient } from '../clients/db.client';
import { logger } from './logger';
import { DEFAULT_TRACK_GROUPS, DEFAULT_TRACK_PRIVATE } from '../config';

export interface ChatTrackingState {
    jid: string;
    isExcluded: boolean;
    lastProcessedMessageId: string | null;
    lastProcessedTimestamp: number | null;
    excludedAt: Date | null;
    resumeMode: 'from_last' | 'from_now' | null;
}

/**
 * Upserts a chat into the chats table
 * Optimizes performance by handling identity and last message state in one hit
 */
export async function upsertChat(
    jid: string,
    name: string,
    isGroup: boolean,
    metadata: any = {},
    isContact: boolean = false,
    lastMessageText: string | null = null,
    lastMessageTimestamp: number | null = null,
    lastMessageFromMe: boolean | null = null
): Promise<void> {
    const client = getWhatsAppDbClient();
    if (!client) return;

    try {
        // Determine flags from metadata
        const isNewsletter = jid.endsWith('@newsletter');
        // Merge communities into announcements
        const isAnnouncement = isNewsletter || !!metadata.readOnly || !!metadata.announce || !!metadata.isCommunityAnnounce || !!metadata.isCommunity;

        // Determine canonical JID (prefer PN for display/grouping)
        const altJid = metadata.alt_jid || metadata.display_jid;
        const canonicalJid = (jid.endsWith('@s.whatsapp.net')) ? jid : (altJid || jid);

        await client.query(
            `INSERT INTO chats (
                jid, name, is_group, is_announcement, is_contact, 
                canonical_jid, metadata, 
                last_message_text, last_message_timestamp, last_message_from_me,
                updated_at
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
             ON CONFLICT (jid) DO UPDATE 
             SET name = CASE 
                    -- 1. Priority: New name is from address book sync
                    WHEN EXCLUDED.is_contact = TRUE THEN EXCLUDED.name
                    
                    -- 2. If we already have an address book name, keep it
                    WHEN chats.is_contact = TRUE AND chats.name NOT LIKE '%@%' AND chats.name !~ '^[0-9]+$' THEN chats.name
                    
                    -- 3. If current name is just a JID or number, and new name is descriptive
                    WHEN (chats.name LIKE '%@%' OR chats.name ~ '^[0-9]+$' OR chats.name = '' OR chats.name IS NULL)
                         AND EXCLUDED.name IS NOT NULL AND EXCLUDED.name != '' 
                         AND EXCLUDED.name NOT LIKE '%@%' AND EXCLUDED.name !~ '^[0-9]+$'
                    THEN EXCLUDED.name
                    
                    -- 4. Keep existing descriptive name
                    WHEN chats.name IS NOT NULL AND chats.name != '' AND chats.name NOT LIKE '%@%' AND chats.name !~ '^[0-9]+$'
                    THEN chats.name
                    
                    -- 5. Final fallback to whatever is newest
                    ELSE EXCLUDED.name 
                 END,
                 is_group = EXCLUDED.is_group,
                 is_announcement = COALESCE(NULLIF(EXCLUDED.is_announcement, false), chats.is_announcement),
                 is_contact = chats.is_contact OR EXCLUDED.is_contact,
                 canonical_jid = EXCLUDED.canonical_jid,
                 metadata = chats.metadata || EXCLUDED.metadata,
                 
                 -- Only update last message info if the NEW timestamp is >= existing
                 last_message_text = CASE 
                    WHEN EXCLUDED.last_message_timestamp IS NOT NULL 
                         AND EXCLUDED.last_message_timestamp >= COALESCE(chats.last_message_timestamp, 0) 
                    THEN EXCLUDED.last_message_text
                    ELSE chats.last_message_text
                 END,
                 last_message_timestamp = CASE 
                    WHEN EXCLUDED.last_message_timestamp IS NULL THEN chats.last_message_timestamp
                    ELSE GREATEST(COALESCE(chats.last_message_timestamp, 0), EXCLUDED.last_message_timestamp)
                 END,
                 last_message_from_me = CASE 
                    WHEN EXCLUDED.last_message_timestamp IS NOT NULL 
                         AND EXCLUDED.last_message_timestamp >= COALESCE(chats.last_message_timestamp, 0) 
                    THEN EXCLUDED.last_message_from_me
                    ELSE chats.last_message_from_me
                 END,
                 
                 updated_at = NOW()`,
            [
                jid, name, isGroup, isAnnouncement, isContact,
                canonicalJid, JSON.stringify(metadata),
                lastMessageText, lastMessageTimestamp, lastMessageFromMe
            ]
        );
    } catch (err: any) {
        logger.error({ err: err.message, jid }, 'Failed to upsert chat');
    }
}

/**
 * Gets the exclusion list (chats that should NOT be tracked)
 */
export async function getExclusionList(): Promise<string[]> {
    const client = getWhatsAppDbClient();
    if (!client) return [];

    try {
        const res = await client.query(
            'SELECT jid FROM chat_tracking_state WHERE is_excluded = TRUE'
        );
        return res.rows.map(row => row.jid);
    } catch (err) {
        logger.error({ err }, 'Failed to get exclusion list');
        return [];
    }
}

/**
 * Checks if a JID is excluded (should NOT be tracked)
 * Follows the blueprint: 
 * 1. If explicit state exists in DB, use it.
 * 2. Otherwise use defaults: 
 *    - Groups: Excluded by default (trackGroups=false)
 *    - Private: Included by default (trackPrivate=true)
 */
export async function isExcluded(jid: string): Promise<boolean> {
    const client = getWhatsAppDbClient();
    if (!client) return false;

    try {
        const res = await client.query(
            'SELECT is_excluded FROM chat_tracking_state WHERE jid = $1',
            [jid]
        );

        if (res.rows.length > 0) {
            return res.rows[0].is_excluded;
        }

        // Apply Defaults
        const isGroup = jid.endsWith('@g.us');
        if (isGroup) {
            return !DEFAULT_TRACK_GROUPS; // If trackGroups is false, return isExcluded=true
        } else {
            return !DEFAULT_TRACK_PRIVATE; // If trackPrivate is true, return isExcluded=false
        }
    } catch (err) {
        logger.error({ err, jid }, 'Failed to check if chat is excluded');
        return false;
    }
}


/**
 * Adds a JID to the exclusion list
 */
export async function excludeChat(jid: string): Promise<void> {
    const client = getWhatsAppDbClient();
    if (!client) {
        logger.warn({ jid }, 'No DB client available for excludeChat');
        return;
    }

    try {
        logger.info({ jid }, 'Excluding chat in database');
        await client.query(
            `INSERT INTO chat_tracking_state (jid, is_excluded, excluded_at, updated_at)
             VALUES ($1, TRUE, NOW(), NOW())
             ON CONFLICT (jid) DO UPDATE 
             SET is_excluded = TRUE, 
                 excluded_at = NOW(),
                 updated_at = NOW()`,
            [jid]
        );
        logger.info({ jid }, 'Successfully excluded chat in database');
    } catch (err: any) {
        logger.error({ err: err.message, stack: err.stack, jid }, 'Failed to exclude chat in database');
    }
}

/**
 * Removes a JID from the exclusion list
 */
export async function includeChat(jid: string, resumeMode: 'from_last' | 'from_now'): Promise<void> {
    const client = getWhatsAppDbClient();
    if (!client) return;

    try {
        await client.query(
            `INSERT INTO chat_tracking_state (jid, is_excluded, resume_mode, excluded_at, updated_at)
             VALUES ($1, FALSE, $2, NULL, NOW())
             ON CONFLICT (jid) DO UPDATE 
             SET is_excluded = FALSE, 
                 resume_mode = EXCLUDED.resume_mode,
                 excluded_at = NULL,
                 updated_at = NOW()`,
            [jid, resumeMode]
        );
    } catch (err) {
        logger.error({ err, jid }, 'Failed to include chat');
    }
}

/**
 * Gets the tracking state for a specific chat
 */
export async function getChatTrackingState(jid: string): Promise<ChatTrackingState> {
    const client = getWhatsAppDbClient();
    if (!client) {
        return {
            jid,
            isExcluded: false,
            lastProcessedMessageId: null,
            lastProcessedTimestamp: null,
            excludedAt: null,
            resumeMode: null
        };
    }

    try {
        const res = await client.query(
            'SELECT * FROM chat_tracking_state WHERE jid = $1',
            [jid]
        );

        if (res.rows.length === 0) {
            return {
                jid,
                isExcluded: false,
                lastProcessedMessageId: null,
                lastProcessedTimestamp: null,
                excludedAt: null,
                resumeMode: null
            };
        }

        const row = res.rows[0];
        return {
            jid: row.jid,
            isExcluded: row.is_excluded,
            lastProcessedMessageId: row.last_processed_message_id,
            lastProcessedTimestamp: row.last_processed_timestamp ? parseInt(row.last_processed_timestamp) : null,
            excludedAt: row.excluded_at,
            resumeMode: row.resume_mode
        };
    } catch (err) {
        logger.error({ err, jid }, 'Failed to get chat tracking state');
        return {
            jid,
            isExcluded: false,
            lastProcessedMessageId: null,
            lastProcessedTimestamp: null,
            excludedAt: null,
            resumeMode: null
        };
    }
}

/**
 * Gets all tracking states
 */
export async function getAllTrackingStates(): Promise<Record<string, ChatTrackingState>> {
    const client = getWhatsAppDbClient();
    if (!client) return {};

    try {
        const res = await client.query('SELECT * FROM chat_tracking_state');
        const states: Record<string, ChatTrackingState> = {};

        for (const row of res.rows) {
            states[row.jid] = {
                jid: row.jid,
                isExcluded: row.is_excluded,
                lastProcessedMessageId: row.last_processed_message_id,
                lastProcessedTimestamp: row.last_processed_timestamp ? parseInt(row.last_processed_timestamp) : null,
                excludedAt: row.excluded_at,
                resumeMode: row.resume_mode
            };
        }

        return states;
    } catch (err) {
        logger.error({ err }, 'Failed to get all tracking states');
        return {};
    }
}

/**
 * Updates the last processed message for a chat
 */
export async function updateLastProcessedMessage(jid: string, messageId: string, timestamp: number): Promise<void> {
    const client = getWhatsAppDbClient();
    if (!client) return;

    try {
        await client.query(
            `INSERT INTO chat_tracking_state (jid, last_processed_message_id, last_processed_timestamp, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (jid) DO UPDATE 
             SET last_processed_message_id = EXCLUDED.last_processed_message_id,
                 last_processed_timestamp = EXCLUDED.last_processed_timestamp,
                 updated_at = NOW()`,
            [jid, messageId, timestamp]
        );
    } catch (err) {
        logger.error({ err, jid }, 'Failed to update last processed message');
    }
}
