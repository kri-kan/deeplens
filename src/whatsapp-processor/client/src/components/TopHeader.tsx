import { makeStyles, Button, tokens } from '@fluentui/react-components';
import {
    CheckmarkCircle24Filled,
    DismissCircle24Filled,
    Clock24Regular,
    Settings24Regular,
} from '@fluentui/react-icons';
import { ConnectionStatus } from '../services/api.service';

const useStyles = makeStyles({
    header: {
        height: '64px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        top: 0,
        right: 0,
        zIndex: 100,
        transition: 'left 0.3s ease',
    },
    titleSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    title: {
        fontSize: '18px',
        fontWeight: 600,
        color: tokens.colorNeutralForeground1,
        margin: 0,
    },
    subtitle: {
        fontSize: '12px',
        color: tokens.colorNeutralForeground4,
        margin: 0,
    },
    rightSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    statusSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    statusText: {
        fontSize: '14px',
        fontWeight: 500,
        margin: 0,
    },
});

interface TopHeaderProps {
    status: ConnectionStatus;
    tenantName: string;
    navWidth: number;
    isSticky: boolean;
    onSettingsClick: () => void;
}

export default function TopHeader({
    status,
    tenantName,
    navWidth,
    isSticky,
    onSettingsClick
}: TopHeaderProps) {
    const styles = useStyles();

    const statusConfig = {
        connected: {
            color: tokens.colorPaletteGreenForeground1,
            icon: CheckmarkCircle24Filled,
            label: 'Connected'
        },
        scanning: {
            color: tokens.colorPaletteYellowForeground1,
            icon: Clock24Regular,
            label: 'Scanning'
        },
        disconnected: {
            color: tokens.colorPaletteRedForeground1,
            icon: DismissCircle24Filled,
            label: 'Disconnected'
        }
    };

    const config = statusConfig[status];
    const StatusIcon = config.icon;

    return (
        <div
            className={styles.header}
            style={{
                left: `${navWidth}px`,
                position: isSticky ? 'fixed' : 'relative',
            }}
        >
            <div className={styles.titleSection}>
                <h1 className={styles.title}>DeepLens WhatsApp Processor</h1>
                <p className={styles.subtitle}>Tenant: {tenantName}</p>
            </div>

            <div className={styles.rightSection}>
                <div className={styles.statusSection}>
                    <StatusIcon style={{ color: config.color, fontSize: '24px' }} />
                    <p className={styles.statusText} style={{ color: config.color }}>
                        {config.label}
                    </p>
                </div>

                <Button
                    appearance="subtle"
                    icon={<Settings24Regular />}
                    onClick={onSettingsClick}
                    title="Settings"
                />
            </div>
        </div>
    );
}
