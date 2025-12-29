import { useState, useEffect } from 'react';
import { makeStyles, tokens, Spinner } from '@fluentui/react-components';
import ConversationList, { Conversation } from '../components/ConversationList';
import { fetchAnnouncements, ConversationData } from '../services/conversation.service';

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

export default function AnnouncementsPage() {
    const styles = useStyles();
    const [selectedId, setSelectedId] = useState<string>();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchAnnouncements();

            // Convert API data to Conversation format
            const converted: Conversation[] = data.map((announcement: ConversationData) => ({
                id: announcement.jid,
                name: announcement.name,
                lastMessage: announcement.last_message_text || 'No messages yet',
                timestamp: announcement.last_message_timestamp
                    ? new Date(announcement.last_message_timestamp * 1000)
                    : new Date(),
                unreadCount: announcement.unread_count || 0,
                isGroup: false,
                isAnnouncement: true,
            }));

            setConversations(converted);
        } catch (err: any) {
            console.error('Failed to load announcements:', err);
            setError(err.message || 'Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <Spinner size="large" label="Loading announcements..." />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>📢 Announcements</h1>
                <p className={styles.subtitle}>
                    Broadcast channels • {conversations.length} subscribed
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
                emptyMessage="No announcement channels yet"
            />
        </div>
    );
}
