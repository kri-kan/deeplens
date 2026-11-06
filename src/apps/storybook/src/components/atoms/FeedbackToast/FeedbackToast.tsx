import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import {
  LuCircleCheck,
  LuCircleAlert,
  LuTriangleAlert,
  LuInfo,
  LuX,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type FeedbackToastIntent = 'success' | 'failure' | 'warning' | 'info';

export interface FeedbackToastProps {
  /** Visibility flag */
  visible: boolean;
  /** Primary message string */
  message: string;
  /** Optional bold title heading */
  title?: string;
  /** Visual intent controlling colors and icon */
  intent?: FeedbackToastIntent;
  /** Duration in milliseconds before auto-dismissing (default 2800ms; 0 disables auto-dismiss) */
  durationMs?: number;
  /** Vertical placement */
  position?: 'top' | 'bottom';
  /** Distance in pixels from bottom edge when position='bottom' (default 24) */
  bottomOffset?: number;
  /** Distance in pixels from top edge when position='top' (default 24) */
  topOffset?: number;
  /** Optional interactive action label (e.g. 'RETRY', 'VIEW') */
  actionLabel?: string;
  /** Callback fired when action label is pressed */
  onAction?: () => void;
  /** Callback fired when toast is dismissed either by timer or close button */
  onDismiss: () => void;
}

export const DEFAULT_TOAST_DURATION_MS = 2800;

export interface IntentConfig {
  iconColor: string;
  badgeBg: string;
  borderColor: string;
}

export function getFeedbackToastIntentConfig(intent?: FeedbackToastIntent): IntentConfig {
  switch (intent) {
    case 'success':
      return {
        iconColor: '#10B981',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
      };
    case 'failure':
      return {
        iconColor: '#EF4444',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.35)',
      };
    case 'warning':
      return {
        iconColor: '#F59E0B',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
      };
    case 'info':
    default:
      return {
        iconColor: '#3B82F6',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 0.35)',
      };
  }
}

export function FeedbackToast({
  visible,
  message,
  title,
  intent = 'info',
  durationMs = DEFAULT_TOAST_DURATION_MS,
  position = 'bottom',
  bottomOffset = 24,
  topOffset = 24,
  actionLabel,
  onAction,
  onDismiss,
}: FeedbackToastProps) {
  const { tokens } = useTheme();
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!visible || !message || durationMs <= 0) return;
    const timer = setTimeout(() => {
      onDismissRef.current();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [visible, Boolean(message), durationMs]);

  if (!visible || !message) return null;

  const config = getFeedbackToastIntentConfig(intent);
  const isTop = position === 'top';

  const renderIcon = () => {
    switch (intent) {
      case 'success':
        return <LuCircleCheck size={18} color={config.iconColor} />;
      case 'failure':
        return <LuCircleAlert size={18} color={config.iconColor} />;
      case 'warning':
        return <LuTriangleAlert size={18} color={config.iconColor} />;
      case 'info':
      default:
        return <LuInfo size={18} color={config.iconColor} />;
    }
  };

  return (
    <XStack
      position="absolute"
      top={isTop ? topOffset : undefined}
      bottom={!isTop ? bottomOffset : undefined}
      left={16}
      right={16}
      maxWidth={480}
      alignSelf="center"
      backgroundColor={tokens.surfaceRaised || '#1E293B'}
      borderRadius={tokens.radius.sm || 8}
      borderWidth={1}
      borderColor={tokens.border || 'rgba(255, 255, 255, 0.12)'}
      paddingVertical={10}
      paddingHorizontal={12}
      alignItems="center"
      justifyContent="space-between"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.25}
      shadowRadius={12}
      elevation={8}
      zIndex={9999}
      gap={10}
      role="status"
      aria-live="polite"
    >
      <XStack alignItems="center" gap={10} flex={1}>
        <YStack
          width={30}
          height={30}
          borderRadius={tokens.radius.full || 9999}
          backgroundColor={config.badgeBg}
          borderWidth={1}
          borderColor={config.borderColor}
          alignItems="center"
          justifyContent="center"
        >
          {renderIcon()}
        </YStack>

        <YStack flex={1} gap={2}>
          {Boolean(title) && (
            <Text fontSize={12} fontWeight="800" color={tokens.text || '#FFFFFF'} numberOfLines={1}>
              {title}
            </Text>
          )}
          <Text
            fontSize={12}
            fontWeight="500"
            color={tokens.textSecondary || 'rgba(255, 255, 255, 0.85)'}
            numberOfLines={2}
          >
            {message}
          </Text>
        </YStack>
      </XStack>

      {Boolean(actionLabel && onAction) && (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [
            styles.actionBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text fontSize={11} fontWeight="800" color={config.iconColor} letterSpacing={0.4}>
            {actionLabel}
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => [
          styles.closeBtn,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <LuX size={15} color={tokens.textMuted || '#94A3B8'} />
      </Pressable>
    </XStack>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  closeBtn: {
    padding: 2,
  },
});
