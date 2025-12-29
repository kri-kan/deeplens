import { useState, useEffect } from 'react';
import { makeStyles, tokens, Spinner } from '@fluentui/react-components';
import ConversationList, { Conversation } from '../components/ConversationList';
import { fetchGroups, ConversationData } from '../services/conversation.service';

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

export default function GroupsPage() {
    const styles = useStyles();
    const [selectedId, setSelectedId] = useState<string>();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchGroups();

            // Convert API data to Conversation format
            const converted: Conversation[] = data.map((group: ConversationData) => ({
                id: group.jid,
                name: group.name,
                lastMessage: group.last_message_text || 'No messages yet',
                timestamp: group.last_message_timestamp
                    ? new Date(group.last_message_timestamp * 1000)
                    : new Date(),
                unreadCount: group.unread_count || 0,
                isGroup: true,
                isAnnouncement: false,
            }));

            setConversations(converted);
        } catch (err: any) {
            console.error('Failed to load groups:', err);
            setError(err.message || 'Failed to load groups');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <Spinner size="large" label="Loading groups..." />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>👥 Groups</h1>
                <p className={styles.subtitle}>
                    Group conversations • {conversations.length} active
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
                emptyMessage="No group conversations yet"
            />
        </div>
    );
}
