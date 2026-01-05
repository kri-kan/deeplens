import { useNavigate, useLocation } from 'react-router-dom';
import {
    makeStyles,
    Button,
    tokens,
    Badge,
    mergeClasses,
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
    Organization24Regular,
} from '@fluentui/react-icons';
import { useState, useEffect } from 'react';
import { fetchChats, fetchAnnouncements, fetchGroups } from '../services/conversation.service';
import { useStore } from '../store/useStore';

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
        zIndex: 1000,
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
        position: 'relative',
        '&:hover': {
            backgroundColor: tokens.colorNeutralBackground2Hover,
        },
    },
    navButtonActive: {
        backgroundColor: `${tokens.colorNeutralBackground3} !important`,
        color: `${tokens.colorBrandForeground1} !important`,
        fontWeight: "700 !important",
        '&::before': {
            content: '""',
            position: 'absolute',
            left: '0px',
            top: '4px',
            bottom: '4px',
            width: '6px',
            backgroundColor: tokens.colorBrandBackground,
            borderRadius: '0 4px 4px 0',
            zIndex: 100,
        },
        '& .fui-Button__icon': {
            color: `${tokens.colorBrandForeground1} !important`,
        },
        '&:hover': {
            backgroundColor: `${tokens.colorNeutralBackground3Hover} !important`,
        },
    },
    subNavButton: {
        justifyContent: 'flex-start',
        color: tokens.colorNeutralForeground4,
        paddingLeft: '44px',
        position: 'relative',
        fontSize: '13px',
        height: '32px',
        '&:hover': {
            backgroundColor: tokens.colorNeutralBackground2Hover,
            color: tokens.colorNeutralForeground2,
        },
    },
    subNavButtonActive: {
        backgroundColor: `${tokens.colorNeutralBackground3} !important`,
        color: `${tokens.colorBrandForeground1} !important`,
        fontWeight: "700 !important",
        '&::before': {
            content: '""',
            position: 'absolute',
            left: '20px',
            top: '6px',
            bottom: '6px',
            width: '4px',
            backgroundColor: tokens.colorBrandBackground,
            borderRadius: '2px',
            zIndex: 100,
        },
        '&:hover': {
            backgroundColor: `${tokens.colorNeutralBackground3} !important`,
        },
    },
    hamburger: {
        color: tokens.colorNeutralForeground1,
        minWidth: 'auto',
        '&:hover': {
            backgroundColor: tokens.colorNeutralBackground2Hover,
        },
    },
    countBadge: {
        marginLeft: 'auto',
        fontSize: '10px',
    },
    faded: {
        opacity: 0.5,
        filter: 'grayscale(0.5)',
    }
});

interface NavigationProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export default function Navigation({ isCollapsed, onToggle }: NavigationProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const styles = useStyles();
    const { processingState } = useStore();
    const [isConversationsExpanded, setIsConversationsExpanded] = useState(true);
    const [isAdminExpanded, setIsAdminExpanded] = useState(true);
    const [counts, setCounts] = useState({ chats: 0, groups: 0, announcements: 0 });

    const width = isCollapsed ? 60 : 260;

    const isConversationsActive = location.pathname.startsWith('/conversations');
    const isAdminActive = location.pathname.startsWith('/admin');

    useEffect(() => {
        const loadCounts = async () => {
            try {
                const [c, g, a] = await Promise.all([
                    fetchChats(),
                    fetchGroups(),
                    fetchAnnouncements()
                ]);
                setCounts({
                    chats: c.length,
                    groups: g.length,
                    announcements: a.length
                });
            } catch (err) {
                console.error('Failed to load menu counts:', err);
            }
        };

        loadCounts();
        // Refresh counts occasionally
        const interval = setInterval(loadCounts, 60000);
        return () => clearInterval(interval);
    }, []);

    const NavLabel = ({ label, count }: { label: string, count?: number }) => (
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            <span>{label}</span>
            {!isCollapsed && count !== undefined && count > 0 && (
                <Badge appearance="tint" size="small" className={styles.countBadge}>
                    {count}
                </Badge>
            )}
        </div>
    );

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
                    className={mergeClasses(styles.navButton, location.pathname === '/' && styles.navButtonActive)}
                    style={{ width: '100%' }}
                >
                    {!isCollapsed && 'Dashboard'}
                </Button>

                {/* Conversations Menu */}
                {!isCollapsed && (
                    <>
                        <Button
                            appearance="subtle"
                            icon={<People24Regular />}
                            iconPosition="before"
                            onClick={() => setIsConversationsExpanded(!isConversationsExpanded)}
                            className={mergeClasses(styles.navButton, isConversationsActive && styles.navButtonActive)}
                            style={{ width: '100%', justifyContent: 'space-between' }}
                        >
                            <span>Conversations</span>
                            {isConversationsExpanded ? <ChevronDown24Regular /> : <ChevronRight24Regular />}
                        </Button>

                        {isConversationsExpanded && (
                            <>
                                <Button
                                    appearance="transparent"
                                    onClick={() => navigate('/conversations/chats')}
                                    className={mergeClasses(
                                        styles.subNavButton,
                                        location.pathname === '/conversations/chats' && styles.subNavButtonActive,
                                        processingState && !processingState.trackChats && styles.faded
                                    )}
                                    style={{ width: '100%' }}
                                >
                                    <NavLabel label="Chats" count={counts.chats} />
                                </Button>

                                <Button
                                    appearance="transparent"
                                    onClick={() => navigate('/conversations/announcements')}
                                    className={mergeClasses(
                                        styles.subNavButton,
                                        location.pathname === '/conversations/announcements' && styles.subNavButtonActive,
                                        processingState && !processingState.trackAnnouncements && styles.faded
                                    )}
                                    style={{ width: '100%' }}
                                >
                                    <NavLabel label="Announcements" count={counts.announcements} />
                                </Button>

                                <Button
                                    appearance="transparent"
                                    onClick={() => navigate('/conversations/groups')}
                                    className={mergeClasses(
                                        styles.subNavButton,
                                        location.pathname === '/conversations/groups' && styles.subNavButtonActive,
                                        processingState && !processingState.trackGroups && styles.faded
                                    )}
                                    style={{ width: '100%' }}
                                >
                                    <NavLabel label="Groups" count={counts.groups} />
                                </Button>
                            </>
                        )}
                    </>
                )}

                {/* When collapsed, show conversations icon only */}
                {isCollapsed && (
                    <Button
                        appearance="subtle"
                        icon={<People24Regular />}
                        onClick={() => navigate('/conversations/chats')}
                        className={mergeClasses(styles.navButton, location.pathname.startsWith('/conversations') && styles.navButtonActive)}
                        style={{ width: '100%' }}
                        title="Conversations"
                    />
                )}

                {/* Administration Menu */}
                {!isCollapsed && (
                    <>
                        <Button
                            appearance="subtle"
                            icon={<Settings24Regular />}
                            iconPosition="before"
                            onClick={() => setIsAdminExpanded(!isAdminExpanded)}
                            className={mergeClasses(styles.navButton, isAdminActive && styles.navButtonActive)}
                            style={{ width: '100%', justifyContent: 'space-between' }}
                        >
                            <span>Administration</span>
                            {isAdminExpanded ? <ChevronDown24Regular /> : <ChevronRight24Regular />}
                        </Button>

                        {isAdminExpanded && (
                            <>
                                <Button
                                    appearance="transparent"
                                    onClick={() => navigate('/admin/chats')}
                                    className={mergeClasses(styles.subNavButton, location.pathname === '/admin/chats' && styles.subNavButtonActive)}
                                    style={{ width: '100%' }}
                                >
                                    Chats
                                </Button>

                                <Button
                                    appearance="transparent"
                                    onClick={() => navigate('/admin/announcements')}
                                    className={mergeClasses(styles.subNavButton, location.pathname === '/admin/announcements' && styles.subNavButtonActive)}
                                    style={{ width: '100%' }}
                                >
                                    Announcements
                                </Button>

                                <Button
                                    appearance="transparent"
                                    onClick={() => navigate('/admin/groups')}
                                    className={mergeClasses(styles.subNavButton, location.pathname === '/admin/groups' && styles.subNavButtonActive)}
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
                        className={mergeClasses(styles.navButton, location.pathname.startsWith('/admin') && styles.navButtonActive)}
                        style={{ width: '100%' }}
                        title="Administration"
                    />
                )}

                <Button
                    appearance="subtle"
                    icon={<QrCode24Regular />}
                    onClick={() => navigate('/qr')}
                    className={mergeClasses(styles.navButton, location.pathname === '/qr' && styles.navButtonActive)}
                    style={{ width: '100%' }}
                >
                    {!isCollapsed && 'QR Code'}
                </Button>
            </div>
        </div >
    );
}
