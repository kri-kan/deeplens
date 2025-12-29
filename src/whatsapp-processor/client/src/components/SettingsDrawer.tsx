import {
    Drawer,
    DrawerHeader,
    DrawerHeaderTitle,
    DrawerBody,
    Button,
    Switch,
    makeStyles,
    tokens,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { AppSettings } from '../utils/settings';

const useStyles = makeStyles({
    drawer: {
        backgroundColor: tokens.colorNeutralBackground1,
    },
    settingItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    settingLabel: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    settingTitle: {
        fontSize: '16px',
        fontWeight: 600,
        color: tokens.colorNeutralForeground1,
    },
    settingDescription: {
        fontSize: '13px',
        color: tokens.colorNeutralForeground4,
    },
    section: {
        marginBottom: '24px',
    },
    sectionTitle: {
        fontSize: '14px',
        fontWeight: 600,
        color: tokens.colorBrandForeground1,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        padding: '16px 16px 8px 16px',
    },
    themeSelector: {
        display: 'flex',
        gap: '8px',
        padding: '16px',
    },
    themeButton: {
        flex: 1,
    }
});

interface SettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export default function SettingsDrawer({
    isOpen,
    onClose,
    settings,
    onSettingChange
}: SettingsDrawerProps) {
    const styles = useStyles();

    return (
        <Drawer
            open={isOpen}
            onOpenChange={(_, { open }) => !open && onClose()}
            position="end"
            size="medium"
        >
            <DrawerHeader>
                <DrawerHeaderTitle
                    action={
                        <Button
                            appearance="subtle"
                            icon={<Dismiss24Regular />}
                            onClick={onClose}
                        />
                    }
                >
                    <span style={{ fontSize: '20px', fontWeight: 600 }}>Settings</span>
                </DrawerHeaderTitle>
            </DrawerHeader>

            <DrawerBody className={styles.drawer}>
                {/* Theme Selection */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>Theme</div>
                    <div className={styles.themeSelector}>
                        <Button
                            className={styles.themeButton}
                            appearance={settings.theme === 'light' ? 'primary' : 'outline'}
                            onClick={() => onSettingChange('theme', 'light')}
                        >
                            Light
                        </Button>
                        <Button
                            className={styles.themeButton}
                            appearance={settings.theme === 'dark' ? 'primary' : 'outline'}
                            onClick={() => onSettingChange('theme', 'dark')}
                        >
                            Dark
                        </Button>
                    </div>
                </div>

                {/* Display Settings Section */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>Display</div>

                    <div className={styles.settingItem}>
                        <div className={styles.settingLabel}>
                            <div className={styles.settingTitle}>Sticky Header</div>
                            <div className={styles.settingDescription}>
                                Keep the header fixed at the top while scrolling
                            </div>
                        </div>
                        <Switch
                            checked={settings.stickyHeader}
                            onChange={(_, data) => onSettingChange('stickyHeader', data.checked)}
                        />
                    </div>
                </div>
            </DrawerBody>
        </Drawer>
    );
}
