import { useState } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import ConversationList, { Conversation } from '../components/ConversationList';

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
});

export default function ChatsPage() {
    const styles = useStyles();
    const [selectedId, setSelectedId] = useState<string>();

    // Mock data - replace with real data from API
    const conversations: Conversation[] = [
        {
            id: '1',
            name: 'John Doe',
            lastMessage: 'Hey, how are you?',
            timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
            unreadCount: 2,
            isGroup: false,
            isAnnouncement: false,
        },
        {
            id: '2',
            name: 'Jane Smith',
            lastMessage: 'Thanks for the update!',
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            unreadCount: 0,
            isGroup: false,
            isAnnouncement: false,
        },
        {
            id: '3',
            name: 'Alice Johnson',
            lastMessage: 'See you tomorrow 👋',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            unreadCount: 1,
            isGroup: false,
            isAnnouncement: false,
        },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>💬 Chats</h1>
                <p className={styles.subtitle}>
                    Personal conversations • {conversations.length} active
                </p>
            </div>

            <ConversationList
                conversations={conversations}
                selectedId={selectedId}
                onSelect={setSelectedId}
                emptyMessage="No personal chats yet"
            />
        </div>
    );
}
