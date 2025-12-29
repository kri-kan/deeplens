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
import CommunitiesAdminPage from './pages/CommunitiesAdminPage';
import QRCodePage from './pages/QRCodePage';

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

        return () => {
            socket.off('status');
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

                        {/* Administration Routes */}
                        <Route path="/admin/chats" element={<ChatsAdminPage />} />
                        <Route path="/admin/announcements" element={<AnnouncementsAdminPage />} />
                        <Route path="/admin/groups" element={<GroupsAdminPage />} />
                        <Route path="/admin/communities" element={<CommunitiesAdminPage />} />

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
