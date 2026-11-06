import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { FeedbackToast, FeedbackToastProps } from '../../components/atoms/FeedbackToast';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<typeof FeedbackToast> = {
  title: 'Atoms/FeedbackToast',
  component: FeedbackToast,
  args: {
    ...THEME_ARGS,
    visible: true,
    title: 'Changes Saved',
    message: 'Curated swatches, SKUs, and groups saved successfully.',
    intent: 'success',
    durationMs: 2800,
    position: 'bottom',
    bottomOffset: 24,
    topOffset: 24,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    intent: {
      control: 'select',
      options: ['success', 'failure', 'warning', 'info'],
    },
    position: {
      control: 'select',
      options: ['bottom', 'top'],
    },
    durationMs: { control: 'number' },
    message: { control: 'text' },
    title: { control: 'text' },
    actionLabel: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof FeedbackToast>;

export const DefaultSuccessAutoDismiss: Story = {
  name: '1. Success Notification (Auto-Dismiss 2.8s)',
  args: {
    visible: true,
    intent: 'success',
    title: 'Saved',
    message: 'Curated swatches, SKUs, and color groups saved successfully.',
    durationMs: 2800,
    position: 'bottom',
  },
  render: (args: any) => {
    return (
      <YStack height={320} padding={20} justifyContent="center" alignItems="center" position="relative">
        <Text fontSize={13} color="#64748B">
          Transient non-blocking toast anchored at bottom (auto-dismisses in 2.8s)
        </Text>
        <FeedbackToast {...args} onDismiss={() => {}} />
      </YStack>
    );
  },
};

export const FailureWithRetry: Story = {
  name: '2. Failure Notification with Action',
  args: {
    visible: true,
    intent: 'failure',
    title: 'Sync Error',
    message: 'Failed to synchronize with Store.Api. Please retry.',
    actionLabel: 'RETRY',
    durationMs: 0,
    position: 'bottom',
  },
  render: (args: any) => {
    return (
      <YStack height={320} padding={20} justifyContent="center" alignItems="center" position="relative">
        <Text fontSize={13} color="#64748B">
          Persistent failure toast with action button (durationMs: 0)
        </Text>
        <FeedbackToast
          {...args}
          onAction={() => alert('Retrying sync...')}
          onDismiss={() => {}}
        />
      </YStack>
    );
  },
};

export const WarningAttention: Story = {
  name: '3. Warning Notification',
  args: {
    visible: true,
    intent: 'warning',
    title: 'Stock Warning',
    message: '3 colorways have zero available stock assigned.',
    durationMs: 4000,
    position: 'bottom',
  },
  render: (args: any) => {
    return (
      <YStack height={320} padding={20} justifyContent="center" alignItems="center" position="relative">
        <Text fontSize={13} color="#64748B">
          Warning toast with extended 4-second timeout
        </Text>
        <FeedbackToast {...args} onDismiss={() => {}} />
      </YStack>
    );
  },
};

export const InfoTopAnchored: Story = {
  name: '4. Info Notification (Top Anchored)',
  args: {
    visible: true,
    intent: 'info',
    title: 'Media Reordered',
    message: 'Primary hero cover updated for PDP gallery.',
    position: 'top',
    topOffset: 20,
    durationMs: 3000,
  },
  render: (args: any) => {
    return (
      <YStack height={320} padding={20} justifyContent="center" alignItems="center" position="relative">
        <Text fontSize={13} color="#64748B">
          Top-anchored toast notification
        </Text>
        <FeedbackToast {...args} onDismiss={() => {}} />
      </YStack>
    );
  },
};

export const InteractiveSandbox = () => {
  const [toast, setToast] = useState<{
    visible: boolean;
    title: string;
    message: string;
    intent: 'success' | 'failure' | 'warning' | 'info';
    actionLabel?: string;
  } | null>(null);

  return (
    <YStack height={400} padding={20} justifyContent="center" alignItems="center" gap={16} position="relative">
      <Text fontSize={14} fontWeight="700" color="#334155">
        Interactive Toast Trigger Matrix
      </Text>
      <Text fontSize={12} color="#64748B" textAlign="center" maxWidth={360}>
        Tap any button to trigger the standardized FeedbackToast and test auto-dismiss or manual close:
      </Text>

      <XStack gap={10} flexWrap="wrap" justifyContent="center">
        <Button
          size="$3"
          backgroundColor="#10B981"
          color="#FFFFFF"
          onPress={() =>
            setToast({
              visible: true,
              title: 'Saved',
              message: 'Curated swatches and SKUs saved successfully.',
              intent: 'success',
            })
          }
        >
          Trigger Success
        </Button>

        <Button
          size="$3"
          backgroundColor="#EF4444"
          color="#FFFFFF"
          onPress={() =>
            setToast({
              visible: true,
              title: 'Save Failed',
              message: 'Network error communicating with Store.Api.',
              intent: 'failure',
              actionLabel: 'RETRY',
            })
          }
        >
          Trigger Failure
        </Button>

        <Button
          size="$3"
          backgroundColor="#F59E0B"
          color="#FFFFFF"
          onPress={() =>
            setToast({
              visible: true,
              title: 'Incomplete Curation',
              message: '2 colorways require at least 1 qualified photo.',
              intent: 'warning',
            })
          }
        >
          Trigger Warning
        </Button>

        <Button
          size="$3"
          backgroundColor="#3B82F6"
          color="#FFFFFF"
          onPress={() =>
            setToast({
              visible: true,
              title: 'Auto-Saved Draft',
              message: 'Changes cached locally at ' + new Date().toLocaleTimeString(),
              intent: 'info',
            })
          }
        >
          Trigger Info
        </Button>
      </XStack>

      {toast && (
        <FeedbackToast
          visible={toast.visible}
          title={toast.title}
          message={toast.message}
          intent={toast.intent}
          actionLabel={toast.actionLabel}
          onAction={() => alert(`Action fired for ${toast.intent}`)}
          onDismiss={() => setToast(null)}
          durationMs={2800}
        />
      )}
    </YStack>
  );
};
