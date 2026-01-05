import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { fetchStatus, ConnectionStatus } from './services/api.service';
import { getSocket } from './services/socket.service';
import { loadSettings, updateSetting, AppSettings } from './utils/settings';
import Navigation from './components/Navigation';
import TopHeader from './components/TopHeader';
import SettingsDrawer from './components/SettingsDrawer';
import DashboardPage from './pages/DashboardPage';
import ChatsAdminPage from './pages/ChatsAdminPage';
import AnnouncementsAdminPage from './pages/AnnouncementsAdminPage';
import GroupsAdminPage from './pages/GroupsAdminPage';
import QRCodePage from './pages/QRCodePage';
import ChatsPage from './pages/ChatsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import GroupsPage from './pages/GroupsPage';
import { useStore } from './store/useStore';
import { fetchChats } from './services/conversation.service';

function AppContent({
    settings,
    onSettingChange
}: {
    settings: AppSettings,
    onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}) {
    const [hasSession, setHasSession] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isNavCollapsed, setIsNavCollapsed] = useState(false);
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [tenantName, setTenantName] = useState<string>('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if session exists on mount
        fetchStatus().then(data => {
            setHasSession(data.hasSession);
            setStatus(data.status);
            setTenantName(data.tenant);
            setIsLoading(false);
        }).catch(() => {
            setHasSession(false);
            setIsLoading(false);
        });

        // Listen for connection status changes via socket
        const socket = getSocket();
        socket.on('status', (data: { status: string; loggedOut?: boolean }) => {
            setStatus(data.status as ConnectionStatus);

            if (data.status === 'connected') {
                setHasSession(true);
            } else if (data.status === 'disconnected') {
                // If logged out, clear session and redirect to QR page
                if (data.loggedOut) {
                    setHasSession(false);
                    navigate('/qr');
                } else {
                    // Only set to false if we're sure there's no session
                    fetchStatus().then(statusData => {
                        setHasSession(statusData.hasSession);
                    });
                }
            }
        });

        // Listen for real-time messages
        socket.on('new_message', (message: any) => {
            const { addMessage } = useStore.getState();
            addMessage(message);
        });

        // Listen for chat updates (sorting/naming)
        socket.on('chat_update', (update: any) => {
            const { chats, setChats } = useStore.getState();
            const index = chats.findIndex(c => c.jid === update.jid);

            if (index !== -1) {
                const newChats = [...chats];
                newChats[index] = { ...newChats[index], ...update };
                // Re-sort based on latest message
                newChats.sort((a, b) => {
                    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
                    const tsA = parseInt(a.last_message_timestamp || '0');
                    const tsB = parseInt(b.last_message_timestamp || '0');
                    return tsB - tsA;
                });
                setChats(newChats);
            } else {
                // New chat discovery - just push and fetch full list to be safe
                fetchChats().then(data => {
                    const mapped = data.map(chat => ({
                        jid: chat.jid,
                        name: chat.name,
                        is_group: chat.is_group,
                        is_announcement: chat.is_announcement,
                        unread_count: chat.unread_count,
                        last_message_text: chat.last_message_text,
                        last_message_timestamp: chat.last_message_timestamp?.toString() || null,
                        is_pinned: chat.is_pinned,
                        is_archived: chat.is_archived
                    }));
                    setChats(mapped);
                });
            }
        });

        return () => {
            socket.off('status');
            socket.off('new_message');
            socket.off('chat_update');
        };
    }, [navigate]);

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                flexDirection: 'column',
                gap: '16px',
                backgroundColor: settings.theme === 'dark' ? '#0f172a' : '#f8fafc'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #0078d4',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <div style={{ fontSize: '16px', color: settings.theme === 'dark' ? '#ffffff' : '#0f172a' }}>Loading...</div>
            </div>
        );
    }

    const navWidth = isNavCollapsed ? 60 : 240;

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            backgroundColor: settings.theme === 'dark' ? '#0f172a' : '#f8fafc',
            color: settings.theme === 'dark' ? '#ffffff' : '#0f172a'
        }}>
            {/* Left Sidebar Navigation - Only show when session exists */}
            {hasSession && (
                <Navigation
                    isCollapsed={isNavCollapsed}
                    onToggle={() => setIsNavCollapsed(!isNavCollapsed)}
                />
            )}

            {/* Top Header - Fixed position when sticky is enabled */}
            {hasSession && settings.stickyHeader && (
                <TopHeader
                    status={status}
                    tenantName={tenantName}
                    navWidth={navWidth}
                    isSticky={true}
                    onSettingsClick={() => setIsSettingsOpen(true)}
                />
            )}

            {/* Settings Drawer */}
            <SettingsDrawer
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                onSettingChange={onSettingChange}
            />

            {/* Main Content Area */}
            <div style={{
                flex: 1,
                marginLeft: hasSession ? `${navWidth}px` : '0',
                marginTop: hasSession && settings.stickyHeader ? '64px' : '0',
                overflowY: 'auto',
                transition: 'margin-left 0.3s ease',
            }}>
                {/* Top Header - Scrollable when sticky is disabled */}
                {hasSession && !settings.stickyHeader && (
                    <TopHeader
                        status={status}
                        tenantName={tenantName}
                        navWidth={0}
                        isSticky={false}
                        onSettingsClick={() => setIsSettingsOpen(true)}
                    />
                )}

                <div style={{ padding: '32px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
                    <Routes>
                        {/* Dashboard Landing Page */}
                        <Route
                            path="/"
                            element={hasSession ? <DashboardPage /> : <Navigate to="/qr" replace />}
                        />

                        {/* Conversation Routes */}
                        <Route path="/conversations/chats" element={<ChatsPage />} />
                        <Route path="/conversations/announcements" element={<AnnouncementsPage />} />
                        <Route path="/conversations/groups" element={<GroupsPage />} />

                        {/* Administration Routes */}
                        <Route path="/admin/chats" element={<ChatsAdminPage />} />
                        <Route path="/admin/announcements" element={<AnnouncementsAdminPage />} />
                        <Route path="/admin/groups" element={<GroupsAdminPage />} />

                        {/* QR Code Page */}
                        <Route path="/qr" element={<QRCodePage />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
}

function App() {
    const [settings, setSettings] = useState<AppSettings>(loadSettings());

    const handleSettingChange = <K extends keyof AppSettings>(
        key: K,
        value: AppSettings[K]
    ) => {
        const updated = updateSetting(key, value);
        setSettings(updated);
    };

    return (
        <FluentProvider theme={settings.theme === 'dark' ? webDarkTheme : webLightTheme}>
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                body {
                    margin: 0;
                    padding: 0;
                    background-color: ${settings.theme === 'dark' ? '#0f172a' : '#f8fafc'};
                }
            `}</style>
            <BrowserRouter>
                <AppContent settings={settings} onSettingChange={handleSettingChange} />
            </BrowserRouter>
        </FluentProvider>
    );
}

export default App;
