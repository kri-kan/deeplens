import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  ActivityIndicator,
  Divider,
  Chip,
  IconButton,
  Surface,
  Banner,
} from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/layout/Section';
import { waProcessorService, WaProcessorStatus } from '@/services/wa-processor.service';
import QRCode from 'react-native-qrcode-svg';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  connected: '#25D366',
  scanning: '#FFA726',
  disconnected: '#B0BEC5',
};

const STATUS_LABELS: Record<string, string> = {
  connected: 'Connected',
  scanning: 'Waiting for QR scan',
  disconnected: 'Disconnected',
};

function StatusChip({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#B0BEC5';
  const icons: Record<string, string> = {
    connected: 'check-circle',
    scanning: 'qrcode-scan',
    disconnected: 'wifi-off',
  };
  return (
    <Chip
      icon={icons[status] ?? 'circle-outline'}
      style={{ backgroundColor: color + '22', height: 30 }}
      textStyle={{ color, fontWeight: '700', fontSize: 12 }}
      compact
    >
      {STATUS_LABELS[status] ?? status}
    </Chip>
  );
}

// ─── QR Panel ─────────────────────────────────────────────────────────────────

function QRPanel({ qr, onRefresh }: { qr: string; onRefresh: () => void }) {
  const theme = useTheme();
  return (
    <Surface
      style={[styles.qrSurface, { backgroundColor: theme.colors.elevation.level2 }]}
      elevation={3}
    >
      <Text variant="titleMedium" style={styles.qrTitle}>
        Scan with WhatsApp
      </Text>
      <Text variant="bodySmall" style={styles.qrHint}>
        Open WhatsApp → Settings → Linked Devices → Link a Device
      </Text>
      <View style={styles.qrBox}>
        <QRCode value={qr} size={210} />
      </View>
      <Button mode="outlined" icon="refresh" onPress={onRefresh} style={styles.qrRefreshBtn} compact>
        Refresh QR
      </Button>
    </Surface>
  );
}

// ─── Health Row ───────────────────────────────────────────────────────────────

function HealthRow({ health }: { health: WaProcessorStatus['systemHealth'] }) {
  return (
    <View style={styles.healthRow}>
      <HealthDot label="Database" ok={health.databaseAvailable} />
      <HealthDot label="Storage" ok={health.minioAvailable} />
      <HealthDot label="WhatsApp" ok={health.whatsappConnected} />
    </View>
  );
}

function HealthDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <View style={styles.healthItem}>
      <View style={[styles.healthDot, { backgroundColor: ok ? '#25D366' : '#EF5350' }]} />
      <Text variant="labelSmall" style={{ opacity: 0.6, fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function WhatsAppSessionScreen() {
  const theme = useTheme();
  const { sessionId, label } = useLocalSearchParams<{ sessionId: string; label: string }>();

  const [status, setStatus] = useState<WaProcessorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await waProcessorService.getStatus();
      setStatus(s);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Cannot reach WhatsApp processor');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll every 3.5s to pick up QR changes quickly
    pollingRef.current = setInterval(fetchStatus, 3500);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await waProcessorService.manualSync();
      Alert.alert('Sync triggered', 'Groups, contacts and chats are being synced.');
    } catch (err: any) {
      Alert.alert('Sync Error', err?.message ?? 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    const effectiveSessionId = sessionId ?? status?.sessionId ?? 'current';
    Alert.alert(
      'Log out session',
      `This will clear the Baileys auth state for session "${effectiveSessionId}" and require re-scanning a QR code. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await waProcessorService.logout();
              await fetchStatus();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Logout failed');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const connStatus = status?.status ?? 'disconnected';
  const statusColor = STATUS_COLORS[connStatus] ?? '#B0BEC5';

  // Fall back to the live session ID from the processor when no param was passed
  const effectiveSessionId = sessionId ?? status?.sessionId;

  // Is this the currently active session in the processor?
  const isThisSessionActive = !status?.sessionId || status.sessionId === effectiveSessionId;

  return (
    <ScreenWrapper
      title={label ?? effectiveSessionId ?? 'Session'}
      contentContainerStyle={styles.container}
    >
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Wrong session banner ── */}
        {status && !isThisSessionActive && (
          <Banner
            visible
            icon="alert-circle-outline"
            actions={[{ label: 'OK', onPress: () => {} }]}
            style={{ marginBottom: 8 }}
          >
            The processor is currently running session{' '}
            <Text style={{ fontWeight: '700' }}>{status.sessionId}</Text>, not{' '}
            <Text style={{ fontWeight: '700' }}>{sessionId}</Text>. Restart the processor with the
            correct SESSION_ID to manage this account.
          </Banner>
        )}

        {/* ── Error banner ── */}
        {error && (
          <Surface style={styles.errorBanner} elevation={0}>
            <IconButton icon="alert-circle" iconColor={theme.colors.error} size={20} />
            <View style={{ flex: 1 }}>
              <Text variant="labelMedium" style={{ color: theme.colors.error }}>
                Cannot reach processor
              </Text>
              <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                {error}
              </Text>
            </View>
            <IconButton icon="refresh" onPress={fetchStatus} size={18} />
          </Surface>
        )}

        {/* ── Connection status card ── */}
        {!error && (
          <Section title="Connection Status" style={styles.section}>
            <Card style={styles.statusCard}>
              <Card.Content>
                {loading && !status ? (
                  <ActivityIndicator style={{ marginVertical: 16 }} />
                ) : (
                  <>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                          {STATUS_LABELS[connStatus]}
                        </Text>
                        <Text variant="labelSmall" style={{ opacity: 0.45 }}>
                          Session ID: {effectiveSessionId}
                        </Text>
                      </View>
                      <StatusChip status={connStatus} />
                    </View>

                    {status && (
                      <>
                        <Divider style={styles.divider} />
                        <HealthRow health={status.systemHealth} />
                      </>
                    )}

                    {/* Actions (Available if active session exists) */}
                    {isThisSessionActive && status?.hasSession && (
                      <>
                        <Divider style={styles.divider} />
                        <View style={styles.actionRow}>
                          <Button
                            mode="outlined"
                            icon="sync"
                            onPress={handleSync}
                            loading={syncing}
                            disabled={syncing}
                            style={styles.actionBtn}
                          >
                            Sync Data
                          </Button>
                          <Button
                            mode="outlined"
                            icon="logout"
                            onPress={handleLogout}
                            loading={loggingOut}
                            disabled={loggingOut}
                            textColor={theme.colors.error}
                            style={[styles.actionBtn, { borderColor: theme.colors.error }]}
                          >
                            Log Out
                          </Button>
                        </View>
                      </>
                    )}

                    {/* Disconnected with no session */}
                    {connStatus === 'disconnected' && !status?.hasSession && isThisSessionActive && (
                      <>
                        <Divider style={styles.divider} />
                        <Text variant="bodySmall" style={{ opacity: 0.5, textAlign: 'center' }}>
                          Processor is idle. A QR code will appear once it starts authenticating.
                        </Text>
                        <Button
                          mode="contained"
                          icon="refresh"
                          onPress={fetchStatus}
                          style={{ marginTop: 12, borderRadius: 8 }}
                        >
                          Check Again
                        </Button>
                      </>
                    )}
                  </>
                )}
              </Card.Content>
            </Card>
          </Section>
        )}

        {/* ── QR Code ── */}
        {!error && connStatus === 'scanning' && status?.qr && isThisSessionActive && (
          <Section title="Link This Device" style={styles.section}>
            <QRPanel qr={status.qr} onRefresh={fetchStatus} />
          </Section>
        )}

        {/* ── Info ── */}
        {!error && (
          <Section title="About This Session" style={styles.section}>
            <Card style={styles.infoCard}>
              <Card.Content style={styles.infoContent}>
                <InfoRow label="Session ID" value={effectiveSessionId ?? '—'} />
                <InfoRow label="Label" value={label ?? '—'} />
                <InfoRow label="Processor URL" value={process.env.EXPO_PUBLIC_WHATSAPP_PROCESSOR_URL ?? 'localhost:3000'} />
              </Card.Content>
            </Card>
          </Section>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="labelSmall" style={{ opacity: 0.45, width: 100 }}>
        {label}
      </Text>
      <Text variant="bodySmall" style={{ flex: 1, fontWeight: '500' }}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingBottom: 20 },
  section: { paddingHorizontal: 16, marginBottom: 16 },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingRight: 8,
    borderRadius: 12,
    backgroundColor: '#EF535015',
  },

  // Status card
  statusCard: { borderRadius: 16, elevation: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  divider: { marginVertical: 14 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 8 },

  // Health
  healthRow: { flexDirection: 'row', justifyContent: 'space-around' },
  healthItem: { alignItems: 'center', gap: 4 },
  healthDot: { width: 10, height: 10, borderRadius: 5 },

  // QR
  qrSurface: { borderRadius: 20, alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 },
  qrTitle: { fontWeight: '700', marginBottom: 4 },
  qrHint: { opacity: 0.5, textAlign: 'center', marginBottom: 20 },
  qrBox: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16 },
  qrRefreshBtn: { marginTop: 16, borderRadius: 8 },

  // Info card
  infoCard: { borderRadius: 16, elevation: 1 },
  infoContent: { gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
