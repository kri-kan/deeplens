import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuX,
  LuBuilding2,
  LuCircleHelp as LuHelpCircle,
  LuCheck,
  LuLock,
  LuArrowLeft,
  LuArrowRight,
  LuShare2,
  LuFileText,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { StatusBadge, StatusIntent } from '../../atoms/StatusBadge';
import { OrderItem } from '../ProductListSection';

export interface GroupManagementModalProps {
  visible: boolean;
  orderId: string;
  orderGrpId?: string;
  vendorName: string;
  isUnassigned?: boolean;
  currentStage: string;
  isCod?: boolean;
  needLabel?: boolean;
  awbNumber?: string;
  labelUrl?: string;
  isLocked?: boolean;
  items: OrderItem[];
  onUpdateStage: (newStage: string) => void;
  onGenerateLabel?: () => void;
  onViewLabel?: (url: string) => void;
  onShareGroup?: () => void;
  onClose: () => void;
}

const ORDER_STAGES = ['Unconfirmed', 'Confirmed', 'Processed', 'Placed', 'Delivered'] as const;

export function GroupManagementModal({
  visible,
  orderId,
  orderGrpId,
  vendorName,
  isUnassigned = false,
  currentStage = 'Unconfirmed',
  isCod = false,
  needLabel = false,
  awbNumber,
  labelUrl,
  isLocked = false,
  items,
  onUpdateStage,
  onGenerateLabel,
  onViewLabel,
  onShareGroup,
  onClose,
}: GroupManagementModalProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const getStageIntent = (stage: string): StatusIntent => {
    const s = (stage || '').toLowerCase();
    if (s === 'delivered') return 'positive';
    if (s === 'placed') return 'info';
    if (s === 'processed') return 'info';
    if (s === 'confirmed') return 'info';
    return 'attention';
  };

  const currentIndex = ORDER_STAGES.findIndex(
    (s) => s.toLowerCase() === (currentStage || '').toLowerCase()
  );
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;

  const prevStage = safeCurrentIndex > 0 ? ORDER_STAGES[safeCurrentIndex - 1] : null;
  const nextStage = safeCurrentIndex < ORDER_STAGES.length - 1 ? ORDER_STAGES[safeCurrentIndex + 1] : null;

  const hasLabel = Boolean(labelUrl || awbNumber);
  const requiresLabel = Boolean(needLabel || isCod);

  const handleStageTransition = (targetStage: string) => {
    const targetIndex = ORDER_STAGES.findIndex(
      (s) => s.toLowerCase() === targetStage.toLowerCase()
    );

    if (targetIndex === safeCurrentIndex) {
      return;
    }

    // Sequential transition rule: exactly 1 step away
    if (Math.abs(targetIndex - safeCurrentIndex) !== 1) {
      Alert.alert(
        'Sequential Transition Only',
        `Packages can only move to the immediate next or previous stage (${prevStage || 'none'} or ${nextStage || 'none'}). You cannot skip stages.`
      );
      return;
    }

    // Label gate on moving forward to Placed
    if (targetStage.toLowerCase() === 'placed' && requiresLabel && !hasLabel) {
      Alert.alert(
        'Shipping Label Required',
        'A Delhivery shipping label must be generated before moving this package to Placed.'
      );
      return;
    }

    onUpdateStage(targetStage);
  };

  const totalItemsCount = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const totalSubtotal = items.reduce((acc, it) => {
    const codCharge = isCod ? (it.codChargePerPiece ?? 50) : 0;
    const grossLineTotal = (it.quantity || 1) * ((it.costPerPiece || 0) + codCharge);
    const paidAmount = isCod ? (it.amountPaid || 0) : 0;
    return acc + Math.max(0, grossLineTotal - paidAmount);
  }, 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <YStack flex={1} backgroundColor={tokens.background} paddingTop={insets.top}>
        {/* ── Top Navigation Bar ── */}
        <XStack
          height={56}
          paddingHorizontal={16}
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth={1}
          borderBottomColor={tokens.border}
          backgroundColor={tokens.surface}
        >
          <XStack alignItems="center" gap={8} flex={1}>
            <XStack
              width={32}
              height={32}
              borderRadius={tokens.radius.full}
              backgroundColor={isUnassigned ? `${tokens.textMuted}14` : `${tokens.accent}1A`}
              alignItems="center"
              justifyContent="center"
            >
              <LuBuilding2 size={18} color={isUnassigned ? tokens.textMuted : tokens.accent} />
            </XStack>
            <YStack flex={1}>
              <Text fontSize={15} fontWeight="800" color={tokens.text} numberOfLines={1}>
                {orderGrpId ? `${orderGrpId} • ${isUnassigned ? 'No Vendor' : vendorName}` : (isUnassigned ? 'No Vendor' : `${vendorName} Package`)}
              </Text>
              <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                Order #{orderId} • {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} : ₹{totalSubtotal.toLocaleString('en-IN')}
              </Text>
            </YStack>
          </XStack>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close group modal"
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: tokens.radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? `${tokens.text}10` : 'transparent',
            })}
          >
            <LuX size={20} color={tokens.text} />
          </Pressable>
        </XStack>

        {/* ── Scrollable Body ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(40, insets.bottom + 20), gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Group Lock Banner if applicable */}
          {isLocked && (
            <XStack
              backgroundColor={`${tokens.accent}12`}
              borderWidth={1}
              borderColor={`${tokens.accent}40`}
              borderRadius={tokens.radius.md}
              padding={12}
              alignItems="center"
              gap={10}
            >
              <LuLock size={20} color={tokens.accent} />
              <YStack flex={1} gap={2}>
                <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                  PACKAGE GROUP LOCKED
                </Text>
                <Text fontSize={11} color={tokens.text} lineHeight={16}>
                  {requiresLabel
                    ? 'Shipping label has been generated. This package is sealed for dispatch; items cannot be added or reassigned.'
                    : 'This package has reached Placed status. Items cannot be added or reassigned.'}
                </Text>
              </YStack>
            </XStack>
          )}

          {/* ── 1. Sequential Stage Progression Card ── */}
          <YStack
            backgroundColor={tokens.surface}
            borderWidth={1}
            borderColor={tokens.border}
            borderRadius={tokens.radius.md}
            padding={16}
            gap={14}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
                STAGE PROGRESSION (STEP-BY-STEP)
              </Text>
              <StatusBadge
                label={currentStage.toUpperCase()}
                intent={getStageIntent(currentStage)}
                size="md"
              />
            </XStack>

            {/* Step navigation buttons: Previous / Next */}
            <XStack gap={10} alignItems="center">
              {/* Previous Step */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Revert to ${prevStage}`}
                disabled={!prevStage}
                onPress={() => prevStage && handleStageTransition(prevStage)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 42,
                  borderRadius: tokens.radius.sm,
                  borderWidth: 1,
                  borderColor: prevStage ? tokens.border : `${tokens.border}40`,
                  backgroundColor: !prevStage ? `${tokens.surfaceRaised}50` : pressed ? `${tokens.text}10` : tokens.surfaceRaised,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  opacity: prevStage ? 1 : 0.4,
                })}
              >
                <LuArrowLeft size={16} color={prevStage ? tokens.text : tokens.textMuted} />
                <Text fontSize={12} fontWeight="700" color={prevStage ? tokens.text : tokens.textMuted}>
                  {prevStage ? prevStage : 'At Start'}
                </Text>
              </Pressable>

              {/* Next Step */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Advance to ${nextStage}`}
                disabled={!nextStage}
                onPress={() => nextStage && handleStageTransition(nextStage)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 42,
                  borderRadius: tokens.radius.sm,
                  backgroundColor: !nextStage
                    ? `${tokens.accent}40`
                    : (nextStage.toLowerCase() === 'placed' && requiresLabel && !hasLabel)
                    ? tokens.warning
                    : pressed
                    ? `${tokens.accent}D0`
                    : tokens.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  opacity: nextStage ? 1 : 0.4,
                })}
              >
                <Text
                  fontSize={12}
                  fontWeight="800"
                  color={tokens.accentForeground}
                  numberOfLines={1}
                >
                  {nextStage ? `Advance: ${nextStage}` : 'Completed'}
                </Text>
                <LuArrowRight size={16} color={tokens.accentForeground} />
              </Pressable>
            </XStack>

            {/* Interactive Timeline Stepper */}
            <YStack gap={8} paddingTop={6}>
              <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
                Select Stage (Adjacent Only):
              </Text>
              <XStack gap={6} flexWrap="wrap">
                {ORDER_STAGES.map((st, idx) => {
                  const isCurrent = idx === safeCurrentIndex;
                  const isAdjacent = Math.abs(idx - safeCurrentIndex) === 1;
                  const isPast = idx < safeCurrentIndex;

                  return (
                    <Pressable
                      key={st}
                      accessibilityRole="button"
                      onPress={() => handleStageTransition(st)}
                      disabled={isCurrent}
                      style={({ pressed }) => ({
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: tokens.radius.sm,
                        borderWidth: 1,
                        borderColor: isCurrent
                          ? tokens.accent
                          : isAdjacent
                          ? `${tokens.accent}60`
                          : tokens.border,
                        backgroundColor: isCurrent
                          ? `${tokens.accent}1F`
                          : isPast
                          ? `${tokens.success}14`
                          : isAdjacent
                          ? tokens.surfaceRaised
                          : `${tokens.surface}50`,
                        opacity: isCurrent ? 1 : isAdjacent ? (pressed ? 0.7 : 1) : 0.45,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                      })}
                    >
                      {isCurrent ? (
                        <LuCheck size={13} color={tokens.accent} />
                      ) : isPast ? (
                        <LuCheck size={13} color={tokens.success} />
                      ) : null}
                      <Text
                        fontSize={11}
                        fontWeight={isCurrent ? '800' : '600'}
                        color={isCurrent ? tokens.accent : isPast ? tokens.success : tokens.text}
                      >
                        {st}
                      </Text>
                    </Pressable>
                  );
                })}
              </XStack>
              <Text fontSize={10} color={tokens.textMuted} fontStyle="italic">
                * Note: Direct stage leaps are blocked. Packages must advance sequentially through each operational gate.
              </Text>
            </YStack>
          </YStack>

          {/* ── 2. Logistics & Shipping Label Section ── */}
          <YStack
            backgroundColor={tokens.surface}
            borderWidth={1}
            borderColor={tokens.border}
            borderRadius={tokens.radius.md}
            padding={16}
            gap={12}
          >
            <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
              DELHIVERY SHIPPING LABEL
            </Text>

            {requiresLabel ? (
              <YStack gap={10}>
                {awbNumber ? (
                  <XStack
                    backgroundColor={tokens.surfaceRaised}
                    padding={10}
                    borderRadius={tokens.radius.sm}
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <YStack gap={2}>
                      <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
                        AWB TRACKING NUMBER
                      </Text>
                      <Text fontSize={14} fontWeight="800" color={tokens.text}>
                        {awbNumber}
                      </Text>
                    </YStack>
                    <YStack paddingHorizontal={8} paddingVertical={3} borderRadius={4} backgroundColor={`${tokens.success}1F`}>
                      <Text fontSize={10} fontWeight="800" color={tokens.success}>
                        LABEL READY
                      </Text>
                    </YStack>
                  </XStack>
                ) : (
                  <Text fontSize={12} color={tokens.textSecondary}>
                    A shipping label is required before dispatching or marking as Placed.
                  </Text>
                )}

                <XStack gap={10}>
                  {labelUrl ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="View PDF shipping label"
                      onPress={() => onViewLabel?.(labelUrl)}
                      style={({ pressed }) => ({
                        flex: 1,
                        height: 42,
                        borderRadius: tokens.radius.sm,
                        backgroundColor: pressed ? `${tokens.success}D0` : tokens.success,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                      })}
                    >
                      <LuFileText size={16} color="#FFFFFF" />
                      <Text fontSize={12} fontWeight="800" color="#FFFFFF">
                        VIEW SHIPPING LABEL (PDF)
                      </Text>
                    </Pressable>
                  ) : onGenerateLabel ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Generate Delhivery shipping label"
                      onPress={onGenerateLabel}
                      style={({ pressed }) => ({
                        flex: 1,
                        height: 42,
                        borderRadius: tokens.radius.sm,
                        backgroundColor: pressed ? `${tokens.accent}D0` : tokens.accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                      })}
                    >
                      <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                        GENERATE DELHIVERY LABEL
                      </Text>
                    </Pressable>
                  ) : null}
                </XStack>
              </YStack>
            ) : (
              <XStack
                backgroundColor={tokens.surfaceRaised}
                padding={12}
                borderRadius={tokens.radius.sm}
                alignItems="center"
                gap={8}
              >
                <LuBuilding2 size={16} color={tokens.textMuted} />
                <Text fontSize={12} fontWeight="600" color={tokens.textMuted}>
                  Direct Vendor Fulfillment (No shipping label required)
                </Text>
              </XStack>
            )}
          </YStack>

          {/* ── 3. Items in Package Summary ── */}
          <YStack
            backgroundColor={tokens.surface}
            borderWidth={1}
            borderColor={tokens.border}
            borderRadius={tokens.radius.md}
            padding={16}
            gap={12}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
                PACKAGE ITEMS ({items.length})
              </Text>
              <Text fontSize={13} fontWeight="800" color={tokens.text}>
                Total: ₹{totalSubtotal.toLocaleString('en-IN')}
              </Text>
            </XStack>

            <YStack gap={8}>
              {items.map((it, idx) => {
                const photo = it.photoUri || it.catalogImageUrl || it.image;
                return (
                  <XStack
                    key={it.id || idx}
                    alignItems="center"
                    gap={10}
                    paddingVertical={4}
                    borderBottomWidth={idx < items.length - 1 ? 1 : 0}
                    borderBottomColor={tokens.border}
                  >
                    <YStack
                      width={44}
                      height={44}
                      borderRadius={tokens.radius.sm}
                      backgroundColor={tokens.surfaceRaised}
                      overflow="hidden"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {photo ? (
                        <Image source={{ uri: photo }} style={{ width: 44, height: 44 }} resizeMode="cover" />
                      ) : (
                        <LuBuilding2 size={18} color={tokens.textMuted} />
                      )}
                    </YStack>
                    <YStack flex={1} gap={2}>
                      <Text fontSize={12} fontWeight="700" color={tokens.text} numberOfLines={1}>
                        {it.title || 'Untitled Item'}
                      </Text>
                      <Text fontSize={11} color={tokens.textMuted}>
                        SKU: {it.productId || 'N/A'} • Qty: {it.quantity}
                      </Text>
                    </YStack>
                    <Text fontSize={13} fontWeight="800" color={tokens.text}>
                      ₹{((it.costPerPiece || 0) * (it.quantity || 1)).toLocaleString('en-IN')}
                    </Text>
                  </XStack>
                );
              })}
            </YStack>
          </YStack>

          {/* ── 4. Package Dispatch / Media Sharing ── */}
          {onShareGroup && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share package media and details"
              onPress={onShareGroup}
              style={({ pressed }) => ({
                height: 44,
                borderRadius: tokens.radius.sm,
                borderWidth: 1,
                borderColor: tokens.border,
                backgroundColor: pressed ? `${tokens.text}10` : tokens.surfaceRaised,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              })}
            >
              <LuShare2 size={16} color={tokens.text} />
              <Text fontSize={12} fontWeight="800" color={tokens.text}>
                SHARE PACKAGE MEDIA & DETAILS
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </YStack>
    </Modal>
  );
}
