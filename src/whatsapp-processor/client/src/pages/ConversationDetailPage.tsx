import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    makeStyles, tokens, Button, Spinner,
    Dialog, DialogTrigger, DialogSurface, DialogTitle, DialogBody, DialogActions, DialogContent,
    Label, Input, Select, Badge
} from '@fluentui/react-components';
import { ArrowLeft24Regular, ArrowSync24Regular, Image24Regular, Video24Regular, MusicNote224Regular, Document24Regular, Emoji24Regular } from '@fluentui/react-icons';
import { fetchConversationStats, ConversationStats, purgeMessages, toggleMessageGrouping, fetchMessages, Message } from '../services/conversation.service';
import { format } from 'date-fns';

const useStyles = makeStyles({
    container: {
        height: '100%',
        overflowY: 'auto',
        padding: '24px',
        backgroundColor: tokens.colorNeutralBackground2,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        padding: '16px 24px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: '8px',
        boxShadow: tokens.shadow4,
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    title: {
        fontSize: '24px',
        fontWeight: 600,
        color: tokens.colorNeutralForeground1,
        margin: 0,
    },
    subtitle: {
        fontSize: '14px',
        color: tokens.colorNeutralForeground3,
        margin: '4px 0 0 0',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
    },
    statCard: {
        padding: '20px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: '8px',
        boxShadow: tokens.shadow2,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    statHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statTitle: {
        fontSize: '14px',
        fontWeight: 600,
        color: tokens.colorNeutralForeground3,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    statValue: {
        fontSize: '32px',
        fontWeight: 700,
        color: tokens.colorBrandForeground1,
    },
    statDetails: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    statRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px',
        color: tokens.colorNeutralForeground2,
    },
    mediaGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
    },
    mediaCard: {
        padding: '8px 12px',
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex: '1 1 auto',
        minWidth: '90px',
    },
    mediaIcon: {
        fontSize: '20px',
        color: tokens.colorBrandForeground1,
    },
    mediaCount: {
        fontSize: '16px',
        fontWeight: 600,
        color: tokens.colorNeutralForeground1,
    },
    mediaLabel: {
        fontSize: '11px',
        color: tokens.colorNeutralForeground3,
        whiteSpace: 'nowrap',
    },
    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '16px',
    },
    badge: {
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
    },
    badgeExcluded: {
        backgroundColor: tokens.colorPaletteRedBackground2,
        color: tokens.colorPaletteRedForeground1,
    },
    badgeActive: {
        backgroundColor: tokens.colorPaletteGreenBackground2,
        color: tokens.colorPaletteGreenForeground1,
    },
    badgeInactive: {
        backgroundColor: tokens.colorNeutralBackground3,
        color: tokens.colorNeutralForeground3,
    },
});

export default function ConversationDetailPage() {
    const { jid } = useParams<{ jid: string }>();
    const navigate = useNavigate();
    const styles = useStyles();
    const [stats, setStats] = useState<ConversationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Grouping Config State
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
    const [configStrategy, setConfigStrategy] = useState('sticker');
    const [configTimeGap, setConfigTimeGap] = useState('300');
    const [previewMessages, setPreviewMessages] = useState<Message[]>([]);
    const [previewCount, setPreviewCount] = useState(50);

    useEffect(() => {
        if (jid) {
            loadStats();
        }
    }, [jid]);

    useEffect(() => {
        if (isConfigDialogOpen && jid) {
            fetchMessages(decodeURIComponent(jid), previewCount, 0).then(data => {
                setPreviewMessages(data.messages.reverse());
            }).catch(console.error);
        }
    }, [isConfigDialogOpen, jid, previewCount]);

    const loadStats = async () => {
        if (!jid) return;

        setRefreshing(true);
        try {
            const data = await fetchConversationStats(decodeURIComponent(jid));
            setStats(data);
        } catch (err) {
            console.error('Failed to load conversation stats:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const formatTimestamp = (ts: number | null) => {
        if (!ts) return 'N/A';
        try {
            return format(new Date(ts * 1000), 'MMM d, yyyy HH:mm');
        } catch {
            return 'Invalid date';
        }
    };

    const handleToggleGrouping = async () => {
        if (!stats) return;

        if (!stats.enable_message_grouping) {
            // Enable flow -> Open Dialog
            setIsConfigDialogOpen(true);
        } else {
            // Disable flow -> Disable immediately
            try {
                await toggleMessageGrouping(stats.jid, false);
                await loadStats();
            } catch (err) {
                console.error('Failed to disable message grouping:', err);
            }
        }
    };

    const handleConfirmEnable = async () => {
        if (!stats) return;

        const config = {
            strategy: configStrategy,
            timeGapSeconds: configStrategy === 'time_gap' ? parseInt(configTimeGap) : undefined
        };

        try {
            await toggleMessageGrouping(stats.jid, true, config);
            setIsConfigDialogOpen(false);
            await loadStats();
        } catch (err) {
            console.error('Failed to enable message grouping:', err);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <Spinner size="large" label="Loading conversation details..." />
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <p>Conversation not found</p>
                    <Button onClick={() => navigate(-1)}>Go Back</Button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Button
                        appearance="subtle"
                        icon={<ArrowLeft24Regular />}
                        onClick={() => navigate(-1)}
                    >
                        Back
                    </Button>
                    <div>
                        <h1 className={styles.title}>{stats.name}</h1>
                        <p className={styles.subtitle}>
                            {stats.is_group ? '👥 Group' : stats.is_announcement ? '📢 Announcement' : '💬 Chat'} • {stats.jid}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`${styles.badge} ${stats.is_excluded ? styles.badgeExcluded : styles.badgeActive}`}>
                        {stats.is_excluded ? 'Excluded' : 'Tracking'}
                    </span>
                    {stats.deep_sync_enabled && (
                        <span className={`${styles.badge} ${styles.badgeActive}`}>
                            Deep Sync
                        </span>
                    )}
                    <span
                        className={`${styles.badge} ${stats.enable_message_grouping ? styles.badgeActive : styles.badgeInactive}`}
                        onClick={handleToggleGrouping}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        title={`Click to ${stats.enable_message_grouping ? 'disable' : 'enable'} message grouping`}
                    >
                        {stats.enable_message_grouping ? '✓ Grouping' : '✗ Not Grouping'}
                    </span>
                    <Button
                        appearance="subtle"
                        icon={refreshing ? <Spinner size="tiny" /> : <ArrowSync24Regular />}
                        onClick={loadStats}
                        disabled={refreshing}
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Statistics Grid */}
            <div className={styles.statsGrid}>
                {/* Messages Card */}
                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <span className={styles.statTitle}>Messages</span>
                    </div>
                    <div className={styles.statValue}>{stats.messages.total.toLocaleString()}</div>
                    <div className={styles.statDetails}>
                        <div className={styles.statRow}>
                            <span>📤 Sent</span>
                            <strong>{stats.messages.sent.toLocaleString()}</strong>
                        </div>
                        <div className={styles.statRow}>
                            <span>📥 Received</span>
                            <strong>{stats.messages.received.toLocaleString()}</strong>
                        </div>
                        <div className={styles.statRow}>
                            <span>📅 Oldest</span>
                            <strong>{formatTimestamp(stats.messages.oldest_timestamp)}</strong>
                        </div>
                        <div className={styles.statRow}>
                            <span>🕐 Newest</span>
                            <strong>{formatTimestamp(stats.messages.newest_timestamp)}</strong>
                        </div>
                    </div>
                </div>

                {/* Media Card */}
                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <span className={styles.statTitle}>Media Files</span>
                    </div>
                    <div className={styles.statValue}>{stats.media.total.toLocaleString()}</div>
                    <div className={styles.mediaGrid}>
                        <div className={styles.mediaCard}>
                            <Image24Regular className={styles.mediaIcon} />
                            <div className={styles.mediaCount}>{stats.media.photos}</div>
                            <div className={styles.mediaLabel}>Photos</div>
                        </div>
                        <div className={styles.mediaCard}>
                            <Video24Regular className={styles.mediaIcon} />
                            <div className={styles.mediaCount}>{stats.media.videos}</div>
                            <div className={styles.mediaLabel}>Videos</div>
                        </div>
                        <div className={styles.mediaCard}>
                            <MusicNote224Regular className={styles.mediaIcon} />
                            <div className={styles.mediaCount}>{stats.media.audio}</div>
                            <div className={styles.mediaLabel}>Audio</div>
                        </div>
                        <div className={styles.mediaCard}>
                            <Document24Regular className={styles.mediaIcon} />
                            <div className={styles.mediaCount}>{stats.media.documents}</div>
                            <div className={styles.mediaLabel}>Docs</div>
                        </div>
                        <div className={styles.mediaCard}>
                            <Emoji24Regular className={styles.mediaIcon} />
                            <div className={styles.mediaCount}>{stats.media.stickers}</div>
                            <div className={styles.mediaLabel}>Stickers</div>
                        </div>
                    </div>
                </div>

                {/* Metadata Card */}
                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <span className={styles.statTitle}>Metadata</span>
                    </div>
                    <div className={styles.statDetails}>
                        <div className={styles.statRow}>
                            <span>Created</span>
                            <strong>{format(new Date(stats.created_at), 'MMM d, yyyy')}</strong>
                        </div>
                        <div className={styles.statRow}>
                            <span>Updated</span>
                            <strong>{format(new Date(stats.updated_at), 'MMM d, yyyy')}</strong>
                        </div>
                        <div className={styles.statRow}>
                            <span>Last Message</span>
                            <strong>{formatTimestamp(stats.last_message_timestamp)}</strong>
                        </div>
                        <div className={styles.statRow}>
                            <span>Status</span>
                            <strong style={{ color: stats.is_excluded ? tokens.colorPaletteRedForeground1 : tokens.colorPaletteGreenForeground1 }}>
                                {stats.is_excluded ? 'Excluded' : 'Active'}
                            </strong>
                        </div>
                        <div className={styles.statRow}>
                            <span>Deep Sync</span>
                            <strong style={{ color: stats.deep_sync_enabled ? tokens.colorPaletteGreenForeground1 : tokens.colorNeutralForeground3 }}>
                                {stats.deep_sync_enabled ? 'Enabled' : 'Disabled'}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Configuration Dialog */}
            <Dialog open={isConfigDialogOpen} onOpenChange={(e, data) => setIsConfigDialogOpen(data.open)}>
                <DialogSurface>
                    <DialogBody>
                        <DialogTitle>Configure Message Grouping</DialogTitle>
                        <DialogContent>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                                <div>
                                    <Label>Grouping Strategy</Label>
                                    <select
                                        style={{ width: '100%', padding: '8px', marginTop: '8px', borderRadius: '4px', border: `1px solid ${tokens.colorNeutralStroke1}` }}
                                        value={configStrategy}
                                        onChange={(e) => setConfigStrategy(e.target.value)}
                                    >
                                        <option value="sticker">Sticker Separator</option>
                                        <option value="time_gap">Time Gap</option>
                                    </select>
                                    <p style={{ fontSize: '12px', color: tokens.colorNeutralForeground3, marginTop: '4px' }}>
                                        {configStrategy === 'sticker'
                                            ? 'A sticker message will be used as a separator between groups (e.g. photos of one product).'
                                            : 'Messages separated by a time gap will be grouped separately.'}
                                    </p>
                                </div>

                                {configStrategy === 'time_gap' && (
                                    <div>
                                        <Label>Time Gap Threshold (seconds)</Label>
                                        <Input
                                            type="number"
                                            value={configTimeGap}
                                            onChange={(e) => setConfigTimeGap(e.target.value)}
                                            style={{ width: '100%', marginTop: '8px' }}
                                        />
                                        <p style={{ fontSize: '12px', color: tokens.colorNeutralForeground3, marginTop: '4px' }}>
                                            If a message arrives more than {configTimeGap} seconds after the previous one, a new group starts.
                                        </p>
                                    </div>
                                )}

                                <div style={{ marginTop: '16px', border: `1px solid ${tokens.colorNeutralStroke1}`, borderRadius: '4px', padding: '8px', backgroundColor: tokens.colorNeutralBackground2 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Label>Preview Message Grouping</Label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Label size="small">Count:</Label>
                                            <Select
                                                value={previewCount.toString()}
                                                onChange={(e) => setPreviewCount(parseInt(e.target.value))}
                                                size="small"
                                            >
                                                <option value="10">10</option>
                                                <option value="25">25</option>
                                                <option value="50">50</option>
                                                <option value="100">100</option>
                                            </Select>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '8px', maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {previewMessages.length === 0 ? (
                                            <div style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>Loading preview...</div>
                                        ) : (
                                            (() => {
                                                const slice = previewMessages;
                                                return slice.map((msg, i) => {
                                                    let isNewGroup = false;
                                                    const prev = i > 0 ? slice[i - 1] : null;

                                                    if (i === 0) {
                                                        isNewGroup = true;
                                                    } else if (prev) {
                                                        if (configStrategy === 'sticker') {
                                                            if (msg.media_type === 'sticker' || prev.media_type === 'sticker') isNewGroup = true;
                                                        } else {
                                                            const diff = msg.timestamp - prev.timestamp;
                                                            if (diff > parseInt(configTimeGap || '300') || msg.media_type === 'sticker' || prev.media_type === 'sticker') isNewGroup = true;
                                                        }
                                                    }

                                                    return (
                                                        <div key={msg.message_id}>
                                                            {isNewGroup && (
                                                                <div style={{
                                                                    borderTop: `1px dashed ${tokens.colorBrandStroke1}`,
                                                                    margin: '8px 0',
                                                                    paddingTop: '4px',
                                                                    fontSize: '10px',
                                                                    color: tokens.colorBrandForeground1,
                                                                    textAlign: 'center',
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    New Group
                                                                </div>
                                                            )}
                                                            <div style={{
                                                                fontSize: '12px',
                                                                height: '42px',
                                                                backgroundColor: tokens.colorNeutralBackground1,
                                                                borderRadius: '4px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0',
                                                                overflow: 'hidden'
                                                            }}>
                                                                {['image', 'photo', 'video', 'sticker'].includes(msg.media_type || '') && msg.media_url ? (
                                                                    <img
                                                                        src={msg.media_url}
                                                                        style={{
                                                                            width: '42px',
                                                                            height: '100%',
                                                                            objectFit: 'cover',
                                                                            backgroundColor: tokens.colorNeutralBackground3,
                                                                            marginRight: '8px'
                                                                        }}
                                                                        alt=""
                                                                    />
                                                                ) : (
                                                                    <div style={{ width: '8px' }} />
                                                                )}

                                                                <span style={{ fontFamily: 'monospace', color: tokens.colorNeutralForeground3, flexShrink: 0, marginRight: '8px' }}>
                                                                    {format(new Date(msg.timestamp * 1000), 'HH:mm:ss')}
                                                                </span>

                                                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '8px' }}>
                                                                    {msg.media_type && (
                                                                        <Badge appearance="tint" size="small">{msg.media_type}</Badge>
                                                                    )}

                                                                    <span style={{
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        color: msg.message_text ? tokens.colorNeutralForeground1 : tokens.colorNeutralForeground3
                                                                    }}>
                                                                        {(() => {
                                                                            const text = msg.message_text;
                                                                            if (!text) return msg.media_type ? '' : '(no content)';
                                                                            if (msg.media_type && /^\[.*\]$/.test(text)) return '';
                                                                            return text;
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()
                                        )}
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                        <DialogActions>
                            <DialogTrigger disableButtonEnhancement>
                                <Button appearance="secondary">Cancel</Button>
                            </DialogTrigger>
                            <Button appearance="primary" onClick={handleConfirmEnable}>Enable Grouping</Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface >
            </Dialog >
        </div >
    );
}
