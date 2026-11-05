import React from 'react';
import { XStack, Text } from 'tamagui';
import { MudraCoin } from '../MudraCoin';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';

export interface SurveyMudrasBadgeProps {
  amount: number;
  theme: SurveyThemeTokens;
  isPulsing?: boolean;
  prefix?: string; // e.g. '+'
  variant?: 'vault' | 'chip' | 'compact';
  /** Whether to show the text label " Mudras" (default: false for 'compact', true for 'vault'/'chip') */
  showLabel?: boolean;
  /** Size scale override */
  size?: 'sm' | 'md' | 'lg';
}

export const SurveyMudrasBadge: React.FC<SurveyMudrasBadgeProps> = ({
  amount,
  theme,
  isPulsing = false,
  prefix = '',
  variant = 'vault',
  showLabel,
  size = 'md',
}) => {
  // Determine if the "Mudras" label should be rendered
  const shouldShowLabel = showLabel !== undefined ? showLabel : variant !== 'compact';

  // Compact variant: High-density count pill with icon only (no label)
  if (variant === 'compact') {
    const coinSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;
    const fontSize = size === 'sm' ? 10 : size === 'lg' ? 12 : 11;
    const lineHeight = fontSize + 2;

    return (
      <XStack
        alignItems="center"
        justifyContent="center"
        gap={4}
        backgroundColor={theme.accentBadgeBg}
        borderColor={theme.surfaceBorder}
        borderWidth={1}
        borderRadius={12}
        paddingHorizontal={size === 'sm' ? 6 : 8}
        paddingVertical={3}
        flexShrink={0}
      >
        <MudraCoin size={coinSize} isPulsing={isPulsing} />
        <Text
          color={theme.kickerColor}
          fontSize={fontSize}
          lineHeight={lineHeight}
          fontWeight="800"
          userSelect="none"
        >
          {prefix}{amount.toLocaleString()}{shouldShowLabel ? ' Mudras' : ''}
        </Text>
      </XStack>
    );
  }

  if (variant === 'chip') {
    const coinSize = size === 'sm' ? 12 : 13;
    const fontSize = size === 'sm' ? 10 : 11;
    const lineHeight = fontSize + 2;

    return (
      <XStack
        alignItems="center"
        justifyContent="center"
        gap={5}
        backgroundColor={theme.accentBadgeBg}
        borderColor={theme.surfaceBorder}
        borderWidth={1}
        borderRadius={12}
        paddingHorizontal={8}
        paddingVertical={3}
        flexShrink={0}
      >
        <MudraCoin size={coinSize} isPulsing={isPulsing} />
        <Text
          color={theme.kickerColor}
          fontSize={fontSize}
          lineHeight={lineHeight}
          fontWeight="800"
          userSelect="none"
        >
          {prefix}{amount.toLocaleString()}{shouldShowLabel ? ' Mudras' : ''}
        </Text>
      </XStack>
    );
  }

  // Default: Vault style for header
  const coinSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 14 : 12;
  const lineHeight = fontSize + 2;

  return (
    <XStack
      backgroundColor={isPulsing ? theme.surfaceSelectedBg : theme.accentBadgeBg}
      borderColor={isPulsing ? theme.kickerColor : theme.surfaceBorder}
      borderWidth={1}
      borderRadius={16}
      paddingHorizontal={size === 'sm' ? 8 : 10}
      paddingVertical={4}
      alignItems="center"
      justifyContent="center"
      gap={6}
      flexShrink={0}
      style={{
        boxShadow: isPulsing
          ? `0 0 14px ${theme.kickerColor}99`
          : '0 2px 8px rgba(0, 0, 0, 0.08)',
        transform: isPulsing ? 'scale(1.08)' : 'scale(1)',
        transition: 'all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <MudraCoin size={coinSize} isPulsing={isPulsing} />
      <Text
        color={isPulsing ? theme.kickerColor : theme.accentBadgeText}
        fontSize={fontSize}
        lineHeight={lineHeight}
        fontWeight="800"
        userSelect="none"
      >
        {prefix}{amount.toLocaleString()}{shouldShowLabel ? ' Mudras' : ''}
      </Text>
    </XStack>
  );
};
