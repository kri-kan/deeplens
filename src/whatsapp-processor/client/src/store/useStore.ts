import { create } from 'zustand';

interface Chat {
    jid: string;
    name: string;
    is_group: boolean;
    is_announcement: boolean;
    unread_count: number;
    last_message_text: string | null;
    last_message_timestamp: string | null;
    is_pinned: boolean;
    is_archived: boolean;
}

interface Message {
    message_id: string;
    chat_jid: string;
    sender_jid: string;
    message_text: string;
    message_type: string;
    media_type: string | null;
    timestamp: number;
    is_from_me: boolean;
    media_url: string | null;
    group_id?: string;
}

interface WhatsAppStore {
    chats: Chat[];
    activeChatJid: string | null;
    messages: Message[];
    connectionStatus: string;
    qrCode: string | null;
    syncProgress: { progress: number; messagesCount: number } | null;
    processingState: {
        trackChats: boolean;
        trackGroups: boolean;
        trackAnnouncements: boolean;
        isPaused: boolean;
    } | null;

    setChats: (chats: Chat[]) => void;
    setActiveChatJid: (jid: string | null) => void;
    setMessages: (messages: Message[]) => void;
    addMessage: (message: Message) => void;
    setSyncProgress: (progress: { progress: number; messagesCount: number } | null) => void;
    setConnectionStatus: (status: string) => void;
    setQrCode: (qr: string | null) => void;
    setProcessingState: (state: WhatsAppStore['processingState']) => void;
}

export const useStore = create<WhatsAppStore>((set) => ({
    chats: [],
    activeChatJid: null,
    messages: [],
    connectionStatus: 'disconnected',
    qrCode: null,
    syncProgress: null,
    processingState: null,

    setChats: (chats) => set({ chats }),
    setActiveChatJid: (jid) => set({ activeChatJid: jid, messages: [] }),
    setMessages: (messages) => set({ messages }),
    addMessage: (message) => set((state) => ({
        messages: state.activeChatJid === message.chat_jid
            ? [...state.messages, message]
            : state.messages
    })),
    setSyncProgress: (syncProgress) => set({ syncProgress }),
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    setQrCode: (qr) => set({ qrCode: qr }),
    setProcessingState: (processingState) => set({ processingState }),
}));
