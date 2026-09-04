import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, Text } from 'tamagui';
import { Pressable } from 'react-native';
import { ConfirmDialog, ConfirmDialogProps } from '../../components/molecules/ConfirmDialog';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Molecules/ConfirmDialog',
  component: ConfirmDialog,
  decorators: [withFormFactor('mobile', 'Action Confirmation Prompt')],
  argTypes: {
    intent: { control: 'select', options: ['critical', 'attention', 'info'] },
    title: { control: 'text' },
    message: { control: 'text' },
    confirmLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const SingleItemDeletePrompt: Story = {
  args: {
    visible: true,
    title: 'Remove Item?',
    message: 'Are you sure you want to remove "Handloom Kanjivaram Silk Saree" from this order? This action cannot be undone.',
    confirmLabel: 'Remove',
    cancelLabel: 'Keep Item',
    intent: 'critical',
  },
  render: (args: any) => {
    return (
      <YStack width={390} height={500} backgroundColor="$background" position="relative">
        <YStack padding={20} gap={10}>
          <Text fontSize={14} color="$color10">
            Background order detail screen content (dimmed under dialog)...
          </Text>
        </YStack>
        <ConfirmDialog
          {...(args as ConfirmDialogProps)}
          onConfirm={() => alert('Confirmed deletion!')}
          onCancel={() => alert('Cancelled!')}
        />
      </YStack>
    );
  },
};

export const MultiSelectBatchDeletePrompt: Story = {
  args: {
    visible: true,
    title: 'Delete 3 Items?',
    message: 'Are you sure you want to remove 3 selected items from this order? Line totals will be recalculated immediately.',
    confirmLabel: 'Delete (3)',
    cancelLabel: 'Cancel',
    intent: 'critical',
  },
  render: (args: any) => {
    return (
      <YStack width={390} height={500} backgroundColor="$background" position="relative">
        <YStack padding={20} gap={10}>
          <Text fontSize={14} color="$color10">
            Background order detail screen content (dimmed under dialog)...
          </Text>
        </YStack>
        <ConfirmDialog
          {...(args as ConfirmDialogProps)}
          onConfirm={() => alert('Confirmed batch deletion!')}
          onCancel={() => alert('Cancelled!')}
        />
      </YStack>
    );
  },
};
