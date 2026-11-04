import React, { useState } from 'react';
import type { Meta } from '@storybook/react-native';
import { View } from 'react-native';
import { YStack, Text } from 'tamagui';
import { ProductGallery } from '../../components/organisms/ProductGallery/ProductGallery';
import { ColourSelector, ColourOption } from '../../components/organisms/ColourSelector/ColourSelector';

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const SWATCHES = {
  ivory: { label: 'Ivory Gold', gradient: ['#f3e6d8', '#d3aa75'] as [string, string] },
  sand: { label: 'Warm Sand', gradient: ['#e9d6af', '#c09a5b'] as [string, string] },
  rose: { label: 'Rose Petal', gradient: ['#f0d5d1', '#bf7b71'] as [string, string] },
  stone: { label: 'Stone Slate', gradient: ['#dacdbd', '#a89a89'] as [string, string] },
};

const COLOUR_OPTIONS: ColourOption[] = [
  { key: 'ivory', label: 'Ivory Gold', gradient: ['#f3e6d8', '#d3aa75'], group: 'warm' },
  { key: 'sand', label: 'Warm Sand', gradient: ['#e9d6af', '#c09a5b'], group: 'warm' },
  { key: 'rose', label: 'Rose Petal', gradient: ['#f0d5d1', '#bf7b71'], group: 'warm' },
  { key: 'stone', label: 'Stone Slate', gradient: ['#dacdbd', '#a89a89'], group: 'neutral' },
];

const meta: Meta<any> = {
  args: {
    ...THEME_ARGS,
  },
  title: 'Organisms/ProductGallery',
  component: ProductGallery,
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const InteractiveProductGallery: any = (args: any) => {
  const [color, setColor] = useState('ivory');
  return (
    <YStack gap={12} padding={16} width="100%">
      <ProductGallery
        swatches={SWATCHES}
        selectedColor={color}
        onSelectColor={setColor}
      >
        <YStack
          backgroundColor="#ffffff"
          borderWidth={1}
          borderColor="#e2e0dc"
          borderRadius={16}
          padding={14}
        >
          <ColourSelector
            options={COLOUR_OPTIONS}
            selected={color}
            onSelect={setColor}
          />
        </YStack>
      </ProductGallery>
    </YStack>
  );
};
InteractiveProductGallery.storyName = '1. Interactive Product Gallery (Responsive)';
