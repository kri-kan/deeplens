import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  Switch,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import { Image } from 'expo-image';
import {
  LuArrowLeft,
  LuSlidersHorizontal,
  LuRefreshCw,
  LuSearch,
  LuX,
  LuCheck,
  LuSettings,
  LuClock,
  LuShare2,
  LuBan,
  LuCamera,
  LuSparkles,
  LuCalendar,
  LuStar,
} from '../icons/lu';
import { useTheme } from '@/theme';
import { getSearchApiUrl } from '@/utils/api-config';
import { ChannelClassificationModal } from '../organisms/ChannelClassificationModal';
import {
  CatalogFilterDrawer,
  FilterState,
  DEFAULT_STARRED_FILTER_STATE,
  getActiveFilterCount,
} from '../molecules/CatalogFilterDrawer';
import type {
  PostPlannerItem,
  PostPlannerChannelOption,
  PostPlannerChannelAssignment,
} from '@/services/instagram.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatScheduledBadge(scheduledAt?: string | null): string | null {
  if (!scheduledAt) return null;
  const d = new Date(scheduledAt);
  if (isNaN(d.getTime())) return null;

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  const mins = d.getMinutes();
  const timeStr = d
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: mins !== 0 ? '2-digit' : undefined,
      hour12: true,
      timeZone: 'Asia/Kolkata',
    })
    .toUpperCase()
    .replace(/\s/g, '');

  if (isToday) {
    return `Today ${timeStr}`;
  }
  if (isTomorrow) {
    return `Tmrw ${timeStr}`;
  }

  const monthStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  return `${monthStr} ${timeStr}`;
}

export interface PlannerMediaTileProps {
  item: PostPlannerItem;
  activeChannelId: string;
  onPress: (item: PostPlannerItem) => void;
}

export const PlannerMediaTile = React.memo(function PlannerMediaTile({
  item,
  activeChannelId,
  onPress,
}: PlannerMediaTileProps) {
  const assignment = useMemo(() => {
    return (item.channelAssignments || []).find((a) => a.watchlistId === activeChannelId);
  }, [item.channelAssignments, activeChannelId]);

  const status = assignment?.status || 'pending';
  const isShared = status === 'shared';
  const isScheduled = status === 'scheduled';

  // Border highlighting:
  // - shared (posted): green border (#10B981, borderWidth: 2)
  // - scheduled: purple border (#7E22CE, borderWidth: 2)
  // - pending / assigned: yellow border (#F59E0B, borderWidth: 2)
  const borderColor = useMemo(() => {
    if (isShared) return '#10B981';
    if (isScheduled) return '#7E22CE';
    return '#F59E0B';
  }, [isShared, isScheduled]);

  const scheduledBadgeText = useMemo(() => {
    return formatScheduledBadge(assignment?.scheduledAt);
  }, [assignment?.scheduledAt]);

  const imageUri = useMemo(() => {
    if (!item.primaryImageUrl) return null;
    if (item.primaryImageUrl.startsWith('http://') || item.primaryImageUrl.startsWith('https://')) {
      return item.primaryImageUrl;
    }
    const baseUrl = getSearchApiUrl() || '';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    if (item.primaryImageUrl.startsWith('/')) {
      return `${cleanBaseUrl}${item.primaryImageUrl}`;
    }
    return `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(item.primaryImageUrl)}`;
  }, [item.primaryImageUrl]);

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.gridTile,
        { borderColor },
        pressed && styles.tilePressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Product ${item.productCode}, Price ₹${item.price}`}
    >
      <View style={styles.tileImageWrapper}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.tileImage}
            contentFit="cover"
            recyclingKey={item.productId}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.tileImagePlaceholder}>
            <LuCamera size={22} color="#9CA3AF" />
          </View>
        )}

        {/* Top-Left: Star badge if isStarred */}
        {item.isStarred && (
          <View style={styles.starBadge}>
            <LuStar size={10} color="#F59E0B" />
          </View>
        )}

        {/* Bottom-Left: Media count badge if mediaCount > 0 */}
        {(item.mediaCount ?? 0) > 0 && (
          <View style={styles.mediaCountBadge}>
            <LuCamera size={8} color="#FFFFFF" />
            <Text fontSize={8} fontWeight="700" color="#FFFFFF">
              {item.mediaCount}
            </Text>
          </View>
        )}

        {/* Bottom-Right: Scheduled time badge (or posted badge) */}
        {isShared ? (
          <View style={[styles.timeBadge, styles.sharedBadge]}>
            <LuCheck size={8} color="#FFFFFF" />
            <Text fontSize={8} fontWeight="800" color="#FFFFFF">
              {scheduledBadgeText || 'POSTED'}
            </Text>
          </View>
        ) : scheduledBadgeText ? (
          <View style={[styles.timeBadge, styles.scheduledBadge]}>
            <LuClock size={8} color="#FFFFFF" />
            <Text fontSize={8} fontWeight="800" color="#FFFFFF" numberOfLines={1}>
              {scheduledBadgeText}
            </Text>
          </View>
        ) : null}

        {/* Compact bottom bar: Product SKU and Price */}
        <View style={styles.tileBottomBar}>
          <Text fontSize={9} fontWeight="800" color="#FFFFFF" numberOfLines={1} style={styles.skuText}>
            {item.productCode || 'ITEM'}
          </Text>
          <Text fontSize={9} fontWeight="900" color="#FCD34D" numberOfLines={1}>
            ₹{Number(item.price || 0).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

export interface AdminPostPlannerPageProps {
  channels: PostPlannerChannelOption[];
  items: PostPlannerItem[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack?: () => void;
  selectedChannelId?: string;
  onSelectChannel?: (watchlistId: string) => void;
  onSaveMatching?: (productId: string, watchlistIds: string[], isDonePlanning: boolean) => Promise<void>;
  onRecordAction?: (
    productId: string,
    watchlistId: string,
    actionType: 'shared_now' | 'scheduled' | 'excluded',
    scheduledAt?: string,
    publishedUrl?: string,
    captionUsed?: string
  ) => Promise<void>;
  onSaveClassification?: (
    watchlistId: string,
    channelType: 'focus' | 'dump',
    categoryFocus: string[],
    targetDemography?: string
  ) => Promise<void>;
}

export function AdminPostPlannerPage({
  channels = [],
  items = [],
  loading = false,
  refreshing = false,
  onRefresh,
  onBack,
  selectedChannelId: propSelectedChannelId,
  onSelectChannel,
  onSaveMatching,
  onRecordAction,
  onSaveClassification,
}: AdminPostPlannerPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets?.top || 0, 12);

  // Active Channel ID: Defaults to first channel in list, NO "ALL" HEAD
  const [internalSelectedChannelId, setInternalSelectedChannelId] = useState<string>(
    propSelectedChannelId || channels[0]?.watchlistId || ''
  );

  const activeChannelId = propSelectedChannelId || internalSelectedChannelId || channels[0]?.watchlistId || '';

  const handleSelectChannel = (wId: string) => {
    setInternalSelectedChannelId(wId);
    onSelectChannel?.(wId);
  };

  const activeChannel = useMemo(() => {
    return channels.find((c) => c.watchlistId === activeChannelId) || channels[0] || null;
  }, [channels, activeChannelId]);

  // Posted Toggle: false = Pending / Scheduled, true = Posted / Shared
  const [showPosted, setShowPosted] = useState(false);

  // Search & Catalog Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_STARRED_FILTER_STATE);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);

  // Classification Modal
  const [classificationModalVisible, setClassificationModalVisible] = useState(false);

  // Action / Posting Execution Modal
  const [actionItem, setActionItem] = useState<PostPlannerItem | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'shared_now' | 'scheduled' | 'excluded'>('shared_now');
  const [actionScheduledTime, setActionScheduledTime] = useState<string>('');
  const [actionPublishedUrl, setActionPublishedUrl] = useState('');
  const [actionCaption, setActionCaption] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Filter & Sort Items for Active Channel
  const filteredAndSortedItems = useMemo(() => {
    if (!activeChannelId) return [];

    return items
      .filter((item) => {
        // Find assignment for this specific channel
        const assignment = (item.channelAssignments || []).find(
          (a: PostPlannerChannelAssignment) => a.watchlistId === activeChannelId
        );

        if (!assignment) return false;

        // Posted toggle filter
        if (!showPosted) {
          // Pending queue: must NOT be shared or excluded
          if (assignment.status === 'shared' || assignment.status === 'excluded') {
            return false;
          }
        } else {
          // Posted queue: must be shared
          if (assignment.status !== 'shared') {
            return false;
          }
        }

        // Starred Filter
        if (filterState.isStarred === true && !item.isStarred) return false;
        if (filterState.isStarred === false && item.isStarred) return false;

        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const code = (item.productCode || '').toLowerCase();
          const title = (item.title || '').toLowerCase();
          const fabric = (item.fabric || '').toLowerCase();
          if (!code.includes(q) && !title.includes(q) && !fabric.includes(q)) {
            return false;
          }
        }

        // Category Filter
        if (filterState.categories?.length) {
          if (!item.category || !filterState.categories.includes(item.category)) {
            return false;
          }
        }

        // Fabric Filter
        if (filterState.fabrics?.length) {
          if (!item.fabric || !filterState.fabrics.includes(item.fabric)) {
            return false;
          }
        }

        // Price Filter
        const price = Number(item.price || 0);
        if (filterState.minPrice > 0 && price < filterState.minPrice) return false;
        if (filterState.maxPrice > 0 && price > filterState.maxPrice) return false;

        return true;
      })
      .sort((a, b) => {
        // Chronological sort by scheduled_at ASC
        const aAssign = (a.channelAssignments || []).find((x) => x.watchlistId === activeChannelId);
        const bAssign = (b.channelAssignments || []).find((x) => x.watchlistId === activeChannelId);

        const aTime = aAssign?.scheduledAt ? new Date(aAssign.scheduledAt).getTime() : Infinity;
        const bTime = bAssign?.scheduledAt ? new Date(bAssign.scheduledAt).getTime() : Infinity;

        if (aTime !== bTime) {
          return aTime - bTime;
        }

        // Tie-breaker: Product Code
        return (a.productCode || '').localeCompare(b.productCode || '');
      });
  }, [items, activeChannelId, showPosted, filterState, searchQuery]);

  const activeFilterCount = useMemo(() => {
    return getActiveFilterCount(filterState);
  }, [filterState]);

  const openActionModal = (item: PostPlannerItem) => {
    const assignment = (item.channelAssignments || []).find(
      (a) => a.watchlistId === activeChannelId
    );
    setActionItem(item);
    if (assignment?.status === 'scheduled') {
      setActionType('scheduled');
    } else if (assignment?.status === 'shared') {
      setActionType('shared_now');
    } else {
      setActionType('shared_now');
    }
    setActionScheduledTime(assignment?.scheduledAt || '');
    setActionPublishedUrl(assignment?.publishedUrl || '');
    setActionCaption(assignment?.captionUsed || (item.title ? `${item.title} • ₹${item.price} • DM to order` : ''));
    setActionModalVisible(true);
  };

  const handleExecuteAction = async () => {
    if (!actionItem || !activeChannelId || !onRecordAction) return;
    try {
      setSubmittingAction(true);
      await onRecordAction(
        actionItem.productId,
        activeChannelId,
        actionType,
        actionType === 'scheduled' ? actionScheduledTime || undefined : undefined,
        actionPublishedUrl.trim() || undefined,
        actionCaption.trim() || undefined
      );
      setActionModalVisible(false);
      setActionItem(null);
    } catch (err) {
      console.error('Failed to submit post action', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Top Header */}
      <XStack
        paddingHorizontal={16}
        paddingVertical={10}
        justifyContent="space-between"
        alignItems="center"
        backgroundColor="#FFFFFF"
        borderBottomWidth={1}
        borderBottomColor="#F3F4F6"
      >
        <XStack alignItems="center" gap={10} flex={1}>
          {onBack && (
            <Pressable onPress={onBack} hitSlop={8} style={styles.iconCircleBtn}>
              <LuArrowLeft size={18} color="#1F2937" />
            </Pressable>
          )}
          <YStack flex={1}>
            <Text fontSize={16} fontWeight="900" color="#111827">
              Post Planner
            </Text>
            <Text fontSize={11} color="#6B7280" numberOfLines={1}>
              {activeChannel ? `@${activeChannel.username} posting queue` : 'Channel posting queue'}
            </Text>
          </YStack>
        </XStack>

        <XStack alignItems="center" gap={8}>
          {/* Posted Toggle Switch Pill */}
          <Pressable
            onPress={() => setShowPosted((prev) => !prev)}
            style={[styles.postedTogglePill, showPosted && styles.postedTogglePillActive]}
          >
            <Text
              fontSize={11}
              fontWeight="800"
              color={showPosted ? '#059669' : '#6B7280'}
            >
              Posted
            </Text>
            <Switch
              value={showPosted}
              onValueChange={setShowPosted}
              trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
              thumbColor={showPosted ? '#059669' : '#F3F4F6'}
              style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }], marginLeft: -2 }}
            />
          </Pressable>

          {/* Filter Drawer Button */}
          <Pressable
            onPress={() => setFilterDrawerVisible(true)}
            hitSlop={8}
            style={[styles.iconCircleBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          >
            <LuSlidersHorizontal
              size={17}
              color={activeFilterCount > 0 ? '#7E22CE' : '#4B5563'}
            />
            {activeFilterCount > 0 && (
              <View style={styles.badgeIndicator}>
                <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Refresh Button */}
          {onRefresh && (
            <Pressable
              onPress={onRefresh}
              hitSlop={8}
              style={[styles.iconCircleBtn, refreshing && { opacity: 0.5 }]}
            >
              <LuRefreshCw size={16} color="#4B5563" />
            </Pressable>
          )}
        </XStack>
      </XStack>

      {/* Stories Avatar Bar: Single Channels ONLY, NO "ALL" CIRCLE */}
      <View style={styles.storiesBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesBarContent}
        >
          {channels.map((channel) => {
            const isSelected = channel.watchlistId === activeChannelId;
            return (
              <Pressable
                key={channel.watchlistId}
                onPress={() => handleSelectChannel(channel.watchlistId)}
                style={styles.storyItem}
              >
                <View style={[styles.avatarRing, isSelected && styles.avatarRingActive]}>
                  {channel.profilePicUrl ? (
                    <Image
                      source={{ uri: channel.profilePicUrl }}
                      style={styles.storyAvatarImg}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.storyAvatarPlaceholder}>
                      <Text fontSize={13} fontWeight="800" color="#6B21A8">
                        {channel.username.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  fontSize={10}
                  fontWeight={isSelected ? '800' : '600'}
                  color={isSelected ? '#7E22CE' : '#4B5563'}
                  numberOfLines={1}
                  style={styles.storyHandleText}
                >
                  @{channel.username}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Channel Focus/Category Info Banner */}
      {activeChannel && (
        <View style={styles.channelBanner}>
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap={6} flex={1}>
              <View
                style={[
                  styles.channelTypeBadge,
                  {
                    backgroundColor:
                      activeChannel.channelType === 'dump' ? '#FEE2E2' : '#EDE9FE',
                  },
                ]}
              >
                <Text
                  fontSize={10}
                  fontWeight="900"
                  color={activeChannel.channelType === 'dump' ? '#DC2626' : '#7E22CE'}
                >
                  {(activeChannel.channelType || 'focus').toUpperCase()}
                </Text>
              </View>
              <Text fontSize={12} fontWeight="800" color="#1F2937">
                @{activeChannel.username}
              </Text>
              {activeChannel.targetDemography && (
                <Text fontSize={11} color="#6B7280" numberOfLines={1}>
                  • {activeChannel.targetDemography}
                </Text>
              )}
            </XStack>

            {onSaveClassification && (
              <Pressable
                onPress={() => setClassificationModalVisible(true)}
                hitSlop={6}
                style={styles.gearBtn}
              >
                <LuSettings size={14} color="#6B7280" />
              </Pressable>
            )}
          </XStack>

          {/* Category focus chips */}
          {activeChannel.categoryFocus && activeChannel.categoryFocus.length > 0 && (
            <XStack gap={4} marginTop={6} flexWrap="wrap">
              {activeChannel.categoryFocus.map((cat) => (
                <View key={cat} style={styles.categoryFocusChip}>
                  <Text fontSize={9} fontWeight="700" color="#4B5563">
                    {cat}
                  </Text>
                </View>
              ))}
            </XStack>
          )}
        </View>
      )}

      {/* Search Input Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchInnerBox}>
          <LuSearch size={15} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search ${activeChannel ? '@' + activeChannel.username : ''} queue...`}
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
              <LuX size={15} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Queue Count & Sort Indicator */}
      <XStack
        paddingHorizontal={16}
        paddingVertical={6}
        justifyContent="space-between"
        alignItems="center"
      >
        <Text fontSize={11} fontWeight="700" color="#6B7280">
          {loading
            ? 'Loading queue items...'
            : `${filteredAndSortedItems.length} ${showPosted ? 'posted' : 'pending'} product(s)`}
        </Text>
        <XStack alignItems="center" gap={4}>
          <LuClock size={11} color="#7E22CE" />
          <Text fontSize={10} fontWeight="700" color="#7E22CE">
            Sorted by Scheduled Time
          </Text>
        </XStack>
      </XStack>

      {/* Main Queue List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#7E22CE" />
          <Text fontSize={12} color="#6B7280" marginTop={10}>
            Loading posting queue...
          </Text>
        </View>
      ) : filteredAndSortedItems.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text fontSize={14} fontWeight="800" color="#4B5563">
            {showPosted ? 'No posted items yet' : 'No pending posts in queue'}
          </Text>
          <Text fontSize={12} color="#9CA3AF" marginTop={4} textAlign="center" paddingHorizontal={30}>
            {showPosted
              ? 'When items are shared to Instagram, they will appear here in the posted archive.'
              : 'Curate catalog items in the Post Curation screen to add them to this channel queue.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedItems}
          keyExtractor={(it) => it.productId}
          numColumns={3}
          contentContainerStyle={styles.listContentContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <PlannerMediaTile
              item={item}
              activeChannelId={activeChannelId}
              onPress={openActionModal}
            />
          )}
        />
      )}

      {/* Universal Catalog Filter Drawer */}
      <CatalogFilterDrawer
        visible={filterDrawerVisible}
        onClose={() => setFilterDrawerVisible(false)}
        current={filterState}
        onApply={setFilterState}
      />

      {/* Channel Classification Modal */}
      {activeChannel && onSaveClassification && (
        <ChannelClassificationModal
          visible={classificationModalVisible}
          channel={activeChannel}
          onClose={() => setClassificationModalVisible(false)}
          onSaveClassification={onSaveClassification}
        />
      )}

      {/* Action / Posting Execution Modal */}
      {actionItem && (
        <Modal
          visible={actionModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setActionModalVisible(false)}
        >
          <View style={styles.actionBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setActionModalVisible(false)}
            />
            <View style={styles.actionSheetContainer}>
              <View style={styles.dragHandleWrapper}>
                <View style={styles.dragHandle} />
              </View>

              <XStack justifyContent="space-between" alignItems="center" paddingHorizontal={16} paddingBottom={10}>
                <YStack>
                  <Text fontSize={15} fontWeight="900" color="#111827">
                    Execute Posting: @{activeChannel?.username}
                  </Text>
                  <Text fontSize={11} color="#6B7280">
                    Product: {actionItem.productCode || 'ITEM'} • ₹{actionItem.price}
                  </Text>
                </YStack>
                <Pressable
                  onPress={() => setActionModalVisible(false)}
                  hitSlop={8}
                  style={styles.closeBtn}
                >
                  <LuX size={18} color="#6B7280" />
                </Pressable>
              </XStack>

              <ScrollView style={{ paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
                <YStack gap={12} paddingBottom={24}>
                  {/* Action Mode Switcher */}
                  <XStack gap={8}>
                    <Pressable
                      onPress={() => setActionType('shared_now')}
                      style={[
                        styles.modeBtn,
                        actionType === 'shared_now' && styles.modeBtnActive,
                      ]}
                    >
                      <LuShare2 size={13} color={actionType === 'shared_now' ? '#7E22CE' : '#6B7280'} />
                      <Text
                        fontSize={11}
                        fontWeight="700"
                        color={actionType === 'shared_now' ? '#7E22CE' : '#4B5563'}
                      >
                        Mark Shared
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setActionType('scheduled')}
                      style={[
                        styles.modeBtn,
                        actionType === 'scheduled' && styles.modeBtnActive,
                      ]}
                    >
                      <LuClock size={13} color={actionType === 'scheduled' ? '#7E22CE' : '#6B7280'} />
                      <Text
                        fontSize={11}
                        fontWeight="700"
                        color={actionType === 'scheduled' ? '#7E22CE' : '#4B5563'}
                      >
                        Reschedule
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setActionType('excluded')}
                      style={[
                        styles.modeBtn,
                        actionType === 'excluded' && styles.modeBtnActive,
                      ]}
                    >
                      <LuBan size={13} color={actionType === 'excluded' ? '#DC2626' : '#6B7280'} />
                      <Text
                        fontSize={11}
                        fontWeight="700"
                        color={actionType === 'excluded' ? '#DC2626' : '#4B5563'}
                      >
                        Skip
                      </Text>
                    </Pressable>
                  </XStack>

                  {/* Scheduled Slot Input */}
                  {actionType === 'scheduled' && (
                    <YStack gap={4}>
                      <Text fontSize={11} fontWeight="800" color="#374151">
                        Scheduled ISO Date / Time (IST):
                      </Text>
                      <TextInput
                        value={actionScheduledTime}
                        onChangeText={setActionScheduledTime}
                        placeholder="e.g. 2026-09-28T18:00:00Z"
                        placeholderTextColor="#9CA3AF"
                        style={styles.actionInput}
                      />
                    </YStack>
                  )}

                  {/* Published URL for Shared Now */}
                  {actionType === 'shared_now' && (
                    <YStack gap={4}>
                      <Text fontSize={11} fontWeight="800" color="#374151">
                        Instagram Post URL (Optional):
                      </Text>
                      <TextInput
                        value={actionPublishedUrl}
                        onChangeText={setActionPublishedUrl}
                        placeholder="https://www.instagram.com/p/..."
                        placeholderTextColor="#9CA3AF"
                        style={styles.actionInput}
                      />
                    </YStack>
                  )}

                  {/* Caption Input */}
                  <YStack gap={4}>
                    <Text fontSize={11} fontWeight="800" color="#374151">
                      Post Caption:
                    </Text>
                    <TextInput
                      value={actionCaption}
                      onChangeText={setActionCaption}
                      placeholder="Write post caption..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={4}
                      style={[styles.actionInput, { height: 80, textAlignVertical: 'top' }]}
                    />
                  </YStack>

                  {/* Submit Button */}
                  <Pressable
                    onPress={handleExecuteAction}
                    disabled={submittingAction}
                    style={[styles.actionConfirmBtn, submittingAction && { opacity: 0.6 }]}
                  >
                    {submittingAction ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text fontSize={13} fontWeight="800" color="#FFFFFF" textAlign="center">
                        Confirm {actionType === 'shared_now' ? 'Shared Now' : actionType === 'scheduled' ? 'Schedule' : 'Skip Channel'}
                      </Text>
                    )}
                  </Pressable>
                </YStack>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  iconCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#7E22CE',
  },
  badgeIndicator: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#7E22CE',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  postedTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  postedTogglePillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  storiesBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 8,
  },
  storiesBarContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  storyItem: {
    alignItems: 'center',
    width: 64,
  },
  avatarRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatarRingActive: {
    borderColor: '#7E22CE',
    borderWidth: 2.5,
    shadowColor: '#7E22CE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  storyAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  storyAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyHandleText: {
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 62,
  },
  channelBanner: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  channelTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gearBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  categoryFocusChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchInnerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1F2937',
    padding: 0,
  },
  listContentContainer: {
    padding: 1,
    paddingBottom: 40,
  },
  columnWrapper: {
    gap: 1.5,
    marginBottom: 1.5,
    paddingHorizontal: 0,
  },
  gridTile: {
    flex: 1,
    maxWidth: '33.33%',
    aspectRatio: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
  },
  tilePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  tileImageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  starBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  mediaCountBadge: {
    position: 'absolute',
    bottom: 22,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
    zIndex: 2,
  },
  timeBadge: {
    position: 'absolute',
    bottom: 22,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
    maxWidth: '65%',
    zIndex: 2,
  },
  scheduledBadge: {
    backgroundColor: 'rgba(126, 34, 206, 0.92)',
  },
  sharedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
  },
  tileBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 4,
    paddingVertical: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  skuText: {
    flex: 1,
    marginRight: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  actionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  dragHandleWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modeBtnActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#7E22CE',
  },
  actionInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#1F2937',
  },
  actionConfirmBtn: {
    backgroundColor: '#7E22CE',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
});
