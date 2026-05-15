/**
 * wa-processor.service.ts
 * Client for the single whatsapp-processor Node.js REST API.
 * Handles live session state: status, QR codes, session switching, sync, and logout.
 * Account registry (list of phone numbers) is managed by the C# backend.
 */

import { identityService } from './identity.service';

const BASE_URL = process.env.EXPO_PUBLIC_WHATSAPP_PROCESSOR_URL ?? 'http://localhost:3001';

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

// ---------- Types ----------

export type WaConnectionStatus = 'disconnected' | 'scanning' | 'connected';

export interface Group {
  id: string;
  name: string; // Unified with Chat
  creation?: number;
  isExcluded: boolean;
  deepSyncEnabled: boolean;
}

export interface Chat {
  id: string;
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

// ---------- API ----------

export const waProcessorService = {
  /**
   * Get current live connection status and QR code (if scanning).
   */
  getStatus: async (): Promise<WaProcessorStatus> => {
    return get<WaProcessorStatus>('/status');
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

  fetchGroups: async (limit = 100, offset = 0, search?: string, excluded?: boolean): Promise<PaginatedResponse<Group>> => {
    let path = `/groups?limit=${limit}&offset=${offset}`;
    if (search) path += `&search=${encodeURIComponent(search)}`;
    if (excluded !== undefined) path += `&excluded=${excluded}`;
    return get<PaginatedResponse<Group>>(path);
  },

  fetchChats: async (limit = 100, offset = 0, search?: string, excluded?: boolean): Promise<PaginatedResponse<Chat>> => {
    let path = `/chats?limit=${limit}&offset=${offset}`;
    if (search) path += `&search=${encodeURIComponent(search)}`;
    if (excluded !== undefined) path += `&excluded=${excluded}`;
    return get<PaginatedResponse<Chat>>(path);
  },

  fetchAnnouncements: async (limit = 100, offset = 0, search?: string, excluded?: boolean): Promise<PaginatedResponse<Chat>> => {
    let path = `/announcements?limit=${limit}&offset=${offset}`;
    if (search) path += `&search=${encodeURIComponent(search)}`;
    if (excluded !== undefined) path += `&excluded=${excluded}`;
    return get<PaginatedResponse<Chat>>(path);
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
    const data = await post<{ state: ProcessingState }>('/processing/pause');
    return data.state;
  },

  resumeProcessing: async (): Promise<ProcessingState> => {
    const data = await post<{ state: ProcessingState }>('/processing/resume');
    return data.state;
  },

  fetchProcessingState: async (): Promise<ProcessingState> => {
    return get<ProcessingState>('/processing/state');
  },

  updateSyncSettings: async (settings: {
    trackChats?: boolean;
    trackGroups?: boolean;
    trackAnnouncements?: boolean;
  }): Promise<ProcessingState> => {
    const data = await post<{ state: ProcessingState }>('/processing/sync-settings', settings);
    return data.state;
  },

  toggleDeepSync: async (jid: string, enabled: boolean): Promise<void> => {
    await post('/sync/deep', { jid, enabled });
  },

  purgeMessages: async (jid: string): Promise<void> => {
    await post('/conversations/purge', { jid });
  },

  bulkPurgeMessages: async (jids: string[]): Promise<void> => {
    await post('/conversations/bulk-delete-messages', { jids });
  },

  // ---------- Conversation Details & Stats ----------

  fetchConversationStats: async (jid: string): Promise<ConversationStats> => {
    return get<ConversationStats>(`/conversations/${encodeURIComponent(jid)}/stats`);
  },

  fetchMessages: async (jid: string, limit = 50, offset = 0): Promise<{ messages: Message[]; total: number }> => {
    return get<{ messages: Message[]; total: number }>(`/conversations/${encodeURIComponent(jid)}/messages?limit=${limit}&offset=${offset}`);
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
    return get<{ hasVendor: boolean; vendor?: { vendorId: string; vendorName: string; assignedAt?: string } }>(`/chats/${encodeURIComponent(jid)}/vendor`);
  },

  assignVendor: async (jid: string, vendorId: string, vendorName: string): Promise<void> => {
    await post(`/chats/${encodeURIComponent(jid)}/vendor`, { vendorId, vendorName, assignedBy: 'admin' });
  },

  removeVendor: async (jid: string): Promise<void> => {
    await del(`/chats/${encodeURIComponent(jid)}/vendor`);
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
  createdAt: string;
  updatedAt: string;
  lastMessageTimestamp: number | null;
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

