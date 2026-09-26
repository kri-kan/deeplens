import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  FlatList,
  TextInput,
  Switch,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuSlidersHorizontal,
  LuRefreshCw,
  LuSearch,
  LuX,
} from '../icons/lu';
import { useTheme } from '@/theme';
import { PostPlannerMediaTile } from '../molecules/PostPlannerMediaTile';
import { PostCurationModal } from '../organisms/PostCurationModal';
import {
  CatalogFilterDrawer,
  FilterState,
  DEFAULT_STARRED_FILTER_STATE,
  getActiveFilterCount,
} from '../molecules/CatalogFilterDrawer';
import type {
  PostPlannerItem,
  PostPlannerChannelOption,
} from '@/services/instagram.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface AdminPostCurationPageProps {
  channels: PostPlannerChannelOption[];
  items: PostPlannerItem[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack?: () => void;
  onSaveMatching: (productId: string, watchlistIds: string[], isDonePlanning: boolean) => Promise<void>;
  onRecordAction?: (
    productId: string,
    watchlistId: string,
    actionType: 'shared_now' | 'scheduled' | 'excluded',
    scheduledAt?: string,
    publishedUrl?: string,
    captionUsed?: string
  ) => Promise<void>;
}

export function AdminPostCurationPage({
  channels = [],
  items = [],
  loading = false,
  refreshing = false,
  onRefresh,
  onBack,
  onSaveMatching,
  onRecordAction,
}: AdminPostCurationPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets?.top || 0, 12);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [includeCurated, setIncludeCurated] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_STARRED_FILTER_STATE);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);

  // Modal State
  const [selectedProductForModal, setSelectedProductForModal] = useState<PostPlannerItem | null>(null);
  const [curationModalVisible, setCurationModalVisible] = useState(false);

  // Filter items
  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Starred Filter
      if (filterState.isStarred === true && !item.isStarred) return false;
      if (filterState.isStarred === false && item.isStarred) return false;

      // 2. Curated Visibility Filter (Default: hide curated, toggle reveals)
      const isCurated = item.planningStatus === 'complete';
      if (!includeCurated && isCurated) return false;

      // 3. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (item.productCode || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        const fabric = (item.fabric || '').toLowerCase();
        if (!code.includes(q) && !title.includes(q) && !fabric.includes(q)) {
          return false;
        }
      }

      // 4. Category Filter
      if (filterState.categories?.length) {
        if (!item.category || !filterState.categories.includes(item.category)) {
          return false;
        }
      }

      // 5. Fabric Filter
      if (filterState.fabrics?.length) {
        if (!item.fabric || !filterState.fabrics.includes(item.fabric)) {
          return false;
        }
      }

      // 6. Price Range Filter
      const price = Number(item.price || 0);
      if (filterState.minPrice > 0 && price < filterState.minPrice) return false;
      if (filterState.maxPrice > 0 && price > filterState.maxPrice) return false;

      return true;
    });
  }, [items, filterState, includeCurated, searchQuery]);

  const activeFilterCount = useMemo(() => {
    return getActiveFilterCount(filterState);
  }, [filterState]);

  const handleTilePress = useCallback((item: PostPlannerItem) => {
    setSelectedProductForModal(item);
    setCurationModalVisible(true);
  }, []);

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
              Post Curation
            </Text>
            <Text fontSize={11} color="#6B7280" numberOfLines={1}>
              Assign channel affinities to catalog products
            </Text>
          </YStack>
        </XStack>

        <XStack alignItems="center" gap={8}>
          {/* Curated Toggle Switch Pill */}
          <Pressable
            onPress={() => setIncludeCurated((prev) => !prev)}
            style={[styles.curatedTogglePill, includeCurated && styles.curatedTogglePillActive]}
          >
            <Text
              fontSize={11}
              fontWeight="800"
              color={includeCurated ? '#059669' : '#6B7280'}
            >
              Curated
            </Text>
            <Switch
              value={includeCurated}
              onValueChange={setIncludeCurated}
              trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
              thumbColor={includeCurated ? '#059669' : '#F3F4F6'}
              style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }], marginLeft: -2 }}
            />
          </Pressable>

          {/* Filter Drawer Trigger */}
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

      {/* Search Input Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchInnerBox}>
          <LuSearch size={15} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by SKU, title, fabric..."
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

      {/* Subheader Count Bar */}
      <XStack
        paddingHorizontal={16}
        paddingVertical={6}
        justifyContent="space-between"
        alignItems="center"
      >
        <Text fontSize={11} fontWeight="700" color="#6B7280">
          {loading ? 'Loading catalog products...' : `Showing ${visibleItems.length} products`}
        </Text>
        {includeCurated && (
          <Text fontSize={11} fontWeight="700" color="#059669">
            Showing Curated & Uncurated
          </Text>
        )}
      </XStack>

      {/* Main Visual Product Grid (3 columns, no channel heads on tiles) */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#7E22CE" />
          <Text fontSize={12} color="#6B7280" marginTop={10}>
            Loading curation catalog...
          </Text>
        </View>
      ) : visibleItems.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text fontSize={14} fontWeight="800" color="#4B5563">
            No products match criteria
          </Text>
          <Text fontSize={12} color="#9CA3AF" marginTop={4} textAlign="center" paddingHorizontal={30}>
            {!includeCurated
              ? 'All current products are curated! Toggle "Curated" ON to review or re-assign.'
              : 'Try clearing some filters or searching with a different term.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(it) => it.productId}
          numColumns={3}
          contentContainerStyle={styles.gridContentContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <PostPlannerMediaTile
              item={item}
              onPress={() => handleTilePress(item)}
              showChannelAvatars={false}
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

      {/* Product Curation & Affinity Modal */}
      {selectedProductForModal && (
        <PostCurationModal
          visible={curationModalVisible}
          item={selectedProductForModal}
          channels={channels}
          onClose={() => {
            setCurationModalVisible(false);
            setSelectedProductForModal(null);
          }}
          onSaveMatching={onSaveMatching}
          onRecordAction={onRecordAction}
        />
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
  curatedTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  curatedTogglePillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
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
  gridContentContainer: {
    paddingVertical: 8,
    paddingBottom: 40,
  },
  columnWrapper: {
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
});
