import { tokens } from '@fluentui/react-components';
import { Stack, Text, Icon, mergeStyleSets } from '@fluentui/react';
import { useWhatsAppConnection } from '../hooks/useWhatsApp';

const styles = mergeStyleSets({
    card: {
        padding: '32px',
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
});

export default function DashboardPage() {
    const { status } = useWhatsAppConnection();

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
            <Stack tokens={{ childrenGap: 24 }}>
                {/* Welcome Section */}
                <Stack className={styles.card}>
                    <Text variant="xxLarge" styles={{ root: { fontWeight: 600, marginBottom: 8 } }}>
                        Welcome to DeepLens WhatsApp Processor
                    </Text>
                    <Text variant="large" styles={{ root: { color: tokens.colorNeutralForeground4 } }}>
                        Monitor and manage your WhatsApp chats, groups, and communities
                    </Text>
                </Stack>

                {/* Quick Stats */}
                <Stack horizontal tokens={{ childrenGap: 16 }}>
                    <Stack.Item grow={1}>
                        <Stack className={styles.statCard}>
                            <Icon
                                iconName="People"
                                styles={{ root: { fontSize: 48, color: tokens.colorBrandForeground1, marginBottom: 12 } }}
                            />
                            <Text variant="xLarge" styles={{ root: { fontWeight: 600, color: tokens.colorBrandForeground1 } }}>
                                Chats
                            </Text>
                            <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4, marginTop: 8 } }}>
                                Individual conversations
                            </Text>
                        </Stack>
                    </Stack.Item>

                    <Stack.Item grow={1}>
                        <Stack className={styles.statCard}>
                            <Icon
                                iconName="PeopleTeam"
                                styles={{ root: { fontSize: 48, color: tokens.colorPaletteGreenForeground1, marginBottom: 12 } }}
                            />
                            <Text variant="xLarge" styles={{ root: { fontWeight: 600, color: tokens.colorPaletteGreenForeground1 } }}>
                                Groups
                            </Text>
                            <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4, marginTop: 8 } }}>
                                Group conversations
                            </Text>
                        </Stack>
                    </Stack.Item>

                    <Stack.Item grow={1}>
                        <Stack className={styles.statCard}>
                            <Icon
                                iconName="Organization"
                                styles={{ root: { fontSize: 48, color: tokens.colorPaletteBerryForeground1, marginBottom: 12 } }}
                            />
                            <Text variant="xLarge" styles={{ root: { fontWeight: 600, color: tokens.colorPaletteBerryForeground1 } }}>
                                Communities
                            </Text>
                            <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4, marginTop: 8 } }}>
                                Community groups
                            </Text>
                        </Stack>
                    </Stack.Item>
                </Stack>

                {/* Quick Links */}
                <Stack className={styles.card}>
                    <Text variant="xLarge" styles={{ root: { fontWeight: 600, marginBottom: 16 } }}>
                        Quick Actions
                    </Text>
                    <Stack tokens={{ childrenGap: 12 }}>
                        <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4 } }}>
                            • Use <strong style={{ color: tokens.colorBrandForeground1 }}>Administration → Groups</strong> to manage group tracking
                        </Text>
                        <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4 } }}>
                            • Use <strong style={{ color: tokens.colorBrandForeground1 }}>Administration → Chats</strong> to manage individual chats
                        </Text>
                        <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4 } }}>
                            • Use <strong style={{ color: tokens.colorBrandForeground1 }}>Administration → Communities</strong> to manage communities
                        </Text>
                        <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4 } }}>
                            • Click the <strong style={{ color: tokens.colorBrandForeground1 }}>⚙️ Settings</strong> icon to configure app preferences
                        </Text>
                    </Stack>
                </Stack>

                {/* Connection Status */}
                {status !== 'connected' && (
                    <Stack className={styles.card} style={{ borderLeft: `4px solid ${tokens.colorPaletteYellowForeground1}` }}>
                        <Text variant="large" styles={{ root: { fontWeight: 600, color: tokens.colorPaletteYellowForeground1, marginBottom: 8 } }}>
                            ⚠️ WhatsApp Not Connected
                        </Text>
                        <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4 } }}>
                            Please navigate to the QR Code page to connect your WhatsApp account.
                        </Text>
                    </Stack>
                )}
            </Stack>
        </div>
    );
}
