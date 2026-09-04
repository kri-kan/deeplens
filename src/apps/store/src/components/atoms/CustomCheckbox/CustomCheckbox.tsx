import React from 'react';
import { Pressable } from 'react-native';
import { YStack } from 'tamagui';
import { LuCheck } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface CustomCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  accessibilityLabel?: string;
}

export function CustomCheckbox({
  checked,
  onToggle,
  size = 18,
  accessibilityLabel,
}: CustomCheckboxProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel ?? (checked ? 'Selected' : 'Not selected')}
      onPress={onToggle}
      hitSlop={8}
    >
      <YStack
        width={size}
        height={size}
        borderRadius={4}
        borderWidth={1.5}
        borderColor={checked ? tokens.accent : 'rgba(0,0,0,0.45)'}
        backgroundColor={checked ? tokens.accent : 'transparent'}
        alignItems="center"
        justifyContent="center"
      >
        {checked && <LuCheck size={size - 5} color={tokens.accentForeground} />}
      </YStack>
    </Pressable>
  );
}
