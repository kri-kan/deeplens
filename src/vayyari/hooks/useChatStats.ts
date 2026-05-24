import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { waProcessorService, ConversationStats } from '@/services/wa-processor.service';

export function useChatStats(jid: string | undefined) {
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deepSyncLoading, setDeepSyncLoading] = useState(false);
  const [purging, setPurging] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!jid) return;
    try {
      const data = await waProcessorService.fetchConversationStats(decodeURIComponent(jid));
      setStats(data);
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

  const toggleDeepSync = async () => {
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

  const syncHistory = async () => {
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

  const purge = async (onSuccess?: () => void) => {
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
              onSuccess?.();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to purge chat');
            } finally {
              setPurging(false);
            }
          }
        }
      ]
    );
  };

  return {
    stats,
    loading,
    refreshing,
    setRefreshing,
    syncing,
    deepSyncLoading,
    purging,
    fetchStats,
    toggleDeepSync,
    syncHistory,
    purge
  };
}
