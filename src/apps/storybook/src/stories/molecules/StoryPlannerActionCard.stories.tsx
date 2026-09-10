import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { StoryPlannerActionCard } from '../../components/molecules/StoryPlannerActionCard';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/StoryPlannerActionCard',
  component: StoryPlannerActionCard,
  args: {
    ...THEME_ARGS,
    action: { id: 'curation', title: 'Curation' },
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: 140, alignItems: 'center', justifyContent: 'center' }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj;

export const Curation: Story = {
  name: '1. Curation Action',
  args: {
    action: { id: 'curation', title: 'Curation' },
  },
};

export const Sharing: Story = {
  name: '2. Sharing Action',
  args: {
    action: { id: 'sharing', title: 'Sharing' },
  },
};

export const Swipes: Story = {
  name: '3. Swipes Action',
  args: {
    action: { id: 'swipes', title: 'Swipes' },
  },
};

export const ReviewWithBadge: Story = {
  name: '4. Review Action (With Badge Count)',
  args: {
    action: { id: 'review', title: 'Review', badgeCount: 16 },
  },
};
