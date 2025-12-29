import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

export interface ConversationData {
    jid: string;
    name: string;
    is_group: boolean;
    is_announcement: boolean;
    unread_count: number;
    last_message_text: string;
    last_message_timestamp: number;
    last_message_from_me: boolean;
    is_pinned: boolean;
    is_archived: boolean;
    is_muted: boolean;
    message_count: number;
    is_fully_synced: boolean;
    sync_in_progress: boolean;
    total_messages_synced: number;
}

export interface Message {
    message_id: string;
    chat_jid: string;
    sender_jid: string;
    message_text: string;
    message_type: string;
    timestamp: number;
    is_from_me: boolean;
    media_url: string | null;
    metadata: any;
}

/**
 * Fetch all conversations with sync status
 */
export async function fetchConversations(): Promise<ConversationData[]> {
    const response = await axios.get(`${API_BASE_URL}/conversations`);
    return response.data;
}

/**
 * Fetch individual chats only
 */
export async function fetchChats(): Promise<ConversationData[]> {
    const response = await axios.get(`${API_BASE_URL}/conversations/chats`);
    return response.data;
}

/**
 * Fetch groups only
 */
export async function fetchGroups(): Promise<ConversationData[]> {
    const response = await axios.get(`${API_BASE_URL}/conversations/groups`);
    return response.data;
}

/**
 * Fetch announcements only
 */
export async function fetchAnnouncements(): Promise<ConversationData[]> {
    const response = await axios.get(`${API_BASE_URL}/conversations/announcements`);
    return response.data;
}

/**
 * Fetch messages for a conversation
 */
export async function fetchMessages(
    jid: string,
    limit: number = 50,
    offset: number = 0
): Promise<{ messages: Message[]; total: number }> {
    const response = await axios.get(`${API_BASE_URL}/conversations/${encodeURIComponent(jid)}/messages`, {
        params: { limit, offset }
    });
    return response.data;
}

/**
 * Trigger history sync for a conversation
 */
export async function syncConversationHistory(
    jid: string,
    fullSync: boolean = false,
    limit: number = 50
): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${API_BASE_URL}/conversations/${encodeURIComponent(jid)}/sync`, {
        fullSync,
        limit
    });
    return response.data;
}

/**
 * Get sync status for a conversation
 */
export async function getSyncStatus(jid: string): Promise<{
    jid: string;
    isFullySynced: boolean;
    syncInProgress: boolean;
    totalMessagesSynced: number;
}> {
    const response = await axios.get(`${API_BASE_URL}/conversations/${encodeURIComponent(jid)}/sync-status`);
    return response.data;
}

/**
 * Mark conversation as read (reset unread count)
 */
export async function markAsRead(jid: string): Promise<void> {
    // This will be implemented when we add the endpoint
    // For now, it's a placeholder
    console.log('Mark as read:', jid);
}
