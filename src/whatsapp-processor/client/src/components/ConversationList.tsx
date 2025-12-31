import { makeStyles, tokens, Avatar, Badge } from '@fluentui/react-components';
import { formatDistanceToNow } from 'date-fns';

const useStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 160px)',
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: tokens.shadow8,
    },
    conversationList: {
        flex: 1,
        overflowY: 'auto',
        backgroundColor: tokens.colorNeutralBackground2,
    },
    conversationItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        gap: '12px',
        cursor: 'pointer',
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        transition: 'background-color 0.2s',
        ':hover': {
            backgroundColor: tokens.colorNeutralBackground2Hover,
        },
    },
    conversationItemActive: {
        backgroundColor: tokens.colorNeutralBackground3,
    },
    avatarContainer: {
        position: 'relative',
    },
    conversationContent: {
        flex: 1,
        minWidth: 0,
    },
    conversationHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px',
    },
    conversationName: {
        fontWeight: 600,
        fontSize: '15px',
        color: tokens.colorNeutralForeground1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    conversationTime: {
        fontSize: '12px',
        color: tokens.colorNeutralForeground4,
        whiteSpace: 'nowrap',
    },
    conversationMessage: {
        fontSize: '14px',
        color: tokens.colorNeutralForeground3,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    unreadBadge: {
        minWidth: '20px',
        height: '20px',
        borderRadius: '10px',
        backgroundColor: tokens.colorBrandBackground,
        color: tokens.colorNeutralForegroundOnBrand,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 600,
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '16px',
        color: tokens.colorNeutralForeground4,
    },
    searchBox: {
        padding: '12px 16px',
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground1,
    },
    searchInput: {
        width: '100%',
        padding: '8px 12px',
        borderRadius: '8px',
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        backgroundColor: tokens.colorNeutralBackground2,
        color: tokens.colorNeutralForeground1,
        fontSize: '14px',
        '&:focus': {
            outline: 'none',
            // borderColor: tokens.colorBrandBackground,
        },
    },
});

export interface Conversation {
    id: string;
    name: string;
    avatar?: string;
    lastMessage: string;
    timestamp: Date;
    unreadCount: number;
    isGroup: boolean;
    isAnnouncement: boolean;
}

interface ConversationListProps {
    conversations: Conversation[];
    selectedId?: string;
    onSelect: (id: string) => void;
    emptyMessage?: string;
}

export default function ConversationList({
    conversations,
    selectedId,
    onSelect,
    emptyMessage = 'No conversations yet'
}: ConversationListProps) {
    const styles = useStyles();

    if (conversations.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <div style={{ fontSize: '48px' }}>💬</div>
                    <div style={{ fontSize: '16px', fontWeight: 500 }}>{emptyMessage}</div>
                    <div style={{ fontSize: '14px' }}>
                        Conversations will appear here when you receive messages
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.searchBox}>
                <input
                    type="text"
                    placeholder="Search conversations..."
                    className={styles.searchInput}
                />
            </div>

            <div className={styles.conversationList}>
                {conversations.map((conversation) => (
                    <div
                        key={conversation.id}
                        className={`${styles.conversationItem} ${selectedId === conversation.id ? styles.conversationItemActive : ''}`}
                        onClick={() => onSelect(conversation.id)}
                    >
                        <div className={styles.avatarContainer}>
                            <Avatar
                                name={conversation.name}
                                image={conversation.avatar ? { src: conversation.avatar } : undefined}
                                size={48}
                            />
                        </div>

                        <div className={styles.conversationContent}>
                            <div className={styles.conversationHeader}>
                                <div className={styles.conversationName}>
                                    {conversation.name}
                                </div>
                                <div className={styles.conversationTime}>
                                    {formatDistanceToNow(conversation.timestamp, { addSuffix: true })}
                                </div>
                            </div>
                            <div className={styles.conversationMessage}>
                                {conversation.lastMessage}
                            </div>
                        </div>

                        {conversation.unreadCount > 0 && (
                            <div className={styles.unreadBadge}>
                                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
