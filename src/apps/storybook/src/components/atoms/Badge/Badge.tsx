import React from 'react';
import { XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type BadgeVariant = 'offer' | 'new' | 'sale' | 'express' | 'sponsored';

export type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
};

export function Badge({
  label,
  variant = 'offer',
  size = 'md',
  icon,
}: BadgeProps) {
  const { tokens } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'offer':
        return { bg: tokens.badgeOffer, color: tokens.badgeOfferText };
      case 'sale':
        return { bg: tokens.badgeSale, color: tokens.badgeSaleText };
      case 'new':
        return { bg: tokens.badgeNew, color: tokens.badgeNewText };
      case 'express':
        return { bg: tokens.badgeExpress, color: tokens.badgeExpressText };
      case 'sponsored':
      default:
        return { bg: tokens.surfaceRaised, color: tokens.textSecondary };
    }
  };

  const { bg, color } = getVariantStyles();

  // Balanced sizing tokens: generous padding & fixed pill heights to avoid cramped text
  const sizeStyles = {
    sm: {
      height: 22,
      paddingHorizontal: 10,
      fontSize: 11,
      gap: 4,
    },
    md: {
      height: 26,
      paddingHorizontal: 14,
      fontSize: 12,
      gap: 6,
    },
    lg: {
      height: 32,
      paddingHorizontal: 18,
      fontSize: 13,
      gap: 8,
    },
  }[size];

  return (
    <XStack
      alignSelf="flex-start"
      alignItems="center"
      justifyContent="center"
      height={sizeStyles.height}
      paddingHorizontal={sizeStyles.paddingHorizontal}
      gap={sizeStyles.gap}
      backgroundColor={bg}
      borderRadius={9999}
      cursor="default"
      /* Refined luminosity elevation instead of jarring text-zooming */
      shadowColor={bg}
      shadowOpacity={0}
      shadowRadius={0}
      hoverStyle={{
        opacity: 0.94,
        shadowColor: bg,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
      pressStyle={{ opacity: 0.85 }}
    >
      {icon ? icon : null}

      <Text
        color={color}
        fontSize={sizeStyles.fontSize}
        fontWeight="700"
        letterSpacing={0.6}
        textTransform="uppercase"
        lineHeight={sizeStyles.fontSize + 3}
      >
        {label}
      </Text>
    </XStack>
  );
}
