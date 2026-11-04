import React from 'react';
import { Pressable } from 'react-native';
import { XStack, Text } from 'tamagui';
import { LuSparkles } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface ReviewQueueButtonProps {
  reviewCount?: number;
  isActive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

export function ReviewQueueButton({
  reviewCount = 0,
  isActive = false,
  disabled = false,
  onPress,
}: ReviewQueueButtonProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: isActive
            ? '#FEF3C7'
            : pressed
            ? `${tokens.accent}15`
            : tokens.surfaceRaised,
          borderColor: isActive ? '#F59E0B' : tokens.border,
          borderWidth: 1,
          opacity: disabled ? 0.4 : 1,
          transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Review queue (${reviewCount} products need review)`}
    >
      <XStack alignItems="center" gap={6}>
        <LuSparkles size={13} color={isActive ? '#B45309' : tokens.accent} />
        <Text
          fontSize={11}
          fontWeight="800"
          color={isActive ? '#B45309' : tokens.accent}
        >
          Review
        </Text>
        {reviewCount > 0 && (
          <XStack
            backgroundColor="#D97706"
            paddingHorizontal={5}
            paddingVertical={1.5}
            borderRadius={10}
            minWidth={18}
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={9} fontWeight="900" color="#ffffff">
              {reviewCount}
            </Text>
          </XStack>
        )}
      </XStack>
    </Pressable>
  );
}
