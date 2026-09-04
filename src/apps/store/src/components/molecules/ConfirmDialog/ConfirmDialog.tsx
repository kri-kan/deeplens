import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuTrash2, LuTriangleAlert, LuInfo } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface ConfirmDialogProps {
  /** Controls modal visibility */
  visible: boolean;
  /** Primary dialog heading */
  title: string;
  /** Detailed explanatory message or warning */
  message: string;
  /** Label for the confirmation/action button */
  confirmLabel?: string;
  /** Label for the dismissal/cancel button */
  cancelLabel?: string;
  /** Visual intent controlling danger vs alert coloring */
  intent?: 'critical' | 'attention' | 'info';
  /** Callback fired when the user confirms the action */
  onConfirm: () => void;
  /** Callback fired when the user cancels or dismisses the prompt */
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  intent = 'critical',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { tokens } = useTheme();

  if (!visible) return null;

  const intentColor =
    intent === 'critical'
      ? tokens.status.critical
      : intent === 'attention'
      ? tokens.status.attention
      : tokens.status.info;

  return (
    <YStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={1000}
      backgroundColor={tokens.surfaces.overlay}
      alignItems="center"
      justifyContent="center"
      padding={20}
      accessibilityRole="alert"
      accessibilityLabel={title}
    >
      <YStack
        width="100%"
        maxWidth={340}
        backgroundColor={tokens.surfaces.base}
        borderRadius={tokens.radius.md}
        borderWidth={1}
        borderColor={tokens.border}
        padding={20}
        gap={14}
        shadowColor="#000"
        shadowOpacity={0.25}
        shadowRadius={16}
        shadowOffset={{ width: 0, height: 6 }}
      >
        {/* Icon & Title */}
        <XStack gap={12} alignItems="center">
          <YStack
            width={40}
            height={40}
            borderRadius={tokens.radius.full}
            backgroundColor={intentColor.subtle}
            borderWidth={1}
            borderColor={intentColor.border}
            alignItems="center"
            justifyContent="center"
          >
            {intent === 'critical' ? (
              <LuTrash2 size={20} color={intentColor.text} />
            ) : intent === 'attention' ? (
              <LuTriangleAlert size={20} color={intentColor.text} />
            ) : (
              <LuInfo size={20} color={intentColor.text} />
            )}
          </YStack>

          <YStack flex={1}>
            <Text fontSize={16} fontWeight="800" color={tokens.text}>
              {title}
            </Text>
          </YStack>
        </XStack>

        {/* Message */}
        <Text fontSize={13} lineHeight={19} color={tokens.textSecondary}>
          {message}
        </Text>

        {/* Actions Row */}
        <XStack gap={10} paddingTop={4}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            onPress={onCancel}
            style={{ flex: 1 }}
          >
            <YStack
              height={40}
              borderRadius={tokens.radius.xs}
              backgroundColor={tokens.surfaces.raised}
              borderWidth={1}
              borderColor={tokens.border}
              alignItems="center"
              justifyContent="center"
              hoverStyle={{ backgroundColor: tokens.border }}
              pressStyle={{ opacity: 0.85 }}
            >
              <Text fontSize={13} fontWeight="700" color={tokens.text}>
                {cancelLabel}
              </Text>
            </YStack>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            onPress={onConfirm}
            style={{ flex: 1 }}
          >
            <YStack
              height={40}
              borderRadius={tokens.radius.xs}
              backgroundColor={intentColor.base}
              alignItems="center"
              justifyContent="center"
              hoverStyle={{ opacity: 0.9 }}
              pressStyle={{ opacity: 0.85 }}
            >
              <Text fontSize={13} fontWeight="700" color="#FFFFFF">
                {confirmLabel}
              </Text>
            </YStack>
          </Pressable>
        </XStack>
      </YStack>
    </YStack>
  );
}
