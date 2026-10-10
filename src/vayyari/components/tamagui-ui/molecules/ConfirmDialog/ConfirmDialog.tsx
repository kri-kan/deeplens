import React from 'react';
import { Pressable, Modal } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuTrash2, LuTriangleAlert, LuInfo, LuCheckCircle2 } from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';

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
  intent?: 'critical' | 'attention' | 'info' | 'success';
  /** Optional custom icon node */
  icon?: React.ReactNode;
  /** Whether to show only a single confirmation button (e.g. OK / acknowledgment) */
  singleButton?: boolean;
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
  icon,
  singleButton = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
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
    attention: {
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

  const intentColor = intentColors[intent] || intentColors.critical;
  const overlayBg = tokens.overlay || 'rgba(0, 0, 0, 0.54)';
  const baseBg = tokens.surface || '#FFFFFF';
  const raisedBg = tokens.surfaceRaised || tokens.surface || '#F8FAFC';

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
        <YStack
          width="100%"
          maxWidth={340}
          backgroundColor={baseBg}
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
              {icon ? (
                icon
              ) : intent === 'critical' ? (
                <LuTrash2 size={20} color={intentColor.text} />
              ) : intent === 'attention' ? (
                <LuTriangleAlert size={20} color={intentColor.text} />
              ) : intent === 'success' ? (
                <LuCheckCircle2 size={20} color={intentColor.text} />
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
          <XStack gap={10} paddingTop={6}>
            {!singleButton && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
                onPress={onCancel}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 44,
                  borderRadius: tokens.radius.xs,
                  backgroundColor: raisedBg,
                  borderWidth: 1,
                  borderColor: tokens.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Text fontSize={13} fontWeight="700" color={tokens.text}>
                  {cancelLabel}
                </Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              onPress={onConfirm}
              style={({ pressed }) => ({
                flex: 1,
                height: 44,
                borderRadius: tokens.radius.xs,
                backgroundColor: intentColor.base,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text fontSize={13} fontWeight="700" color="#FFFFFF">
                {confirmLabel}
              </Text>
            </Pressable>
          </XStack>
        </YStack>
      </YStack>
    </Modal>
  );
}
