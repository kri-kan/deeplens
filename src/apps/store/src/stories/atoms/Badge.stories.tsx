import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuSparkles, LuZap, LuTag, LuClock } from 'react-icons/lu';
import { Badge } from '../../components/atoms/Badge/Badge';

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: 'Atoms/Badge',
  component: Badge,
  args: {
    ...THEME_ARGS, label: '34% OFF', variant: 'offer', size: 'md' },
  argTypes: {
    ...THEME_ARG_TYPES,
    variant: {
      control: 'select',
      options: ['offer', 'new', 'sale', 'express', 'sponsored'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Offer: Story = { args: { label: '34% OFF', variant: 'offer', size: 'md' } };
export const New: Story = { args: { label: 'NEW ARRIVAL', variant: 'new', size: 'md' } };
export const Sale: Story = { args: { label: 'LIMITED SALE', variant: 'sale', size: 'md' } };
export const Express: Story = { args: { label: 'EXPRESS 2-DAY', variant: 'express', size: 'md' } };
export const Sponsored: Story = { args: { label: 'SPONSORED', variant: 'sponsored', size: 'md' } };

export const AllSizesAndVariants = (args: any) => (
  <YStack gap={20} padding={20} maxWidth={640}>
    <YStack gap={8}>
      <Text fontSize={13} fontWeight="800" color="#666">
        Small Size (height: 22px, padding: 10px)
      </Text>
      <XStack flexWrap="wrap" gap={8}>
        <Badge label="34% OFF" variant="offer" size="sm" />
        <Badge label="NEW IN" variant="new" size="sm" />
        <Badge label="SALE" variant="sale" size="sm" />
        <Badge label="EXPRESS" variant="express" size="sm" />
        <Badge label="AD" variant="sponsored" size="sm" />
      </XStack>
    </YStack>

    <YStack gap={8}>
      <Text fontSize={13} fontWeight="800" color="#666">
        Medium Size (Standard Default - height: 26px, padding: 14px)
      </Text>
      <XStack flexWrap="wrap" gap={10}>
        <Badge label="34% OFF" variant="offer" size="md" />
        <Badge label="NEW ARRIVAL" variant="new" size="md" />
        <Badge label="FLASH SALE" variant="sale" size="md" />
        <Badge label="EXPRESS 24H" variant="express" size="md" />
        <Badge label="SPONSORED" variant="sponsored" size="md" />
      </XStack>
    </YStack>

    <YStack gap={8}>
      <Text fontSize={13} fontWeight="800" color="#666">
        Large Size with Vector Icons (height: 32px, padding: 18px)
      </Text>
      <XStack flexWrap="wrap" gap={12}>
        <Badge
          label="FESTIVE OFFER"
          variant="offer"
          size="lg"
          icon={<LuSparkles size={14} color="#ffffff" />}
        />
        <Badge
          label="EXPRESS DISPATCH"
          variant="express"
          size="lg"
          icon={<LuZap size={14} color="#ffffff" />}
        />
        <Badge
          label="MEGA SALE"
          variant="sale"
          size="lg"
          icon={<LuTag size={14} color="#ffffff" />}
        />
      </XStack>
    </YStack>
  </YStack>
);
