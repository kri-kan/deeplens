import { Stack, Text, Icon } from '@fluentui/react';
import { ConnectionStatus } from '../services/api.service';
import { tokens } from '@fluentui/react-components';

interface HeaderProps {
    status: ConnectionStatus;
    tenantName: string;
}

export default function Header({ status, tenantName }: HeaderProps) {
    const statusConfig = {
        connected: { color: tokens.colorPaletteGreenForeground1, icon: 'SkypeCircleCheck', label: 'Connected' },
        scanning: { color: tokens.colorPaletteYellowForeground1, icon: 'SkypeCircleClock', label: 'Scanning' },
        disconnected: { color: tokens.colorPaletteRedForeground1, icon: 'StatusErrorFull', label: 'Disconnected' }
    };

    const config = statusConfig[status];

    return (
        <Stack
            horizontal
            horizontalAlign="space-between"
            verticalAlign="center"
            styles={{
                root: {
                    padding: '24px',
                    backgroundColor: tokens.colorNeutralBackground1,
                    borderRadius: '4px',
                    marginBottom: '24px',
                    color: tokens.colorNeutralForeground1,
                },
            }}
        >
            <Stack>
                <Text variant="xxLarge" styles={{ root: { fontWeight: 600 } }}>
                    DeepLens WhatsApp Processor
                </Text>
                {tenantName && (
                    <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4, marginTop: 4 } }}>
                        Tenant: {tenantName}
                    </Text>
                )}
            </Stack>
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                <Icon
                    iconName={config.icon}
                    styles={{ root: { fontSize: 16, color: config.color as any } }}
                />
                <Text variant="medium" styles={{ root: { fontWeight: 500 } }}>
                    {config.label}
                </Text>
            </Stack>
        </Stack>
    );
}
