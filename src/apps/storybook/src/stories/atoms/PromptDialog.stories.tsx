import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { PromptDialog, PromptDialogProps } from '../../components/atoms/PromptDialog';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<typeof PromptDialog> = {
  title: 'Atoms/PromptDialog',
  component: PromptDialog,
  args: {
    ...THEME_ARGS,
    visible: true,
    title: 'Curation Saved',
    message: 'Curated swatches, SKUs, and groups saved successfully.',
    intent: 'success',
    confirmLabel: 'Done',
    cancelLabel: 'Cancel',
    singleButton: true,
    dismissOnBackdropPress: true,
    isLoading: false,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    intent: {
      control: 'select',
      options: ['success', 'failure', 'warning', 'info', 'critical'],
    },
    title: { control: 'text' },
    message: { control: 'text' },
    confirmLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
    singleButton: { control: 'boolean' },
    dismissOnBackdropPress: { control: 'boolean' },
    isLoading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof PromptDialog>;

export const SuccessAcknowledgment: Story = {
  name: '1. Success Acknowledgment Prompt (Single-Button)',
  args: {
    visible: true,
    title: 'Curation Saved',
    message: 'Curated swatches, SKUs, and groups saved successfully.',
    intent: 'success',
    confirmLabel: 'Done',
    singleButton: true,
  },
  render: (args: any) => {
    return (
      <YStack width={390} height={500} backgroundColor="$background" position="relative" padding={20} justifyContent="center" alignItems="center">
        <Text fontSize={14} color="$color10" textAlign="center">
          Underlying Store Curation Workbench (dimmed under dialog backdrop)
        </Text>
        <PromptDialog
          {...(args as PromptDialogProps)}
          onConfirm={() => alert('Confirmed!')}
          onCancel={() => alert('Dismissed!')}
        />
      </YStack>
    );
  },
};

export const FailureRetryPrompt: Story = {
  name: '2. Failure & Retry Prompt (Dual-Button)',
  args: {
    visible: true,
    title: 'Save Failed',
    message: 'Could not connect to Store.Api (504 Gateway Timeout). Would you like to retry saving your curated changes?',
    intent: 'failure',
    confirmLabel: 'Retry Save',
    cancelLabel: 'Dismiss',
    singleButton: false,
  },
  render: (args: any) => {
    return (
      <YStack width={390} height={500} backgroundColor="$background" position="relative" padding={20} justifyContent="center" alignItems="center">
        <Text fontSize={14} color="$color10" textAlign="center">
          Underlying screen state with unsaved modifications
        </Text>
        <PromptDialog
          {...(args as PromptDialogProps)}
          onConfirm={() => alert('Retrying network save...')}
          onCancel={() => alert('Dismissed failure dialog!')}
        />
      </YStack>
    );
  },
};

export const CriticalDeleteConfirmation: Story = {
  name: '3. Critical Confirmation Prompt (Dual-Button)',
  args: {
    visible: true,
    title: 'Discard Colorway?',
    message: 'Are you sure you want to discard "Kanjivaram Maroon Gold"? All 4 associated media tags and SKU links will be unassigned.',
    intent: 'critical',
    confirmLabel: 'Discard Colorway',
    cancelLabel: 'Keep Editing',
    singleButton: false,
  },
  render: (args: any) => {
    return (
      <YStack width={390} height={500} backgroundColor="$background" position="relative" padding={20} justifyContent="center" alignItems="center">
        <Text fontSize={14} color="$color10" textAlign="center">
          Underlying colorway editing workbench
        </Text>
        <PromptDialog
          {...(args as PromptDialogProps)}
          onConfirm={() => alert('Colorway discarded!')}
          onCancel={() => alert('Discard cancelled!')}
        />
      </YStack>
    );
  },
};

export const InteractiveSandbox = () => {
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    intent: 'success' | 'failure' | 'warning' | 'info' | 'critical';
    singleButton?: boolean;
    confirmLabel?: string;
    cancelLabel?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    if (dialog?.intent === 'failure') {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setDialog({
          visible: true,
          title: 'Curation Saved',
          message: 'Retry succeeded! Curated swatches and SKUs synced successfully.',
          intent: 'success',
          singleButton: true,
          confirmLabel: 'Done',
        });
      }, 1200);
      return;
    }
    setDialog(null);
  };

  return (
    <YStack height={450} padding={20} justifyContent="center" alignItems="center" gap={16} position="relative">
      <Text fontSize={15} fontWeight="700" color="#334155">
        Interactive PromptDialog Sandbox
      </Text>
      <Text fontSize={13} color="#64748B" textAlign="center" maxWidth={360}>
        Test modal prompts that wait for explicit user acknowledgment or action:
      </Text>

      <XStack gap={10} flexWrap="wrap" justifyContent="center">
        <Button
          size="$3"
          backgroundColor="#10B981"
          color="#FFFFFF"
          onPress={() =>
            setDialog({
              visible: true,
              title: 'Curation Saved',
              message: 'Curated swatches, SKUs, and groups saved successfully.',
              intent: 'success',
              singleButton: true,
              confirmLabel: 'Done',
            })
          }
        >
          Open Success Acknowledgment
        </Button>

        <Button
          size="$3"
          backgroundColor="#EF4444"
          color="#FFFFFF"
          onPress={() =>
            setDialog({
              visible: true,
              title: 'Sync Failed',
              message: 'Failed to save changes to Store.Api. Would you like to retry?',
              intent: 'failure',
              singleButton: false,
              confirmLabel: 'Retry',
              cancelLabel: 'Cancel',
            })
          }
        >
          Open Failure Prompt
        </Button>

        <Button
          size="$3"
          backgroundColor="#7C3AED"
          color="#FFFFFF"
          onPress={() =>
            setDialog({
              visible: true,
              title: 'Publish to Storefront?',
              message: 'This will publish 5 curated SKUs directly to the live customer catalog.',
              intent: 'info',
              singleButton: false,
              confirmLabel: 'Publish Now',
              cancelLabel: 'Review First',
            })
          }
        >
          Open Confirmation Prompt
        </Button>
      </XStack>

      {dialog && (
        <PromptDialog
          visible={dialog.visible}
          title={dialog.title}
          message={dialog.message}
          intent={dialog.intent}
          singleButton={dialog.singleButton}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          isLoading={loading}
          onConfirm={handleConfirm}
          onCancel={() => setDialog(null)}
        />
      )}
    </YStack>
  );
};
