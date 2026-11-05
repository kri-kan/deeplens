import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { LuCheck } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface CustomCheckboxProps {
  checked?: boolean;
  status?: 'checked' | 'unchecked' | 'indeterminate';
  onToggle?: () => void;
  onPress?: () => void;
  size?: number;
  disabled?: boolean;
  label?: string;
  labelPosition?: 'left' | 'right';
  color?: string;
  accessibilityLabel?: string;
  testID?: string;
}

export function CustomCheckbox({
  checked: controlledChecked,
  status,
  onToggle,
  onPress,
  size = 18,
  disabled = false,
  label,
  labelPosition = 'right',
  color,
  accessibilityLabel,
  testID,
}: CustomCheckboxProps) {
  const { tokens } = useTheme();

  const isChecked = controlledChecked !== undefined
    ? controlledChecked
    : status === 'checked';

  const handlePress = () => {
    if (disabled) return;
    onToggle?.();
    onPress?.();
  };

  const activeColor = color ?? tokens.accent;

  const box = (
    <YStack
      width={size}
      height={size}
      borderRadius={4}
      borderWidth={1.5}
      borderColor={isChecked ? activeColor : 'rgba(0,0,0,0.45)'}
      backgroundColor={isChecked ? activeColor : 'transparent'}
      alignItems="center"
      justifyContent="center"
    >
      {isChecked && <LuCheck size={size - 5} color={tokens.accentForeground || '#fff'} />}
    </YStack>
  );

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isChecked, disabled }}
      accessibilityLabel={accessibilityLabel ?? label ?? (isChecked ? 'Selected' : 'Not selected')}
      disabled={disabled}
      onPress={handlePress}
      hitSlop={8}
      testID={testID}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      {label ? (
        <XStack alignItems="center" gap={8}>
          {labelPosition === 'left' && (
            <Text fontSize={13} fontWeight="600" color={tokens.text}>
              {label}
            </Text>
          )}
          {box}
          {labelPosition === 'right' && (
            <Text fontSize={13} fontWeight="600" color={tokens.text}>
              {label}
            </Text>
          )}
        </XStack>
      ) : (
        box
      )}
    </Pressable>
  );
}
