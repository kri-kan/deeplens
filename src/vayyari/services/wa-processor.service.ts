/* eslint-disable camelcase */
/**
 * wa-processor.service.ts
 * Client for the single whatsapp-processor Node.js REST API.
 * Handles live session state: status, QR codes, session switching, sync, and logout.
 * Account registry (list of phone numbers) is managed by the C# backend.
 */

import { identityService } from './identity.service';

const BASE_URL = process.env.EXPO_PUBLIC_WHATSAPP_PROCESSOR_URL ?? 'http://localhost:3001';
const PAGE_SIZE = 50;

async function get<T>(path: string): Promise<T> {
  const token = await identityService.getAccessTokenWithRefresh();
  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });
  if (!res.ok) throw new Error(`WA Processor ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function post<T = void>(path: string, body?: object): Promise<T> {
  const token = await identityService.getAccessTokenWithRefresh();
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`WA Processor ${res.status}: ${await res.text()}`);
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T;
  return res.json() as Promise<T>;
}

async function del<T = void>(path: string): Promise<T> {
  const token = await identityService.getAccessTokenWithRefresh();
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method: 'DELETE',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });
  if (!res.ok) throw new Error(`WA Processor ${res.status}: ${await res.text()}`);
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T;
  return res.json() as Promise<T>;
}

async function patch<T = void>(path: string, body?: object): Promise<T> {
  const token = await identityService.getAccessTokenWithRefresh();
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`WA Processor ${res.status}: ${await res.text()}`);
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T;
  return res.json() as Promise<T>;
}

/**
 * Defensive mapper to handle both camelCase and snake_case from backend
 */
function mapProcessingState(data: unknown): ProcessingState {
  const source = (data as any)?.state || (data as any) || {};

  return {
    isPaused: !!(source.isPaused ?? source.is_paused ?? false),
    pausedAt: source.pausedAt ?? source.paused_at ?? null,
    resumedAt: source.resumedAt ?? source.resumed_at ?? null,
    trackChats: !!(source.trackChats ?? source.track_chats ?? true),
    trackGroups: !!(source.trackGroups ?? source.track_groups ?? true),
    trackAnnouncements: !!(source.trackAnnouncements ?? source.track_announcements ?? true),
  };
}

// ---------- Types ----------

export type WaConnectionStatus = 'disconnected' | 'scanning' | 'connected';

export interface Group {
  jid: string;
  name: string; // Unified with Chat
  creation?: number;
  isExcluded: boolean;
  deepSyncEnabled: boolean;
}

export interface Chat {
  jid: string;
  name: string;
  lastMessageTime?: number;
  isExcluded: boolean;
  deepSyncEnabled: boolean;
}

export interface ProcessingState {
  isPaused: boolean;
  pausedAt: number | null;
  resumedAt: number | null;
  trackChats: boolean;
  trackGroups: boolean;
  trackAnnouncements: boolean;
}

export interface WaProcessorStatus {
  status: WaConnectionStatus;
  /** Base64 or string QR data — present only while status === 'scanning' */
  qr: string | null;
  /** Active session_id currently loaded in the processor */
  sessionId: string;
  tenant: string;
  hasSession: boolean;
  processingState: ProcessingState;
  systemHealth: {
    minioAvailable: boolean;
    databaseAvailable: boolean;
    whatsappConnected: boolean;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface Conversation {
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
  communityName?: string;
  profilePicId: string | null;
  profilePicUrl: string | null;
  metadata: any;
  deepSyncEnabled: boolean;
  isExcluded: boolean;
  messageCount?: number;
}

// ---------- API ----------

export const waProcessorService = {
  /**
   * Get current live connection status and QR code (if scanning).
   */
  getStatus: async (): Promise<WaProcessorStatus> => {
    const data = await get<any>('/status');
    return {
      status: data.status,
      qr: data.qr,
      sessionId: data.sessionId,
      tenant: data.tenant,
      hasSession: data.hasSession,
      processingState: mapProcessingState(data.processingState),
      systemHealth: data.systemHealth || {
        minioAvailable: false,
        databaseAvailable: false,
        whatsappConnected: false,
      }
    };
  },

  /**
   * Trigger a manual sync (groups, contacts, chats).
   */
  manualSync: async (): Promise<void> => {
    await post('/sync/manual');
  },

  /**
   * Log out the current session, clearing all auth state from disk.
   * The processor will re-enter the 'scanning' state afterward.
   */
  logout: async (): Promise<void> => {
    await post('/auth/logout');
  },

  // ---------- Administration ----------

  fetchGroups: async (limit = PAGE_SIZE, offset = 0, search?: string, excluded?: boolean): Promise<PaginatedResponse<Group>> => {
    let path = `/conversations/groups?limit=${limit}&offset=${offset}`;
    if (search) path += `&search=${encodeURIComponent(search)}`;
    if (excluded !== undefined) path += `&excluded=${excluded}`;
    return get<PaginatedResponse<Group>>(path);
  },

  fetchChats: async (limit = PAGE_SIZE, offset = 0, search?: string, excluded?: boolean): Promise<PaginatedResponse<Chat>> => {
    let path = `/conversations/chats?limit=${limit}&offset=${offset}`;
    if (search) path += `&search=${encodeURIComponent(search)}`;
    if (excluded !== undefined) path += `&excluded=${excluded}`;
    return get<PaginatedResponse<Chat>>(path);
  },

  fetchAnnouncements: async (limit = PAGE_SIZE, offset = 0, search?: string, excluded?: boolean): Promise<PaginatedResponse<Chat>> => {
    let path = `/conversations/announcements?limit=${limit}&offset=${offset}`;
    if (search) path += `&search=${encodeURIComponent(search)}`;
    if (excluded !== undefined) path += `&excluded=${excluded}`;
    return get<PaginatedResponse<Chat>>(path);
  },

  fetchConversations: async (): Promise<Conversation[]> => {
    const data = await get<Conversation[]>('/conversations');
    return data || [];
  },

  excludeChat: async (jid: string): Promise<void> => {
    await post('/chats/exclude', { jid });
  },

  bulkExcludeChats: async (jids: string[]): Promise<void> => {
    await post('/chats/bulk-exclude', { jids });
  },

  includeChat: async (jid: string, resumeMode: 'from_last' | 'from_now'): Promise<void> => {
    await post('/chats/include', { jid, resumeMode });
  },

  // ---------- Processing Control ----------

  pauseProcessing: async (): Promise<ProcessingState> => {
    const data = await post<any>('/processing/toggle', { pause: true });
    return mapProcessingState(data);
  },

  resumeProcessing: async (): Promise<ProcessingState> => {
    const data = await post<any>('/processing/toggle', { pause: false });
    return mapProcessingState(data);
  },

  fetchProcessingState: async (): Promise<ProcessingState> => {
    const data = await get<any>('/status');
    return mapProcessingState(data.processingState || data);
  },

  updateSyncSettings: async (settings: {
    trackChats?: boolean;
    trackGroups?: boolean;
    trackAnnouncements?: boolean;
  }): Promise<ProcessingState> => {
    // Map to snake_case for the backend
    const payload = {
      sync_chats: settings.trackChats,
      sync_groups: settings.trackGroups,
      sync_announcements: settings.trackAnnouncements
    };
    const data = await post<any>('/sync/settings', payload);
    // The backend updateSyncSettings returns { success: true, settings }
    // We can fetch the full status after update or just map the settings
    return mapProcessingState(data.settings || data);
  },

  toggleDeepSync: async (jid: string, enabled: boolean): Promise<void> => {
    await post(`/conversations/${encodeURIComponent(jid)}/deep-sync`, { enabled });
  },

  syncHistory: async (jid: string): Promise<void> => {
    await post(`/conversations/${encodeURIComponent(jid)}/sync-history`);
  },

  purgeMessages: async (jid: string): Promise<void> => {
    await post('/conversations/purge', { jid });
  },

  bulkPurgeMessages: async (jids: string[]): Promise<void> => {
    await post('/conversations/bulk-delete-messages', { jids });
  },

  // ---------- Conversation Details & Stats ----------

  fetchConversationStats: async (jid: string): Promise<ConversationStats> => {
    const data = await get<any>(`/conversations/${encodeURIComponent(jid)}/stats`);
    // Defensive mapping for stats
    return {
      jid: data.jid,
      name: data.name,
      isGroup: data.isGroup ?? data.is_group ?? false,
      isAnnouncement: data.isAnnouncement ?? data.is_announcement ?? false,
      isExcluded: data.isExcluded ?? data.is_excluded ?? false,
      deepSyncEnabled: data.deepSyncEnabled ?? data.deep_sync_enabled ?? false,
      enableMessageGrouping: data.enableMessageGrouping ?? data.enable_message_grouping ?? false,
      vendorId: data.vendorId ?? data.vendor_id ?? null,
      autoProcessProducts: data.autoProcessProducts ?? data.auto_process_products ?? false,
      createdAt: data.createdAt ?? data.created_at,
      updatedAt: data.updatedAt ?? data.updated_at,
      lastMessageTimestamp: data.lastMessageTimestamp ?? data.last_message_timestamp ?? null,
      profilePicId: data.profilePicId ?? data.profile_pic_id ?? null,
      profilePicUrl: data.profilePicUrl ?? data.profile_pic_url ?? null,
      messages: {
        total: data.messages?.total ?? 0,
        sent: data.messages?.sent ?? 0,
        received: data.messages?.received ?? 0,
        oldestTimestamp: data.messages?.oldestTimestamp ?? data.messages?.oldest_timestamp ?? null,
        newestTimestamp: data.messages?.newestTimestamp ?? data.messages?.newest_timestamp ?? null,
      },
      media: data.media || { total: 0, photos: 0, videos: 0, audio: 0, documents: 0, stickers: 0 }
    };
  },

  fetchMessages: async (jid: string, limit = 50, offset = 0): Promise<{ messages: Message[]; total: number }> => {
    const res = await get<{ messages: any[]; total: number }>(`/conversations/${encodeURIComponent(jid)}/messages?limit=${limit}&offset=${offset}`);
    return {
      total: res.total ?? 0,
      messages: (res.messages || []).map((m) => ({
        messageId: m.messageId ?? m.message_id,
        chatJid: m.chatJid ?? m.chat_jid,
        senderJid: m.senderJid ?? m.sender_jid,
        messageText: m.messageText ?? m.message_text ?? '',
        messageType: m.messageType ?? m.message_type ?? 'chat',
        mediaType: m.mediaType ?? m.media_type ?? null,
        timestamp: m.timestamp,
        isFromMe: m.isFromMe ?? m.is_from_me ?? false,
        mediaUrl: m.mediaUrl ?? m.media_url ?? null,
        metadata: m.metadata,
        groupId: m.groupId ?? m.group_id
      }))
    };
  },

  toggleMessageGrouping: async (jid: string, enabled: boolean, config?: any): Promise<void> => {
    await post(`/conversations/${encodeURIComponent(jid)}/message-grouping`, { enabled, config });
  },

  splitMessageGroup: async (jid: string, messageId: string): Promise<void> => {
    await post(`/conversations/${encodeURIComponent(jid)}/messages/${messageId}/split-group`);
  },

  moveMessageGroup: async (jid: string, messageId: string, direction: 'prev' | 'next'): Promise<void> => {
    await post(`/conversations/${encodeURIComponent(jid)}/messages/${messageId}/move-group`, { direction });
  },

  // ---------- Vendor Management ----------

  fetchVendor: async (jid: string): Promise<{ hasVendor: boolean; vendor?: { vendorId: string; vendorName: string; assignedAt?: string } }> => {
    return get<{ hasVendor: boolean; vendor?: { vendorId: string; vendorName: string; assignedAt?: string } }>(`/conversations/${encodeURIComponent(jid)}/vendor`);
  },

  assignVendor: async (jid: string, vendorId: string, vendorName: string): Promise<void> => {
    await post(`/conversations/${encodeURIComponent(jid)}/vendor`, { vendorId, vendorName, assignedBy: 'admin' });
  },

  removeVendor: async (jid: string): Promise<void> => {
    await del(`/conversations/${encodeURIComponent(jid)}/vendor`);
  },

  // ---------- Group Product Pipeline (REST Endpoints) ----------

  fetchGroupsReview: async (jid: string): Promise<any[]> => {
    return get<any[]>(`/group-review/${encodeURIComponent(jid)}`);
  },

  fetchGroupAuditLog: async (groupId: string): Promise<any[]> => {
    return get<any[]>(`/group-review/${encodeURIComponent(groupId)}/audit`);
  },

  toggleGroupProcessProduct: async (groupId: string, processAsProduct: boolean): Promise<void> => {
    await patch(`/group-review/${encodeURIComponent(groupId)}/flag`, { processAsProduct });
  },

  ignoreGroup: async (groupId: string, ignore: boolean): Promise<void> => {
    await post(`/group-review/${encodeURIComponent(groupId)}/ignore`, { ignore });
  },

  splitGroupZone: async (groupId: string, messageId: string): Promise<any> => {
    return post<any>(`/group-review/${encodeURIComponent(groupId)}/split`, { messageId });
  },

  mergeGroupZones: async (groupId: string, targetGroupId: string): Promise<any> => {
    return post<any>(`/group-review/${encodeURIComponent(groupId)}/merge`, { targetGroupId });
  },

  reassignGroupMessage: async (groupId: string, messageId: string, targetGroupId: string): Promise<void> => {
    await patch(`/group-review/${encodeURIComponent(groupId)}/reassign-message`, { messageId, targetGroupId });
  },

  forcePublishGroup: async (groupId: string): Promise<void> => {
    await post(`/group-review/${encodeURIComponent(groupId)}/force-publish`);
  },

  assignChatVendor: async (jid: string, vendorId: string | null): Promise<void> => {
    await patch(`/chats/${encodeURIComponent(jid)}/vendor`, { vendorId });
  },

  toggleChatAutoProcess: async (jid: string, autoProcess: boolean): Promise<void> => {
    await patch(`/chats/${encodeURIComponent(jid)}/auto-process`, { autoProcess });
  }
};

export interface Message {
  messageId: string;
  chatJid: string;
  senderJid: string;
  messageText: string;
  messageType: string;
  mediaType: string | null;
  timestamp: number;
  isFromMe: boolean;
  mediaUrl: string | null;
  metadata: any;
  groupId?: string;
}

export interface ConversationStats {
  jid: string;
  name: string;
  isGroup: boolean;
  isAnnouncement: boolean;
  isExcluded: boolean;
  deepSyncEnabled: boolean;
  enableMessageGrouping: boolean;
  vendorId?: string | null;
  autoProcessProducts?: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageTimestamp: number | null;
  profilePicId: string | null;
  profilePicUrl: string | null;
  messages: {
    total: number;
    sent: number;
    received: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
  };
  media: {
    total: number;
    photos: number;
    videos: number;
    audio: number;
    documents: number;
    stickers: number;
  };
}

