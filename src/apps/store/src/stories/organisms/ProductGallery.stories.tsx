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

export const MobileWithColorSelection = (args: any) => {
  const [color, setColor] = useState('ivory');
  return (
    <View style={{ width: 390, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 24, borderWidth: 1, borderColor: '#eee' }}>
      <YStack gap={8} marginBottom={12}>
        <Text fontSize={13} fontWeight="800" color="#333">
          📱 Mobile PDP Carousel with Color Selection Below
        </Text>
        <Text fontSize={11} color="#666">
          👉 Circular swipe on the carousel updates the active dot, badge, and selected swatch below.
        </Text>
      </YStack>
      <ProductGallery
        swatches={SWATCHES}
        selectedColor={color}
        onSelectColor={setColor}
        isMobile={true}
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
    </View>
  );
};

export const TabletCarouselWithColorSelection = (args: any) => {
  const [color, setColor] = useState('ivory');
  return (
    <View style={{ width: 680, padding: 20, backgroundColor: '#f9f9f9', borderRadius: 24, borderWidth: 1, borderColor: '#eee' }}>
      <YStack gap={8} marginBottom={12}>
        <Text fontSize={14} fontWeight="800" color="#333">
          📱 Tablet PDP Carousel with Color Selection Below
        </Text>
        <Text fontSize={12} color="#666">
          👉 Full-width 460px carousel with circular gestures and swatch row directly beneath.
        </Text>
      </YStack>
      <ProductGallery
        swatches={SWATCHES}
        selectedColor={color}
        onSelectColor={setColor}
        isMobile={false}
      >
        <YStack
          backgroundColor="#ffffff"
          borderWidth={1}
          borderColor="#e2e0dc"
          borderRadius={16}
          padding={16}
        >
          <ColourSelector
            options={COLOUR_OPTIONS}
            selected={color}
            onSelect={setColor}
          />
        </YStack>
      </ProductGallery>
    </View>
  );
};

export const DesktopInteractive = (args: any) => {
  const [color, setColor] = useState('ivory');
  return (
    <View style={{ maxWidth: 740, padding: 16 }}>
      <ProductGallery
        swatches={SWATCHES}
        selectedColor={color}
        onSelectColor={setColor}
        isMobile={false}
      />
    </View>
  );
};
