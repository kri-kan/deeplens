import { useEffect, useState } from 'react';
import { useWhatsAppConnection } from '../hooks/useWhatsApp';
import {
    Chat,
    fetchAnnouncements,
    excludeChat as excludeChatAPI,
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
    highlightCard: {
        padding: '24px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: '4px',
        borderLeft: `4px solid ${tokens.colorBrandForeground1}`,
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

export default function AnnouncementsAdminPage() {
    const { status } = useWhatsAppConnection();
    const [announcements, setAnnouncements] = useState<Chat[]>([]);
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
            const data = await fetchAnnouncements();
            setAnnouncements(data);
        } catch (error) {
            console.error('Failed to load announcements:', error);
        }
    };

    const handleExclude = async (jid: string) => {
        try {
            await excludeChatAPI(jid);
            await loadData();
        } catch (error) {
            console.error('Failed to exclude announcement channel:', error);
        }
    };

    const handleInclude = (jid: string, name: string) => {
        setSelectedChat({ jid, name });
        setShowResumeModal(true);
    };

    const includedItems = announcements.filter(item => !item.isExcluded);
    const excludedItems = announcements.filter(item => item.isExcluded);
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
                        iconName="StatusErrorFull"
                        styles={{ root: { fontSize: 48, color: tokens.colorPaletteRedForeground1 } }}
                    />
                    <Text variant="xxLarge" styles={{ root: { fontWeight: 600 } }}>
                        WhatsApp Not Connected
                    </Text>
                    <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4, textAlign: 'center' } }}>
                        Please connect WhatsApp to manage community announcements.
                    </Text>
                </Stack>
            </Stack>
        );
    }

    return (
        <Stack tokens={{ childrenGap: 24 }}>
            <Stack className={styles.highlightCard}>
                <Stack horizontal tokens={{ childrenGap: 16 }} verticalAlign="center">
                    <Icon
                        iconName="Megaphone"
                        styles={{ root: { fontSize: 48, color: tokens.colorBrandForeground1 } }}
                    />
                    <Stack>
                        <Text variant="xxLarge" styles={{ root: { fontWeight: 600 } }}>
                            Community Announcements
                        </Text>
                        <Text variant="large" styles={{ root: { color: tokens.colorNeutralForeground4, marginTop: 8 } }}>
                            Track important information from official community channels
                        </Text>
                    </Stack>
                </Stack>
            </Stack>

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
                            ? 'No announcement channels are being tracked.'
                            : 'No announcement channels are excluded.'}
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
