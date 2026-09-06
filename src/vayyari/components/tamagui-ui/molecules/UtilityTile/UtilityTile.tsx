import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '@/theme';

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
  const tileColor = item.color || tokens.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Launch ${item.title}`}
      onPress={() => onPress?.(item.route)}
      style={{ flex: 1, minWidth: 100 }}
    >
      <YStack
        backgroundColor={tokens.surface}
        borderRadius={tokens.radius.md}
        borderWidth={1}
        borderColor={tokens.border}
        padding={14}
        alignItems="flex-start"
        justifyContent="space-between"
        gap={10}
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 1 }}
        shadowOpacity={0.03}
        shadowRadius={4}
        hoverStyle={{
          borderColor: tileColor,
          backgroundColor: tokens.surfaceRaised,
        }}
        pressStyle={{
          opacity: 0.85,
        }}
      >
        {/* Top: Icon Box + Optional Badge */}
        <XStack width="100%" alignItems="center" justifyContent="space-between">
          <XStack
            width={40}
            height={40}
            borderRadius={tokens.radius.md}
            backgroundColor={`${tileColor}16`}
            alignItems="center"
            justifyContent="center"
          >
            {item.icon}
          </XStack>

          {item.badge && (
            <XStack
              backgroundColor={`${tokens.accent}14`}
              paddingHorizontal={6}
              paddingVertical={2}
              borderRadius={tokens.radius.xs}
            >
              <Text fontSize={10} fontWeight="700" color={tokens.accent}>
                {item.badge}
              </Text>
            </XStack>
          )}
        </XStack>

        {/* Bottom: Title & Description */}
        <YStack gap={2}>
          <Text
            fontSize={13}
            fontWeight="700"
            color={tokens.text}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {item.description ? (
            <Text
              fontSize={11}
              color={tokens.textMuted}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          ) : null}
        </YStack>
      </YStack>
    </Pressable>
  );
}
