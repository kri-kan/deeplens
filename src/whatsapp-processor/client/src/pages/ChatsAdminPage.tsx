import { useEffect, useState } from 'react';
import { useWhatsAppConnection } from '../hooks/useWhatsApp';
import { useStore } from '../store/useStore';
import { fetchChats, fetchProcessingState, updateSyncSettings, Chat, ProcessingState, excludeChat, includeChat, bulkExcludeChats } from '../services/api.service';
import ResumeModal from '../components/ResumeModal';
import { tokens } from '@fluentui/react-components';
import {
    Stack,
    Text,
    PrimaryButton,
    DefaultButton,
    Pivot,
    PivotItem,
    Icon,
    Separator,
    MessageBar,
    MessageBarType,
    List,
    mergeStyleSets,
    Checkbox,
    Toggle
} from '@fluentui/react';

const styles = mergeStyleSets({
    card: {
        padding: '24px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: '4px',
        color: tokens.colorNeutralForeground1,
    },
    highlightCard: {
        padding: '24px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: '4px',
        borderLeft: `4px solid ${tokens.colorPaletteGreenForeground1}`,
        color: tokens.colorNeutralForeground1,
    },
    chatItem: {
        padding: '8px 16px',
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: '4px',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: tokens.colorNeutralForeground1,
        ':hover': {
            backgroundColor: tokens.colorNeutralBackground2Hover,
        },
    },
    listHeader: {
        padding: '8px 16px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    }
});

export default function ChatsAdminPage() {
    const { status } = useWhatsAppConnection();
    const { setProcessingState: setGlobalProcessingState } = useStore();
    const [items, setItems] = useState<Chat[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [processingState, setProcessingState] = useState<ProcessingState | null>(null);
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [selectedChat, setSelectedChat] = useState<{ jid: string; name: string } | null>(null);
    const [selectedTab, setSelectedTab] = useState<string>('included');
    const [selectedJids, setSelectedJids] = useState<Set<string>>(new Set());

    const LIMIT = 50;

    useEffect(() => {
        if (status === 'connected') {
            refreshData();
        }
    }, [status, selectedTab, search]);

    const refreshData = async () => {
        setOffset(0);
        setIsLoading(true);
        try {
            const [response, state] = await Promise.all([
                fetchChats(LIMIT, 0, search, selectedTab === 'excluded'),
                fetchProcessingState()
            ]);
            setItems(response.items);
            setTotal(response.total);
            setProcessingState(state);
            setGlobalProcessingState(state);
            setSelectedJids(new Set());
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMore = async () => {
        if (isLoading || items.length >= total) return;

        setIsLoading(true);
        const newOffset = offset + LIMIT;
        try {
            const response = await fetchChats(LIMIT, newOffset, search, selectedTab === 'excluded');
            setItems(prev => [...prev, ...response.items]);
            setOffset(newOffset);
        } catch (error) {
            console.error('Failed to load more:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExclude = async (jid: string) => {
        try {
            await excludeChat(jid);
            await refreshData();
        } catch (error) {
            console.error('Failed to exclude chat:', error);
        }
    };

    const handleBulkExclude = async () => {
        if (selectedJids.size === 0) return;
        try {
            await bulkExcludeChats(Array.from(selectedJids));
            await refreshData();
        } catch (error) {
            console.error('Failed to bulk exclude chats:', error);
        }
    };

    const handleInclude = (jid: string, name: string) => {
        setSelectedChat({ jid, name });
        setShowResumeModal(true);
    };

    const handleSyncToggle = async (ev: any, checked?: boolean) => {
        try {
            const newState = await updateSyncSettings({ trackChats: checked });
            setProcessingState(newState);
            setGlobalProcessingState(newState);
        } catch (error) {
            console.error('Failed to update sync settings:', error);
        }
    };

    const toggleSelect = (jid: string) => {
        const newSelected = new Set(selectedJids);
        if (newSelected.has(jid)) {
            newSelected.delete(jid);
        } else {
            newSelected.add(jid);
        }
        setSelectedJids(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedJids.size === items.length) {
            setSelectedJids(new Set());
        } else {
            setSelectedJids(new Set(items.map(item => item.id)));
        }
    };

    if (status !== 'connected') {
        return (
            <Stack tokens={{ childrenGap: 24 }}>
                <Stack
                    horizontalAlign="center"
                    tokens={{ childrenGap: 16 }}
                    className={styles.card}
                    styles={{ root: { padding: '48px' } }}
                >
                    <Icon
                        iconName="StatusErrorFull"
                        styles={{ root: { fontSize: 48, color: tokens.colorPaletteRedForeground1 } }}
                    />
                    <Text variant="xxLarge" styles={{ root: { fontWeight: 600 } }}>
                        WhatsApp Not Connected
                    </Text>
                    <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4, textAlign: 'center' } }}>
                        Please connect WhatsApp to manage individual chats.
                    </Text>
                </Stack>
            </Stack>
        );
    }

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
            <Stack tokens={{ childrenGap: 8 }}>
                <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                    <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                        Individual Chats
                    </Text>
                    <Toggle
                        label="Sync"
                        checked={processingState?.trackChats ?? true}
                        onChange={handleSyncToggle}
                        inlineLabel
                    />
                </Stack>

                <Stack className={styles.card}>
                    <Stack styles={{ root: { marginBottom: 16 } }}>
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '4px',
                                border: `1px solid ${tokens.colorNeutralStroke1}`,
                                backgroundColor: tokens.colorNeutralBackground2,
                                color: tokens.colorNeutralForeground1,
                                width: '300px'
                            }}
                        />
                    </Stack>

                    <Stack horizontal horizontalAlign="space-between" verticalAlign="center" styles={{ root: { marginBottom: 24 } }}>
                        <Pivot
                            selectedKey={selectedTab}
                            onLinkClick={(item) => {
                                if (item) {
                                    setSelectedTab(item.props.itemKey!);
                                }
                            }}
                        >
                            <PivotItem
                                headerText={`Tracking (${selectedTab === 'included' ? total : '...'})`}
                                itemKey="included"
                                itemIcon="CheckMark"
                            />
                            <PivotItem
                                headerText={`Excluded (${selectedTab === 'excluded' ? total : '...'})`}
                                itemKey="excluded"
                                itemIcon="Cancel"
                            />
                        </Pivot>

                        {selectedJids.size > 0 && selectedTab === 'included' && (
                            <DefaultButton
                                text={`Exclude Selected (${selectedJids.size})`}
                                iconProps={{ iconName: 'Cancel' }}
                                onClick={handleBulkExclude}
                                styles={{ root: { color: tokens.colorPaletteRedForeground1 } }}
                            />
                        )}
                    </Stack>

                    {items.length === 0 && !isLoading ? (
                        <MessageBar messageBarType={MessageBarType.info}>
                            {selectedTab === 'included'
                                ? 'No individual chats are being tracked.'
                                : 'No individual chats are excluded.'}
                        </MessageBar>
                    ) : (
                        <>
                            <div className={styles.listHeader}>
                                <Checkbox
                                    label="Select All"
                                    checked={selectedJids.size === items.length && items.length > 0}
                                    onChange={toggleSelectAll}
                                />
                                <Text variant="small" styles={{ root: { marginLeft: 'auto', color: tokens.colorNeutralForeground4 } }}>
                                    Showing {items.length} of {total}
                                </Text>
                            </div>
                            <List
                                items={items}
                                onRenderCell={(item) => {
                                    if (!item) return null;
                                    return (
                                        <Stack horizontal verticalAlign="center" className={styles.chatItem}>
                                            <Checkbox
                                                checked={selectedJids.has(item.id)}
                                                onChange={() => toggleSelect(item.id)}
                                                styles={{ root: { marginRight: 12 } }}
                                            />
                                            <Stack tokens={{ childrenGap: 4 }} styles={{ root: { flex: 1, minWidth: 0 } }}>
                                                <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                                                    {item.name}
                                                </Text>
                                                <Text variant="small" styles={{ root: { color: tokens.colorNeutralForeground4, fontFamily: 'monospace' } }}>
                                                    {item.id}
                                                </Text>
                                            </Stack>
                                            {selectedTab === 'included' ? (
                                                <DefaultButton
                                                    text="Exclude"
                                                    iconProps={{ iconName: 'Cancel' }}
                                                    onClick={() => handleExclude(item.id)}
                                                    styles={{ root: { marginLeft: 16 } }}
                                                />
                                            ) : (
                                                <PrimaryButton
                                                    text="Include"
                                                    iconProps={{ iconName: 'CheckMark' }}
                                                    onClick={() => handleInclude(item.id, item.name)}
                                                    styles={{ root: { marginLeft: 16 } }}
                                                />
                                            )}
                                        </Stack>
                                    );
                                }}
                            />

                            {items.length < total && (
                                <Stack horizontalAlign="center" styles={{ root: { marginTop: 20 } }}>
                                    <DefaultButton
                                        text={isLoading ? "Loading..." : "Load More"}
                                        onClick={loadMore}
                                        disabled={isLoading}
                                    />
                                </Stack>
                            )}
                        </>
                    )}
                </Stack>
            </Stack>

            {showResumeModal && selectedChat && (
                <ResumeModal
                    jid={selectedChat.jid}
                    name={selectedChat.name}
                    onClose={() => {
                        setShowResumeModal(false);
                        setSelectedChat(null);
                    }}
                    onSuccess={refreshData}
                />
            )}
        </div>
    );
}
