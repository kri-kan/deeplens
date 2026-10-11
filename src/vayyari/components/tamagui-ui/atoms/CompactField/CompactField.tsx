import React from 'react';
import { TextInput } from 'react-native';
import { YStack, Text } from 'tamagui';
import { useTheme } from '@/theme';

export interface CompactFieldProps {
  label: string;
  value: string;
  onChange?: (val: string) => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  maxLength?: number;
  accessibilityLabel?: string;
  editable?: boolean;
}

export function CompactField({
  label,
  value,
  onChange,
  onBlur,
  onSubmitEditing,
  placeholder,
  keyboardType = 'default',
  maxLength,
  accessibilityLabel,
  editable = true,
}: CompactFieldProps) {
  const { tokens } = useTheme();

  return (
    <YStack
      borderBottomWidth={1}
      borderBottomColor={tokens.border}
      paddingVertical={2}
      gap={1}
    >
      <Text fontSize={9} fontWeight="700" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.4}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        value={value ?? ''}
        editable={editable}
        onChangeText={editable ? onChange : undefined}
        onBlur={onBlur}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={tokens.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: editable ? tokens.text : tokens.textSecondary,
          height: 22,
          paddingVertical: 0,
          paddingHorizontal: 0,
          outlineStyle: 'none',
        } as any}
      />
    </YStack>
  );
}
