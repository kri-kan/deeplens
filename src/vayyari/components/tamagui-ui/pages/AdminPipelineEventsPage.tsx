import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LuArrowLeft,
  LuRefreshCw,
  LuSearch,
  LuX,
  LuExternalLink,
  LuMessageCircle,
  LuActivity,
  LuSparkles,
  LuLayers,
  LuTag,
} from '../icons/lu';
import { useTheme } from '@/theme';
import {
  PipelineEventsResponse,
  PipelineAuditEvent,
  PipelineActiveQueueItem,
  PipelineEventCatalogItem,
  PipelineMetricGauges,
} from '@/services/wa-processor.service';

export interface AdminPipelineEventsPageProps {
  data?: PipelineEventsResponse | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack?: () => void;
  onOpenChat?: (jid: string) => void;
  onOpenProduct?: (productId: string) => void;
  onForcePromote?: (groupId: string) => void;
  forcePromotingId?: string | null;
}

export type PipelineTabMode = 'events' | 'queue' | 'catalog';
export type EventCategoryFilter = 'all' | 'split_merge' | 'product_create' | 'media_sync' | 'error';

export const AdminPipelineEventsPage: React.FC<AdminPipelineEventsPageProps> = ({
  data,
  loading = false,
  refreshing = false,
  onRefresh,
  onBack,
  onOpenChat,
  onOpenProduct,
  onForcePromote,
  forcePromotingId = null,
}) => {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<PipelineTabMode>('events');
  const [categoryFilter, setCategoryFilter] = useState<EventCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Filtered Live Events
  const filteredEvents = useMemo(() => {
    return (data?.recentEvents || []).filter((e) => {
      if (categoryFilter === 'split_merge' && e.category !== 'split_merge') return false;
      if (categoryFilter === 'product_create' && e.category !== 'product_create') return false;
      if (categoryFilter === 'media_sync' && e.category !== 'media_sync') return false;
      if (categoryFilter === 'error' && e.category !== 'error') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (e.productCode && e.productCode.toLowerCase().includes(q)) ||
        (e.chatName && e.chatName.toLowerCase().includes(q)) ||
        (e.vendorName && e.vendorName.toLowerCase().includes(q)) ||
        (e.event && e.event.toLowerCase().includes(q)) ||
        (e.purposeDescription && e.purposeDescription.toLowerCase().includes(q)) ||
        (e.groupId && e.groupId.toLowerCase().includes(q))
      );
    });
  }, [data?.recentEvents, categoryFilter, searchQuery]);

  // 2. Filtered Queue
  const filteredQueue = useMemo(() => {
    return (data?.activeQueue || []).filter((qItem) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (qItem.productCode && qItem.productCode.toLowerCase().includes(q)) ||
        (qItem.chatName && qItem.chatName.toLowerCase().includes(q)) ||
        (qItem.vendorName && qItem.vendorName.toLowerCase().includes(q)) ||
        (qItem.groupId && qItem.groupId.toLowerCase().includes(q)) ||
        (qItem.status && qItem.status.toLowerCase().includes(q))
      );
    });
  }, [data?.activeQueue, searchQuery]);

  // Helper for badge style
  const getEventBadge = (event: string) => {
    switch (event) {
      case 'split':
        return { label: 'SPLIT', bg: '#0284C7', text: '#FFFFFF' };
      case 'merged':
        return { label: 'MERGED', bg: '#0369A1', text: '#FFFFFF' };
      case 'product_created':
        return { label: 'CREATED', bg: '#059669', text: '#FFFFFF' };
      case 'product_create_sent':
        return { label: 'PROMOTING', bg: '#10B981', text: '#FFFFFF' };
      case 'reprocess_triggered':
        return { label: 'REPROCESS', bg: '#D97706', text: '#FFFFFF' };
      case 'media_added':
        return { label: 'MEDIA SYNC', bg: '#7C3AED', text: '#FFFFFF' };
      default:
        return { label: event.toUpperCase(), bg: '#334155', text: '#E2E8F0' };
    }
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = d.getDate();
      const month = months[d.getMonth()];
      const hrs = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      const secs = d.getSeconds().toString().padStart(2, '0');
      return `${day} ${month}, ${hrs}:${mins}:${secs}`;
    } catch {
      return iso;
    }
  };

  return (
    <YStack flex={1} backgroundColor="#0B0F19" paddingTop={insets.top}>
      {/* ── Top App Bar ── */}
      <XStack
        justifyContent="space-between"
        alignItems="center"
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderBottomWidth={1}
        borderBottomColor="#1F2937"
        backgroundColor="#0B0F19"
      >
        <XStack alignItems="center" gap="$3">
          {onBack ? (
            <Pressable onPress={onBack} style={styles.iconButton}>
              <LuArrowLeft size={20} color="#FFFFFF" />
            </Pressable>
          ) : null}
          <YStack>
            <XStack alignItems="center" gap="$2">
              <Text fontSize={17} fontWeight="800" color="#FFFFFF" letterSpacing={0.2}>
                Global Pipeline & Queued Events
              </Text>
            </XStack>
            <Text fontSize={11} color="#94A3B8">
              Kafka Bus &bull; Staging Buffers &bull; .NET Ingestion
            </Text>
          </YStack>
        </XStack>

        {onRefresh ? (
          <Pressable
            onPress={onRefresh}
            disabled={refreshing}
            style={[styles.iconButton, refreshing && styles.iconButtonDisabled]}
          >
            <LuRefreshCw size={18} color={refreshing ? '#6B7280' : '#10B981'} />
          </Pressable>
        ) : null}
      </XStack>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" /> : undefined
        }
      >
        {/* ── 1. Top System Metric Stat Cards ── */}
        <XStack flexWrap="wrap" gap="$2.5" paddingHorizontal="$3" paddingTop="$3">
          <View style={[styles.statCard, { borderTopColor: '#3B82F6' }]}>
            <Text style={styles.statLabel}>STAGING BUFFER</Text>
            <Text style={[styles.statValue, { color: '#60A5FA' }]}>
              {data?.metrics?.stagingCount ?? 0}
            </Text>
            <Text style={styles.statSub}>Zones awaiting 45s window</Text>
          </View>

          <View style={[styles.statCard, { borderTopColor: '#10B981' }]}>
            <Text style={styles.statLabel}>AWAITING WORKER</Text>
            <Text style={[styles.statValue, { color: '#34D399' }]}>
              {data?.metrics?.awaitingCreationCount ?? 0}
            </Text>
            <Text style={styles.statSub}>Dispatched on Kafka queue</Text>
          </View>

          <View style={[styles.statCard, { borderTopColor: '#A855F7' }]}>
            <Text style={styles.statLabel}>MEDIA SYNCING</Text>
            <Text style={[styles.statValue, { color: '#C084FC' }]}>
              {data?.metrics?.pendingMediaSyncCount ?? 0}
            </Text>
            <Text style={styles.statSub}>Late-arriving photo/video sync</Text>
          </View>

          <View style={[styles.statCard, { borderTopColor: '#EF4444' }]}>
            <Text style={styles.statLabel}>ATTENTION / ERRORS</Text>
            <Text style={[styles.statValue, { color: '#F87171' }]}>
              {data?.metrics?.errorCount ?? 0}
            </Text>
            <Text style={styles.statSub}>Stalled or ingestion failure</Text>
          </View>
        </XStack>

        {/* ── 2. Segmented Pill Tabs ── */}
        <XStack
          backgroundColor="#111827"
          marginHorizontal="$3"
          marginTop="$3"
          borderRadius="$3"
          padding="$1"
          borderWidth={1}
          borderColor="#1F2937"
        >
          <Pressable
            style={[styles.segmentTab, activeTab === 'events' && styles.segmentTabActive]}
            onPress={() => setActiveTab('events')}
          >
            <Text style={[styles.segmentText, activeTab === 'events' && styles.segmentTextActive]}>
              Live Events Feed ({filteredEvents.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentTab, activeTab === 'queue' && styles.segmentTabActive]}
            onPress={() => setActiveTab('queue')}
          >
            <Text style={[styles.segmentText, activeTab === 'queue' && styles.segmentTextActive]}>
              Active Queue ({filteredQueue.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentTab, activeTab === 'catalog' && styles.segmentTabActive]}
            onPress={() => setActiveTab('catalog')}
          >
            <Text style={[styles.segmentText, activeTab === 'catalog' && styles.segmentTextActive]}>
              Catalog ({data?.catalog?.length ?? 0})
            </Text>
          </Pressable>
        </XStack>

        {/* ── 3. Search & Filter Bar ── */}
        <YStack paddingHorizontal="$3" paddingTop="$2.5" gap="$2">
          <XStack
            backgroundColor="#111827"
            borderRadius="$3"
            borderWidth={1}
            borderColor="#1F2937"
            alignItems="center"
            paddingHorizontal="$3"
            height={40}
          >
            <LuSearch size={16} color="#64748B" />
            <TextInput
              placeholder="Search SKU, Chat, Vendor, or ID..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <LuX size={16} color="#94A3B8" />
              </Pressable>
            ) : null}
          </XStack>

          {activeTab === 'events' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipScroll}>
              {[
                { key: 'all', label: 'All Events' },
                { key: 'split_merge', label: '✂️ Split & Merge' },
                { key: 'product_create', label: '🏷️ Product Promotions' },
                { key: 'media_sync', label: '📷 Media Sync' },
                { key: 'error', label: '⚠️ Errors' },
              ].map((chip) => {
                const isSelected = categoryFilter === chip.key;
                return (
                  <Pressable
                    key={chip.key}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setCategoryFilter(chip.key as EventCategoryFilter)}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </YStack>

        {/* ── 4. Main Tab Contents ── */}
        {loading && !refreshing ? (
          <YStack alignItems="center" justifyContent="center" paddingVertical="$10" gap="$2">
            <ActivityIndicator size="large" color="#10B981" />
            <Text fontSize={13} color="#94A3B8">
              Streaming pipeline events...
            </Text>
          </YStack>
        ) : activeTab === 'events' ? (
          <YStack paddingHorizontal="$3" paddingTop="$2.5" gap="$2.5">
            {filteredEvents.length === 0 ? (
              <YStack alignItems="center" paddingVertical="$10" gap="$1">
                <Text fontSize={14} color="#64748B" fontWeight="600">
                  No matching pipeline events.
                </Text>
                <Text fontSize={12} color="#475569">
                  Events will appear here as chats are split, merged, or promoted.
                </Text>
              </YStack>
            ) : (
              filteredEvents.map((item) => {
                const badge = getEventBadge(item.event);
                return (
                  <YStack key={item.id} style={styles.eventCard}>
                    {/* Header */}
                    <XStack justifyContent="space-between" alignItems="center">
                      <XStack alignItems="center" gap="$2">
                        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                        </View>
                        {item.productCode ? (
                          <XStack style={styles.skuBadge}>
                            <LuTag size={12} color="#38BDF8" style={{ marginRight: 4 }} />
                            <Text style={styles.skuText}>{item.productCode}</Text>
                          </XStack>
                        ) : null}
                      </XStack>
                      <Text style={styles.timeText}>{formatTimestamp(item.occurredAt)}</Text>
                    </XStack>

                    {/* Description */}
                    <Text style={styles.purposeText}>{item.purposeDescription}</Text>

                    {/* Meta line */}
                    <XStack flexWrap="wrap" gap="$3" marginTop="$1">
                      {item.chatName ? (
                        <Text style={styles.metaItem}>💬 {item.chatName}</Text>
                      ) : null}
                      {item.vendorName ? (
                        <Text style={styles.metaItem}>🏢 {item.vendorName}</Text>
                      ) : null}
                      <Text style={styles.metaItem}>👤 {item.actor}</Text>
                      {item.mediaCount > 0 || item.textCount > 0 ? (
                        <Text style={styles.metaItem}>
                          📷 {item.mediaCount}m &bull; 📝 {item.textCount}t
                        </Text>
                      ) : null}
                    </XStack>

                    {/* Error Banner */}
                    {item.errorDetail ? (
                      <YStack style={styles.errorBox}>
                        <Text style={styles.errorText} numberOfLines={2}>
                          ⚠️ {item.errorDetail}
                        </Text>
                      </YStack>
                    ) : null}

                    {/* Actions */}
                    <XStack justifyContent="flex-end" gap="$3" marginTop="$2" borderTopWidth={1} borderTopColor="#1F2937" paddingTop="$2">
                      {item.jid && onOpenChat ? (
                        <Pressable onPress={() => onOpenChat(item.jid!)} style={styles.linkButton}>
                          <LuMessageCircle size={14} color="#38BDF8" />
                          <Text style={styles.linkText}>Open Chat</Text>
                        </Pressable>
                      ) : null}
                      {item.productId && onOpenProduct ? (
                        <Pressable onPress={() => onOpenProduct(item.productId!)} style={styles.linkButton}>
                          <LuExternalLink size={14} color="#34D399" />
                          <Text style={[styles.linkText, { color: '#34D399' }]}>View Product</Text>
                        </Pressable>
                      ) : null}
                    </XStack>
                  </YStack>
                );
              })
            )}
          </YStack>
        ) : activeTab === 'queue' ? (
          <YStack paddingHorizontal="$3" paddingTop="$2.5" gap="$2.5">
            {filteredQueue.length === 0 ? (
              <YStack alignItems="center" paddingVertical="$10" gap="$1">
                <Text fontSize={14} color="#10B981" fontWeight="600">
                  Queue is clear!
                </Text>
                <Text fontSize={12} color="#64748B">
                  All message groups processed into products.
                </Text>
              </YStack>
            ) : (
              filteredQueue.map((item) => {
                const isError = item.status === 'error' || item.status === 'enrichment_failed';
                const isStaging = item.status === 'staging';
                const isSent = item.status === 'product_create_sent';

                let statusLabel = item.status.toUpperCase();
                let statusBg = '#334155';
                let statusColor = '#94A3B8';
                if (isError) {
                  statusLabel = 'FAILED';
                  statusBg = '#450A0A';
                  statusColor = '#F87171';
                } else if (isStaging) {
                  statusLabel = 'STAGING (BUFFER)';
                  statusBg = '#1E3A8A';
                  statusColor = '#60A5FA';
                } else if (isSent) {
                  statusLabel = 'AWAITING WORKER';
                  statusBg = '#064E3B';
                  statusColor = '#34D399';
                }

                return (
                  <YStack key={item.groupId} style={styles.queueCard}>
                    <XStack justifyContent="space-between" alignItems="center">
                      <XStack alignItems="center" gap="$2">
                        <View style={[styles.badge, { backgroundColor: statusBg }]}>
                          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                        {item.productCode ? (
                          <XStack style={styles.skuBadge}>
                            <LuTag size={12} color="#38BDF8" style={{ marginRight: 4 }} />
                            <Text style={styles.skuText}>{item.productCode}</Text>
                          </XStack>
                        ) : null}
                        {item.hasPendingMedia ? (
                          <View style={[styles.badge, { backgroundColor: '#3B0764' }]}>
                            <Text style={[styles.badgeText, { color: '#C084FC' }]}>SYNCING MEDIA</Text>
                          </View>
                        ) : null}
                      </XStack>
                      <Text style={styles.timeText}>{formatTimestamp(item.updatedAt)}</Text>
                    </XStack>

                    <Text style={styles.queueDescText} numberOfLines={2}>
                      {item.description || 'No caption or description'}
                    </Text>

                    <XStack flexWrap="wrap" gap="$3">
                      <Text style={styles.metaItem}>💬 {item.chatName || item.jid.substring(0, 15)}</Text>
                      {item.vendorName ? <Text style={styles.metaItem}>🏢 {item.vendorName}</Text> : null}
                      <Text style={styles.metaItem}>📷 {item.mediaCount}m &bull; 📝 {item.textCount}t</Text>
                    </XStack>

                    {item.errorDetail ? (
                      <YStack style={styles.errorBox}>
                        <Text style={styles.errorText} numberOfLines={2}>
                          ⚠️ {item.errorDetail}
                        </Text>
                      </YStack>
                    ) : null}

                    <XStack justifyContent="space-between" alignItems="center" marginTop="$2" borderTopWidth={1} borderTopColor="#1F2937" paddingTop="$2">
                      {onOpenChat ? (
                        <Pressable onPress={() => onOpenChat(item.jid)} style={styles.secondaryButton}>
                          <Text style={styles.secondaryButtonText}>Review in Chat</Text>
                        </Pressable>
                      ) : <View />}

                      {isStaging && onForcePromote ? (
                        <Pressable
                          style={[styles.primaryButton, forcePromotingId === item.groupId && styles.primaryButtonDisabled]}
                          disabled={forcePromotingId === item.groupId}
                          onPress={() => onForcePromote(item.groupId)}
                        >
                          {forcePromotingId === item.groupId ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.primaryButtonText}>Force Promote Now</Text>
                          )}
                        </Pressable>
                      ) : null}
                    </XStack>
                  </YStack>
                );
              })
            )}
          </YStack>
        ) : (
          <YStack paddingHorizontal="$3" paddingTop="$2.5" gap="$2.5">
            {(data?.catalog || []).map((cat) => (
              <YStack key={cat.topic} style={styles.catalogCard}>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text style={styles.catalogName}>{cat.name}</Text>
                  <View style={[styles.priorityPill, cat.priority === 'Immediate' ? { backgroundColor: '#450A0A' } : { backgroundColor: '#0C4A6E' }]}>
                    <Text style={[styles.priorityText, cat.priority === 'Immediate' ? { color: '#F87171' } : { color: '#38BDF8' }]}>
                      {cat.priority}
                    </Text>
                  </View>
                </XStack>

                <Text style={styles.catalogTopic}>Topic: {cat.topic}</Text>

                <XStack justifyContent="space-between" marginVertical="$1">
                  <Text style={styles.catalogLabel}>Flow:</Text>
                  <Text style={styles.catalogValue}>{cat.direction}</Text>
                </XStack>
                <XStack justifyContent="space-between" marginVertical="$1">
                  <Text style={styles.catalogLabel}>Consumer:</Text>
                  <Text style={styles.catalogValue}>{cat.consumer}</Text>
                </XStack>

                <YStack style={styles.catalogDivider} />

                <Text style={styles.catalogSectionTitle}>PURPOSE</Text>
                <Text style={styles.catalogBody}>{cat.purpose}</Text>

                <Text style={[styles.catalogSectionTitle, { marginTop: 6 }]}>TRIGGER</Text>
                <Text style={[styles.catalogBody, { color: '#38BDF8' }]}>{cat.trigger}</Text>
              </YStack>
            ))}
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderTopWidth: 3,
    borderRadius: 12,
    padding: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 2,
  },
  statSub: {
    fontSize: 10,
    color: '#64748B',
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentTabActive: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    height: 36,
    color: '#F8FAFC',
    fontSize: 12,
    marginLeft: 8,
  },
  filterChipScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#38BDF8',
  },
  filterChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  eventCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 12,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  skuBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C4A6E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skuText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
  },
  timeText: {
    fontSize: 10,
    color: '#64748B',
  },
  purposeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  metaItem: {
    fontSize: 11,
    color: '#94A3B8',
  },
  errorBox: {
    backgroundColor: '#450A0A',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    borderRadius: 6,
    padding: 6,
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#FCA5A5',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  linkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38BDF8',
  },
  queueCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 12,
    gap: 6,
  },
  queueDescText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontStyle: 'italic',
  },
  secondaryButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryButtonText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  catalogCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 14,
    gap: 4,
  },
  catalogName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  catalogTopic: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#64748B',
    marginBottom: 4,
  },
  priorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '700',
  },
  catalogLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  catalogValue: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  catalogDivider: {
    height: 1,
    backgroundColor: '#1F2937',
    marginVertical: 6,
  },
  catalogSectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  catalogBody: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
});
