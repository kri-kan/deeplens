import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  ActivityIndicator,
  Chip,
  IconButton,
  Surface,
  FAB,
  Portal,
  Modal,
  TextInput,
  Divider,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/layout/Section';
import { whatsappService, WaAccount, CreateWaAccountPayload } from '@/services/whatsappService';
import { waProcessorService, WaProcessorStatus } from '@/services/wa-processor.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  connected: '#25D366',
  scanning: '#FFA726',
  disconnected: '#B0BEC5',
};

const STATUS_LABELS: Record<string, string> = {
  connected: 'Connected',
  scanning: 'Scanning QR',
  disconnected: 'Disconnected',
};

const STATUS_ICONS: Record<string, string> = {
  connected: 'check-circle',
  scanning: 'qrcode-scan',
  disconnected: 'wifi-off',
};

function StatusChip({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#B0BEC5';
  return (
    <Chip
      icon={STATUS_ICONS[status] ?? 'circle-outline'}
      style={{ backgroundColor: color + '22', height: 28 }}
      textStyle={{ color, fontWeight: '700', fontSize: 11 }}
      compact
    >
      {STATUS_LABELS[status] ?? status}
    </Chip>
  );
}

// ─── Add Account Modal ────────────────────────────────────────────────────────

interface AddAccountModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (payload: CreateWaAccountPayload) => Promise<void>;
}

function AddAccountModal({ visible, onDismiss, onSave }: AddAccountModalProps) {
  const theme = useTheme();
  const [label, setLabel] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setLabel('');
    setSessionId('');
    setPhoneNumber('');
  };

  const handleSave = async () => {
    if (!label.trim() || !sessionId.trim()) {
      Alert.alert('Required', 'Label and Session ID are required.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        label: label.trim(),
        sessionId: sessionId.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
      });
      reset();
      onDismiss();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text variant="titleLarge" style={styles.modalTitle}>
          Add WhatsApp Account
        </Text>
        <Text variant="bodySmall" style={styles.modalHint}>
          Register a session ID that matches your Baileys processor's SESSION_ID env var.
        </Text>

        <TextInput
          label="Display Label *"
          value={label}
          onChangeText={setLabel}
          mode="outlined"
          placeholder="e.g. My Business Phone"
          style={styles.input}
        />
        <TextInput
          label="Session ID *"
          value={sessionId}
          onChangeText={setSessionId}
          mode="outlined"
          placeholder="e.g. default  or  business-1"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          label="Phone Number (optional)"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          mode="outlined"
          placeholder="e.g. 919876543210"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Text variant="labelSmall" style={styles.sessionHint}>
          The phone number will be auto-filled by the processor once connected.
        </Text>

        <View style={styles.modalActions}>
          <Button mode="outlined" onPress={onDismiss} style={styles.modalBtn} disabled={saving}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.modalBtn}
          >
            Save
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────

interface AccountCardProps {
  account: WaAccount;
  /** session_id currently active in the processor */
  activeSessionId?: string;
  onDelete: (id: string) => void;
  onManage: (account: WaAccount) => void;
}

function AccountCard({ account, activeSessionId, onDelete, onManage }: AccountCardProps) {
  const theme = useTheme();
  const isActive = account.sessionId === activeSessionId;

  return (
    <TouchableOpacity onPress={() => onManage(account)} activeOpacity={0.85}>
      <Card
        style={[
          styles.accountCard,
          isActive && { borderColor: '#25D366', borderWidth: 1.5 },
        ]}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            {/* Left: label + meta */}
            <View style={{ flex: 1 }}>
              <View style={styles.cardTitleRow}>
                <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                  {account.label ?? account.sessionId}
                </Text>
                {isActive && (
                  <Chip
                    compact
                    style={{ backgroundColor: '#25D36622', height: 24 }}
                    textStyle={{ color: '#25D366', fontSize: 10, fontWeight: '700' }}
                  >
                    ACTIVE
                  </Chip>
                )}
              </View>

              {account.phoneNumber ? (
                <Text variant="bodySmall" style={{ opacity: 0.65, marginTop: 2 }}>
                  📱 +{account.phoneNumber}
                </Text>
              ) : null}

              {account.accountName ? (
                <Text variant="bodySmall" style={{ opacity: 0.55 }}>
                  {account.accountName}
                </Text>
              ) : null}

              <Text variant="labelSmall" style={{ opacity: 0.35, marginTop: 4 }}>
                session: {account.sessionId}
              </Text>
            </View>

            {/* Right: status + actions */}
            <View style={styles.cardRight}>
              <StatusChip status={account.status} />
              <IconButton
                icon="chevron-right"
                size={20}
                style={{ margin: 0, marginTop: 4 }}
                iconColor={theme.colors.outline}
              />
            </View>
          </View>

          <Divider style={{ marginTop: 10, marginBottom: 6 }} />

          <View style={styles.cardFooter}>
            <Text variant="labelSmall" style={{ opacity: 0.35 }}>
              Updated {new Date(account.updatedAt).toLocaleDateString()}
            </Text>
            <Button
              mode="text"
              compact
              textColor={theme.colors.error}
              icon="delete-outline"
              onPress={() => onDelete(account.id)}
              style={{ margin: 0 }}
            >
              Remove
            </Button>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WhatsAppAccountsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [accounts, setAccounts] = useState<WaAccount[]>([]);
  const [processorStatus, setProcessorStatus] = useState<WaProcessorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [processorError, setProcessorError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [accts, status] = await Promise.all([
        whatsappService.getAccounts(),
        waProcessorService.getStatus().catch(() => null),
      ]);
      setAccounts(accts);
      setProcessorStatus(status);
      setProcessorError(null);
    } catch (err: any) {
      setProcessorError(err?.message ?? 'Failed to load accounts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const handleAdd = async (payload: CreateWaAccountPayload) => {
    await whatsappService.createAccount(payload);
    await fetchAll();
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Remove Account',
      'This removes the account from the registry. The Baileys session data on disk will not be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await whatsappService.deleteAccount(id);
              setAccounts((prev) => prev.filter((a) => a.id !== id));
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Could not remove account');
            }
          },
        },
      ]
    );
  };

  const handleManage = (account: WaAccount) => {
    router.push({
      pathname: '/utilities/whatsapp/session',
      params: { sessionId: account.sessionId, label: account.label ?? account.sessionId },
    });
  };

  const activeSessionId = processorStatus?.sessionId;
  const connStatus = processorStatus?.status ?? 'disconnected';
  const connColor = STATUS_COLORS[connStatus] ?? '#B0BEC5';

  return (
    <>
      <ScreenWrapper title="WhatsApp Accounts" contentContainerStyle={styles.container}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* ── Processor status banner ── */}
          <Section title="Processor" style={styles.section}>
            <Card style={styles.processorCard}>
              <Card.Content>
                <View style={styles.processorRow}>
                  <View style={[styles.connDot, { backgroundColor: connColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                      {STATUS_LABELS[connStatus] ?? connStatus}
                    </Text>
                    {activeSessionId ? (
                      <Text variant="labelSmall" style={{ opacity: 0.5 }}>
                        Active session: <Text style={{ fontWeight: '600' }}>{activeSessionId}</Text>
                      </Text>
                    ) : null}
                  </View>

                  {processorStatus && (
                    <View style={styles.healthRow}>
                      <HealthDot label="DB" ok={processorStatus.systemHealth.databaseAvailable} />
                      <HealthDot label="Storage" ok={processorStatus.systemHealth.minioAvailable} />
                    </View>
                  )}

                  {!processorStatus && !loading && (
                    <Text variant="labelSmall" style={{ opacity: 0.4 }}>
                      Unreachable
                    </Text>
                  )}
                </View>
              </Card.Content>
            </Card>
          </Section>

          {/* ── Account list ── */}
          <Section title={`Accounts (${accounts.length})`} style={styles.section}>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 32 }} />
            ) : processorError && accounts.length === 0 ? (
              <Surface style={styles.errorBanner} elevation={0}>
                <Text variant="labelMedium" style={{ color: theme.colors.error }}>
                  {processorError}
                </Text>
                <Button compact onPress={fetchAll} icon="refresh">
                  Retry
                </Button>
              </Surface>
            ) : accounts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>📱</Text>
                <Text variant="bodyMedium" style={{ opacity: 0.5, textAlign: 'center' }}>
                  No accounts yet.{'\n'}Tap + to add a WhatsApp session.
                </Text>
              </View>
            ) : (
              accounts.map((a) => (
                <AccountCard
                  key={a.id}
                  account={a}
                  activeSessionId={activeSessionId}
                  onDelete={handleDelete}
                  onManage={handleManage}
                />
              ))
            )}
          </Section>
        </ScrollView>
      </ScreenWrapper>

      {/* ── FAB ── */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: '#25D366' }]}
        color="#fff"
        onPress={() => setAddVisible(true)}
      />

      {/* ── Add Modal ── */}
      <AddAccountModal
        visible={addVisible}
        onDismiss={() => setAddVisible(false)}
        onSave={handleAdd}
      />
    </>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function HealthDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <View style={[styles.healthDotCircle, { backgroundColor: ok ? '#25D366' : '#EF5350' }]} />
      <Text variant="labelSmall" style={{ opacity: 0.55, fontSize: 9 }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingBottom: 20 },
  section: { paddingHorizontal: 16, marginBottom: 16 },

  // Processor banner
  processorCard: { borderRadius: 14, elevation: 1 },
  processorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  connDot: { width: 10, height: 10, borderRadius: 5 },
  healthRow: { flexDirection: 'row', gap: 10 },
  healthDotCircle: { width: 7, height: 7, borderRadius: 4 },

  // Account cards
  accountCard: { borderRadius: 16, marginBottom: 12, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EF535012',
  },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 24, borderRadius: 16 },

  // Modal
  modal: {
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: { fontWeight: '700', marginBottom: 6 },
  modalHint: { opacity: 0.55, marginBottom: 16 },
  input: { marginBottom: 12 },
  sessionHint: { opacity: 0.4, marginBottom: 20, fontSize: 11 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, borderRadius: 8 },
});
