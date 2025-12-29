import { useState, useEffect } from 'react';
import { makeStyles, tokens, Spinner } from '@fluentui/react-components';
import ConversationList, { Conversation } from '../components/ConversationList';
import { fetchChats, ConversationData } from '../services/conversation.service';

const useStyles = makeStyles({
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
    },
    header: {
        marginBottom: '24px',
    },
    title: {
        fontSize: '28px',
        fontWeight: 600,
        color: tokens.colorNeutralForeground1,
        margin: '0 0 8px 0',
    },
    subtitle: {
        fontSize: '14px',
        color: tokens.colorNeutralForeground3,
        margin: 0,
    },
    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        flexDirection: 'column',
        gap: '16px',
    },
    error: {
        padding: '16px',
        backgroundColor: tokens.colorPaletteRedBackground2,
        color: tokens.colorPaletteRedForeground1,
        borderRadius: '8px',
        marginBottom: '16px',
    },
});

export default function ChatsPage() {
    const styles = useStyles();
    const [selectedId, setSelectedId] = useState<string>();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadChats();
    }, []);

    const loadChats = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchChats();

            // Convert API data to Conversation format
            const converted: Conversation[] = data.map((chat: ConversationData) => ({
                id: chat.jid,
                name: chat.name,
                lastMessage: chat.last_message_text || 'No messages yet',
                timestamp: chat.last_message_timestamp
                    ? new Date(chat.last_message_timestamp * 1000)
                    : new Date(),
                unreadCount: chat.unread_count || 0,
                isGroup: false,
                isAnnouncement: false,
            }));

            setConversations(converted);
        } catch (err: any) {
            console.error('Failed to load chats:', err);
            setError(err.message || 'Failed to load chats');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <Spinner size="large" label="Loading chats..." />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>💬 Chats</h1>
                <p className={styles.subtitle}>
                    Personal conversations • {conversations.length} active
                </p>
            </div>

            {error && (
                <div className={styles.error}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            <ConversationList
                conversations={conversations}
                selectedId={selectedId}
                onSelect={setSelectedId}
                emptyMessage="No personal chats yet"
            />
        </div>
    );
}
