import { useEffect, useState } from 'react';
import { getSocket } from '../services/socket.service';
import { fetchStatus, fetchGroups, fetchChats, ConnectionStatus, Group, Chat, ProcessingState } from '../services/api.service';

/**
 * Custom hook for managing WhatsApp connection state
 */
export function useWhatsAppConnection() {
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [tenantName, setTenantName] = useState<string>('');
    const [hasSession, setHasSession] = useState<boolean>(false);
    const [processingState, setProcessingState] = useState<ProcessingState>({
        isPaused: false,
        pausedAt: null,
        resumedAt: null
    });

    useEffect(() => {
        const socket = getSocket();

        // Listen for status updates
        socket.on('status', (data: { status: ConnectionStatus; qr?: string }) => {
            setStatus(data.status);
            if (data.status === 'scanning' && data.qr) {
                setQrCode(data.qr);
            } else if (data.status === 'connected') {
                setQrCode(null);
                setHasSession(true);
            }
        });

        // Fetch initial status
        fetchStatus().then(data => {
            setStatus(data.status);
            setTenantName(data.tenant || '');
            setHasSession(data.hasSession);
            setProcessingState(data.processingState);
            if (data.qr) setQrCode(data.qr);
        });

        return () => {
            socket.off('status');
        };
    }, []);

    return { status, qrCode, tenantName, hasSession, processingState };
}

/**
 * Custom hook for managing groups
 */
export function useGroups(status: ConnectionStatus) {
    const [groups, setGroups] = useState<Group[]>([]);

    useEffect(() => {
        if (status === 'connected') {
            loadGroups();
        }
    }, [status]);

    const loadGroups = async () => {
        try {
            const data = await fetchGroups();
            setGroups(data);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
        }
    };

    return { groups, setGroups, refreshGroups: loadGroups };
}

/**
 * Custom hook for managing chats
 */
export function useChats(status: ConnectionStatus) {
    const [chats, setChats] = useState<Chat[]>([]);

    useEffect(() => {
        if (status === 'connected') {
            loadChats();
        }
    }, [status]);

    const loadChats = async () => {
        try {
            const data = await fetchChats();
            setChats(data);
        } catch (error) {
            console.error('Failed to fetch chats:', error);
        }
    };

    return { chats, setChats, refreshChats: loadChats };
}
