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
  LuFolder,
  LuLayers,
  LuTarget,
  LuPackage,
  LuSparkles,
  LuShare2,
} from '../icons/lu';
import { useTheme } from '@/theme';
import { PostPlannerMediaTile } from '../molecules/PostPlannerMediaTile';
import { PostCurationModal } from '../organisms/PostCurationModal';
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

export interface AdminPostPlannerPageProps {
  channels: PostPlannerChannelOption[];
  items: PostPlannerItem[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack?: () => void;
  initialTab?: 'curation' | 'sharing';
  onSaveMatching: (productId: string, watchlistIds: string[], isDonePlanning: boolean) => Promise<void>;
  onRecordAction?: (
    productId: string,
    watchlistId: string,
    actionType: 'shared_now' | 'scheduled' | 'excluded',
    scheduledAt?: string,
    publishedUrl?: string,
    captionUsed?: string
  ) => Promise<void>;
  onSaveClassification: (
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
  initialTab = 'curation',
  onSaveMatching,
  onRecordAction,
  onSaveClassification,
}: AdminPostPlannerPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets?.top || 0, 12);

  // Active Tab: 'curation' (Curation Grid) vs 'sharing' (Sharing Queues & Suggestions)
  const [activeTab, setActiveTab] = useState<'curation' | 'sharing'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Channel Selection: null = all channels, string = watchlistId
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [includeCurated, setIncludeCurated] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_STARRED_FILTER_STATE);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);

  // Modals
  const [selectedProductForModal, setSelectedProductForModal] = useState<PostPlannerItem | null>(null);
  const [curationModalVisible, setCurationModalVisible] = useState(false);

  const [classificationModalVisible, setClassificationModalVisible] = useState(false);
  const [classificationTargetChannel, setClassificationTargetChannel] = useState<PostPlannerChannelOption | null>(null);

  // Active Channel Object
  const activeChannel = useMemo(() => {
    if (!selectedChannelId) return channels[0] || null;
    return channels.find((c) => c.watchlistId === selectedChannelId) || channels[0] || null;
  }, [channels, selectedChannelId]);

  // Dynamic Filter Chips
  const computedFilterChips = useMemo(() => {
    const chips: { id: string; label: string }[] = [];
    if (filterState.isStarred === true) {
      chips.push({ id: 'f-star', label: '⭐ Starred Only' });
    } else if (filterState.isStarred === false) {
      chips.push({ id: 'f-unstar', label: 'Unstarred Only' });
    }
    if (filterState.minPrice > 0 && filterState.maxPrice > 0) {
      chips.push({ id: 'f-price', label: `₹${filterState.minPrice} - ₹${filterState.maxPrice}` });
    } else if (filterState.minPrice > 0) {
      chips.push({ id: 'f-minprice', label: `≥ ₹${filterState.minPrice}` });
    } else if (filterState.maxPrice > 0) {
      chips.push({ id: 'f-maxprice', label: `≤ ₹${filterState.maxPrice}` });
    }
    (filterState.categories || []).forEach((cat) => {
      chips.push({ id: `f-cat-${cat}`, label: cat });
    });
    (filterState.fabrics || []).forEach((fab) => {
      chips.push({ id: `f-fab-${fab}`, label: fab });
    });
    if (filterState.sortBy && filterState.sortBy !== 'recent') {
      chips.push({ id: 'f-sort', label: `Sort: ${filterState.sortBy}` });
    }
    return chips;
  }, [filterState]);

  const removeFilterChip = (chipId: string) => {
    setFilterState((prev) => {
      const next = { ...prev };
      if (chipId === 'f-star' || chipId === 'f-unstar') {
        next.isStarred = null;
      } else if (chipId === 'f-price' || chipId === 'f-minprice' || chipId === 'f-maxprice') {
        next.minPrice = 0;
        next.maxPrice = 0;
      } else if (chipId.startsWith('f-cat-')) {
        const cat = chipId.replace('f-cat-', '');
        next.categories = (next.categories || []).filter((c) => c !== cat);
      } else if (chipId.startsWith('f-fab-')) {
        const fab = chipId.replace('f-fab-', '');
        next.fabrics = (next.fabrics || []).filter((f) => f !== fab);
      } else if (chipId === 'f-sort') {
        next.sortBy = 'recent';
      }
      return next;
    });
  };

  // Filter items for Curation Grid
  const visibleCurationItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Starred Filter
      if (filterState.isStarred === true && !item.isStarred) return false;
      if (filterState.isStarred === false && item.isStarred) return false;

      // 2. Curated Visibility Filter
      const isCurated = item.planningStatus === 'complete';
      if (!includeCurated && isCurated) return false;

      // 3. Channel Filter (if channel selected in stories bar)
      if (selectedChannelId) {
        const hasAffinity = (item.channelAssignments || []).some(
          (a: PostPlannerChannelAssignment) => a.watchlistId === selectedChannelId && a.status !== 'excluded'
        );
        if (!hasAffinity) return false;
      }

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (item.productCode || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        const fabric = (item.fabric || '').toLowerCase();
        if (!code.includes(q) && !title.includes(q) && !fabric.includes(q)) {
          return false;
        }
      }

      // 5. Category Drawer Filter
      if (filterState.categories?.length) {
        const itemCat = (item.category || '').toLowerCase();
        if (!filterState.categories.some((c) => itemCat.includes(c.toLowerCase()))) {
          return false;
        }
      }

      // 6. Fabric Drawer Filter
      if (filterState.fabrics?.length) {
        const itemFab = (item.fabric || '').toLowerCase();
        if (!filterState.fabrics.some((f) => itemFab.includes(f.toLowerCase()))) {
          return false;
        }
      }

      // 7. Price Bounds
      if (filterState.minPrice > 0 && (item.price || 0) < filterState.minPrice) return false;
      if (filterState.maxPrice > 0 && (item.price || 0) > filterState.maxPrice) return false;

      return true;
    });
  }, [items, filterState, includeCurated, selectedChannelId, searchQuery]);

  // Channel Suggestions for Sharing Queues Tab
  const channelSuggestions = useMemo(() => {
    if (!activeChannel) return [];
    const focusCategories = (activeChannel.categoryFocus || []).map((t: string) => t.toLowerCase().trim());

    return items.filter((item) => {
      const assignment = (item.channelAssignments || []).find((a: PostPlannerChannelAssignment) => a.watchlistId === activeChannel.watchlistId);
      if (assignment && (assignment.status === 'shared' || assignment.status === 'scheduled' || assignment.status === 'excluded')) {
        return false;
      }
      if (focusCategories.length === 0) return true;

      const itemCategory = (item.category || '').toLowerCase();
      const itemFabric = (item.fabric || '').toLowerCase();
      const itemTitle = (item.title || '').toLowerCase();

      return focusCategories.some(
        (tag: string) => itemCategory.includes(tag) || itemFabric.includes(tag) || itemTitle.includes(tag)
      );
    });
  }, [items, activeChannel]);

  const handleOpenProductModal = (product: PostPlannerItem) => {
    setSelectedProductForModal(product);
    setCurationModalVisible(true);
  };

  const handleOpenClassifyModal = (channel: PostPlannerChannelOption) => {
    setClassificationTargetChannel(channel);
    setClassificationModalVisible(true);
  };

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      {/* ── STICKY TOP BAR ── */}
      <YStack backgroundColor="#FFFFFF" borderBottomWidth={1} borderBottomColor="#E5E7EB">
        <XStack
          paddingHorizontal={16}
          paddingVertical={10}
          alignItems="center"
          justifyContent="space-between"
          gap={8}
        >
          {/* Back & Title */}
          <XStack alignItems="center" gap={10} flex={1}>
            {onBack && (
              <Pressable onPress={onBack} hitSlop={8} style={styles.iconBtn}>
                <LuArrowLeft size={20} color="#1F2937" />
              </Pressable>
            )}
            <YStack>
              <XStack alignItems="center" gap={6}>
                <Text fontSize={18} fontWeight="900" color="#1F2937">
                  Post Planner
                </Text>
                <View style={styles.countBadge}>
                  <Text fontSize={10} fontWeight="800" color="#7E22CE">
                    {visibleCurationItems.length}
                  </Text>
                </View>
              </XStack>
              <Text fontSize={11} color="#6B7280">
                {activeTab === 'curation' ? 'Multi-Account Curation' : 'Sharing Queues & Suggestions'}
              </Text>
            </YStack>
          </XStack>

          {/* Action Cluster */}
          <XStack alignItems="center" gap={8}>
            {/* Filter Drawer Trigger */}
            <Pressable
              onPress={() => setFilterDrawerVisible(true)}
              style={[
                styles.iconBtn,
                getActiveFilterCount(filterState) > 0 && styles.filterBtnActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open Filters"
            >
              <LuSlidersHorizontal
                size={18}
                color={getActiveFilterCount(filterState) > 0 ? '#7E22CE' : '#4B5563'}
              />
              {getActiveFilterCount(filterState) > 0 && (
                <View style={styles.filterBadge}>
                  <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                    {getActiveFilterCount(filterState)}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Curated Toggle Switch Pill */}
            <View style={styles.curatedTogglePill}>
              <Text fontSize={11} fontWeight="800" color={includeCurated ? '#059669' : '#6B7280'}>
                Curated
              </Text>
              <Switch
                value={includeCurated}
                onValueChange={setIncludeCurated}
                trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                thumbColor={includeCurated ? '#059669' : '#9CA3AF'}
                style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }], marginLeft: 2 }}
              />
            </View>

            {/* Refresh Button */}
            {onRefresh && (
              <Pressable onPress={onRefresh} hitSlop={8} style={styles.iconBtn}>
                <LuRefreshCw size={16} color="#4B5563" />
              </Pressable>
            )}
          </XStack>
        </XStack>

        {/* ── SEARCH INPUT ROW ── */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <LuSearch size={15} color="#9CA3AF" style={{ marginRight: 6 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search SKU, title, fabric..."
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

        {/* ── TAMAGUI SEGMENTED MODE SWITCHER ── */}
        <View style={styles.modeSwitcherContainer}>
          <View style={styles.modeSwitcherTrack}>
            <Pressable
              onPress={() => setActiveTab('curation')}
              style={[
                styles.modeTab,
                activeTab === 'curation' && styles.modeTabActive,
              ]}
            >
              <LuLayers size={13} color={activeTab === 'curation' ? '#7E22CE' : '#6B7280'} />
              <Text
                fontSize={12}
                fontWeight="800"
                color={activeTab === 'curation' ? '#7E22CE' : '#6B7280'}
              >
                1. Curation Grid
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('sharing')}
              style={[
                styles.modeTab,
                activeTab === 'sharing' && styles.modeTabActive,
              ]}
            >
              <LuShare2 size={13} color={activeTab === 'sharing' ? '#7E22CE' : '#6B7280'} />
              <Text
                fontSize={12}
                fontWeight="800"
                color={activeTab === 'sharing' ? '#7E22CE' : '#6B7280'}
              >
                2. Sharing Queues
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── INSTAGRAM STORIES-STYLE CHANNEL AVATAR BAR ── */}
        <View style={styles.storyBarWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyBarContent}>
            {/* All Channels Circle */}
            <Pressable
              onPress={() => setSelectedChannelId(null)}
              style={styles.storyItem}
            >
              <View
                style={[
                  styles.storyRing,
                  selectedChannelId === null && styles.storyRingActive,
                ]}
              >
                <View style={[styles.storyAvatarFallback, { backgroundColor: '#F3E8FF' }]}>
                  <Text fontSize={11} fontWeight="900" color="#7E22CE">
                    ALL
                  </Text>
                </View>
              </View>
              <Text
                fontSize={10}
                fontWeight={selectedChannelId === null ? '800' : '600'}
                color={selectedChannelId === null ? '#7E22CE' : '#4B5563'}
                numberOfLines={1}
                style={styles.storyLabel}
              >
                All
              </Text>
            </Pressable>

            {/* Individual Channels */}
            {channels.map((ch) => {
              const isSelected = selectedChannelId === ch.watchlistId;
              const initials = (ch.username || '').replace(/^@/, '').substring(0, 2).toUpperCase();
              return (
                <Pressable
                  key={ch.watchlistId}
                  onPress={() => setSelectedChannelId(ch.watchlistId)}
                  style={styles.storyItem}
                >
                  <View
                    style={[
                      styles.storyRing,
                      isSelected && styles.storyRingActive,
                    ]}
                  >
                    {ch.profilePicUrl ? (
                      <Image
                        source={{ uri: ch.profilePicUrl }}
                        style={styles.storyAvatar}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.storyAvatarFallback, { backgroundColor: '#EDE9FE' }]}>
                        <Text fontSize={11} fontWeight="900" color="#7E22CE">
                          {initials}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    fontSize={10}
                    fontWeight={isSelected ? '800' : '600'}
                    color={isSelected ? '#7E22CE' : '#4B5563'}
                    numberOfLines={1}
                    style={styles.storyLabel}
                  >
                    @{ch.username}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── ACTIVE FILTER CHIPS STRIP ── */}
        {computedFilterChips.length > 0 && (
          <View style={styles.filterChipsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsContent}>
              {computedFilterChips.map((chip) => (
                <View key={chip.id} style={styles.chipPill}>
                  <Text fontSize={11} fontWeight="700" color="#7E22CE">
                    {chip.label}
                  </Text>
                  <Pressable onPress={() => removeFilterChip(chip.id)} hitSlop={6}>
                    <LuX size={12} color="#7E22CE" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </YStack>

      {/* ── MAIN CONTENT TABS ── */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#7E22CE" />
          <Text fontSize={12} color="#6B7280" marginTop={8}>
            Loading post planner items...
          </Text>
        </View>
      ) : activeTab === 'curation' ? (
        /* ── TAB 1: CURATION GRID ── */
        <FlatList
          data={visibleCurationItems}
          keyExtractor={(item) => item.productId}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <PostPlannerMediaTile
              item={item}
              onPress={handleOpenProductModal}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <LuFolder size={32} color="#7E22CE" />
              </View>
              <Text fontSize={15} fontWeight="800" color="#1F2937" marginTop={12}>
                No Items Found
              </Text>
              <Text fontSize={12} color="#6B7280" textAlign="center" marginTop={4} maxWidth={280}>
                No products match the selected filters. Toggle "Curated" or clear active filters.
              </Text>
              <Pressable
                onPress={() => {
                  setFilterState({ ...DEFAULT_STARRED_FILTER_STATE, isStarred: null });
                  setSearchQuery('');
                  setSelectedChannelId(null);
                }}
                style={styles.clearFiltersBtn}
              >
                <Text fontSize={12} fontWeight="800" color="#7E22CE">
                  Clear All Filters
                </Text>
              </Pressable>
            </View>
          }
        />
      ) : (
        /* ── TAB 2: SHARING QUEUES & SUGGESTIONS ── */
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {activeChannel && (
            <View style={styles.channelBannerCard}>
              <XStack justifyContent="space-between" alignItems="center">
                <XStack alignItems="center" gap={10} flex={1}>
                  <View style={[styles.storyRing, styles.storyRingActive, { width: 44, height: 44, borderRadius: 22 }]}>
                    {activeChannel.profilePicUrl ? (
                      <Image source={{ uri: activeChannel.profilePicUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                    ) : (
                      <View style={[styles.storyAvatarFallback, { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EDE9FE' }]}>
                        <Text fontSize={10} fontWeight="900" color="#7E22CE">
                          {(activeChannel.username || '').replace(/^@/, '').substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <YStack flex={1}>
                    <XStack alignItems="center" gap={6}>
                      <Text fontSize={14} fontWeight="900" color="#1F2937">
                        @{activeChannel.username}
                      </Text>
                      <View style={[styles.typeBadge, activeChannel.channelType === 'dump' && styles.dumpBadge]}>
                        <Text fontSize={9} fontWeight="800" color={activeChannel.channelType === 'dump' ? '#6B7280' : '#7E22CE'}>
                          {activeChannel.channelType === 'dump' ? '📦 DUMP' : '🎯 FOCUS'}
                        </Text>
                      </View>
                    </XStack>
                    <Text fontSize={11} color="#6B7280">
                      {activeChannel.targetDemography || 'All Audience'}
                    </Text>
                  </YStack>
                </XStack>

                <Pressable
                  onPress={() => handleOpenClassifyModal(activeChannel)}
                  style={styles.configBtn}
                >
                  <LuSettings size={14} color="#7E22CE" />
                  <Text fontSize={11} fontWeight="800" color="#7E22CE">
                    Config
                  </Text>
                </Pressable>
              </XStack>

              {/* Category Focus Chips */}
              {(activeChannel.categoryFocus || []).length > 0 && (
                <XStack gap={6} flexWrap="wrap" marginTop={8}>
                  {activeChannel.categoryFocus.map((cat: string, idx: number) => (
                    <View key={idx} style={styles.focusPill}>
                      <Text fontSize={10} fontWeight="700" color="#4B5563">
                        {cat}
                      </Text>
                    </View>
                  ))}
                </XStack>
              )}
            </View>
          )}

          {/* Channel Suggestions Section */}
          <XStack justifyContent="space-between" alignItems="center" paddingHorizontal={16} paddingVertical={8}>
            <Text fontSize={13} fontWeight="900" color="#1F2937">
              Matching Product Suggestions ({channelSuggestions.length})
            </Text>
            <Text fontSize={11} color="#6B7280">
              Tap any tile to schedule
            </Text>
          </XStack>

          <View style={styles.suggestionsGrid}>
            {channelSuggestions.map((item) => (
              <PostPlannerMediaTile
                key={item.productId}
                item={item}
                onPress={handleOpenProductModal}
              />
            ))}
            {channelSuggestions.length === 0 && (
              <View style={[styles.emptyContainer, { width: '100%' }]}>
                <Text fontSize={13} fontWeight="700" color="#6B7280">
                  No pending suggestions match this channel's focus tags.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ── UNIVERSAL CATALOG FILTER DRAWER ── */}
      <CatalogFilterDrawer
        visible={filterDrawerVisible}
        onClose={() => setFilterDrawerVisible(false)}
        current={filterState}
        onApply={(f) => {
          setFilterState(f);
          setFilterDrawerVisible(false);
        }}
      />

      {/* ── UNIFIED POST CURATION & SCHEDULE MODAL ── */}
      <PostCurationModal
        visible={curationModalVisible}
        item={selectedProductForModal}
        channels={channels}
        onClose={() => setCurationModalVisible(false)}
        onSaveMatching={onSaveMatching}
        onRecordAction={onRecordAction}
      />

      {/* ── CHANNEL CLASSIFICATION MODAL ── */}
      <ChannelClassificationModal
        visible={classificationModalVisible}
        channel={classificationTargetChannel}
        onClose={() => setClassificationModalVisible(false)}
        onSaveClassification={onSaveClassification}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: '#F3E8FF',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#7E22CE',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  countBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  curatedTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingLeft: 8,
    paddingRight: 2,
    paddingVertical: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1F2937',
    paddingVertical: 0,
  },
  modeSwitcherContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  modeSwitcherTrack: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  storyBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 6,
  },
  storyBarContent: {
    paddingHorizontal: 14,
    gap: 12,
  },
  storyItem: {
    alignItems: 'center',
    width: 62,
  },
  storyRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  storyRingActive: {
    borderColor: '#7E22CE',
    borderWidth: 2.5,
  },
  storyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  storyAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyLabel: {
    marginTop: 4,
    textAlign: 'center',
  },
  filterChipsWrapper: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterChipsContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  gridContainer: {
    padding: 10,
    paddingBottom: 24,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearFiltersBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3E8FF',
  },
  tabContent: {
    flex: 1,
    paddingBottom: 24,
  },
  channelBannerCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F3E8FF',
  },
  dumpBadge: {
    backgroundColor: '#F3F4F6',
  },
  configBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F3E8FF',
  },
  focusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    gap: 8,
  },
});
