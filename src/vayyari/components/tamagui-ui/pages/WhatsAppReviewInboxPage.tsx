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
  Image,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LuArrowLeft,
  LuRefreshCw,
  LuSearch,
  LuX,
  LuTriangleAlert,
  LuCheck,
  LuBan,
  LuSparkles,
  LuEye,
  LuInbox,
  LuClock,
  LuLayers,
  LuTag,
} from '../icons/lu';
import { useTheme } from '@/theme';
import {
  ReviewInboxResponse,
  ReviewInboxItem,
  ReviewStageCounts,
} from '@/services/wa-processor.service';
import { formatDistanceToNow } from 'date-fns';

export interface WhatsAppReviewInboxPageProps {
  data?: ReviewInboxResponse | null;
  loading?: boolean;
  refreshing?: boolean;
  activeStage?: string;
  onSelectStage?: (stage: string) => void;
  onRefresh?: () => void;
  onBack?: () => void;
  onInspectZone?: (item: ReviewInboxItem) => void;
  onForcePromote?: (item: ReviewInboxItem) => void;
  onIgnore?: (item: ReviewInboxItem) => void;
  onDismiss?: (item: ReviewInboxItem) => void;
  actionLoadingId?: string | null;
}

export interface StagePillItem {
  key: string;
  label: string;
}

export const STAGE_PILLS: StagePillItem[] = [
  { key: 'all', label: 'All' },
  { key: 'zoning', label: 'Zoning' },
  { key: 'media_sync', label: 'Media Sync' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'catalog_ingestion', label: 'Ingestion' },
  { key: 'enrichment', label: 'Enrichment' },
];

export const WhatsAppReviewInboxPage: React.FC<WhatsAppReviewInboxPageProps> = ({
  data,
  loading = false,
  refreshing = false,
  activeStage = 'all',
  onSelectStage,
  onRefresh,
  onBack,
  onInspectZone,
  onForcePromote,
  onIgnore,
  onDismiss,
  actionLoadingId = null,
}) => {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Stage Counts Helper
  const getCountForStage = (key: string): number => {
    if (!data?.stageCounts) return 0;
    const counts = data.stageCounts;
    switch (key) {
      case 'all':
        return counts.all ?? 0;
      case 'zoning':
        return counts.zoning ?? 0;
      case 'media_sync':
        return counts.media_sync ?? 0;
      case 'qualification':
        return counts.qualification ?? 0;
      case 'catalog_ingestion':
        return counts.catalog_ingestion ?? 0;
      case 'enrichment':
        return counts.enrichment ?? 0;
      default:
        return 0;
    }
  };

  // 2. Filtered Items based on search query
  const filteredItems = useMemo(() => {
    const list = data?.items || [];
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter((item) => {
      const matchVendor = item.vendorName?.toLowerCase().includes(q);
      const matchChat = item.chatName?.toLowerCase().includes(q);
      const matchGroupId = item.groupId?.toLowerCase().includes(q);
      const matchError = item.errorDetail?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchStage = item.reviewStage?.toLowerCase().includes(q);
      return matchVendor || matchChat || matchGroupId || matchError || matchDesc || matchStage;
    });
  }, [data?.items, searchQuery]);

  // Stage Badge Configuration
  const getStageBadge = (stage?: string | null) => {
    switch (stage) {
      case 'zoning':
        return { label: 'ZONING', bg: '#0284C7', text: '#FFFFFF' };
      case 'media_sync':
        return { label: 'MEDIA SYNC', bg: '#7C3AED', text: '#FFFFFF' };
      case 'qualification':
        return { label: 'QUALIFICATION', bg: '#D97706', text: '#FFFFFF' };
      case 'catalog_ingestion':
        return { label: 'INGESTION', bg: '#059669', text: '#FFFFFF' };
      case 'enrichment':
        return { label: 'ENRICHMENT', bg: '#DB2777', text: '#FFFFFF' };
      default:
        return { label: (stage || 'STAGE').toUpperCase(), bg: '#334155', text: '#E2E8F0' };
    }
  };

  // Status Badge Configuration
  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case 'needs_review':
        return { label: 'NEEDS REVIEW', bg: 'rgba(217, 119, 6, 0.15)', text: '#F59E0B', border: '#D97706' };
      case 'error':
        return { label: 'ERROR', bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: '#DC2626' };
      case 'ignored':
        return { label: 'IGNORED', bg: 'rgba(100, 116, 139, 0.2)', text: '#94A3B8', border: '#475569' };
      case 'product_created':
        return { label: 'CREATED', bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: '#059669' };
      default:
        return { label: (status || 'PENDING').toUpperCase(), bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA', border: '#3B82F6' };
    }
  };

  const formatTimeDistance = (iso?: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return '';
    }
  };

  const renderReviewCard = ({ item }: { item: ReviewInboxItem }) => {
    const stageBadge = getStageBadge(item.reviewStage);
    const statusBadge = getStatusBadge(item.status);
    const isActionLoading = actionLoadingId === item.groupId;

    return (
      <View style={styles.card}>
        {/* Card Header: Chat, Vendor, Time, GroupId */}
        <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
          <YStack flex={1} gap="$1">
            <XStack alignItems="center" gap="$2" flexWrap="wrap">
              <Text style={styles.chatNameText} numberOfLines={1}>
                {item.chatName || 'WhatsApp Chat'}
              </Text>
              {item.vendorName ? (
                <View style={styles.vendorPill}>
                  <LuTag size={10} color="#93C5FD" />
                  <Text style={styles.vendorText} numberOfLines={1}>
                    {item.vendorName}
                  </Text>
                </View>
              ) : null}
            </XStack>

            <XStack alignItems="center" gap="$2">
              <LuClock size={11} color="#64748B" />
              <Text style={styles.timeText}>
                {formatTimeDistance(item.updatedAt || item.createdAt)}
              </Text>
              <Text style={styles.bulletSeparator}>&bull;</Text>
              <Text style={styles.groupIdText}>
                ID: {item.groupId.substring(0, 8)}
              </Text>
            </XStack>
          </YStack>

          {/* Stage & Status Badges */}
          <XStack alignItems="center" gap="$1.5">
            <View style={[styles.stageBadge, { backgroundColor: stageBadge.bg }]}>
              <Text style={[styles.stageBadgeText, { color: stageBadge.text }]}>
                {stageBadge.label}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusBadge.bg, borderColor: statusBadge.border },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>
                {statusBadge.label}
              </Text>
            </View>
          </XStack>
        </XStack>

        {/* Violation Alert Box: Exact Reason */}
        {item.errorDetail ? (
          <View style={styles.alertBox}>
            <XStack alignItems="center" gap="$2" marginBottom="$1">
              <LuTriangleAlert size={14} color="#F59E0B" />
              <Text style={styles.alertTitle}>Review Violation</Text>
            </XStack>
            <Text style={styles.alertReason}>{item.errorDetail}</Text>
          </View>
        ) : null}

        {/* Media Counts & Sample Thumbnails */}
        <XStack alignItems="center" justifyContent="space-between" marginTop="$1">
          <XStack alignItems="center" gap="$2">
            <View style={styles.countChip}>
              <Text style={styles.countChipText}>
                {item.mediaCount} media
              </Text>
            </View>
            <View style={styles.countChip}>
              <Text style={styles.countChipText}>
                {item.textCount} texts
              </Text>
            </View>
          </XStack>
        </XStack>

        {/* Media Preview Strip (up to 4 thumbnails) */}
        {item.sampleMediaUrls && item.sampleMediaUrls.length > 0 ? (
          <XStack gap="$2" marginVertical="$2" flexWrap="nowrap">
            {item.sampleMediaUrls.slice(0, 4).map((url, idx) => {
              const isLast = idx === 3;
              const remaining = item.sampleMediaUrls.length - 4;
              return (
                <View key={`${item.groupId}-img-${idx}`} style={styles.thumbWrapper}>
                  <Image source={{ uri: url }} style={styles.thumbImage} resizeMode="cover" />
                  {isLast && remaining > 0 ? (
                    <View style={styles.thumbOverlay}>
                      <Text style={styles.thumbOverlayText}>+{remaining}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </XStack>
        ) : (
          <View style={styles.noMediaContainer}>
            <Text style={styles.noMediaText}>No media attachments in this zone</Text>
          </View>
        )}

        {/* Description snippet */}
        {item.description ? (
          <Text numberOfLines={3} style={styles.descSnippet}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.cardDivider} />

        {/* Action Buttons Toolbar */}
        <XStack flexWrap="wrap" gap="$2" justifyContent="flex-end" alignItems="center">
          {/* Inspect Zone */}
          {onInspectZone ? (
            <Pressable
              onPress={() => onInspectZone(item)}
              style={styles.inspectButton}
              accessibilityLabel="Inspect Zone"
            >
              <LuEye size={13} color="#60A5FA" />
              <Text style={styles.inspectButtonText}>Inspect in Chat</Text>
            </Pressable>
          ) : null}

          {/* Ignore / Not a Product */}
          {onIgnore ? (
            <Pressable
              onPress={() => onIgnore(item)}
              disabled={isActionLoading}
              style={[styles.ignoreButton, isActionLoading && styles.buttonDisabled]}
              accessibilityLabel="Ignore group"
            >
              <LuBan size={13} color="#94A3B8" />
              <Text style={styles.ignoreButtonText}>Ignore</Text>
            </Pressable>
          ) : null}

          {/* Dismiss / Mark Reviewed */}
          {onDismiss ? (
            <Pressable
              onPress={() => onDismiss(item)}
              disabled={isActionLoading}
              style={[styles.dismissButton, isActionLoading && styles.buttonDisabled]}
              accessibilityLabel="Dismiss review flag"
            >
              <LuCheck size={13} color="#34D399" />
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </Pressable>
          ) : null}

          {/* Approve & Create */}
          {onForcePromote ? (
            <Pressable
              onPress={() => onForcePromote(item)}
              disabled={isActionLoading}
              style={[styles.approveButton, isActionLoading && styles.buttonDisabled]}
              accessibilityLabel="Approve and Create Product"
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <LuSparkles size={13} color="#FFFFFF" />
                  <Text style={styles.approveButtonText}>Approve & Create</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </XStack>
      </View>
    );
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
                WhatsApp Review Inbox
              </Text>
            </XStack>
            <Text fontSize={11} color="#94A3B8">
              Multi-Stage Flagged Zones &bull; Manual Resolution
            </Text>
          </YStack>
        </XStack>

        {onRefresh ? (
          <Pressable
            onPress={onRefresh}
            disabled={refreshing}
            style={[styles.iconButton, refreshing && styles.buttonDisabled]}
          >
            <LuRefreshCw size={18} color={refreshing ? '#6B7280' : '#10B981'} />
          </Pressable>
        ) : null}
      </XStack>

      {/* ── Stage Filter Pills (Horizontal Scroll) ── */}
      <View style={styles.stageScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stagePillsContainer}
        >
          {STAGE_PILLS.map((stage) => {
            const count = getCountForStage(stage.key);
            const isSelected = activeStage === stage.key;

            return (
              <Pressable
                key={stage.key}
                onPress={() => onSelectStage && onSelectStage(stage.key)}
                style={[
                  styles.stagePill,
                  isSelected && styles.stagePillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.stagePillLabel,
                    isSelected && styles.stagePillLabelSelected,
                  ]}
                >
                  {stage.label}
                </Text>
                <View
                  style={[
                    styles.stageCountBadge,
                    isSelected && styles.stageCountBadgeSelected,
                    count > 0 && !isSelected && styles.stageCountBadgeHighlight,
                  ]}
                >
                  <Text
                    style={[
                      styles.stageCountText,
                      isSelected && styles.stageCountTextSelected,
                      count > 0 && !isSelected && styles.stageCountTextHighlight,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchWrapper}>
        <XStack
          alignItems="center"
          backgroundColor="#111827"
          borderRadius={8}
          borderWidth={1}
          borderColor="#1F2937"
          paddingHorizontal="$3"
          paddingVertical="$2"
          gap="$2"
        >
          <LuSearch size={15} color="#64748B" />
          <TextInput
            placeholder="Search vendor, chat, group ID, error reason..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <LuX size={15} color="#94A3B8" />
            </Pressable>
          ) : null}
        </XStack>
      </View>

      {/* ── Content / List ── */}
      {loading && !refreshing && (!data || !data.items) ? (
        <YStack flex={1} justifyContent="center" alignItems="center" gap="$3">
          <ActivityIndicator size="large" color="#10B981" />
          <Text fontSize={13} color="#94A3B8">
            Loading review queue...
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.groupId}
          renderItem={renderReviewCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#10B981"
                colors={['#10B981']}
              />
            ) : undefined
          }
          ListEmptyComponent={
            <YStack
              alignItems="center"
              justifyContent="center"
              paddingVertical="$8"
              paddingHorizontal="$4"
              gap="$3"
            >
              <View style={styles.emptyIconContainer}>
                <LuInbox size={36} color="#10B981" />
              </View>
              <Text fontSize={16} fontWeight="700" color="#F8FAFC">
                {searchQuery.trim() ? 'No Matching Items' : 'Review Queue Clear'}
              </Text>
              <Text fontSize={12} color="#94A3B8" textAlign="center" maxWidth={300} lineHeight={18}>
                {searchQuery.trim()
                  ? `No flagged groups matched "${searchQuery}". Try clearing your search query.`
                  : activeStage === 'all'
                  ? 'All product groups are processing smoothly. No items currently require manual review.'
                  : `No items requiring review in the "${STAGE_PILLS.find((p) => p.key === activeStage)?.label}" stage.`}
              </Text>
              {onRefresh ? (
                <Pressable onPress={onRefresh} style={styles.emptyRefreshButton}>
                  <LuRefreshCw size={14} color="#10B981" />
                  <Text style={styles.emptyRefreshText}>Check for Updates</Text>
                </Pressable>
              ) : null}
            </YStack>
          }
        />
      )}
    </YStack>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  stageScrollWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    backgroundColor: '#0E1424',
  },
  stagePillsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  stagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  stagePillSelected: {
    backgroundColor: '#1E293B',
    borderColor: '#38BDF8',
  },
  stagePillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  stagePillLabelSelected: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  stageCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#1F2937',
  },
  stageCountBadgeSelected: {
    backgroundColor: '#0284C7',
  },
  stageCountBadgeHighlight: {
    backgroundColor: 'rgba(217, 119, 6, 0.25)',
  },
  stageCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  stageCountTextSelected: {
    color: '#FFFFFF',
  },
  stageCountTextHighlight: {
    color: '#F59E0B',
  },
  searchWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0B0F19',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#F8FAFC',
    padding: 0,
  },
  listContent: {
    padding: 12,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 14,
    gap: 8,
  },
  chatNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    maxWidth: 180,
  },
  vendorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  vendorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#93C5FD',
    maxWidth: 120,
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
  },
  bulletSeparator: {
    fontSize: 10,
    color: '#475569',
  },
  groupIdText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#64748B',
  },
  stageBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  stageBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  alertBox: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.35)',
    padding: 10,
    marginVertical: 4,
  },
  alertTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  alertReason: {
    fontSize: 12,
    color: '#FDE68A',
    lineHeight: 17,
  },
  countChip: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  countChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  thumbWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  noMediaContainer: {
    paddingVertical: 6,
  },
  noMediaText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  descSnippet: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1F2937',
    marginVertical: 4,
  },
  inspectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  inspectButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#60A5FA',
  },
  ignoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
  },
  ignoreButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#059669',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  dismissButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34D399',
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#059669',
  },
  approveButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  emptyRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    marginTop: 8,
  },
  emptyRefreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
});
