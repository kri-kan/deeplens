import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export interface RadioButtonProps {
  /**
   * Controlled checked state.
   */
  checked?: boolean;
  /**
   * Status alias matching react-native-paper ('checked' | 'unchecked').
   */
  status?: 'checked' | 'unchecked';
  /**
   * Optional value identifying this radio option in a group.
   */
  value?: string;
  /**
   * Callback fired when pressed.
   */
  onPress?: () => void;
  /**
   * Disables interaction and dims opacity.
   */
  disabled?: boolean;
  /**
   * Outer diameter of the radio button.
   * @default 20
   */
  size?: number;
  /**
   * Custom active color for outer ring and inner dot. Defaults to theme tokens.accent.
   */
  color?: string;
  /**
   * Optional text label displayed next to the radio button.
   */
  label?: string;
  /**
   * Label position relative to the radio circle.
   * @default 'right'
   */
  labelPosition?: 'left' | 'right';
  /**
   * Accessible description for screen readers.
   */
  accessibilityLabel?: string;
  /**
   * Test identifier.
   */
  testID?: string;
}

export function RadioButton({
  checked: controlledChecked,
  status,
  value,
  onPress,
  disabled = false,
  size = 20,
  color,
  label,
  labelPosition = 'right',
  accessibilityLabel,
  testID,
}: RadioButtonProps) {
  const { tokens } = useTheme();

  const isChecked = controlledChecked !== undefined
    ? controlledChecked
    : status === 'checked';

  const activeColor = color ?? tokens.accent;
  const inactiveBorderColor = tokens.border;
  const innerDotSize = Math.max(6, Math.round(size * 0.5));

  const radioCircle = (
    <YStack
      width={size}
      height={size}
      borderRadius={size / 2}
      borderWidth={2}
      borderColor={isChecked ? activeColor : inactiveBorderColor}
      backgroundColor="transparent"
      alignItems="center"
      justifyContent="center"
    >
      {isChecked && (
        <YStack
          width={innerDotSize}
          height={innerDotSize}
          borderRadius={innerDotSize / 2}
          backgroundColor={activeColor}
        />
      )}
    </YStack>
  );

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isChecked, disabled }}
      accessibilityLabel={accessibilityLabel ?? label ?? (isChecked ? 'Selected' : 'Not selected')}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
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
          {radioCircle}
          {labelPosition === 'right' && (
            <Text fontSize={13} fontWeight="600" color={tokens.text}>
              {label}
            </Text>
          )}
        </XStack>
      ) : (
        radioCircle
      )}
    </Pressable>
  );
}
