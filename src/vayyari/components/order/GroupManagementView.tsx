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
  View,
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
  LuTruck,
} from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { StatusBadge, StatusIntent } from '@/components/tamagui-ui/atoms/StatusBadge';
import { OrderItem } from './ProductListSection';
import { StateTransitionGraph, StateTransitionRecord } from './StateTransitionGraph';
import { AdjacentStageDropdown } from './AdjacentStageDropdown';
import {
  ForwardOrderLabelModal,
  SubmittedForwardOrderAudit,
} from './ForwardOrderLabelModal';
import {
  ORDER_STAGES,
  canTransitionStage,
} from '@/utils/stageTransitionRules';
import { shareImageUri } from '@/utils/shareImage';
import { logisticsService } from '@/services/logistics.service';
import { searchApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { resolveLabelUrl } from '@/utils/api-config';

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
  onUpdateNeedLabel?: (needLabel: boolean) => void;
  onSave?: (newStage: string, needLabel?: boolean) => Promise<void> | void;
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
  onUpdateNeedLabel,
  onSave,
  onGenerateLabel,
  onViewLabel,
  onUpdateItem,
  onShareGroup,
  onBack,
}: GroupManagementViewProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  // Local staged stage and needLabel states
  const [stagedStage, setStagedStage] = useState<string>(currentStage);
  const [stagedNeedLabel, setStagedNeedLabel] = useState<boolean>(Boolean(needLabel));
  const [stagedAwb, setStagedAwb] = useState<string | undefined>(awbNumber);
  const [stagedLabelUrl, setStagedLabelUrl] = useState<string | undefined>(labelUrl);
  const [auditData, setAuditData] = useState<SubmittedForwardOrderAudit | null>(null);
  const [isForwardOrderModalOpen, setIsForwardOrderModalOpen] = useState(false);
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
    setStagedNeedLabel(Boolean(needLabel));
  }, [needLabel]);

  useEffect(() => {
    setStagedAwb(awbNumber);
    setStagedLabelUrl(labelUrl);
  }, [awbNumber, labelUrl]);

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
      const activeAwb = stagedAwb || awbNumber;
      const rawLabelUrl = stagedLabelUrl || labelUrl;
      const resolvedUrl = resolveLabelUrl(rawLabelUrl);

      const clipText = `Delhivery Shipping Label\nAWB: ${activeAwb || 'N/A'}\nPackage: ${orderGrpId || orderId}`;
      await Clipboard.setStringAsync(clipText);

      if (resolvedUrl) {
        await shareImageUri(resolvedUrl, `Shipping Label ${activeAwb || ''}`);
      }

      setShareConfirmTarget({
        type: 'label',
        title: `Delhivery Label (${activeAwb || 'AWB'})`,
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

  const hasLabel = Boolean(stagedLabelUrl);
  const requiresLabel = Boolean(stagedNeedLabel);
  const isDirty =
    (stagedStage || '').toLowerCase() !== (currentStage || '').toLowerCase() ||
    stagedNeedLabel !== Boolean(needLabel);

  const allMediaShared = groupItems.length > 0 && groupItems.every((it) => Boolean(it.isShared));
  const fulfillmentShared = stagedNeedLabel ? (hasLabel && isLabelShared) : isAddressShared;
  const isAllSharedAndSaved = allMediaShared && fulfillmentShared;
  const isPlacedStage = (stagedStage || '').toLowerCase() === 'placed';

  // Android hardware back button handler
  useEffect(() => {
    const onBackPress = () => {
      if (isForwardOrderModalOpen) {
        setIsForwardOrderModalOpen(false);
        return true;
      }
      onBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onBack, isForwardOrderModalOpen]);

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

  const handleForwardOrderSuccess = (data: {
    awbNumber: string;
    labelUrl: string;
    auditData: SubmittedForwardOrderAudit;
  }) => {
    setStagedAwb(data.awbNumber);
    setStagedLabelUrl(data.labelUrl);
    setAuditData(data.auditData);
    setStagedNeedLabel(true);
    onUpdateNeedLabel?.(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      if (onSave) {
        await onSave(stagedStage, stagedNeedLabel);
      } else {
        onUpdateStage(stagedStage);
        onUpdateNeedLabel?.(stagedNeedLabel);
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

  // Chunk items into triplets of 3 for 3-column flush gallery grid
  const itemTriplets: OrderItem[][] = [];
  for (let i = 0; i < groupItems.length; i += 3) {
    itemTriplets.push(groupItems.slice(i, i + 3));
  }

  // Dedicated Screen View for Forward Order / Delhivery Label Creation
  if (isForwardOrderModalOpen) {
    return (
      <ForwardOrderLabelModal
        visible={true}
        onDismiss={() => setIsForwardOrderModalOpen(false)}
        orderGrpId={orderGrpId || (orderId ? `${orderId}-${vendorName}` : 'GRP-1')}
        vendorName={vendorName}
        itemsCount={totalItemsCount}
        isCod={isCod}
        groupTotal={totalSubtotal}
        address={address}
        awbNumber={stagedAwb}
        labelUrl={stagedLabelUrl}
        initialAuditData={auditData}
        onSuccess={handleForwardOrderSuccess}
      />
    );
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

        {/* ── 1. Package Stage Dropdown & Need Label Toggle ── */}
        <YStack
          backgroundColor={tokens.surface}
          borderWidth={1}
          borderColor={tokens.border}
          borderRadius={tokens.radius.md}
          padding={12}
          gap={8}
        >
          <XStack justifyContent="space-between" alignItems="center" gap={12}>
            {/* Stage Dropdown (Adjacent Only: Previous & Next) */}
            <YStack flex={1} gap={4}>
              <Text
                fontSize={10}
                fontWeight="800"
                color={tokens.textMuted}
                textTransform="uppercase"
                letterSpacing={0.8}
              >
                STAGE PROGRESSION
              </Text>
              <AdjacentStageDropdown
                currentStage={stagedStage}
                onSelectStage={handleStageTransition}
                requiresLabel={requiresLabel}
                hasLabel={hasLabel}
                size="md"
              />
            </YStack>

            {/* Need Label Toggle beside Stage Dropdown */}
            <YStack alignItems="flex-end" gap={4}>
              <Text
                fontSize={10}
                fontWeight="800"
                color={tokens.textMuted}
                textTransform="uppercase"
                letterSpacing={0.8}
              >
                NEED LABEL
              </Text>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: stagedNeedLabel }}
                accessibilityLabel={`Need shipping label: ${stagedNeedLabel ? 'On' : 'Off'}`}
                onPress={() => {
                  if (stagedNeedLabel && (hasLabel || stagedAwb)) {
                    Alert.alert(
                      'Cancel Generated Shipping Label?',
                      `A Delhivery shipping label (${stagedAwb ? `AWB: ${stagedAwb}` : 'Generated'}) is active for this package.\n\nSwitching to direct vendor order will cancel the shipping label with Delhivery, hard delete the PDF attachment from storage, and retain the AWB submission record.\n\nDo you want to proceed with cancelling the shipping label?`,
                      [
                        { text: 'Keep Label', style: 'cancel' },
                        {
                          text: 'Cancel Label & Turn Off',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              if (orderGrpId) {
                                await logisticsService.cancelGroupLabel(orderGrpId, stagedAwb, 'Need Label toggled off');
                              } else if (stagedAwb) {
                                await logisticsService.cancelDelhiveryAwb(stagedAwb);
                              }
                              if (stagedLabelUrl && (stagedLabelUrl.includes('/api/v1/Attachment/') || stagedLabelUrl.includes('label'))) {
                                try {
                                  await searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(stagedLabelUrl));
                                  console.log('[GroupManagementView] Hard-deleted shipping label file from storage:', stagedLabelUrl);
                                } catch (delErr) {
                                  console.warn('Failed to hard delete label file asset:', delErr);
                                }
                              }
                            } catch (err) {
                              console.warn('Label cancellation error:', err);
                            } finally {
                              // Retain stagedAwb for audit! Clear PDF label and share state
                              setStagedLabelUrl(undefined);
                              setIsLabelShared(false);
                              setLabelSharedAt(null);
                              setStagedNeedLabel(false);
                              onUpdateNeedLabel?.(false);

                              Alert.alert(
                                'Label Cancelled',
                                `Shipping label PDF deleted from storage. Delhivery AWB (${stagedAwb || 'Recorded'}) retained in manifest audit log.`
                              );
                            }
                          },
                        },
                      ]
                    );
                  } else {
                    const nextVal = !stagedNeedLabel;
                    setStagedNeedLabel(nextVal);
                    onUpdateNeedLabel?.(nextVal);
                  }
                }}
                style={({ pressed }) => ({
                  height: 38,
                  paddingHorizontal: 12,
                  borderRadius: tokens.radius.sm,
                  borderWidth: 1.5,
                  borderColor: stagedNeedLabel ? tokens.accent : tokens.border,
                  backgroundColor: stagedNeedLabel ? `${tokens.accent}14` : tokens.surfaceRaised,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                {/* Switch track & thumb */}
                <View
                  style={{
                    width: 32,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: stagedNeedLabel ? tokens.accent : `${tokens.textMuted}40`,
                    padding: 2,
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: '#FFFFFF',
                      alignSelf: stagedNeedLabel ? 'flex-end' : 'flex-start',
                    }}
                  />
                </View>
                <Text
                  fontSize={11}
                  fontWeight="800"
                  color={stagedNeedLabel ? tokens.accent : tokens.textSecondary}
                >
                  {stagedNeedLabel ? 'YES' : 'NO'}
                </Text>
              </Pressable>
            </YStack>
          </XStack>
        </YStack>

        {/* ── 2. Package Items Gallery Grid ── */}
        <YStack
          backgroundColor={tokens.surface}
          borderWidth={1}
          borderColor={tokens.border}
          borderRadius={tokens.radius.md}
          overflow="hidden"
          padding={0}
        >
          {/* Section Header */}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            paddingHorizontal={12}
            paddingVertical={10}
            borderBottomWidth={1}
            borderBottomColor={tokens.border}
          >
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

          {/* 3-column flush gallery grid - Zero gaps between images and container box */}
          <YStack gap={0}>
            {itemTriplets.map((row, rowIdx) => (
              <XStack
                key={rowIdx}
                gap={0}
                borderBottomWidth={rowIdx < itemTriplets.length - 1 ? 1 : 0}
                borderBottomColor={tokens.border}
              >
                {row.map((it, colIdx) => {
                  const photo = it.photoUri || it.catalogImageUrl || it.image || it.imageUrl;
                  const hasSize = Boolean(it.size && !isFreeSize(it.size));
                  const isItemShared = Boolean(it.isShared);

                  return (
                    <YStack
                      key={it.id || it.productId || colIdx}
                      flex={1}
                      gap={0}
                      borderRightWidth={colIdx < 2 ? 1 : 0}
                      borderRightColor={tokens.border}
                    >
                      {/* Square Image-Focused Tile (Flush, Zero Gap) */}
                      <YStack
                        aspectRatio={1}
                        width="100%"
                        overflow="hidden"
                        backgroundColor={tokens.surfaceRaised}
                        position="relative"
                        borderWidth={isItemShared ? 2.5 : 0}
                        borderColor={isItemShared ? tokens.success : 'transparent'}
                      >
                        {photo ? (
                          <Image
                            source={{ uri: photo }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <YStack flex={1} alignItems="center" justifyContent="center">
                            <LuBuilding2 size={24} color={tokens.textMuted} />
                            <Text fontSize={9} color={tokens.textMuted} marginTop={2}>
                              No Image
                            </Text>
                          </YStack>
                        )}

                        {/* Centered Qty & Size Overlay (Large number, darker contrast border, stacked size if present) */}
                        <XStack
                          position="absolute"
                          top={0}
                          left={0}
                          right={0}
                          bottom={0}
                          alignItems="center"
                          justifyContent="center"
                          pointerEvents="none"
                        >
                          <YStack alignItems="center" justifyContent="center">
                            <Text
                              fontSize={32}
                              fontWeight="900"
                              color="rgba(255, 255, 255, 0.95)"
                              letterSpacing={0.5}
                              lineHeight={34}
                              style={{
                                textShadowColor: '#000000',
                                textShadowOffset: { width: 0, height: 1.5 },
                                textShadowRadius: 3,
                                ...(Platform.OS === 'web'
                                  ? {
                                      textShadow:
                                        '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 0 6px #000, 0 0 10px #000',
                                    }
                                  : {}),
                              }}
                            >
                              {it.quantity || 1}
                            </Text>
                            {hasSize && (
                              <Text
                                fontSize={15}
                                fontWeight="900"
                                color="rgba(252, 211, 77, 0.98)"
                                letterSpacing={0.5}
                                marginTop={1}
                                style={{
                                  textShadowColor: '#000000',
                                  textShadowOffset: { width: 0, height: 1.5 },
                                  textShadowRadius: 3,
                                  ...(Platform.OS === 'web'
                                    ? {
                                        textShadow:
                                          '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 0 5px #000',
                                      }
                                    : {}),
                                }}
                              >
                                {it.size}
                              </Text>
                            )}
                          </YStack>
                        </XStack>

                        {/* Top-Right Overlay Symbol: Image Preview (LuEye) */}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Preview item image"
                          onPress={() => photo && setPreviewModalImage({ uri: photo, title: it.title || it.productId })}
                          hitSlop={8}
                          style={({ pressed }) => ({
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            width: 26,
                            height: 26,
                            borderRadius: tokens.radius.full,
                            backgroundColor: pressed ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.55)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          })}
                        >
                          <LuEye size={14} color="#FFFFFF" />
                        </Pressable>

                        {/* Bottom Overlay: Shared Status & Price */}
                        <XStack
                          position="absolute"
                          bottom={4}
                          left={4}
                          right={4}
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          {isItemShared ? (
                            <XStack
                              backgroundColor={tokens.success}
                              paddingHorizontal={5}
                              paddingVertical={2}
                              borderRadius={3}
                              alignItems="center"
                              gap={2}
                            >
                              <LuCheck size={10} color="#FFFFFF" strokeWidth={3} />
                              <Text fontSize={8} fontWeight="900" color="#FFFFFF">
                                SHARED
                              </Text>
                            </XStack>
                          ) : (
                            <YStack />
                          )}
                          <XStack
                            backgroundColor="rgba(0,0,0,0.65)"
                            paddingHorizontal={5}
                            paddingVertical={2}
                            borderRadius={3}
                          >
                            <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                              ₹{((it.costPerPiece || 0) * (it.quantity || 1)).toLocaleString('en-IN')}
                            </Text>
                          </XStack>
                        </XStack>
                      </YStack>

                      {/* Dedicated Share Button Directly Below Tile */}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Share item ${it.title || it.productId}`}
                        onPress={() => handleShareItem(it)}
                        style={({ pressed }) => ({
                          height: 32,
                          backgroundColor: isItemShared
                            ? `${tokens.success}14`
                            : pressed
                            ? `${tokens.accent}20`
                            : tokens.surfaceRaised,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 4,
                          paddingHorizontal: 4,
                        })}
                      >
                        {isItemShared ? (
                          <>
                            <LuCheck size={12} color={tokens.success} strokeWidth={2.5} />
                            <Text fontSize={10} fontWeight="800" color={tokens.success} numberOfLines={1}>
                              SHARED ✓
                            </Text>
                          </>
                        ) : (
                          <>
                            <LuShare2 size={11} color={tokens.accent} />
                            <Text fontSize={10} fontWeight="800" color={tokens.accent} numberOfLines={1}>
                              SHARE
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </YStack>
                  );
                })}

                {/* Pad incomplete row so items retain exact 1/3 column width */}
                {Array.from({ length: 3 - row.length }).map((_, padIdx) => (
                  <YStack
                    key={`pad-${padIdx}`}
                    flex={1}
                    borderRightWidth={padIdx < 2 - row.length ? 1 : 0}
                    borderRightColor={tokens.border}
                  />
                ))}
              </XStack>
            ))}
          </YStack>
        </YStack>

        {/* ── 3. Fulfillment Row (Below Items): Dynamically decided by stagedNeedLabel ── */}
        {!stagedNeedLabel ? (
          /* ── Case A: NO LABEL NEEDED -> Address Share Card ── */
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
                CUSTOMER DELIVERY ADDRESS (DIRECT VENDOR)
              </Text>
              {Boolean(stagedAwb) && (
                <XStack
                  paddingHorizontal={8}
                  paddingVertical={3}
                  borderRadius={4}
                  backgroundColor={`${tokens.textMuted}20`}
                  borderWidth={1}
                  borderColor={`${tokens.textMuted}40`}
                  alignItems="center"
                  gap={4}
                >
                  <Text fontSize={10} fontWeight="800" color={tokens.textMuted}>
                    AWB: {stagedAwb}
                  </Text>
                  <Text fontSize={9} fontWeight="900" color={tokens.error}>
                    [CANCELLED]
                  </Text>
                  <Text fontSize={9} fontWeight="700" color={tokens.textMuted}>
                    (Manifest Retained)
                  </Text>
                </XStack>
              )}
            </XStack>

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
        ) : (
          /* ── Case B: NEED LABEL = TRUE -> Create Label Card or Label Ready Card ── */
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
                DELHIVERY LOGISTICS & SHIPPING LABEL
              </Text>
              {hasLabel && (
                <XStack
                  paddingHorizontal={8}
                  paddingVertical={2}
                  borderRadius={4}
                  backgroundColor={`${tokens.success}1F`}
                >
                  <Text
                    fontSize={10}
                    fontWeight="800"
                    color={tokens.success}
                  >
                    LABEL READY
                  </Text>
                </XStack>
              )}
            </XStack>

            {hasLabel ? (
              /* Label Ready: PDF Preview Tile with Overlaid AWB Badge */
              <YStack gap={8}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View shipping label and audit details"
                  onPress={() => setIsForwardOrderModalOpen(true)}
                >
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
                    <YStack alignItems="center" gap={6}>
                      <LuFileText size={38} color={tokens.accent} />
                      <Text fontSize={12} fontWeight="800" color={tokens.text}>
                        DELHIVERY SHIPPING LABEL (PDF)
                      </Text>
                      <Text fontSize={11} color={tokens.textMuted}>
                        Tap to view document & audit log
                      </Text>
                    </YStack>

                    {stagedAwb && (
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
                          {stagedAwb}
                        </Text>
                      </XStack>
                    )}

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="View PDF shipping label"
                      onPress={() => setIsForwardOrderModalOpen(true)}
                      hitSlop={8}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 32,
                        height: 32,
                        borderRadius: tokens.radius.full,
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <LuEye size={17} color="#FFFFFF" />
                    </Pressable>

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
                </Pressable>

                {/* Actions Row */}
                <XStack gap={8}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open forward order screen"
                    onPress={() => setIsForwardOrderModalOpen(true)}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 40,
                      borderRadius: tokens.radius.sm,
                      borderWidth: 1,
                      borderColor: tokens.border,
                      backgroundColor: pressed ? `${tokens.text}10` : tokens.surfaceRaised,
                      alignItems: 'center',
                      justifyContent: 'center',
                    })}
                  >
                    <Text fontSize={11} fontWeight="800" color={tokens.text}>
                      VIEW LABEL & AUDIT
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Share shipping label PDF"
                    onPress={handleShareLabel}
                    style={({ pressed }) => ({
                      flex: 1,
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
                    <LuShare2 size={13} color={isLabelShared ? tokens.success : tokens.accentForeground} />
                    <Text
                      fontSize={11}
                      fontWeight="800"
                      color={isLabelShared ? tokens.success : tokens.accentForeground}
                    >
                      {isLabelShared ? 'LABEL SHARED ✓' : 'SHARE LABEL'}
                    </Text>
                  </Pressable>
                </XStack>
              </YStack>
            ) : (
              /* Manifest Order Card: Big pressable box to open forward order / manifest modal */
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Manifest Order"
                onPress={() => setIsForwardOrderModalOpen(true)}
                style={({ pressed }) => ({
                  minHeight: 100,
                  paddingVertical: 20,
                  paddingHorizontal: 16,
                  borderRadius: tokens.radius.md,
                  borderWidth: 1.5,
                  borderColor: tokens.accent,
                  backgroundColor: pressed ? `${tokens.accent}24` : `${tokens.accent}14`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                })}
              >
                <XStack alignItems="center" gap={10}>
                  <LuFileText size={22} color={tokens.accent} />
                  <Text
                    fontSize={16}
                    fontWeight="900"
                    color={tokens.accent}
                    letterSpacing={0.8}
                    textTransform="uppercase"
                  >
                    MANIFEST ORDER
                  </Text>
                </XStack>
                <Text fontSize={11} fontWeight="600" color={tokens.textMuted} textAlign="center" lineHeight={16}>
                  Tap to configure package details & generate Delhivery Express shipping label
                </Text>
                {Boolean(stagedAwb) && (
                  <XStack
                    paddingHorizontal={8}
                    paddingVertical={3}
                    borderRadius={4}
                    backgroundColor={`${tokens.textMuted}14`}
                    alignItems="center"
                    gap={4}
                    marginTop={4}
                  >
                    <Text fontSize={10} fontWeight="700" color={tokens.textMuted}>
                      Previous AWB {stagedAwb} was cancelled. Tap to generate new shipping label.
                    </Text>
                  </XStack>
                )}
              </Pressable>
            )}
          </YStack>
        )}

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

      {/* ── Sticky Bottom Action Bar with SAVE & ORDER PLACED ── */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor={tokens.surface}
        borderTopWidth={1}
        borderTopColor={tokens.border}
        paddingHorizontal={12}
        paddingTop={10}
        paddingBottom={Math.max(10, insets.bottom + 6)}
        elevation={8}
        shadowColor="#000"
        shadowOffset={{ width: 0, height: -2 }}
        shadowOpacity={0.08}
        shadowRadius={4}
      >
        <XStack justifyContent="space-between" alignItems="center" gap={8}>
          {/* Left Side: Target Stage & Shifted SAVE Button */}
          <XStack alignItems="center" gap={8} flex={1}>
            <YStack gap={2}>
              <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
                TARGET STAGE
              </Text>
              <XStack alignItems="center" gap={4}>
                <StatusBadge
                  label={stagedStage.toUpperCase()}
                  intent={getStageIntent(stagedStage)}
                  size="sm"
                />
                {isDirty && (
                  <XStack
                    backgroundColor={`${tokens.accent}1A`}
                    paddingHorizontal={4}
                    paddingVertical={1}
                    borderRadius={3}
                  >
                    <Text fontSize={9} fontWeight="800" color={tokens.accent}>
                      UNSAVED
                    </Text>
                  </XStack>
                )}
              </XStack>
            </YStack>

            {/* Shifted SAVE Button on Left */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save group status changes"
              disabled={!isDirty || isSaving}
              onPress={handleSave}
              style={({ pressed }) => ({
                height: 38,
                paddingHorizontal: 12,
                borderRadius: tokens.radius.sm,
                borderWidth: 1,
                borderColor: isDirty ? tokens.accent : tokens.border,
                backgroundColor: !isDirty
                  ? `${tokens.textMuted}14`
                  : pressed
                  ? `${tokens.accent}20`
                  : tokens.surfaceRaised,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 5,
                opacity: !isDirty ? 0.6 : 1,
              })}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={tokens.accent} />
              ) : (
                <>
                  <LuCheck size={14} color={!isDirty ? tokens.textMuted : tokens.accent} />
                  <Text
                    fontSize={11}
                    fontWeight="800"
                    color={!isDirty ? tokens.textMuted : tokens.accent}
                    letterSpacing={0.5}
                  >
                    SAVE
                  </Text>
                </>
              )}
            </Pressable>
          </XStack>

          {/* Right Side: ORDER PLACED Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark package order as placed"
            disabled={isSaving}
            onPress={async () => {
              if (isPlacedStage) return;

              if (!isAllSharedAndSaved) {
                const missingText = [];
                if (!allMediaShared) missingText.push('all item media shared with vendor');
                if (!fulfillmentShared) missingText.push(stagedNeedLabel ? 'shipping label generated & shared' : 'delivery address shared with vendor');
                Alert.alert(
                  'Fulfillment Incomplete',
                  `To place package order, please ensure:\n• ${missingText.join('\n• ')}`
                );
                return;
              }

              try {
                setStagedStage('Placed');
                if (onSave) {
                  await onSave('Placed', stagedNeedLabel);
                } else {
                  onUpdateStage('Placed');
                  onUpdateNeedLabel?.(stagedNeedLabel);
                  Alert.alert('Order Placed', 'Package status set to PLACED.');
                }
              } catch (err: any) {
                Alert.alert('Placed Failed', err?.message || 'Could not update stage to Placed.');
              }
            }}
            style={({ pressed }) => ({
              height: 40,
              paddingHorizontal: 14,
              borderRadius: tokens.radius.sm,
              backgroundColor: isPlacedStage
                ? tokens.success
                : !isAllSharedAndSaved
                ? `${tokens.textMuted}25`
                : pressed
                ? `${tokens.accent}D0`
                : tokens.accent,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              opacity: !isAllSharedAndSaved && !isPlacedStage ? 0.6 : 1,
            })}
          >
            <LuCheck
              size={15}
              color={!isAllSharedAndSaved && !isPlacedStage ? tokens.textMuted : tokens.accentForeground}
              strokeWidth={2.5}
            />
            <Text
              fontSize={12}
              fontWeight="900"
              color={!isAllSharedAndSaved && !isPlacedStage ? tokens.textMuted : tokens.accentForeground}
              letterSpacing={0.5}
            >
              {isPlacedStage ? 'ORDER PLACED ✓' : 'ORDER PLACED'}
            </Text>
          </Pressable>
        </XStack>
      </YStack>
    </YStack>
  );
}
