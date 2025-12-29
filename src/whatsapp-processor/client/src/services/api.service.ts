export interface Group {
    id: string;
    subject: string;
    creation?: number;
    isExcluded: boolean;
}

export interface Chat {
    id: string;
    name: string;
    lastMessageTime?: number;
    isExcluded: boolean;
}

export type ConnectionStatus = 'disconnected' | 'scanning' | 'connected';

export interface ProcessingState {
    isPaused: boolean;
    pausedAt: number | null;
    resumedAt: number | null;
}

export interface StatusResponse {
    status: ConnectionStatus;
    qr?: string;
    tenant: string;
    hasSession: boolean;
    processingState: ProcessingState;
}

/**
 * Fetches the current connection status
 */
export async function fetchStatus(): Promise<StatusResponse> {
    const response = await fetch('/api/status');
    return response.json();
}

/**
 * Fetches all groups with their exclusion status
 */
export async function fetchGroups(): Promise<Group[]> {
    const response = await fetch('/api/groups');
    return response.json();
}

/**
 * Fetches all chats with their exclusion status
 */
export async function fetchChats(): Promise<Chat[]> {
    const response = await fetch('/api/chats');
    return response.json();
}

/**
 * Fetches all community announcement channels with their exclusion status
 */
export async function fetchAnnouncements(): Promise<Chat[]> {
    const response = await fetch('/api/announcements');
    return response.json();
}

/**
 * Excludes a chat from tracking
 */
export async function excludeChat(jid: string): Promise<void> {
    await fetch('/api/chats/exclude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid })
    });
}

/**
 * Includes a chat for tracking with resume mode
 */
export async function includeChat(jid: string, resumeMode: 'from_last' | 'from_now'): Promise<void> {
    await fetch('/api/chats/include', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid, resumeMode })
    });
}

/**
 * Pauses message processing
 */
export async function pauseProcessing(): Promise<ProcessingState> {
    const response = await fetch('/api/processing/pause', {
        method: 'POST'
    });
    const data = await response.json();
    return data.state;
}

/**
 * Resumes message processing
 */
export async function resumeProcessing(): Promise<ProcessingState> {
    const response = await fetch('/api/processing/resume', {
        method: 'POST'
    });
    const data = await response.json();
    return data.state;
}

/**
 * Gets the current processing state
 */
export async function fetchProcessingState(): Promise<ProcessingState> {
    const response = await fetch('/api/processing/state');
    return response.json();
}
