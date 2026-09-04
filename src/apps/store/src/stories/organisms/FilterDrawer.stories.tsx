import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { FilterDrawer, FilterFacet } from '../../components/organisms/FilterDrawer/FilterDrawer';

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const SAMPLE_FACETS: FilterFacet[] = [
  {
    id: 'size',
    label: 'Size',
    options: [
      { id: '3xs', label: '3xs', count: 9 },
      { id: 'xxs', label: 'Xxs', count: 10 },
      { id: 'xs', label: 'Xs', count: 234 },
      { id: 's', label: 'S', count: 521 },
      { id: 'm', label: 'M', count: 538 },
      { id: 'l', label: 'L', count: 539 },
      { id: 'xl', label: 'Xl', count: 510 },
      { id: 'xxl', label: 'Xxl', count: 431 },
    ],
  },
  {
    id: 'price',
    label: 'Price',
    options: [
      { id: 'p1', label: 'Rs. 959 to Rs. 1499', count: 1204 },
      { id: 'p2', label: 'Rs. 1500 to Rs. 2999', count: 2430 },
      { id: 'p3', label: 'Rs. 3000 to Rs. 4999', count: 890 },
      { id: 'p4', label: 'Rs. 5000 and Above', count: 310 },
    ],
  },
  {
    id: 'brand',
    label: 'Brand',
    options: [
      { id: 'vaanya_luxe', label: 'VAANYA LUXE', count: 340 },
      { id: 'vaanya_heritage', label: 'VAANYA Heritage', count: 280 },
      { id: 'vaanya_weaves', label: 'VAANYA Weaves', count: 190 },
      { id: 'raw_mango', label: 'Raw Mango', count: 75 },
    ],
  },
  {
    id: 'color',
    label: 'Color',
    options: [
      { id: 'black', label: 'Black', count: 480 },
      { id: 'pink', label: 'Pink', count: 320 },
      { id: 'blue', label: 'Blue', count: 290 },
      { id: 'gold', label: 'Gold / Zari', count: 210 },
      { id: 'green', label: 'Green', count: 180 },
    ],
  },
  {
    id: 'fabrics',
    label: 'Fabrics',
    options: [
      { id: 'mulberry_silk', label: 'Pure Mulberry Silk', count: 148 },
      { id: 'banarasi_brocade', label: 'Banarasi Brocade', count: 92 },
      { id: 'organza', label: 'Pure Organza', count: 64 },
      { id: 'chanderi', label: 'Chanderi Handloom', count: 45 },
    ],
  },
];

const meta: Meta<any> = {
  args: {
    ...THEME_ARGS,
  },
  title: 'Organisms/FilterDrawer',
  component: FilterDrawer,
  decorators: [
    (Story) => (
      <View style={{ width: 390, height: 680, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: '#ddd', borderRadius: 20 }}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof FilterDrawer>;

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState<Record<string, string[]>>({
      size: ['s', 'm'],
    });

    return (
      <FilterDrawer
        facets={SAMPLE_FACETS}
        selectedValues={selected}
        onApply={(newSelected) => {
          setSelected(newSelected);
          alert(`Applied filters: ${JSON.stringify(newSelected)}`);
        }}
        onClose={() => alert('Filter drawer closed')}
      />
    );
  },
};
