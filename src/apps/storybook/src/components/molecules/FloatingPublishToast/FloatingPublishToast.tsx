import React from 'react';
import { TouchableOpacity } from 'react-native';
import { XStack, Text } from 'tamagui';
import { LuSparkles, LuX } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface FloatingPublishToastProps {
  message: string;
  visible?: boolean;
  onDismiss: () => void;
  bottomOffset?: number;
}

export function FloatingPublishToast({
  message,
  visible = true,
  onDismiss,
  bottomOffset = 20,
}: FloatingPublishToastProps) {
  const { tokens } = useTheme();

  if (!visible || !message) return null;

  return (
    <XStack
      position="absolute"
      bottom={bottomOffset}
      left={16}
      right={16}
      backgroundColor="#10B981"
      paddingVertical={10}
      paddingHorizontal={14}
      borderRadius={tokens.radius.sm}
      alignItems="center"
      justifyContent="space-between"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.2}
      shadowRadius={8}
      elevation={6}
      zIndex={999}
    >
      <XStack alignItems="center" gap={8} flex={1}>
        <LuSparkles size={16} color="#ffffff" />
        <Text fontSize={12} fontWeight="800" color="#ffffff" flex={1}>
          {message}
        </Text>
      </XStack>
      <TouchableOpacity
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <LuX size={16} color="#ffffff" />
      </TouchableOpacity>
    </XStack>
  );
}
