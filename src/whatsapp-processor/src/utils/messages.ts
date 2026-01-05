import { getWhatsAppDbClient } from '../clients/db.client';
import { logger } from './logger';
import { LOG_LEVEL } from '../config';

export interface MessageRecord {
    messageId: string;
    jid: string;
    content: string;
    messageType: string;
    mediaType: string | null;
    mediaUrl: string | null;
    sender: string | null;
    senderName: string | null;
    timestamp: number;
    isFromMe: boolean;
    isForwarded: boolean;
    metadata: any;
}

/**
 * Saves a message to the database
 */
export async function saveMessage(msg: MessageRecord): Promise<void> {
    const client = getWhatsAppDbClient();
    if (!client) {
        logger.warn('WhatsApp DB client not available, skipping message save');
        return;
    }

    try {
        const result = await client.query(
            `INSERT INTO messages (
                message_id, 
                jid, 
                content, 
                message_type, 
                media_type, 
                media_url, 
                sender, 
                sender_name, 
                timestamp, 
                is_from_me, 
                is_forwarded, 
                metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (message_id) 
            DO UPDATE SET 
                content = EXCLUDED.content,
                metadata = EXCLUDED.metadata,
                media_url = COALESCE(EXCLUDED.media_url, messages.media_url),
                media_type = COALESCE(EXCLUDED.media_type, messages.media_type)
            WHERE messages.content = '' OR messages.content IS NULL OR messages.content = EXCLUDED.content`,
            [
                msg.messageId,
                msg.jid,
                msg.content,
                msg.messageType,
                msg.mediaType,
                msg.mediaUrl,
                msg.sender,
                msg.senderName,
                msg.timestamp,
                msg.isFromMe,
                msg.isForwarded,
                JSON.stringify(msg.metadata)
            ]
        );
        if (result.rowCount && result.rowCount > 0) {
            logger.info({ messageId: msg.messageId, jid: msg.jid }, 'Message saved to database');
        } else {
            logger.debug({ messageId: msg.messageId }, 'Message already exists in database');
        }
    } catch (err: any) {
        logger.error({ err: err.message, messageId: msg.messageId, jid: msg.jid }, 'Failed to save message to database');
    }
}
