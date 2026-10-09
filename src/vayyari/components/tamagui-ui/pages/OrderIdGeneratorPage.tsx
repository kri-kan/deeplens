import React, { useState } from 'react';
import { ScrollView, Switch, Pressable, TextInput } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LuSettings, LuArrowLeft, LuHistory, LuInbox, LuSearch, LuX, LuChevronRight, LuChevronDown, LuCheck } from '../icons/lu';
import { useTheme } from '@/theme';
import {
  OrderIdGeneratorCard,
  GeneratorSource,
  GeneratorPaymentMode,
  GeneratedOrderResult,
} from '../molecules/OrderIdGeneratorCard';
import {
  OrderIdHistoryItem,
  OrderIdHistoryEntry,
  OrderIdHistoryListShimmer,
} from '../molecules/OrderIdHistoryItem';
import { OrderIdEditSheet } from '../molecules/OrderIdEditSheet';

export interface OrderIdGeneratorPageProps {
  initialRecentIds?: OrderIdHistoryEntry[];
  initialGeneratedEntry?: GeneratedOrderResult | null;
  initialSelectedSource?: GeneratorSource;
  paymentMode?: GeneratorPaymentMode;
  initialPaymentMode?: GeneratorPaymentMode;
  initialSourceHandle?: string;
  initialShowDeleted?: boolean;
  initialSearchQuery?: string;
  recentLimit?: number;
  isLoading?: boolean;
  isLoadingHistory?: boolean;
  disableSafeArea?: boolean;
  onGenerateOrder?: (
    source: GeneratorSource,
    paymentMode: GeneratorPaymentMode,
    handle: string
  ) => void;
  onUpdateOrder?: (
    id: string,
    updated: { paymentMode: 'cod' | 'prepaid' | null; sourceHandle: string }
  ) => void;
  onRecentLimitChange?: (limit: number) => void;
  onNavigateToAllOrders?: () => void;
  onCopy?: (id: string, includePrefix?: boolean) => void;
  onOpenPlatform?: (source: string, handle?: string) => void;
  onNavigateToDetails?: (id: string) => void;
  onBack?: () => void;
  onOpenSettings?: () => void;
}

export function OrderIdGeneratorPage({
  initialRecentIds = [],
  initialGeneratedEntry = null,
  initialSelectedSource = null,
  initialPaymentMode = null,
  initialSourceHandle = '',
  initialShowDeleted = false,
  initialSearchQuery = '',
  recentLimit = 50,
  isLoading = false,
  isLoadingHistory,
  disableSafeArea = false,
  onGenerateOrder,
  onUpdateOrder,
  onRecentLimitChange,
  onNavigateToAllOrders,
  onCopy,
  onOpenPlatform,
  onNavigateToDetails,
  onBack,
  onOpenSettings,
}: OrderIdGeneratorPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const isHistoryLoading =
    isLoadingHistory !== undefined
      ? isLoadingHistory
      : isLoading && initialRecentIds.length === 0;

  const [selectedSource, setSelectedSource] = useState<GeneratorSource>(initialSelectedSource);
  const [paymentMode, setPaymentMode] = useState<GeneratorPaymentMode>(initialPaymentMode);
  const [sourceHandle, setSourceHandle] = useState(initialSourceHandle);
  const [showDeleted, setShowDeleted] = useState(initialShowDeleted);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedLimit, setSelectedLimit] = useState<number>(recentLimit || 50);
  const [showLimitDropdown, setShowLimitDropdown] = useState(false);

  // Edit sheet state
  const [editingItem, setEditingItem] = useState<OrderIdHistoryEntry | null>(null);

  const handleGenerate = () => {
    if (onGenerateOrder) {
      onGenerateOrder(selectedSource, paymentMode, sourceHandle);
      setSelectedSource(null);
      setPaymentMode(null);
      setSourceHandle('');
    }
  };

  const handleUpdateItem = (
    id: string,
    updated: { paymentMode: 'cod' | 'prepaid' | null; sourceHandle: string }
  ) => {
    if (onUpdateOrder) {
      onUpdateOrder(id, updated);
    }
  };

  const filteredHistory = (
    showDeleted ? initialRecentIds : initialRecentIds.filter((item) => !item.isDeleted)
  ).filter((item) => {
    if (!searchQuery?.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.id.toLowerCase().includes(q) ||
      (item.sourceHandle && item.sourceHandle.toLowerCase().includes(q)) ||
      (item.customerPhone && item.customerPhone.toLowerCase().includes(q)) ||
      (item.instagramHandle && item.instagramHandle.toLowerCase().includes(q))
    );
  });

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* Top Header with Safe Area Handling */}
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
            >
              <LuArrowLeft size={20} color={tokens.text} />
            </Pressable>
          )}
          <YStack gap={1}>
            <Text fontSize={16} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
              Order ID Generator
            </Text>
            <Text fontSize={11} color={tokens.textMuted}>
              Tag, allocate & dispatch orders
            </Text>
          </YStack>
        </XStack>

        {/* Settings Action Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings modal"
          onPress={onOpenSettings}
        >
          <XStack
            padding={8}
            borderRadius={tokens.radius.full}
            backgroundColor={tokens.surfaceRaised}
            alignItems="center"
            justifyContent="center"
          >
            <LuSettings size={18} color={tokens.text} />
          </XStack>
        </Pressable>
      </XStack>

      {/* Main Scrollable View */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: Math.max(32, bottomInset + 24),
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack gap={24}>
          {/* Generator Card Molecule */}
          <OrderIdGeneratorCard
            selectedSource={selectedSource}
            onSelectSource={setSelectedSource}
            paymentMode={paymentMode}
            onSelectPaymentMode={setPaymentMode}
            sourceHandle={sourceHandle}
            onChangeSourceHandle={setSourceHandle}
            loading={isLoading}
            onGenerate={handleGenerate}
            generatedEntry={initialGeneratedEntry}
            onCopy={onCopy}
            onOpenPlatform={onOpenPlatform}
          />

          {/* History Section Header */}
          <YStack gap={12}>
            <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={8}>
              {/* Left Group: Title, Dropdown (20, 50, 100), Show Deleted Toggle */}
              <XStack alignItems="center" gap={10} flexWrap="wrap">
                <Text fontSize={15} fontWeight="700" color={tokens.text}>
                  Recent
                </Text>

                {/* Dropdown Select Trigger for Recent Order ID Count */}
                <YStack style={{ position: 'relative', zIndex: 100 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Select recent orders count limit"
                    onPress={() => setShowLimitDropdown((prev) => !prev)}
                    style={{ cursor: 'pointer' } as any}
                  >
                    <XStack
                      alignItems="center"
                      backgroundColor={tokens.surfaceRaised}
                      borderRadius={tokens.radius.md}
                      borderWidth={1}
                      borderColor={tokens.border}
                      paddingHorizontal={10}
                      paddingVertical={5}
                      gap={6}
                    >
                      <Text fontSize={12} fontWeight="700" color={tokens.text}>
                        {selectedLimit}
                      </Text>
                      <LuChevronDown size={14} color={tokens.textMuted} />
                    </XStack>
                  </Pressable>

                  {/* Dropdown Options List */}
                  {showLimitDropdown && (
                    <YStack
                      position="absolute"
                      top={34}
                      left={0}
                      backgroundColor={tokens.surface}
                      borderRadius={tokens.radius.md}
                      borderWidth={1}
                      borderColor={tokens.border}
                      elevation={8}
                      shadowColor="#000"
                      shadowOffset={{ width: 0, height: 2 }}
                      shadowOpacity={0.15}
                      shadowRadius={6}
                      width={100}
                      paddingVertical={4}
                      zIndex={999}
                    >
                      {[20, 50, 100].map((val) => {
                        const isSelected = selectedLimit === val;
                        return (
                          <Pressable
                            key={val}
                            accessibilityRole="button"
                            accessibilityLabel={`Select ${val} recent orders`}
                            onPress={() => {
                              setSelectedLimit(val);
                              setShowLimitDropdown(false);
                              onRecentLimitChange?.(val);
                            }}
                            style={{ cursor: 'pointer' } as any}
                          >
                            <XStack
                              paddingHorizontal={12}
                              paddingVertical={8}
                              alignItems="center"
                              justifyContent="space-between"
                              backgroundColor={isSelected ? tokens.surfaceRaised : 'transparent'}
                            >
                              <Text
                                fontSize={12}
                                fontWeight={isSelected ? '700' : '500'}
                                color={isSelected ? tokens.accent : tokens.text}
                              >
                                {val}
                              </Text>
                              {isSelected && <LuCheck size={14} color={tokens.accent} />}
                            </XStack>
                          </Pressable>
                        );
                      })}
                    </YStack>
                  )}
                </YStack>

                {/* Show Deleted Toggle (Shifted right next to dropdown) */}
                <XStack alignItems="center" gap={6}>
                  <Text fontSize={12} color={tokens.textMuted} fontWeight="500">
                    Deleted
                  </Text>
                  <Switch
                    value={showDeleted}
                    onValueChange={setShowDeleted}
                    trackColor={{ false: tokens.border, true: tokens.accent }}
                    thumbColor={tokens.surface}
                  />
                </XStack>
              </XStack>

              {/* Right Group: Show All Button */}
              {onNavigateToAllOrders && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Navigate to all orders page"
                  onPress={onNavigateToAllOrders}
                  style={{ cursor: 'pointer' } as any}
                >
                  <XStack
                    alignItems="center"
                    gap={4}
                    paddingHorizontal={12}
                    paddingVertical={6}
                    borderRadius={tokens.radius.full}
                    backgroundColor={tokens.accent}
                  >
                    <Text fontSize={12} fontWeight="700" color="#FFFFFF">
                      Show All
                    </Text>
                    <LuChevronRight size={14} color="#FFFFFF" />
                  </XStack>
                </Pressable>
              )}
            </XStack>

            {/* Search Bar for filtering recent orders */}
            <XStack
              alignItems="center"
              backgroundColor={tokens.surface}
              borderWidth={1}
              borderColor={tokens.border}
              borderRadius={tokens.radius.md}
              paddingHorizontal={12}
              height={40}
              gap={8}
            >
              <LuSearch size={15} color={tokens.textMuted} />
              <TextInput
                placeholder="Search orders by ID, phone, or handle..."
                placeholderTextColor={tokens.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: tokens.text,
                  paddingVertical: 0,
                }}
              />
              {!!searchQuery && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => setSearchQuery('')}
                  hitSlop={8}
                >
                  <LuX size={14} color={tokens.textMuted} />
                </Pressable>
              )}
            </XStack>

            {/* History List, Shimmer Skeleton, or Empty State */}
            {isHistoryLoading ? (
              <OrderIdHistoryListShimmer count={Math.min(selectedLimit, 6)} />
            ) : filteredHistory.length === 0 ? (
              <YStack
                backgroundColor={tokens.surface}
                borderRadius={tokens.radius.lg}
                borderWidth={1}
                borderColor={tokens.border}
                paddingVertical={36}
                paddingHorizontal={20}
                alignItems="center"
                justifyContent="center"
                gap={10}
              >
                <XStack
                  width={48}
                  height={48}
                  borderRadius={tokens.radius.full}
                  backgroundColor={tokens.surfaceRaised}
                  alignItems="center"
                  justifyContent="center"
                >
                  <LuInbox size={24} color={tokens.textMuted} />
                </XStack>
                <Text fontSize={14} fontWeight="700" color={tokens.text}>
                  No Recent Activity
                </Text>
                <Text
                  fontSize={12}
                  color={tokens.textMuted}
                  textAlign="center"
                  maxWidth={240}
                >
                  Generated order IDs will appear here with instant copy and edit options.
                </Text>
              </YStack>
            ) : (
              <YStack gap={10}>
                {filteredHistory.map((item) => (
                  <OrderIdHistoryItem
                    key={item.id}
                    item={item}
                    onPress={(id) => onNavigateToDetails?.(id)}
                    onEdit={(id) => {
                      const target = initialRecentIds.find((x) => x.id === id);
                      if (target) setEditingItem(target);
                    }}
                    onCopy={onCopy}
                    onOpenPlatform={onOpenPlatform}
                  />
                ))}
              </YStack>
            )}
          </YStack>
        </YStack>
      </ScrollView>

      {/* In-Page Edit Sheet */}
      <OrderIdEditSheet
        visible={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onSave={handleUpdateItem}
      />
    </YStack>
  );
}
