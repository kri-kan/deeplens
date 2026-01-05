import { useState, useEffect } from 'react';
import { makeStyles, tokens, Spinner } from '@fluentui/react-components';
import ConversationList from '../components/ConversationList';
import MessageList from '../components/MessageList';
import { fetchGroups } from '../services/conversation.service';
import { useStore } from '../store/useStore';

const useStyles = makeStyles({
    container: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
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
        gap: '0px',
        height: '100%',
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
    }
});

export default function GroupsPage() {
    const styles = useStyles();
    const { chats, setChats, activeChatJid } = useStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            setLoading(true);
            const data = await fetchGroups();

            // Map to store format
            const mappedChats = data.map(chat => ({
                jid: chat.jid,
                name: chat.name,
                is_group: chat.is_group,
                is_announcement: chat.is_announcement,
                unread_count: chat.unread_count,
                last_message_text: chat.last_message_text,
                last_message_timestamp: chat.last_message_timestamp?.toString() || null,
                is_pinned: chat.is_pinned,
                is_archived: chat.is_archived
            }));

            setChats(mappedChats);
        } catch (err) {
            console.error('Failed to load groups:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && chats.length === 0) {
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
            <div className={styles.splitPane}>
                <div className={styles.listPane}>
                    <ConversationList />
                </div>
                <div className={styles.detailsPane}>
                    <MessageList />
                </div>
            </div>
        </div>
    );
}

