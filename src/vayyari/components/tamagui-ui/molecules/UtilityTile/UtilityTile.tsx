import React from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '@/theme';

export interface UtilityTileItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  route?: string;
  onPress?: () => void;
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

  const handlePress = () => {
    if (item.onPress) {
      item.onPress();
    } else if (item.route) {
      onPress?.(item.route);
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Launch ${item.title}`}
      activeOpacity={0.65}
      onPress={handlePress}
      style={{
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 2,
        width: '100%',
      }}
    >
      <YStack
        alignItems="center"
        justifyContent="center"
        gap={6}
        width="100%"
      >
        {/* Pure Icon Button without background box */}
        <YStack
          alignItems="center"
          justifyContent="center"
          position="relative"
          minHeight={40}
        >
          {item.icon}

          {item.badge && (
            <XStack
              position="absolute"
              top={-5}
              right={-10}
              backgroundColor={tokens.accent}
              paddingHorizontal={5}
              paddingVertical={1}
              borderRadius={tokens.radius.full}
            >
              <Text fontSize={9} fontWeight="800" color="#ffffff">
                {item.badge}
              </Text>
            </XStack>
          )}
        </YStack>

        {/* Small Label Below */}
        <Text
          fontSize={12}
          fontWeight="600"
          color={tokens.text}
          textAlign="center"
          numberOfLines={1}
          lineHeight={14}
          maxWidth={80}
        >
          {item.title}
        </Text>
      </YStack>
    </TouchableOpacity>
  );
}
