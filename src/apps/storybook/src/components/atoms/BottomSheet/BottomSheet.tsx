import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuX } from 'react-icons/lu';
import { useTheme } from '../../../theme';

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
    <YStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="rgba(0,0,0,0.48)"
      justifyContent="flex-end"
      zIndex={zIndex}
      onPress={onClose}
      role="presentation"
    >
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
        onPress={(e) => e.stopPropagation()}
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

        {/* Sheet Content Body */}
        <YStack paddingHorizontal={paddingHorizontal}>
          {children}
        </YStack>

        {/* Optional Sticky/Bottom Footer */}
        {footer && (
          <YStack paddingHorizontal={paddingHorizontal} paddingTop={10}>
            {footer}
          </YStack>
        )}
      </YStack>
    </YStack>
  );
}
