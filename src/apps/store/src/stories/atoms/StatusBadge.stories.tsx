import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { XStack, YStack, Text } from 'tamagui';
import { LuCircleAlert, LuCheck, LuX, LuInfo } from 'react-icons/lu';
import { StatusBadge } from '../../components/atoms/StatusBadge';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof StatusBadge> = {
  title: 'Atoms/StatusBadge',
  component: StatusBadge,
  decorators: [withFormFactor('mobile', 'Business-Neutral Status Badge / Intent Pill')],
  argTypes: {
    intent: {
      control: 'select',
      options: ['attention', 'positive', 'critical', 'info'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const AllIntents: Story = {
  render: () => (
    <YStack gap={16} padding={20} alignItems="flex-start">
      <Text fontSize={14} fontWeight="700" color="$color">
        W3C/Polaris 4 Invariant Status Intents
      </Text>

      {/* Attention: Amber Spectrum (e.g. COD, pending review, risk) */}
      <XStack alignItems="center" gap={10}>
        <StatusBadge intent="attention" label="COD Pending" icon={<LuCircleAlert size={12} color="#B06000" />} />
        <Text fontSize={12} color="$color10">intent: 'attention'</Text>
      </XStack>

      {/* Positive: Emerald Spectrum (e.g. Prepaid, verified, credit) */}
      <XStack alignItems="center" gap={10}>
        <StatusBadge intent="positive" label="Prepaid (Paid)" icon={<LuCheck size={12} color="#137333" />} />
        <Text fontSize={12} color="$color10">intent: 'positive'</Text>
      </XStack>

      {/* Critical: Crimson Spectrum (e.g. Cancelled, failed, refunded) */}
      <XStack alignItems="center" gap={10}>
        <StatusBadge intent="critical" label="Order Cancelled" icon={<LuX size={12} color="#C5221F" />} />
        <Text fontSize={12} color="$color10">intent: 'critical'</Text>
      </XStack>

      {/* Info: Accent/Blue Spectrum (e.g. In Transit, SKU Linked) */}
      <XStack alignItems="center" gap={10}>
        <StatusBadge intent="info" label="In Transit" icon={<LuInfo size={12} color="currentColor" />} />
        <Text fontSize={12} color="$color10">intent: 'info'</Text>
      </XStack>
    </YStack>
  ),
};

export const SizeVariants: Story = {
  render: () => (
    <YStack gap={12} padding={20} alignItems="flex-start">
      <XStack alignItems="center" gap={12}>
        <StatusBadge intent="attention" label="Medium (26px)" size="md" />
        <StatusBadge intent="attention" label="Small (22px)" size="sm" />
      </XStack>
      <XStack alignItems="center" gap={12}>
        <StatusBadge intent="positive" label="Medium (26px)" size="md" />
        <StatusBadge intent="positive" label="Small (22px)" size="sm" />
      </XStack>
    </YStack>
  ),
};
