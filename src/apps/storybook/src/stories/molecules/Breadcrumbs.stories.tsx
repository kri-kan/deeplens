import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { YStack, Text } from 'tamagui';
import { Breadcrumbs } from '../../components/molecules/Breadcrumbs/Breadcrumbs';

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: 'Molecules/Breadcrumbs',
  component: Breadcrumbs,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, maxWidth: 640, width: '100%' }}>
        <Story />
      </View>
    ),
  ],
  args: {
    ...THEME_ARGS,
    items: ['Home', 'Women', 'Festive Handloom Sarees'],
    separator: '/',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    separator: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

export const Default: Story = {
  args: {
    items: ['Home', 'Women', 'Festive Handloom Sarees'],
  },
};

export const Interactive: Story = {
  render: () => (
    <YStack gap={12}>
      <Text fontSize={12} color="#888" fontWeight="600">
        Click on "Home" or "Women" to trigger navigation actions:
      </Text>
      <Breadcrumbs
        items={[
          { label: 'Home', onPress: () => alert('Navigating to Home') },
          { label: 'Women', onPress: () => alert('Navigating to Women Catalog') },
          { label: 'Festive Handloom Sarees' },
        ]}
      />
    </YStack>
  ),
};

export const DeepPath: Story = {
  args: {
    items: [
      'Home',
      'Women',
      'Ethnic Wear',
      'Handloom Sarees',
      'Pure Mulberry Silk Saree',
    ],
  },
};

export const ChevronSeparator: Story = {
  args: {
    separator: '›',
    items: [
      { label: 'Home', onPress: () => {} },
      { label: 'Women', onPress: () => {} },
      { label: 'Festive Handloom Sarees' },
    ],
  },
};

export const MobileCompact: Story = {
  decorators: [
    (Story) => (
      <View style={{ width: 360, padding: 16, borderWidth: 1, borderColor: '#ddd', borderRadius: 16 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    items: [
      { label: 'Home', onPress: () => {} },
      { label: 'Women', onPress: () => {} },
      { label: 'Traditional Wear', onPress: () => {} },
      { label: 'Sarees', onPress: () => {} },
      { label: 'Ivory Flow Mulberry Silk Saree' },
    ],
  },
};
