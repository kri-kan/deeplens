import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
  BackHandler,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuLayers,
  LuCheck,
  LuX,
  LuRefreshCw,
  LuChevronRight,
  LuClock,
} from '../icons/lu';
import { useTheme } from '@/theme';
import {
  PublishJobStatusResponse,
  BatchProductTileItem,
  extractBatchProducts,
} from '@/services/storeAdminService';

export interface AdminStorePublishBatchesPageProps {
  jobs?: PublishJobStatusResponse[];
  loading?: boolean;
  refreshing?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onBack?: () => void;
  onSelectBatch?: (job: PublishJobStatusResponse) => void;
  onOpenPdp?: (productId: string) => void;
  disableSafeArea?: boolean;
}

export interface AdminStorePublishBatchDetailPageProps {
  batch: PublishJobStatusResponse | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack?: () => void;
  onOpenPdp?: (productId: string) => void;
  disableSafeArea?: boolean;
}

import {
  formatBatchTimestamp,
  formatBatchTime,
  getBatchStatusBadge,
  getBatchTileLayout,
  PublishBatchTileJob,
} from '@/utils/publishBatchTileRules';

export {
  formatBatchTimestamp,
  formatBatchTime,
  getBatchStatusBadge,
  getBatchTileLayout,
  PublishBatchTileJob,
};

// ═══════════════════════════════════════════════════════════════════
// DEDICATED BATCH DETAIL VIEW (3-COLUMN PRODUCT TILES)
// ═══════════════════════════════════════════════════════════════════
export function AdminStorePublishBatchDetailPage({
  batch,
  loading = false,
  refreshing = false,
  onRefresh,
  onBack,
  onOpenPdp,
  disableSafeArea = false,
}: AdminStorePublishBatchDetailPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  // Filter inside the product tiles view: 'all' | 'completed' | 'failed'
  const [tileFilter, setTileFilter] = useState<'all' | 'completed' | 'failed'>('all');

  // Intercept Android hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [onBack]);

  const batchProducts: BatchProductTileItem[] = useMemo(() => {
    if (!batch) return [];
    return extractBatchProducts(batch);
  }, [batch]);

  const filteredBatchProducts = useMemo(() => {
    if (tileFilter === 'all') return batchProducts;
    return batchProducts.filter((p) => p.status === tileFilter);
  }, [batchProducts, tileFilter]);

  const completedCount = useMemo(
    () => batchProducts.filter((p) => p.status === 'completed').length,
    [batchProducts]
  );
  const failedCount = useMemo(
    () => batchProducts.filter((p) => p.status === 'failed').length,
    [batchProducts]
  );

  if (!batch) {
    return (
      <YStack flex={1} backgroundColor={tokens.background} paddingTop={topInset} paddingBottom={bottomInset}>
        <XStack
          alignItems="center"
          paddingHorizontal={12}
          paddingVertical={10}
          backgroundColor={tokens.surface}
          borderBottomWidth={1}
          borderBottomColor={tokens.border}
        >
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: pressed ? 'rgba(0,0,0,0.06)' : 'transparent' },
              ]}
            >
              <LuArrowLeft size={20} color={tokens.text} />
            </Pressable>
          )}
          <Text fontSize={15} fontWeight="800" color={tokens.text} marginLeft={8}>
            Batch Details
          </Text>
        </XStack>
        <YStack alignItems="center" justifyContent="center" flex={1} gap={10}>
          {loading ? (
            <>
              <ActivityIndicator size="large" color={tokens.accent} />
              <Text fontSize={13} color={tokens.textMuted} fontWeight="600">
                Loading Batch...
              </Text>
            </>
          ) : (
            <>
              <LuLayers size={40} color={tokens.textMuted} />
              <Text fontSize={14} fontWeight="800" color={tokens.text}>
                Batch Not Found
              </Text>
            </>
          )}
        </YStack>
      </YStack>
    );
  }

  const shortId = batch.id.replace(/-/g, '').substring(0, 8);
  const statusCfg = getBatchStatusBadge(batch.status);

  const renderProductTile = ({ item }: { item: BatchProductTileItem }) => {
    const isSuccess = item.status === 'completed';

    return (
      <Pressable
        key={`${item.productId}-${item.status}`}
        onPress={() => {
          if (isSuccess && onOpenPdp) {
            onOpenPdp(item.productId);
          } else if (!isSuccess && item.error) {
            Alert.alert(
              `Publish Failed (${item.productCode})`,
              item.error,
              [{ text: 'OK' }]
            );
          }
        }}
        style={[
          styles.gridTile,
          {
            borderColor: isSuccess ? '#86EFAC' : '#FCA5A5',
            borderWidth: 1.5,
          },
        ]}
      >
        <Image
          source={{ uri: item.primaryImageUri || 'https://picsum.photos/seed/saree/600/800' }}
          style={styles.tileImage}
          contentFit="cover"
          transition={150}
        />

        {/* Status Badge (Top-Left) */}
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isSuccess ? 'rgba(21, 128, 61, 0.92)' : 'rgba(185, 28, 28, 0.92)',
            },
          ]}
        >
          <XStack alignItems="center" gap={3}>
            {isSuccess ? (
              <LuCheck size={10} color="#ffffff" />
            ) : (
              <LuX size={10} color="#ffffff" />
            )}
            <Text fontSize={9} fontWeight="800" color="#ffffff">
              {isSuccess ? 'In Store' : 'Failed'}
            </Text>
          </XStack>
        </View>

        {/* Failure Diagnostic Error Strip */}
        {!isSuccess && item.error && (
          <View style={styles.errorStrip}>
            <Text fontSize={8} fontWeight="700" color="#ffffff" numberOfLines={2}>
              ⚠️ {item.error}
            </Text>
          </View>
        )}

        {/* Bottom Overlay Info */}
        <View style={styles.bottomOverlay}>
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={10} fontWeight="900" color="#ffffff" numberOfLines={1}>
              {item.productCode}
            </Text>
            {item.price ? (
              <Text fontSize={10} fontWeight="800" color="#86EFAC">
                ₹{item.price.toLocaleString('en-IN')}
              </Text>
            ) : null}
          </XStack>
          <Text fontSize={8} color="rgba(255,255,255,0.78)" numberOfLines={1}>
            {item.category} {item.fabric ? `· ${item.fabric}` : ''}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <YStack flex={1} backgroundColor={tokens.background} paddingTop={topInset} paddingBottom={bottomInset}>
      {/* Top Header */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={12}
        paddingVertical={10}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <XStack alignItems="center" gap={8} flex={1}>
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: pressed ? 'rgba(0,0,0,0.06)' : 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Back to Batches List"
            >
              <LuArrowLeft size={20} color={tokens.text} />
            </Pressable>
          )}

          <YStack flex={1}>
            <XStack alignItems="center" gap={6}>
              <Text fontSize={15} fontWeight="800" color={tokens.text}>
                Batch #{shortId}
              </Text>
              <View
                style={[
                  styles.batchStatusPill,
                  { backgroundColor: statusCfg.bg, borderColor: statusCfg.border },
                ]}
              >
                <Text fontSize={9} fontWeight="800" color={statusCfg.text}>
                  {statusCfg.label}
                </Text>
              </View>
            </XStack>
            <Text fontSize={10} color={tokens.textMuted}>
              {formatBatchTime(batch.createdAt)} · {batch.totalCount} Products
            </Text>
          </YStack>
        </XStack>

        {onRefresh && (
          <Pressable
            onPress={onRefresh}
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: pressed ? 'rgba(0,0,0,0.06)' : 'transparent' },
            ]}
          >
            <LuRefreshCw size={16} color={tokens.text} />
          </Pressable>
        )}
      </XStack>

      {/* Filter Tabs: All, Successful, Failed */}
      <XStack
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        paddingHorizontal={12}
        paddingVertical={6}
        gap={6}
      >
        <Pressable
          onPress={() => setTileFilter('all')}
          style={[
            styles.filterTab,
            {
              backgroundColor: tileFilter === 'all' ? tokens.accent : 'rgba(0,0,0,0.03)',
            },
          ]}
        >
          <Text
            fontSize={11}
            fontWeight="700"
            color={tileFilter === 'all' ? tokens.accentForeground : tokens.text}
          >
            All ({batchProducts.length > 0 ? batchProducts.length : batch.totalCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTileFilter('completed')}
          style={[
            styles.filterTab,
            {
              backgroundColor: tileFilter === 'completed' ? '#DCFCE7' : 'rgba(0,0,0,0.03)',
              borderColor: tileFilter === 'completed' ? '#86EFAC' : 'transparent',
              borderWidth: tileFilter === 'completed' ? 1 : 0,
            },
          ]}
        >
          <Text
            fontSize={11}
            fontWeight="700"
            color={tileFilter === 'completed' ? '#15803D' : tokens.text}
          >
            ✓ Success ({completedCount > 0 ? completedCount : batch.processedCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTileFilter('failed')}
          style={[
            styles.filterTab,
            {
              backgroundColor: tileFilter === 'failed' ? '#FEE2E2' : 'rgba(0,0,0,0.03)',
              borderColor: tileFilter === 'failed' ? '#FCA5A5' : 'transparent',
              borderWidth: tileFilter === 'failed' ? 1 : 0,
            },
          ]}
        >
          <Text
            fontSize={11}
            fontWeight="700"
            color={tileFilter === 'failed' ? '#B91C1C' : tokens.text}
          >
            ⚠️ Failed ({failedCount > 0 ? failedCount : batch.failedCount})
          </Text>
        </Pressable>
      </XStack>

      {/* Product Tiles Grid */}
      {batchProducts.length === 0 ? (
        <YStack alignItems="center" justifyContent="center" flex={1} gap={10} paddingHorizontal={20}>
          <LuLayers size={40} color={tokens.textMuted} />
          <Text fontSize={14} fontWeight="800" color={tokens.text}>
            {batch.status === 'in_progress' ? 'Processing Batch...' : 'Batch Completed'}
          </Text>
          <Text fontSize={12} color={tokens.textMuted} textAlign="center" maxWidth={280}>
            {batch.processedCount} products published successfully.
            {batch.failedCount > 0 ? ` ${batch.failedCount} failed.` : ''}
          </Text>
        </YStack>
      ) : filteredBatchProducts.length === 0 ? (
        <YStack alignItems="center" justifyContent="center" flex={1} gap={8} paddingHorizontal={20}>
          <Text fontSize={13} fontWeight="700" color={tokens.text}>
            No {tileFilter === 'completed' ? 'successful' : 'failed'} products in this batch.
          </Text>
          <Pressable onPress={() => setTileFilter('all')} style={styles.resetPillBtn}>
            <Text fontSize={11} fontWeight="800" color={tokens.accent}>
              View All Products
            </Text>
          </Pressable>
        </YStack>
      ) : (
        <FlatList
          data={filteredBatchProducts}
          keyExtractor={(item) => `${item.productId}-${item.status}`}
          numColumns={3}
          renderItem={renderProductTile}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={{ padding: 6, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={tokens.accent}
                colors={[tokens.accent]}
              />
            ) : undefined
          }
        />
      )}
    </YStack>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BATCHES SUMMARY LIST PAGE
// ═══════════════════════════════════════════════════════════════════
export function AdminStorePublishBatchesPage({
  jobs = [],
  loading = false,
  refreshing = false,
  isLoadingMore = false,
  hasMore = false,
  onRefresh,
  onLoadMore,
  onBack,
  onSelectBatch,
  onOpenPdp,
  disableSafeArea = false,
}: AdminStorePublishBatchesPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  // Fallback internal state if onSelectBatch navigation is not provided
  const [internalSelectedBatch, setInternalSelectedBatch] = useState<PublishJobStatusResponse | null>(null);

  if (internalSelectedBatch) {
    return (
      <AdminStorePublishBatchDetailPage
        batch={internalSelectedBatch}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onBack={() => setInternalSelectedBatch(null)}
        onOpenPdp={onOpenPdp}
        disableSafeArea={disableSafeArea}
      />
    );
  }

  // ── RENDER 3-PER-ROW VERTICAL BATCH TILE ──
  const renderBatchCard = ({ item: job }: { item: PublishJobStatusResponse }) => {
    const statusCfg = getBatchStatusBadge(job.status);
    const shortId = job.id.replace(/-/g, '').substring(0, 8);
    const isRunning = job.status === 'in_progress' || job.status === 'queued';
    const timestamp = formatBatchTimestamp(job.createdAt);

    return (
      <Pressable
        key={job.id}
        onPress={() => {
          if (onSelectBatch) {
            onSelectBatch(job);
          } else {
            setInternalSelectedBatch(job);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={`Batch ${job.id} - ${timestamp}`}
        style={({ pressed }) => [
          styles.batchTile,
          {
            backgroundColor: tokens.surface,
            borderColor: isRunning ? '#F59E0B' : job.status === 'failed' ? '#FCA5A5' : tokens.border,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <YStack flex={1} justifyContent="space-between" gap={8}>
          {/* Top Row: Status Pill & Action */}
          <XStack alignItems="center" justifyContent="space-between">
            <View
              style={[
                styles.tileStatusPill,
                { backgroundColor: statusCfg.bg, borderColor: statusCfg.border },
              ]}
            >
              <XStack alignItems="center" gap={3}>
                {isRunning && (
                  <ActivityIndicator size="small" color={statusCfg.text} style={{ transform: [{ scale: 0.5 }] }} />
                )}
                <Text fontSize={9} fontWeight="800" color={statusCfg.text} numberOfLines={1}>
                  {statusCfg.label}
                </Text>
              </XStack>
            </View>

            <Text fontSize={8} color={tokens.textMuted} fontWeight="700" textTransform="uppercase">
              {job.action === 'sync_updates' ? 'Sync' : 'Pub'}
            </Text>
          </XStack>

          {/* Primary / First-Class Label: Timestamp (dd mmm yy hh mm) & Secondary Label: GUID */}
          <YStack gap={2}>
            <Text
              fontSize={11}
              fontWeight="800"
              color={tokens.text}
              numberOfLines={2}
              lineHeight={15}
              accessibilityLabel={`Timestamp: ${timestamp}`}
            >
              {timestamp}
            </Text>

            <Text
              fontSize={9}
              color={tokens.textMuted}
              fontFamily="$mono"
              numberOfLines={1}
              accessibilityLabel={`GUID: ${shortId}`}
            >
              #{shortId}
            </Text>
          </YStack>

          {/* Bottom Row: Metrics (Succeeded / Failed / Total) */}
          <YStack gap={3}>
            <XStack alignItems="center" gap={4} flexWrap="wrap">
              <View style={[styles.tileMetricPill, { backgroundColor: '#DCFCE7' }]}>
                <Text fontSize={9} fontWeight="800" color="#15803D">
                  ✓ {job.processedCount}
                </Text>
              </View>

              {job.failedCount > 0 && (
                <View style={[styles.tileMetricPill, { backgroundColor: '#FEE2E2' }]}>
                  <Text fontSize={9} fontWeight="800" color="#B91C1C">
                    ⚠️ {job.failedCount}
                  </Text>
                </View>
              )}
            </XStack>

            <Text fontSize={9} color={tokens.textMuted} fontWeight="600">
              {job.totalCount} {job.totalCount === 1 ? 'item' : 'items'}
            </Text>
          </YStack>
        </YStack>
      </Pressable>
    );
  };

  return (
    <YStack flex={1} backgroundColor={tokens.background} paddingTop={topInset} paddingBottom={bottomInset}>
      {/* Top Header */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={12}
        paddingVertical={10}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <XStack alignItems="center" gap={8}>
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: pressed ? 'rgba(0,0,0,0.06)' : 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <LuArrowLeft size={20} color={tokens.text} />
            </Pressable>
          )}

          <YStack>
            <XStack alignItems="center" gap={6}>
              <LuLayers size={16} color={tokens.accent} />
              <Text fontSize={15} fontWeight="800" color={tokens.text}>
                Publish Batches
              </Text>
            </XStack>
            <Text fontSize={11} color={tokens.textMuted}>
              {jobs.length} Batch{jobs.length === 1 ? '' : 'es'} Loaded
            </Text>
          </YStack>
        </XStack>

        {onRefresh && (
          <Pressable
            onPress={onRefresh}
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: pressed ? 'rgba(0,0,0,0.06)' : 'transparent' },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Refresh Batches"
          >
            <LuRefreshCw size={16} color={tokens.text} />
          </Pressable>
        )}
      </XStack>

      {/* Batches List */}
      {loading ? (
        <YStack alignItems="center" justifyContent="center" flex={1} gap={10}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text fontSize={13} color={tokens.textMuted} fontWeight="600">
            Loading Publish Batches...
          </Text>
        </YStack>
      ) : jobs.length === 0 ? (
        <YStack alignItems="center" justifyContent="center" flex={1} gap={10} paddingHorizontal={20}>
          <LuLayers size={40} color={tokens.textMuted} />
          <Text fontSize={14} fontWeight="800" color={tokens.text}>
            No Publish Batches Yet
          </Text>
          <Text fontSize={12} color={tokens.textMuted} textAlign="center" maxWidth={280}>
            When you publish products from the catalog to the store, batch summaries and product status will appear here.
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderBatchCard}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={{ padding: 6, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          onEndReached={hasMore && !isLoadingMore ? onLoadMore : undefined}
          onEndReachedThreshold={0.4}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={tokens.accent}
                colors={[tokens.accent]}
              />
            ) : undefined
          }
          ListFooterComponent={
            isLoadingMore ? (
              <YStack alignItems="center" paddingVertical={16} gap={6}>
                <ActivityIndicator size="small" color={tokens.accent} />
                <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                  Loading more batches...
                </Text>
              </YStack>
            ) : hasMore && onLoadMore ? (
              <YStack alignItems="center" paddingVertical={12}>
                <Pressable
                  onPress={onLoadMore}
                  style={styles.loadMoreBtn}
                  accessibilityRole="button"
                >
                  <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                    Load More Batches ▾
                  </Text>
                </Pressable>
              </YStack>
            ) : null
          }
        />
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchTile: {
    flex: 1 / 3,
    maxWidth: '32.5%',
    minHeight: 125,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    justifyContent: 'space-between',
  },
  tileStatusPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '75%',
  },
  tileMetricPill: {
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  batchCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  batchStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
  },
  columnWrapper: {
    gap: 6,
    marginBottom: 6,
  },
  gridTile: {
    flex: 1 / 3,
    aspectRatio: 3 / 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#eee',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  statusPill: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  errorStrip: {
    position: 'absolute',
    top: 28,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.94)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 3,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    zIndex: 2,
  },
  resetPillBtn: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  loadMoreBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
});
