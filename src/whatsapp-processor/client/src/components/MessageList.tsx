import { useState, useEffect, useRef } from 'react';
import { makeStyles, tokens, Spinner, Avatar } from '@fluentui/react-components';
import { format } from 'date-fns';
import { fetchMessages, Message } from '../services/conversation.service';

const useStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 160px)',
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: tokens.shadow8,
        flex: 1,
    },
    header: {
        padding: '16px',
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground2,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    messageList: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: tokens.colorNeutralBackground3,
    },
    messageContainer: {
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '70%',
    },
    messageSent: {
        alignSelf: 'flex-end',
    },
    messageReceived: {
        alignSelf: 'flex-start',
    },
    messageBubble: {
        padding: '10px 14px',
        borderRadius: '12px',
        fontSize: '14px',
        lineHeight: '1.4',
        position: 'relative',
    },
    bubbleSent: {
        backgroundColor: tokens.colorBrandBackground,
        color: tokens.colorNeutralForegroundOnBrand,
        borderBottomRightRadius: '2px',
    },
    bubbleReceived: {
        backgroundColor: tokens.colorNeutralBackground1,
        color: tokens.colorNeutralForeground1,
        borderBottomLeftRadius: '2px',
        boxShadow: tokens.shadow2,
    },
    messageMeta: {
        fontSize: '11px',
        marginTop: '4px',
        color: tokens.colorNeutralForeground4,
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '4px',
    },
    mediaContent: {
        maxWidth: '100%',
        borderRadius: '8px',
        marginBottom: '4px',
        cursor: 'pointer',
    },
    mediaPlaceholder: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: '8px',
        color: tokens.colorNeutralForeground1,
        marginBottom: '4px',
    },
    senderName: {
        fontSize: '12px',
        fontWeight: 600,
        marginBottom: '2px',
        color: tokens.colorBrandForeground1,
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: tokens.colorNeutralForeground4,
    },
    loading: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    }
});

interface MessageListProps {
    jid?: string;
    chatName?: string;
}

export default function MessageList({ jid, chatName }: MessageListProps) {
    const styles = useStyles();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (jid) {
            loadMessages();
        } else {
            setMessages([]);
        }
    }, [jid]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const loadMessages = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchMessages(jid!);
            // Messages from API are DESC (latest first), we want ASC for chat view
            setMessages([...data.messages].reverse());
        } catch (err: any) {
            console.error('Failed to load messages:', err);
            setError('Failed to load messages');
        } finally {
            setLoading(false);
        }
    };

    if (!jid) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <div style={{ fontSize: '48px' }}>💬</div>
                    <p>Select a conversation to view messages</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Avatar name={chatName} size={32} />
                <div style={{ fontWeight: 600 }}>{chatName}</div>
            </div>

            <div className={styles.messageList} ref={scrollRef}>
                {loading && messages.length === 0 ? (
                    <div className={styles.loading}>
                        <Spinner label="Loading messages..." />
                    </div>
                ) : messages.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>No messages in this conversation</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.message_id}
                            className={`${styles.messageContainer} ${msg.is_from_me ? styles.messageSent : styles.messageReceived}`}
                        >
                            {!msg.is_from_me && msg.sender_jid && (
                                <div className={styles.senderName}>
                                    {msg.metadata?.pushName || msg.sender_jid.split('@')[0]}
                                </div>
                            )}
                            <div className={`${styles.messageBubble} ${msg.is_from_me ? styles.bubbleSent : styles.bubbleReceived}`}>
                                {msg.media_url && (
                                    msg.message_type === 'imageMessage' ? (
                                        <img
                                            src={msg.media_url}
                                            alt="Shared media"
                                            className={styles.mediaContent}
                                            onClick={() => window.open(msg.media_url!, '_blank')}
                                        />
                                    ) : (
                                        <div className={styles.mediaPlaceholder} onClick={() => window.open(msg.media_url!, '_blank')}>
                                            <span>📎</span>
                                            <span>{msg.message_type.replace('Message', '')}</span>
                                        </div>
                                    )
                                )}
                                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.message_text}</div>
                                <div className={styles.messageMeta}>
                                    {format(new Date(msg.timestamp * 1000), 'HH:mm')}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
