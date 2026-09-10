import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { PostPlannerBanner } from '../../components/molecules/PostPlannerBanner';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/PostPlannerBanner',
  component: PostPlannerBanner,
  args: {
    ...THEME_ARGS,
    title: 'Post Planner & Channel Incubator',
    subtitle: 'Star catalog items, match focus & dump channels, schedule & share',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: 380, maxWidth: '100%' }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj;

export const DefaultBanner: Story = {
  name: '1. Standard Feature Banner',
  args: {
    title: 'Post Planner & Channel Incubator',
    subtitle: 'Star catalog items, match focus & dump channels, schedule & share',
  },
};
