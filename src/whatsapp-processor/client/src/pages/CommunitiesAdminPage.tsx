import { Stack, Text } from '@fluentui/react';

const styles = {
    card: {
        padding: '24px',
        backgroundColor: '#1c1c1c',
        borderRadius: '4px',
    },
};

export default function CommunitiesAdminPage() {
    return (
        <Stack tokens={{ childrenGap: 24 }}>
            <Stack style={styles.card}>
                <Text variant="xxLarge" styles={{ root: { fontWeight: 600, marginBottom: 16 } }}>
                    Communities Administration
                </Text>
                <Text variant="large" styles={{ root: { color: '#a0a0a0' } }}>
                    Manage WhatsApp Communities and their tracking settings.
                </Text>
            </Stack>

            <Stack style={styles.card}>
                <Text variant="medium" styles={{ root: { color: '#a0a0a0' } }}>
                    This section will allow you to:
                </Text>
                <ul style={{ color: '#a0a0a0', marginTop: 12 }}>
                    <li>View all communities you're part of</li>
                    <li>Enable/disable tracking for entire communities</li>
                    <li>Manage community group tracking individually</li>
                    <li>View community statistics and activity</li>
                </ul>
                <Text variant="medium" styles={{ root: { color: '#0078d4', marginTop: 16 } }}>
                    🚧 Coming soon...
                </Text>
            </Stack>
        </Stack>
    );
}
