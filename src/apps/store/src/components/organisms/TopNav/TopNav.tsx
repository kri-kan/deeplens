import React from 'react';
import { XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type TopNavProps = {
  items: string[];
  activeItem?: string;
  onSelect?: (item: string) => void;
};

export function TopNav({ items, activeItem, onSelect }: TopNavProps) {
  const { tokens } = useTheme();

  return (
    <XStack alignItems="center" gap={14} flexWrap="wrap">
      {items.map((item) => {
        const isActive = activeItem ? item === activeItem : item === 'Women';

        return (
          <XStack
            key={item}
            paddingTop={18}
            paddingBottom={14}
            paddingHorizontal={6}
            justifyContent="center"
            alignItems="center"
            borderBottomWidth={isActive ? 3 : 3}
            borderBottomColor={isActive ? tokens.accent : 'transparent'}
            cursor="pointer"
            onPress={() => onSelect?.(item)}
            hoverStyle={{
              borderBottomColor: isActive ? tokens.accent : tokens.borderStrong,
            }}
          >
            <Text
              color={isActive ? tokens.accent : tokens.text}
              fontSize={12}
              fontWeight={isActive ? '800' : '700'}
              letterSpacing={0.8}
              textTransform="uppercase"
            >
              {item}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}
