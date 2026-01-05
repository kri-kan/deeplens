import { WASocket, WAMessage, Chat as BChat, proto } from '@whiskeysockets/baileys';
import { getWhatsAppDbClient } from '../clients/db.client';
import { saveMessage, MessageRecord } from './messages';
import { upsertChat } from './whitelist';
import { logger } from './logger';

/**
 * Get the timestamp of the last message we have for a conversation
 */
export async function getLastMessageTimestamp(jid: string): Promise<number | null> {
    const client = getWhatsAppDbClient();
    if (!client) return null;

    try {
        const result = await client.query(
            'SELECT MAX(timestamp) as last_timestamp FROM messages WHERE jid = $1',
            [jid]
        );

        return result.rows[0]?.last_timestamp || null;
    } catch (err) {
        logger.error({ err, jid }, 'Failed to get last message timestamp');
        return null;
    }
}

/**
 * Sync individual chats from database (they're populated via incoming messages)
 * Note: Baileys doesn't provide a direct API to list all chats
 * Chats are discovered through incoming messages and stored in DB
 */
export async function syncIndividualChats(sock: WASocket): Promise<BChat[]> {
    try {
        const client = getWhatsAppDbClient();
        if (!client) {
            logger.warn('Database not available');
            return [];
        }

        // Get individual chats from database
        const result = await client.query(
            `SELECT jid, name, metadata, last_message_at 
             FROM chats 
             WHERE is_group = false 
             ORDER BY last_message_at DESC NULLS LAST`
        );

        const chats: BChat[] = result.rows.map((row: any) => ({
            id: row.jid,
            name: row.name,
            conversationTimestamp: row.last_message_at ? new Date(row.last_message_at).getTime() / 1000 : 0,
            ...row.metadata
        }));

        logger.info(`Loaded ${chats.length} individual chats from database`);
        return chats;
    } catch (err) {
        logger.error({ err }, 'Failed to sync individual chats');
        return [];
    }
}

/**
 * Fetch message history using Baileys' fetchMessageHistory
 * Note: This requires the message store to be enabled
 */
export async function fetchConversationHistory(
    sock: WASocket,
    jid: string,
    limit: number = 50
): Promise<WAMessage[]> {
    try {
        // Baileys stores messages in memory, we can try to fetch from history
        // This is a placeholder - actual implementation depends on message store configuration
        logger.warn({ jid }, 'Message history fetching requires message store - using sparse mode');
        return [];
    } catch (err) {
        logger.error({ err, jid }, 'Failed to fetch conversation history');
        return [];
    }
}

/**
 * Sync missed messages for a conversation (delta sync)
 * Since Baileys doesn't provide direct history API, we rely on real-time messages
 * This function marks conversations as needing attention
 */
export async function syncMissedMessages(
    sock: WASocket,
    jid: string
): Promise<number> {
    try {
        const lastTimestamp = await getLastMessageTimestamp(jid);

        if (!lastTimestamp) {
            logger.debug({ jid }, 'No previous messages for this conversation');
            return 0;
        }

        // Note: Baileys doesn't provide a direct API to fetch missed messages
        // Messages are received via the messages.upsert event in real-time
        // For offline recovery, we would need to implement message store persistence

        logger.debug({ jid, lastTimestamp }, 'Conversation tracked, will receive new messages via events');
        return 0;
    } catch (err) {
        logger.error({ err, jid }, 'Failed to check missed messages');
        return 0;
    }
}

/**
 * Convert WAMessage to MessageRecord and save
 */
export async function saveMessageFromWA(msg: WAMessage, jid: string): Promise<void> {
    if (!msg.message || !msg.key.id) return;

    const messageContent = extractMessageContent(msg);
    const messageType = Object.keys(msg.message)[0] || 'text';
    const timestamp = msg.messageTimestamp
        ? (typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp : parseInt(msg.messageTimestamp.toString()))
        : Math.floor(Date.now() / 1000);

    const messageRecord: MessageRecord = {
        messageId: msg.key.id,
        jid: jid,
        content: messageContent,
        messageType: messageType,
        mediaType: getMediaType(msg),
        mediaUrl: null, // Media download handled separately
        sender: msg.key.participant || (msg.key.fromMe ? 'me' : jid),
        senderName: msg.pushName || null,
        timestamp: timestamp,
        isFromMe: msg.key.fromMe || false,
        isForwarded: !!(msg.message?.extendedTextMessage?.contextInfo?.isForwarded),
        metadata: msg
    };

    await saveMessage(messageRecord);
}

/**
 * Extract text content from WAMessage
 */
function extractMessageContent(msg: WAMessage): string {
    const message = msg.message;
    if (!message) return '';

    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    if (message.documentMessage?.caption) return message.documentMessage.caption;

    return '';
}

/**
 * Get media type from WAMessage
 */
function getMediaType(msg: WAMessage): string | null {
    const message = msg.message;
    if (!message) return null;

    if (message.imageMessage) return 'image';
    if (message.videoMessage) return 'video';
    if (message.audioMessage) return 'audio';
    if (message.documentMessage) return 'document';
    if (message.stickerMessage) return 'sticker';

    return null;
}

/**
 * Sync all conversations on reconnection (delta sync)
 * Note: Since Baileys doesn't provide history API, this mainly ensures
 * we're ready to receive new messages for all tracked conversations
 */
export async function syncAllConversationsOnReconnect(sock: WASocket): Promise<void> {
    try {
        logger.info('Preparing to receive messages for all conversations...');

        const client = getWhatsAppDbClient();
        if (!client) {
            logger.warn('Database not available');
            return;
        }

        // Get count of tracked conversations
        const result = await client.query('SELECT COUNT(*) as count FROM chats');
        const count = parseInt(result.rows[0]?.count || '0');

        logger.info({ count }, 'Ready to receive messages for tracked conversations');

        // Note: Actual message syncing happens via the messages.upsert event
        // This is just logging that we're ready
    } catch (err) {
        logger.error({ err }, 'Failed to prepare conversation sync');
    }
}

/**
 * Initialize sparse history for a new conversation
 * Since Baileys doesn't provide history API, we mark the conversation as tracked
 * and will receive future messages via events
 */
export async function initializeSparseHistory(
    sock: WASocket,
    jid: string,
    limit: number = 20
): Promise<number> {
    try {
        // Check if we already have messages
        const lastTimestamp = await getLastMessageTimestamp(jid);
        if (lastTimestamp) {
            logger.debug({ jid }, 'Conversation already has history');
            return 0;
        }

        // Ensure conversation is tracked in database
        await upsertChat(jid, jid.split('@')[0], false, {});

        logger.info({ jid }, 'Conversation initialized, will receive new messages');
        return 0;
    } catch (err) {
        logger.error({ err, jid }, 'Failed to initialize conversation');
        return 0;
    }
}
