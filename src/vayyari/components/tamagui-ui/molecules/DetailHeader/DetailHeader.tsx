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
  status?: string;
  statusCount?: number;
  compactDate?: boolean;
  disableSafeArea?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
  onDelete: () => void;
  onBack?: () => void;
}

// Re-export for backwards-compatibility
export const formatOrderDate = (d: string | Date) => formatAdaptiveTimestamp(d).displayText;

export function DetailHeader({
  orderId,
  createdAt,
  status = '',
  statusCount = 0,
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

  // Determine order status text and color intent
  const normStatus = (status || '').toLowerCase().trim();
  let statusText = '';
  let badgeBg = `${tokens.warning}1F`;
  let badgeTextColor = tokens.warning;

  if (normStatus) {
    if (normStatus.includes('deliver')) {
      statusText = status.includes('+') ? status.toUpperCase() : (statusCount > 0 ? `DELIVERED (+${statusCount})` : 'DELIVERED');
      badgeBg = `${tokens.success}1F`;
      badgeTextColor = tokens.success;
    } else if (normStatus.includes('place')) {
      statusText = status.includes('+') ? status.toUpperCase() : (statusCount > 0 ? `PLACED (+${statusCount})` : 'PLACED');
      badgeBg = `${tokens.accent}1F`;
      badgeTextColor = tokens.accent;
    } else if (normStatus.includes('process') || normStatus.includes('dispatch')) {
      statusText = status.includes('+') ? status.toUpperCase() : (statusCount > 0 ? `PROCESSED (+${statusCount})` : 'PROCESSED');
      badgeBg = '#6200ee1F';
      badgeTextColor = '#6200ee';
    } else if (normStatus.includes('confirm')) {
      statusText = status.includes('+') ? status.toUpperCase() : (statusCount > 0 ? `CONFIRMED (+${statusCount})` : 'CONFIRMED');
      badgeBg = `${tokens.accent}1F`;
      badgeTextColor = tokens.accent;
    } else if (normStatus.includes('unconfirmed')) {
      statusText = status.includes('+') ? status.toUpperCase() : (statusCount > 0 ? `UNCONFIRMED (+${statusCount})` : 'UNCONFIRMED');
      badgeBg = `${tokens.warning}1F`;
      badgeTextColor = tokens.warning;
    } else {
      statusText = status.toUpperCase();
      badgeBg = tokens.surfaceRaised;
      badgeTextColor = tokens.textMuted;
    }
  }

  return (
    <XStack
      paddingTop={topInset}
      height={58 + topInset}
      alignItems="center"
      justifyContent="space-between"
      paddingHorizontal={12}
      backgroundColor={tokens.surface}
      borderBottomWidth={1}
      borderBottomColor={tokens.border}
    >
      {/* Left: Back (optional) + Order ID + Timestamp Badge + Order Level Status Chip */}
      <XStack alignItems="center" gap={6} flex={1} marginRight={6} flexWrap="nowrap">
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => ({
              width: 30,
              height: 30,
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
        <Text fontSize={14} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
          #{orderId}
        </Text>
        <TimestampBadge
          date={createdAt}
          compact={true}
          size="sm"
        />
        {/* Order Level Status Chip (derived from groups; hidden if order has no items/stage) */}
        {!!statusText && (
          <YStack
            backgroundColor={badgeBg}
            paddingHorizontal={6}
            paddingVertical={3}
            borderRadius={6}
          >
            <Text fontSize={10} fontWeight="800" color={badgeTextColor}>
              {statusText}
            </Text>
          </YStack>
        )}
      </XStack>

      {/* Right: Delete Action Button */}
      <XStack alignItems="center" gap={6}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete order"
          onPress={onDelete}
          disabled={isSaving}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => ({
            width: 34,
            height: 34,
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
      </XStack>
    </XStack>
  );
}
