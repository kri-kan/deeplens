import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export interface UtilityTileItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  route: string;
  color?: string;
  description?: string;
  badge?: string;
  permission?: string;
}

export interface UtilityTileProps {
  item: UtilityTileItem;
  onPress?: (route: string) => void;
}

export function UtilityTile({ item, onPress }: UtilityTileProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Launch ${item.title}`}
      onPress={() => onPress?.(item.route)}
      style={{
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 2,
        width: '100%',
        cursor: 'pointer',
      } as any}
    >
      <YStack
        alignItems="center"
        justifyContent="center"
        gap={6}
        width="100%"
        pressStyle={{ opacity: 0.6, scale: 0.92 }}
      >
        {/* Pure Icon Button without background box */}
        <YStack
          alignItems="center"
          justifyContent="center"
          position="relative"
          minHeight={34}
        >
          {item.icon}

          {item.badge && (
            <XStack
              position="absolute"
              top={-4}
              right={-8}
              backgroundColor={tokens.accent}
              paddingHorizontal={4}
              paddingVertical={1}
              borderRadius={tokens.radius.full}
            >
              <Text fontSize={8} fontWeight="800" color="#ffffff">
                {item.badge}
              </Text>
            </XStack>
          )}
        </YStack>

        {/* Small Label Below */}
        <Text
          fontSize={11}
          fontWeight="600"
          color={tokens.text}
          textAlign="center"
          numberOfLines={1}
          lineHeight={13}
          maxWidth={76}
        >
          {item.title}
        </Text>
      </YStack>
    </Pressable>
  );
}
