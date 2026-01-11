import {
    makeWASocket,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    WAMessage,
    downloadMediaMessage,
    WASocket,
    ConnectionState,
    GroupMetadata,
    Chat as BChat,
} from '@whiskeysockets/baileys';
import { usePostgresAuthState } from '../utils/auth';
// @ts-ignore - Baileys export issues in some versions
import { makeInMemoryStore } from '../utils/baileys-store';
import { Boom } from '@hapi/boom';
import { logger } from '../utils/logger';
import { SESSION_ID, SYNC_NEWSLETTERS, RATE_LIMIT_CONFIG } from '../config';
import { isExcluded, updateLastProcessedMessage, upsertChat } from '../utils/whitelist';
import { isProcessingPaused, getProcessingState } from '../utils/processing-state';
import { ensureBucketExists } from '../clients/minio.client';
import { uploadMedia, MediaType, setMinIOAvailability } from '../clients/media.client';
import { getWhatsAppDbClient } from '../clients/db.client';
import { getRedisClient } from '../clients/redis.client';
import { saveMessage } from '../utils/messages';
import { getRateLimiter } from '../utils/rate-limiter';
import { Server as SocketServer } from 'socket.io';
import fs from 'fs';
import path from 'path';

export type ConnectionStatus = 'disconnected' | 'scanning' | 'connected';

export interface SystemHealth {
    minioAvailable: boolean;
    databaseAvailable: boolean;
    whatsappConnected: boolean;
}

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
    private lastMessageSyncCache: Map<string, number> = new Map();
    private connectionStatus: ConnectionStatus = 'disconnected';
    private groupsCache: GroupMetadata[] = [];
    private individualChatsCache: BChat[] = [];
    private announcementsCache: BChat[] = [];
    private io: SocketServer;
    private store: any;
    private systemHealth: SystemHealth = {
        minioAvailable: true,
        databaseAvailable: true,
        whatsappConnected: false
    };

    constructor(io: any) {
        this.io = io;
        this.store = makeInMemoryStore({ logger: logger as any });
    }

    async start(): Promise<void> {
        // Ensure MinIO bucket exists (non-blocking)
        try {
            const minioReady = await ensureBucketExists();
            this.systemHealth.minioAvailable = minioReady;
            setMinIOAvailability(minioReady);

            if (!minioReady) {
                logger.warn('⚠️  Starting without MinIO - media uploads will be disabled');
                this.io.emit('system_warning', {
                    type: 'minio_unavailable',
                    message: 'Media storage unavailable - messages will be saved without media files',
                    severity: 'warning'
                });
            }
        } catch (err) {
            logger.error({ err }, 'MinIO initialization failed - continuing without media support');
            this.systemHealth.minioAvailable = false;
            setMinIOAvailability(false);
        }

        // Initialize rate limiter
        getRateLimiter(RATE_LIMIT_CONFIG);
        logger.info({ config: RATE_LIMIT_CONFIG }, 'Rate limiter initialized');

        // Load caches from DB
        await this.loadCachesFromDb();

        const { state, saveCreds } = await usePostgresAuthState(SESSION_ID);
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
        this.store.bind(sock.ev);

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
            let { chats, messages, contacts } = data;

            if (!SYNC_NEWSLETTERS) {
                if (chats) chats = chats.filter((c: any) => !c.id?.endsWith('@newsletter'));
                if (contacts) contacts = contacts.filter((c: any) => !c.id?.endsWith('@newsletter'));
                if (messages) messages = messages.filter((m: any) => !m.key?.remoteJid?.endsWith('@newsletter'));
            }

            const chatCount = chats?.length || 0;
            const msgCount = messages?.length || 0;
            const contactCount = contacts?.length || 0;

            logger.info(`Received messaging history: ${chatCount} chats, ${msgCount} messages (SKIPPED - deep sync disabled), ${contactCount} contacts (${SYNC_NEWSLETTERS ? 'newsletters enabled' : 'newsletters ignored'})`);

            if (chats) await this.handleChatsSet(chats);
            if (contacts) await this.handleContactsSet(contacts);

            // Process messages for chats with deep sync enabled
            if (messages && messages.length > 0) {
                const client = getWhatsAppDbClient();
                if (client) {
                    const jids = [...new Set(messages.map((m: any) => m.key?.remoteJid).filter(Boolean))];
                    const res = await client.query(
                        'SELECT jid FROM chats WHERE jid = ANY($1) AND deep_sync_enabled = TRUE',
                        [jids]
                    );
                    const enabledJids = new Set(res.rows.map((r: any) => r.jid));
                    const filtered = messages.filter((m: any) => enabledJids.has(m.key?.remoteJid));

                    if (filtered.length > 0) {
                        logger.info({ count: filtered.length }, 'Processing deep sync messages from initial history set (including media)');
                        await this.handleMessages(filtered, 'history', false);
                    }
                }
            }
        });

        // Handle incremental history updates (WhatsApp sends history in batches)
        (sock.ev as any).on('history-sync.update', async (update: any) => {
            const { chats, messages, contacts, progress } = update;
            logger.info({
                chats: chats?.length || 0,
                messages: messages?.length || 0,
                contacts: contacts?.length || 0,
                progress
            }, `Received incremental history update (Progress: ${progress}%)`);

            // Emit sync progress to UI always
            this.io.emit('sync_progress', {
                progress,
                chatsCount: chats?.length || 0,
                messagesCount: messages?.length || 0,
                contactsCount: contacts?.length || 0
            });

            if (chats) await this.handleChatsSet(chats);
            if (contacts) await this.handleContactsSet(contacts);

            if (messages) {
                const msgList = Array.isArray(messages) ? messages : [];
                if (msgList.length > 0) {
                    const client = getWhatsAppDbClient();
                    if (client) {
                        // Check which chats have deep sync enabled
                        const jids = [...new Set(msgList.map(m => m.key?.remoteJid).filter(Boolean))];
                        const res = await client.query(
                            'SELECT jid FROM chats WHERE jid = ANY($1) AND deep_sync_enabled = TRUE',
                            [jids]
                        );
                        const enabledJids = new Set(res.rows.map(r => r.jid));

                        const filteredMessages = msgList.filter(m => m.key?.remoteJid && enabledJids.has(m.key.remoteJid));
                        if (filteredMessages.length > 0) {
                            logger.info({ count: filteredMessages.length }, 'Processing history messages with media for deep-sync enabled chats');
                            await this.handleMessages(filteredMessages, 'notify', false);
                        }
                    }
                }
            }
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
            logger.info({ mappingCount: Object.keys(mapping).length }, 'Received LID mapping update');

            const client = getWhatsAppDbClient();
            if (!client) return;

            for (const [lid, jid] of Object.entries(mapping)) {
                try {
                    // Update any existing LID record to have the PN as canonical_jid
                    // PN (phone number) always ends in @s.whatsapp.net
                    await client.query(`
                        UPDATE chats 
                        SET canonical_jid = $2,
                            metadata = metadata || jsonb_build_object('pn_jid', $2)
                        WHERE jid = $1 OR (canonical_jid = $1 AND jid NOT LIKE '%@s.whatsapp.net')
                    `, [lid, jid]);
                } catch (err) {
                    logger.error({ err, lid, jid }, 'Failed to update LID mapping in DB');
                }
            }
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
            logger.info('👾 New QR Code received. Waiting for scan...');
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

    async manualSync(): Promise<void> {
        logger.info('🔄 Manual sync triggered');

        // 1. Sync groups (newsletters filtered inside performManualInitialSync)
        await this.performManualInitialSync();

        // 2. Sync contacts from store if available
        if (this.store && this.store.contacts) {
            const contacts = Object.values(this.store.contacts);
            logger.info(`👥 Manually syncing ${contacts.length} contacts from memory store`);
            await this.handleContactsSet(contacts);
        }

        // 3. Sync chats from store if available
        if (this.store && this.store.chats) {
            const chats = Object.values(this.store.chats.all()) as BChat[];
            // Filter out newsletters here too just in case they ended up in the store
            const filteredChats = chats.filter(c => c.id && !c.id.endsWith('@newsletter'));
            logger.info(`💬 Manually syncing ${filteredChats.length} chats from memory store`);
            await this.handleChatsSet(filteredChats);
        }

        // 4. Deep Name Reconciliation: Recover names from message metadata for numeric JIDs
        const client = getWhatsAppDbClient();
        if (client) {
            logger.info('🧠 Running Deep Name Reconciliation from message history...');
            try {
                const reconcileResult = await client.query(`
                    UPDATE chats c
                    SET name = sub.push_name,
                        is_contact = true,
                        updated_at = NOW()
                    FROM (
                        SELECT DISTINCT ON (jid) 
                            jid, 
                            metadata->>'pushName' as push_name
                        FROM messages
                        WHERE metadata->>'pushName' IS NOT NULL 
                          AND metadata->>'pushName' !~ '^[0-9+\\-@.]+$'
                          AND jid NOT LIKE '%@g.us'
                        ORDER BY jid, timestamp DESC
                    ) sub
                    WHERE c.jid = sub.jid
                      AND (c.name ~ '^[0-9+\\-@.]+$' OR c.name IS NULL OR c.name = c.jid OR c.name LIKE '%@%' OR c.name = 'Group' OR c.name = 'group')
                    RETURNING c.jid, c.name;
                `);
                logger.info(`✨ Deep Reconciliation: Updated ${reconcileResult.rowCount} chat names from message history`);
            } catch (err) {
                logger.error({ err }, 'Failed deep name reconciliation');
            }

            // 5. Deep Group Subject Recovery: Try to fetch metadata for JID-named groups
            try {
                const mysteryGroups = await client.query(`
                    SELECT jid FROM chats 
                    WHERE jid LIKE '%@g.us' 
                      AND (name ~ '^[0-9+\\-@.]+$' OR name = 'Group' OR name = 'group')
                    LIMIT 20
                `);

                if (mysteryGroups.rows.length > 0) {
                    logger.info(`🔍 Attempting to recover subjects for ${mysteryGroups.rows.length} mystery groups...`);
                    for (const group of mysteryGroups.rows) {
                        try {
                            // Check if it's already in store first (faster)
                            const cached = this.store?.groupMetadata?.[group.jid];
                            if (cached && cached.subject) {
                                await upsertChat(group.jid, cached.subject, true, cached);
                                continue;
                            }

                            // Fetch from WhatsApp (network op)
                            const metadata = await this.sock!.groupMetadata(group.jid);
                            if (metadata && metadata.subject) {
                                await upsertChat(group.jid, metadata.subject, true, metadata);
                            }
                        } catch (err) {
                            // Non-critical: usually fails if you are no longer in the group
                            logger.debug({ jid: group.jid }, 'Could not recover group subject (likely left group)');
                        }
                    }
                }
            } catch (err) {
                logger.error({ err }, 'Failed deep group subject recovery');
            }
        }

        logger.info('✅ Manual sync completed');
    }

    /**
     * Manual initial sync for existing sessions
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
                ...(SYNC_NEWSLETTERS ? allNewsletters.map(n => ({ ...n, isNewsletter: true })) : [])
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

            // Deep Name Reconciliation: Recover names from message metadata for numeric JIDs
            // This runs automatically on every connection to ensure names are always resolved
            const client = getWhatsAppDbClient();
            if (client) {
                logger.info('🧠 Running Deep Name Reconciliation from message history...');
                try {
                    const reconcileResult = await client.query(`
                        UPDATE chats c
                        SET name = sub.push_name,
                            is_contact = true,
                            updated_at = NOW()
                        FROM (
                            SELECT DISTINCT ON (jid) 
                                jid, 
                                metadata->>'pushName' as push_name
                            FROM messages
                            WHERE metadata->>'pushName' IS NOT NULL 
                              AND metadata->>'pushName' !~ '^[0-9]+$'
                            ORDER BY jid, timestamp DESC
                        ) sub
                        WHERE c.jid = sub.jid
                          AND (c.name ~ '^[0-9]+$' OR c.name IS NULL OR c.name = c.jid OR c.name LIKE '%@%')
                        RETURNING c.jid, c.name;
                    `);
                    logger.info(`✨ Deep Reconciliation: Updated ${reconcileResult.rowCount} chat names from message history`);
                } catch (err) {
                    logger.error({ err }, 'Failed deep name reconciliation');
                }
            }

            this.refreshGroups();
            this.refreshChats();
        } catch (err) {
            logger.error({ err }, '❌ Failed manual initial sync');
        }
    }

    private async clearSession(): Promise<void> {
        try {
            const client = getWhatsAppDbClient();
            if (client) {
                await client.query('DELETE FROM wa_auth_sessions WHERE session_id = $1', [SESSION_ID]);
                logger.info('Session cleared from database');
            }

            // Also clear Redis cache
            const redis = getRedisClient();
            const keys = await redis.keys(`wa_session:${SESSION_ID}:*`);
            if (keys.length > 0) {
                await redis.del(...keys);
                logger.info('Session cache cleared from Redis');
            }
        } catch (err) {
            logger.error({ err }, 'Failed to clear session');
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

            // Ignore status updates
            if (remoteJid === 'status@broadcast') continue;

            const isExcludedChat = await isExcluded(remoteJid);
            const messageType = Object.keys(msg.message)[0];

            // We ALWAYS process for identity/name discovery, but we skip storage if excluded
            try {
                // If excluded, we only care about naming/identity sync
                await this.processMessage(msg, skipMedia || isExcludedChat, !isExcludedChat);
            } catch (err) {
                logger.error({ err, jid: remoteJid }, 'Failed to process message discovery');
            }
        }
    }

    private async processMessage(msg: WAMessage, skipMedia: boolean = false, saveToDb: boolean = true): Promise<void> {
        // Baileys v7: LID is first-class citizen
        // remoteJid can be either LID or PN (phone number)
        const remoteJid = msg.key.remoteJid!;
        const messageId = msg.key.id!;

        // Robust timestamp extraction (handle Baileys Long object)
        let timestamp = 0;
        if (typeof msg.messageTimestamp === 'number') {
            timestamp = msg.messageTimestamp;
        } else if (msg.messageTimestamp && typeof (msg.messageTimestamp as any).toNumber === 'function') {
            timestamp = (msg.messageTimestamp as any).toNumber();
        } else if (msg.messageTimestamp && typeof (msg.messageTimestamp as any).low === 'number') {
            timestamp = (msg.messageTimestamp as any).low;
        } else {
            timestamp = Math.floor(Date.now() / 1000);
        }

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

        // Resolve name from store or alt JID if pushName is missing on message
        let resolvedName = pushName;
        if (!resolvedName && this.store?.contacts) {
            const contact = this.store.contacts[remoteJid] || (remoteJidAlt ? this.store.contacts[remoteJidAlt] : null);
            if (contact) {
                resolvedName = contact.name || contact.verifiedName || contact.pushName || contact.pushname || contact.notify;
            }
        }

        const isFromMe = msg.key.fromMe || false;

        // Extract message content
        const messageContent = this.extractMessageContent(msg);
        const messageType = Object.keys(msg.message || {})[0] || 'unknown';

        // Handle media if present
        let mediaUrl: string | null = null;
        let mediaType: MediaType | null = null;

        // Check if message already exists in DB with media (avoid re-downloading)
        let existingMediaUrl: string | null = null;
        if (!skipMedia) {
            const client = getWhatsAppDbClient();
            if (client) {
                try {
                    const existing = await client.query(
                        'SELECT media_url FROM messages WHERE message_id = $1 AND media_url IS NOT NULL',
                        [messageId]
                    );
                    if (existing.rows.length > 0) {
                        existingMediaUrl = existing.rows[0].media_url;
                        logger.debug({ messageId, mediaUrl: existingMediaUrl }, 'Media already downloaded, skipping');
                    }
                } catch (err) {
                    // Ignore errors, proceed with download
                }
            }
        }

        // Only download media if not already present
        if (!skipMedia && !existingMediaUrl && msg.message?.imageMessage) {
            mediaType = 'photo';
            mediaUrl = await this.downloadAndUploadMedia(msg, 'photo');
        } else if (!skipMedia && !existingMediaUrl && msg.message?.videoMessage) {
            mediaType = 'video';
            mediaUrl = await this.downloadAndUploadMedia(msg, 'video');
        } else if (!skipMedia && !existingMediaUrl && msg.message?.audioMessage) {
            mediaType = 'audio';
            mediaUrl = await this.downloadAndUploadMedia(msg, 'audio');
        } else if (!skipMedia && !existingMediaUrl && msg.message?.documentMessage) {
            mediaType = 'document';
            mediaUrl = await this.downloadAndUploadMedia(msg, 'document');
        } else if (!skipMedia && !existingMediaUrl && msg.message?.stickerMessage) {
            mediaType = 'sticker';
            mediaUrl = await this.downloadAndUploadMedia(msg, 'sticker');
        } else if (existingMediaUrl) {
            // Use existing media URL
            mediaUrl = existingMediaUrl;
            // Determine media type from message
            if (msg.message?.imageMessage) mediaType = 'photo';
            else if (msg.message?.videoMessage) mediaType = 'video';
            else if (msg.message?.audioMessage) mediaType = 'audio';
            else if (msg.message?.documentMessage) mediaType = 'document';
            else if (msg.message?.stickerMessage) mediaType = 'sticker';
        } else if (skipMedia && (msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.audioMessage || msg.message?.documentMessage || msg.message?.stickerMessage)) {
            logger.debug({ messageId }, 'Skipping media download in history sync');
        }

        // Ensure chat exists in database
        const isGroup = remoteJid.endsWith('@g.us');
        const isNewsletter = remoteJid.endsWith('@newsletter');

        // Pass generic name for groups only if subject is unknown, 
        // try to get subject from store or metadata
        let groupSubject = isGroup ? (this.store?.groupMetadata?.[remoteJid]?.subject || null) : null;

        const suggestedName = isGroup
            ? (groupSubject || remoteJid.split('@')[0])
            : (isFromMe ? remoteJid.split('@')[0] : (resolvedName || remoteJid.split('@')[0]));

        // Efficiently track latest message state
        const lastProcessedTs = this.lastMessageSyncCache.get(remoteJid) || 0;

        // Only hit the DB if the message is actually newer than our local state
        // (This protects against out-of-order history packets)
        if (timestamp >= lastProcessedTs) {
            this.lastMessageSyncCache.set(remoteJid, timestamp);

            // Consolidated identity and last-message update
            await upsertChat(
                remoteJid,
                suggestedName,
                isGroup,
                {
                    push_name: pushName,
                    resolved_name: resolvedName,
                    alt_jid: remoteJidAlt,
                    display_jid: displayJid
                },
                !!resolvedName, // Mark as contact if we resolved a name
                messageContent,
                timestamp,
                isFromMe
            );
        }

        if (saveToDb) {
            // Only save if we have content or media
            if (messageContent === null && !mediaUrl) {
                logger.debug({ messageId }, 'Skipping save for protocol/empty message');
                return;
            }

            // Save to database
            await saveMessage({
                messageId,
                jid: remoteJid,  // Store primary ID (LID or PN)
                content: messageContent || '',
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

            // Emit real-time events to frontend
            const messageData = {
                message_id: messageId,
                chat_jid: remoteJid,
                sender_jid: participant,
                message_text: messageContent,
                message_type: messageType,
                timestamp: timestamp.toString(),
                is_from_me: isFromMe,
                media_url: mediaUrl
            };

            this.io.emit('new_message', messageData);

            // Also emit chat list update
            this.io.emit('chat_update', {
                jid: remoteJid,
                name: suggestedName,
                last_message_text: messageContent,
                last_message_timestamp: timestamp.toString(),
                unread_count: 1 // Ideally we should fetch actual count, but 1 triggers UI badge
            });
        }
    }

    private extractMessageContent(msg: WAMessage): string | null {
        const message = msg.message;
        if (!message) return null;

        // Ignore protocol messages that don't have user-visible content
        if (message.protocolMessage || message.senderKeyDistributionMessage || (message as any).peerDataOperationRequestMessage) {
            return null;
        }

        // Handle various message types
        if (message.conversation) return message.conversation;
        if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;

        // Handle media with/without captions
        if (message.imageMessage) return message.imageMessage.caption || '[image]';
        if (message.videoMessage) return message.videoMessage.caption || '[video]';
        if (message.audioMessage) return '[audio]';
        if (message.stickerMessage) return null;
        if (message.documentMessage) return message.documentMessage.fileName || '[document]';
        if (message.contactMessage) return `[contact: ${message.contactMessage.displayName}]`;
        if (message.locationMessage) return '[location]';
        if (message.pollCreationMessageV3) return `[poll: ${message.pollCreationMessageV3.name}]`;

        // Handle interactive/template messages (common in Business/Bot accounts)
        if (message.templateMessage) {
            const template = message.templateMessage.hydratedTemplate || message.templateMessage.hydratedFourRowTemplate;
            if (template?.hydratedContentText) return template.hydratedContentText;
        }
        if (message.buttonsMessage) return message.buttonsMessage.contentText || '[Buttons Message]';
        if (message.listMessage) return message.listMessage.description || message.listMessage.title || '[List Message]';
        if (message.interactiveMessage) {
            const body = message.interactiveMessage.body;
            if (body?.text) return body.text;
        }

        // Check for ephemeral or view once messages
        const ephemeralMsg = (message as any).ephemeralMessage?.message || (message as any).viewOnceMessage?.message || (message as any).viewOnceMessageV2?.message;
        if (ephemeralMsg) {
            return this.extractMessageContent({ ...msg, message: ephemeralMsg });
        }

        return null;
    }

    private async downloadAndUploadMedia(msg: WAMessage, type: MediaType): Promise<string | null> {
        const sock = this.sock;
        if (!sock) {
            logger.error('WhatsApp socket not initialized for media download');
            return null;
        }

        try {
            // Download media from WhatsApp
            const buffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
                {
                    logger: logger as any,
                    reuploadRequest: sock.updateMediaMessage
                }
            ) as Buffer;

            if (!buffer || buffer.length === 0) {
                logger.warn({ messageId: msg.key.id }, 'Downloaded media buffer is empty');
                return null;
            }

            const remoteJid = msg.key.remoteJid!;
            const filename = this.getMediaFilename(msg, type);

            // Upload to MinIO (returns null if MinIO unavailable)
            const url = await uploadMedia(buffer, remoteJid, filename, type);

            if (!url) {
                logger.warn({
                    messageId: msg.key.id,
                    jid: remoteJid,
                    type
                }, 'Media upload failed - MinIO unavailable, continuing without media');
            }

            return url;
        } catch (err: any) {
            logger.error({
                err: err.message,
                stack: err.stack,
                messageId: msg.key.id,
                jid: msg.key.remoteJid,
                type
            }, 'Failed to download/upload media - continuing without media');

            // Return null instead of throwing - allow message processing to continue
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
        else if (type === 'sticker') extension = 'webp';
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
                    // Ignore newsletters completely
                    if (g.id.endsWith('@newsletter')) return false;

                    const isAnnounce = (g as any).announce === true || (g as any).announce === 'true' || !!(g as any).isCommunityAnnounce || !!(g as any).isCommunity;
                    const hasAnnouncementTitle = g.subject?.toLowerCase().includes('announcement');

                    // EXCLUDE if it's an announcement channel or community parent
                    if (isAnnounce || hasAnnouncementTitle) return false;

                    return true;
                });

            // 2. Filter Announcement Channels (including Community Parents)
            this.announcementsCache = allGroups
                .filter((g: GroupMetadata) => {
                    // Ignore newsletters completely
                    if (g.id.endsWith('@newsletter')) return false;

                    const isAnnounce = (g as any).announce === true || (g as any).announce === 'true' || !!(g as any).isCommunityAnnounce || !!(g as any).isCommunity;
                    const hasAnnouncementTitle = g.subject?.toLowerCase().includes('announcement');

                    // Include if it's an announcement or community parent
                    return isAnnounce || hasAnnouncementTitle;
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
        // Only return true if we have a socket AND an authenticated user
        return !!this.sock?.user;
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

        // Filter out newsletters and status updates
        const chatsToProcess = SYNC_NEWSLETTERS
            ? validChats.filter(c => c.id !== 'status@broadcast')
            : validChats.filter(c => !c.id!.endsWith('@newsletter') && c.id !== 'status@broadcast');

        const client = getWhatsAppDbClient();
        if (!client) {
            logger.warn('Database not available, skipping chat sync');
            return;
        }

        try {
            logger.info(`Starting bulk sync, first 3 chats structure: ${JSON.stringify(chatsToProcess.slice(0, 3).map(c => ({ id: c.id, name: (c as any).name, subject: (c as any).subject })), null, 2)}`);

            // Update local caches for Administration UI (newsletters already filtered out)
            this.individualChatsCache = chatsToProcess.filter(c => !c.id!.endsWith('@g.us'));

            // Define what counts as an announcement (merged with communities)
            const isAnnounce = (c: any) => !!c.readOnly || !!c.announce || !!c.isCommunityAnnounce || !!c.isCommunity;

            this.announcementsCache = chatsToProcess.filter(c => c.id!.endsWith('@g.us') && isAnnounce(c));
            const newGroups = chatsToProcess.filter(c => c.id!.endsWith('@g.us') && !isAnnounce(c));

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
                    // Treat any broadcast, read-only, or community-wide channel as an announcement
                    const isAnnouncement = isGroup && (
                        !!(chat as any).readOnly ||
                        !!(chat as any).announce ||
                        !!(chat as any).isCommunityAnnounce ||
                        !!(chat as any).isCommunity
                    );

                    if (!isGroup) {
                        individualCount++;
                        logger.debug({ jid, name: (chat as any).name }, 'Processing individual chat');
                    }

                    // Extract last message info from history if available
                    let lastMessageText: string | null = null;
                    let lastMessageTimestamp: number | null = chat.conversationTimestamp ? Number(chat.conversationTimestamp) : null;
                    let lastMessageFromMe: boolean = false;
                    let lastMsg: WAMessage | null = null;

                    if ((chat as any).messages && (chat as any).messages.length > 0) {
                        const lastMsgArray = (chat as any).messages;
                        lastMsg = lastMsgArray[lastMsgArray.length - 1];

                        if (lastMsg && lastMsg.message) {
                            lastMessageText = this.extractMessageContent(lastMsg);
                            lastMessageTimestamp = Number(lastMsg.messageTimestamp);
                            lastMessageFromMe = lastMsg.key?.fromMe || false;
                        }
                    }

                    // Memory check to skip redundant DB writes during history flood
                    const cachedTs = this.lastMessageSyncCache.get(jid) || 0;
                    if (!lastMessageTimestamp || lastMessageTimestamp >= cachedTs) {
                        if (lastMessageTimestamp) this.lastMessageSyncCache.set(jid, lastMessageTimestamp);

                        await upsertChat(
                            jid,
                            (chat as any).name || (chat as any).subject || jid.split('@')[0],
                            isGroup,
                            chat,
                            false, // isContact
                            lastMessageText,
                            lastMessageTimestamp,
                            lastMessageFromMe
                        );

                        // If we have a physical message record, save it to the messages table
                        if (lastMsg && lastMsg.message) {
                            const extracted = this.extractMessageContent(lastMsg);
                            if (extracted !== null) {
                                await saveMessage({
                                    messageId: lastMsg.key?.id || `hist-${lastMessageTimestamp}`,
                                    jid,
                                    content: extracted,
                                    messageType: Object.keys(lastMsg.message || {})[0] || 'text',
                                    mediaType: null,
                                    mediaUrl: null,
                                    sender: lastMsg.key?.participant || lastMsg.key?.remoteJid || null,
                                    senderName: (lastMsg as any).pushName || null,
                                    timestamp: Number(lastMessageTimestamp),
                                    isFromMe: lastMessageFromMe,
                                    isForwarded: false,
                                    metadata: lastMsg.message
                                });
                            }
                        }

                        // Update UI categorization fields that are NOT in upsertChat yet
                        await client.query(`
                            UPDATE chats
                            SET unread_count = $2,
                                is_archived = $3,
                                is_pinned = $4,
                                is_muted = $5,
                                mute_until_timestamp = $6,
                                updated_at = NOW()
                            WHERE jid = $1
                        `, [
                            jid,
                            chat.unreadCount || 0,
                            chat.archived || false,
                            chat.pinned ? true : false,
                            chat.muteEndTime ? true : false,
                            chat.muteEndTime ? Number(chat.muteEndTime) : null
                        ]);

                        count++;
                        if (count % 100 === 0) {
                            logger.info(`Synced ${count}/${chats.length} chats...`);
                        }
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

                // Only handle non-group chats here (groups handled by groups.upsert)
                if (jid.endsWith('@g.us')) continue;
                if (!SYNC_NEWSLETTERS && jid.endsWith('@newsletter')) continue;

                const isGroup = false;
                const isNewsletter = jid.endsWith('@newsletter');

                const hasAddressBookName = !!contact.name || !!contact.verifiedName;
                // Resolution order: Address Book Name > Verified Name > pushName > notify > Fallback
                const name = contact.name || contact.verifiedName || contact.pushName || contact.pushname || contact.notify || jid.split('@')[0];

                if (name === jid.split('@')[0]) {
                    logger.debug({ jid, name, contactFields: Object.keys(contact) }, 'Contact sync: No descriptive name found');
                } else {
                    logger.info({ jid, name, source: contact.name ? 'addressbook' : (contact.pushName ? 'pushName' : 'other') }, 'Contact sync: Resolved name');
                }

                await upsertChat(jid, name, isGroup, contact, hasAddressBookName);
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

    private async loadCachesFromDb() {
        const client = getWhatsAppDbClient();
        if (!client) return;

        try {
            logger.info('Loading caches from database...');

            // Load individual chats
            const chatsRes = await client.query(`
                SELECT jid as id, name, last_message_timestamp as "conversationTimestamp", is_group, is_announcement, metadata
                FROM chats
                ORDER BY last_message_timestamp DESC NULLS LAST
            `);

            this.individualChatsCache = chatsRes.rows.filter(r => !r.is_group);
            this.announcementsCache = chatsRes.rows.filter(r => r.is_group && r.is_announcement);
            this.groupsCache = chatsRes.rows.filter(r => r.is_group && !r.is_announcement);

            logger.info({
                individuals: this.individualChatsCache.length,
                groups: this.groupsCache.length,
                announcements: this.announcementsCache.length
            }, 'Caches populated from database');
        } catch (err) {
            logger.error({ err }, 'Failed to load caches from database');
        }
    }

    async logout(): Promise<void> {
        logger.info('👤 Logout requested');

        try {
            if (this.sock) {
                // Formally logout from WhatsApp (this will invalidate the session)
                await this.sock.logout();
                this.sock = null;
            }
        } catch (err) {
            logger.error({ err }, 'Failed to formally logout from WhatsApp');
        }

        // Always clear local session data even if WhatsApp logout fails
        await this.clearSession();
        this.qrCode = null;
        this.connectionStatus = 'disconnected';

        // Notify client
        this.io.emit('status', { status: 'disconnected', loggedOut: true });

        logger.info('✅ Successfully logged out and cleared session');
    }

    getSystemHealth(): SystemHealth {
        this.systemHealth.whatsappConnected = this.connectionStatus === 'connected';
        this.systemHealth.databaseAvailable = getWhatsAppDbClient() !== null;
        return this.systemHealth;
    }

    getSocket(): WASocket | null {
        return this.sock;
    }
}
