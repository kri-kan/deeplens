import { useNavigate, useLocation } from 'react-router-dom';
import {
    makeStyles,
    Button,
    tokens,
} from '@fluentui/react-components';
import {
    Navigation24Regular,
    Home24Regular,
    QrCode24Regular,
    Settings24Regular,
    People24Regular,
    PeopleTeam24Regular,
    Megaphone24Regular,
    ChevronDown24Regular,
    ChevronRight24Regular,
} from '@fluentui/react-icons';
import { useState } from 'react';

const useStyles = makeStyles({
    container: {
        height: '100vh',
        backgroundColor: tokens.colorNeutralBackground2,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        transition: 'width 0.3s ease',
        borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    header: {
        padding: '16px',
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minHeight: '60px',
    },
    title: {
        fontSize: '20px',
        fontWeight: 600,
        color: tokens.colorBrandForeground1,
        margin: 0,
        whiteSpace: 'nowrap',
    },
    subtitle: {
        fontSize: '12px',
        color: tokens.colorNeutralForeground4,
        margin: 0,
    },
    nav: {
        display: 'flex',
        flexDirection: 'column',
        padding: '8px',
        gap: '4px',
        overflowY: 'auto',
    },
    navButton: {
        justifyContent: 'flex-start',
        color: tokens.colorNeutralForeground1,
        '&:hover': {
            backgroundColor: tokens.colorNeutralBackground2Hover,
        },
    },
    navButtonActive: {
        backgroundColor: tokens.colorBrandBackground,
        color: tokens.colorNeutralForegroundOnBrand,
        '&:hover': {
            backgroundColor: tokens.colorBrandBackgroundHover,
        },
    },
    subNavButton: {
        justifyContent: 'flex-start',
        color: tokens.colorNeutralForeground4,
        paddingLeft: '48px',
        '&:hover': {
            backgroundColor: tokens.colorNeutralBackground2Hover,
            color: tokens.colorNeutralForeground2,
        },
    },
    subNavButtonActive: {
        backgroundColor: tokens.colorNeutralBackground3,
        color: tokens.colorBrandForeground1,
        '&:hover': {
            backgroundColor: tokens.colorNeutralBackground3Hover,
        },
    },
    hamburger: {
        color: tokens.colorNeutralForeground1,
        minWidth: 'auto',
        '&:hover': {
            backgroundColor: tokens.colorNeutralBackground2Hover,
        },
    },
});

interface NavigationProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export default function Navigation({ isCollapsed, onToggle }: NavigationProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const styles = useStyles();
    const [isAdminExpanded, setIsAdminExpanded] = useState(true);

    const width = isCollapsed ? 60 : 240;

    const isAdminActive = location.pathname.startsWith('/admin');
    const isAdminChatsActive = location.pathname === '/admin/chats';
    const isAdminAnnouncementsActive = location.pathname === '/admin/announcements';
    const isAdminGroupsActive = location.pathname === '/admin/groups';

    return (
        <div className={styles.container} style={{ width }}>
            {/* Header with Hamburger */}
            <div className={styles.header} style={{ justifyContent: isCollapsed ? 'center' : 'space-between' }}>
                {!isCollapsed && (
                    <div>
                        <h1 className={styles.title}>DeepLens</h1>
                        <p className={styles.subtitle}>WhatsApp Processor</p>
                    </div>
                )}

                <Button
                    appearance="subtle"
                    icon={<Navigation24Regular />}
                    onClick={onToggle}
                    title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
                    className={styles.hamburger}
                />
            </div>

            {/* Navigation Items */}
            <div className={styles.nav}>
                <Button
                    appearance="subtle"
                    icon={<Home24Regular />}
                    onClick={() => navigate('/')}
                    className={`${styles.navButton} ${location.pathname === '/' ? styles.navButtonActive : ''}`}
                    style={{ width: '100%' }}
                >
                    {!isCollapsed && 'Dashboard'}
                </Button>

                {/* Administration Menu */}
                {!isCollapsed && (
                    <>
                        <Button
                            appearance="subtle"
                            icon={<Settings24Regular />}
                            iconPosition="before"
                            onClick={() => setIsAdminExpanded(!isAdminExpanded)}
                            className={`${styles.navButton} ${isAdminActive ? styles.navButtonActive : ''}`}
                            style={{ width: '100%', justifyContent: 'space-between' }}
                        >
                            <span>Administration</span>
                            {isAdminExpanded ? <ChevronDown24Regular /> : <ChevronRight24Regular />}
                        </Button>

                        {isAdminExpanded && (
                            <>
                                <Button
                                    appearance="subtle"
                                    icon={<People24Regular />}
                                    onClick={() => navigate('/admin/chats')}
                                    className={`${styles.subNavButton} ${isAdminChatsActive ? styles.subNavButtonActive : ''}`}
                                    style={{ width: '100%' }}
                                >
                                    Chats
                                </Button>

                                <Button
                                    appearance="subtle"
                                    icon={<Megaphone24Regular />}
                                    onClick={() => navigate('/admin/announcements')}
                                    className={`${styles.subNavButton} ${isAdminAnnouncementsActive ? styles.subNavButtonActive : ''}`}
                                    style={{ width: '100%' }}
                                >
                                    Announcements
                                </Button>

                                <Button
                                    appearance="subtle"
                                    icon={<PeopleTeam24Regular />}
                                    onClick={() => navigate('/admin/groups')}
                                    className={`${styles.subNavButton} ${isAdminGroupsActive ? styles.subNavButtonActive : ''}`}
                                    style={{ width: '100%' }}
                                >
                                    Groups
                                </Button>
                            </>
                        )}
                    </>
                )}

                {/* When collapsed, show admin icon only */}
                {isCollapsed && (
                    <Button
                        appearance="subtle"
                        icon={<Settings24Regular />}
                        onClick={() => navigate('/admin/chats')}
                        className={`${styles.navButton} ${isAdminActive ? styles.navButtonActive : ''}`}
                        style={{ width: '100%' }}
                        title="Administration"
                    />
                )}

                <Button
                    appearance="subtle"
                    icon={<QrCode24Regular />}
                    onClick={() => navigate('/qr')}
                    className={`${styles.navButton} ${location.pathname === '/qr' ? styles.navButtonActive : ''}`}
                    style={{ width: '100%' }}
                >
                    {!isCollapsed && 'QR Code'}
                </Button>
            </div>
        </div>
    );
}
