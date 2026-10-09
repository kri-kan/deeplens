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
} from 'react-icons/lu';
import { useTheme } from '../../../theme';
import {
  ORDER_STAGES,
  getStageColor,
  OrderStage,
  canTransitionStage,
} from '../../../utils/stageTransitionRules';

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

    Alert.alert('Action Blocked', 'Cannot transition to this stage.');
  };

  const triggerPaddingH = size === 'sm' ? 8 : size === 'lg' ? 14 : 10;
  const triggerHeight = size === 'sm' ? 32 : size === 'lg' ? 44 : 38;
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 13 : 12;

  return (
    <YStack style={containerStyle}>
      {label && (
        <Text
          fontSize={10}
          fontWeight="700"
          color={tokens.textMuted}
          textTransform="uppercase"
          letterSpacing={0.8}
          marginBottom={4}
        >
          {label}
        </Text>
      )}

      {/* Trigger Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Stage selector, current stage: ${currentStage}`}
        disabled={disabled}
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            height: triggerHeight,
            paddingHorizontal: triggerPaddingH,
            borderRadius: tokens.radius.sm,
            borderColor: isOpen ? tokens.accent : tokens.border,
            backgroundColor: pressed ? `${tokens.surfaceRaised}D0` : tokens.surfaceRaised,
            opacity: disabled ? 0.5 : 1,
          },
          triggerStyle,
        ]}
      >
        <XStack alignItems="center" gap={7} flex={1}>
          {/* Status Dot */}
          <View
            style={[
              styles.dot,
              {
                backgroundColor: currentDotColor,
                width: size === 'sm' ? 7 : 8,
                height: size === 'sm' ? 7 : 8,
              },
            ]}
          />
          <Text
            fontSize={fontSize}
            fontWeight="800"
            color={tokens.text}
            numberOfLines={1}
          >
            {currentStage}
          </Text>
        </XStack>
        <LuChevronDown size={size === 'sm' ? 14 : 16} color={tokens.textMuted} />
      </Pressable>

      {/* Dropdown Modal Sheet / Popup */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsOpen(false)}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                borderRadius: tokens.radius.lg,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <XStack
              alignItems="center"
              justifyContent="space-between"
              paddingHorizontal={16}
              paddingVertical={12}
              borderBottomWidth={1}
              borderBottomColor={tokens.border}
            >
              <YStack gap={2}>
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  Select Package Stage
                </Text>
                <Text fontSize={11} color={tokens.textMuted}>
                  Only adjacent stages can be transitioned (±1 step)
                </Text>
              </YStack>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close stage dropdown"
                onPress={() => setIsOpen(false)}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? `${tokens.text}10` : 'transparent',
                })}
              >
                <LuX size={18} color={tokens.text} />
              </Pressable>
            </XStack>

            {/* Stage Options List */}
            <YStack padding={8} gap={4}>
              {stages.map((stageName, idx) => {
                const isCurrent = idx === safeCurrentIndex;
                const isAdjacent = Math.abs(idx - safeCurrentIndex) === 1;
                const isPast = idx < safeCurrentIndex;
                const isNext = idx > safeCurrentIndex;
                const stageColor = getStageColor(stageName);

                const isPlacedLabelLocked =
                  stageName.toLowerCase() === 'placed' &&
                  requiresLabel &&
                  !hasLabel &&
                  isAdjacent;

                return (
                  <Pressable
                    key={stageName}
                    accessibilityRole="button"
                    accessibilityLabel={`Transition to ${stageName}`}
                    onPress={() => handleStagePress(stageName)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      {
                        borderRadius: tokens.radius.sm,
                        backgroundColor: isCurrent
                          ? `${tokens.accent}14`
                          : pressed && (isAdjacent || isCurrent)
                          ? `${tokens.text}08`
                          : 'transparent',
                        borderWidth: isCurrent ? 1 : 0,
                        borderColor: isCurrent ? `${tokens.accent}40` : 'transparent',
                        opacity: isCurrent ? 1 : isAdjacent ? 1 : 0.45,
                      },
                    ]}
                  >
                    <XStack alignItems="center" gap={10} flex={1}>
                      {/* Status Dot */}
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: stageColor,
                            width: 10,
                            height: 10,
                          },
                        ]}
                      />
                      <YStack gap={1} flex={1}>
                        <XStack alignItems="center" gap={6}>
                          <Text
                            fontSize={13}
                            fontWeight={isCurrent ? '800' : isAdjacent ? '700' : '500'}
                            color={isCurrent ? tokens.accent : tokens.text}
                          >
                            {stageName}
                          </Text>
                          {isCurrent && (
                            <View
                              style={[
                                styles.currentBadge,
                                { backgroundColor: `${tokens.accent}20` },
                              ]}
                            >
                              <Text fontSize={9} fontWeight="800" color={tokens.accent}>
                                CURRENT
                              </Text>
                            </View>
                          )}
                          {isPlacedLabelLocked && (
                            <View
                              style={[
                                styles.currentBadge,
                                { backgroundColor: `${tokens.warning}20` },
                              ]}
                            >
                              <Text fontSize={9} fontWeight="800" color={tokens.warning}>
                                LABEL REQUIRED
                              </Text>
                            </View>
                          )}
                        </XStack>

                        <Text fontSize={10} color={tokens.textMuted}>
                          {isCurrent
                            ? 'Active state'
                            : isAdjacent
                            ? isNext
                              ? 'Advance step →'
                              : '← Revert step'
                            : 'Non-adjacent (locked)'}
                        </Text>
                      </YStack>
                    </XStack>

                    {/* Right Indicator Icon */}
                    {isCurrent ? (
                      <LuCheck size={16} color={tokens.accent} />
                    ) : isAdjacent ? (
                      isPlacedLabelLocked ? (
                        <LuTriangleAlert size={14} color={tokens.warning} />
                      ) : null
                    ) : (
                      <LuLock size={13} color={tokens.textMuted} />
                    )}
                  </Pressable>
                );
              })}
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </YStack>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  dot: {
    borderRadius: 99,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  currentBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
