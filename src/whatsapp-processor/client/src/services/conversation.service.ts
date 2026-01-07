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
    media_type: string | null;
    timestamp: number;
    is_from_me: boolean;
    media_url: string | null;
    metadata: any;
    group_id?: string;
}

const API_BASE_URL = '/api';

/**
 * Enhanced error handling for API calls
 * Extracts meaningful error messages from responses
 */
async function handleApiError(response: Response, context: string): Promise<never> {
    let errorMessage = `${context} failed`;
    let errorDetails = '';

    try {
        // Try to parse error response body
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            errorDetails = errorData.details || '';
        } else {
            const textError = await response.text();
            if (textError) {
                errorDetails = textError.substring(0, 200); // Limit length
            }
        }
    } catch (parseError) {
        // If we can't parse the error, use status text
        errorDetails = response.statusText;
    }

    // Create user-friendly error message
    const fullMessage = errorDetails
        ? `${errorMessage}: ${errorDetails}`
        : `${errorMessage} (Status: ${response.status})`;

    // Log for developers
    console.error('API Error:', {
        context,
        status: response.status,
        statusText: response.statusText,
        message: errorMessage,
        details: errorDetails,
        url: response.url
    });

    throw new Error(fullMessage);
}

/**
 * Fetch all conversations
 */
export async function fetchConversations(): Promise<ConversationData[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/conversations`);
        if (!response.ok) {
            await handleApiError(response, 'Loading conversations');
        }
        return response.json();
    } catch (error: any) {
        // Re-throw with context if not already handled
        if (!error.message.includes('Loading conversations')) {
            throw new Error(`Failed to load conversations: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Fetch individual chats only
 */
export async function fetchChats(): Promise<ConversationData[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/conversations/chats`);
        if (!response.ok) {
            await handleApiError(response, 'Loading chats');
        }
        return response.json();
    } catch (error: any) {
        if (!error.message.includes('Loading chats')) {
            throw new Error(`Failed to load chats: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Fetch groups only
 */
export async function fetchGroups(): Promise<ConversationData[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/conversations/groups`);
        if (!response.ok) {
            await handleApiError(response, 'Loading groups');
        }
        return response.json();
    } catch (error: any) {
        if (!error.message.includes('Loading groups')) {
            throw new Error(`Failed to load groups: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Fetch announcements only
 */
export async function fetchAnnouncements(): Promise<ConversationData[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/conversations/announcements`);
        if (!response.ok) {
            await handleApiError(response, 'Loading announcements');
        }
        return response.json();
    } catch (error: any) {
        if (!error.message.includes('Loading announcements')) {
            throw new Error(`Failed to load announcements: ${error.message}`);
        }
        throw error;
    }
}


/**
 * Fetch messages for a conversation
 */
export async function fetchMessages(
    jid: string,
    limit: number = 50,
    offset: number = 0
): Promise<{ messages: Message[]; total: number }> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/conversations/${encodeURIComponent(jid)}/messages?limit=${limit}&offset=${offset}`
        );
        if (!response.ok) {
            await handleApiError(response, 'Loading messages');
        }
        return response.json();
    } catch (error: any) {
        if (!error.message.includes('Loading messages')) {
            throw new Error(`Failed to load messages: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Trigger history sync for a conversation
 */
export async function syncConversationHistory(
    jid: string,
    fullSync: boolean = false,
    limit: number = 50
): Promise<{ success: boolean; message: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/conversations/${encodeURIComponent(jid)}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullSync, limit })
        });
        if (!response.ok) {
            await handleApiError(response, 'Syncing conversation history');
        }
        return response.json();
    } catch (error: any) {
        if (!error.message.includes('Syncing conversation')) {
            throw new Error(`Failed to sync conversation: ${error.message}`);
        }
        throw error;
    }
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
    try {
        const response = await fetch(`${API_BASE_URL}/conversations/${encodeURIComponent(jid)}/sync-status`);
        if (!response.ok) {
            await handleApiError(response, 'Checking sync status');
        }
        return response.json();
    } catch (error: any) {
        if (!error.message.includes('Checking sync status')) {
            throw new Error(`Failed to check sync status: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Mark conversation as read
 */
export async function markAsRead(jid: string): Promise<void> {
    console.log('Mark as read (placeholder):', jid);
}

/**
 * Exclude a chat from tracking
 */
export async function excludeChat(jid: string): Promise<void> {
    try {
        const response = await fetch(`${API_BASE_URL}/chats/exclude`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jid })
        });
        if (!response.ok) {
            await handleApiError(response, 'Excluding chat');
        }
    } catch (error: any) {
        if (!error.message.includes('Excluding chat')) {
            throw new Error(`Failed to exclude chat: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Purge all messages for a chat while preserving metadata
 */
export async function purgeMessages(jid: string): Promise<{
    success: boolean;
    messagesDeleted: number;
    mediaFilesReferenced: number;
}> {
    try {
        const response = await fetch(`${API_BASE_URL}/conversations/${encodeURIComponent(jid)}/messages`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            await handleApiError(response, 'Purging messages');
        }
        return response.json();
    } catch (error: any) {
        if (!error.message.includes('Purging messages')) {
            throw new Error(`Failed to purge messages: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Bulk purge all messages for multiple chats while preserving metadata
 */
export async function bulkPurgeMessages(jids: string[]): Promise<{
    success: boolean;
    chatsProcessed: number;
    totalMessagesDeleted: number;
    totalMediaFiles: number;
}> {
    try {
        const response = await fetch(`${API_BASE_URL}/conversations/bulk-delete-messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jids })
        });
        if (!response.ok) {
            await handleApiError(response, 'Bulk purging messages');
        }
        return response.json();
    } catch (error: any) {
        if (!error.message.includes('Bulk purging messages')) {
            throw new Error(`Failed to bulk purge messages: ${error.message}`);
        }
        throw error;
    }
}

export interface ConversationStats {
    jid: string;
    name: string;
    is_group: boolean;
    is_announcement: boolean;
    is_excluded: boolean;
    deep_sync_enabled: boolean;
    enable_message_grouping: boolean;
    created_at: string;
    updated_at: string;
    last_message_timestamp: number | null;
    messages: {
        total: number;
        sent: number;
        received: number;
        oldest_timestamp: number | null;
        newest_timestamp: number | null;
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

/**
 * Fetch detailed statistics for a conversation
 */
export async function fetchConversationStats(jid: string): Promise<ConversationStats> {
    try {
        const response = await fetch(`${API_BASE_URL}/conversations/${encodeURIComponent(jid)}/stats`);
        if (!response.ok) {
            await handleApiError(response, 'Fetching conversation stats');
        }
        return response.json();
    } catch (error: any) {
        if (!error.message.includes('Fetching conversation stats')) {
            throw new Error(`Failed to fetch conversation stats: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Toggle message grouping for a conversation
 */
export async function toggleMessageGrouping(jid: string, enabled: boolean, config?: any): Promise<void> {
    try {
        const response = await fetch(`/api/conversations/${encodeURIComponent(jid)}/message-grouping`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled, config })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    } catch (error: any) {
        if (!error.message.includes('Toggling message grouping')) {
            throw new Error(`Failed to toggle message grouping: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Split group at specific message
 */
export async function splitMessageGroup(jid: string, messageId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/conversations/${encodeURIComponent(jid)}/messages/${messageId}/split-group`, {
        method: 'POST'
    });
    if (!response.ok) {
        await handleApiError(response, 'Splitting group');
    }
}

/**
 * Move message to adjacent group
 */
export async function moveMessageGroup(jid: string, messageId: string, direction: 'prev' | 'next'): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/conversations/${encodeURIComponent(jid)}/messages/${messageId}/move-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction })
    });
    if (!response.ok) {
        await handleApiError(response, 'Moving message group');
    }
}
