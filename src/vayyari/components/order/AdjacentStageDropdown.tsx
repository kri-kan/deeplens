import React, { useState } from 'react';
import {
  Pressable,
  Modal,
  View,
  StyleSheet,
  Alert,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import {
  LuChevronDown,
  LuCheck,
  LuLock,
  LuTriangleAlert,
  LuX,
} from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import {
  ORDER_STAGES,
  getStageColor,
  OrderStage,
  canTransitionStage,
} from '@/utils/stageTransitionRules';

export { ORDER_STAGES, getStageColor, OrderStage };

export interface AdjacentStageDropdownProps {
  currentStage: string;
  onSelectStage: (newStage: string) => void;
  requiresLabel?: boolean;
  hasLabel?: boolean;
  disabled?: boolean;
  stages?: readonly string[];
  label?: string;
  triggerStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md' | 'lg';
}

export function AdjacentStageDropdown({
  currentStage = 'Unconfirmed',
  onSelectStage,
  requiresLabel = false,
  hasLabel = false,
  disabled = false,
  stages = ORDER_STAGES,
  label,
  triggerStyle,
  containerStyle,
  size = 'md',
}: AdjacentStageDropdownProps) {
  const { tokens } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const currentIndex = stages.findIndex(
    (s) => s.toLowerCase() === (currentStage || '').toLowerCase()
  );
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  const prevStage = safeCurrentIndex > 0 ? stages[safeCurrentIndex - 1] : null;
  const nextStage =
    safeCurrentIndex < stages.length - 1 ? stages[safeCurrentIndex + 1] : null;

  const currentDotColor = getStageColor(currentStage);

  const handleStagePress = (targetStage: string) => {
    const check = canTransitionStage({
      currentStage,
      targetStage,
      requiresLabel,
      hasLabel,
      stages,
    });

    if (check.allowed) {
      onSelectStage(targetStage);
      setIsOpen(false);
      return;
    }

    if (check.reason === 'SAME_STAGE') {
      setIsOpen(false);
      return;
    }

    if (check.reason === 'NON_ADJACENT') {
      Alert.alert(
        'Sequential Transition Only',
        `Packages can only move to the immediate next or previous stage (${prevStage || 'none'} or ${nextStage || 'none'}). You cannot skip stages.`
      );
      return;
    }

    if (check.reason === 'LABEL_REQUIRED') {
      Alert.alert(
        'Shipping Label Required',
        'A Delhivery shipping label must be generated before moving this package to Placed.'
      );
      return;
    }
  };

  const padV = size === 'sm' ? 6 : size === 'lg' ? 12 : 9;
  const padH = size === 'sm' ? 10 : size === 'lg' ? 14 : 12;
  const textSz = size === 'sm' ? 12 : size === 'lg' ? 15 : 13;

  return (
    <YStack style={containerStyle} gap={4}>
      {label && (
        <Text
          fontSize={10}
          fontWeight="700"
          color={tokens.textMuted}
          textTransform="uppercase"
          letterSpacing={0.5}
        >
          {label}
        </Text>
      )}

      {/* ── Trigger Button ── */}
      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={`Stage: ${currentStage}. Tap to open stage selector.`}
        accessibilityState={{ expanded: isOpen, disabled }}
        disabled={disabled}
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          {
            paddingVertical: padV,
            paddingHorizontal: padH,
            borderRadius: tokens.radius.sm,
            borderWidth: 1,
            borderColor: tokens.border,
            backgroundColor: pressed ? tokens.surfaceRaised : tokens.surface,
            opacity: disabled ? 0.5 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          },
          triggerStyle,
        ]}
      >
        <XStack alignItems="center" gap={8} flex={1}>
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 4.5,
              backgroundColor: currentDotColor,
            }}
          />
          <Text
            fontSize={textSz}
            fontWeight="700"
            color={tokens.text}
            numberOfLines={1}
          >
            {currentStage}
          </Text>
        </XStack>
        <LuChevronDown size={14} color={tokens.textMuted} />
      </Pressable>

      {/* ── Dropdown Modal Popup ── */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          {/* Backdrop Tap to Close */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss stage dropdown"
          />

          {/* Dialog Container */}
          <YStack
            width="100%"
            maxWidth={360}
            backgroundColor={tokens.background}
            borderRadius={tokens.radius.lg || 16}
            borderWidth={1}
            borderColor={tokens.border}
            padding={16}
            gap={12}
            shadowColor="#000"
            shadowOpacity={0.25}
            shadowRadius={20}
            shadowOffset={{ width: 0, height: 8 }}
            role="dialog"
            aria-modal={true}
          >
            {/* Header */}
            <XStack justifyContent="space-between" alignItems="center">
              <YStack gap={2}>
                <Text fontSize={14} fontWeight="800" color={tokens.text}>
                  Select Package Stage
                </Text>
                <Text fontSize={11} color={tokens.textMuted}>
                  Sequential progression (adjacent only)
                </Text>
              </YStack>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dropdown"
                onPress={() => setIsOpen(false)}
                hitSlop={8}
              >
                <YStack
                  width={28}
                  height={28}
                  borderRadius={14}
                  backgroundColor={tokens.surfaceRaised}
                  alignItems="center"
                  justifyContent="center"
                >
                  <LuX size={14} color={tokens.textSecondary} />
                </YStack>
              </Pressable>
            </XStack>

            {/* Stage Items List */}
            <YStack gap={8} paddingTop={4}>
              {stages.map((st, idx) => {
                const isCurrent = idx === safeCurrentIndex;
                const isNext = idx === safeCurrentIndex + 1;
                const isPrev = idx === safeCurrentIndex - 1;
                const isAdjacent = isNext || isPrev;
                const dotColor = getStageColor(st);
                const isBlockedPlaced =
                  st.toLowerCase() === 'placed' && requiresLabel && !hasLabel;

                return (
                  <Pressable
                    key={st}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isCurrent }}
                    accessibilityLabel={`${st}${
                      isCurrent
                        ? ', current stage'
                        : isNext
                        ? ', advance'
                        : isPrev
                        ? ', revert'
                        : ', locked'
                    }`}
                    onPress={() => handleStagePress(st)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: tokens.radius.sm,
                      borderWidth: 1,
                      borderColor: isCurrent
                        ? tokens.accent
                        : isAdjacent
                        ? isBlockedPlaced
                          ? tokens.warning
                          : tokens.border
                        : `${tokens.border}40`,
                      backgroundColor: isCurrent
                        ? `${tokens.accent}14`
                        : isAdjacent
                        ? pressed
                          ? `${tokens.text}08`
                          : tokens.surfaceRaised
                        : `${tokens.surface}30`,
                      opacity: isCurrent ? 1 : isAdjacent ? (pressed ? 0.8 : 1) : 0.4,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    })}
                  >
                    {/* Left: Stage dot and name */}
                    <XStack alignItems="center" gap={8} flex={1}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: dotColor,
                        }}
                      />
                      <Text
                        fontSize={13}
                        fontWeight={isCurrent ? '800' : '600'}
                        color={isCurrent ? tokens.accent : isAdjacent ? tokens.text : tokens.textMuted}
                        numberOfLines={1}
                      >
                        {st}
                      </Text>
                    </XStack>

                    {/* Right: Status indicator or transition action */}
                    {isCurrent && (
                      <XStack alignItems="center" gap={5}>
                        <Text
                          fontSize={10}
                          fontWeight="800"
                          color={tokens.accent}
                          textTransform="uppercase"
                        >
                          Current
                        </Text>
                        <LuCheck size={14} color={tokens.accent} />
                      </XStack>
                    )}

                    {isNext && (
                      isBlockedPlaced ? (
                        <XStack
                          backgroundColor="#FEF3C7"
                          borderWidth={1}
                          borderColor="#FDE68A"
                          paddingHorizontal={7}
                          paddingVertical={2}
                          borderRadius={tokens.radius.sm}
                          alignItems="center"
                          gap={4}
                        >
                          <LuTriangleAlert size={11} color="#D97706" />
                          <Text fontSize={10} fontWeight="700" color="#B45309">
                            Label Required
                          </Text>
                        </XStack>
                      ) : (
                        <XStack
                          backgroundColor={`${tokens.accent}14`}
                          paddingHorizontal={8}
                          paddingVertical={3}
                          borderRadius={tokens.radius.sm}
                          alignItems="center"
                        >
                          <Text
                            fontSize={11}
                            fontWeight="800"
                            color={tokens.accent}
                          >
                            Advance →
                          </Text>
                        </XStack>
                      )
                    )}

                    {isPrev && (
                      <XStack
                        backgroundColor={`${tokens.textMuted}14`}
                        paddingHorizontal={8}
                        paddingVertical={3}
                        borderRadius={tokens.radius.sm}
                        alignItems="center"
                      >
                        <Text
                          fontSize={11}
                          fontWeight="700"
                          color={tokens.textMuted}
                        >
                          ← Revert
                        </Text>
                      </XStack>
                    )}

                    {!isCurrent && !isAdjacent && (
                      <XStack alignItems="center" gap={4}>
                        <LuLock size={12} color={tokens.textMuted} />
                        <Text fontSize={10} color={tokens.textMuted}>
                          Locked
                        </Text>
                      </XStack>
                    )}
                  </Pressable>
                );
              })}
            </YStack>
          </YStack>
        </View>
      </Modal>
    </YStack>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
