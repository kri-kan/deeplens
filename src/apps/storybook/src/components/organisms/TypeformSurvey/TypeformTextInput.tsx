import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuCornerDownLeft, LuCheck, LuCircleAlert } from 'react-icons/lu';
import { SurveyThemeTokens, getSurveyTheme } from './themeConfig';

export interface TypeformTextInputProps {
  questionNumber: number;
  title: string;
  description?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  inputType?: 'text' | 'tel' | 'email';
  prefix?: string;
  helperText?: string;
  validationError?: string | null;
  isValid?: boolean;
  onEnterPress?: () => void;
  theme?: SurveyThemeTokens;
}

export const TypeformTextInput: React.FC<TypeformTextInputProps> = ({
  questionNumber,
  title,
  description,
  placeholder = 'Type your answer here...',
  value,
  onChange,
  inputType = 'text',
  prefix,
  helperText,
  validationError,
  isValid = false,
  onEnterPress,
  theme,
}) => {
  const activeTheme = theme || getSurveyTheme('ivory-editorial');
  const [isFocused, setIsFocused] = useState(false);

  return (
    <YStack width="100%" maxWidth={680} gap={24} marginHorizontal="auto">
      {/* Header */}
      <YStack gap={8}>
        <XStack alignItems="center" gap={8}>
          <Text color={activeTheme.kickerColor} fontSize={13} fontWeight="700" letterSpacing={1}>
            {questionNumber} ➔
          </Text>
          <Text color={activeTheme.textMuted} fontSize={12} letterSpacing={1} textTransform="uppercase">
            Text Response
          </Text>
        </XStack>

        <Text color={activeTheme.textHeading} fontSize={26} fontWeight="700" lineHeight={34}>
          {title}
        </Text>

        {description && (
          <Text color={activeTheme.textBody} fontSize={14} lineHeight={20}>
            {description}
          </Text>
        )}
      </YStack>

      {/* Typeform Minimal Large Input Field */}
      <YStack gap={10} marginTop={8}>
        <XStack
          alignItems="center"
          borderBottomWidth={isFocused ? 2 : 1.5}
          borderBottomColor={
            validationError
              ? '#ef4444'
              : isFocused
              ? activeTheme.surfaceSelectedBorder
              : value.trim().length > 0
              ? activeTheme.surfaceHoverBorder
              : activeTheme.surfaceBorder
          }
          paddingVertical={12}
          gap={12}
          style={{
            transition: 'border-color 0.25s ease',
          }}
        >
          {prefix && (
            <Text color={activeTheme.surfaceSelectedBorder} fontSize={22} fontWeight="700">
              {prefix}
            </Text>
          )}

          <input
            type={inputType}
            value={value ?? ''}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onEnterPress) {
                onEnterPress();
              }
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: activeTheme.textHeading,
              fontSize: '22px',
              fontWeight: 500,
              fontFamily: 'inherit',
              letterSpacing: '0.5px',
            }}
          />

          {isValid && (
            <XStack alignItems="center" gap={4} backgroundColor="rgba(34, 197, 94, 0.15)" paddingHorizontal={8} paddingVertical={4} borderRadius={6}>
              <LuCheck size={14} color="#22c55e" />
              <Text color="#22c55e" fontSize={11} fontWeight="700">
                VERIFIED
              </Text>
            </XStack>
          )}
        </XStack>

        {/* Validation error or Helper Text */}
        {validationError ? (
          <XStack alignItems="center" gap={6} marginTop={4}>
            <LuCircleAlert size={14} color="#ef4444" />
            <Text color="#ef4444" fontSize={12} fontWeight="500">
              {validationError}
            </Text>
          </XStack>
        ) : (
          <XStack justifyContent="space-between" alignItems="center" marginTop={4}>
            <Text color={activeTheme.textMuted} fontSize={12}>
              {helperText || 'Shift ⇧ + Enter ↵ for new line'}
            </Text>

            {value.trim().length > 0 && (
              <XStack alignItems="center" gap={4}>
                <Text color={activeTheme.surfaceSelectedBorder} fontSize={11} fontWeight="600">
                  Press Enter
                </Text>
                <LuCornerDownLeft size={11} color={activeTheme.surfaceSelectedBorder} />
              </XStack>
            )}
          </XStack>
        )}
      </YStack>
    </YStack>
  );
};
