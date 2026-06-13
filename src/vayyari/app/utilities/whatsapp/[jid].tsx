import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Image } from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  ActivityIndicator,
  Divider,
  List,
  Chip,
  IconButton,
  Surface,
  Avatar,
  Switch,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { waProcessorService, ConversationStats, Message } from '@/services/wa-processor.service';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { format } from 'date-fns';
import { VendorAssignmentModal } from '@/components/utility/whatsapp/VendorAssignmentModal';
import { GroupingConfigModal } from '@/components/utility/whatsapp/GroupingConfigModal';

export default function ConversationDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { jid, name } = useLocalSearchParams<{ jid: string, name?: string }>();
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [vendorName, setVendorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deepSyncLoading, setDeepSyncLoading] = useState(false);
  const [purging, setPurging] = useState(false);

  const [vendorModalVisible, setVendorModalVisible] = useState(false);
  const [groupingModalVisible, setGroupingModalVisible] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!jid) return;
    try {
      const [data, msgRes, vendorRes] = await Promise.all([
        waProcessorService.fetchConversationStats(decodeURIComponent(jid)),
        waProcessorService.fetchMessages(decodeURIComponent(jid), 10, 0),
        waProcessorService.fetchVendor(decodeURIComponent(jid))
      ]);
      setStats(data);
      setMessages(msgRes.messages);
      if (vendorRes.hasVendor && vendorRes.vendor) {
        setVendorName(vendorRes.vendor.vendorName);
      } else {
        setVendorName(null);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to fetch stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jid]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return 'N/A';
    return format(new Date(ts * 1000), 'MMM d, HH:mm');
  };

  const handleToggleDeepSync = async () => {
    if (!stats) return;
    setDeepSyncLoading(true);
    const nextState = !stats.deepSyncEnabled;
    try {
      await waProcessorService.toggleDeepSync(stats.jid, nextState);
      setStats({ ...stats, deepSyncEnabled: nextState });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to toggle deep sync');
    } finally {
      setDeepSyncLoading(false);
    }
  };

  const handleSyncHistory = async () => {
    if (!stats) return;
    setSyncing(true);
    try {
      await waProcessorService.syncHistory(stats.jid);
      Alert.alert('Sync Started', 'Requested message history from WhatsApp. This may take a moment to appear.');
      setTimeout(fetchStats, 2000);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to trigger sync');
    } finally {
      setSyncing(false);
    }
  };

  const handlePurge = async () => {
    if (!stats) return;
    Alert.alert(
      'Purge Messages',
      `Permanently delete all messages for "${stats.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Purge', 
          style: 'destructive', 
          onPress: async () => {
            setPurging(true);
            try {
              await waProcessorService.purgeMessages(stats.jid);
              Alert.alert('Success', 'Messages purged successfully');
              await fetchStats();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to purge');
            } finally {
              setPurging(false);
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper title="Conversation Detail">
        <ActivityIndicator style={{ marginTop: 40 }} />
      </ScreenWrapper>
    );
  }

  if (!stats) {
    return (
      <ScreenWrapper title="Error">
        <Text style={{ textAlign: 'center', marginTop: 40 }}>Conversation not found</Text>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title={stats?.name || name || 'Detail'}>
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} />}
            contentContainerStyle={styles.container}
          >
        <Surface style={styles.headerCard} elevation={1}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {stats.profilePicUrl ? (
              <Image 
                source={{ uri: stats.profilePicUrl }} 
                style={[
                  { width: 80, height: 80, borderRadius: 40, marginRight: 16 },
                  stats.deepSyncEnabled && { borderWidth: 3, borderColor: '#25D366' }
                ]} 
              />
            ) : (
              <Avatar.Text 
                label={stats.name?.substring(0, 2).toUpperCase() || '?'} 
                size={80} 
                style={[
                  { backgroundColor: '#ccc', marginRight: 16 },
                  stats.deepSyncEnabled && { borderWidth: 3, borderColor: '#25D366' }
                ]} 
              />
            )}
            <View style={{ flex: 1 }}>
              <Text variant="headlineSmall" style={styles.title}>{stats?.name || name}</Text>
              <Text variant="bodySmall" style={styles.jid}>{stats?.jid}</Text>
            </View>
          </View>
          <View style={styles.badgeRow}>
            <Chip 
              selectedColor={stats.isExcluded ? theme.colors.error : '#25D366'}
              style={{ backgroundColor: (stats.isExcluded ? theme.colors.error : '#25D366') + '15' }}
            >
              {stats.isExcluded ? 'Excluded' : 'Tracking Active'}
            </Chip>
            {stats.deepSyncEnabled && (
              <Chip icon="sync" style={{ backgroundColor: theme.colors.primary + '15' }}>Deep Sync</Chip>
            )}
          </View>
        </Surface>

        <View style={styles.statsGrid}>
          <StatCard 
            title="Messages" 
            value={stats.messages.total.toString()}
            details={[
              { label: 'Sent', value: stats.messages.sent.toString() },
              { label: 'Received', value: stats.messages.received.toString() },
              { label: 'Latest', value: formatTimestamp(stats.messages.newestTimestamp) },
            ]}
          />

          <StatCard 
            title="Media Files" 
            value={stats.media.total.toString()}
            details={[
              { label: 'Photos', value: stats.media.photos.toString() },
              { label: 'Videos', value: stats.media.videos.toString() },
              { label: 'Docs', value: stats.media.documents.toString() },
            ]}
          />
        </View>

        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium">Metadata & Settings</Text>
              <IconButton icon="cog" size={18} onPress={() => setGroupingModalVisible(true)} />
            </View>
            <InfoRow label="Created" value={format(new Date(stats.createdAt), 'PPP')} />
            <Divider style={styles.divider} />
            <InfoRow label="Last Updated" value={format(new Date(stats.updatedAt), 'PPP')} />
            <Divider style={styles.divider} />
            
            <View style={styles.settingsRow}>
              <Text variant="bodyMedium">Deep Sync</Text>
              {deepSyncLoading ? (
                <ActivityIndicator size="small" />
              ) : (
                <IconButton 
                  icon={stats.deepSyncEnabled ? "toggle-switch" : "toggle-switch-off"} 
                  iconColor={stats.deepSyncEnabled ? "#25D366" : undefined}
                  size={30}
                  onPress={handleToggleDeepSync}
                  style={{ margin: 0 }}
                />
              )}
            </View>
            
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={{ opacity: 0.6 }}>Message Grouping</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ fontWeight: '500', marginRight: 8 }}>
                  {stats.enableMessageGrouping ? 'Enabled' : 'Disabled'}
                </Text>
                <IconButton 
                  icon="tune" 
                  size={16} 
                  onPress={() => setGroupingModalVisible(true)}
                  iconColor={stats.enableMessageGrouping ? theme.colors.primary : undefined}
                />
              </View>
            </View>

            <Divider style={styles.divider} />
            <Text variant="titleMedium" style={{ marginTop: 8, marginBottom: 8, fontWeight: 'bold' }}>Product Processing</Text>
            
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={{ opacity: 0.6 }}>Assigned Vendor</Text>
              <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
                {vendorName ?? 'None'}
              </Text>
            </View>

            {!stats.vendorId && (
              <View style={[styles.warningCard, { backgroundColor: theme.colors.errorContainer }]}>
                <Text style={{ color: theme.colors.onErrorContainer, fontSize: 13 }}>
                  ⚠️ Assign a vendor to this chat before enabling product processing.
                </Text>
              </View>
            )}

            <Divider style={styles.divider} />
            
            <View style={styles.settingsRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text variant="bodyMedium">Auto-Process Products</Text>
                <Text variant="bodySmall" style={{ opacity: 0.5 }}>
                  Automatically publish qualified message groups as products
                </Text>
              </View>
              <Switch
                value={stats.autoProcessProducts}
                disabled={!stats.vendorId}
                onValueChange={async (newValue) => {
                  if (!stats.vendorId) {
                    Alert.alert('Error', 'Please assign a vendor first.');
                    return;
                  }
                  try {
                    await waProcessorService.toggleChatAutoProcess(stats.jid, newValue);
                    setStats({ ...stats, autoProcessProducts: newValue });
                  } catch (err: any) {
                    Alert.alert('Error', err?.message ?? 'Failed to update auto-process setting');
                  }
                }}
              />
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actionRow}>
          <Button 
            mode="contained" 
            icon="store-plus" 
            onPress={() => setVendorModalVisible(true)}
            style={[styles.actionBtn, { flex: 1.2 }]}
          >
            Assign Vendor
          </Button>
          <Button
            mode="contained"
            icon="view-dashboard-outline"
            onPress={() => router.push({ pathname: '/utilities/whatsapp/zones/[jid]', params: { jid: stats?.jid, name: stats?.name || name } })}
            style={[styles.actionBtn, { flex: 1.5, backgroundColor: '#075E54' }]}
          >
            Review Zones
          </Button>
          <Button 
            mode="outlined" 
            icon="delete-sweep" 
            onPress={handlePurge}
            loading={purging}
            textColor={theme.colors.error}
            style={[styles.actionBtn, { borderColor: theme.colors.error, flex: 0.8 }]}
          >
            Purge
          </Button>
        </View>

        <Card style={{ backgroundColor: '#075E54' }}>
          <Card.Actions>
            <Button 
              textColor="#fff" 
              icon="sync" 
              onPress={handleSyncHistory} 
              disabled={syncing}
              loading={syncing}
            >
              Manual Sync History
            </Button>
          </Card.Actions>
        </Card>

        <SectionHeader title="Recent Messages" count={messages.length} />
        <Card style={styles.messageCard}>
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>No messages found</Text>
          ) : (
            messages.map((msg, i) => (
              <View key={msg.messageId}>
                <List.Item
                  title={msg.messageText || (msg.mediaType ? `[${msg.mediaType.toUpperCase()}]` : '(no text)')}
                  description={format(new Date(msg.timestamp * 1000), 'MMM d, HH:mm:ss')}
                  left={props => (
                    msg.mediaType === 'image' ? <List.Icon {...props} icon="image" /> :
                    msg.mediaType === 'video' ? <List.Icon {...props} icon="video" /> :
                    <List.Icon {...props} icon="message-text" />
                  )}
                  titleStyle={{ fontSize: 14 }}
                  descriptionStyle={{ fontSize: 11 }}
                />
                {i < messages.length - 1 && <Divider />}
              </View>
            ))
          )}
        </Card>

        <Button 
          mode="text" 
          onPress={() => router.push({ pathname: '/utilities/whatsapp/messages/[jid]', params: { jid: stats?.jid, name: stats?.name || name } })}
          style={styles.fullMessagesBtn}
        >
          View All Messages
        </Button>

        <VendorAssignmentModal
          visible={vendorModalVisible}
          onDismiss={() => setVendorModalVisible(false)}
          jid={stats.jid}
          chatName={stats.name}
          onSuccess={fetchStats}
        />

        <GroupingConfigModal
          visible={groupingModalVisible}
          onDismiss={() => setGroupingModalVisible(false)}
          jid={stats.jid}
          chatName={stats.name}
          initialEnabled={stats.enableMessageGrouping}
          onSuccess={fetchStats}
        />
      </ScrollView>
    </ScreenWrapper>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
      <Text variant="titleMedium" style={{ fontWeight: '700' }}>{title}</Text>
      {count !== undefined && <Text variant="labelSmall" style={{ opacity: 0.5 }}>{count} items</Text>}
    </View>
  );
}

function StatCard({ title, value, details }: { title: string, value: string, details: { label: string, value: string }[] }) {
  return (
    <Card style={styles.statCard}>
      <Card.Content>
        <Text variant="labelSmall" style={{ opacity: 0.5, textTransform: 'uppercase' }}>{title}</Text>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', marginVertical: 4 }}>{value}</Text>
        <View style={{ gap: 4 }}>
          {details.map(d => (
            <View key={d.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="labelSmall" style={{ opacity: 0.5 }}>{d.label}</Text>
              <Text variant="labelSmall" style={{ fontWeight: '600' }}>{d.value}</Text>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text variant="bodyMedium" style={{ opacity: 0.6 }}>{label}</Text>
      <Text variant="bodyMedium" style={{ fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  headerCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  jid: {
    opacity: 0.4,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 1,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 1,
  },
  divider: {
    marginVertical: 8,
  },
  actionBtn: {
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  warningCard: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.2)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  messageCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 1,
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    padding: 24,
    opacity: 0.4,
  },
  fullMessagesBtn: {
    marginTop: 8,
    marginBottom: 20,
  },
});
