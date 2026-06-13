import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Image, FlatList, TouchableOpacity } from 'react-native';
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
  Portal,
  Modal,
  Menu,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { waProcessorService } from '@/services/wa-processor.service';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { format } from 'date-fns';

interface AuditLogEntry {
  id: string;
  groupId: string;
  event: string;
  actor: string;
  oldValue: any;
  newValue: any;
  occurredAt: string;
}

export default function GroupZoneViewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { jid, name } = useLocalSearchParams<{ jid: string; name?: string }>();

  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Menu visibility states indexed by groupId
  const [menuVisible, setMenuVisible] = useState<{ [key: string]: boolean }>({});
  
  // Audit log modal states
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [selectedGroupForAudit, setSelectedGroupForAudit] = useState<{ groupId: string; name: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Message details list expansion
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});

  const fetchGroups = useCallback(async () => {
    if (!jid) return;
    try {
      const data = await waProcessorService.fetchGroupsReview(decodeURIComponent(jid));
      setGroups(data);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to fetch groups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jid]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  const toggleMenu = (groupId: string, visible: boolean) => {
    setMenuVisible(prev => ({ ...prev, [groupId]: visible }));
  };

  const toggleExpandGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Group Status Mappers
  const getGroupStatus = (group: any) => {
    if (group.status === 'ignored') {
      return { label: 'Ignored', color: '#757575', bgColor: 'rgba(117, 117, 117, 0.1)' };
    }
    if (group.status === 'error') {
      return { label: 'Error', color: '#D32F2F', bgColor: 'rgba(211, 47, 47, 0.1)' };
    }
    if (group.status === 'product_created') {
      return { label: 'Product Created', color: '#2E7D32', bgColor: 'rgba(46, 125, 50, 0.1)' };
    }
    if (group.status === 'product_create_sent') {
      return { label: 'Publishing...', color: '#1976D2', bgColor: 'rgba(25, 118, 210, 0.1)' };
    }
    if (group.mediaCount === 0 || group.textCount === 0) {
      return { label: 'Partial', color: '#EF6C00', bgColor: 'rgba(239, 108, 0, 0.1)' };
    }
    return { label: 'Staging', color: '#E0A900', bgColor: 'rgba(224, 169, 0, 0.15)' };
  };

  // Actions
  const handleToggleFlag = async (groupId: string, currentVal: boolean) => {
    toggleMenu(groupId, false);
    try {
      await waProcessorService.toggleGroupProcessProduct(groupId, !currentVal);
      Alert.alert('Success', `Process flag toggled to ${!currentVal ? 'ON' : 'OFF'}`);
      fetchGroups();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to toggle flag');
    }
  };

  const handleToggleIgnore = async (groupId: string, status: string) => {
    toggleMenu(groupId, false);
    const isIgnored = status === 'ignored';
    try {
      await waProcessorService.ignoreGroup(groupId, !isIgnored);
      Alert.alert('Success', `Group is now ${!isIgnored ? 'ignored' : 'active'}`);
      fetchGroups();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to toggle ignore');
    }
  };

  const handleForcePublish = async (groupId: string) => {
    toggleMenu(groupId, false);
    try {
      await waProcessorService.forcePublishGroup(groupId);
      Alert.alert('Success', 'Force publish triggered. The product will be created shortly.');
      fetchGroups();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to force publish');
    }
  };

  const handleSplit = async (groupId: string, messageId: string, groupStatus: string) => {
    const triggerSplit = async () => {
      try {
        setLoading(true);
        await waProcessorService.splitGroupZone(groupId, messageId);
        Alert.alert('Success', 'Group split successfully');
        fetchGroups();
      } catch (err: any) {
        Alert.alert('Error', err?.message ?? 'Failed to split group');
        setLoading(false);
      }
    };

    if (groupStatus === 'product_created') {
      Alert.alert(
        'Reprocess Confirmation',
        'This group already has a product in DeepLens. Splitting will update the existing product and create a new one. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Split & Reprocess', style: 'destructive', onPress: triggerSplit }
        ]
      );
    } else {
      triggerSplit();
    }
  };

  const handleMerge = async (groupId: string, targetGroupId: string, statusA: string, statusB: string) => {
    const triggerMerge = async () => {
      try {
        setLoading(true);
        await waProcessorService.mergeGroupZones(groupId, targetGroupId);
        Alert.alert('Success', 'Groups merged successfully');
        fetchGroups();
      } catch (err: any) {
        Alert.alert('Error', err?.message ?? 'Failed to merge groups');
        setLoading(false);
      }
    };

    if (statusA === 'product_created' || statusB === 'product_created') {
      Alert.alert(
        'Reprocess Confirmation',
        'One of these groups already has a product in DeepLens. Merging will update the existing product and deactivate the merged group. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Merge & Reprocess', style: 'destructive', onPress: triggerMerge }
        ]
      );
    } else {
      triggerMerge();
    }
  };

  const openAuditLog = async (groupId: string) => {
    toggleMenu(groupId, false);
    setSelectedGroupForAudit({ groupId, name: groupId.substring(0, 8) });
    setAuditModalVisible(true);
    setLoadingAudit(true);
    try {
      const logs = await waProcessorService.fetchGroupAuditLog(groupId);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch audit log');
    } finally {
      setLoadingAudit(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper title="Product Zones">
        <ActivityIndicator style={{ marginTop: 40 }} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title={`${name || 'Chat'} Zones`}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.container}
      >
        {groups.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={1}>
            <Text style={styles.emptyText}>No product groups detected for this chat.</Text>
            <Text style={styles.emptySubtext}>Make sure message grouping is enabled and messages are arriving.</Text>
          </Surface>
        ) : (
          groups.map((group, index) => {
            const statusConfig = getGroupStatus(group);
            const isExpanded = !!expandedGroups[group.groupId];
            const hasPrev = index > 0;
            const prevGroup = hasPrev ? groups[index - 1] : null;

            return (
              <View key={group.groupId}>
                {/* Merge Divider */}
                {hasPrev && (
                  <View style={styles.mergeDividerContainer}>
                    <Button
                      mode="outlined"
                      icon="arrow-collapse-up"
                      compact
                      style={styles.mergeBtn}
                      labelStyle={{ fontSize: 11 }}
                      onPress={() => handleMerge(group.groupId, prevGroup.groupId, group.status, prevGroup.status)}
                    >
                      Merge with Zone Above
                    </Button>
                  </View>
                )}

                {/* Group Card */}
                <Card style={styles.zoneCard}>
                  <Card.Content style={{ paddingBottom: 8 }}>
                    {/* Header Row */}
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Chip
                          textStyle={{ color: statusConfig.color, fontWeight: '700', fontSize: 11 }}
                          style={{ backgroundColor: statusConfig.bgColor, height: 26, justifyContent: 'center' }}
                        >
                          {statusConfig.label}
                        </Chip>
                        <Text variant="bodySmall" style={styles.groupIdText}>
                          ID: {group.groupId.substring(0, 8)}
                        </Text>
                      </View>

                      {/* Action Menu */}
                      <Menu
                        visible={!!menuVisible[group.groupId]}
                        onDismiss={() => toggleMenu(group.groupId, false)}
                        anchor={
                          <IconButton
                            icon="dots-vertical"
                            size={18}
                            onPress={() => toggleMenu(group.groupId, true)}
                            style={{ margin: 0 }}
                          />
                        }
                      >
                        <Menu.Item
                          onPress={() => handleToggleFlag(group.groupId, group.processAsProduct)}
                          title={group.processAsProduct ? "Disable Process Flag" : "Enable Process Flag"}
                          leadingIcon="flag-outline"
                        />
                        <Menu.Item
                          onPress={() => handleToggleIgnore(group.groupId, group.status)}
                          title={group.status === 'ignored' ? "Activate Zone" : "Ignore Zone"}
                          leadingIcon="eye-off-outline"
                        />
                        <Menu.Item
                          onPress={() => handleForcePublish(group.groupId)}
                          title="Force Publish"
                          leadingIcon="publish"
                        />
                        <Divider />
                        <Menu.Item
                          onPress={() => openAuditLog(group.groupId)}
                          title="View Audit Log"
                          leadingIcon="history"
                        />
                      </Menu>
                    </View>

                    {/* Metadata summary */}
                    <View style={styles.metaRow}>
                      <Text variant="bodyMedium" style={styles.metaText}>
                        {group.category ? `${group.category} > ${group.subCategory || 'General'}` : 'Uncategorized'}
                      </Text>
                      <Text variant="bodyMedium" style={[styles.metaText, { fontWeight: '700' }]}>
                        {group.detectedPrice ? `₹${group.detectedPrice}` : 'Price Pending'}
                        {group.detectedShipping ? ` (${group.detectedShipping} ship)` : ''}
                      </Text>
                    </View>

                    <Text variant="bodySmall" style={styles.countsText}>
                      {group.mediaCount} media • {group.textCount} messages • Last updated {format(new Date(group.lastMessageAt), 'MMM d, HH:mm')}
                    </Text>

                    {group.errorDetail && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>⚠️ {group.errorDetail}</Text>
                      </View>
                    )}

                    <Divider style={styles.divider} />

                    {/* Media Thumbnail Row */}
                    {group.messages.some((m: any) => m.mediaUrl) ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                        {group.messages
                          .filter((m: any) => m.mediaUrl)
                          .map((m: any) => (
                            <View key={m.messageId} style={styles.thumbnailContainer}>
                              {m.mediaType === 'image' || m.mediaType === 'photo' ? (
                                <Image source={{ uri: m.mediaUrl }} style={styles.thumbnail} />
                              ) : (
                                <View style={[styles.thumbnail, styles.videoPlaceholder]}>
                                  <IconButton icon="play-circle" size={24} iconColor="#fff" style={{ margin: 0 }} />
                                </View>
                              )}
                            </View>
                          ))}
                      </ScrollView>
                    ) : (
                      <Text style={styles.noMediaText}>No media files in this zone</Text>
                    )}

                    {/* Aggregated Text/Description preview */}
                    <Text variant="bodyMedium" numberOfLines={3} style={styles.descriptionText}>
                      {group.description || '(No text description detected)'}
                    </Text>

                    <Divider style={styles.divider} />

                    {/* Expandable Message List for Splitting */}
                    <TouchableOpacity onPress={() => toggleExpandGroup(group.groupId)} style={styles.expandHeader}>
                      <Text variant="bodySmall" style={{ fontWeight: '700', color: theme.colors.primary }}>
                        {isExpanded ? 'Hide Messages & Split Options' : 'Show Messages & Split Options'}
                      </Text>
                      <IconButton icon={isExpanded ? "chevron-up" : "chevron-down"} size={16} style={{ margin: 0 }} />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.messagesList}>
                        {group.messages.map((m: any, idx: number) => (
                          <View key={m.messageId} style={styles.messageItem}>
                            <View style={{ flex: 1 }}>
                              <Text variant="labelSmall" style={{ opacity: 0.5 }}>
                                {m.isFromMe ? 'Me' : m.sender || 'Sender'} • {format(new Date(m.timestamp * 1000), 'HH:mm')}
                              </Text>
                              <Text variant="bodySmall" numberOfLines={2}>
                                {m.content || `[${m.mediaType?.toUpperCase() || 'MEDIA'}]`}
                              </Text>
                            </View>
                            {/* Can split at any index except the very first one */}
                            {idx > 0 && (
                              <IconButton
                                icon="content-cut"
                                size={16}
                                iconColor={theme.colors.error}
                                onPress={() => handleSplit(group.groupId, m.messageId, group.status)}
                                style={{ margin: 0 }}
                              />
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </Card.Content>

                  <Card.Actions style={styles.cardActions}>
                    <Button
                      mode="text"
                      icon="history"
                      compact
                      onPress={() => openAuditLog(group.groupId)}
                    >
                      Audit
                    </Button>
                    <Button
                      mode="contained"
                      icon="arrow-right"
                      compact
                      disabled={!group.deeplensProductId}
                      onPress={() => router.push(`/product/${group.deeplensProductId}`)}
                    >
                      View Product
                    </Button>
                  </Card.Actions>
                </Card>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Audit Log Portal Modal */}
      <Portal>
        <Modal
          visible={auditModalVisible}
          onDismiss={() => setAuditModalVisible(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}
        >
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
              Audit Log: {selectedGroupForAudit?.name}
            </Text>
            <IconButton icon="close" size={20} onPress={() => setAuditModalVisible(false)} />
          </View>
          <Divider />

          {loadingAudit ? (
            <ActivityIndicator style={{ padding: 24 }} />
          ) : auditLogs.length === 0 ? (
            <Text style={styles.emptyLogsText}>No audit records found for this group.</Text>
          ) : (
            <FlatList
              data={auditLogs}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <Divider />}
              renderItem={({ item }) => (
                <View style={styles.logItem}>
                  <View style={styles.logMeta}>
                    <Chip style={styles.logChip} textStyle={{ fontSize: 10 }}>
                      {item.event}
                    </Chip>
                    <Text variant="bodySmall" style={styles.logActor}>
                      Actor: {item.actor}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.logTime}>
                    {format(new Date(item.occurredAt), 'MMM d yyyy, HH:mm:ss')}
                  </Text>
                  {item.oldValue && (
                    <Text variant="bodySmall" style={styles.logVal}>
                      Old: {JSON.stringify(item.oldValue)}
                    </Text>
                  )}
                  {item.newValue && (
                    <Text variant="bodySmall" style={styles.logVal}>
                      New: {JSON.stringify(item.newValue)}
                    </Text>
                  )}
                </View>
              )}
              style={{ maxHeight: 300 }}
            />
          )}
        </Modal>
      </Portal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: {
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    opacity: 0.5,
    textAlign: 'center',
  },
  mergeDividerContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  mergeBtn: {
    borderColor: '#075E54',
    borderRadius: 20,
    backgroundColor: 'rgba(7, 94, 84, 0.05)',
  },
  zoneCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 2,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  groupIdText: {
    opacity: 0.4,
    fontFamily: 'monospace',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 14,
  },
  countsText: {
    fontSize: 11,
    opacity: 0.5,
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: 'rgba(211, 47, 47, 0.05)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.1)',
    marginBottom: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
  },
  divider: {
    marginVertical: 8,
  },
  mediaScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  thumbnailContainer: {
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 60,
    height: 60,
  },
  videoPlaceholder: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMediaText: {
    fontSize: 12,
    opacity: 0.4,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  descriptionText: {
    opacity: 0.7,
    fontSize: 13,
    lineHeight: 18,
  },
  expandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  messagesList: {
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0,0,0,0.05)',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  cardActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    backgroundColor: '#fafafa',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  modalContent: {
    margin: 20,
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyLogsText: {
    padding: 24,
    textAlign: 'center',
    opacity: 0.5,
  },
  logItem: {
    paddingVertical: 10,
  },
  logMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logChip: {
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logActor: {
    fontSize: 11,
    fontWeight: '600',
  },
  logTime: {
    fontSize: 10,
    opacity: 0.4,
    marginBottom: 4,
  },
  logVal: {
    fontSize: 11,
    fontFamily: 'monospace',
    opacity: 0.6,
  },
});
