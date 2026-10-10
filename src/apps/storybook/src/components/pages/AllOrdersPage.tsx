import React, { useState, useEffect } from 'react';
import { ScrollView, Pressable, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LuArrowLeft,
  LuSearch,
  LuX,
  LuSlidersHorizontal,
  LuRefreshCw,
  LuInbox,
} from 'react-icons/lu';
import { useTheme } from '../../theme';
import {
  OrderIdHistoryItem,
  OrderIdHistoryEntry,
  OrderIdHistoryItemShimmer,
  OrderIdHistoryListShimmer,
} from '../molecules/OrderIdHistoryItem';
import { OrderIdEditSheet } from '../molecules/OrderIdEditSheet';

export type OrderSortOption = 'date_desc' | 'date_asc' | 'id_asc' | 'id_desc' | 'name_asc';
export type OrderSourceFilter = 'all' | 'whatsapp' | 'instagram' | 'none';
export type PaymentModeFilter = 'all' | 'cod' | 'prepaid';
export type DeletedFilter = 'active' | 'all' | 'deleted';

export interface AllOrdersPageProps {
  orders?: OrderIdHistoryEntry[];
  totalCount?: number;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  searchQuery?: string;
  sortBy?: OrderSortOption;
  sourceFilter?: OrderSourceFilter;
  paymentModeFilter?: PaymentModeFilter;
  deletedFilter?: DeletedFilter;
  disableSafeArea?: boolean;
  onSearchChange?: (query: string) => void;
  onSortChange?: (sort: OrderSortOption) => void;
  onSourceFilterChange?: (source: OrderSourceFilter) => void;
  onPaymentModeFilterChange?: (mode: PaymentModeFilter) => void;
  onDeletedFilterChange?: (deleted: DeletedFilter) => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  onUpdateOrder?: (
    id: string,
    updated: { paymentMode: 'cod' | 'prepaid' | null; sourceHandle: string }
  ) => void;
  onCopy?: (id: string, includePrefix?: boolean) => void;
  onOpenPlatform?: (source: string, handle?: string) => void;
  onNavigateToDetails?: (id: string) => void;
  onBack?: () => void;
}

export function AllOrdersPage({
  orders = [],
  totalCount = 0,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  searchQuery = '',
  sortBy = 'date_desc',
  sourceFilter = 'all',
  paymentModeFilter = 'all',
  deletedFilter = 'active',
  disableSafeArea = false,
  onSearchChange,
  onSortChange,
  onSourceFilterChange,
  onPaymentModeFilterChange,
  onDeletedFilterChange,
  onLoadMore,
  onRefresh,
  onUpdateOrder,
  onCopy,
  onOpenPlatform,
  onNavigateToDetails,
  onBack,
}: AllOrdersPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const [showFilters, setShowFilters] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderIdHistoryEntry | null>(null);
  const [isPainted, setIsPainted] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted) {
        setIsPainted(true);
      }
    }, 50);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  const shouldShowShimmer = isLoading || !isPainted;

  const handleUpdateItem = (
    id: string,
    updated: { paymentMode: 'cod' | 'prepaid' | null; sourceHandle: string }
  ) => {
    if (onUpdateOrder) {
      onUpdateOrder(id, updated);
    }
  };

  const renderItem = ({ item }: { item: OrderIdHistoryEntry }) => (
    <YStack paddingHorizontal={16} paddingVertical={4}>
      <OrderIdHistoryItem
        item={item}
        onPress={(id) => onNavigateToDetails?.(id)}
        onEdit={() => setEditingItem(item)}
        onCopy={onCopy}
        onOpenPlatform={onOpenPlatform}
      />
    </YStack>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <YStack paddingHorizontal={16} paddingVertical={4} gap={8} width="100%">
        <OrderIdHistoryItemShimmer tokens={tokens} />
        <OrderIdHistoryItemShimmer tokens={tokens} />
      </YStack>
    );
  };

  const sortLabels: Record<OrderSortOption, string> = {
    date_desc: 'Newest First',
    date_asc: 'Oldest First',
    id_desc: 'Order ID (High-Low)',
    id_asc: 'Order ID (Low-High)',
    name_asc: 'Customer Name (A-Z)',
  };

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* Header */}
      <XStack
        paddingTop={topInset}
        height={56 + topInset}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={16}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <XStack alignItems="center" gap={12}>
          {onBack && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBack}
              style={{ cursor: 'pointer' } as any}
            >
              <LuArrowLeft size={20} color={tokens.text} />
            </Pressable>
          )}
          <YStack gap={1}>
            <XStack alignItems="center" gap={8}>
              <Text fontSize={16} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
                All Orders
              </Text>
              <XStack
                paddingHorizontal={7}
                paddingVertical={2}
                borderRadius={tokens.radius.full}
                backgroundColor={tokens.surfaceRaised}
                borderWidth={1}
                borderColor={tokens.border}
              >
                {shouldShowShimmer && !totalCount && orders.length === 0 ? (
                  <YStack width={18} height={12} backgroundColor={tokens.border} borderRadius={tokens.radius.xs} opacity={0.6} />
                ) : (
                  <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                    {totalCount || orders.length}
                  </Text>
                )}
              </XStack>
            </XStack>
            <Text fontSize={11} color={tokens.textMuted}>
              Search, filter & manage complete order history
            </Text>
          </YStack>
        </XStack>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh orders list"
          onPress={onRefresh}
          style={{ cursor: 'pointer' } as any}
        >
          <XStack
            padding={8}
            borderRadius={tokens.radius.full}
            backgroundColor={tokens.surfaceRaised}
            alignItems="center"
            justifyContent="center"
          >
            <LuRefreshCw size={18} color={tokens.text} />
          </XStack>
        </Pressable>
      </XStack>

      {/* Control Bar: Search & Filter Toggle */}
      <YStack paddingHorizontal={16} paddingTop={12} gap={10} backgroundColor={tokens.surface} borderBottomWidth={1} borderBottomColor={tokens.border} paddingBottom={12}>
        {/* Search Bar */}
        <XStack
          alignItems="center"
          backgroundColor={tokens.background}
          borderWidth={1}
          borderColor={tokens.border}
          borderRadius={tokens.radius.md}
          paddingHorizontal={12}
          height={42}
          gap={8}
        >
          <LuSearch size={16} color={tokens.textMuted} />
          <TextInput
            placeholder="Search order ID, phone, handle, or address..."
            placeholderTextColor={tokens.textMuted}
            value={searchQuery}
            onChangeText={onSearchChange}
            style={{
              flex: 1,
              fontSize: 13,
              color: tokens.text,
              outlineStyle: 'none',
              paddingVertical: 0,
            } as any}
          />
          {!!searchQuery && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => onSearchChange?.('')}
              hitSlop={8}
              style={{ cursor: 'pointer' } as any}
            >
              <LuX size={14} color={tokens.textMuted} />
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle filter options"
            onPress={() => setShowFilters((prev) => !prev)}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              paddingHorizontal={8}
              paddingVertical={4}
              borderRadius={tokens.radius.sm}
              backgroundColor={
                showFilters || sourceFilter !== 'all' || paymentModeFilter !== 'all' || deletedFilter !== 'active'
                  ? tokens.accent
                  : tokens.surfaceRaised
              }
              alignItems="center"
              gap={4}
            >
              <LuSlidersHorizontal
                size={14}
                color={
                  showFilters || sourceFilter !== 'all' || paymentModeFilter !== 'all' || deletedFilter !== 'active'
                    ? '#FFFFFF'
                    : tokens.text
                }
              />
              <Text
                fontSize={11}
                fontWeight="700"
                color={
                  showFilters || sourceFilter !== 'all' || paymentModeFilter !== 'all' || deletedFilter !== 'active'
                    ? '#FFFFFF'
                    : tokens.text
                }
              >
                Filter
              </Text>
            </XStack>
          </Pressable>
        </XStack>

        {/* Filter Expandable Panel */}
        {showFilters && (
          <YStack
            backgroundColor={tokens.surfaceRaised}
            borderRadius={tokens.radius.md}
            padding={12}
            gap={12}
            borderWidth={1}
            borderColor={tokens.border}
          >
            {/* Sort By Row */}
            <YStack gap={4}>
              <Text fontSize={11} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
                Sort By
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {(['date_desc', 'date_asc', 'id_desc', 'id_asc', 'name_asc'] as OrderSortOption[]).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => onSortChange?.(option)}
                    style={{ cursor: 'pointer' } as any}
                  >
                    <XStack
                      paddingHorizontal={10}
                      paddingVertical={5}
                      borderRadius={tokens.radius.full}
                      backgroundColor={sortBy === option ? tokens.accent : tokens.surface}
                      borderWidth={1}
                      borderColor={sortBy === option ? tokens.accent : tokens.border}
                    >
                      <Text
                        fontSize={11}
                        fontWeight="600"
                        color={sortBy === option ? '#FFFFFF' : tokens.text}
                      >
                        {sortLabels[option]}
                      </Text>
                    </XStack>
                  </Pressable>
                ))}
              </ScrollView>
            </YStack>

            {/* Platform Source Filter */}
            <YStack gap={4}>
              <Text fontSize={11} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
                Platform Source
              </Text>
              <XStack gap={6} flexWrap="wrap">
                {(['all', 'whatsapp', 'instagram', 'none'] as OrderSourceFilter[]).map((src) => (
                  <Pressable
                    key={src}
                    onPress={() => onSourceFilterChange?.(src)}
                    style={{ cursor: 'pointer' } as any}
                  >
                    <XStack
                      paddingHorizontal={10}
                      paddingVertical={4}
                      borderRadius={tokens.radius.sm}
                      backgroundColor={sourceFilter === src ? tokens.text : tokens.surface}
                      borderWidth={1}
                      borderColor={tokens.border}
                    >
                      <Text
                        fontSize={11}
                        fontWeight="600"
                        color={sourceFilter === src ? tokens.surface : tokens.text}
                      >
                        {src === 'all' ? 'All Sources' : src.charAt(0).toUpperCase() + src.slice(1)}
                      </Text>
                    </XStack>
                  </Pressable>
                ))}
              </XStack>
            </YStack>

            {/* Payment Mode Filter & Deleted Status */}
            <XStack gap={16} flexWrap="wrap">
              <YStack gap={4} flex={1}>
                <Text fontSize={11} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
                  Payment Mode
                </Text>
                <XStack gap={6}>
                  {(['all', 'cod', 'prepaid'] as PaymentModeFilter[]).map((mode) => (
                    <Pressable
                      key={mode}
                      onPress={() => onPaymentModeFilterChange?.(mode)}
                      style={{ cursor: 'pointer' } as any}
                    >
                      <XStack
                        paddingHorizontal={8}
                        paddingVertical={4}
                        borderRadius={tokens.radius.sm}
                        backgroundColor={paymentModeFilter === mode ? tokens.accent : tokens.surface}
                        borderWidth={1}
                        borderColor={tokens.border}
                      >
                        <Text
                          fontSize={11}
                          fontWeight="600"
                          color={paymentModeFilter === mode ? '#FFFFFF' : tokens.text}
                        >
                          {mode.toUpperCase()}
                        </Text>
                      </XStack>
                    </Pressable>
                  ))}
                </XStack>
              </YStack>

              <YStack gap={4} flex={1}>
                <Text fontSize={11} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
                  Status
                </Text>
                <XStack gap={6}>
                  {(['active', 'all', 'deleted'] as DeletedFilter[]).map((del) => (
                    <Pressable
                      key={del}
                      onPress={() => onDeletedFilterChange?.(del)}
                      style={{ cursor: 'pointer' } as any}
                    >
                      <XStack
                        paddingHorizontal={8}
                        paddingVertical={4}
                        borderRadius={tokens.radius.sm}
                        backgroundColor={deletedFilter === del ? tokens.text : tokens.surface}
                        borderWidth={1}
                        borderColor={tokens.border}
                      >
                        <Text
                          fontSize={11}
                          fontWeight="600"
                          color={deletedFilter === del ? tokens.surface : tokens.text}
                        >
                          {del.charAt(0).toUpperCase() + del.slice(1)}
                        </Text>
                      </XStack>
                    </Pressable>
                  ))}
                </XStack>
              </YStack>
            </XStack>
          </YStack>
        )}
      </YStack>

      {/* Main List View with Shimmers, Empty State, or Paginated FlatList */}
      {shouldShowShimmer ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 12,
            paddingHorizontal: 16,
            paddingBottom: Math.max(32, bottomInset + 24),
          }}
        >
          <OrderIdHistoryListShimmer count={8} gap={8} tokens={tokens} />
        </ScrollView>
      ) : orders.length === 0 ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding={32} gap={12}>
          <XStack
            width={56}
            height={56}
            borderRadius={tokens.radius.full}
            backgroundColor={tokens.surfaceRaised}
            alignItems="center"
            justifyContent="center"
          >
            <LuInbox size={28} color={tokens.textMuted} />
          </XStack>
          <Text fontSize={15} fontWeight="700" color={tokens.text}>
            No Orders Found
          </Text>
          <Text fontSize={12} color={tokens.textMuted} textAlign="center" maxWidth={260}>
            No order records match your current search query or filter criteria.
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onEndReached={() => {
            if (hasMore && !isLoadingMore && onLoadMore) {
              onLoadMore();
            }
          }}
          onEndReachedThreshold={0.2}
          ListFooterComponent={renderFooter}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: Math.max(32, bottomInset + 24),
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Inline Edit Sheet */}
      <OrderIdEditSheet
        visible={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onSave={handleUpdateItem}
      />
    </YStack>
  );
}
