import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text, XStack } from 'tamagui';
import { useTheme } from '@/theme';

export type ToggleSwitchSize = 'sm' | 'md' | 'lg';

export interface ToggleSwitchProps {
  /**
   * Controlled checked state of the switch.
   */
  checked?: boolean;
  /**
   * Alias for checked (React Native / Paper standard).
   */
  value?: boolean;
  /**
   * Default checked state for uncontrolled usage.
   */
  defaultChecked?: boolean;
  /**
   * Callback fired when checked state changes.
   */
  onCheckedChange?: (checked: boolean) => void;
  /**
   * Alias for onCheckedChange (React Native / Paper standard).
   */
  onValueChange?: (checked: boolean) => void;
  /**
   * Disables interaction and dims opacity.
   */
  disabled?: boolean;
  /**
   * Preset sizes: 'sm' (36x20), 'md' (46x24 - standard), 'lg' (56x30).
   * @default 'md'
   */
  size?: ToggleSwitchSize;
  /**
   * Optional accompanying text label.
   */
  label?: string;
  /**
   * Position of the label relative to the switch.
   * @default 'left'
   */
  labelPosition?: 'left' | 'right';
  /**
   * When true, renders an 'ON' / 'OFF' indicator beside the switch.
   * @default false
   */
  showStateText?: boolean;
  /**
   * Custom text labels for ON and OFF states.
   * @default { on: 'ON', off: 'OFF' }
   */
  stateLabels?: { on?: string; off?: string };
  /**
   * Custom track color when checked (defaults to theme.tokens.accent).
   */
  activeColor?: string;
  /**
   * Custom track color when unchecked (defaults to theme.tokens.border).
   */
  inactiveColor?: string;
  /**
   * Accessible description for screen readers.
   */
  accessibilityLabel?: string;
  /**
   * Test identifier.
   */
  testID?: string;
}

const SIZE_CONFIG = {
  sm: {
    width: 36,
    height: 20,
    thumbSize: 14,
    padding: 3,
    travel: 16,
    fontSize: 11,
    stateFontSize: 10,
  },
  md: {
    width: 46,
    height: 24,
    thumbSize: 18,
    padding: 3,
    travel: 22,
    fontSize: 13,
    stateFontSize: 11,
  },
  lg: {
    width: 56,
    height: 30,
    thumbSize: 22,
    padding: 4,
    travel: 26,
    fontSize: 14,
    stateFontSize: 12,
  },
};

export function ToggleSwitch({
  checked: controlledChecked,
  value,
  defaultChecked = false,
  onCheckedChange,
  onValueChange,
  disabled = false,
  size = 'md',
  label,
  labelPosition = 'left',
  showStateText = false,
  stateLabels = { on: 'ON', off: 'OFF' },
  activeColor,
  inactiveColor,
  accessibilityLabel,
  testID,
}: ToggleSwitchProps) {
  const { tokens } = useTheme();
  const config = SIZE_CONFIG[size] ?? SIZE_CONFIG.md;

  const effectiveChecked = controlledChecked !== undefined ? controlledChecked : value;
  const isControlled = effectiveChecked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = isControlled ? effectiveChecked : internalChecked;

  const translateX = useRef(new Animated.Value(isChecked ? config.travel : 0)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: isChecked ? config.travel : 0,
      bounciness: 4,
      speed: 16,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isChecked, config.travel, translateX]);

  const handleToggle = () => {
    if (disabled) return;
    const nextState = !isChecked;
    if (!isControlled) {
      setInternalChecked(nextState);
    }
    onCheckedChange?.(nextState);
    onValueChange?.(nextState);
  };

  const effectiveActiveColor = activeColor ?? tokens.accent;
  const effectiveInactiveColor = inactiveColor ?? tokens.border;

  const renderStateText = () => {
    if (!showStateText) return null;
    const onText = stateLabels.on ?? 'ON';
    const offText = stateLabels.off ?? 'OFF';
    return (
      <Text
        fontSize={config.stateFontSize}
        fontWeight="700"
        letterSpacing={0.5}
        color={isChecked ? effectiveActiveColor : tokens.textMuted}
        userSelect="none"
      >
        {isChecked ? onText : offText}
      </Text>
    );
  };

  const renderLabel = () => {
    if (!label) return null;
    return (
      <Text
        fontSize={config.fontSize}
        fontWeight="500"
        color={disabled ? tokens.textMuted : tokens.text}
        userSelect="none"
      >
        {label}
      </Text>
    );
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: isChecked, disabled }}
      accessibilityLabel={accessibilityLabel ?? label ?? (isChecked ? 'On' : 'Off')}
      onPress={handleToggle}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        styles.pressableContainer,
        {
          opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        } as any,
      ]}
    >
      <XStack alignItems="center" gap={8}>
        {labelPosition === 'left' && renderLabel()}

        {/* The Toggle Track */}
        <View
          style={[
            styles.track,
            {
              width: config.width,
              height: config.height,
              borderRadius: config.height / 2,
              backgroundColor: isChecked ? effectiveActiveColor : effectiveInactiveColor,
              borderColor: isChecked ? effectiveActiveColor : tokens.borderStrong,
            },
          ]}
        >
          {/* Symmetrical Nested Thumb */}
          <Animated.View
            style={[
              styles.thumb,
              {
                width: config.thumbSize,
                height: config.thumbSize,
                borderRadius: config.thumbSize / 2,
                top: config.padding,
                left: config.padding,
                transform: [{ translateX }],
              },
            ]}
          />
        </View>

        {showStateText && renderStateText()}
        {labelPosition === 'right' && renderLabel()}
      </XStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableContainer: {
    display: 'flex',
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  track: {
    borderWidth: 1.5,
    position: 'relative',
    justifyContent: 'center',
    transitionProperty: 'background-color, border-color',
    transitionDuration: '0.2s',
  } as any,
  thumb: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
});
