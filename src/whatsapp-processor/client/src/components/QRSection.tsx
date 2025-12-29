import { QRCodeSVG } from 'qrcode.react';
import { Stack, Text } from '@fluentui/react';
import { tokens } from '@fluentui/react-components';

interface QRSectionProps {
    qrCode: string;
}

export default function QRSection({ qrCode }: QRSectionProps) {
    return (
        <Stack
            horizontalAlign="center"
            tokens={{ childrenGap: 16 }}
            styles={{
                root: {
                    padding: '32px',
                    backgroundColor: tokens.colorNeutralBackground1,
                    borderRadius: '4px',
                },
            }}
        >
            <Text variant="xLarge" styles={{ root: { fontWeight: 600 } }}>
                Scan to Login
            </Text>
            <Stack
                horizontalAlign="center"
                styles={{
                    root: {
                        backgroundColor: '#ffffff', // QR code background should stay light for scanability
                        padding: '16px',
                        borderRadius: '4px',
                    },
                }}
            >
                <QRCodeSVG value={qrCode} size={256} />
            </Stack>
            <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4, textAlign: 'center' } }}>
                Open WhatsApp → Linked Devices → Link a Device
            </Text>
        </Stack>
    );
}
