import React, { useState } from 'react';
import { ScrollView, Switch, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LuSettings, LuArrowLeft, LuHistory, LuInbox } from 'react-icons/lu';
import { useTheme } from '../../theme';
import {
  OrderIdGeneratorCard,
  GeneratorSource,
  GeneratorPaymentMode,
  GeneratedOrderResult,
} from '../molecules/OrderIdGeneratorCard';
import {
  OrderIdHistoryItem,
  OrderIdHistoryEntry,
} from '../molecules/OrderIdHistoryItem';
import { OrderIdEditSheet } from '../molecules/OrderIdEditSheet';

export interface OrderIdGeneratorPageProps {
  initialRecentIds?: OrderIdHistoryEntry[];
  initialGeneratedEntry?: GeneratedOrderResult | null;
  initialSelectedSource?: GeneratorSource;
  initialPaymentMode?: GeneratorPaymentMode;
  initialSourceHandle?: string;
  initialShowDeleted?: boolean;
  isLoading?: boolean;
  disableSafeArea?: boolean;
  onGenerateOrder?: (
    source: GeneratorSource,
    paymentMode: GeneratorPaymentMode,
    handle: string
  ) => void;
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
  isLoading = false,
  disableSafeArea = false,
  onGenerateOrder,
  onOpenPlatform,
  onNavigateToDetails,
  onBack,
  onOpenSettings,
}: OrderIdGeneratorPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const [selectedSource, setSelectedSource] = useState<GeneratorSource>(initialSelectedSource);
  const [paymentMode, setPaymentMode] = useState<GeneratorPaymentMode>(initialPaymentMode);
  const [sourceHandle, setSourceHandle] = useState(initialSourceHandle);
  const [loading, setLoading] = useState(isLoading);
  const [recentIds, setRecentIds] = useState<OrderIdHistoryEntry[]>(initialRecentIds);
  const [generatedEntry, setGeneratedEntry] = useState<GeneratedOrderResult | null>(
    initialGeneratedEntry
  );
  const [showDeleted, setShowDeleted] = useState(initialShowDeleted);

  // Edit sheet state
  const [editingItem, setEditingItem] = useState<OrderIdHistoryEntry | null>(null);

  const handleGenerate = () => {
    if (!selectedSource) return;
    setLoading(true);

    if (onGenerateOrder) {
      onGenerateOrder(selectedSource, paymentMode, sourceHandle);
    }

    // Local simulation for Storybook & standalone preview
    setTimeout(() => {
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const newId = String(randomNum);
      const newResult: GeneratedOrderResult = {
        id: newId,
        source: selectedSource,
        paymentMode: paymentMode,
        timestamp: new Date().toISOString(),
        sourceHandle: sourceHandle,
        isNew: true,
      };

      const newHistoryEntry: OrderIdHistoryEntry = {
        id: newId,
        source: selectedSource,
        paymentMode: paymentMode,
        timestamp: new Date().toISOString(),
        sourceHandle: sourceHandle,
        customerPhone: selectedSource === 'whatsapp' ? sourceHandle : undefined,
        instagramHandle: selectedSource === 'instagram' ? sourceHandle : undefined,
      };

      setGeneratedEntry(newResult);
      setRecentIds((prev) => [newHistoryEntry, ...prev.slice(0, 19)]);
      setSelectedSource(null);
      setPaymentMode(null);
      setSourceHandle('');
      setLoading(false);
    }, 600);
  };

  const handleUpdateItem = (
    id: string,
    updated: { paymentMode: 'cod' | 'prepaid' | null; sourceHandle: string }
  ) => {
    setRecentIds((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            paymentMode: updated.paymentMode,
            customerPhone:
              item.source?.toLowerCase() === 'whatsapp' ? updated.sourceHandle : item.customerPhone,
            instagramHandle:
              item.source?.toLowerCase() === 'instagram'
                ? updated.sourceHandle
                : item.instagramHandle,
            sourceHandle: updated.sourceHandle,
          };
        }
        return item;
      })
    );
  };

  const filteredHistory = showDeleted
    ? recentIds
    : recentIds.filter((item) => !item.isDeleted);

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
              style={{ cursor: 'pointer' } as any}
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
          style={{ cursor: 'pointer' } as any}
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
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Generator Card Molecule */}
        <OrderIdGeneratorCard
          selectedSource={selectedSource}
          onSelectSource={setSelectedSource}
          paymentMode={paymentMode}
          onSelectPaymentMode={setPaymentMode}
          sourceHandle={sourceHandle}
          onChangeSourceHandle={setSourceHandle}
          loading={loading}
          onGenerate={handleGenerate}
          generatedEntry={generatedEntry}
          onCopy={(id, includePrefix) => {
            console.log(`Copied ${id} (prefix: ${includePrefix})`);
          }}
          onOpenPlatform={onOpenPlatform}
        />

        {/* History Section Header */}
        <YStack gap={12}>
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap={8}>
              <LuHistory size={16} color={tokens.text} />
              <Text fontSize={15} fontWeight="700" color={tokens.text}>
                Recent Order IDs
              </Text>
              <XStack
                paddingHorizontal={7}
                paddingVertical={2}
                borderRadius={tokens.radius.full}
                backgroundColor={tokens.surfaceRaised}
                borderWidth={1}
                borderColor={tokens.border}
              >
                <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                  {filteredHistory.length}
                </Text>
              </XStack>
            </XStack>

            {/* Show Deleted Toggle */}
            <XStack alignItems="center" gap={8}>
              <Text fontSize={12} color={tokens.textMuted} fontWeight="500">
                Show Deleted
              </Text>
              <Switch
                value={showDeleted}
                onValueChange={setShowDeleted}
                trackColor={{ false: tokens.border, true: tokens.accent }}
                thumbColor={tokens.surface}
              />
            </XStack>
          </XStack>

          {/* History List or Empty State */}
          {filteredHistory.length === 0 ? (
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
                    const target = recentIds.find((x) => x.id === id);
                    if (target) setEditingItem(target);
                  }}
                  onCopy={(id, includePrefix) => {
                    console.log(`Copied from history: ${id} (prefix: ${includePrefix})`);
                  }}
                  onOpenPlatform={onOpenPlatform}
                />
              ))}
            </YStack>
          )}
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
