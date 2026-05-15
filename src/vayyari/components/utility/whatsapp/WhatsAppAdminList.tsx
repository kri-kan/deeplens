import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import {
  Text,
  Searchbar,
  Card,
  IconButton,
  Checkbox,
  Button,
  useTheme,
  ActivityIndicator,
  Divider,
  Menu,
  Portal,
  Modal,
  RadioButton,
  Surface,
} from 'react-native-paper';
import { router } from 'expo-router';
import { waProcessorService, Chat, Group, PaginatedResponse, ProcessingState } from '@/services/wa-processor.service';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';

interface WhatsAppAdminProps {
  type: 'chats' | 'groups' | 'announcements';
  title: string;
}

export function WhatsAppAdminList({ type, title }: WhatsAppAdminProps) {
  const theme = useTheme();
  const [items, setItems] = useState<(Chat | Group)[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterExcluded, setFilterExcluded] = useState<boolean | undefined>(undefined);
  const [total, setTotal] = useState(0);
  const [syncingJids, setSyncingJids] = useState<Set<string>>(new Set());
  
  const [processingState, setProcessingState] = useState<ProcessingState | null>(null);
  const [updatingState, setUpdatingState] = useState(false);

  // Resume Modal State
  const [resumeModalVisible, setResumeModalVisible] = useState(false);
  const [pendingResumeJid, setPendingResumeJid] = useState<string | null>(null);
  const [resumeMode, setResumeMode] = useState<'from_last' | 'from_now'>('from_last');

  const fetchState = useCallback(async () => {
    try {
      const s = await waProcessorService.fetchProcessingState();
      setProcessingState(s);
    } catch (err) {
      console.error('Failed to fetch processing state', err);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      let res: PaginatedResponse<Chat | Group>;
      if (type === 'chats') {
        res = await waProcessorService.fetchChats(100, 0, search, filterExcluded);
      } else if (type === 'groups') {
        res = await waProcessorService.fetchGroups(100, 0, search, filterExcluded);
      } else {
        res = await waProcessorService.fetchAnnouncements(100, 0, search, filterExcluded);
      }
      setItems(res.items);
      setTotal(res.total);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to fetch items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type, search, filterExcluded]);

  useEffect(() => {
    fetchItems();
    fetchState();
  }, [fetchItems, fetchState]);

  const handleGlobalSyncToggle = async (val: boolean) => {
    if (!processingState) return;
    setUpdatingState(true);
    try {
      const payload = {
        trackChats: processingState.trackChats,
        trackGroups: processingState.trackGroups,
        trackAnnouncements: processingState.trackAnnouncements,
        [type === 'chats' ? 'trackChats' : type === 'groups' ? 'trackGroups' : 'trackAnnouncements']: val
      };
      const newState = await waProcessorService.updateSyncSettings(payload);
      setProcessingState(newState);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Toggle failed');
    } finally {
      setUpdatingState(false);
    }
  };

  const handleToggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleExclude = async (jid: string) => {
    try {
      await waProcessorService.excludeChat(jid);
      await fetchItems();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to exclude');
    }
  };

  const handleInclude = (jid: string) => {
    setPendingResumeJid(jid);
    setResumeModalVisible(true);
  };

  const confirmInclude = async () => {
    if (!pendingResumeJid) return;
    try {
      await waProcessorService.includeChat(pendingResumeJid, resumeMode);
      setResumeModalVisible(false);
      setPendingResumeJid(null);
      await fetchItems();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to include');
    }
  };

  const handleBulkExclude = async () => {
    if (selectedIds.size === 0) return;
    try {
      await waProcessorService.bulkExcludeChats(Array.from(selectedIds));
      setSelectedIds(new Set());
      await fetchItems();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed bulk exclude');
    }
  };

  const handleBulkPurge = async () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      'Purge Messages',
      `Permanently delete all messages for ${selectedIds.size} selected conversations? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Purge All', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await waProcessorService.bulkPurgeMessages(Array.from(selectedIds));
              setSelectedIds(new Set());
              Alert.alert('Success', 'Messages purged successfully');
              await fetchItems();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed bulk purge');
            }
          }
        }
      ]
    );
  };

  const handleToggleDeepSync = async (jid: string, current: boolean) => {
    setSyncingJids(prev => new Set(prev).add(jid));
    try {
      await waProcessorService.toggleDeepSync(jid, !current);
      await fetchItems();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to toggle deep sync');
    } finally {
      setSyncingJids(prev => {
        const next = new Set(prev);
        next.delete(jid);
        return next;
      });
    }
  };

  const renderItem = ({ item }: { item: Chat | Group }) => {
    const isExcluded = item.isExcluded;
    const name = item.name;
    
    return (
      <Card 
        style={styles.card} 
        onPress={() => router.push(`/utilities/whatsapp/${encodeURIComponent(item.id)}`)}
        onLongPress={() => handleToggleSelection(item.id)}
      >
        <Card.Content style={styles.cardContent}>
          <Checkbox
            status={selectedIds.has(item.id) ? 'checked' : 'unchecked'}
            onPress={() => handleToggleSelection(item.id)}
          />
          <View style={styles.itemInfo}>
            <Text variant="titleMedium" style={isExcluded ? styles.excludedText : undefined}>
              {name || 'Unnamed'}
            </Text>
            <Text variant="bodySmall" style={styles.jidText}>{item.id}</Text>
          </View>
          <View style={styles.itemActions}>
            {isExcluded ? (
              <IconButton
                icon="plus-circle-outline"
                iconColor={theme.colors.primary}
                onPress={() => handleInclude(item.id)}
              />
            ) : (
              <IconButton
                icon="minus-circle-outline"
                iconColor={theme.colors.error}
                onPress={() => handleExclude(item.id)}
              />
            )}
            <View style={{ width: 40, alignItems: 'center' }}>
              {syncingJids.has(item.id) ? (
                <ActivityIndicator size={16} />
              ) : (
                <IconButton
                  icon={item.deepSyncEnabled ? "sync-circle" : "sync-off"}
                  iconColor={item.deepSyncEnabled ? theme.colors.primary : theme.colors.disabled}
                  size={20}
                  onPress={() => handleToggleDeepSync(item.id, item.deepSyncEnabled)}
                />
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScreenWrapper title={title} withScrollView={false}>
      <View style={styles.header}>
        <View style={styles.topHeader}>
          <View style={{ flex: 1 }}>
            <Searchbar
              placeholder="Search..."
              onChangeText={setSearch}
              value={search}
              style={styles.searchBar}
            />
          </View>
          <View style={styles.syncToggleRow}>
            <Text variant="labelSmall" style={{ opacity: 0.5 }}>SYNC</Text>
            {updatingState ? (
              <ActivityIndicator size={16} style={{ marginLeft: 8 }} />
            ) : (
              <IconButton
                icon={
                  (type === 'chats' ? processingState?.trackChats :
                   type === 'groups' ? processingState?.trackGroups :
                   processingState?.trackAnnouncements) ? "play-circle" : "pause-circle-outline"
                }
                iconColor={
                  (type === 'chats' ? processingState?.trackChats :
                   type === 'groups' ? processingState?.trackGroups :
                   processingState?.trackAnnouncements) ? theme.colors.primary : theme.colors.error
                }
                onPress={() => {
                  const current = (type === 'chats' ? processingState?.trackChats :
                                   type === 'groups' ? processingState?.trackGroups :
                                   processingState?.trackAnnouncements);
                  handleGlobalSyncToggle(!current);
                }}
              />
            )}
          </View>
        </View>
        <View style={styles.filterRow}>
          <Button 
            mode={filterExcluded === undefined ? 'contained' : 'outlined'} 
            onPress={() => setFilterExcluded(undefined)}
            style={styles.filterBtn}
            compact
          >
            All
          </Button>
          <Button 
            mode={filterExcluded === false ? 'contained' : 'outlined'} 
            onPress={() => setFilterExcluded(false)}
            style={styles.filterBtn}
            compact
          >
            Active
          </Button>
          <Button 
            mode={filterExcluded === true ? 'contained' : 'outlined'} 
            onPress={() => setFilterExcluded(true)}
            style={styles.filterBtn}
            compact
          >
            Excluded
          </Button>
        </View>
      </View>

      {selectedIds.size > 0 && (
        <Surface style={styles.bulkActions} elevation={2}>
          <Text variant="labelLarge">{selectedIds.size} selected</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button mode="outlined" textColor={theme.colors.error} onPress={handleBulkPurge} compact>
              Purge
            </Button>
            <Button mode="contained" buttonColor={theme.colors.error} onPress={handleBulkExclude} compact>
              Exclude
            </Button>
          </View>
        </Surface>
      )}

      {loading && !refreshing ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(); }} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <Divider />}
          ListHeaderComponent={
            <Text style={styles.countText}>
              Showing {items.length} of {total} items
            </Text>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No items found</Text>}
        />
      )}

      <Portal>
        <Modal
          visible={resumeModalVisible}
          onDismiss={() => setResumeModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge">Resume Tracking</Text>
          <Text variant="bodyMedium" style={styles.modalHint}>
            Choose how you want to resume tracking for this conversation.
          </Text>
          <RadioButton.Group onValueChange={value => setResumeMode(value as any)} value={resumeMode}>
            <View style={styles.radioItem}>
              <RadioButton value="from_last" />
              <Text>From last seen message (History Sync)</Text>
            </View>
            <View style={styles.radioItem}>
              <RadioButton value="from_now" />
              <Text>From now (Ignore history)</Text>
            </View>
          </RadioButton.Group>
          <View style={styles.modalButtons}>
            <Button onPress={() => setResumeModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={confirmInclude}>Resume</Button>
          </View>
        </Modal>
      </Portal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    gap: 12,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 24,
    paddingLeft: 12,
    height: 48,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    flex: 1,
  },
  bulkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    gap: 12,
  },
  countText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    opacity: 0.5,
    fontSize: 12,
    textAlign: 'right',
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#fff',
    elevation: 0,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 8,
  },
  jidText: {
    opacity: 0.5,
    fontSize: 10,
  },
  excludedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  itemActions: {
    flexDirection: 'row',
  },
  loader: {
    marginTop: 40,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.5,
  },
  modal: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 16,
  },
  modalHint: {
    marginVertical: 12,
    opacity: 0.7,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
});
