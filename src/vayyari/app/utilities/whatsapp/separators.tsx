import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  ActivityIndicator,
  IconButton,
  Surface,
  Divider,
  Switch,
  Portal,
  Modal,
  TextInput,
  Chip,
  Badge,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/layout/Section';
import {
  waProcessorService,
  EmojiSeparator,
  EmojiSeparatorCandidate,
} from '@/services/wa-processor.service';

const POPULAR_EMOJIS = ['🔚', '🛑', '⛔', '🚫', '⏹️', '🔶🔶🔶🔶', '🌸🌸🌸', '🔻🔻🔻', '✨✨✨', '⭐⭐⭐'];

export default function EmojiSeparatorsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [separators, setSeparators] = useState<EmojiSeparator[]>([]);
  const [candidates, setCandidates] = useState<EmojiSeparatorCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resplittingId, setResplittingId] = useState<number | null>(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [patternInput, setPatternInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [autoResplit, setAutoResplit] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [seps, cands] = await Promise.all([
        waProcessorService.fetchEmojiSeparators().catch(() => []),
        waProcessorService.fetchSeparatorCandidates().catch(() => []),
      ]);
      setSeparators(seps);
      setCandidates(cands);
    } catch (err: any) {
      console.warn('Failed to fetch separators:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleToggleActive = async (item: EmojiSeparator) => {
    const nextState = !item.isActive;
    try {
      await waProcessorService.updateEmojiSeparator(item.id, {
        is_active: nextState,
        autoResplit: nextState, // automatically re-split if re-activating
      });
      setSeparators((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, isActive: nextState } : s))
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update separator');
    }
  };

  const handleDelete = (item: EmojiSeparator) => {
    Alert.alert(
      'Delete Separator',
      `Are you sure you want to remove '${item.pattern}' from boundary delimiters?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await waProcessorService.deleteEmojiSeparator(item.id);
              setSeparators((prev) => prev.filter((s) => s.id !== item.id));
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete separator');
            }
          },
        },
      ]
    );
  };

  const handleReSplit = async (item: EmojiSeparator) => {
    setResplittingId(item.id);
    try {
      const res = await waProcessorService.reSplitEmojiSeparator(item.id);
      const resplit = res?.resplitResult;
      Alert.alert(
        'Re-split Completed',
        `Re-partitioned ${resplit?.affectedChats?.length ?? 1} chat(s).\nCreated ${resplit?.zonesCreated ?? 0} zones across ${resplit?.totalMessages ?? 0} messages.`
      );
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to re-split chat messages');
    } finally {
      setResplittingId(null);
    }
  };

  const handleOpenAddModal = (initialPattern = '') => {
    setPatternInput(initialPattern);
    setDescriptionInput('');
    setAutoResplit(true);
    setModalVisible(true);
  };

  const handleSaveSeparator = async () => {
    if (!patternInput.trim()) {
      Alert.alert('Validation Error', 'Please enter an emoji or text separator pattern.');
      return;
    }

    setSaving(true);
    try {
      const res = await waProcessorService.addEmojiSeparator({
        pattern: patternInput.trim(),
        description: descriptionInput.trim() || undefined,
        autoResplit,
      });

      const resplit = res?.resplitResult;
      let msg = `Separator '${patternInput.trim()}' registered successfully.`;
      if (resplit && resplit.affectedChats?.length > 0) {
        msg += `\nRe-split ${resplit.affectedChats.length} chat(s) into ${resplit.zonesCreated} product zones.`;
      }

      Alert.alert('Success', msg);
      setModalVisible(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add separator');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = separators.filter((s) => s.isActive).length;
  const totalMatches = separators.reduce(
    (acc, s) => acc + (s.liveMatches ?? s.matchCount ?? 0),
    0
  );

  const renderSeparatorItem = ({ item }: { item: EmojiSeparator }) => {
    const isResplitting = resplittingId === item.id;
    const matches = item.liveMatches ?? item.matchCount ?? 0;

    return (
      <Surface style={styles.card} elevation={1}>
        <View style={styles.cardHeader}>
          <View style={styles.patternContainer}>
            <Text style={styles.patternText}>{item.pattern}</Text>
            {item.description ? (
              <Text variant="bodySmall" style={styles.descriptionText} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </View>

          <View style={styles.headerRight}>
            <Switch
              value={item.isActive}
              onValueChange={() => handleToggleActive(item)}
              color="#25D366"
            />
          </View>
        </View>

        <Divider style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.statsRow}>
            <Chip
              icon="counter"
              compact
              style={[
                styles.statChip,
                matches > 0 && { backgroundColor: theme.colors.primary + '15' },
              ]}
              textStyle={{ fontSize: 11, fontWeight: '700' }}
            >
              {matches} matches
            </Chip>
            <Chip
              compact
              style={[
                styles.statChip,
                { backgroundColor: item.isActive ? '#dcfce7' : '#f3f4f6' },
              ]}
              textStyle={{
                fontSize: 11,
                color: item.isActive ? '#15803d' : '#6b7280',
                fontWeight: '700',
              }}
            >
              {item.isActive ? 'Active' : 'Inactive'}
            </Chip>
          </View>

          <View style={styles.actionButtons}>
            <Button
              mode="contained-tonal"
              compact
              loading={isResplitting}
              disabled={isResplitting || !item.isActive}
              onPress={() => handleReSplit(item)}
              style={styles.resplitBtn}
              labelStyle={{ fontSize: 11, fontWeight: '700' }}
            >
              {isResplitting ? 'Splitting...' : 'Re-split'}
            </Button>
            <IconButton
              icon="delete-outline"
              size={18}
              iconColor={theme.colors.error}
              onPress={() => handleDelete(item)}
              style={{ margin: 0 }}
            />
          </View>
        </View>
      </Surface>
    );
  };

  return (
    <ScreenWrapper
      title="Emoji & Zone Separators"
      withScrollView={false}
      actions={
        <IconButton
          icon="plus"
          iconColor={theme.colors.primary}
          onPress={() => handleOpenAddModal()}
        />
      }
    >
      <View style={styles.container}>
        {/* Top Summary Stats */}
        <Surface style={styles.summaryBar} elevation={1}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryVal}>{separators.length}</Text>
            <Text style={styles.summaryLbl}>Registered</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryVal, { color: '#16a34a' }]}>{activeCount}</Text>
            <Text style={styles.summaryLbl}>Active</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryVal, { color: theme.colors.primary }]}>{totalMatches}</Text>
            <Text style={styles.summaryLbl}>Total Cuts</Text>
          </View>
        </Surface>

        {/* Candidate Separator Chips */}
        {candidates.length > 0 && (
          <View style={styles.candidatesSection}>
            <Text variant="labelSmall" style={styles.candidatesTitle}>
              DETECTED CANDIDATES IN CHATS (TAP TO REGISTER)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.candidatesRow}>
              {candidates.map((cand) => (
                <Chip
                  key={cand.candidateText}
                  icon="plus"
                  onPress={() => handleOpenAddModal(cand.candidateText)}
                  style={styles.candidateChip}
                  textStyle={{ fontSize: 12, fontWeight: '700' }}
                >
                  {cand.candidateText} ({cand.frequency})
                </Chip>
              ))}
            </ScrollView>
          </View>
        )}

        {/* List of Separators */}
        {loading && !refreshing ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={separators}
            renderItem={renderSeparatorItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={{ opacity: 0.5 }}>
                  No emoji separators registered yet
                </Text>
                <Button mode="contained" onPress={() => handleOpenAddModal()} style={{ marginTop: 16 }}>
                  Add First Separator
                </Button>
              </View>
            }
          />
        )}
      </View>

      {/* Add Separator Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.background }]}
        >
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              Add Zone Separator
            </Text>
            <IconButton icon="close" size={20} onPress={() => setModalVisible(false)} />
          </View>

          <Text variant="bodySmall" style={styles.modalSubtitle}>
            Messages matching this emoji sequence or text will act as hard boundaries between products.
          </Text>

          <View style={styles.quickEmojisRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {POPULAR_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.quickEmojiBtn}
                  onPress={() => setPatternInput(emoji)}
                >
                  <Text style={styles.quickEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TextInput
            mode="outlined"
            label="Separator Pattern / Emojis *"
            value={patternInput}
            onChangeText={setPatternInput}
            placeholder="e.g. 🔚, 🛑, 🔶🔶🔶🔶"
            style={styles.input}
          />

          <TextInput
            mode="outlined"
            label="Description / Vendor Note (Optional)"
            value={descriptionInput}
            onChangeText={setDescriptionInput}
            placeholder="e.g. Fashion Planet product cut emoji"
            style={styles.input}
          />

          <View style={styles.autoResplitRow}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                Auto Re-split Existing Messages
              </Text>
              <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                Immediately split historical chat messages matching this pattern into new product zones
              </Text>
            </View>
            <Switch
              value={autoResplit}
              onValueChange={setAutoResplit}
              color="#25D366"
            />
          </View>

          <View style={styles.modalFooter}>
            <Button mode="text" onPress={() => setModalVisible(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={saving}
              disabled={saving || !patternInput.trim()}
              onPress={handleSaveSeparator}
              style={styles.saveBtn}
            >
              {autoResplit ? 'Register & Re-split' : 'Register Separator'}
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryCol: {
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  summaryLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  candidatesSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  candidatesTitle: {
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 6,
  },
  candidatesRow: {
    gap: 8,
    paddingBottom: 4,
  },
  candidateChip: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patternContainer: {
    flex: 1,
    marginRight: 8,
  },
  patternText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  descriptionText: {
    color: '#64748b',
    marginTop: 2,
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDivider: {
    marginVertical: 10,
    backgroundColor: '#f1f5f9',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  statChip: {
    borderRadius: 12,
    height: 26,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resplitBtn: {
    borderRadius: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  modal: {
    margin: 20,
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontWeight: '800',
  },
  modalSubtitle: {
    opacity: 0.6,
    marginBottom: 14,
  },
  quickEmojisRow: {
    marginBottom: 14,
  },
  quickEmojiBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  quickEmojiText: {
    fontSize: 18,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  autoResplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  saveBtn: {
    borderRadius: 12,
  },
});
