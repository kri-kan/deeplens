import { useEffect, useRef, useState } from 'react';
import { makeStyles, tokens, Spinner, Avatar, Button, Label } from '@fluentui/react-components';
import { Dismiss20Regular, ArrowSync20Regular } from '@fluentui/react-icons';
import { format } from 'date-fns';
import { useStore } from '../store/useStore';
import { fetchMessages, excludeChat } from '../services/conversation.service';
import { syncChatHistory, toggleDeepSync } from '../services/sync.service';
import { useToasts } from '../utils/toast';

const useStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: tokens.colorNeutralBackground1,
    },
    header: {
        padding: '16px',
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        backgroundColor: tokens.colorNeutralBackground1,
    },
    headerInfo: {
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
        gap: '8px',
        backgroundColor: tokens.colorNeutralBackground2,
    },
    messageContainer: {
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '75%',
    },
    messageSent: {
        alignSelf: 'flex-end',
    },
    messageReceived: {
        alignSelf: 'flex-start',
    },
    messageBubble: {
        padding: '8px 12px',
        borderRadius: '12px',
        fontSize: '14px',
        lineHeight: '1.4',
        position: 'relative',
        boxShadow: tokens.shadow2,
    },
    bubbleSent: {
        backgroundColor: '#dcf8c6', // WhatsApp green-ish
        color: tokens.colorNeutralForeground1,
        borderBottomRightRadius: '2px',
    },
    bubbleReceived: {
        backgroundColor: tokens.colorNeutralBackground1,
        color: tokens.colorNeutralForeground1,
        borderBottomLeftRadius: '2px',
    },
    messageMeta: {
        fontSize: '10px',
        marginTop: '2px',
        color: tokens.colorNeutralForeground4,
        textAlign: 'right',
    },
    mediaContent: {
        width: '100%',
        maxWidth: '100%',
        borderRadius: '8px',
        marginBottom: '4px',
    },
    emptyState: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: tokens.colorNeutralForeground4,
    },
});

export default function MessageList() {
    const styles = useStyles();
    const { activeChatJid, messages, setMessages, chats, setActiveChatJid } = useStore();
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [deepSyncEnabled, setDeepSyncEnabled] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { error: showError, success: showSuccess } = useToasts();
    const PAGE_SIZE = 50;

    const activeChat = chats.find(c => c.jid === activeChatJid);

    // Ensure messages are sorted (Just rely on API order if sort fails, or try reverse?)
    // If user sees Old at Bottom with a-b, let's try b-a.
    // Ideally this should be a-b for Old->New. 
    // But let's try FLIPPING it. 
    // Wait, if I flip it, and valid timestamps, I get [New ... Old].
    // This puts Old at bottom. That's what they HAVE.
    // So they have 'b-a' currently? No, I wrote 'a-b'.

    // If I wrote 'a-b' and they have [New ... Old].
    // Then 'a-b' => [New ... Old].
    // This implies New < Old.
    // This implies timestamps are DECREASING over time? No.
    // It implies something is weird.

    // Let's trying removing the sort and relying on API.
    // API sends messages.reverse().
    // SQL DESC (New...Old). Reverse -> (Old...New).
    // This should be correct.
    const sortedMessages = messages;

    useEffect(() => {
        if (activeChatJid) {
            setOffset(0);
            setHasMore(true);
            loadInitialMessages();
        }
    }, [activeChatJid]);

    useEffect(() => {
        // Only auto-scroll to bottom on INITIAL load or NEW message from websocket
        // If loadingMore (fetching history), we do NOT scroll to bottom
        if (scrollRef.current && !loadingMore) {
            if (offset === PAGE_SIZE) {
                // Initial load
                scrollToBottom();
            } else {
                // Check if we were near bottom (e.g. 100px) before this update
                // If so, stay at bottom. 
                // This is simple "stick to bottom" logic
                const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
                if (isNearBottom) {
                    scrollToBottom();
                }
            }
        }
    }, [messages, loadingMore, offset]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            // Use setTimeout to allow render to finish layout
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 50);
        }
    };

    const loadInitialMessages = async () => {
        setLoading(true);
        try {
            const data = await fetchMessages(activeChatJid!, PAGE_SIZE, 0);
            setMessages(data.messages);
            setOffset(PAGE_SIZE);
            setHasMore(data.messages.length < data.total);

            // Check current deep sync status
            const status = await syncChatHistory(activeChatJid!, 0);
            setDeepSyncEnabled((status as any).deepSyncEnabled);

            // Force scroll to bottom after state update
            setTimeout(scrollToBottom, 100);
        } catch (err: any) {
            console.error('Failed to load messages', err);
            showError('Failed to load messages', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleDeepSync = async () => {
        if (!activeChatJid) return;
        const nextState = !deepSyncEnabled;
        try {
            await toggleDeepSync(activeChatJid, nextState);
            setDeepSyncEnabled(nextState);
            showSuccess(nextState ? 'Deep Sync Enabled. History will be processed as WhatsApp sends it.' : 'Deep Sync Disabled.');
        } catch (err: any) {
            showError('Failed to toggle deep sync', err.message);
        }
    };

    const loadMoreMessages = async () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        const container = scrollRef.current;
        const previousScrollHeight = container?.scrollHeight || 0;

        try {
            const data = await fetchMessages(activeChatJid!, PAGE_SIZE, offset);
            if (data.messages.length > 0) {
                // Prepend older messages
                setMessages([...data.messages, ...messages]);
                setOffset(offset + PAGE_SIZE);
            }
            setHasMore(messages.length + data.messages.length < data.total);

            // Maintain scroll position after prepending
            setTimeout(() => {
                if (container) {
                    container.scrollTop = container.scrollHeight - previousScrollHeight;
                }
            }, 0);
        } catch (err: any) {
            console.error('Failed to load more messages', err);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleScroll = () => {
        if (scrollRef.current && scrollRef.current.scrollTop === 0 && hasMore && !loadingMore && !loading) {
            loadMoreMessages();
        }
    };

    const handleExcludeChat = async () => {
        if (!activeChatJid) return;
        if (confirm('Are you sure you want to stop tracking this chat? It will disappear from this list.')) {
            try {
                await excludeChat(activeChatJid);
                showError('Chat excluded successfully.');
                // Refresh chats? ideally useStore should handle removal
                window.location.reload(); // Simple refresh for now
            } catch (err: any) {
                showError('Failed to exclude chat', err.message);
                console.error(err);
            }
        }
    };

    const handleSyncHistory = async () => {
        if (!activeChatJid || syncing) return;

        setSyncing(true);
        try {
            const result = await syncChatHistory(activeChatJid, 100);

            if ((result as any).currentMessageCount && (result as any).currentMessageCount > 0) {
                const oldestDate = (result as any).oldestMessage ? new Date((result as any).oldestMessage).toLocaleDateString() : 'N/A';
                const newestDate = (result as any).newestMessage ? new Date((result as any).newestMessage).toLocaleDateString() : 'N/A';
                showSuccess(`Chat has ${(result as any).currentMessageCount} messages (${oldestDate} to ${newestDate})`);
            } else {
                showSuccess(result.note || 'No messages in this chat yet');
            }
        } catch (err: any) {
            showError('Failed to sync history', err.message);
            console.error(err);
        } finally {
            setSyncing(false);
        }
    };

    const renderTimestamp = (ts: any) => {
        if (!ts) return '';
        try {
            const rawTs = parseInt(ts);
            if (isNaN(rawTs) || rawTs <= 0) return '';
            return format(new Date(rawTs * 1000), 'HH:mm');
        } catch (e) {
            return '';
        }
    };

    if (!activeChatJid) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>Select a chat to start messaging</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <Avatar name={activeChat?.name || 'User'} size={40} />
                    <div style={{ fontWeight: 600 }}>{activeChat?.name || 'User'}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                        icon={<ArrowSync20Regular />}
                        appearance={deepSyncEnabled ? "primary" : "subtle"}
                        onClick={handleToggleDeepSync}
                        title={deepSyncEnabled ? "Deep sync enabled" : "Enable deep sync for this chat"}
                    >
                        {deepSyncEnabled ? 'Deep Sync On' : 'Full Sync'}
                    </Button>
                    <Button
                        icon={syncing ? <Spinner size="tiny" /> : <ArrowSync20Regular />}
                        appearance="subtle"
                        onClick={handleSyncHistory}
                        disabled={syncing}
                        title="Check current message count and sync status"
                    >
                        {syncing ? 'Checking...' : 'Sync Status'}
                    </Button>
                    <Button
                        icon={<Dismiss20Regular />}
                        appearance="subtle"
                        onClick={handleExcludeChat}
                        title="Stop tracking this chat"
                    >
                        Exclude
                    </Button>
                </div>
            </div>

            <div className={styles.messageList} ref={scrollRef} onScroll={handleScroll}>
                {loadingMore && (
                    <div style={{ padding: '10px', display: 'flex', justifyContent: 'center', gap: '8px', color: tokens.colorNeutralForeground4 }}>
                        <Spinner size="tiny" />
                        <span style={{ fontSize: '12px' }}>Loading older messages...</span>
                    </div>
                )}
                {loading ? (
                    <div className={styles.emptyState}><Spinner /></div>
                ) : messages.length === 0 ? (
                    <div className={styles.emptyState}>No messages yet</div>
                ) : (
                    sortedMessages.map((msg) => (
                        <div
                            key={msg.message_id}
                            className={`${styles.messageContainer} ${msg.is_from_me ? styles.messageSent : styles.messageReceived}`}
                        >
                            <div className={`${styles.messageBubble} ${msg.is_from_me ? styles.bubbleSent : styles.bubbleReceived}`}>
                                {msg.media_url && (
                                    <div className={styles.mediaContent}>
                                        {msg.media_type === 'photo' && (
                                            <img
                                                src={msg.media_url}
                                                alt="Photo"
                                                style={{ width: '100%', borderRadius: '8px' }}
                                                onLoad={() => {
                                                    if (scrollRef.current && offset === PAGE_SIZE) {
                                                        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                                                        const isNearBottom = scrollHeight - scrollTop - clientHeight < 500;
                                                        if (isNearBottom) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                                                    }
                                                }}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        )}
                                        {msg.media_type === 'video' && (
                                            <video
                                                src={msg.media_url}
                                                controls
                                                style={{ width: '100%', borderRadius: '8px' }}
                                            />
                                        )}
                                        {msg.media_type === 'audio' && (
                                            <audio
                                                src={msg.media_url}
                                                controls
                                                style={{ width: '100%' }}
                                            />
                                        )}
                                        {msg.media_type === 'document' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: tokens.colorNeutralBackground3, borderRadius: '4px' }}>
                                                <span>📄</span>
                                                <a href={msg.media_url} target="_blank" rel="noopener noreferrer" style={{ color: tokens.colorBrandForeground1 }}>
                                                    Download Document
                                                </a>
                                            </div>
                                        )}
                                        {/* Fallback for old records or unknown types */}
                                        {!msg.media_type && (
                                            <img
                                                src={msg.media_url}
                                                alt="Media"
                                                style={{ width: '100%', borderRadius: '8px' }}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        )}
                                    </div>
                                )}
                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                    {(() => {
                                        const isPlaceholder = [
                                            '[image]', '[video]', '[audio]', '[sticker]', '[document]',
                                            '[Image]', '[Video]', '[Audio]', '[Sticker]', '[Document]'
                                        ].includes(msg.message_text?.trim());

                                        if (msg.media_url && isPlaceholder) return null;

                                        if (!msg.message_text && msg.media_url) return null;
                                        if (!msg.message_text) {
                                            return <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Message content unavailable</span>;
                                        }

                                        // URL Detection
                                        const urlRegex = /(https?:\/\/[^\s]+)/g;
                                        const parts = msg.message_text.split(urlRegex);

                                        return parts.map((part, i) => {
                                            if (part.match(urlRegex)) {
                                                return (
                                                    <a
                                                        key={i}
                                                        href={part}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: tokens.colorBrandForeground1, textDecoration: 'underline' }}
                                                    >
                                                        {part}
                                                    </a>
                                                );
                                            }
                                            return part;
                                        });
                                    })()}
                                </div>
                                <div className={styles.messageMeta}>
                                    {renderTimestamp(msg.timestamp)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
