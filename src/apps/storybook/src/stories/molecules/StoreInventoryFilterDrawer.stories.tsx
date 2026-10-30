import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuSlidersHorizontal } from 'react-icons/lu';
import {
  StoreInventoryFilterDrawer,
  StoreInventoryFilterState,
  DEFAULT_STORE_INVENTORY_FILTER_STATE,
  getActiveStoreInventoryFilterCount,
} from '../../components/molecules/StoreInventoryFilterDrawer';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/StoreInventoryFilterDrawer',
  component: StoreInventoryFilterDrawer,
  decorators: [withFormFactor('mobile', 'Dynamic Left Filter Panel (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    visible: true,
    current: DEFAULT_STORE_INVENTORY_FILTER_STATE,
    onClose: () => {},
    onApply: () => {},
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof StoreInventoryFilterDrawer>;

/**
 * 1. Default Drawer Open:
 * Demonstrates the dynamic panel sliding out from the left with standard neutral defaults.
 */
export const DefaultDrawer: Story = {
  name: '1. Default Filter Drawer (Fresh State)',
  args: {
    visible: true,
    current: DEFAULT_STORE_INVENTORY_FILTER_STATE,
  },
};

/**
 * 2. Active Filters Drawer:
 * Demonstrates the left nav rail with badge indicators and active options selected.
 */
export const ActiveFiltersDrawer: Story = {
  name: '2. Active Filters Drawer (Badges on Active Rail Sections)',
  args: {
    visible: true,
    current: {
      sortBy: 'price_low',
      lifecycle: 'available',
      category: 'Saree',
      fabric: 'Pure Silk',
      priceRange: '10k_20k',
      skuType: 'multi',
    },
  },
};

/**
 * 3. Interactive Trigger & Drawer Harness:
 * Simulates the user tapping the filter button in the in-store inventory page,
 * modifying filters, and applying them.
 */
export const InteractiveTriggerHarness: Story = {
  name: '3. Interactive Trigger Harness (Live Toggle & Apply)',
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [filters, setFilters] = useState<StoreInventoryFilterState>({
      ...DEFAULT_STORE_INVENTORY_FILTER_STATE,
      category: 'Saree',
      fabric: 'Pure Silk',
    });

    const activeCount = getActiveStoreInventoryFilterCount(filters);

    return (
      <YStack flex={1} padding={20} gap={16} alignItems="center" justifyContent="center">
        <Text fontSize={16} fontWeight="800" color="$text">
          In-Store Dynamic Filter Panel Demo
        </Text>
        <Text fontSize={12} color="$textMuted" textAlign="center" maxWidth={300}>
          Tap the button below to trigger the dynamic left panel, choose facets, and test live apply / clear.
        </Text>

        <Pressable
          onPress={() => setIsOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: '#1B4D3E',
            cursor: 'pointer',
          }}
        >
          <LuSlidersHorizontal size={16} color="#FFFFFF" />
          <Text fontSize={13} fontWeight="700" color="#FFFFFF">
            Open Filters {activeCount > 0 ? `(${activeCount})` : ''}
          </Text>
        </Pressable>

        <YStack
          backgroundColor="$surface"
          padding={14}
          borderRadius={8}
          borderWidth={1}
          borderColor="$border"
          width="100%"
          maxWidth={340}
          gap={6}
        >
          <Text fontSize={11} fontWeight="800" color="$textMuted" textTransform="uppercase">
            Current Filter State:
          </Text>
          <Text fontSize={12} color="$text">
            • Sort: {filters.sortBy}
          </Text>
          <Text fontSize={12} color="$text">
            • Availability: {filters.lifecycle}
          </Text>
          <Text fontSize={12} color="$text">
            • Category: {filters.category}
          </Text>
          <Text fontSize={12} color="$text">
            • Fabric: {filters.fabric}
          </Text>
          <Text fontSize={12} color="$text">
            • Price Range: {filters.priceRange}
          </Text>
          <Text fontSize={12} color="$text">
            • SKU Type: {filters.skuType || 'all'}
          </Text>
        </YStack>

        <StoreInventoryFilterDrawer
          visible={isOpen}
          onClose={() => setIsOpen(false)}
          current={filters}
          onApply={(next) => setFilters(next)}
        />
      </YStack>
    );
  },
};
