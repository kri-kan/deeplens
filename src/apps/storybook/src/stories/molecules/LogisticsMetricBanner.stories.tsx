import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import {
  LogisticsMetricBanner,
} from '../../components/molecules/LogisticsMetricBanner';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/LogisticsMetricBanner',
  component: LogisticsMetricBanner,
  args: {
    ...THEME_ARGS,
    metrics: {
      total: 48,
      pending: 12,
      inTransit: 24,
      ndrAlerts: 3,
    },
    activeFilter: 'All',
    onSelectFilter: (f: string) => console.log('Selected filter:', f),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
  decorators: [
    (Story) => (
      <YStack padding={16} maxWidth={440} width="100%">
        <Story />
      </YStack>
    ),
  ],
};

export default meta;
type Story = StoryObj<any>;

export const DefaultPopulated: Story = {
  name: 'Populated Metrics',
  args: {
    metrics: {
      total: 48,
      pending: 12,
      inTransit: 24,
      ndrAlerts: 3,
    },
  },
};

export const ZeroActivity: Story = {
  name: 'Zero Activity',
  args: {
    metrics: {
      total: 0,
      pending: 0,
      inTransit: 0,
      ndrAlerts: 0,
    },
  },
};
