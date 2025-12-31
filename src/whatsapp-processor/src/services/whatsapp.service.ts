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
import path from 'path';
import fs from 'fs';
import { Server as SocketServer } from 'socket.io';
import { SESSION_PATH, LOG_LEVEL } from '../config';
import { isExcluded, updateLastProcessedMessage, upsertChat } from '../utils/whitelist';
import { isProcessingPaused, getProcessingState } from '../utils/processing-state';
import { ensureBucketExists } from '../clients/minio.client';
import { uploadMedia, MediaType } from '../clients/media.client';
import { getWhatsAppDbClient } from '../clients/db.client';
import { saveMessage } from '../utils/messages';
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
    private store: any;

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
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger as any),
            },
            generateHighQualityLinkPreview: true,
            browser: ['DeepLens', 'Chrome', '1.0.0'],
            syncFullHistory: true,
            shouldSyncHistoryMessage: () => true,
            markOnlineOnConnect: false,
        });

        this.sock = sock;

        sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
            this.handleConnectionUpdate(update);
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async ({ messages, type }: { messages: WAMessage[], type: string }) => {
            await this.handleMessages(messages, type);
        });

        // Handle chat updates (unread count, last message, etc.)
        sock.ev.on('chats.upsert', async (chats) => {
            await this.handleChatsSet(chats);
        });

        sock.ev.on('chats.update', async (updates) => {
            for (const update of updates) {
                const jid = update.id!;
                const client = getWhatsAppDbClient();
                if (client) {
                    await client.query(`
                        UPDATE chats 
                        SET unread_count = COALESCE($2, unread_count),
                            last_message_text = COALESCE($3, last_message_text),
                            last_message_timestamp = COALESCE($4, last_message_timestamp),
                            updated_at = NOW()
                        WHERE jid = $1
                    `, [jid, update.unreadCount, update.lastMessageRecvTimestamp, update.conversationTimestamp]);
                }
            }
        });

        // Handle message updates (edits, deletes)
        sock.ev.on('messages.update', async (updates: any[]) => {
            await this.handleMessageUpdates(updates);
        });

        // Handle full history sync from WhatsApp (fires on connection with ALL data)
        sock.ev.on('messaging-history.set', async (data: any) => {
            const { chats, messages, contacts } = data;
            const chatCount = chats?.length || 0;
            const msgCount = messages?.length || 0;
            const contactCount = contacts?.length || 0;

            logger.info(`Received messaging history: ${chatCount} chats, ${msgCount} messages, ${contactCount} contacts`);

            if (chats) await this.handleChatsSet(chats);
            if (contacts) await this.handleContactsSet(contacts);
            if (messages) await this.handleMessages(messages, 'notify', true); // skipMedia = true for bulk history
        });

        sock.ev.on('contacts.upsert', async (contacts) => {
            logger.info(`Received contacts.upsert: ${contacts.length} contacts`);
            await this.handleContactsSet(contacts);
        });

        sock.ev.on('contacts.update', async (updates) => {
            logger.info(`Received contacts.update: ${updates.length} updates`);
            await this.handleContactsSet(updates);
        });

        // LID Mapping (Baileys v7 - LID is first-class citizen)
        sock.ev.on('lid-mapping.update', async (mapping) => {
            logger.info({ mapping }, 'Received LID mapping update');
            // TODO: Store LID → Phone number mappings in database
            // This allows us to resolve LIDs to phone numbers for display
        });

        // Try 'contacts.set' anyway, sometimes it fires despite not being in types
        (sock.ev as any).on('contacts.set', async ({ contacts }: any) => {
            logger.info(`Received contacts.set: ${contacts?.length || 0} contacts`);
            if (contacts) await this.handleContactsSet(contacts);
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
            // TODO: Re-enable after fixing sync service
            // await syncAllConversationsOnReconnect(this.sock!);

            // Manual initial sync for existing sessions
            // (chats.set only fires on first-time connection)
            await this.performManualInitialSync();

            // Refresh caches
            this.refreshGroups();
            this.refreshChats();
        }
    }

    /**
     * Manual initial sync for existing sessions
     * chats.set event only fires on first connection, not on reconnects
     */
    /**
     * Manual initial sync for existing sessions
     * chats.set event only fires on first connection, not on reconnects
     */
    /**
     * Manual initial sync for existing sessions
     * chats.set event only fires on first connection, not on reconnects
     */
    /**
     * Manual initial sync for existing sessions
     * messaging-history.set event only fires on first connection, not on reconnects
     */
    async performManualInitialSync(): Promise<void> {
        if (!this.sock) {
            logger.warn('⚠️  Cannot perform manual sync: WhatsApp not connected');
            return;
        }

        const client = getWhatsAppDbClient();
        if (!client) {
            logger.warn('⚠️  Cannot perform manual sync: Database not available');
            return;
        }

        try {
            logger.info('🔍 Starting manual initial sync for groups...');

            // Fetch all groups
            logger.info('📡 Fetching participating groups...');
            const groups = await this.sock.groupFetchAllParticipating();
            const allGroups = Object.values(groups);
            logger.info(`📥 Received ${allGroups.length} groups`);

            // Populate groups cache for Administration UI
            this.groupsCache = allGroups;

            // 2. Fetch newsletters if supported
            let allNewsletters: any[] = [];
            try {
                if ((this.sock as any).newsletterFetchAllParticipating) {
                    const newsletters = await (this.sock as any).newsletterFetchAllParticipating();
                    allNewsletters = Object.values(newsletters || {});
                    logger.info(`📥 Received ${allNewsletters.length} newsletters`);
                }
            } catch (err) { /* ignore */ }

            const chatsToSync = [
                ...allGroups.map(g => ({ ...g, isGroup: true })),
                ...allNewsletters.map(n => ({ ...n, isNewsletter: true }))
            ];

            let syncedCount = 0;
            for (const chat of chatsToSync) {
                const jid = (chat as any).id;
                const isGroup = !!(chat as any).isGroup;

                await upsertChat(
                    jid,
                    (chat as any).subject || (chat as any).name || jid.split('@')[0],
                    isGroup,
                    chat
                );

                syncedCount++;
            }

            // 3. Discover participants from groups to populate potential contacts
            // DISABLED as per user request to avoid junk LIDs
            /*
            logger.info('👥 Discovering participants from groups (Deep Discovery)...');
            let participantDiscoveryCount = 0;

            // Limit deep discovery to first 1000 groups to cover more contacts
            const discoveryGroups = allGroups.slice(0, 1000);

            for (const group of discoveryGroups) {
                try {
                    let participants = group.participants;

                    // If participants are missing, try to fetch full metadata
                    if (!participants || participants.length === 0) {
                        logger.debug({ jid: group.id }, 'Fetching full metadata for discovery');
                        const metadata = await this.sock.groupMetadata(group.id);
                        participants = metadata.participants;
                    }

                    if (participants) {
                        for (const participant of participants) {
                            const jid = participant.id;
                            if (jid && (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid'))) {
                                const discoveredName = (participant as any).name || (participant as any).notify || jid.split('@')[0];
                                await upsertChat(jid, discoveredName, false, { discovered_from_group: group.id });
                                participantDiscoveryCount++;
                            }
                        }
                    }
                } catch (err) {
                    logger.warn({ jid: group.id }, 'Failed to fetch metadata for discovery');
                }
            }
            logger.info(`✨ Discovered ${participantDiscoveryCount} potential contacts from ${discoveryGroups.length} groups`);
            */
            logger.info('✨ Deep Discovery skipped');

            logger.info({ total: syncedCount }, '✅ Manual initial sync complete');

            this.refreshGroups();
            this.refreshChats();
        } catch (err) {
            logger.error({ err }, '❌ Failed manual initial sync');
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

    private async handleMessages(messages: WAMessage[], type: string, skipMedia: boolean = false): Promise<void> {
        logger.info(`📬 Received ${messages.length} messages, type: ${type}`);

        // Check if processing is paused
        if (await isProcessingPaused()) {
            logger.debug('⏸️ Processing is paused, skipping messages');
            return;
        }

        for (const msg of messages) {
            if (!msg.message) continue;
            const remoteJid = msg.key.remoteJid;
            if (!remoteJid) continue;

            // Skip newsletters - they're broadcast-only, not conversations
            if (remoteJid.endsWith('@newsletter')) {
                logger.debug({ jid: remoteJid }, 'Skipping newsletter message');
                continue;
            }

            // INVERTED LOGIC: Process if NOT excluded (track all by default)
            if (await isExcluded(remoteJid)) {
                logger.debug({ jid: remoteJid }, 'Chat is excluded, skipping');
                continue;
            }

            const messageType = Object.keys(msg.message)[0];
            logger.info({ jid: remoteJid, type: messageType }, 'Processing Message');

            try {
                await this.processMessage(msg, skipMedia);
            } catch (err) {
                logger.error({ err, jid: remoteJid }, 'Failed to process message');
            }
        }
    }

    private async processMessage(msg: WAMessage, skipMedia: boolean = false): Promise<void> {
        // Baileys v7: LID is first-class citizen
        // remoteJid can be either LID or PN (phone number)
        const remoteJid = msg.key.remoteJid!;
        const messageId = msg.key.id!;
        const timestamp = Number(msg.messageTimestamp);

        // Use participant for groups, remoteJid for DMs
        const participant = msg.key.participant || remoteJid;

        // Baileys v7: Use Alt fields for display (PN when available)
        // If primary is LID, Alt is PN (and vice versa)
        const remoteJidAlt = (msg.key as any).remoteJidAlt;
        const participantAlt = (msg.key as any).participantAlt;

        // Prefer phone number for display, but store LID as primary
        const displayJid = remoteJidAlt || remoteJid;
        const displayParticipant = participantAlt || participant;

        const pushName = msg.pushName || null;
        const isFromMe = msg.key.fromMe || false;

        // Extract message content
        const messageContent = this.extractMessageContent(msg);
        const messageType = Object.keys(msg.message || {})[0] || 'unknown';

        // Handle media if present
        let mediaUrl: string | null = null;
        let mediaType: MediaType | null = null;

        if (!skipMedia && msg.message?.imageMessage) {
            mediaType = 'photo';
            mediaUrl = await this.downloadAndUploadMedia(msg, 'photo');
        } else if (!skipMedia && msg.message?.videoMessage) {
            mediaType = 'video';
            mediaUrl = await this.downloadAndUploadMedia(msg, 'video');
        } else if (!skipMedia && msg.message?.audioMessage) {
            mediaType = 'audio';
            mediaUrl = await this.downloadAndUploadMedia(msg, 'audio');
        } else if (!skipMedia && msg.message?.documentMessage) {
            mediaType = 'document';
            mediaUrl = await this.downloadAndUploadMedia(msg, 'document');
        } else if (skipMedia && (msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.audioMessage || msg.message?.documentMessage)) {
            logger.debug({ messageId }, 'Skipping media download in history sync');
        }

        // Ensure chat exists in database
        const isGroup = remoteJid.endsWith('@g.us');
        const isNewsletter = remoteJid.endsWith('@newsletter');

        // Pass generic name for groups so upsertChat keeps subject, 
        // use pushName for individuals to fix numeric LID labels.
        const suggestedName = isGroup ? 'Group' : (pushName || remoteJid.split('@')[0]);

        await upsertChat(
            remoteJid,
            suggestedName,
            isGroup,
            {
                last_message_at: timestamp,
                push_name: pushName,
                // Baileys v7: Store Alt JID for display
                alt_jid: remoteJidAlt,
                display_jid: displayJid
            }
        );

        // Update chat's last message info
        const client = getWhatsAppDbClient();
        if (client) {
            await client.query(`
                UPDATE chats 
                SET last_message_text = $2, 
                    last_message_timestamp = $3, 
                    last_message_from_me = $4,
                    updated_at = NOW()
                WHERE jid = $1
            `, [remoteJid, messageContent, timestamp, isFromMe]);
        }

        // Save to database
        await saveMessage({
            messageId,
            jid: remoteJid,  // Store primary ID (LID or PN)
            content: messageContent,
            messageType,
            mediaType,
            mediaUrl,
            sender: participant,  // Primary sender ID
            senderName: pushName,
            timestamp,
            isFromMe,
            isForwarded: !!(msg.message?.extendedTextMessage?.contextInfo?.isForwarded),
            metadata: {
                ...msg.message,
                pushName: msg.pushName,
                // Baileys v7: Store Alt fields for LID ↔ PN mapping
                lidInfo: {
                    remoteJid,
                    remoteJidAlt,
                    participant,
                    participantAlt,
                    displayJid,
                    displayParticipant
                }
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

        // Handle various message types
        if (message.conversation) return message.conversation;
        if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;

        // Handle media with/without captions
        if (message.imageMessage) return message.imageMessage.caption || '[Image]';
        if (message.videoMessage) return message.videoMessage.caption || '[Video]';
        if (message.audioMessage) return '[Audio]';
        if (message.stickerMessage) return '[Sticker]';
        if (message.documentMessage) return message.documentMessage.fileName || '[Document]';
        if (message.contactMessage) return `[Contact: ${message.contactMessage.displayName}]`;
        if (message.locationMessage) return '[Location]';
        if (message.pollCreationMessageV3) return `[Poll: ${message.pollCreationMessageV3.name}]`;

        // Check for ephemeral or view once messages
        const ephemeralMsg = (message as any).ephemeralMessage?.message || (message as any).viewOnceMessage?.message || (message as any).viewOnceMessageV2?.message;
        if (ephemeralMsg) {
            return this.extractMessageContent({ ...msg, message: ephemeralMsg });
        }

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
            // TODO: Re-enable after fixing sync service
            logger.debug('Refresh individual chats called');
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
        return this.groupsCache
            .filter(g => g.id)
            .map(g => ({
                id: g.id!,
                subject: g.subject || 'Unknown Group',
                creation: g.creation
            }));
    }

    getIndividualChats(): Chat[] {
        return this.individualChatsCache
            .filter(c => c.id)
            .map(c => ({
                id: c.id!,
                name: c.name || c.id!.split('@')[0],
                lastMessageTime: Number(c.conversationTimestamp) || 0
            }));
    }

    getAnnouncements(): Chat[] {
        return this.announcementsCache
            .filter(c => c.id)
            .map(c => ({
                id: c.id!,
                name: c.name || c.id!.split('@')[0],
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
     * Handle initial chat list (messaging-history.set or manual load)
     * Fired once on connection with ALL chats
     */
    private async handleChatsSet(chats: BChat[]): Promise<void> {
        // Filter out chats with missing IDs to satisfy Typescript checks
        const validChats = chats.filter(c => c.id);

        const groups = validChats.filter(c => c.id!.endsWith('@g.us')).length;
        const individual = validChats.filter(c => c.id!.endsWith('@s.whatsapp.net')).length;
        const newsletter = validChats.filter(c => c.id!.endsWith('@newsletter')).length;
        const lids = validChats.filter(c => c.id!.endsWith('@lid')).length;
        logger.info(`Received ${chats.length} chats from WhatsApp (bulk sync). Breakdown: ${groups} groups, ${individual} individuals, ${newsletter} newsletters (ignored), ${lids} lids`);

        // Filter out newsletters - we don't track broadcast channels
        const chatsToProcess = validChats.filter(c => !c.id!.endsWith('@newsletter'));

        const client = getWhatsAppDbClient();
        if (!client) {
            logger.warn('Database not available, skipping chat sync');
            return;
        }

        try {
            logger.info(`Starting bulk sync, first 3 chats structure: ${JSON.stringify(chatsToProcess.slice(0, 3).map(c => ({ id: c.id, name: (c as any).name, subject: (c as any).subject })), null, 2)}`);

            // Update local caches for Administration UI (newsletters already filtered out)
            this.individualChatsCache = chatsToProcess.filter(c => !c.id!.endsWith('@g.us'));
            this.announcementsCache = chatsToProcess.filter(c => c.id!.endsWith('@g.us') && ((c as any).readOnly || (c as any).announce || (c as any).isCommunityAnnounce));
            const newGroups = chatsToProcess.filter(c => c.id!.endsWith('@g.us') && !((c as any).readOnly || (c as any).announce || (c as any).isCommunityAnnounce));

            // Merge groups cache
            const groupIds = new Set(this.groupsCache.map(g => g.id));
            for (const group of newGroups) {
                if (group.id && !groupIds.has(group.id)) {
                    this.groupsCache.push(group as any);
                }
            }

            let count = 0;
            let individualCount = 0;
            for (const chat of chatsToProcess) {
                try {
                    const jid = chat.id!;
                    const isGroup = jid.endsWith('@g.us');
                    const isAnnouncement = !!(isGroup && (chat as any).readOnly);

                    if (!isGroup) {
                        individualCount++;
                        logger.debug({ jid, name: (chat as any).name }, 'Processing individual chat');
                    }

                    await upsertChat(
                        jid,
                        (chat as any).name || (chat as any).subject || jid.split('@')[0],
                        isGroup,
                        chat
                    );

                    // Handle last message from chat history if present
                    if ((chat as any).messages && (chat as any).messages.length > 0) {
                        const lastMsgArray = (chat as any).messages;
                        const lastMsg = lastMsgArray[lastMsgArray.length - 1];

                        if (lastMsg && lastMsg.message) {
                            const messageText = this.extractMessageContent(lastMsg);
                            const timestamp = lastMsg.messageTimestamp;
                            const fromMe = lastMsg.key?.fromMe || false;

                            // Update chat preview
                            await client.query(`
                                UPDATE chats
                                SET last_message_text = $2,
                                    last_message_timestamp = $3,
                                    last_message_from_me = $4
                                WHERE jid = $1
                            `, [jid, messageText, timestamp, fromMe]);

                            // Skip processMessage during bulk sync to avoid media download hangs
                            // We can just save the text entry directly if we really want history
                            await saveMessage({
                                messageId: lastMsg.key?.id || `hist-${timestamp}`,
                                jid,
                                content: messageText,
                                messageType: Object.keys(lastMsg.message || {})[0] || 'text',
                                mediaType: null,
                                mediaUrl: null,
                                sender: lastMsg.key?.participant || lastMsg.key?.remoteJid,
                                senderName: (lastMsg as any).pushName || null,
                                timestamp: Number(timestamp),
                                isFromMe: fromMe,
                                isForwarded: false,
                                metadata: lastMsg.message
                            });
                        }
                    }

                    // Update categorization and other fields
                    await client.query(`
                        UPDATE chats
                        SET unread_count = $2,
                            last_message_timestamp = COALESCE(last_message_timestamp, $3),
                            is_archived = $4,
                            is_pinned = $5,
                            is_muted = $6,
                            mute_until_timestamp = $7,
                            is_announcement = $8,
                            is_group = $9,
                            updated_at = NOW()
                        WHERE jid = $1
                    `, [
                        jid,
                        chat.unreadCount || 0,
                        chat.conversationTimestamp ? Number(chat.conversationTimestamp) : null,
                        chat.archived || false,
                        chat.pinned ? true : false,
                        chat.muteEndTime ? true : false,
                        chat.muteEndTime ? Number(chat.muteEndTime) : null,
                        isAnnouncement,
                        isGroup
                    ]);

                    count++;
                    if (count % 100 === 0) {
                        logger.info(`Synced ${count}/${chats.length} chats...`);
                    }
                } catch (chatErr: any) {
                    logger.error({ err: chatErr.message, jid: chat.id }, 'Failed to sync individual chat');
                }
            }

            logger.info(`Successfully finished bulk sync for ${count} chats (${individualCount} non-groups)`);
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
    /**
     * Handle contact list updates (discovery of people)
     */
    private async handleContactsSet(contacts: any[]): Promise<void> {
        if (!contacts || contacts.length === 0) return;

        let discoveryCount = 0;
        for (const contact of contacts) {
            try {
                const jid = contact.id;
                if (!jid) continue;

                // Only handle personal chats here
                const isGroup = jid.endsWith('@g.us');
                const isNewsletter = jid.endsWith('@newsletter');
                const name = contact.name || contact.verifiedName || contact.notify || jid.split('@')[0];

                await upsertChat(jid, name, isGroup, contact);
                discoveryCount++;
            } catch (err) {
                logger.error({ err, contact }, 'Failed to process contact discovery');
            }
        }

        if (discoveryCount > 0) {
            logger.info(`Discovered/Updated ${discoveryCount} contacts from WhatsApp`);
            this.refreshChats();
        }
    }

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
