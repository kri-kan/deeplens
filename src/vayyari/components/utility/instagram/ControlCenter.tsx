import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Surface, Text, IconButton, Button, SegmentedButtons, Chip, useTheme } from 'react-native-paper';
import { instagramService } from '../../../services/instagram.service';

interface ControlCenterProps {
  visible: boolean;
  onClose: () => void;
  activeQueue: any[];
  jobHistory: any[];
  showHistory: boolean;
  onToggleHistory: (show: boolean) => void;
  onRefresh: () => void;
}

export const ControlCenter: React.FC<ControlCenterProps> = ({
  visible,
  onClose,
  activeQueue,
  jobHistory,
  showHistory,
  onToggleHistory,
  onRefresh,
}) => {
  const theme = useTheme();

  if (!visible) return null;

  const healQueue = async () => {
    try {
      await instagramService.healQueue();
      onRefresh();
    } catch (err) {
      console.error('Failed to heal queue', err);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      await instagramService.deleteJob(jobId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete job', err);
    }
  };

  const updatePriority = async (jobId: string, priority: number) => {
    try {
      await instagramService.updateJob(jobId, { priority });
      onRefresh();
    } catch (err) {
      console.error('Failed to update priority', err);
    }
  };

  return (
    <Surface style={styles.modal} elevation={5}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.bold}>Scraper Control Center</Text>
        <IconButton icon="autorenew" onPress={healQueue} />
      </View>

      <SegmentedButtons
        value={showHistory ? 'history' : 'active'}
        onValueChange={(v) => onToggleHistory(v === 'history')}
        buttons={[
          { value: 'active', label: `Active (${activeQueue.length})` },
          { value: 'history', label: 'History' },
        ]}
        style={styles.segmentedButtons}
      />
      
      <ScrollView>
        {!showHistory ? (
          activeQueue.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.itemMain}>
                <View style={styles.itemTitleRow}>
                  <Text variant="titleSmall" style={styles.bold}>@{item.username}</Text>
                  {item.priority > 1 && <Chip compact textStyle={styles.chipText}>HIGH</Chip>}
                </View>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.origin} • {item.job_type.toUpperCase()} • {item.scraped_count || 0}/{item.target_count === 0 ? 'All' : item.target_count} Posts
                </Text>
              </View>
              <View style={styles.itemActions}>
                <View style={styles.nextRun}>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                    Next: {item.next_run_at ? new Date(item.next_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ASAP'}
                  </Text>
                </View>
                <IconButton icon="arrow-up-bold-outline" size={18} onPress={() => updatePriority(item.id, 10)} />
                <IconButton icon="close" size={18} iconColor={theme.colors.error} onPress={() => deleteJob(item.id)} />
              </View>
            </View>
          ))
        ) : (
          jobHistory.map((item) => (
            <View key={item.id} style={[styles.item, { opacity: 0.8 }]}>
              <View style={styles.itemMain}>
                <Text variant="labelMedium" style={styles.bold}>@{item.username}</Text>
                <Text variant="labelSmall">{item.job_type.toUpperCase()} • {item.status}</Text>
              </View>
              <View style={styles.historyMeta}>
                <Text variant="labelSmall">{new Date(item.completed_at).toLocaleDateString()}</Text>
                <Text variant="labelSmall" style={styles.bold}>{item.scraped_count} Posts</Text>
              </View>
            </View>
          ))
        )}
        {((!showHistory && activeQueue.length === 0) || (showHistory && jobHistory.length === 0)) && (
          <Text style={styles.emptyText}>Nothing to show</Text>
        )}
      </ScrollView>

      <Button mode="contained" onPress={onClose} style={styles.closeButton}>
        Close
      </Button>
    </Surface>
  );
};

const styles = StyleSheet.create({
  modal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bold: {
    fontWeight: 'bold',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  itemMain: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipText: {
    fontSize: 8,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextRun: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  historyMeta: {
    alignItems: 'flex-end',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.5,
  },
  closeButton: {
    marginTop: 16,
  },
});
