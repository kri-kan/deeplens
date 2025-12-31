export interface ConversationData {
    jid: string;
    name: string;
    is_group: boolean;
    is_announcement: boolean;
    is_community: boolean;
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

const API_BASE_URL = '/api';

/**
 * Fetch all conversations
 */
export async function fetchConversations(): Promise<ConversationData[]> {
    const response = await fetch(`${API_BASE_URL}/conversations`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
}

/**
 * Fetch individual chats only
 */
export async function fetchChats(): Promise<ConversationData[]> {
    const response = await fetch(`${API_BASE_URL}/conversations/chats`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
}

/**
 * Fetch groups only
 */
export async function fetchGroups(): Promise<ConversationData[]> {
    const response = await fetch(`${API_BASE_URL}/conversations/groups`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
}

/**
 * Fetch announcements only
 */
export async function fetchAnnouncements(): Promise<ConversationData[]> {
    const response = await fetch(`${API_BASE_URL}/conversations/announcements`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
}

/**
 * Fetch communities only
 */
export async function fetchCommunities(): Promise<ConversationData[]> {
    const response = await fetch(`${API_BASE_URL}/conversations/communities`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
}

/**
 * Fetch messages for a conversation
 */
export async function fetchMessages(
    jid: string,
    limit: number = 50,
    offset: number = 0
): Promise<{ messages: Message[]; total: number }> {
    const response = await fetch(
        `${API_BASE_URL}/conversations/${encodeURIComponent(jid)}/messages?limit=${limit}&offset=${offset}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
}

/**
 * Trigger history sync for a conversation
 */
export async function syncConversationHistory(
    jid: string,
    fullSync: boolean = false,
    limit: number = 50
): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/conversations/${encodeURIComponent(jid)}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullSync, limit })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/conversations/${encodeURIComponent(jid)}/sync-status`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
}

/**
 * Mark conversation as read
 */
export async function markAsRead(jid: string): Promise<void> {
    console.log('Mark as read (placeholder):', jid);
}
