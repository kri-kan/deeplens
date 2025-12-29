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

export default function GroupsPage() {
    const styles = useStyles();
    const [selectedId, setSelectedId] = useState<string>();

    // Mock data - replace with real data from API
    const conversations: Conversation[] = [
        {
            id: '1',
            name: 'Project Team',
            lastMessage: 'Sarah: Let\'s schedule a meeting',
            timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
            unreadCount: 5,
            isGroup: true,
            isAnnouncement: false,
        },
        {
            id: '2',
            name: 'Family Group',
            lastMessage: 'Mom: Dinner at 7 PM tonight',
            timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
            unreadCount: 0,
            isGroup: true,
            isAnnouncement: false,
        },
        {
            id: '3',
            name: 'Friends Forever',
            lastMessage: 'Mike: Who\'s up for the game?',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
            unreadCount: 12,
            isGroup: true,
            isAnnouncement: false,
        },
        {
            id: '4',
            name: 'Study Group',
            lastMessage: 'Emma: Check out this resource',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            unreadCount: 0,
            isGroup: true,
            isAnnouncement: false,
        },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>👥 Groups</h1>
                <p className={styles.subtitle}>
                    Group conversations • {conversations.length} active
                </p>
            </div>

            <ConversationList
                conversations={conversations}
                selectedId={selectedId}
                onSelect={setSelectedId}
                emptyMessage="No group conversations yet"
            />
        </div>
    );
}
