import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export interface SegmentOption {
  id: string;
  label: string;
  badge?: string;
}

export interface SegmentedControlProps {
  options: SegmentOption[];
  activeId: string;
  onChange: (id: string) => void;
  accessibilityLabel?: string;
}

export function SegmentedControl({
  options,
  activeId,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps) {
  const { tokens } = useTheme();

  return (
    <XStack
      backgroundColor={tokens.surfaceRaised}
      borderRadius={tokens.radius.sm}
      padding={3}
      gap={4}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const isActive = option.id === activeId;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={option.label}
            style={{ flex: 1 }}
            onPress={() => onChange(option.id)}
          >
            <YStack
              paddingVertical={6}
              borderRadius={tokens.radius.xs}
              backgroundColor={isActive ? tokens.surface : 'transparent'}
              alignItems="center"
              justifyContent="center"
              borderWidth={isActive ? 1 : 0}
              borderColor={tokens.border}
              hoverStyle={{ opacity: 0.9 }}
            >
              <XStack alignItems="center" gap={4}>
                <Text
                  fontSize={12}
                  fontWeight={isActive ? '800' : '600'}
                  color={isActive ? tokens.text : tokens.textMuted}
                >
                  {option.label}
                </Text>
                {option.badge && (
                  <YStack
                    paddingHorizontal={5}
                    paddingVertical={1}
                    borderRadius={tokens.radius.full}
                    backgroundColor={isActive ? tokens.accentSubtle : tokens.border}
                  >
                    <Text fontSize={9} fontWeight="700" color={isActive ? tokens.accent : tokens.textMuted}>
                      {option.badge}
                    </Text>
                  </YStack>
                )}
              </XStack>
            </YStack>
          </Pressable>
        );
      })}
    </XStack>
  );
}
