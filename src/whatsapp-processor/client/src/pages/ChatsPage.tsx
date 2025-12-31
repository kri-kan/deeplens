import { useState, useEffect } from 'react';
import { makeStyles, tokens, Spinner } from '@fluentui/react-components';
import ConversationList, { Conversation } from '../components/ConversationList';
import MessageList from '../components/MessageList';
import { fetchChats, ConversationData } from '../services/conversation.service';

const useStyles = makeStyles({
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
        height: '100%',
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
    splitPane: {
        display: 'flex',
        gap: '24px',
        height: 'calc(100vh - 240px)',
    },
    listPane: {
        width: '400px',
        minWidth: '400px',
    },
    detailsPane: {
        flex: 1,
        display: 'flex',
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
    const [selectedConversation, setSelectedConversation] = useState<Conversation>();
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

    const handleSelect = (id: string) => {
        const conversation = conversations.find(c => c.id === id);
        setSelectedConversation(conversation);
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

            <div className={styles.splitPane}>
                <div className={styles.listPane}>
                    <ConversationList
                        conversations={conversations}
                        selectedId={selectedConversation?.id}
                        onSelect={handleSelect}
                        emptyMessage="No personal chats yet"
                    />
                </div>
                <div className={styles.detailsPane}>
                    <MessageList
                        jid={selectedConversation?.id}
                        chatName={selectedConversation?.name}
                    />
                </div>
            </div>
        </div>
    );
}
