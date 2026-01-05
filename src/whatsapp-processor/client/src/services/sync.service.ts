const API_BASE = '/api';

export async function syncChatHistory(jid: string, count: number = 100): Promise<{
    success: boolean;
    messagesSynced: number;
    totalFetched: number;
    note?: string;
}> {
    const response = await fetch(`${API_BASE}/conversations/${encodeURIComponent(jid)}/sync-history?count=${count}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync chat history');
    }

    return response.json();
}

export async function toggleDeepSync(jid: string, enabled: boolean): Promise<{
    success: boolean;
    deep_sync_enabled: boolean;
}> {
    const response = await fetch(`${API_BASE}/conversations/${encodeURIComponent(jid)}/deep-sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle deep sync');
    }

    return response.json();
}
