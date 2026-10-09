import React, { useState, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  Image,
  Alert,
  BackHandler,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import * as Clipboard from 'expo-clipboard';
import {
  LuArrowLeft,
  LuArrowRight,
  LuBuilding2,
  LuLock,
  LuShare2,
  LuFileText,
  LuCheck,
  LuEye,
  LuMapPin,
  LuX,
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
import { shareImageUri } from '@/utils/shareImage';

export interface AddressData {
  name: string;
  phone: string;
  address: string;
  pincode: string;
  city?: string;
  state?: string;
  isDelhiveryServiceable?: boolean | null;
}

export function isFreeSize(size?: string | null): boolean {
  if (!size) return true;
  const s = size.trim().toLowerCase();
  return (
    s === '' ||
    s === 'free size' ||
    s === 'freesize' ||
    s === 'free' ||
    s === 'standard' ||
    s === 'na' ||
    s === 'n/a'
  );
}

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
  address?: AddressData | null;
  onUpdateStage: (newStage: string) => void;
  onSave?: (newStage: string) => Promise<void> | void;
  onGenerateLabel?: () => void;
  onViewLabel?: (url: string) => void;
  onUpdateItem?: (itemId: string, updates: Partial<OrderItem>) => void;
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
  address,
  onUpdateStage,
  onSave,
  onGenerateLabel,
  onViewLabel,
  onUpdateItem,
  onShareGroup,
  onBack,
}: GroupManagementViewProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  // Local staged stage state to support drafting and explicit Save action
  const [stagedStage, setStagedStage] = useState<string>(currentStage);
  const [isSaving, setIsSaving] = useState(false);

  // Gallery items and shared confirmation state
  const [groupItems, setGroupItems] = useState<OrderItem[]>(items);
  const [isLabelShared, setIsLabelShared] = useState(false);
  const [labelSharedAt, setLabelSharedAt] = useState<string | null>(null);
  const [isAddressShared, setIsAddressShared] = useState(false);
  const [addressSharedAt, setAddressSharedAt] = useState<string | null>(null);

  // Modals state: Image preview modal and Share confirmation modal
  const [previewModalImage, setPreviewModalImage] = useState<{ uri: string; title?: string } | null>(null);
  const [shareConfirmTarget, setShareConfirmTarget] = useState<{
    type: 'item' | 'label' | 'address';
    id?: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    setStagedStage(currentStage);
  }, [currentStage]);

  useEffect(() => {
    setGroupItems(items);
  }, [items]);

  // Share handlers
  const handleShareItem = async (item: OrderItem) => {
    try {
      // 1. Copy quantity, size, and SKU to clipboard
      let clipText = `Qty: ${item.quantity || 1}`;
      if (item.size && !isFreeSize(item.size)) {
        clipText += `\nSize: ${item.size}`;
      }
      if (item.productId && item.productId !== 'N/A') {
        clipText += `\nSKU: ${item.productId}`;
      }
      await Clipboard.setStringAsync(clipText);

      // 2. Open image for intent sharing
      const photo = item.photoUri || item.catalogImageUrl || item.image || item.imageUrl;
      if (photo) {
        await shareImageUri(photo, item.title || `Item ${item.productId}`);
      }

      // 3. Prompt user confirmation on return
      setShareConfirmTarget({
        type: 'item',
        id: item.id,
        title: item.title || item.productId || 'Item',
      });
    } catch (err) {
      console.warn('Item share error:', err);
    }
  };

  const handleShareLabel = async () => {
    try {
      const clipText = `Delhivery Shipping Label\nAWB: ${awbNumber || 'N/A'}\nPackage: ${orderGrpId || orderId}`;
      await Clipboard.setStringAsync(clipText);

      if (labelUrl) {
        await shareImageUri(labelUrl, `Shipping Label ${awbNumber || ''}`);
      }

      setShareConfirmTarget({
        type: 'label',
        title: `Delhivery Label (${awbNumber || 'AWB'})`,
      });
    } catch (err) {
      console.warn('Label share error:', err);
    }
  };

  const handleShareAddress = async () => {
    try {
      const clipText = [
        `Delivery Address:`,
        address?.name || 'Customer',
        address?.address || '',
        `PIN: ${address?.pincode || ''}`,
        `Phone: ${address?.phone || ''}`,
      ].filter(Boolean).join('\n');

      await Clipboard.setStringAsync(clipText);

      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && (navigator as any).share) {
          await (navigator as any).share({ title: 'Customer Delivery Address', text: clipText });
        }
      } else {
        try {
          const RNShare = require('react-native-share').default;
          await RNShare.open({ title: 'Customer Delivery Address', message: clipText, failOnCancel: false });
        } catch {}
      }

      setShareConfirmTarget({
        type: 'address',
        title: `Delivery Address (${address?.name || 'Customer'})`,
      });
    } catch (err) {
      console.warn('Address share error:', err);
    }
  };

  const handleConfirmShare = (target: { type: 'item' | 'label' | 'address'; id?: string; title: string }) => {
    const now = new Date().toISOString();
    if (target.type === 'item' && target.id) {
      setGroupItems((prev) =>
        prev.map((it) => (it.id === target.id ? { ...it, isShared: true, sharedAt: now } : it))
      );
      onUpdateItem?.(target.id, { isShared: true, sharedAt: now });
    } else if (target.type === 'label') {
      setIsLabelShared(true);
      setLabelSharedAt(now);
    } else if (target.type === 'address') {
      setIsAddressShared(true);
      setAddressSharedAt(now);
    }
    setShareConfirmTarget(null);
  };

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

  const totalItemsCount = groupItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const totalSubtotal = groupItems.reduce((acc, it) => {
    const codCharge = isCod ? (it.codChargePerPiece ?? 50) : 0;
    const grossLineTotal = (it.quantity || 1) * ((it.costPerPiece || 0) + codCharge);
    const paidAmount = isCod ? (it.amountPaid || 0) : 0;
    return acc + Math.max(0, grossLineTotal - paidAmount);
  }, 0);

  // Chunk items into pairs of 2 for square gallery grid
  const itemPairs: OrderItem[][] = [];
  for (let i = 0; i < groupItems.length; i += 2) {
    itemPairs.push(groupItems.slice(i, i + 2));
  }

  return (
    <YStack flex={1} backgroundColor={tokens.background} paddingTop={insets.top}>
      {/* ── Top Navigation Bar with Back Button ── */}
      <XStack
        height={56}
        paddingHorizontal={12}
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
          paddingHorizontal: 8,
          paddingTop: 10,
          paddingBottom: Math.max(90, insets.bottom + 80),
          gap: 10,
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
            paddingHorizontal={4}
          >
            STATUS TRANSITION TIMELINE GRAPH
          </Text>
          <YStack marginHorizontal={-8}>
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
            padding={10}
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
          padding={12}
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

        {/* ── 2. Package Items Gallery Grid ── */}
        <YStack
          backgroundColor={tokens.surface}
          borderWidth={1}
          borderColor={tokens.border}
          borderRadius={tokens.radius.md}
          padding={12}
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
              PACKAGE ITEMS ({totalItemsCount})
            </Text>
            <Text fontSize={13} fontWeight="800" color={tokens.text}>
              Total: ₹{totalSubtotal.toLocaleString('en-IN')}
            </Text>
          </XStack>

          {/* 2-column square gallery grid */}
          <YStack gap={14}>
            {itemPairs.map((pair, rowIdx) => (
              <XStack key={rowIdx} gap={12}>
                {pair.map((it) => {
                  const photo = it.photoUri || it.catalogImageUrl || it.image || it.imageUrl;
                  const hasSize = Boolean(it.size && !isFreeSize(it.size));
                  const isItemShared = Boolean(it.isShared);

                  return (
                    <YStack key={it.id || it.productId || rowIdx} flex={1} gap={8}>
                      {/* Square Image-Focused Tile */}
                      <YStack
                        aspectRatio={1}
                        width="100%"
                        borderRadius={tokens.radius.md}
                        overflow="hidden"
                        backgroundColor={tokens.surfaceRaised}
                        position="relative"
                        borderWidth={isItemShared ? 2.5 : 1}
                        borderColor={isItemShared ? tokens.success : tokens.border}
                      >
                        {photo ? (
                          <Image
                            source={{ uri: photo }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <YStack flex={1} alignItems="center" justifyContent="center">
                            <LuBuilding2 size={32} color={tokens.textMuted} />
                            <Text fontSize={10} color={tokens.textMuted} marginTop={4}>
                              No Image
                            </Text>
                          </YStack>
                        )}

                        {/* Top-Left Overlay Badge: Qty & Size (if present and not free size) */}
                        <XStack
                          position="absolute"
                          top={6}
                          left={6}
                          backgroundColor="rgba(0,0,0,0.72)"
                          paddingHorizontal={6}
                          paddingVertical={3}
                          borderRadius={tokens.radius.sm}
                          alignItems="center"
                          gap={4}
                        >
                          <Text fontSize={10} fontWeight="800" color="#FFFFFF">
                            QTY: {it.quantity || 1}
                          </Text>
                          {hasSize && (
                            <Text fontSize={10} fontWeight="800" color="#FCD34D">
                              • {it.size}
                            </Text>
                          )}
                        </XStack>

                        {/* Top-Right Overlay Symbol: Image Preview (LuEye) */}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Preview item image"
                          onPress={() => photo && setPreviewModalImage({ uri: photo, title: it.title || it.productId })}
                          hitSlop={8}
                          style={({ pressed }) => ({
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 28,
                            height: 28,
                            borderRadius: tokens.radius.full,
                            backgroundColor: pressed ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.72)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          })}
                        >
                          <LuEye size={15} color="#FFFFFF" />
                        </Pressable>

                        {/* Bottom Overlay: Shared Status Confirmation Badge & Price */}
                        <XStack
                          position="absolute"
                          bottom={6}
                          left={6}
                          right={6}
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          {isItemShared ? (
                            <XStack
                              backgroundColor={tokens.success}
                              paddingHorizontal={6}
                              paddingVertical={2}
                              borderRadius={4}
                              alignItems="center"
                              gap={3}
                            >
                              <LuCheck size={11} color="#FFFFFF" strokeWidth={3} />
                              <Text fontSize={9} fontWeight="900" color="#FFFFFF">
                                SHARED
                              </Text>
                            </XStack>
                          ) : (
                            <YStack />
                          )}
                          <XStack
                            backgroundColor="rgba(0,0,0,0.72)"
                            paddingHorizontal={6}
                            paddingVertical={2}
                            borderRadius={4}
                          >
                            <Text fontSize={10} fontWeight="800" color="#FFFFFF">
                              ₹{((it.costPerPiece || 0) * (it.quantity || 1)).toLocaleString('en-IN')}
                            </Text>
                          </XStack>
                        </XStack>
                      </YStack>

                      {/* Title & SKU */}
                      <YStack gap={1} paddingHorizontal={2}>
                        <Text fontSize={11} fontWeight="700" color={tokens.text} numberOfLines={1}>
                          {it.title || 'Untitled Item'}
                        </Text>
                        <Text fontSize={10} color={tokens.textMuted} numberOfLines={1}>
                          SKU: {it.productId || 'N/A'}
                        </Text>
                      </YStack>

                      {/* Dedicated Share Button Below Tile */}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Share item ${it.title || it.productId}`}
                        onPress={() => handleShareItem(it)}
                        style={({ pressed }) => ({
                          height: 36,
                          borderRadius: tokens.radius.sm,
                          backgroundColor: isItemShared
                            ? `${tokens.success}18`
                            : pressed
                            ? `${tokens.accent}D0`
                            : tokens.accent,
                          borderWidth: isItemShared ? 1 : 0,
                          borderColor: isItemShared ? tokens.success : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 6,
                        })}
                      >
                        {isItemShared ? (
                          <>
                            <LuCheck size={14} color={tokens.success} strokeWidth={2.5} />
                            <Text fontSize={11} fontWeight="800" color={tokens.success}>
                              SHARED ✓
                            </Text>
                          </>
                        ) : (
                          <>
                            <LuShare2 size={13} color={tokens.accentForeground} />
                            <Text fontSize={11} fontWeight="800" color={tokens.accentForeground}>
                              SHARE ITEM
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </YStack>
                  );
                })}
                {/* Spacer if odd number of items */}
                {pair.length === 1 && <YStack flex={1} />}
              </XStack>
            ))}
          </YStack>
        </YStack>

        {/* ── 3. Fulfillment Row (Below Items) ── */}
        <YStack
          backgroundColor={tokens.surface}
          borderWidth={1}
          borderColor={tokens.border}
          borderRadius={tokens.radius.md}
          padding={12}
          gap={10}
        >
          <XStack justifyContent="space-between" alignItems="center">
            <Text
              fontSize={11}
              fontWeight="800"
              color={tokens.textMuted}
              textTransform="uppercase"
              letterSpacing={0.8}
            >
              {requiresLabel ? 'SHIPPING LABEL & LOGISTICS' : 'DIRECT VENDOR FULFILLMENT'}
            </Text>
            {requiresLabel ? (
              hasLabel ? (
                <XStack
                  paddingHorizontal={8}
                  paddingVertical={2}
                  borderRadius={4}
                  backgroundColor={`${tokens.success}1F`}
                >
                  <Text fontSize={10} fontWeight="800" color={tokens.success}>
                    LABEL READY
                  </Text>
                </XStack>
              ) : (
                <XStack
                  paddingHorizontal={8}
                  paddingVertical={2}
                  borderRadius={4}
                  backgroundColor={`${tokens.warning}1F`}
                >
                  <Text fontSize={10} fontWeight="800" color={tokens.warning}>
                    LABEL NEEDED
                  </Text>
                </XStack>
              )
            ) : (
              <XStack
                paddingHorizontal={8}
                paddingVertical={2}
                borderRadius={4}
                backgroundColor={`${tokens.accent}1A`}
              >
                <Text fontSize={10} fontWeight="800" color={tokens.accent}>
                  NO LABEL REQUIRED
                </Text>
              </XStack>
            )}
          </XStack>

          {requiresLabel ? (
            hasLabel ? (
              /* PDF Preview Tile with Overlaid AWB Badge */
              <YStack gap={8}>
                <YStack
                  height={130}
                  borderRadius={tokens.radius.md}
                  backgroundColor={tokens.surfaceRaised}
                  borderWidth={isLabelShared ? 2.5 : 1}
                  borderColor={isLabelShared ? tokens.success : tokens.border}
                  overflow="hidden"
                  position="relative"
                  justifyContent="center"
                  alignItems="center"
                >
                  {/* PDF Document Preview Mockup */}
                  <YStack alignItems="center" gap={6}>
                    <LuFileText size={38} color={tokens.accent} />
                    <Text fontSize={12} fontWeight="800" color={tokens.text}>
                      DELHIVERY SHIPPING LABEL (PDF)
                    </Text>
                    <Text fontSize={11} color={tokens.textMuted}>
                      Click eye icon to view document
                    </Text>
                  </YStack>

                  {/* Overlaid AWB Tracking Badge on Top of Preview */}
                  {awbNumber && (
                    <XStack
                      position="absolute"
                      top={8}
                      left={8}
                      backgroundColor="rgba(0,0,0,0.75)"
                      paddingHorizontal={8}
                      paddingVertical={4}
                      borderRadius={tokens.radius.sm}
                      alignItems="center"
                      gap={4}
                    >
                      <Text fontSize={9} fontWeight="700" color="#94A3B8">
                        AWB:
                      </Text>
                      <Text fontSize={11} fontWeight="900" color="#FFFFFF">
                        {awbNumber}
                      </Text>
                    </XStack>
                  )}

                  {/* Top-Right Preview Symbol (LuEye) */}
                  {labelUrl && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="View PDF shipping label"
                      onPress={() => onViewLabel?.(labelUrl)}
                      hitSlop={8}
                      style={({ pressed }) => ({
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 32,
                        height: 32,
                        borderRadius: tokens.radius.full,
                        backgroundColor: pressed ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.75)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      })}
                    >
                      <LuEye size={17} color="#FFFFFF" />
                    </Pressable>
                  )}

                  {/* Bottom-Left Shared Confirmation Status */}
                  {isLabelShared && (
                    <XStack
                      position="absolute"
                      bottom={8}
                      left={8}
                      backgroundColor={tokens.success}
                      paddingHorizontal={6}
                      paddingVertical={2}
                      borderRadius={4}
                      alignItems="center"
                      gap={3}
                    >
                      <LuCheck size={11} color="#FFFFFF" strokeWidth={3} />
                      <Text fontSize={9} fontWeight="900" color="#FFFFFF">
                        LABEL SHARED
                      </Text>
                    </XStack>
                  )}
                </YStack>

                {/* Share Label Button Below Tile */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Share shipping label PDF"
                  onPress={handleShareLabel}
                  style={({ pressed }) => ({
                    height: 40,
                    borderRadius: tokens.radius.sm,
                    backgroundColor: isLabelShared
                      ? `${tokens.success}18`
                      : pressed
                      ? `${tokens.accent}D0`
                      : tokens.accent,
                    borderWidth: isLabelShared ? 1 : 0,
                    borderColor: isLabelShared ? tokens.success : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  })}
                >
                  {isLabelShared ? (
                    <>
                      <LuCheck size={15} color={tokens.success} strokeWidth={2.5} />
                      <Text fontSize={12} fontWeight="800" color={tokens.success}>
                        SHIPPING LABEL SHARED ✓
                      </Text>
                    </>
                  ) : (
                    <>
                      <LuShare2 size={14} color={tokens.accentForeground} />
                      <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                        SHARE SHIPPING LABEL
                      </Text>
                    </>
                  )}
                </Pressable>
              </YStack>
            ) : (
              /* Generate Delhivery Label Button */
              <YStack gap={8}>
                <Text fontSize={12} color={tokens.textSecondary}>
                  A Delhivery shipping label is required before advancing package to Placed.
                </Text>
                {onGenerateLabel && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Generate Delhivery shipping label"
                    onPress={onGenerateLabel}
                    style={({ pressed }) => ({
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
                )}
              </YStack>
            )
          ) : (
            /* Non-Label Order: Customer Delivery Address Preview Tile */
            <YStack gap={8}>
              <YStack
                borderRadius={tokens.radius.md}
                backgroundColor={tokens.surfaceRaised}
                borderWidth={isAddressShared ? 2.5 : 1}
                borderColor={isAddressShared ? tokens.success : tokens.border}
                padding={12}
                gap={8}
                position="relative"
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack alignItems="center" gap={6}>
                    <LuMapPin size={16} color={tokens.accent} />
                    <Text fontSize={12} fontWeight="800" color={tokens.text}>
                      {address?.name || 'Customer Delivery Address'}
                    </Text>
                  </XStack>
                  {isAddressShared && (
                    <XStack
                      backgroundColor={tokens.success}
                      paddingHorizontal={6}
                      paddingVertical={2}
                      borderRadius={4}
                      alignItems="center"
                      gap={3}
                    >
                      <LuCheck size={11} color="#FFFFFF" strokeWidth={3} />
                      <Text fontSize={9} fontWeight="900" color="#FFFFFF">
                        SHARED
                      </Text>
                    </XStack>
                  )}
                </XStack>

                {address?.phone && (
                  <Text fontSize={12} fontWeight="700" color={tokens.textSecondary}>
                    Phone: {address.phone}
                  </Text>
                )}

                <Text fontSize={12} color={tokens.text} lineHeight={18}>
                  {address?.address || 'No street address specified'}
                </Text>

                <Text fontSize={11} fontWeight="600" color={tokens.textMuted}>
                  {[address?.city, address?.state, address?.pincode].filter(Boolean).join(', ') ||
                    'City / State / Pincode not set'}
                </Text>
              </YStack>

              {/* Share Address Button Below Tile */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share customer delivery address"
                onPress={handleShareAddress}
                style={({ pressed }) => ({
                  height: 40,
                  borderRadius: tokens.radius.sm,
                  backgroundColor: isAddressShared
                    ? `${tokens.success}18`
                    : pressed
                    ? `${tokens.accent}D0`
                    : tokens.accent,
                  borderWidth: isAddressShared ? 1 : 0,
                  borderColor: isAddressShared ? tokens.success : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                })}
              >
                {isAddressShared ? (
                  <>
                    <LuCheck size={15} color={tokens.success} strokeWidth={2.5} />
                    <Text fontSize={12} fontWeight="800" color={tokens.success}>
                      DELIVERY ADDRESS SHARED ✓
                    </Text>
                  </>
                ) : (
                  <>
                    <LuShare2 size={14} color={tokens.accentForeground} />
                    <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                      SHARE DELIVERY ADDRESS
                    </Text>
                  </>
                )}
              </Pressable>
            </YStack>
          )}
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

      {/* ── Image Viewer Modal ── */}
      <Modal
        visible={Boolean(previewModalImage)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewModalImage(null)}
      >
        <YStack
          flex={1}
          backgroundColor="rgba(0,0,0,0.92)"
          justifyContent="center"
          alignItems="center"
          padding={16}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close image preview"
            onPress={() => setPreviewModalImage(null)}
            style={{
              position: 'absolute',
              top: Math.max(20, insets.top + 10),
              right: 16,
              zIndex: 10,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LuX size={24} color="#FFFFFF" />
          </Pressable>

          {previewModalImage?.title && (
            <Text
              position="absolute"
              top={Math.max(26, insets.top + 16)}
              left={20}
              right={68}
              fontSize={14}
              fontWeight="700"
              color="#FFFFFF"
              numberOfLines={1}
            >
              {previewModalImage.title}
            </Text>
          )}

          {previewModalImage?.uri && (
            <Image
              source={{ uri: previewModalImage.uri }}
              style={{ width: '100%', height: '80%' }}
              resizeMode="contain"
            />
          )}
        </YStack>
      </Modal>

      {/* ── Vendor Share Confirmation Modal ── */}
      <Modal
        visible={Boolean(shareConfirmTarget)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShareConfirmTarget(null)}
      >
        <YStack
          flex={1}
          backgroundColor="rgba(0,0,0,0.6)"
          justifyContent="center"
          alignItems="center"
          padding={20}
        >
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.lg}
            borderWidth={1}
            borderColor={tokens.border}
            padding={20}
            width="100%"
            maxWidth={400}
            gap={16}
            elevation={10}
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.2}
            shadowRadius={8}
          >
            <XStack alignItems="center" gap={10}>
              <XStack
                width={36}
                height={36}
                borderRadius={18}
                backgroundColor={`${tokens.success}1A`}
                alignItems="center"
                justifyContent="center"
              >
                <LuCheck size={20} color={tokens.success} />
              </XStack>
              <YStack flex={1}>
                <Text fontSize={15} fontWeight="800" color={tokens.text}>
                  Confirm Vendor Share
                </Text>
                <Text fontSize={11} color={tokens.textMuted}>
                  Vendor Order Dispatch Verification
                </Text>
              </YStack>
            </XStack>

            <Text fontSize={13} color={tokens.textSecondary} lineHeight={20}>
              Were the details for{' '}
              <Text fontSize={13} fontWeight="700" color={tokens.text}>
                "{shareConfirmTarget?.title}"
              </Text>{' '}
              shared with the vendor for order placing?
            </Text>

            <XStack gap={10} marginTop={4}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel share confirmation"
                onPress={() => setShareConfirmTarget(null)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 42,
                  borderRadius: tokens.radius.sm,
                  backgroundColor: pressed ? `${tokens.text}10` : tokens.surfaceRaised,
                  borderWidth: 1,
                  borderColor: tokens.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Text fontSize={13} fontWeight="700" color={tokens.textSecondary}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm vendor shared"
                onPress={() => shareConfirmTarget && handleConfirmShare(shareConfirmTarget)}
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
                <LuCheck size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text fontSize={13} fontWeight="800" color="#FFFFFF">
                  Confirm
                </Text>
              </Pressable>
            </XStack>
          </YStack>
        </YStack>
      </Modal>

      {/* ── Sticky Bottom Action Bar with SAVE Button ── */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor={tokens.surface}
        borderTopWidth={1}
        borderTopColor={tokens.border}
        paddingHorizontal={12}
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
