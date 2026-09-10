import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { PostPlannerProductTile } from '../../components/molecules/PostPlannerProductTile';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/PostPlannerProductTile',
  component: PostPlannerProductTile,
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
  decorators: [
    (Story) => (
      <View style={{ width: 140, padding: 8 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj;

export const CompleteWithChannels: Story = {
  name: '1. Complete (2 Channels Assigned)',
  args: {
    item: {
      id: 'sku-001',
      productCode: 'SAR-KAN-901',
      title: 'Kanjivaram Silk Saree',
      price: 8499,
      category: 'Saree',
      fabric: 'Mulberry Silk',
      isStarred: true,
      imageUri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
      assignedChannelIds: ['ch-1', 'ch-3'],
      planningStatus: 'complete',
    },
  },
};

export const InProgressDraft: Story = {
  name: '2. In Progress (1 Channel Draft)',
  args: {
    item: {
      id: 'sku-002',
      productCode: 'SAR-BAN-402',
      title: 'Banarasi Zari Tissue Saree',
      price: 11200,
      category: 'Saree',
      fabric: 'Tissue Zari',
      isStarred: true,
      imageUri: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80',
      assignedChannelIds: ['ch-3'],
      planningStatus: 'in_progress',
    },
  },
};

export const UnassignedNeedsPlanning: Story = {
  name: '3. Unassigned (Needs Planning)',
  args: {
    item: {
      id: 'sku-008',
      productCode: 'LEH-MIR-808',
      title: 'Mirror Work Georgette Lehanga',
      price: 12999,
      category: 'Lehanga',
      isStarred: true,
      imageUri: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80',
      assignedChannelIds: [],
      planningStatus: 'in_progress',
    },
  },
};
