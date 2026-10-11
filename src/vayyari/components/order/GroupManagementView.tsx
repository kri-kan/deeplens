import React, { useState, useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  Image,
  BackHandler,
  ActivityIndicator,
  Modal,
  Platform,
  View,
  Linking,
  Alert,
  Share,
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
  LuTrash2,
  LuCheckCircle2,
  LuTriangleAlert,
  LuInfo,
  LuExternalLink,
  LuChevronDown,
  LuChevronUp,
  LuClock,
  LuRefreshCw,
  LuPencil,
  LuCalendar,
} from '@/components/tamagui-ui/icons/lu';
import { ConfirmDialog } from '@/components/tamagui-ui/molecules/ConfirmDialog';
import { SchedulePickupModal } from './SchedulePickupModal';
import { useTheme } from '@/theme';
import { StatusBadge, StatusIntent } from '@/components/tamagui-ui/atoms/StatusBadge';
import { OrderItem } from './ProductListSection';
import { ProductEditSheet } from './ProductEditSheet';
import { StateTransitionGraph, StateTransitionRecord } from './StateTransitionGraph';
import { AdjacentStageDropdown } from './AdjacentStageDropdown';
import {
  ForwardOrderLabelModal,
  SubmittedForwardOrderAudit,
} from './ForwardOrderLabelModal';
import {
  ORDER_STAGES,
  canTransitionStage,
  isGroupSharingEnabled,
} from '@/utils/stageTransitionRules';
import { shareImageUri } from '@/utils/shareImage';
import {
  buildShippingLabelFileName,
  resolveWarehouseAlias,
} from '@/utils/shipping-label-helpers';
import { logisticsService } from '@/services/logistics.service';
import { searchApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { resolveLabelUrl, resolveLabelImageUrl } from '@/utils/api-config';
import { GroupShipmentHistoryItem } from '@/types/logistics';

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

import { formatItemPriceEquation } from '@/utils/price-equation';
export { formatItemPriceEquation };

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
  orderType?: string;
  resellerName?: string;
  shipmentHistory?: GroupShipmentHistoryItem[];
  onUpdateStage: (newStage: string) => void;
  onUpdateNeedLabel?: (needLabel: boolean, labelInfo?: { awbNumber?: string; labelUrl?: string }) => void;
  onSave?: (newStage: string, needLabel?: boolean) => Promise<void> | void;
  onGenerateLabel?: () => void;
  onViewLabel?: (url: string) => void;
  onUpdateItem?: (itemId: string, updates: Partial<OrderItem>) => void;
  onEditItem?: (item: OrderItem) => void;
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
  orderType,
  resellerName,
  shipmentHistory,
  onUpdateStage,
  onUpdateNeedLabel,
  onSave,
  onGenerateLabel,
  onViewLabel,
  onUpdateItem,
  onEditItem,
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
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [shipmentHistories, setShipmentHistories] = useState<GroupShipmentHistoryItem[]>(shipmentHistory || []);
  const [expandedHistoryAwbs, setExpandedHistoryAwbs] = useState<Record<string, boolean>>({});
  const [scheduledPickupInfo, setScheduledPickupInfo] = useState<{
    pickupDate: string;
    pickupTime: string;
    pickupId?: string;
    displayInfo: string;
    statusText?: string;
  } | null>(null);
  const [pickupFacilityName, setPickupFacilityName] = useState<string>('');
  const [isRefreshingPickup, setIsRefreshingPickup] = useState(false);
  const [tilePreviewImageLoading, setTilePreviewImageLoading] = useState(true);
  const [tilePreviewImageError, setTilePreviewImageError] = useState(false);

  // Modern Design System Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    intent?: 'critical' | 'attention' | 'info' | 'success';
    icon?: React.ReactNode;
    singleButton?: boolean;
    onConfirm?: () => Promise<void> | void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  // Gallery items and shared confirmation state
  const [groupItems, setGroupItems] = useState<OrderItem[]>(items);
  const [isLabelShared, setIsLabelShared] = useState(false);
  const [labelSharedAt, setLabelSharedAt] = useState<string | null>(null);
  const [isAddressShared, setIsAddressShared] = useState(false);
  const [addressSharedAt, setAddressSharedAt] = useState<string | null>(null);

  // Sharing is only enabled once the group has moved to Confirmed or later stages
  const isSharingEnabled = isGroupSharingEnabled(stagedStage);
  const isUnconfirmedStage =
    (stagedStage || '').toLowerCase() === 'unconfirmed' ||
    (stagedStage || '').toLowerCase() === 'unformed';

  const resetAllSharedStatuses = () => {
    setGroupItems((prev) =>
      prev.map((it) => {
        if (it.isShared) {
          onUpdateItem?.(it.id, { isShared: false, sharedAt: undefined });
        }
        return { ...it, isShared: false, sharedAt: undefined };
      })
    );
    setIsLabelShared(false);
    setLabelSharedAt(null);
    setIsAddressShared(false);
    setAddressSharedAt(null);
  };

  const resetAddressAndLabelSharedStatuses = () => {
    setIsLabelShared(false);
    setLabelSharedAt(null);
    setIsAddressShared(false);
    setAddressSharedAt(null);
  };

  // Modals state: Image preview modal and Share confirmation modal
  const [warehouseAlias, setWarehouseAlias] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    resolveWarehouseAlias(vendorName, auditData).then((alias) => {
      if (isMounted && alias) {
        setWarehouseAlias(alias);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [vendorName, auditData]);
  const [previewModalImage, setPreviewModalImage] = useState<{ uri: string; title?: string } | null>(null);
  const [shareConfirmTarget, setShareConfirmTarget] = useState<{
    type: 'item' | 'label' | 'address';
    id?: string;
    title: string;
  } | null>(null);

  const prevStageRef = useRef(currentStage);
  useEffect(() => {
    setStagedStage(currentStage);
    const wasPlaced = (prevStageRef.current || '').toLowerCase() === 'placed';
    const isNowConfirmed = (currentStage || '').toLowerCase() === 'confirmed';
    if (
      (!isGroupSharingEnabled(currentStage) && isGroupSharingEnabled(prevStageRef.current)) ||
      (wasPlaced && isNowConfirmed)
    ) {
      resetAllSharedStatuses();
    }
    prevStageRef.current = currentStage;
  }, [currentStage]);

  const prevNeedLabelRef = useRef(needLabel);
  useEffect(() => {
    const currentNeed = Boolean(needLabel);
    if (prevNeedLabelRef.current !== undefined && prevNeedLabelRef.current !== currentNeed) {
      resetAddressAndLabelSharedStatuses();
    }
    prevNeedLabelRef.current = currentNeed;
    setStagedNeedLabel(currentNeed);
  }, [needLabel]);

  useEffect(() => {
    setStagedAwb(awbNumber);
    setStagedLabelUrl(labelUrl);
    setTilePreviewImageLoading(true);
    setTilePreviewImageError(false);
  }, [awbNumber, labelUrl]);

  useEffect(() => {
    setGroupItems(
      !isGroupSharingEnabled(stagedStage)
        ? items.map((it) => ({ ...it, isShared: false, sharedAt: undefined }))
        : items
    );
  }, [items, stagedStage]);

  useEffect(() => {
    if (shipmentHistory && shipmentHistory.length > 0) {
      setShipmentHistories(shipmentHistory);
    }
  }, [shipmentHistory]);

  const updatePickupFromShipments = (shipments: GroupShipmentHistoryItem[], currentAwb?: string) => {
    if (!shipments || shipments.length === 0) {
      setScheduledPickupInfo(null);
      return;
    }
    const targetAwb = currentAwb || stagedAwb || awbNumber;
    const matched = targetAwb
      ? shipments.find((s) => s.awbNumber === targetAwb && s.status !== 'cancelled')
      : shipments.find((s) => s.status !== 'cancelled');

    const meta = matched?.metadata;
    if (meta) {
      const registeredLoc = meta.pickupLocation || meta.pickup_location || meta.pickupFacility?.name || '';
      if (registeredLoc) {
        setPickupFacilityName(registeredLoc);
      }
    }

    if (meta && (meta.pickup_scheduled_date || meta.pickup_id)) {
      const pDate = meta.pickup_scheduled_date || '';
      const pTime = meta.pickup_slot || meta.pickup_scheduled_time || '';
      const pId = meta.pickup_id || '';
      setScheduledPickupInfo({
        pickupDate: pDate,
        pickupTime: pTime,
        pickupId: pId ? String(pId) : undefined,
        displayInfo: pDate && pTime ? `${pDate} • ${pTime}` : (pDate || pTime || 'Scheduled'),
        statusText: 'PICKUP SCHEDULED',
      });
    } else {
      setScheduledPickupInfo(null);
    }
  };

  useEffect(() => {
    if (shipmentHistories && shipmentHistories.length > 0) {
      updatePickupFromShipments(shipmentHistories, stagedAwb || awbNumber);
    } else {
      setScheduledPickupInfo(null);
    }
  }, [shipmentHistories, stagedAwb, awbNumber]);

  const [showSchedulePickup, setShowSchedulePickup] = useState(false);

  const handleRefreshPickup = async () => {
    if (!orderGrpId) return;
    try {
      setIsRefreshingPickup(true);
      const data = await logisticsService.syncGroupShipments(orderGrpId, stagedAwb || awbNumber);
      if (data && data.length > 0) {
        setShipmentHistories(data);
        updatePickupFromShipments(data, stagedAwb || awbNumber);
        const targetAwb = stagedAwb || awbNumber;
        const matched = targetAwb
          ? data.find((s) => s.awbNumber === targetAwb && s.status !== 'cancelled')
          : data.find((s) => s.status !== 'cancelled');
        const syncStatus = matched?.metadata?.last_sync_status || matched?.status || 'Manifested';
        const syncInst = matched?.metadata?.last_sync_instruction || '';
        const pickupDate = matched?.metadata?.pickup_scheduled_date;
        const pickupId = matched?.metadata?.pickup_id;

        if (pickupDate || pickupId) {
          setConfirmDialog({
            visible: true,
            title: 'Carrier Status Refreshed',
            message: `Live Delhivery tracking synced successfully.\n\nPackage Status: ${syncStatus}${syncInst ? `\nDetails: ${syncInst}` : ''}\nPickup Appointment: Scheduled for ${pickupDate}${pickupId ? ` (ID: ${pickupId})` : ''}`,
            confirmLabel: 'OK',
            intent: 'info',
            icon: <LuCheckCircle2 size={20} color={tokens.accent} />,
            singleButton: true,
            onConfirm: () => setConfirmDialog((prev) => ({ ...prev, visible: false })),
          });
        } else {
          setConfirmDialog({
            visible: true,
            title: 'Carrier Status Refreshed',
            message: `Live Delhivery tracking synced successfully.\n\nPackage Status: ${syncStatus}${syncInst ? `\nDetails: ${syncInst}` : ''}\nPickup Status: Ready to Ship (No active pickup scheduled on carrier).\n\nWould you like to schedule a pickup now?`,
            confirmLabel: 'Schedule Pickup',
            cancelLabel: 'Close',
            intent: 'attention',
            icon: <LuCalendar size={20} color={tokens.accent} />,
            singleButton: false,
            onConfirm: () => {
              setConfirmDialog((prev) => ({ ...prev, visible: false }));
              setShowSchedulePickup(true);
            },
            onCancel: () => setConfirmDialog((prev) => ({ ...prev, visible: false })),
          });
        }
      } else {
        setScheduledPickupInfo(null);
      }
    } catch (err: any) {
      console.warn('Failed to refresh pickup status:', err);
      setConfirmDialog({
        visible: true,
        title: 'Sync Failed',
        message: err?.message || 'Unable to refresh carrier tracking.',
        confirmLabel: 'OK',
        intent: 'critical',
        icon: <LuTriangleAlert size={20} color={tokens.error} />,
        singleButton: true,
        onConfirm: () => setConfirmDialog((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setIsRefreshingPickup(false);
    }
  };

  const handleClearPickup = async () => {
    if (!orderGrpId) return;
    setConfirmDialog({
      visible: true,
      title: 'Reset Pickup Schedule?',
      message: 'This will clear the scheduled pickup record for this package so you can schedule a new pickup time or date with Delhivery.\n\nDo you want to proceed?',
      confirmLabel: 'Clear Pickup',
      cancelLabel: 'Keep Schedule',
      intent: 'attention',
      icon: <LuTriangleAlert size={20} color={tokens.warning} />,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, visible: false }));
        try {
          const res = await logisticsService.resetGroupPickup(orderGrpId, stagedAwb || awbNumber);
          if (res && res.shipments) {
            setShipmentHistories(res.shipments);
            updatePickupFromShipments(res.shipments, stagedAwb || awbNumber);
          } else {
            setScheduledPickupInfo(null);
          }
          setConfirmDialog({
            visible: true,
            title: 'Pickup Cleared',
            message: 'Pickup schedule has been cleared. You can now schedule a new pickup window.',
            confirmLabel: 'Schedule Now',
            cancelLabel: 'Close',
            intent: 'success',
            icon: <LuCheckCircle2 size={20} color={tokens.success} />,
            onConfirm: () => {
              setConfirmDialog((prev) => ({ ...prev, visible: false }));
              setShowSchedulePickup(true);
            },
            onCancel: () => setConfirmDialog((prev) => ({ ...prev, visible: false })),
          });
        } catch (err: any) {
          console.warn('Failed to clear pickup schedule:', err);
        }
      },
    });
  };

  useEffect(() => {
    let isMounted = true;
    if (orderGrpId) {
      logisticsService.getGroupShipments(orderGrpId).then((data) => {
        if (isMounted && data && data.length > 0) {
          setShipmentHistories(data);
          updatePickupFromShipments(data, stagedAwb || awbNumber);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [orderGrpId, stagedAwb, awbNumber]);

  // Share handlers
  const handleShareItem = async (item: OrderItem) => {
    if (!isSharingEnabled) return;
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
    if (!isSharingEnabled) return;
    try {
      if (!hasLabel || !stagedLabelUrl) {
        setConfirmDialog({
          visible: true,
          title: 'No Label Document',
          message: 'No active shipping label is attached to this package. Please generate a shipping label first.',
          confirmLabel: 'OK',
          intent: 'attention',
          singleButton: true,
          onConfirm: () => setConfirmDialog((prev) => ({ ...prev, visible: false })),
        });
        return;
      }

      const activeAwb = (stagedAwb || awbNumber || '').trim();
      const rawLabelUrl = stagedLabelUrl || labelUrl;
      const resolvedUrl = resolveLabelUrl(rawLabelUrl);

      // 1. Copy Order ID directly to clipboard so user can paste it when sharing label
      const idToCopy = (orderId || orderGrpId || '').trim();
      if (idToCopy) {
        await Clipboard.setStringAsync(idToCopy);
      }

      // 2. Resolve filename as "warehouse alias" + "customer name"
      const whAlias =
        warehouseAlias ||
        auditData?.pickupFacility?.alias ||
        (await resolveWarehouseAlias(vendorName, auditData));
      const custName = auditData?.recipient?.name || address?.name || '';
      const customFilename = buildShippingLabelFileName(whAlias, custName, activeAwb);

      if (resolvedUrl) {
        await shareImageUri(resolvedUrl, customFilename, customFilename);
      }

      setShareConfirmTarget({
        type: 'label',
        title: customFilename,
      });
    } catch (err) {
      console.warn('Label share error:', err);
    }
  };

  const handleShareAddress = async () => {
    if (!isSharingEnabled) return;
    try {
      const addressLines = [
        `Delivery Address:`,
        address?.name || 'Customer',
        address?.address || '',
        `PIN: ${address?.pincode || ''}`,
        `Phone: ${address?.phone || ''}`,
      ].filter(Boolean);

      const resolvedOrderGrpId = (orderGrpId || (orderId ? `${orderId}-${vendorName}` : '')).trim();
      if (resolvedOrderGrpId) {
        addressLines.push(`Order Group ID: ${resolvedOrderGrpId}`);
      }

      const clipText = addressLines.join('\n');

      await Clipboard.setStringAsync(clipText);

      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && (navigator as any).share) {
          await (navigator as any).share({ title: 'Customer Delivery Address', text: clipText });
        }
      } else {
        try {
          await Share.share({ title: 'Customer Delivery Address', message: clipText });
        } catch {
          try {
            const RNShare = require('react-native-share').default;
            await RNShare.open({ title: 'Customer Delivery Address', message: clipText, failOnCancel: false });
          } catch {}
        }
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
    if (!isSharingEnabled) {
      setShareConfirmTarget(null);
      return;
    }
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

  // Active AWB for this group (from staged state or prop)
  const activeAwbClean = (stagedAwb || awbNumber || '').trim().toLowerCase();

  // History should strictly display earlier cancelled waybill records, excluding active label's record
  const cancelledShipmentHistories = shipmentHistories.filter((hist) => {
    const isCancelled = (hist.status || '').toLowerCase() === 'cancelled' || Boolean(hist.metadata?.cancelled_at);
    const isActiveAwb = Boolean(activeAwbClean) && (hist.awbNumber || '').trim().toLowerCase() === activeAwbClean;
    return isCancelled && !isActiveAwb;
  });

  const isCurrentAwbCancelled = Boolean(activeAwbClean) && shipmentHistories.some((hist) => {
    const matchAwb = (hist.awbNumber || '').trim().toLowerCase() === activeAwbClean;
    const isCancelled = (hist.status || '').toLowerCase() === 'cancelled' || Boolean(hist.metadata?.cancelled_at);
    return matchAwb && isCancelled;
  });

  const hasLabel = Boolean(stagedLabelUrl) && !isCurrentAwbCancelled;
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
      const wasPlaced = (stagedStage || '').toLowerCase() === 'placed';
      const isNowConfirmed = targetStage.toLowerCase() === 'confirmed';
      const isNowUnconfirmed = targetStage.toLowerCase() === 'unconfirmed';

      if (isNowUnconfirmed && hasLabel) {
        const currentAwb = stagedAwb || awbNumber;
        setConfirmDialog({
          visible: true,
          title: 'Cancel Shipping Label?',
          message: `A Delhivery shipping label (${currentAwb ? `AWB: ${currentAwb}` : 'active'}) is assigned to this package.\n\nMoving to Unconfirmed allows editing items, but will cancel the shipment with Delhivery and remove the shipping label.\n\nDo you want to proceed?`,
          confirmLabel: 'Cancel Label & Move',
          cancelLabel: 'Keep Current Stage',
          intent: 'attention',
          icon: <LuTriangleAlert size={20} color={tokens.warning} />,
          onConfirm: async () => {
            setConfirmDialog((prev) => ({ ...prev, visible: false }));
            if (orderGrpId && currentAwb) {
              try {
                await logisticsService.cancelGroupLabel(orderGrpId, currentAwb, 'Package moved to Unconfirmed');
                await logisticsService.cancelDelhiveryAwb(currentAwb).catch(console.warn);
              } catch (err) {
                console.warn('[GroupManagementView] Failed cancelling label on move to unconfirmed:', err);
              }
            }
            setStagedAwb(undefined);
            setStagedLabelUrl(undefined);
            onUpdateNeedLabel?.(stagedNeedLabel, { awbNumber: undefined, labelUrl: undefined });
            setStagedStage('Unconfirmed');
            resetAllSharedStatuses();
          },
        });
        return;
      }

      setStagedStage(targetStage);
      if (!isGroupSharingEnabled(targetStage) || (wasPlaced && isNowConfirmed)) {
        resetAllSharedStatuses();
      }
      return;
    }

    if (check.reason === 'SAME_STAGE') {
      return;
    }

    if (check.reason === 'NON_ADJACENT') {
      setConfirmDialog({
        visible: true,
        title: 'Sequential Transition Only',
        message: `Packages can only move to the immediate next or previous stage (${prevStage || 'none'} or ${nextStage || 'none'}). You cannot skip stages.`,
        confirmLabel: 'Understood',
        intent: 'attention',
        icon: <LuTriangleAlert size={20} color={tokens.warning} />,
        singleButton: true,
        onConfirm: () => setConfirmDialog((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    if (check.reason === 'LABEL_REQUIRED') {
      setConfirmDialog({
        visible: true,
        title: 'Shipping Label Required',
        message: 'A Delhivery shipping label must be generated before moving this package to Placed.',
        confirmLabel: 'Understood',
        intent: 'attention',
        icon: <LuTriangleAlert size={20} color={tokens.warning} />,
        singleButton: true,
        onConfirm: () => setConfirmDialog((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    setConfirmDialog({
      visible: true,
      title: 'Action Blocked',
      message: 'Cannot transition to this stage.',
      confirmLabel: 'OK',
      intent: 'attention',
      icon: <LuTriangleAlert size={20} color={tokens.warning} />,
      singleButton: true,
      onConfirm: () => setConfirmDialog((prev) => ({ ...prev, visible: false })),
    });
  };

  const handleForwardOrderSuccess = (data: {
    awbNumber: string;
    labelUrl: string;
    auditData: SubmittedForwardOrderAudit;
  }) => {
    setStagedAwb(data.awbNumber);
    setStagedLabelUrl(data.labelUrl);
    setAuditData(data.auditData);
    if (data.auditData?.pickupFacility?.alias) {
      setWarehouseAlias(data.auditData.pickupFacility.alias);
    }
    setStagedNeedLabel(true);
    resetAddressAndLabelSharedStatuses();
    onUpdateNeedLabel?.(true, { awbNumber: data.awbNumber, labelUrl: data.labelUrl });

    if (orderGrpId) {
      logisticsService.getGroupShipments(orderGrpId).then((records) => {
        if (records && records.length > 0) {
          setShipmentHistories(records);
        }
      });
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      const wasPlaced = (currentStage || '').toLowerCase() === 'placed';
      const isNowConfirmed = (stagedStage || '').toLowerCase() === 'confirmed';
      if (!isGroupSharingEnabled(stagedStage) || (wasPlaced && isNowConfirmed)) {
        resetAllSharedStatuses();
      }
      if (onSave) {
        await onSave(stagedStage, stagedNeedLabel);
      } else {
        onUpdateStage(stagedStage);
        onUpdateNeedLabel?.(stagedNeedLabel, { awbNumber: stagedAwb, labelUrl: stagedLabelUrl });
        setConfirmDialog({
          visible: true,
          title: 'Saved',
          message: `Package status set to ${stagedStage}.`,
          confirmLabel: 'OK',
          intent: 'success',
          icon: <LuCheckCircle2 size={20} color={tokens.success} />,
          singleButton: true,
          onConfirm: () => setConfirmDialog((prev) => ({ ...prev, visible: false })),
        });
      }
    } catch (err: any) {
      console.error('Failed to save group stage:', err);
      setConfirmDialog({
        visible: true,
        title: 'Save Failed',
        message: err?.message || 'Could not update package stage.',
        confirmLabel: 'OK',
        intent: 'critical',
        icon: <LuTriangleAlert size={20} color={tokens.error} />,
        singleButton: true,
        onConfirm: () => setConfirmDialog((prev) => ({ ...prev, visible: false })),
      });
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
        awbNumber={hasLabel ? stagedAwb : undefined}
        labelUrl={hasLabel ? stagedLabelUrl : undefined}
        initialAuditData={hasLabel ? auditData : null}
        onSuccess={handleForwardOrderSuccess}
        orderType={orderType}
        resellerName={resellerName}
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
                    setConfirmDialog({
                      visible: true,
                      title: 'Cancel Shipping Label?',
                      message: `A Delhivery shipping label (${stagedAwb ? `AWB: ${stagedAwb}` : 'active'}) is assigned to this package.\n\nSwitching "Need Label" off will cancel the shipment with Delhivery, permanently delete the label PDF attachment from cloud storage, and remove the package label.\n\nDo you want to proceed?`,
                      confirmLabel: 'Cancel Label & Turn Off',
                      cancelLabel: 'Keep Label',
                      intent: 'critical',
                      icon: <LuTrash2 size={20} color={tokens.error} />,
                      singleButton: false,
                      onConfirm: async () => {
                        const currentAwb = stagedAwb;
                        const currentLabelUrl = stagedLabelUrl;
                        try {
                          // 1. Backend cancellation & server storage deletion
                          if (orderGrpId) {
                            await logisticsService.cancelGroupLabel(orderGrpId, currentAwb, 'Need Label toggled off');
                          } else if (currentAwb) {
                            await logisticsService.cancelDelhiveryAwb(currentAwb);
                          }

                          // 2. Client-side explicit storage delete calls for URL & AWB
                          if (currentLabelUrl) {
                            try {
                              await searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(currentLabelUrl));
                              console.log('[GroupManagementView] Hard-deleted shipping label from storage by URL:', currentLabelUrl);
                            } catch (delErr) {
                              console.warn('[GroupManagementView] Failed to hard delete label by URL:', delErr);
                            }
                          }
                          if (currentAwb) {
                            try {
                              await searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(`labels/${currentAwb}.pdf`));
                              console.log(`[GroupManagementView] Hard-deleted shipping label from storage: labels/${currentAwb}.pdf`);
                            } catch (delErr) {
                              console.warn('[GroupManagementView] Failed to hard delete label by AWB path:', delErr);
                            }
                          }
                        } catch (err) {
                          console.warn('[GroupManagementView] Label cancellation error:', err);
                        } finally {
                          // 3. Clear all label and AWB states so a clean state is left
                          setStagedAwb(undefined);
                          setStagedLabelUrl(undefined);
                          setAuditData(null);
                          setIsLabelShared(false);
                          setLabelSharedAt(null);
                          setIsAddressShared(false);
                          setAddressSharedAt(null);
                          setStagedNeedLabel(false);
                          onUpdateNeedLabel?.(false, { awbNumber: undefined, labelUrl: undefined });

                          // Prepend cancelled record immediately to shipmentHistories for audit retention
                          if (currentAwb) {
                            const cancelledRecord: GroupShipmentHistoryItem = {
                              orderGrpId: orderGrpId,
                              awbNumber: currentAwb,
                              status: 'cancelled',
                              courierPartner: 'Delhivery',
                              shippingMode: auditData?.shippingMode || 'Surface',
                              metadata: {
                                cancelled_at: new Date().toISOString(),
                                cancellation_reason: 'Need Label toggled off',
                                weightGrams: auditData?.weightGrams,
                                lengthCm: auditData?.dimensionsCm?.length,
                                widthCm: auditData?.dimensionsCm?.width,
                                heightCm: auditData?.dimensionsCm?.height,
                                pickupLocation: auditData?.pickupFacility?.name || warehouseAlias,
                                shippingMode: auditData?.shippingMode || 'Surface',
                                paymentMode: auditData?.paymentMode,
                                codAmount: auditData?.collectibleAmount,
                                totalAmount: totalSubtotal,
                                sellerName: auditData?.sellerName,
                                sellerAddress: auditData?.sellerAddress,
                                orderType: orderType,
                                resellerName: resellerName,
                              },
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            };
                            setShipmentHistories((prev) => [
                              cancelledRecord,
                              ...prev.filter((h) => h.awbNumber !== currentAwb),
                            ]);
                          }

                          // 4. Modern success feedback dialog
                          setConfirmDialog({
                            visible: true,
                            title: 'Label Cancelled & Deleted',
                            message: `The shipping label attachment was permanently removed from storage and shipment cancelled with Delhivery${currentAwb ? ` (AWB: ${currentAwb})` : ''}. Need Label has been turned off.`,
                            confirmLabel: 'Done',
                            intent: 'success',
                            icon: <LuCheckCircle2 size={20} color={tokens.success} />,
                            singleButton: true,
                            onConfirm: () => {
                              setConfirmDialog((prev) => ({ ...prev, visible: false }));
                            },
                          });
                        }
                      },
                    });
                  } else {
                    const nextVal = !stagedNeedLabel;
                    setStagedNeedLabel(nextVal);
                    resetAddressAndLabelSharedStatuses();
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
            <XStack alignItems="center" gap={8} flexWrap="wrap">
              <Text
                fontSize={11}
                fontWeight="800"
                color={tokens.textMuted}
                textTransform="uppercase"
                letterSpacing={0.8}
              >
                PACKAGE ITEMS ({totalItemsCount})
              </Text>
            </XStack>
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

                        {/* Top-Left Overlay: Shared Status Badge */}
                        {isItemShared && (
                          <XStack
                            position="absolute"
                            top={5}
                            left={5}
                            backgroundColor={tokens.success}
                            paddingHorizontal={5}
                            paddingVertical={2}
                            borderRadius={3}
                            alignItems="center"
                            gap={2}
                            zIndex={2}
                          >
                            <LuCheck size={10} color="#FFFFFF" strokeWidth={3} />
                            <Text fontSize={8} fontWeight="900" color="#FFFFFF">
                              SHARED
                            </Text>
                          </XStack>
                        )}

                        {/* Top-Right Overlay Symbols: Image Preview (LuEye) & Edit/Lock Action Below */}
                        <YStack position="absolute" top={5} right={5} gap={4} alignItems="center" zIndex={2}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Preview item image"
                            onPress={() => photo && setPreviewModalImage({ uri: photo, title: it.title || it.productId })}
                            hitSlop={6}
                            style={({ pressed }) => ({
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

                          {isUnconfirmedStage ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Edit details for ${it.title || it.productId || 'item'}`}
                              onPress={() => {
                                if (onEditItem) {
                                  onEditItem(it);
                                } else {
                                  setEditingItem(it);
                                }
                              }}
                              hitSlop={6}
                              style={({ pressed }) => ({
                                width: 26,
                                height: 26,
                                borderRadius: tokens.radius.full,
                                backgroundColor: pressed ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.55)',
                                alignItems: 'center',
                                justifyContent: 'center',
                              })}
                            >
                              <LuPencil size={12} color="#FFFFFF" />
                            </Pressable>
                          ) : (
                            <YStack
                              width={26}
                              height={26}
                              borderRadius={tokens.radius.full}
                              backgroundColor="rgba(0,0,0,0.55)"
                              alignItems="center"
                              justifyContent="center"
                              accessibilityRole="image"
                              accessibilityLabel="Item editing locked"
                            >
                              <LuLock size={12} color="rgba(255, 255, 255, 0.75)" />
                            </YStack>
                          )}
                        </YStack>

                        {/* Bottom Overlay: Price (Prepaid) or Equation (COD) Badge spanning left to right */}
                        <XStack
                          position="absolute"
                          bottom={3}
                          left={3}
                          right={3}
                          backgroundColor="rgba(0,0,0,0.78)"
                          paddingHorizontal={3}
                          paddingVertical={3}
                          borderRadius={3}
                          justifyContent="center"
                          alignItems="center"
                          pointerEvents="none"
                        >
                          <Text
                            fontSize={isCod ? 10.5 : 11.5}
                            fontWeight="900"
                            color="#FFFFFF"
                            textAlign="center"
                            letterSpacing={isCod ? -0.3 : 0}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}
                            style={{
                              textShadowColor: 'rgba(0, 0, 0, 0.9)',
                              textShadowOffset: { width: 0, height: 1 },
                              textShadowRadius: 2,
                            }}
                          >
                            {formatItemPriceEquation(it, isCod)}
                          </Text>
                        </XStack>
                      </YStack>

                      {/* Dedicated Share Button Directly Below Tile */}
                      <Pressable
                        disabled={!isSharingEnabled}
                        accessibilityRole="button"
                        accessibilityLabel={
                          !isSharingEnabled
                            ? `Sharing disabled for ${it.title || it.productId} until package is confirmed`
                            : `Share item ${it.title || it.productId}`
                        }
                        onPress={() => {
                          if (!isSharingEnabled) return;
                          handleShareItem(it);
                        }}
                        style={({ pressed }) => ({
                          height: 32,
                          backgroundColor: !isSharingEnabled
                            ? `${tokens.textMuted}10`
                            : isItemShared
                            ? `${tokens.success}14`
                            : pressed
                            ? `${tokens.accent}20`
                            : tokens.surfaceRaised,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 4,
                          paddingHorizontal: 4,
                          opacity: !isSharingEnabled ? 0.45 : 1,
                        })}
                      >
                        {!isSharingEnabled ? (
                          <>
                            <LuLock size={11} color={tokens.textMuted} />
                            <Text fontSize={10} fontWeight="800" color={tokens.textMuted} numberOfLines={1}>
                              LOCKED
                            </Text>
                          </>
                        ) : isItemShared ? (
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
              disabled={!isSharingEnabled}
              accessibilityRole="button"
              accessibilityLabel={
                !isSharingEnabled
                  ? "Sharing delivery address disabled until package is confirmed"
                  : "Share customer delivery address"
              }
              onPress={() => {
                if (!isSharingEnabled) return;
                handleShareAddress();
              }}
              style={({ pressed }) => ({
                height: 40,
                borderRadius: tokens.radius.sm,
                backgroundColor: !isSharingEnabled
                  ? `${tokens.textMuted}14`
                  : isAddressShared
                  ? `${tokens.success}18`
                  : pressed
                  ? `${tokens.accent}D0`
                  : tokens.accent,
                borderWidth: isAddressShared ? 1 : !isSharingEnabled ? 1 : 0,
                borderColor: isAddressShared
                  ? tokens.success
                  : !isSharingEnabled
                  ? tokens.border
                  : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: !isSharingEnabled ? 0.45 : 1,
              })}
            >
              {!isSharingEnabled ? (
                <>
                  <LuLock size={14} color={tokens.textMuted} />
                  <Text fontSize={12} fontWeight="800" color={tokens.textMuted}>
                    SHARE DELIVERY ADDRESS (LOCKED)
                  </Text>
                </>
              ) : isAddressShared ? (
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
              /* Label Ready: PDF Preview Tile with Overlaid AWB Badge, Pickup Schedule & Refresh Action */
              <YStack gap={8}>
                {(() => {
                  const rawLabelPath = stagedLabelUrl || (stagedAwb ? `labels/${stagedAwb}.pdf` : '');
                  const resolvedPreviewImg = resolveLabelImageUrl(rawLabelPath);

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="View shipping label and audit details"
                      onPress={() => setIsForwardOrderModalOpen(true)}
                    >
                      <YStack
                        height={180}
                        borderRadius={tokens.radius.md}
                        backgroundColor="#FFFFFF"
                        borderWidth={isLabelShared ? 2.5 : 1}
                        borderColor={isLabelShared ? tokens.success : tokens.border}
                        overflow="hidden"
                        position="relative"
                        justifyContent="center"
                        alignItems="center"
                      >
                        {/* Background / Centered Shipping Label Image Preview */}
                        {resolvedPreviewImg && !tilePreviewImageError ? (
                          <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                            {tilePreviewImageLoading && (
                              <YStack
                                position="absolute"
                                top={0}
                                left={0}
                                right={0}
                                bottom={0}
                                alignItems="center"
                                justifyContent="center"
                                backgroundColor={tokens.surface}
                                zIndex={1}
                              >
                                <ActivityIndicator size="small" color={tokens.accent} />
                              </YStack>
                            )}
                            <Image
                              source={{ uri: resolvedPreviewImg }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                              onLoadStart={() => setTilePreviewImageLoading(true)}
                              onLoad={() => {
                                setTilePreviewImageLoading(false);
                                setTilePreviewImageError(false);
                              }}
                              onError={() => {
                                setTilePreviewImageLoading(false);
                                setTilePreviewImageError(true);
                              }}
                            />
                            {/* Subtle dark gradient overlay at top and bottom for readability of badges */}
                            <YStack
                              position="absolute"
                              top={0}
                              left={0}
                              right={0}
                              height={48}
                              backgroundColor="rgba(0, 0, 0, 0.28)"
                            />
                            <YStack
                              position="absolute"
                              bottom={0}
                              left={0}
                              right={0}
                              height={54}
                              backgroundColor="rgba(0, 0, 0, 0.45)"
                            />
                          </View>
                        ) : (
                          <YStack alignItems="center" gap={6} padding={16}>
                            <LuFileText size={38} color={tokens.accent} />
                            <Text fontSize={12} fontWeight="800" color={tokens.text}>
                              DELHIVERY SHIPPING LABEL (PDF)
                            </Text>
                            <Text fontSize={11} color={tokens.textMuted}>
                              Tap to view document & audit log
                            </Text>
                          </YStack>
                        )}

                        {/* Top-Left: Floating AWB Badge */}
                        {stagedAwb && (
                          <XStack
                            position="absolute"
                            top={8}
                            left={8}
                            backgroundColor="rgba(15, 23, 42, 0.88)"
                            paddingHorizontal={8}
                            paddingVertical={4}
                            borderRadius={tokens.radius.sm}
                            alignItems="center"
                            gap={4}
                            zIndex={3}
                          >
                            <Text fontSize={9} fontWeight="700" color="#94A3B8">
                              AWB:
                            </Text>
                            <Text fontSize={11} fontWeight="900" color="#FFFFFF">
                              {stagedAwb}
                            </Text>
                          </XStack>
                        )}

                        {/* Top-Right: Refresh Icon Action (Replaced Eye) */}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Refresh pickup schedule and tracking status"
                          hitSlop={10}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            handleRefreshPickup();
                          }}
                          style={({ pressed }) => ({
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            width: 32,
                            height: 32,
                            borderRadius: tokens.radius.full,
                            backgroundColor: pressed ? 'rgba(0,0,0,0.9)' : 'rgba(15, 23, 42, 0.85)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 4,
                          })}
                        >
                          {isRefreshingPickup ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <LuRefreshCw size={15} color="#FFFFFF" />
                          )}
                        </Pressable>

                        {/* Bottom Bar: Pickup Scheduled Status & Time */}
                        <XStack
                          position="absolute"
                          bottom={8}
                          left={8}
                          right={8}
                          justifyContent="space-between"
                          alignItems="center"
                          zIndex={3}
                        >
                          {scheduledPickupInfo ? (
                            <XStack
                              backgroundColor="rgba(22, 163, 74, 0.95)"
                              paddingHorizontal={8}
                              paddingVertical={4}
                              borderRadius={tokens.radius.sm}
                              alignItems="center"
                              gap={5}
                              flexShrink={1}
                            >
                              <LuCheckCircle2 size={12} color="#FFFFFF" />
                              <YStack gap={0} flexShrink={1}>
                                <Text fontSize={9} fontWeight="900" color="#FFFFFF" letterSpacing={0.3}>
                                  PICKUP SCHEDULED{scheduledPickupInfo.pickupId ? ` #${scheduledPickupInfo.pickupId}` : ''}
                                </Text>
                                <XStack alignItems="center" gap={3}>
                                  <LuClock size={9} color="#E2E8F0" />
                                  <Text fontSize={9} fontWeight="700" color="#FFFFFF" numberOfLines={1}>
                                    {scheduledPickupInfo.displayInfo}
                                  </Text>
                                </XStack>
                              </YStack>
                            </XStack>
                          ) : (
                            <XStack
                              backgroundColor="rgba(15, 23, 42, 0.85)"
                              paddingHorizontal={8}
                              paddingVertical={4}
                              borderRadius={tokens.radius.sm}
                              alignItems="center"
                              gap={4}
                            >
                              <LuClock size={11} color="#94A3B8" />
                              <Text fontSize={9} fontWeight="800" color="#FFFFFF">
                                PICKUP PENDING
                              </Text>
                            </XStack>
                          )}

                          {isLabelShared && (
                            <XStack
                              backgroundColor={tokens.success}
                              paddingHorizontal={6}
                              paddingVertical={3}
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
                      </YStack>
                    </Pressable>
                  );
                })()}

                {/* Share Label Action */}
                <Pressable
                  disabled={!isSharingEnabled}
                  accessibilityRole="button"
                  accessibilityLabel={
                    !isSharingEnabled
                      ? "Sharing shipping label disabled until package is confirmed"
                      : "Share shipping label PDF"
                  }
                  onPress={() => {
                    if (!isSharingEnabled) return;
                    handleShareLabel();
                  }}
                  style={({ pressed }) => ({
                    height: 40,
                    borderRadius: tokens.radius.sm,
                    backgroundColor: !isSharingEnabled
                      ? `${tokens.textMuted}14`
                      : isLabelShared
                      ? `${tokens.success}18`
                      : pressed
                      ? `${tokens.accent}D0`
                      : tokens.accent,
                    borderWidth: isLabelShared ? 1 : !isSharingEnabled ? 1 : 0,
                    borderColor: isLabelShared
                      ? tokens.success
                      : !isSharingEnabled
                      ? tokens.border
                      : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    opacity: !isSharingEnabled ? 0.45 : 1,
                  })}
                >
                  {!isSharingEnabled ? (
                    <>
                      <LuLock size={13} color={tokens.textMuted} />
                      <Text fontSize={11} fontWeight="800" color={tokens.textMuted}>
                        SHARE LABEL (LOCKED)
                      </Text>
                    </>
                  ) : (
                    <>
                      <LuShare2 size={13} color={isLabelShared ? tokens.success : tokens.accentForeground} />
                      <Text
                        fontSize={11}
                        fontWeight="800"
                        color={isLabelShared ? tokens.success : tokens.accentForeground}
                      >
                        {isLabelShared ? 'LABEL SHARED ✓' : 'SHARE LABEL'}
                      </Text>
                    </>
                  )}
                </Pressable>

                {/* Pickup Actions Row (Schedule / Reschedule & Clear Pickup) */}
                <XStack gap={8}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={scheduledPickupInfo ? "Reschedule Delhivery pickup" : "Schedule Delhivery pickup"}
                    onPress={() => setShowSchedulePickup(true)}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 36,
                      borderRadius: tokens.radius.sm,
                      backgroundColor: pressed ? `${tokens.accent}25` : `${tokens.accent}14`,
                      borderWidth: 1,
                      borderColor: `${tokens.accent}35`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                    })}
                  >
                    <LuCalendar size={13} color={tokens.accent} />
                    <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                      {scheduledPickupInfo ? 'RESCHEDULE PICKUP' : 'SCHEDULE PICKUP'}
                    </Text>
                  </Pressable>

                  {Boolean(scheduledPickupInfo) && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Clear scheduled pickup"
                      onPress={handleClearPickup}
                      style={({ pressed }) => ({
                        height: 36,
                        paddingHorizontal: 12,
                        borderRadius: tokens.radius.sm,
                        backgroundColor: pressed ? `${tokens.warning}24` : `${tokens.warning}14`,
                        borderWidth: 1,
                        borderColor: `${tokens.warning}40`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 5,
                      })}
                    >
                      <LuX size={13} color={tokens.warning} />
                      <Text fontSize={11} fontWeight="800" color={tokens.warning}>
                        CLEAR PICKUP
                      </Text>
                    </Pressable>
                  )}
                </XStack>

                {/* Cancel Shipping Label Action */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel shipping label"
                  onPress={() => {
                    const currentAwb = stagedAwb || awbNumber;
                    setConfirmDialog({
                      visible: true,
                      title: 'Cancel Shipping Label?',
                      message: `A Delhivery shipping label (${currentAwb ? `AWB: ${currentAwb}` : 'active'}) is assigned to this package.\n\nCancelling will void the shipment with Delhivery, permanently delete the label PDF attachment from cloud storage, and remove the package label so you can edit items or re-manifest.\n\nDo you want to proceed?`,
                      confirmLabel: 'Cancel Shipping Label',
                      cancelLabel: 'Keep Label',
                      intent: 'attention',
                      icon: <LuTriangleAlert size={20} color={tokens.warning} />,
                      onConfirm: async () => {
                        setConfirmDialog((prev) => ({ ...prev, visible: false }));
                        try {
                          if (orderGrpId && currentAwb) {
                            await logisticsService.cancelGroupLabel(orderGrpId, currentAwb, 'User cancelled label');
                            await logisticsService.cancelDelhiveryAwb(currentAwb).catch(console.warn);
                          }
                          setStagedAwb(undefined);
                          setStagedLabelUrl(undefined);
                          onUpdateNeedLabel?.(stagedNeedLabel, { awbNumber: undefined, labelUrl: undefined });
                          if (orderGrpId) {
                            const records = await logisticsService.getGroupShipments(orderGrpId);
                            if (records && records.length > 0) {
                              setShipmentHistories(records);
                            }
                          }
                          setConfirmDialog({
                            visible: true,
                            title: 'Label Cancelled',
                            message: `The shipping label was successfully cancelled with Delhivery${currentAwb ? ` (AWB: ${currentAwb})` : ''}.`,
                            confirmLabel: 'Understood',
                            intent: 'success',
                            singleButton: true,
                            onConfirm: () => setConfirmDialog((prev) => ({ ...prev, visible: false })),
                          });
                        } catch (err: any) {
                          console.warn('[GroupManagementView] Label cancellation error:', err);
                          Alert.alert('Cancellation Error', 'Could not complete label cancellation with server. Please try again.');
                        }
                      },
                    });
                  }}
                  style={({ pressed }) => ({
                    height: 36,
                    borderRadius: tokens.radius.sm,
                    backgroundColor: pressed ? `${tokens.error}24` : `${tokens.error}14`,
                    borderWidth: 1,
                    borderColor: `${tokens.error}40`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  })}
                >
                  <LuTrash2 size={13} color={tokens.error} />
                  <Text fontSize={11} fontWeight="800" color={tokens.error}>
                    CANCEL SHIPPING LABEL
                  </Text>
                </Pressable>
              </YStack>
            ) : (
              /* Manifest Order Card: Big pressable box to open forward order / manifest modal */
              isUnconfirmedStage ? (
                <YStack
                  minHeight={100}
                  paddingVertical={20}
                  paddingHorizontal={16}
                  borderRadius={tokens.radius.md}
                  borderWidth={1.5}
                  borderColor={`${tokens.warning}60`}
                  backgroundColor={`${tokens.warning}10`}
                  alignItems="center"
                  justifyContent="center"
                  gap={8}
                >
                  <XStack alignItems="center" gap={10}>
                    <LuTriangleAlert size={22} color={tokens.warning} />
                    <Text
                      fontSize={14}
                      fontWeight="900"
                      color={tokens.warning}
                      letterSpacing={0.5}
                      textTransform="uppercase"
                      textAlign="center"
                    >
                      MOVE TO "CONFIRMED" STAGE TO MANIFEST ORDER
                    </Text>
                  </XStack>
                  <Text fontSize={12} fontWeight="600" color={tokens.textSecondary} textAlign="center" lineHeight={17}>
                    Items in this package are currently unconfirmed and open for editing. Once details are finalized, move this item group to the "Confirmed" stage to manifest the order and generate a Delhivery shipping label.
                  </Text>
                  {(() => {
                    const cancelledAwb = cancelledShipmentHistories[0]?.awbNumber;
                    if (!cancelledAwb) return null;
                    return (
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
                          Previous AWB {cancelledAwb} was cancelled. Move to Confirmed to re-manifest.
                        </Text>
                      </XStack>
                    );
                  })()}
                </YStack>
              ) : (
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
                  {(() => {
                    const cancelledAwb = cancelledShipmentHistories[0]?.awbNumber;
                    if (!cancelledAwb) return null;
                    return (
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
                          Previous AWB {cancelledAwb} was cancelled. Tap to generate new shipping label.
                        </Text>
                      </XStack>
                    );
                  })()}
                </Pressable>
              )
            )}
          </YStack>
        )}


        {/* ── 5. AWB & Shipment History Section (Earlier Cancelled Records Only) ── */}
        {cancelledShipmentHistories.length > 0 && (
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.md}
            borderWidth={1}
            borderColor={tokens.border}
            padding={14}
            gap={12}
            marginTop={4}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <XStack alignItems="center" gap={8}>
                <LuTruck size={16} color={tokens.accent} />
                <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
                  SHIPMENT & AWB HISTORY
                </Text>
              </XStack>
              <XStack
                backgroundColor={`${tokens.textMuted}18`}
                paddingHorizontal={8}
                paddingVertical={2}
                borderRadius={tokens.radius.full}
              >
                <Text fontSize={10} fontWeight="800" color={tokens.textMuted}>
                  {cancelledShipmentHistories.length} {cancelledShipmentHistories.length === 1 ? 'RECORD' : 'RECORDS'}
                </Text>
              </XStack>
            </XStack>

            <YStack gap={10}>
              {cancelledShipmentHistories.map((hist, idx) => {
                const meta = hist.metadata || {};
                const isExpanded = Boolean(expandedHistoryAwbs[hist.awbNumber]);
                const weight = meta.weightGrams ?? meta.weight_grams;
                const length = meta.lengthCm ?? meta.length_cm;
                const width = meta.widthCm ?? meta.width_cm;
                const height = meta.heightCm ?? meta.height_cm;
                const pickup = meta.pickupLocation ?? meta.pickup_location;
                const mode = meta.shippingMode ?? meta.shipping_mode ?? hist.shippingMode;
                const codAmt = meta.codAmount ?? meta.cod_amount;
                const totalAmt = meta.totalAmount ?? meta.total_amount;
                const seller = meta.sellerName ?? meta.seller_name;
                const reseller = meta.resellerName ?? meta.reseller_name;
                const orderTypeVal = meta.orderType ?? meta.order_type;
                const cancelledAt = meta.cancelled_at || hist.updatedAt || hist.createdAt;
                const cancelReason = meta.cancellation_reason || meta.cancelled_reason;

                return (
                  <YStack
                    key={`${hist.awbNumber || idx}-${idx}`}
                    backgroundColor={tokens.surfaceRaised}
                    borderRadius={tokens.radius.sm}
                    borderWidth={1}
                    borderColor={tokens.border}
                    padding={12}
                    gap={10}
                  >
                    {/* Top Row: AWB Number + CANCELLED Badge + Delhivery Portal Link */}
                    <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={8}>
                      <XStack alignItems="center" gap={8} flexShrink={1}>
                        <Text
                          fontSize={13}
                          fontWeight="800"
                          fontFamily={Platform.OS === 'ios' ? 'Menlo' : 'monospace'}
                          color={tokens.text}
                          letterSpacing={0.5}
                        >
                          {hist.awbNumber}
                        </Text>
                        <XStack
                          paddingHorizontal={7}
                          paddingVertical={2.5}
                          borderRadius={4}
                          backgroundColor={`${tokens.error}18`}
                          borderWidth={1}
                          borderColor={`${tokens.error}40`}
                          alignItems="center"
                        >
                          <Text
                            fontSize={9}
                            fontWeight="900"
                            color={tokens.error}
                            textTransform="uppercase"
                            letterSpacing={0.5}
                          >
                            CANCELLED
                          </Text>
                        </XStack>
                      </XStack>

                      {/* External Link button to Delhivery Portal */}
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={`Open AWB ${hist.awbNumber} on Delhivery Portal`}
                        onPress={() => {
                          const url = `https://one.delhivery.com/v2/shipments/forward/${hist.awbNumber.trim()}`;
                          Linking.openURL(url).catch((err) => {
                            console.warn('[GroupManagementView] Could not open Delhivery URL:', err);
                          });
                        }}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          borderRadius: tokens.radius.xs,
                          backgroundColor: pressed ? `${tokens.accent}25` : `${tokens.accent}14`,
                          borderWidth: 1,
                          borderColor: `${tokens.accent}35`,
                        })}
                      >
                        <Text fontSize={10} fontWeight="800" color={tokens.accent} letterSpacing={0.4}>
                          DELHIVERY PORTAL
                        </Text>
                        <LuExternalLink size={12} color={tokens.accent} />
                      </Pressable>
                    </XStack>

                    {/* Metadata & Timestamp Row */}
                    <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={6}>
                      <XStack alignItems="center" gap={4} flexWrap="wrap">
                        <Text fontSize={10} color={tokens.textMuted} fontWeight="600">
                          {cancelledAt
                            ? `Cancelled: ${new Date(cancelledAt).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : 'Cancelled Waybill'}
                        </Text>
                        {Boolean(cancelReason) && (
                          <Text fontSize={10} color={tokens.textMuted} fontStyle="italic">
                            • {cancelReason}
                          </Text>
                        )}
                      </XStack>

                      {/* Expand / Collapse Form Data Details */}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={isExpanded ? 'Hide manifest form data' : 'View manifest form data'}
                        onPress={() => {
                          setExpandedHistoryAwbs((prev) => ({
                            ...prev,
                            [hist.awbNumber]: !prev[hist.awbNumber],
                          }));
                        }}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 6,
                          paddingVertical: 3,
                          borderRadius: tokens.radius.xs,
                          backgroundColor: pressed ? `${tokens.text}10` : 'transparent',
                        })}
                      >
                        <Text fontSize={10} fontWeight="700" color={tokens.textSecondary}>
                          {isExpanded ? 'Hide Form Data' : 'View Form Data'}
                        </Text>
                        {isExpanded ? (
                          <LuChevronUp size={12} color={tokens.textSecondary} />
                        ) : (
                          <LuChevronDown size={12} color={tokens.textSecondary} />
                        )}
                      </Pressable>
                    </XStack>

                    {/* Expandable Form Data Specifications */}
                    {isExpanded && (
                      <YStack
                        backgroundColor={tokens.background}
                        borderRadius={tokens.radius.xs}
                        borderWidth={1}
                        borderColor={tokens.border}
                        padding={10}
                        gap={8}
                        marginTop={2}
                      >
                        <Text fontSize={9} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                          MANIFEST FORM DATA USED
                        </Text>

                        <XStack flexWrap="wrap" gap={8}>
                          {Boolean(weight) && (
                            <YStack backgroundColor={tokens.surfaceRaised} paddingHorizontal={8} paddingVertical={4} borderRadius={4} borderWidth={1} borderColor={tokens.border}>
                              <Text fontSize={8} color={tokens.textMuted} fontWeight="700">WEIGHT</Text>
                              <Text fontSize={11} fontWeight="800" color={tokens.text}>{weight} g</Text>
                            </YStack>
                          )}
                          {(Boolean(length) || Boolean(width) || Boolean(height)) && (
                            <YStack backgroundColor={tokens.surfaceRaised} paddingHorizontal={8} paddingVertical={4} borderRadius={4} borderWidth={1} borderColor={tokens.border}>
                              <Text fontSize={8} color={tokens.textMuted} fontWeight="700">DIMENSIONS</Text>
                              <Text fontSize={11} fontWeight="800" color={tokens.text}>{length || 10} × {width || 10} × {height || 5} cm</Text>
                            </YStack>
                          )}
                          {Boolean(mode) && (
                            <YStack backgroundColor={tokens.surfaceRaised} paddingHorizontal={8} paddingVertical={4} borderRadius={4} borderWidth={1} borderColor={tokens.border}>
                              <Text fontSize={8} color={tokens.textMuted} fontWeight="700">MODE</Text>
                              <Text fontSize={11} fontWeight="800" color={tokens.text}>{mode}</Text>
                            </YStack>
                          )}
                          {Boolean(pickup) && (
                            <YStack backgroundColor={tokens.surfaceRaised} paddingHorizontal={8} paddingVertical={4} borderRadius={4} borderWidth={1} borderColor={tokens.border} flex={1} minWidth={120}>
                              <Text fontSize={8} color={tokens.textMuted} fontWeight="700">PICKUP FACILITY</Text>
                              <Text fontSize={11} fontWeight="800" color={tokens.text} numberOfLines={1}>{pickup}</Text>
                            </YStack>
                          )}
                        </XStack>

                        <XStack flexWrap="wrap" gap={8}>
                          {Boolean(seller) && (
                            <YStack backgroundColor={tokens.surfaceRaised} paddingHorizontal={8} paddingVertical={4} borderRadius={4} borderWidth={1} borderColor={tokens.border} flex={1} minWidth={140}>
                              <Text fontSize={8} color={tokens.textMuted} fontWeight="700">SELLER (ON LABEL)</Text>
                              <Text fontSize={11} fontWeight="800" color={tokens.text} numberOfLines={1}>{seller}</Text>
                            </YStack>
                          )}
                          {Boolean(reseller) && (
                            <YStack backgroundColor={tokens.surfaceRaised} paddingHorizontal={8} paddingVertical={4} borderRadius={4} borderWidth={1} borderColor={tokens.border}>
                              <Text fontSize={8} color={tokens.textMuted} fontWeight="700">RESELLER BOUTIQUE</Text>
                              <Text fontSize={11} fontWeight="800" color={tokens.warning}>{reseller}</Text>
                            </YStack>
                          )}
                          {Boolean(orderTypeVal) && (
                            <YStack backgroundColor={tokens.surfaceRaised} paddingHorizontal={8} paddingVertical={4} borderRadius={4} borderWidth={1} borderColor={tokens.border}>
                              <Text fontSize={8} color={tokens.textMuted} fontWeight="700">TYPE</Text>
                              <Text fontSize={11} fontWeight="800" color={tokens.text}>{orderTypeVal}</Text>
                            </YStack>
                          )}
                          {codAmt !== undefined && codAmt !== null && (
                            <YStack backgroundColor={tokens.surfaceRaised} paddingHorizontal={8} paddingVertical={4} borderRadius={4} borderWidth={1} borderColor={tokens.border}>
                              <Text fontSize={8} color={tokens.textMuted} fontWeight="700">COD COLLECTIBLE</Text>
                              <Text fontSize={11} fontWeight="800" color={tokens.text}>₹{Number(codAmt).toLocaleString('en-IN')}</Text>
                            </YStack>
                          )}
                          {totalAmt !== undefined && totalAmt !== null && (
                            <YStack backgroundColor={tokens.surfaceRaised} paddingHorizontal={8} paddingVertical={4} borderRadius={4} borderWidth={1} borderColor={tokens.border}>
                              <Text fontSize={8} color={tokens.textMuted} fontWeight="700">PACKAGE TOTAL</Text>
                              <Text fontSize={11} fontWeight="800" color={tokens.text}>₹{Number(totalAmt).toLocaleString('en-IN')}</Text>
                            </YStack>
                          )}
                        </XStack>
                      </YStack>
                    )}
                  </YStack>
                );
              })}
            </YStack>
          </YStack>
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
        <XStack alignItems="center" gap={10}>
          {/* Left Side: ORDER PLACED Button */}
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
                setConfirmDialog({
                  visible: true,
                  title: 'Fulfillment Incomplete',
                  message: `To place package order, please ensure:\n• ${missingText.join('\n• ')}`,
                  confirmLabel: 'Understood',
                  intent: 'attention',
                  icon: <LuTriangleAlert size={20} color={tokens.warning} />,
                  singleButton: true,
                  onConfirm: () => setConfirmDialog((prev) => ({ ...prev, visible: false })),
                });
                return;
              }

              try {
                setStagedStage('Placed');
                if (onSave) {
                  await onSave('Placed', stagedNeedLabel);
                } else {
                  onUpdateStage('Placed');
                  onUpdateNeedLabel?.(stagedNeedLabel, { awbNumber: stagedAwb, labelUrl: stagedLabelUrl });
                  setConfirmDialog({
                    visible: true,
                    title: 'Order Placed',
                    message: 'Package status set to PLACED.',
                    confirmLabel: 'Done',
                    intent: 'success',
                    icon: <LuCheckCircle2 size={20} color={tokens.success} />,
                    singleButton: true,
                    onConfirm: () => setConfirmDialog((prev) => ({ ...prev, visible: false })),
                  });
                }
              } catch (err: any) {
                setConfirmDialog({
                  visible: true,
                  title: 'Placed Failed',
                  message: err?.message || 'Could not update stage to Placed.',
                  confirmLabel: 'OK',
                  intent: 'critical',
                  icon: <LuTriangleAlert size={20} color={tokens.error} />,
                  singleButton: true,
                  onConfirm: () => setConfirmDialog((prev) => ({ ...prev, visible: false })),
                });
              }
            }}
            style={({ pressed }) => ({
              flex: 1,
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

          {/* Right Side: SAVE Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save group status changes"
            disabled={!isDirty || isSaving}
            onPress={handleSave}
            style={({ pressed }) => ({
              flex: 1,
              height: 40,
              paddingHorizontal: 14,
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
              gap: 6,
              opacity: !isDirty ? 0.6 : 1,
            })}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={tokens.accent} />
            ) : (
              <>
                <LuCheck size={15} color={!isDirty ? tokens.textMuted : tokens.accent} />
                <Text
                  fontSize={12}
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
      </YStack>
      {/* ── Modern Design System Confirmation / Feedback Dialog ── */}
      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel || 'Cancel'}
        intent={confirmDialog.intent || 'info'}
        icon={confirmDialog.icon}
        singleButton={confirmDialog.singleButton ?? false}
        onConfirm={async () => {
          if (confirmDialog.onConfirm) {
            await confirmDialog.onConfirm();
          } else {
            setConfirmDialog((prev) => ({ ...prev, visible: false }));
          }
        }}
        onCancel={() => {
          confirmDialog.onCancel?.();
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
        }}
      />

      {/* ── Product Edit Sheet ── */}
      {editingItem && (
        <ProductEditSheet
          visible={Boolean(editingItem)}
          item={editingItem}
          isCod={isCod}
          onSaveItem={(updated) => {
            setGroupItems((prev) =>
              prev.map((it) => (it.id === updated.id ? { ...it, ...updated } : it))
            );
            onUpdateItem?.(updated.id, updated);
            setEditingItem(null);
          }}
          onDeleteItem={(deleted) => {
            setGroupItems((prev) => prev.filter((it) => it.id !== deleted.id));
            setEditingItem(null);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* ── Schedule Pickup Modal ── */}
      <SchedulePickupModal
        visible={showSchedulePickup}
        onDismiss={() => setShowSchedulePickup(false)}
        onSuccess={(pickupInfo) => {
          setShowSchedulePickup(false);
          if (pickupInfo) {
            setScheduledPickupInfo(pickupInfo);
          }
          if (orderGrpId) {
            logisticsService.getGroupShipments(orderGrpId).then((records) => {
              if (records && records.length > 0) {
                setShipmentHistories(records);
                updatePickupFromShipments(records, stagedAwb || awbNumber);
              }
            });
          }
        }}
        pickupLocation={auditData?.pickupFacility?.name || pickupFacilityName || warehouseAlias || vendorName || 'HYDERABAD'}
        warehouseId={(auditData?.pickupFacility as any)?.id}
        expectedPackageCount={1}
        orderGrpId={orderGrpId}
        awbNumber={stagedAwb || awbNumber}
        isReschedule={Boolean(scheduledPickupInfo)}
      />
    </YStack>
  );
}
