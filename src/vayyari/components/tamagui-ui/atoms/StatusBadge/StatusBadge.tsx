import React from 'react';
import { XStack, YStack, Text } from 'tamagui';
import { useTheme } from '@/theme';

export type StatusIntent = 'attention' | 'positive' | 'critical' | 'info';

export interface StatusBadgeProps {
  intent: StatusIntent;
  label: string;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  accessibilityLabel?: string;
}

export function StatusBadge({
  intent,
  label,
  size = 'md',
  icon,
  accessibilityLabel,
}: StatusBadgeProps) {
  const { tokens } = useTheme();
  const intentColors = tokens?.status?.[intent] ?? {
    base: '#F59E0B',
    subtle: '#FFF4E5',
    border: '#FFE2B8',
    text: '#B06000',
  };

  const isSmall = size === 'sm';

  return (
    <XStack
      role="status"
      aria-label={accessibilityLabel ?? `${intent} status: ${label}`}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={isSmall ? 8 : 12}
      height={isSmall ? 22 : 26}
      borderRadius={tokens?.radius?.full ?? 9999}
      backgroundColor={intentColors.subtle}
      borderWidth={1}
      borderColor={intentColors.border}
      gap={4}
    >
      {icon && (
        <YStack alignItems="center" justifyContent="center">
          {icon}
        </YStack>
      )}
      <Text
        fontSize={isSmall ? 10 : 11}
        lineHeight={isSmall ? 12 : 14}
        fontWeight="800"
        color={intentColors.text}
        letterSpacing={0.4}
        textAlign="center"
        textTransform="uppercase"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlignVertical: 'center',
          includeFontPadding: false,
        } as any}
      >
        {label}
      </Text>
    </XStack>
  );
}
