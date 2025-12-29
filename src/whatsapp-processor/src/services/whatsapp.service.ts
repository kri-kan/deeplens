import {
    makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    WAMessage,
    downloadMediaMessage,
    WASocket,
    ConnectionState,
    GroupMetadata,
    Chat as BChat
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { Server as SocketServer } from 'socket.io';
import { SESSION_PATH, LOG_LEVEL } from '../config';
import { isExcluded, updateLastProcessedMessage, upsertChat } from '../utils/whitelist';
import { isProcessingPaused, getProcessingState } from '../utils/processing-state';
import { ensureBucketExists } from '../clients/minio.client';
import { uploadMedia, MediaType } from '../clients/media.client';
import { getWhatsAppDbClient } from '../clients/db.client';
import { saveMessage } from '../utils/messages';
import { syncIndividualChats, syncAllConversationsOnReconnect } from '../utils/sync';
import { getRateLimiter } from '../utils/rate-limiter';
import { RATE_LIMIT_CONFIG } from '../config';

const logger = pino({ level: LOG_LEVEL });

export type ConnectionStatus = 'disconnected' | 'scanning' | 'connected';

export interface Group {
    id: string;
    subject: string;
    creation?: number;
}

export interface Chat {
    id: string;
    name: string;
    lastMessageTime?: number;
}

export class WhatsAppService {
    private sock: WASocket | null = null;
    private qrCode: string | null = null;
    private connectionStatus: ConnectionStatus = 'disconnected';
    private groupsCache: GroupMetadata[] = [];
    private individualChatsCache: BChat[] = [];
    private announcementsCache: BChat[] = [];
    private io: SocketServer;

    constructor(io: SocketServer) {
        this.io = io;
    }

    async start(): Promise<void> {
        // Ensure MinIO bucket exists
        await ensureBucketExists();

        // Initialize rate limiter
        getRateLimiter(RATE_LIMIT_CONFIG);
        logger.info({ config: RATE_LIMIT_CONFIG }, 'Rate limiter initialized');

        const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: logger as any,
            printQRInTerminal: true,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger as any),
            },
            generateHighQualityLinkPreview: true,
            browser: ['DeepLens', 'Chrome', '1.0.0'],
        });

        this.sock = sock;

        sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
            this.handleConnectionUpdate(update);
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async ({ messages, type }: { messages: WAMessage[], type: string }) => {
            await this.handleMessages(messages, type);
        });

        // Handle message updates (edits, deletes)
        sock.ev.on('messages.update', async (updates: any[]) => {
            await this.handleMessageUpdates(updates);
        });

        // Handle chat list on connection (initial bulk load)
        sock.ev.on('chats.set', async (data: any) => {
            await this.handleChatsSet(data.chats || []);
        });

        // Handle new/updated chats
        sock.ev.on('chats.upsert', async (chats: any[]) => {
            await this.handleChatsUpsert(chats);
        });

        // Handle chat updates (unread count, last message, etc.)
        sock.ev.on('chats.update', async (updates: any[]) => {
            await this.handleChatsUpdate(updates);
        });
    }

    private async handleConnectionUpdate(update: Partial<ConnectionState>): Promise<void> {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            this.qrCode = qr;
            this.connectionStatus = 'scanning';
            this.io.emit('status', { status: 'scanning', qr });
        }

        if (connection === 'close') {
            this.connectionStatus = 'disconnected';
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                logger.info('Connection closed, reconnecting...');
                this.start();
            } else {
                // Logged out - session is invalid
                logger.warn('Logged out from WhatsApp. Clearing session and restarting...');
                this.qrCode = null;

                // Delete session files
                this.clearSession();

                // Emit logged out status
                this.io.emit('status', { status: 'disconnected', loggedOut: true });

                // Restart to generate new QR code
                setTimeout(() => {
                    logger.info('Restarting after logout...');
                    this.start();
                }, 2000);
            }
            this.io.emit('status', { status: 'disconnected' });
        } else if (connection === 'open') {
            this.connectionStatus = 'connected';
            this.qrCode = null;
            logger.info('Connected!');
            this.io.emit('status', { status: 'connected' });

            // Sync missed messages (delta sync)
            await syncAllConversationsOnReconnect(this.sock!);

            // Refresh caches
            this.refreshGroups();
            this.refreshChats();
        }
    }

    private clearSession(): void {
        const fs = require('fs');
        const path = require('path');

        try {
            // Delete session directory contents
            if (fs.existsSync(SESSION_PATH)) {
                const files = fs.readdirSync(SESSION_PATH);
                for (const file of files) {
                    const filePath = path.join(SESSION_PATH, file);
                    fs.unlinkSync(filePath);
                }
                logger.info('Session files cleared');
            }
        } catch (err) {
            logger.error({ err }, 'Failed to clear session files');
        }
    }

    private async handleMessages(messages: WAMessage[], type: string): Promise<void> {
        if (type !== 'notify') return;

        // Check if processing is paused
        if (await isProcessingPaused()) {
            logger.debug('Processing is paused, skipping messages');
            return;
        }

        for (const msg of messages) {
            if (!msg.message) continue;
            const remoteJid = msg.key.remoteJid;
            if (!remoteJid) continue;

            // INVERTED LOGIC: Process if NOT excluded (track all by default)
            if (await isExcluded(remoteJid)) {
                logger.debug({ jid: remoteJid }, 'Chat is excluded, skipping');
                continue;
            }

            const messageType = Object.keys(msg.message)[0];
            logger.info({ jid: remoteJid, type: messageType }, 'Processing Message');

            try {
                await this.processMessage(msg);
            } catch (err) {
                logger.error({ err, jid: remoteJid }, 'Failed to process message');
            }
        }
    }

    private async processMessage(msg: WAMessage): Promise<void> {
        const remoteJid = msg.key.remoteJid!;
        const messageId = msg.key.id!;
        const timestamp = Number(msg.messageTimestamp);
        const participant = msg.key.participant || remoteJid;
        const pushName = msg.pushName || null;
        const isFromMe = msg.key.fromMe || false;

        // Extract message content
        const messageContent = this.extractMessageContent(msg);
        const messageType = Object.keys(msg.message || {})[0] || 'unknown';

        // Handle media if present
        let mediaUrl: string | null = null;
        let mediaType: MediaType | null = null;

        if (msg.message?.imageMessage) {
            mediaType = 'photo';
            mediaUrl = await this.downloadAndUploadMedia(msg, 'photo');
        } else if (msg.message?.videoMessage) {
            mediaType = 'video';
            mediaUrl = await this.downloadAndUploadMedia(msg, 'video');
        } else if (msg.message?.audioMessage) {
            mediaType = 'audio';
            mediaUrl = await this.downloadAndUploadMedia(msg, 'audio');
        } else if (msg.message?.documentMessage) {
            mediaType = 'document';
            mediaUrl = await this.downloadAndUploadMedia(msg, 'document');
        }

        // Save to database
        await saveMessage({
            messageId,
            jid: remoteJid,
            content: messageContent,
            messageType,
            mediaType,
            mediaUrl,
            sender: participant,
            senderName: pushName,
            timestamp,
            isFromMe,
            isForwarded: !!(msg.message?.extendedTextMessage?.contextInfo?.isForwarded),
            metadata: {
                ...msg.message,
                pushName: msg.pushName
            }
        });

        logger.info({
            jid: remoteJid,
            messageId,
            timestamp,
            mediaType,
            mediaUrl
        }, 'Message processed and saved');

        // Update tracking state
        await updateLastProcessedMessage(remoteJid, messageId, timestamp);
    }

    private extractMessageContent(msg: WAMessage): string {
        const message = msg.message;
        if (!message) return '';

        if (message.conversation) return message.conversation;
        if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
        if (message.imageMessage?.caption) return message.imageMessage.caption;
        if (message.videoMessage?.caption) return message.videoMessage.caption;

        return '';
    }

    private async downloadAndUploadMedia(msg: WAMessage, type: MediaType): Promise<string | null> {
        const sock = this.sock;
        if (!sock) {
            throw new Error('WhatsApp socket not initialized');
        }

        try {
            const buffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
                {
                    logger: logger as any,
                    reuploadRequest: sock.updateMediaMessage
                }
            ) as Buffer;

            const remoteJid = msg.key.remoteJid!;
            const filename = this.getMediaFilename(msg, type);

            const url = await uploadMedia(buffer, remoteJid, filename, type);
            return url;
        } catch (err) {
            logger.error({ err, type }, 'Failed to download/upload media');
            return null;
        }
    }

    private getMediaFilename(msg: WAMessage, type: MediaType): string {
        const message = msg.message;
        const timestamp = msg.messageTimestamp;

        let extension = 'bin';
        if (type === 'photo') extension = 'jpg';
        else if (type === 'video') extension = 'mp4';
        else if (type === 'audio') extension = 'mp3';
        else if (message?.documentMessage?.fileName) {
            return message.documentMessage.fileName;
        }

        return `${timestamp}.${extension}`;
    }

    async refreshGroups(): Promise<void> {
        if (!this.sock) return;

        try {
            const groups = await this.sock.groupFetchAllParticipating();
            const allGroups: GroupMetadata[] = Object.values(groups);

            logger.info(`Refreshing caches for ${allGroups.length} total items...`);

            // 1. Filter Standalone Groups (Business groups, friends, etc.)
            this.groupsCache = allGroups
                .filter((g: GroupMetadata) => {
                    if (g.id.includes('@newsletter')) return false;

                    const isPartOfCommunity = !!(g as any).linkedParentJid || !!(g as any).parent || !!(g as any).isCommunity || !!(g as any).isCommunityAnnounce;
                    const hasAnnouncementTitle = g.subject?.toLowerCase().includes('announcement');

                    // EXCLUDE if part of a community OR if it's clearly an announcement channel
                    if (isPartOfCommunity) return false;
                    if (hasAnnouncementTitle) return false;

                    return true;
                });

            // 2. Filter Community Announcements & Newsletters
            this.announcementsCache = allGroups
                .filter((g: GroupMetadata) => {
                    if (g.id.includes('@newsletter')) return true;

                    const isAnnounce = (g as any).announce === true || (g as any).announce === 'true' || !!(g as any).isCommunityAnnounce;
                    const isPartOfCommunity = !!(g as any).linkedParentJid || !!(g as any).parent || !!(g as any).isCommunity || !!(g as any).isCommunityAnnounce;
                    const hasAnnouncementTitle = g.subject?.toLowerCase().includes('announcement');

                    // Include if it's a community announcement or clearly labeled as such
                    return (isAnnounce && isPartOfCommunity) || hasAnnouncementTitle;
                })
                .map((g: GroupMetadata) => ({
                    id: g.id,
                    name: g.subject,
                    conversationTimestamp: g.creation
                } as BChat));

            logger.info(`Cache Update: ${this.groupsCache.length} standalone groups, ${this.announcementsCache.length} announcement channels.`);

            // SYNC TO DATABASE
            if (getWhatsAppDbClient()) {
                logger.debug(`Syncing ${allGroups.length} groups to database...`);
                for (const g of allGroups) {
                    await upsertChat(g.id, g.subject || 'Unknown', true, g);
                }
            } else {
                logger.warn('Skipping group sync to database: WhatsApp DB client not available');
            }

        } catch (err) {
            logger.error({ err }, 'Failed to fetch groups');
        }
    }

    async refreshChats(): Promise<void> {
        if (!this.sock) return;

        try {
            // Sync individual chats from WhatsApp and persist to DB
            const chats = await syncIndividualChats(this.sock);

            // Update cache
            this.individualChatsCache = chats;

            logger.info(`Refreshed ${chats.length} individual chats`);
        } catch (err) {
            logger.error({ err }, 'Failed to fetch individual chats');
        }
    }

    getStatus(): ConnectionStatus {
        return this.connectionStatus;
    }

    getQrCode(): string | null {
        return this.qrCode;
    }

    getGroups(): Group[] {
        return this.groupsCache.map(g => ({
            id: g.id,
            subject: g.subject || 'Unknown Group',
            creation: g.creation
        }));
    }

    getIndividualChats(): Chat[] {
        return this.individualChatsCache.map(c => ({
            id: c.id,
            name: c.name || c.id.split('@')[0],
            lastMessageTime: Number(c.conversationTimestamp) || 0
        }));
    }

    getAnnouncements(): Chat[] {
        return this.announcementsCache.map(c => ({
            id: c.id,
            name: c.name || c.id.split('@')[0],
            lastMessageTime: Number(c.conversationTimestamp) || 0
        }));
    }

    async getProcessingState() {
        return await getProcessingState();
    }

    hasSession(): boolean {
        const fs = require('fs');
        const path = require('path');
        const credsPath = path.join(SESSION_PATH, 'creds.json');
        return fs.existsSync(credsPath);
    }

    getSocket(): WASocket | null {
        return this.sock;
    }

    /**
     * Handle initial chat list (chats.set event)
     * Fired once on connection with ALL chats
     */
    private async handleChatsSet(chats: any[]): Promise<void> {
        logger.info(`Received ${chats.length} chats from WhatsApp (initial load)`);

        const client = getWhatsAppDbClient();
        if (!client) {
            logger.warn('Database not available, skipping chat sync');
            return;
        }

        try {
            for (const chat of chats) {
                await upsertChat(
                    chat.id,
                    chat.name || chat.id.split('@')[0],
                    chat.id.endsWith('@g.us'),
                    {
                        conversationTimestamp: chat.conversationTimestamp,
                        unreadCount: chat.unreadCount,
                        archived: chat.archived,
                        pinned: chat.pinned,
                        muteEndTime: chat.muteEndTime,
                        isAnnouncement: chat.id.includes('@newsletter'),
                        ...chat
                    }
                );

                // Update WhatsApp-specific fields
                await client.query(`
                    UPDATE chats
                    SET unread_count = $2,
                        last_message_timestamp = $3,
                        is_archived = $4,
                        is_pinned = $5,
                        is_muted = $6,
                        mute_until_timestamp = $7,
                        updated_at = NOW()
                    WHERE jid = $1
                `, [
                    chat.id,
                    chat.unreadCount || 0,
                    chat.conversationTimestamp || null,
                    chat.archived || false,
                    chat.pinned ? true : false,
                    chat.muteEndTime ? true : false,
                    chat.muteEndTime || null
                ]);
            }

            logger.info(`Successfully synced ${chats.length} chats to database`);
        } catch (err) {
            logger.error({ err }, 'Failed to sync chats');
        }
    }

    /**
     * Handle new or updated chats (chats.upsert event)
     */
    private async handleChatsUpsert(chats: any[]): Promise<void> {
        logger.debug(`Chat upsert: ${chats.length} chats`);

        for (const chat of chats) {
            await upsertChat(
                chat.id,
                chat.name || chat.id.split('@')[0],
                chat.id.endsWith('@g.us'),
                chat
            );
        }
    }

    /**
     * Handle chat updates (chats.update event)
     * Updates unread count, last message, etc.
     */
    private async handleChatsUpdate(updates: any[]): Promise<void> {
        const client = getWhatsAppDbClient();
        if (!client) return;

        for (const update of updates) {
            try {
                const jid = update.id;
                if (!jid) continue;

                const updateFields: string[] = [];
                const values: any[] = [jid];
                let paramIndex = 2;

                if (update.unreadCount !== undefined) {
                    updateFields.push(`unread_count = $${paramIndex++}`);
                    values.push(update.unreadCount);
                }

                if (update.conversationTimestamp !== undefined) {
                    updateFields.push(`last_message_timestamp = $${paramIndex++}`);
                    values.push(update.conversationTimestamp);
                }

                if (update.archived !== undefined) {
                    updateFields.push(`is_archived = $${paramIndex++}`);
                    values.push(update.archived);
                }

                if (update.pinned !== undefined) {
                    updateFields.push(`is_pinned = $${paramIndex++}`);
                    values.push(update.pinned > 0);
                    updateFields.push(`pin_order = $${paramIndex++}`);
                    values.push(update.pinned);
                }

                if (updateFields.length > 0) {
                    updateFields.push('updated_at = NOW()');

                    await client.query(`
                        UPDATE chats
                        SET ${updateFields.join(', ')}
                        WHERE jid = $1
                    `, values);

                    logger.debug({ jid, updates: updateFields }, 'Chat updated');
                }
            } catch (err) {
                logger.error({ err, update }, 'Failed to update chat');
            }
        }
    }

    /**
     * Handle message updates (messages.update event)
     * Handles message edits and deletes
     */
    private async handleMessageUpdates(updates: any[]): Promise<void> {
        const client = getWhatsAppDbClient();
        if (!client) return;

        for (const update of updates) {
            try {
                const messageId = update.key?.id;
                if (!messageId) continue;

                // Handle message edit
                if (update.update?.message) {
                    const newContent = this.extractMessageContent({ message: update.update.message } as WAMessage);

                    await client.query(`
                        UPDATE messages
                        SET content = $2,
                            metadata = jsonb_set(
                                COALESCE(metadata, '{}'::jsonb),
                                '{edited}',
                                'true'::jsonb
                            ),
                            metadata = jsonb_set(
                                metadata,
                                '{editedAt}',
                                to_jsonb(EXTRACT(EPOCH FROM NOW())::bigint)
                            )
                        WHERE message_id = $1
                    `, [messageId, newContent]);

                    logger.info({ messageId }, 'Message edited');
                }

                // Handle message delete
                if (update.update?.messageStubType === 'REVOKE' || update.update?.messageStubType === 68) {
                    await client.query(`
                        UPDATE messages
                        SET content = '[Message deleted]',
                            metadata = jsonb_set(
                                COALESCE(metadata, '{}'::jsonb),
                                '{deleted}',
                                'true'::jsonb
                            ),
                            metadata = jsonb_set(
                                metadata,
                                '{deletedAt}',
                                to_jsonb(EXTRACT(EPOCH FROM NOW())::bigint)
                            )
                        WHERE message_id = $1
                    `, [messageId]);

                    logger.info({ messageId }, 'Message deleted');
                }
            } catch (err) {
                logger.error({ err, update }, 'Failed to handle message update');
            }
        }
    }
}
