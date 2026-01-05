import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWhatsAppConnection } from '../hooks/useWhatsApp';
import Header from '../components/Header';
import QRSection from '../components/QRSection';
import { Stack, Text, Icon, ProgressIndicator, MessageBar, MessageBarType } from '@fluentui/react';
import { getSocket } from '../services/socket.service';
import { tokens } from '@fluentui/react-components';

export default function QRCodePage() {
    const { status, qrCode, tenantName } = useWhatsAppConnection();
    const navigate = useNavigate();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [wasLoggedOut, setWasLoggedOut] = useState(false);

    useEffect(() => {
        // Listen for logout events
        const socket = getSocket();
        socket.on('status', (data: { status: string; loggedOut?: boolean }) => {
            if (data.loggedOut) {
                setWasLoggedOut(true);
                // Clear the flag after 10 seconds
                setTimeout(() => setWasLoggedOut(false), 10000);
            }
        });

        return () => {
            socket.off('status');
        };
    }, []);

    useEffect(() => {
        if (status === 'connected' && !isRedirecting) {
            setIsRedirecting(true);
            setWasLoggedOut(false); // Clear logout message
            // Show success message for 2 seconds before redirecting
            setTimeout(() => {
                navigate('/');
            }, 2000);
        }
    }, [status, navigate, isRedirecting]);

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
            <Stack tokens={{ childrenGap: 24 }}>
                <Header status={status} tenantName={tenantName} />

                {/* Show logout message if user was logged out */}
                {wasLoggedOut && (
                    <MessageBar
                        messageBarType={MessageBarType.warning}
                        isMultiline={false}
                    >
                        WhatsApp was disconnected from your device. Please scan the QR code again to reconnect.
                    </MessageBar>
                )}

                {status === 'scanning' && qrCode ? (
                    <QRSection qrCode={qrCode} />
                ) : status === 'connected' ? (
                    <Stack
                        horizontalAlign="center"
                        tokens={{ childrenGap: 16 }}
                        styles={{
                            root: {
                                padding: '48px',
                                backgroundColor: tokens.colorNeutralBackground1,
                                borderRadius: '4px',
                                color: tokens.colorNeutralForeground1,
                            },
                        }}
                    >
                        <Icon
                            iconName="SkypeCircleCheck"
                            styles={{ root: { fontSize: 64, color: tokens.colorPaletteGreenForeground1 } }}
                        />
                        <Text variant="xxLarge" styles={{ root: { fontWeight: 600, color: tokens.colorPaletteGreenForeground1 } }}>
                            Linking Successful!
                        </Text>
                        <Text variant="large" styles={{ root: { color: tokens.colorNeutralForeground4, textAlign: 'center' } }}>
                            Redirecting to dashboard...
                        </Text>
                        <ProgressIndicator
                            styles={{
                                root: { width: '300px', marginTop: 16 },
                                itemProgress: { padding: 0 }
                            }}
                        />
                    </Stack>
                ) : (
                    <Stack
                        horizontalAlign="center"
                        tokens={{ childrenGap: 16 }}
                        styles={{
                            root: {
                                padding: '48px',
                                backgroundColor: tokens.colorNeutralBackground1,
                                borderRadius: '4px',
                                color: tokens.colorNeutralForeground1,
                            },
                        }}
                    >
                        <Icon
                            iconName="SkypeCircleClock"
                            styles={{ root: { fontSize: 48, color: tokens.colorPaletteYellowForeground1 } }}
                        />
                        <Text variant="xxLarge" styles={{ root: { fontWeight: 600, color: tokens.colorPaletteYellowForeground1 } }}>
                            {wasLoggedOut ? 'Generating New QR Code...' : 'Waiting for Connection'}
                        </Text>
                        <Text variant="medium" styles={{ root: { color: tokens.colorNeutralForeground4, textAlign: 'center' } }}>
                            {wasLoggedOut
                                ? 'Your session was invalidated. A new QR code will appear shortly...'
                                : 'Initializing WhatsApp connection...'}
                        </Text>
                    </Stack>
                )}
            </Stack>
        </div>
    );
}
