import { makeStyles, tokens, Avatar } from '@fluentui/react-components';
import { Pin16Regular } from '@fluentui/react-icons';
import { formatDistanceToNow } from 'date-fns';
import { FixedSizeList as List } from 'react-window';
import { useStore } from '../store/useStore';

const useStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: tokens.colorNeutralBackground1,
        borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    searchBox: {
        padding: '12px 16px',
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
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
        },
    },
    conversationItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        gap: '12px',
        cursor: 'pointer',
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        transition: 'background-color 0.2s',
        boxSizing: 'border-box',
        ':hover': {
            backgroundColor: tokens.colorNeutralBackground2Hover,
        },
    },
    conversationItemActive: {
        backgroundColor: tokens.colorNeutralBackground3,
    },
    conversationContent: {
        flex: 1,
        minWidth: 0,
    },
    conversationHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2px',
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
        fontSize: '11px',
        color: tokens.colorNeutralForeground4,
        whiteSpace: 'nowrap',
    },
    conversationMessage: {
        fontSize: '13px',
        color: tokens.colorNeutralForeground3,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    unreadBadge: {
        minWidth: '18px',
        height: '18px',
        borderRadius: '9px',
        backgroundColor: tokens.colorBrandBackground,
        color: tokens.colorNeutralForegroundOnBrand,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 600,
    },
    pinIcon: {
        color: tokens.colorNeutralForeground4,
        marginLeft: '4px',
    }
});

export default function ConversationList() {
    const styles = useStyles();
    const { chats, activeChatJid, setActiveChatJid } = useStore();

    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const chat = chats[index];
        const isActive = activeChatJid === chat.jid;
        const rawTs = parseInt(chat.last_message_timestamp || '');
        const timestamp = (!isNaN(rawTs) && rawTs > 0) ? new Date(rawTs * 1000) : null;

        return (
            <div
                style={style}
                className={`${styles.conversationItem} ${isActive ? styles.conversationItemActive : ''}`}
                onClick={() => setActiveChatJid(chat.jid)}
            >
                <Avatar name={chat.name} size={48} />
                <div className={styles.conversationContent}>
                    <div className={styles.conversationHeader}>
                        <div className={styles.conversationName}>
                            {chat.name}
                            {chat.is_pinned && <div className={styles.pinIcon} title="Pinned">📌</div>}
                        </div>
                        {timestamp && (
                            <div className={styles.conversationTime}>
                                {formatDistanceToNow(timestamp, { addSuffix: false })}
                            </div>
                        )}
                    </div>
                    <div className={styles.conversationMessage}>
                        {chat.last_message_text || (chat.is_group ? 'Group chat' : 'No messages')}
                    </div>
                </div>
                {chat.unread_count > 0 && (
                    <div className={styles.unreadBadge}>
                        {chat.unread_count > 99 ? '99+' : chat.unread_count}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.searchBox}>
                <input
                    type="text"
                    placeholder="Search chats..."
                    className={styles.searchInput}
                />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
                <List
                    height={800} // This should ideally be dynamic
                    itemCount={chats.length}
                    itemSize={72}
                    width="100%"
                >
                    {Row}
                </List>
            </div>
        </div>
    );
}
