import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { YStack, Text } from 'tamagui';
import { FilterSortBottomBar } from '../../components/molecules/FilterSortBottomBar/FilterSortBottomBar';

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: 'Molecules/FilterSortBottomBar',
  component: FilterSortBottomBar,
  decorators: [
    (Story) => (
      <View style={{ width: 390, padding: 16, backgroundColor: '#f5f5f5' }}>
        <Story />
      </View>
    ),
  ],
  args: {
    ...THEME_ARGS,
    activeFilterCount: 0,
    currentSortLabel: 'Popular',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof FilterSortBottomBar>;

export const Default: Story = {
  args: {
    activeFilterCount: 0,
    currentSortLabel: 'Popular',
    onPressSort: () => alert('Open Sort Sheet'),
    onPressFilter: () => alert('Open Filter Drawer'),
  },
};

export const WithActiveFilters: Story = {
  args: {
    activeFilterCount: 3,
    currentSortLabel: 'Price: Low to High',
    onPressSort: () => alert('Open Sort Sheet'),
    onPressFilter: () => alert('Open Filter Drawer'),
  },
};
