import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { useTheme } from '@/theme';

export interface SegmentOption {
  id: string;
  label: string;
  subtitle?: string;
  badge?: string;
}

export interface SegmentButtonOption {
  value: string;
  label: string;
  icon?: any;
  badge?: string;
  subtitle?: string;
}

export interface SegmentedControlProps {
  options?: SegmentOption[];
  buttons?: SegmentButtonOption[];
  activeId?: string;
  value?: string;
  onChange?: (id: string) => void;
  onValueChange?: (val: string) => void;
  accessibilityLabel?: string;
  style?: any;
}

export function SegmentedControl({
  options,
  buttons,
  activeId,
  value,
  onChange,
  onValueChange,
  accessibilityLabel,
  style,
}: SegmentedControlProps) {
  const { tokens } = useTheme();

  const resolvedOptions: SegmentOption[] = options ?? (buttons ? buttons.map(b => ({
    id: b.value,
    label: b.label,
    subtitle: b.subtitle,
    badge: b.badge,
  })) : []);

  const currentActive = activeId !== undefined ? activeId : (value ?? '');

  const handleSelect = (id: string) => {
    onChange?.(id);
    onValueChange?.(id);
  };

  return (
    <XStack
      backgroundColor={tokens.surfaceRaised}
      borderRadius={tokens.radius.sm}
      padding={3}
      gap={4}
      role="tablist"
      aria-label={accessibilityLabel}
      style={style}
    >
      {resolvedOptions.map((option) => {
        const isActive = option.id === currentActive;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={option.label}
            style={{ flex: 1 }}
            onPress={() => handleSelect(option.id)}
          >
            <YStack
              minHeight={36}
              paddingVertical={option.subtitle ? 3 : 6}
              paddingHorizontal={4}
              borderRadius={tokens.radius.xs}
              backgroundColor={isActive ? tokens.surface : 'transparent'}
              alignItems="center"
              justifyContent="center"
              borderWidth={isActive ? 1 : 0}
              borderColor={tokens.border}
              hoverStyle={{ opacity: 0.9 }}
            >
              <XStack alignItems="center" gap={4} justifyContent="center">
                <Text
                  fontSize={12}
                  fontWeight={isActive ? '800' : '600'}
                  color={isActive ? tokens.text : tokens.textMuted}
                  numberOfLines={1}
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
              {option.subtitle && (
                <Text
                  fontSize={9.5}
                  fontWeight="600"
                  color={isActive ? tokens.accent : tokens.textMuted}
                  numberOfLines={1}
                  marginTop={1}
                >
                  {option.subtitle}
                </Text>
              )}
            </YStack>
          </Pressable>
        );
      })}
    </XStack>
  );
}
