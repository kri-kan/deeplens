import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, Text } from 'tamagui';
import { DetailHeader, DetailHeaderProps } from '../../components/molecules/DetailHeader';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof DetailHeader> = {
  title: 'Molecules/DetailHeader',
  component: DetailHeader,
  decorators: [withFormFactor('mobile', 'Admin Detail Header with Adaptive Timestamp')],
  argTypes: {
    compactDate: {
      control: 'boolean',
      description: 'Switch between standard (e.g. "Today, 6:32 PM") and compact ("6:32 PM") timebadge variants',
    },
    orderId: {
      control: 'text',
      description: 'Order identification string',
    },
  },
  args: {
    compactDate: false,
    orderId: '849201',
    createdAt: new Date().toISOString(),
  },
};

export default meta;
type Story = StoryObj<typeof DetailHeader>;

export const StandardTimeHeader: Story = {
  args: {
    orderId: '849201',
    compactDate: false,
    createdAt: new Date().toISOString(),
    onSave: () => alert('Save clicked'),
    onDelete: () => alert('Delete clicked'),
  },
  render: (args: any) => (
    <YStack width={390}>
      <DetailHeader {...(args as DetailHeaderProps)} />
    </YStack>
  ),
};

export const CompactTimeHeader: Story = {
  args: {
    orderId: '849201',
    compactDate: true,
    createdAt: new Date().toISOString(),
    onSave: () => alert('Save clicked'),
    onDelete: () => alert('Delete clicked'),
  },
  render: (args: any) => (
    <YStack width={390}>
      <DetailHeader {...(args as DetailHeaderProps)} />
    </YStack>
  ),
};

export const Tight320pxHeader: Story = {
  args: {
    orderId: '849201',
    compactDate: true,
    createdAt: new Date().toISOString(),
    onSave: () => alert('Save clicked'),
    onDelete: () => alert('Delete clicked'),
  },
  render: (args: any) => (
    <YStack width={320} borderWidth={1} borderColor="$color5" borderRadius={8} overflow="hidden">
      <DetailHeader {...(args as DetailHeaderProps)} />
    </YStack>
  ),
};
