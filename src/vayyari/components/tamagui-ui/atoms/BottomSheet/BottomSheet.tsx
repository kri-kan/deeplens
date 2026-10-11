import React from 'react';
import { Pressable, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuX } from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  headerRight?: React.ReactNode;
  showDragHandle?: boolean;
  showCloseButton?: boolean;
  zIndex?: number;
  maxHeight?: number | string;
  paddingHorizontal?: number;
  paddingBottom?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  headerRight,
  showDragHandle = true,
  showCloseButton = true,
  zIndex = 200,
  maxHeight = '90%',
  paddingHorizontal = 16,
  paddingBottom = 28,
  children,
  footer,
}: BottomSheetProps) {
  const { tokens } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <YStack
          flex={1}
          backgroundColor={tokens.overlay || 'rgba(0,0,0,0.48)'}
          justifyContent="flex-end"
        >
          {/* Backdrop press strictly above sheet — zero overlap with sheet content */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss sheet"
            onPress={onClose}
            style={{ flex: 1 }}
          />

          <YStack
            backgroundColor={tokens.background}
            borderTopLeftRadius={22}
            borderTopRightRadius={22}
            paddingTop={12}
            paddingBottom={paddingBottom}
            maxHeight={maxHeight}
            shadowColor="#000"
            shadowOpacity={0.22}
            shadowRadius={24}
            shadowOffset={{ width: 0, height: -8 }}
            role="dialog"
            aria-modal={true}
          >
            {/* Drag handle */}
            {showDragHandle && (
              <YStack alignItems="center" paddingBottom={10}>
                <YStack width={36} height={4} borderRadius={2} backgroundColor={tokens.border} />
              </YStack>
            )}

            {/* Sheet Header */}
            {(title || showCloseButton || headerRight) && (
              <XStack
                paddingHorizontal={paddingHorizontal}
                paddingBottom={12}
                justifyContent="space-between"
                alignItems="center"
              >
                {title ? (
                  <Text fontSize={16} fontWeight="800" color={tokens.text}>
                    {title}
                  </Text>
                ) : (
                  <YStack />
                )}

                <XStack alignItems="center" gap={8}>
                  {headerRight}

                  {showCloseButton && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Close sheet"
                      onPress={onClose}
                      hitSlop={8}
                    >
                      <YStack
                        width={28}
                        height={28}
                        borderRadius={tokens.radius.full}
                        backgroundColor={tokens.surfaceRaised}
                        alignItems="center"
                        justifyContent="center"
                        hoverStyle={{ backgroundColor: tokens.border }}
                      >
                        <LuX size={14} color={tokens.textSecondary} />
                      </YStack>
                    </Pressable>
                  )}
                </XStack>
              </XStack>
            )}

            {/* Scrollable Sheet Content Body */}
            <ScrollView
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingHorizontal }}
            >
              {children}
            </ScrollView>

            {/* Optional Sticky/Bottom Footer */}
            {footer && (
              <YStack paddingHorizontal={paddingHorizontal} paddingTop={10}>
                {footer}
              </YStack>
            )}
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    </Modal>
  );
}
