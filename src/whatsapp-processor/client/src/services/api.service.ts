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
    trackChats: boolean;
    trackGroups: boolean;
    trackAnnouncements: boolean;
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

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
}

/**
 * Fetches groups with their exclusion status, supports pagination
 */
export async function fetchGroups(limit = 100, offset = 0, search?: string, excluded?: boolean): Promise<PaginatedResponse<Group>> {
    const url = new URL('/api/groups', window.location.origin);
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', offset.toString());
    if (search) url.searchParams.set('search', search);
    if (excluded !== undefined) url.searchParams.set('excluded', excluded.toString());

    const response = await fetch(url.toString());
    return response.json();
}

/**
 * Fetches chats with their exclusion status, supports pagination
 */
export async function fetchChats(limit = 100, offset = 0, search?: string, excluded?: boolean): Promise<PaginatedResponse<Chat>> {
    const url = new URL('/api/chats', window.location.origin);
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', offset.toString());
    if (search) url.searchParams.set('search', search);
    if (excluded !== undefined) url.searchParams.set('excluded', excluded.toString());

    const response = await fetch(url.toString());
    return response.json();
}

/**
 * Fetches community announcement channels with their exclusion status, supports pagination
 */
export async function fetchAnnouncements(limit = 100, offset = 0, search?: string, excluded?: boolean): Promise<PaginatedResponse<Chat>> {
    const url = new URL('/api/announcements', window.location.origin);
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', offset.toString());
    if (search) url.searchParams.set('search', search);
    if (excluded !== undefined) url.searchParams.set('excluded', excluded.toString());

    const response = await fetch(url.toString());
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
 * Bulk excludes chats from tracking
 */
export async function bulkExcludeChats(jids: string[]): Promise<void> {
    await fetch('/api/chats/bulk-exclude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jids })
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

/**
 * Updates sync settings
 */
export async function updateSyncSettings(settings: {
    trackChats?: boolean;
    trackGroups?: boolean;
    trackAnnouncements?: boolean;
}): Promise<ProcessingState> {
    const response = await fetch('/api/processing/sync-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    });
    const data = await response.json();
    return data.state;
}
