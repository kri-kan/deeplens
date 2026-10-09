import React, { useState, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  Image,
  Alert,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuArrowRight,
  LuBuilding2,
  LuLock,
  LuShare2,
  LuFileText,
  LuCheck,
} from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { StatusBadge, StatusIntent } from '../../atoms/StatusBadge';
import { OrderItem } from '../ProductListSection';
import { StateTransitionGraph, StateTransitionRecord } from '../StateTransitionGraph';
import { AdjacentStageDropdown } from '../AdjacentStageDropdown';
import {
  ORDER_STAGES,
  canTransitionStage,
} from '@/utils/stageTransitionRules';

export interface GroupManagementViewProps {
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
  history?: StateTransitionRecord[];
  onUpdateStage: (newStage: string) => void;
  onSave?: (newStage: string) => Promise<void> | void;
  onGenerateLabel?: () => void;
  onViewLabel?: (url: string) => void;
  onShareGroup?: () => void;
  onBack: () => void;
}

export function GroupManagementView({
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
  history,
  onUpdateStage,
  onSave,
  onGenerateLabel,
  onViewLabel,
  onShareGroup,
  onBack,
}: GroupManagementViewProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  // Local staged stage state to support drafting and explicit Save action
  const [stagedStage, setStagedStage] = useState<string>(currentStage);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setStagedStage(currentStage);
  }, [currentStage]);

  const isDirty = (stagedStage || '').toLowerCase() !== (currentStage || '').toLowerCase();

  // Android hardware back button handler
  useEffect(() => {
    const onBackPress = () => {
      onBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onBack]);

  const getStageIntent = (stage: string): StatusIntent => {
    const s = (stage || '').toLowerCase();
    if (s === 'delivered') return 'positive';
    if (s === 'placed') return 'info';
    if (s === 'processed') return 'info';
    if (s === 'confirmed') return 'info';
    return 'attention';
  };

  const currentIndex = ORDER_STAGES.findIndex(
    (s) => s.toLowerCase() === (stagedStage || '').toLowerCase()
  );
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;

  const prevStage = safeCurrentIndex > 0 ? ORDER_STAGES[safeCurrentIndex - 1] : null;
  const nextStage =
    safeCurrentIndex < ORDER_STAGES.length - 1 ? ORDER_STAGES[safeCurrentIndex + 1] : null;

  const hasLabel = Boolean(labelUrl || awbNumber);
  const requiresLabel = Boolean(needLabel || isCod);

  const handleStageTransition = (targetStage: string) => {
    const check = canTransitionStage({
      currentStage: stagedStage,
      targetStage,
      requiresLabel,
      hasLabel,
    });

    if (check.allowed) {
      setStagedStage(targetStage);
      return;
    }

    if (check.reason === 'SAME_STAGE') {
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

  const handleSave = async () => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      if (onSave) {
        await onSave(stagedStage);
      } else {
        onUpdateStage(stagedStage);
        Alert.alert('Saved', `Package status set to ${stagedStage}.`);
      }
    } catch (err: any) {
      console.error('Failed to save group stage:', err);
      Alert.alert('Save Failed', err?.message || 'Could not update package stage.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalItemsCount = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const totalSubtotal = items.reduce((acc, it) => {
    const codCharge = isCod ? (it.codChargePerPiece ?? 50) : 0;
    const grossLineTotal = (it.quantity || 1) * ((it.costPerPiece || 0) + codCharge);
    const paidAmount = isCod ? (it.amountPaid || 0) : 0;
    return acc + Math.max(0, grossLineTotal - paidAmount);
  }, 0);

  return (
    <YStack flex={1} backgroundColor={tokens.background} paddingTop={insets.top}>
      {/* ── Top Navigation Bar with Back Button ── */}
      <XStack
        height={56}
        paddingHorizontal={16}
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        backgroundColor={tokens.surface}
      >
        <XStack alignItems="center" gap={12} flex={1}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Order Details"
            onPress={onBack}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: tokens.radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? `${tokens.text}10` : 'transparent',
            })}
          >
            <LuArrowLeft size={22} color={tokens.text} />
          </Pressable>

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
              {orderGrpId
                ? `${orderGrpId} • ${isUnassigned ? 'No Vendor' : vendorName}`
                : isUnassigned
                ? 'No Vendor'
                : `${vendorName} Package`}
            </Text>
            <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
              Order #{orderId} • {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} : ₹
              {totalSubtotal.toLocaleString('en-IN')}
            </Text>
          </YStack>
        </XStack>

        <StatusBadge
          label={stagedStage.toUpperCase()}
          intent={getStageIntent(stagedStage)}
          size="sm"
        />
      </XStack>

      {/* ── Scrollable Body ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: Math.max(90, insets.bottom + 80),
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── State Transition Progress Graph (Spans Screen End-to-End without side bounds) ── */}
        <YStack gap={8}>
          <Text
            fontSize={11}
            fontWeight="800"
            color={tokens.textMuted}
            textTransform="uppercase"
            letterSpacing={0.8}
          >
            STATUS TRANSITION TIMELINE GRAPH
          </Text>
          <YStack marginHorizontal={-16}>
            <StateTransitionGraph
              currentStage={stagedStage}
              history={history}
              containerHeight={76}
              fullBleed
            />
          </YStack>
        </YStack>

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

        {/* ── 1. Sequential Stage Progression Card with Adjacent-Only Dropdown ── */}
        <YStack
          backgroundColor={tokens.surface}
          borderWidth={1}
          borderColor={tokens.border}
          borderRadius={tokens.radius.md}
          padding={16}
          gap={14}
        >
          <XStack justifyContent="space-between" alignItems="center">
            <Text
              fontSize={11}
              fontWeight="800"
              color={tokens.textMuted}
              textTransform="uppercase"
              letterSpacing={0.8}
            >
              STAGE PROGRESSION (ADJACENT ONLY)
            </Text>
            <AdjacentStageDropdown
              currentStage={stagedStage}
              onSelectStage={handleStageTransition}
              requiresLabel={requiresLabel}
              hasLabel={hasLabel}
              size="sm"
            />
          </XStack>

          {/* Quick Step navigation buttons: Previous / Next */}
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
                backgroundColor: !prevStage
                  ? `${tokens.surfaceRaised}50`
                  : pressed
                  ? `${tokens.text}10`
                  : tokens.surfaceRaised,
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
                  : nextStage.toLowerCase() === 'placed' && requiresLabel && !hasLabel
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

          <Text fontSize={10} color={tokens.textMuted} fontStyle="italic">
            * Note: Direct stage leaps are blocked. Packages must advance sequentially through each operational gate.
          </Text>
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
          <Text
            fontSize={11}
            fontWeight="800"
            color={tokens.textMuted}
            textTransform="uppercase"
            letterSpacing={0.8}
          >
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
                    <Text
                      fontSize={10}
                      fontWeight="700"
                      color={tokens.textMuted}
                      textTransform="uppercase"
                    >
                      AWB TRACKING NUMBER
                    </Text>
                    <Text fontSize={14} fontWeight="800" color={tokens.text}>
                      {awbNumber}
                    </Text>
                  </YStack>
                  <YStack
                    paddingHorizontal={8}
                    paddingVertical={3}
                    borderRadius={4}
                    backgroundColor={`${tokens.success}1F`}
                  >
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
            <Text
              fontSize={11}
              fontWeight="800"
              color={tokens.textMuted}
              textTransform="uppercase"
              letterSpacing={0.8}
            >
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
                      <Image
                        source={{ uri: photo }}
                        style={{ width: 44, height: 44 }}
                        resizeMode="cover"
                      />
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

      {/* ── Sticky Bottom Action Bar with SAVE Button ── */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor={tokens.surface}
        borderTopWidth={1}
        borderTopColor={tokens.border}
        paddingHorizontal={16}
        paddingTop={12}
        paddingBottom={Math.max(12, insets.bottom + 8)}
        elevation={8}
        shadowColor="#000"
        shadowOffset={{ width: 0, height: -2 }}
        shadowOpacity={0.08}
        shadowRadius={4}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <YStack gap={2}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
              TARGET STAGE
            </Text>
            <XStack alignItems="center" gap={6}>
              <StatusBadge
                label={stagedStage.toUpperCase()}
                intent={getStageIntent(stagedStage)}
                size="sm"
              />
              {isDirty && (
                <XStack
                  backgroundColor={`${tokens.accent}1A`}
                  paddingHorizontal={6}
                  paddingVertical={2}
                  borderRadius={4}
                >
                  <Text fontSize={10} fontWeight="800" color={tokens.accent}>
                    UNSAVED
                  </Text>
                </XStack>
              )}
            </XStack>
          </YStack>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save group status changes"
            disabled={!isDirty || isSaving}
            onPress={handleSave}
            style={({ pressed }) => ({
              height: 42,
              paddingHorizontal: 22,
              borderRadius: tokens.radius.sm,
              backgroundColor: !isDirty
                ? `${tokens.textMuted}20`
                : pressed
                ? `${tokens.accent}D0`
                : tokens.accent,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              opacity: !isDirty ? 0.6 : 1,
            })}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={tokens.accentForeground} />
            ) : (
              <>
                <LuCheck size={16} color={!isDirty ? tokens.textMuted : tokens.accentForeground} />
                <Text
                  fontSize={13}
                  fontWeight="800"
                  color={!isDirty ? tokens.textMuted : tokens.accentForeground}
                  letterSpacing={0.5}
                >
                  SAVE
                </Text>
              </>
            )}
          </Pressable>
        </XStack>
      </YStack>
    </YStack>
  );
}
