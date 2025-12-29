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

export default function AnnouncementsPage() {
    const styles = useStyles();
    const [selectedId, setSelectedId] = useState<string>();

    // Mock data - replace with real data from API
    const conversations: Conversation[] = [
        {
            id: '1',
            name: 'Company Updates',
            lastMessage: '📢 New policy announcement',
            timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
            unreadCount: 3,
            isGroup: false,
            isAnnouncement: true,
        },
        {
            id: '2',
            name: 'Product Releases',
            lastMessage: '🚀 Version 2.0 is now live!',
            timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            unreadCount: 0,
            isGroup: false,
            isAnnouncement: true,
        },
        {
            id: '3',
            name: 'Team Announcements',
            lastMessage: 'Meeting rescheduled to 3 PM',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
            unreadCount: 1,
            isGroup: false,
            isAnnouncement: true,
        },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>📢 Announcements</h1>
                <p className={styles.subtitle}>
                    Broadcast channels • {conversations.length} subscribed
                </p>
            </div>

            <ConversationList
                conversations={conversations}
                selectedId={selectedId}
                onSelect={setSelectedId}
                emptyMessage="No announcement channels yet"
            />
        </div>
    );
}
