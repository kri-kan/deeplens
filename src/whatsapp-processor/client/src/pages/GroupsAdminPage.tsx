import { useEffect, useState } from 'react';
import { useWhatsAppConnection } from '../hooks/useWhatsApp';
import {
    Group,
    fetchGroups,
    excludeChat as excludeChatAPI,
    pauseProcessing,
    resumeProcessing,
    ProcessingState
} from '../services/api.service';
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
    mergeStyleSets
} from '@fluentui/react';

const styles = mergeStyleSets({
    card: {
        padding: '24px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: '4px',
        color: tokens.colorNeutralForeground1,
    },
    statCard: {
        padding: '24px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: '4px',
        textAlign: 'center',
        color: tokens.colorNeutralForeground1,
    },
    chatItem: {
        padding: '16px',
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
});

export default function GroupsAdminPage() {
    const { status } = useWhatsAppConnection();
    const [groups, setGroups] = useState<Group[]>([]);
    const [processingState, setProcessingState] = useState<ProcessingState>({
        isPaused: false,
        pausedAt: null,
        resumedAt: null
    });
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [selectedChat, setSelectedChat] = useState<{ jid: string; name: string } | null>(null);
    const [selectedTab, setSelectedTab] = useState<string>('included');

    useEffect(() => {
        if (status === 'connected') {
            loadData();
        }
    }, [status]);

    const loadData = async () => {
        try {
            const groupsData = await fetchGroups();
            setGroups(groupsData);
        } catch (error) {
            console.error('Failed to load groups:', error);
        }
    };

    const handlePauseResume = async () => {
        try {
            const newState = processingState.isPaused
                ? await resumeProcessing()
                : await pauseProcessing();
            setProcessingState(newState);
        } catch (error) {
            console.error('Failed to toggle processing:', error);
        }
    };

    const handleExclude = async (jid: string) => {
        try {
            await excludeChatAPI(jid);
            await loadData();
        } catch (error) {
            console.error('Failed to exclude group:', error);
        }
    };

    const handleInclude = (jid: string, name: string) => {
        setSelectedChat({ jid, name });
        setShowResumeModal(true);
    };

    const includedItems = groups.filter(item => !item.isExcluded);
    const excludedItems = groups.filter(item => item.isExcluded);
    const displayItems = selectedTab === 'included' ? includedItems : excludedItems;

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
                        iconName={status === 'scanning' ? 'QRCode' : 'StatusErrorFull'}
                        styles={{ root: { fontSize: 48, color: status === 'scanning' ? tokens.colorPaletteYellowForeground1 : tokens.colorPaletteRedForeground1 } }}
                    />
                    <Text variant="xxLarge" styles={{ root: { fontWeight: 600 } }}>
                        {status === 'scanning' ? 'Scan QR Code' : 'Disconnected'}
                    </Text>
                    <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4, textAlign: 'center' } }}>
                        {status === 'scanning'
                            ? 'Please navigate to the QR Code page to authenticate.'
                            : 'WhatsApp is not connected. Please check the connection.'}
                    </Text>
                </Stack>
            </Stack>
        );
    }

    return (
        <Stack tokens={{ childrenGap: 24 }}>
            {/* Page Header */}
            <Stack className={styles.card} styles={{ root: { borderLeft: `4px solid ${tokens.colorPaletteBerryForeground1}` } }}>
                <Text variant="xxLarge" styles={{ root: { fontWeight: 600, marginBottom: 8 } }}>
                    Standalone Groups
                </Text>
                <Text variant="large" styles={{ root: { color: tokens.colorNeutralForeground4, marginBottom: 16 } }}>
                    Manage tracking for regular WhatsApp groups (not part of communities)
                </Text>
                <Stack horizontal tokens={{ childrenGap: 24 }} styles={{ root: { marginTop: 8 } }}>
                    <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4 } }}>
                        ℹ️ <strong style={{ color: tokens.colorPaletteYellowForeground1 }}>Note:</strong> Community discussion groups are automatically excluded
                    </Text>
                    <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4 } }}>
                        ✅ Only standalone groups appear here
                    </Text>
                </Stack>
            </Stack>

            {/* Processing Control */}
            <Stack className={styles.card}>
                <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                    <Stack tokens={{ childrenGap: 8 }}>
                        <Text variant="xLarge" styles={{ root: { fontWeight: 600 } }}>
                            Message Processing
                        </Text>
                        <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4 } }}>
                            {processingState.isPaused
                                ? 'Processing is paused. Messages will not be tracked.'
                                : 'Processing is active. All non-excluded standalone groups are being tracked.'}
                        </Text>
                    </Stack>
                    {processingState.isPaused ? (
                        <PrimaryButton
                            text="Resume"
                            iconProps={{ iconName: 'Play' }}
                            onClick={handlePauseResume}
                        />
                    ) : (
                        <DefaultButton
                            text="Pause"
                            iconProps={{ iconName: 'Pause' }}
                            onClick={handlePauseResume}
                        />
                    )}
                </Stack>
            </Stack>

            {/* Statistics */}
            <Stack horizontal tokens={{ childrenGap: 16 }}>
                <Stack.Item grow={1}>
                    <Stack className={styles.statCard}>
                        <Text variant="xxLarge" styles={{ root: { fontWeight: 600, color: tokens.colorBrandForeground1 } }}>
                            {groups.length}
                        </Text>
                        <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4, marginTop: 8 } }}>
                            Total Groups
                        </Text>
                    </Stack>
                </Stack.Item>
                <Stack.Item grow={1}>
                    <Stack className={styles.statCard}>
                        <Text variant="xxLarge" styles={{ root: { fontWeight: 600, color: tokens.colorPaletteGreenForeground1 } }}>
                            {includedItems.length}
                        </Text>
                        <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4, marginTop: 8 } }}>
                            Tracking
                        </Text>
                    </Stack>
                </Stack.Item>
                <Stack.Item grow={1}>
                    <Stack className={styles.statCard}>
                        <Text variant="xxLarge" styles={{ root: { fontWeight: 600, color: tokens.colorPaletteRedForeground1 } }}>
                            {excludedItems.length}
                        </Text>
                        <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4, marginTop: 8 } }}>
                            Excluded
                        </Text>
                    </Stack>
                </Stack.Item>
            </Stack>

            {/* Tabs and Group List */}
            <Stack className={styles.card}>
                <Pivot
                    selectedKey={selectedTab}
                    onLinkClick={(item) => item && setSelectedTab(item.props.itemKey!)}
                    styles={{
                        root: { marginBottom: 24 },
                    }}
                >
                    <PivotItem
                        headerText={`Tracking (${includedItems.length})`}
                        itemKey="included"
                        itemIcon="CheckMark"
                    />
                    <PivotItem
                        headerText={`Excluded (${excludedItems.length})`}
                        itemKey="excluded"
                        itemIcon="Cancel"
                    />
                </Pivot>

                {displayItems.length === 0 ? (
                    <MessageBar messageBarType={MessageBarType.info}>
                        {selectedTab === 'included'
                            ? 'No standalone groups are being tracked.'
                            : 'No standalone groups are excluded.'}
                    </MessageBar>
                ) : (
                    <List
                        items={displayItems}
                        onRenderCell={(item) => {
                            if (!item) return null;
                            return (
                                <Stack horizontal horizontalAlign="space-between" verticalAlign="center" className={styles.chatItem}>
                                    <Stack tokens={{ childrenGap: 4 }} styles={{ root: { flex: 1, minWidth: 0 } }}>
                                        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                                            {item.subject}
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
                                            onClick={() => handleInclude(item.id, item.subject)}
                                            styles={{ root: { marginLeft: 16 } }}
                                        />
                                    )}
                                </Stack>
                            );
                        }}
                    />
                )}
            </Stack>

            {/* Resume Modal */}
            {showResumeModal && selectedChat && (
                <ResumeModal
                    jid={selectedChat.jid}
                    name={selectedChat.name}
                    onClose={() => {
                        setShowResumeModal(false);
                        setSelectedChat(null);
                    }}
                    onSuccess={loadData}
                />
            )}
        </Stack>
    );
}
