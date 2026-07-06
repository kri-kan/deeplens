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
  Portal,
  Modal,
  RadioButton,
  Surface,
  Tooltip,
} from 'react-native-paper';
import { router } from 'expo-router';
import { waProcessorService, Chat, Group, PaginatedResponse, ProcessingState } from '@/services/wa-processor.service';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';

interface WhatsAppAdminProps {
  type: 'chats' | 'groups' | 'announcements';
  title: string;
}

const PAGE_SIZE = 50;

export function WhatsAppAdminList({ type, title }: WhatsAppAdminProps) {
  const theme = useTheme();
  const [items, setItems] = useState<(Chat | Group)[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterExcluded, setFilterExcluded] = useState<boolean | undefined>(undefined);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
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
      console.warn('Failed to fetch processing state', err);
    }
  }, []);

  // Fetches a specific page and optionally appends to existing items
  const fetchPage = useCallback(async (pageIndex: number, append: boolean) => {
    try {
      const offset = pageIndex * PAGE_SIZE;
      let res: PaginatedResponse<Chat | Group>;
      if (type === 'chats') {
        res = await waProcessorService.fetchChats(PAGE_SIZE, offset, search, filterExcluded);
      } else if (type === 'groups') {
        res = await waProcessorService.fetchGroups(PAGE_SIZE, offset, search, filterExcluded);
      } else {
        res = await waProcessorService.fetchAnnouncements(PAGE_SIZE, offset, search, filterExcluded);
      }
      const newItems = res.items || [];
      setItems(prev => append ? [...prev, ...newItems] : newItems);
      setTotal(res.total);
      setHasMore(offset + newItems.length < res.total);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to fetch items');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [type, search, filterExcluded]);

  // Reset and load page 0 when filters change
  const fetchItems = useCallback(async () => {
    setPage(0);
    setHasMore(true);
    await fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, true);
  }, [loadingMore, hasMore, page, fetchPage]);

  useEffect(() => {
    setLoading(true);
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

  const handleToggleSelection = (jid: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(jid)) {
      newSelected.delete(jid);
    } else {
      newSelected.add(jid);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.jid)));
    }
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
        onPress={() => router.push({ pathname: '/utilities/whatsapp/[jid]', params: { jid: item.jid, name: item.name || '' } })}
        onLongPress={() => handleToggleSelection(item.jid)}
      >
        <Card.Content style={styles.cardContent}>
          <Checkbox
            status={selectedIds.has(item.jid) ? 'checked' : 'unchecked'}
            onPress={() => handleToggleSelection(item.jid)}
          />
          <View style={styles.itemInfo}>
            <Text variant="titleMedium" style={isExcluded ? styles.excludedText : undefined}>
              {name || 'Unnamed'}
            </Text>
            <Text variant="bodySmall" style={styles.jidText}>{item.jid}</Text>
          </View>
          <View style={styles.itemActions}>
            {isExcluded ? (
              <Tooltip title="Resume tracking this conversation">
                <IconButton
                  icon="plus-circle-outline"
                  iconColor={theme.colors.primary}
                  onPress={() => handleInclude(item.jid)}
                />
              </Tooltip>
            ) : (
              <Tooltip title="Stop tracking this conversation (Exclude)">
                <IconButton
                  icon="minus-circle-outline"
                  iconColor={theme.colors.error}
                  onPress={() => handleExclude(item.jid)}
                />
              </Tooltip>
            )}
            <View style={{ width: 40, alignItems: 'center' }}>
              {syncingJids.has(item.jid) ? (
                <ActivityIndicator size={16} />
              ) : (
                <Tooltip title={item.deepSyncEnabled ? "Deep Sync active (Full history & media)" : "Deep Sync off (Metadata only)"}>
                  <IconButton
                    icon={item.deepSyncEnabled ? "sync-circle" : "sync-off"}
                    iconColor={item.deepSyncEnabled ? theme.colors.primary : theme.colors.onSurfaceDisabled}
                    size={20}
                    onPress={() => handleToggleDeepSync(item.jid, item.deepSyncEnabled)}
                  />
                </Tooltip>
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
              <Tooltip title={
                (type === 'chats' ? processingState?.trackChats :
                 type === 'groups' ? processingState?.trackGroups :
                 processingState?.trackAnnouncements) ? "Syncing active" : "Syncing paused"
              }>
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
              </Tooltip>
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
            <Tooltip title="Delete all messages in selected conversations">
              <Button mode="outlined" textColor={theme.colors.error} onPress={handleBulkPurge} compact>
                Purge
              </Button>
            </Tooltip>
            <Tooltip title="Exclude all selected conversations from tracking">
              <Button mode="contained" buttonColor={theme.colors.error} onPress={handleBulkExclude} compact>
                Exclude
              </Button>
            </Tooltip>
          </View>
        </Surface>
      )}

      {loading && !refreshing ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.jid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(); }} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <Divider />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.selectAllRow}>
                <Checkbox
                  status={selectedIds.size === (items || []).length && (items || []).length > 0 ? 'checked' : selectedIds.size > 0 ? 'indeterminate' : 'unchecked'}
                  onPress={handleSelectAll}
                />
                <Text variant="labelSmall">SELECT ALL</Text>
              </View>
              <Text style={styles.countText}>
                Showing {(items || []).length} of {total} items
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={{ paddingVertical: 16 }} /> : null
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
    alignItems: 'center',
    gap: 8,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    opacity: 0.5,
    fontSize: 12,
  },
  list: {
    paddingBottom: 24,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
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
