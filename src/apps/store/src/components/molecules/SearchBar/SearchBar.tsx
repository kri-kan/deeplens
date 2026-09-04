import React, { useState } from 'react';
import { TextInput } from 'react-native';
import { XStack } from 'tamagui';
import { LuSearch, LuX } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type SearchBarProps = {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  compact?: boolean;
  onClear?: () => void;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search for products, brands and more',
  compact = false,
  onClear,
}: SearchBarProps) {
  const { tokens } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [internalText, setInternalText] = useState(value ?? '');

  const textValue = value !== undefined ? value : internalText;

  const handleChange = (text: string) => {
    setInternalText(text);
    onChangeText?.(text);
  };

  const handleClear = () => {
    setInternalText('');
    onChangeText?.('');
    onClear?.();
  };

  return (
    <XStack
      alignItems="center"
      height={44}
      maxHeight={44}
      borderRadius={9999}
      backgroundColor={tokens.surface}
      borderWidth={1.5}
      borderColor={isFocused ? tokens.accent : tokens.border}
      paddingHorizontal={14}
      width={compact ? 220 : '100%'}
      maxWidth={compact ? 220 : 480}
      flexShrink={1}
      alignSelf="flex-start"
      shadowColor={isFocused ? tokens.accent : '#000000'}
      shadowOpacity={isFocused ? 0.15 : 0.04}
      shadowRadius={isFocused ? 10 : 4}
      shadowOffset={{ width: 0, height: 2 }}
    >
      <LuSearch
        size={16}
        color={isFocused ? tokens.accent : tokens.textMuted}
        style={{ marginRight: 10, flexShrink: 0 }}
      />

      <TextInput
        value={textValue}
        onChangeText={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={tokens.textMuted}
        style={{
          flex: 1,
          height: 40,
          fontSize: 13,
          color: tokens.text,
          paddingVertical: 0,
          paddingHorizontal: 0,
          borderWidth: 0,
          backgroundColor: 'transparent',
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {textValue.length > 0 ? (
        <XStack
          cursor="pointer"
          padding={4}
          borderRadius={9999}
          backgroundColor={tokens.surfaceRaised}
          onPress={handleClear}
          hoverStyle={{ scale: 1.1 }}
          pressStyle={{ scale: 0.9 }}
        >
          <LuX size={13} color={tokens.textMuted} />
        </XStack>
      ) : null}
    </XStack>
  );
}
