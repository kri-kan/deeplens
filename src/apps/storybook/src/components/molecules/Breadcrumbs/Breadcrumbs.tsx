import React from 'react';
import { XStack, Text } from 'tamagui';
import { useTheme, useResponsive } from '../../../theme';

export type BreadcrumbItem =
  | string
  | {
      label: string;
      onPress?: () => void;
      active?: boolean;
    };

export type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  separator?: string;
};

export function Breadcrumbs({
  items,
  separator = '/',
}: BreadcrumbsProps) {
  const { tokens } = useTheme();
  const { isMobile } = useResponsive();

  // Normalize items to objects
  const normalizedItems = items.map((item, index) => {
    const isLast = index === items.length - 1;
    if (typeof item === 'string') {
      return {
        label: item,
        onPress: undefined,
        active: isLast,
      };
    }
    return {
      label: item.label,
      onPress: item.onPress,
      active: item.active !== undefined ? item.active : isLast,
    };
  });

  // On small mobile screens, if breadcrumbs have > 3 items, show first and last 2 items
  let displayItems = normalizedItems;
  if (isMobile && normalizedItems.length > 3) {
    displayItems = [
      normalizedItems[0],
      { label: '...', onPress: undefined, active: false },
      ...normalizedItems.slice(-2),
    ];
  }

  return (
    <XStack
      alignItems="center"
      flexWrap="wrap"
      gap={6}
      rowGap={4}
      aria-label="Breadcrumb navigation"
    >
      {displayItems.map((item, idx) => {
        const isLast = idx === displayItems.length - 1;
        const isInteractive = Boolean(item.onPress) && !item.active;

        return (
          <XStack key={`${item.label}-${idx}`} alignItems="center" gap={6}>
            <Text
              fontSize={isMobile ? 11 : 12}
              fontWeight={item.active ? '700' : '500'}
              color={item.active ? tokens.accent : tokens.textSecondary}
              cursor={isInteractive ? 'pointer' : 'default'}
              onPress={isInteractive ? item.onPress : undefined}
              numberOfLines={1}
              maxWidth={isMobile && isLast ? 160 : undefined}
              hoverStyle={
                isInteractive
                  ? {
                      color: tokens.accent,
                      textDecorationLine: 'underline',
                    }
                  : {}
              }
              pressStyle={
                isInteractive
                  ? {
                      opacity: 0.7,
                    }
                  : {}
              }
            >
              {item.label}
            </Text>

            {!isLast ? (
              <Text
                fontSize={isMobile ? 11 : 12}
                color={tokens.textMuted}
                userSelect="none"
              >
                {separator}
              </Text>
            ) : null}
          </XStack>
        );
      })}
    </XStack>
  );
}
