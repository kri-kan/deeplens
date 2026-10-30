import React, { useRef } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { Text, XStack } from 'tamagui';

export interface OtpDigitInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
}

export const OtpDigitInput: React.FC<OtpDigitInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
  hasError = false,
}) => {
  const inputRef = useRef<TextInput>(null);

  const cleanValue = value.replace(/\D/g, '').slice(0, length);
  const digits = cleanValue.split('');

  const handlePress = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  const handleChangeText = (text: string) => {
    const sanitized = text.replace(/\D/g, '').slice(0, length);
    onChange(sanitized);
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <XStack gap="$2" justifyContent="center" alignItems="center">
        {Array.from({ length }).map((_, index) => {
          const char = digits[index] || '';
          const isFocused = !disabled && (cleanValue.length === index || (cleanValue.length === length && index === length - 1));

          return (
            <View
              key={index}
              style={[
                styles.digitBox,
                char ? styles.digitBoxFilled : styles.digitBoxEmpty,
                isFocused && styles.digitBoxFocused,
                hasError && styles.digitBoxError,
                disabled && styles.digitBoxDisabled,
              ]}
            >
              <Text style={[styles.digitText, hasError && styles.digitTextError]}>
                {char}
              </Text>
            </View>
          );
        })}
      </XStack>

      {/* Hidden underlying TextInput capturing real keystrokes & paste */}
      <TextInput
        ref={inputRef}
        value={cleanValue}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        maxLength={length}
        editable={!disabled}
        style={styles.hiddenInput}
        autoFocus
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    marginVertical: 12,
  },
  digitBox: {
    width: 44,
    height: 52,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  digitBoxEmpty: {
    borderColor: '#334155',
  },
  digitBoxFilled: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  digitBoxFocused: {
    borderColor: '#25D366',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  digitBoxError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  digitBoxDisabled: {
    opacity: 0.5,
  },
  digitText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  digitTextError: {
    color: '#F87171',
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.01,
  },
});
