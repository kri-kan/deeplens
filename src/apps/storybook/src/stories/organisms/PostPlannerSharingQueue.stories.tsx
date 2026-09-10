import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { PostPlannerSharingQueue } from '../../components/organisms/PostPlannerSharingQueue';
import { TargetChannelOption, ChannelSharingQueueItem } from '../../components/molecules/post-planner.types';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { withFormFactor } from '../utils/FormFactorPreview';

const MOCK_CHANNELS: TargetChannelOption[] = [
  {
    id: 'ch-1',
    username: 'vayyari_fashions',
    channelType: 'focus',
    niche: 'Core Luxury Festive Wear',
    avatarUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  },
  {
    id: 'ch-3',
    username: 'saree_dump',
    channelType: 'dump',
    niche: 'Silk & Handloom Saree Curation',
    avatarUri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
  },
];

const MOCK_QUEUE_ITEMS: ChannelSharingQueueItem[] = [
  {
    id: 'sku-001',
    productCode: 'SAR-KAN-901',
    title: 'Kanjivaram Silk Saree',
    price: 8499,
    category: 'Saree',
    imageUri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
    status: 'scheduled',
    scheduledTimeLabel: 'Tomorrow 11 AM',
  },
  {
    id: 'sku-002',
    productCode: 'SAR-BAN-402',
    title: 'Banarasi Zari Tissue Saree',
    price: 11200,
    category: 'Saree',
    imageUri: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80',
    status: 'assigned',
  },
  {
    id: 'sku-005',
    productCode: 'SAR-PAT-305',
    title: 'Patola Ikat Silk Saree',
    price: 14500,
    category: 'Saree',
    imageUri: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600&q=80',
    status: 'shared',
    scheduledTimeLabel: 'Yesterday',
  },
];

const meta: Meta<any> = {
  title: 'Organisms/PostPlannerSharingQueue',
  component: PostPlannerSharingQueue,
  args: {
    ...THEME_ARGS,
    channels: MOCK_CHANNELS,
    activeChannelId: 'ch-3',
    channelItems: MOCK_QUEUE_ITEMS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
  decorators: [withFormFactor("mobile", "Post Planner Sharing Queue (Mobile 390px)")],
};

export default meta;
type Story = StoryObj;

export const PopulatedQueue: Story = {
  name: '1. Populated Queue (Mixed Status: Scheduled, Ready, Shared)',
  args: {
    activeChannelId: 'ch-3',
    channelItems: MOCK_QUEUE_ITEMS,
  },
};

export const EmptyQueue: Story = {
  name: '2. Empty Queue (0 Items Assigned)',
  args: {
    activeChannelId: 'ch-1',
    channelItems: [],
  },
};
