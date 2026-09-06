import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { FilterSidebar } from '../../components/organisms/FilterSidebar/FilterSidebar';
import { FilterFacet } from '../../components/organisms/FilterDrawer/FilterDrawer';

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const SAMPLE_FACETS: FilterFacet[] = [
  {
    id: 'fabric',
    label: 'Fabric',
    options: [
      { id: 'mulberry', label: 'Mulberry Silk', count: 148 },
      { id: 'banarasi', label: 'Banarasi Brocade', count: 92 },
      { id: 'organza', label: 'Organza', count: 64 },
      { id: 'chanderi', label: 'Chanderi Zari', count: 45 },
      { id: 'linen', label: 'Linen Blend', count: 38 },
    ],
  },
  {
    id: 'price',
    label: 'Price Range',
    options: [
      { id: 'under2k', label: 'Under ₹2,000', count: 84 },
      { id: '2k_3500', label: '₹2,000 - ₹3,500', count: 215 },
      { id: '3500_5k', label: '₹3,500 - ₹5,000', count: 140 },
      { id: 'above5k', label: 'Above ₹5,000', count: 62 },
    ],
  },
  {
    id: 'color',
    label: 'Color',
    options: [
      { id: 'gold_ivory', label: 'Gold / Ivory', count: 88 },
      { id: 'rose_pink', label: 'Rose Pink', count: 65 },
      { id: 'slate_blue', label: 'Slate Blue', count: 42 },
      { id: 'emerald_green', label: 'Emerald Green', count: 39 },
    ],
  },
  {
    id: 'occasion',
    label: 'Occasion',
    options: [
      { id: 'festive', label: 'Festive Gala', count: 190 },
      { id: 'bridal', label: 'Bridal Trousseau', count: 85 },
      { id: 'evening', label: 'Evening Soiree', count: 112 },
      { id: 'casual', label: 'Casual Luxe', count: 74 },
    ],
  },
];

const meta: Meta<any> = {
  args: {
    ...THEME_ARGS,
  },
  title: 'Organisms/FilterSidebar',
  component: FilterSidebar,
  decorators: [
    (Story) => (
      <View style={{ width: 280, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof FilterSidebar>;

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState<Record<string, string[]>>({
      fabric: ['mulberry'],
    });

    const handleToggle = (facetId: string, optId: string) => {
      setSelected((prev) => {
        const cur = prev[facetId] || [];
        const next = cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId];
        return { ...prev, [facetId]: next };
      });
    };

    return (
      <FilterSidebar
        facets={SAMPLE_FACETS}
        selectedValues={selected}
        onToggleOption={handleToggle}
        onClearAll={() => setSelected({})}
        onToggleCollapse={() => alert('Collapse filters toggled')}
      />
    );
  },
};
