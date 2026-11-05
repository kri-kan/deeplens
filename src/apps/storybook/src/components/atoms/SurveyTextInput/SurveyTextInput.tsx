import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { SurveyThemeTokens } from '../../organisms/TypeformSurvey/themeConfig';

export interface SurveyTextInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  prefix?: string | React.ReactNode;
  suffix?: React.ReactNode;
  inputType?: 'text' | 'tel' | 'email' | 'number';
  maxLength?: number;
  isValid?: boolean;
  isError?: boolean;
  errorMessage?: string;
  helperText?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onEnterPress?: () => void;
  theme: SurveyThemeTokens;
  style?: React.CSSProperties;
}

export const SurveyTextInput: React.FC<SurveyTextInputProps> = ({
  value,
  onChangeText,
  placeholder = 'Type your answer here...',
  prefix,
  suffix,
  inputType = 'text',
  maxLength,
  isValid = false,
  isError = false,
  errorMessage,
  helperText,
  disabled = false,
  autoFocus = false,
  onEnterPress,
  theme,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const hasError = isError || Boolean(errorMessage);
  const activeBorderColor = hasError
    ? '#ef4444'
    : isFocused
    ? theme.kickerColor
    : value && value.trim().length > 0
    ? theme.surfaceHoverBorder || theme.kickerColor
    : theme.surfaceBorder;

  return (
    <YStack width="100%" gap={6} style={style}>
      <XStack
        alignItems="center"
        backgroundColor={theme.surfaceColor}
        borderColor={activeBorderColor}
        borderWidth={isFocused || hasError ? 2 : 1.5}
        borderRadius={12}
        paddingHorizontal={14}
        paddingVertical={10}
        gap={10}
        opacity={disabled ? 0.6 : 1}
        style={{
          boxSizing: 'border-box',
          transition: 'all 0.2s ease',
          boxShadow: isFocused ? `0 0 0 3px ${theme.kickerColor}25` : 'none',
        }}
      >
        {/* Optional Prefix */}
        {prefix && (
          typeof prefix === 'string' ? (
            <Text
              color={theme.kickerColor}
              fontSize={14}
              fontWeight="700"
              style={{ userSelect: 'none' }}
            >
              {prefix}
            </Text>
          ) : (
            <XStack alignItems="center">{prefix}</XStack>
          )
        )}

        {/* Core Input Field */}
        <input
          type={inputType}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(e) => onChangeText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnterPress) {
              e.preventDefault();
              onEnterPress();
            }
          }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: theme.textHeading,
            fontSize: '15px',
            fontWeight: '600',
            fontFamily: 'inherit',
            minWidth: 0,
            caretColor: theme.kickerColor,
          }}
        />

        {/* Optional Suffix (Checkmark, Icon, etc.) */}
        {suffix && (
          <XStack alignItems="center" justifyContent="center">
            {suffix}
          </XStack>
        )}
      </XStack>

      {/* Helper / Error Text */}
      {(hasError || helperText) && (
        <XStack paddingHorizontal={4} justifyContent="space-between">
          <Text
            fontSize={11.5}
            fontWeight="600"
            color={hasError ? '#ef4444' : theme.textMuted}
          >
            {hasError ? errorMessage : helperText}
          </Text>
          {maxLength && (
            <Text fontSize={11} color={theme.textMuted} fontWeight="500">
              {value.length} / {maxLength}
            </Text>
          )}
        </XStack>
      )}
    </YStack>
  );
};
