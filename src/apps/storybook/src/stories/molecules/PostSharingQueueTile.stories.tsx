import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { PostSharingQueueTile } from '../../components/molecules/PostSharingQueueTile';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/PostSharingQueueTile',
  component: PostSharingQueueTile,
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

export const AssignedReady: Story = {
  name: '1. Assigned (Ready to Post)',
  args: {
    item: {
      id: 'sku-001',
      productCode: 'SAR-KAN-901',
      title: 'Kanjivaram Silk Saree',
      price: 8499,
      category: 'Saree',
      imageUri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
      status: 'assigned',
    },
  },
};

export const ScheduledTomorrow: Story = {
  name: '2. Scheduled (Tomorrow 11 AM)',
  args: {
    item: {
      id: 'sku-001',
      productCode: 'SAR-KAN-901',
      title: 'Kanjivaram Silk Saree',
      price: 8499,
      category: 'Saree',
      imageUri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
      status: 'scheduled',
      scheduledTimeLabel: 'Tomorrow 11 AM',
    },
  },
};

export const SharedLive: Story = {
  name: '3. Shared (Live on Channel)',
  args: {
    item: {
      id: 'sku-005',
      productCode: 'SAR-PAT-305',
      title: 'Patola Ikat Silk Saree',
      price: 14500,
      category: 'Saree',
      imageUri: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600&q=80',
      status: 'shared',
      scheduledTimeLabel: 'Yesterday',
    },
  },
};

export const Excluded: Story = {
  name: '4. Excluded (Skipped for Channel)',
  args: {
    item: {
      id: 'sku-004',
      productCode: 'LEH-BRD-504',
      title: 'Crimson Velvet Bridal Lehanga',
      price: 18500,
      category: 'Lehanga',
      imageUri: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=600&q=80',
      status: 'excluded',
    },
  },
};
