import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { LuTrash2, LuCheck } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { TimestampBadge, formatAdaptiveTimestamp } from '../../atoms/TimestampBadge';

export interface DetailHeaderProps {
  orderId: string;
  createdAt: string | Date;
  compactDate?: boolean;
  onSave: () => void;
  onDelete: () => void;
}

// Re-export for backwards-compatibility
export const formatOrderDate = (d: string | Date) => formatAdaptiveTimestamp(d).displayText;

export function DetailHeader({
  orderId,
  createdAt,
  compactDate = false,
  onSave,
  onDelete,
}: DetailHeaderProps) {
  const { tokens } = useTheme();

  return (
    <XStack
      height={58}
      alignItems="center"
      justifyContent="space-between"
      paddingHorizontal={16}
      backgroundColor={tokens.surface}
      borderBottomWidth={1}
      borderBottomColor={tokens.border}
    >
      {/* Left: Order ID + Adaptive Timestamp Badge */}
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

      {/* Right: Delete & Save Action Buttons (Icon-only) */}
      <XStack alignItems="center" gap={8}>
        {/* Delete Icon Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete order"
          onPress={onDelete}
          hitSlop={8}
        >
          <YStack
            width={34}
            height={34}
            borderRadius={tokens.radius.sm}
            backgroundColor={`${tokens.error}14`}
            borderWidth={1}
            borderColor={`${tokens.error}30`}
            alignItems="center"
            justifyContent="center"
            hoverStyle={{ backgroundColor: `${tokens.error}24` }}
            pressStyle={{ scale: 0.94 }}
          >
            <LuTrash2 size={16} color={tokens.error} />
          </YStack>
        </Pressable>

        {/* Save Icon Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save order changes"
          onPress={onSave}
          hitSlop={8}
        >
          <YStack
            width={34}
            height={34}
            borderRadius={tokens.radius.sm}
            backgroundColor={tokens.accent}
            alignItems="center"
            justifyContent="center"
            hoverStyle={{ opacity: 0.92 }}
            pressStyle={{ scale: 0.94 }}
          >
            <LuCheck size={18} color={tokens.accentForeground} />
          </YStack>
        </Pressable>
      </XStack>
    </XStack>
  );
}
