import React from 'react';
import { Pressable, Modal, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuCircleCheck,
  LuCircleAlert,
  LuTriangleAlert,
  LuInfo,
  LuTrash2,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type PromptDialogIntent = 'success' | 'failure' | 'warning' | 'info' | 'critical';

export interface PromptDialogProps {
  /** Controls modal visibility */
  visible: boolean;
  /** Primary dialog heading */
  title: string;
  /** Detailed explanatory message or warning */
  message: string;
  /** Visual intent controlling colors and default icon */
  intent?: PromptDialogIntent;
  /** Optional custom icon node overriding the default intent icon */
  icon?: React.ReactNode;
  /** Label for the confirmation/primary action button (default 'OK') */
  confirmLabel?: string;
  /** Label for the dismissal/cancel button (default 'Cancel') */
  cancelLabel?: string;
  /** Whether to show only a single confirmation button (e.g. OK / acknowledgment) */
  singleButton?: boolean;
  /** Whether tapping the backdrop dismisses the dialog (default true) */
  dismissOnBackdropPress?: boolean;
  /** Whether the primary action is in a pending/loading state */
  isLoading?: boolean;
  /** Callback fired when the user confirms the action */
  onConfirm: () => void;
  /** Callback fired when the user cancels or dismisses the prompt */
  onCancel: () => void;
}

export function PromptDialog({
  visible,
  title,
  message,
  intent = 'info',
  icon,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  singleButton = false,
  dismissOnBackdropPress = true,
  isLoading = false,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const { tokens } = useTheme();

  if (!visible) return null;

  const isDark = tokens.colorScheme === 'dark';
  const intentColors = {
    critical: {
      base: tokens.error || '#EF4444',
      subtle: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FCE8E6',
      border: isDark ? 'rgba(239, 68, 68, 0.38)' : '#FAD2CF',
      text: isDark ? '#F87171' : '#C5221F',
    },
    failure: {
      base: tokens.error || '#EF4444',
      subtle: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FCE8E6',
      border: isDark ? 'rgba(239, 68, 68, 0.38)' : '#FAD2CF',
      text: isDark ? '#F87171' : '#C5221F',
    },
    warning: {
      base: tokens.warning || '#F59E0B',
      subtle: isDark ? 'rgba(245, 158, 11, 0.18)' : '#FFF4E5',
      border: isDark ? 'rgba(245, 158, 11, 0.38)' : '#FFE2B8',
      text: isDark ? '#FBBF24' : '#B06000',
    },
    info: {
      base: tokens.accent || '#3B82F6',
      subtle: tokens.accentSubtle || (isDark ? 'rgba(59, 130, 246, 0.18)' : '#EBF5FF'),
      border: tokens.border || (isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'),
      text: tokens.accent || '#3B82F6',
    },
    success: {
      base: tokens.success || '#10B981',
      subtle: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5',
      border: isDark ? 'rgba(16, 185, 129, 0.38)' : '#A7F3D0',
      text: isDark ? '#34D399' : '#059669',
    },
  };

  const intentColor = intentColors[intent] || intentColors.info;
  const overlayBg = tokens.overlay || 'rgba(0, 0, 0, 0.54)';
  const baseBg = tokens.surface || '#FFFFFF';
  const raisedBg = tokens.surfaceRaised || tokens.surface || '#F8FAFC';

  const renderIcon = () => {
    if (icon) return icon;
    switch (intent) {
      case 'success':
        return <LuCircleCheck size={20} color={intentColor.text} />;
      case 'critical':
        return <LuTrash2 size={20} color={intentColor.text} />;
      case 'failure':
        return <LuCircleAlert size={20} color={intentColor.text} />;
      case 'warning':
        return <LuTriangleAlert size={20} color={intentColor.text} />;
      case 'info':
      default:
        return <LuInfo size={20} color={intentColor.text} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <YStack
        flex={1}
        backgroundColor={overlayBg}
        alignItems="center"
        justifyContent="center"
        padding={20}
        role="alert"
        aria-label={title}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss dialog"
          onPress={dismissOnBackdropPress && !isLoading ? onCancel : undefined}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <YStack
          width="100%"
          maxWidth={360}
          backgroundColor={baseBg}
          borderRadius={tokens.radius.md || 12}
          borderWidth={1}
          borderColor={tokens.border || 'rgba(255, 255, 255, 0.12)'}
          padding={20}
          gap={14}
          shadowColor="#000"
          shadowOpacity={0.25}
          shadowRadius={16}
          shadowOffset={{ width: 0, height: 6 }}
          elevation={10}
        >
          {/* Icon & Title Header */}
          <XStack gap={12} alignItems="center">
            <YStack
              width={42}
              height={42}
              borderRadius={tokens.radius.full || 9999}
              backgroundColor={intentColor.subtle}
              borderWidth={1}
              borderColor={intentColor.border}
              alignItems="center"
              justifyContent="center"
            >
              {renderIcon()}
            </YStack>

            <YStack flex={1}>
              <Text fontSize={16} fontWeight="800" color={tokens.text || '#0F172A'}>
                {title}
              </Text>
            </YStack>
          </XStack>

          {/* Message Body */}
          {Boolean(message) && (
            <Text fontSize={13} lineHeight={19} color={tokens.textSecondary || '#475569'}>
              {message}
            </Text>
          )}

          {/* Actions Row */}
          <XStack gap={10} paddingTop={6}>
            {!singleButton && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
                disabled={isLoading}
                onPress={onCancel}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 44,
                  borderRadius: tokens.radius.xs || 6,
                  backgroundColor: raisedBg,
                  borderWidth: 1,
                  borderColor: tokens.border || '#CBD5E1',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Text fontSize={13} fontWeight="700" color={tokens.text || '#0F172A'}>
                  {cancelLabel}
                </Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              disabled={isLoading}
              onPress={onConfirm}
              style={({ pressed }) => ({
                flex: 1,
                height: 44,
                borderRadius: tokens.radius.xs || 6,
                backgroundColor: intentColor.base,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 12,
                opacity: pressed || isLoading ? 0.8 : 1,
              })}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text fontSize={13} fontWeight="700" color="#FFFFFF" numberOfLines={1}>
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </XStack>
        </YStack>
      </YStack>
    </Modal>
  );
}
