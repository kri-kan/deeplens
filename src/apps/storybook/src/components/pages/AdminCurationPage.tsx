import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuArrowLeft, LuShare2, LuStar, LuCheckCheck } from 'react-icons/lu';
import { useTheme } from '../../theme';
import { PlannedProductInfo, TargetChannelOption } from '../molecules/post-planner.types';
import { PostPlannerCurationGrid } from '../organisms/PostPlannerCurationGrid';
import { TargetEligibilitiesBottomSheet } from '../organisms/TargetEligibilitiesBottomSheet';
import { DEFAULT_CHANNELS, DEFAULT_PRODUCTS } from './AdminPostPlannerPage';

export type CurationViewTab = 'starred' | 'completed';

export interface AdminCurationPageProps {
  initialTab?: CurationViewTab;
  controlledTab?: CurationViewTab;
  onTabChange?: (tab: CurationViewTab) => void;
  products?: PlannedProductInfo[];
  channels?: TargetChannelOption[];
  affinitySheetOpen?: boolean;
  selectedAffinityProduct?: PlannedProductInfo | null;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showOnlyIncomplete?: boolean;
  onToggleIncompleteOnly?: (incomplete: boolean) => void;
  onSelectItem?: (item: PlannedProductInfo) => void;
  onSaveAffinity?: (productId: string, assignedChannelIds: string[], isDone: boolean) => void;
  onBack?: () => void;
  onNavigateToQueue?: () => void;
}

export function AdminCurationPage({
  initialTab = 'starred',
  controlledTab,
  onTabChange,
  products = DEFAULT_PRODUCTS,
  channels = DEFAULT_CHANNELS,
  affinitySheetOpen: controlledAffinityOpen,
  selectedAffinityProduct: controlledAffinityProduct,
  searchQuery,
  onSearchChange,
  showOnlyIncomplete,
  onToggleIncompleteOnly,
  onSelectItem,
  onSaveAffinity,
  onBack,
  onNavigateToQueue,
}: AdminCurationPageProps) {
  const { tokens } = useTheme();

  // Tab State: 'starred' (needing curation) vs 'completed' (curated)
  const [internalTab, setInternalTab] = useState<CurationViewTab>(initialTab);
  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;

  const handleTabChange = (tab: CurationViewTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // Product List State
  const [productList, setProductList] = useState<PlannedProductInfo[]>(products);

  const starredItems = productList.filter((p) => p.planningStatus !== 'complete');
  const completedItems = productList.filter((p) => p.planningStatus === 'complete');
  const activeDisplayedItems = activeTab === 'starred' ? starredItems : completedItems;

  // Sheet State
  const [internalAffinityOpen, setInternalAffinityOpen] = useState(false);
  const [internalAffinityProduct, setInternalAffinityProduct] = useState<PlannedProductInfo>(
    productList[0] || products[0] || DEFAULT_PRODUCTS[0]
  );

  const isAffinityOpen =
    controlledAffinityOpen !== undefined ? controlledAffinityOpen : internalAffinityOpen;
  const targetAffinityProduct =
    controlledAffinityProduct || internalAffinityProduct || productList[0] || products[0];

  const handleOpenAffinity = (item: PlannedProductInfo) => {
    setInternalAffinityProduct(item);
    setInternalAffinityOpen(true);
    onSelectItem?.(item);
  };

  const handleSaveAffinity = (selectedIds: string[], isComplete: boolean) => {
    if (targetAffinityProduct) {
      setProductList((prev) =>
        prev.map((item) =>
          item.id === targetAffinityProduct.id
            ? {
                ...item,
                assignedChannelIds: selectedIds,
                planningStatus: isComplete ? 'complete' : 'in_progress',
              }
            : item
        )
      );
      onSaveAffinity?.(targetAffinityProduct.id, selectedIds, isComplete);
    }
    setInternalAffinityOpen(false);
  };

  return (
    <YStack
      flex={1}
      width="100%"
      maxWidth={440}
      alignSelf="center"
      backgroundColor={tokens.background}
      position="relative"
      overflow="hidden"
    >
      {/* ── TOP NAV BAR WITH COMPACT STARRED VS COMPLETED TOGGLE NEXT TO CURATION TITLE ── */}
      <YStack
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <XStack
          paddingHorizontal={12}
          paddingVertical={8}
          alignItems="center"
          justifyContent="space-between"
          gap={8}
        >
          <XStack alignItems="center" gap={8} flexShrink={1}>
            {onBack && (
              <Pressable
                onPress={onBack}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.iconBtn,
                  { backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent' },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <LuArrowLeft size={18} color={tokens.text} />
              </Pressable>
            )}
            <Text fontSize={15} fontWeight="800" color={tokens.text}>
              Curation
            </Text>

            {/* Segmented Pill Toggle right next to Curation label */}
            <XStack
              backgroundColor={tokens.surfaceRaised}
              borderRadius={16}
              padding={2}
              borderWidth={1}
              borderColor={tokens.border}
              alignItems="center"
            >
              {/* Starred Tab (Left) */}
              <Pressable
                onPress={() => handleTabChange('starred')}
                style={[
                  styles.pillTab,
                  activeTab === 'starred' && {
                    backgroundColor: tokens.accent,
                    shadowColor: tokens.accent,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    elevation: 2,
                  },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'starred' }}
                accessibilityLabel={`Starred items (${starredItems.length})`}
              >
                <XStack alignItems="center" gap={4}>
                  <LuStar
                    size={11}
                    color={activeTab === 'starred' ? tokens.accentForeground : tokens.textSecondary}
                    fill={activeTab === 'starred' ? tokens.accentForeground : 'none'}
                  />
                  <Text
                    fontSize={11}
                    fontWeight="700"
                    color={activeTab === 'starred' ? tokens.accentForeground : tokens.textSecondary}
                  >
                    Starred ({starredItems.length})
                  </Text>
                </XStack>
              </Pressable>

              {/* Completed Tab (Right) */}
              <Pressable
                onPress={() => handleTabChange('completed')}
                style={[
                  styles.pillTab,
                  activeTab === 'completed' && {
                    backgroundColor: tokens.accent,
                    shadowColor: tokens.accent,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    elevation: 2,
                  },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'completed' }}
                accessibilityLabel={`Completed items (${completedItems.length})`}
              >
                <XStack alignItems="center" gap={4}>
                  <LuCheckCheck
                    size={12}
                    color={activeTab === 'completed' ? tokens.accentForeground : tokens.textSecondary}
                  />
                  <Text
                    fontSize={11}
                    fontWeight="700"
                    color={activeTab === 'completed' ? tokens.accentForeground : tokens.textSecondary}
                  >
                    Completed ({completedItems.length})
                  </Text>
                </XStack>
              </Pressable>
            </XStack>
          </XStack>

          {onNavigateToQueue && (
            <Pressable
              onPress={onNavigateToQueue}
              hitSlop={8}
              style={({ pressed }) => [
                styles.shortcutBtn,
                {
                  backgroundColor: pressed ? tokens.accentSubtle : tokens.surfaceRaised,
                  borderColor: tokens.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Switch to sharing queue"
            >
              <LuShare2 size={13} color={tokens.accent} />
              <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                Queue
              </Text>
            </Pressable>
          )}
        </XStack>
      </YStack>

      {/* ── CURATION GRID ORGANISM ── */}
      <PostPlannerCurationGrid
        items={activeDisplayedItems}
        onSelectItem={handleOpenAffinity}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        showOnlyIncomplete={showOnlyIncomplete}
        onToggleIncompleteOnly={onToggleIncompleteOnly}
      />

      {/* ── TARGET ELIGIBILITIES BOTTOM SHEET ── */}
      <TargetEligibilitiesBottomSheet
        visible={isAffinityOpen}
        product={targetAffinityProduct}
        channels={channels}
        assignedChannelIds={targetAffinityProduct?.assignedChannelIds || []}
        onSaveAffinity={handleSaveAffinity}
        onDismiss={() => setInternalAffinityOpen(false)}
      />
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
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillTab: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
