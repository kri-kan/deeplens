import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { ReviewQueueButton } from '../../components/molecules/ReviewQueueButton/ReviewQueueButton';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/ReviewQueueButton',
  component: ReviewQueueButton,
  args: {
    ...THEME_ARGS,
    reviewCount: 3,
    isActive: false,
    disabled: false,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof ReviewQueueButton>;

export const DefaultRest: Story = {
  name: '1. Default / Rest State (Zero Pending)',
  args: {
    reviewCount: 0,
    isActive: false,
  },
};

export const PendingBadge: Story = {
  name: '2. Pending Reviews Badge (3 Updates)',
  args: {
    reviewCount: 3,
    isActive: false,
  },
};

export const ActiveFilter: Story = {
  name: '3. Active Filtering State (Amber Tinted)',
  args: {
    reviewCount: 3,
    isActive: true,
  },
};

export const DisabledState: Story = {
  name: '4. Disabled State',
  args: {
    reviewCount: 2,
    disabled: true,
  },
};

export const InteractiveToggle = () => {
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(5);

  return (
    <YStack padding={20} gap={16} alignItems="flex-start">
      <Text fontSize={13} fontWeight="700">Interactive Review Queue Header Button</Text>
      <ReviewQueueButton
        reviewCount={count}
        isActive={active}
        onPress={() => setActive(!active)}
      />
      <Text fontSize={11} color="#666">
        Status: {active ? 'Showing ONLY updated products' : 'Showing all inventory products'}
      </Text>
    </YStack>
  );
};
