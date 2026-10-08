import React from 'react';
import { Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack, Text } from 'tamagui';
import { LuTrash2, LuCheck, LuArrowLeft } from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { TimestampBadge, formatAdaptiveTimestamp } from '../../atoms/TimestampBadge';

export interface DetailHeaderProps {
  orderId: string;
  createdAt: string | Date;
  compactDate?: boolean;
  disableSafeArea?: boolean;
  isSaving?: boolean;
  onSave: () => void;
  onDelete: () => void;
  onBack?: () => void;
}

// Re-export for backwards-compatibility
export const formatOrderDate = (d: string | Date) => formatAdaptiveTimestamp(d).displayText;

export function DetailHeader({
  orderId,
  createdAt,
  compactDate = false,
  disableSafeArea = false,
  isSaving = false,
  onSave,
  onDelete,
  onBack,
}: DetailHeaderProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;

  return (
    <XStack
      paddingTop={topInset}
      height={58 + topInset}
      alignItems="center"
      justifyContent="space-between"
      paddingHorizontal={16}
      backgroundColor={tokens.surface}
      borderBottomWidth={1}
      borderBottomColor={tokens.border}
    >
      {/* Left: Back (optional) + Order ID + Adaptive Timestamp Badge */}
      <XStack alignItems="center" gap={8}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: tokens.radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? `${tokens.text}12` : 'transparent',
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            <LuArrowLeft size={18} color={tokens.text} />
          </Pressable>
        )}
        <YStack gap={2}>
          <XStack alignItems="center" gap={8}>
            <Text fontSize={16} fontWeight="800" color={tokens.text} letterSpacing={0.3}>
              #{orderId}
            </Text>
            <TimestampBadge
              date={createdAt}
              compact={compactDate}
              size="sm"
            />
          </XStack>
        </YStack>
      </XStack>

      {/* Right: Delete & Save Action Buttons (Icon-only) */}
      <XStack alignItems="center" gap={8}>
        {/* Delete Icon Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete order"
          onPress={onDelete}
          disabled={isSaving}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: tokens.radius.sm,
            backgroundColor: `${tokens.error}14`,
            borderWidth: 1,
            borderColor: `${tokens.error}30`,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isSaving ? 0.4 : pressed ? 0.82 : 1,
            transform: [{ scale: pressed && !isSaving ? 0.94 : 1 }],
          })}
        >
          <LuTrash2 size={16} color={tokens.error} />
        </Pressable>

        {/* Save Icon Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save order changes"
          onPress={onSave}
          disabled={isSaving}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isSaving ? 0.8 : pressed ? 0.88 : 1,
            transform: [{ scale: pressed && !isSaving ? 0.94 : 1 }],
          })}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={tokens.accentForeground} />
          ) : (
            <LuCheck size={18} color={tokens.accentForeground} />
          )}
        </Pressable>
      </XStack>
    </XStack>
  );
}
