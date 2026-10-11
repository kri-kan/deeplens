import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { ZoomableImage } from '@/components/ui/ZoomableImage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import * as Clipboard from 'expo-clipboard';
import {
  LuX,
  LuArrowLeft,
  LuFileText,
  LuCheck,
  LuMapPin,
  LuTruck,
  LuBox,
  LuBuilding2,
  LuChevronDown,
  LuChevronRight,
  LuShare2,
  LuExternalLink,
  LuStar,
  LuReceipt,
  LuCalendar,
  LuCheckCircle2,
  LuClock,
  LuRefreshCw,
  LuMaximize2,
  LuZoomIn,
  LuPrinter,
  LuUser,
  LuStore,
} from '@/components/tamagui-ui/icons/lu';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { useTheme } from '@/theme';
import { logisticsService } from '@/services/logistics.service';
import { vendorService } from '@/services/vendorService';
import { searchApiClient } from '@/api/client';
import { Warehouse } from '@/types/logistics';
import { Image } from 'expo-image';
import { shareImageUri } from '@/utils/shareImage';
import {
  buildShippingLabelFileName,
  resolveWarehouseAlias,
} from '@/utils/shipping-label-helpers';
import { openPdfViewer } from '@/utils/viewPdf';
import { resolveLabelUrl, resolveLabelImageUrl } from '@/utils/api-config';
import { AddressData } from './GroupManagementView';
import { ConfirmDialog } from '@/components/tamagui-ui/molecules/ConfirmDialog';
import { SchedulePickupModal } from './SchedulePickupModal';
import { formatDelhiveryErrorMessage } from '@/utils/delhivery-error';

export interface SubmittedForwardOrderAudit {
  awbNumber: string;
  orderGrpId: string;
  orderId?: string;
  quantity?: number;
  productsDesc?: string;
  totalAmount?: number;
  submittedAt: string;
  pickupFacility: {
    code: string;
    name: string;
    alias?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  shippingMode: 'Surface' | 'Express';
  weightGrams: number;
  dimensionsCm: {
    length: number;
    width: number;
    height: number;
  };
  recipient: {
    name: string;
    phone: string;
    address: string;
    pincode: string;
    city?: string;
    state?: string;
  };
  paymentMode: 'COD' | 'Prepaid';
  collectibleAmount: number;
  sellerName?: string;
  sellerAddress?: string;
}

export interface ForwardOrderLabelModalProps {
  visible: boolean;
  onDismiss: () => void;
  orderGrpId: string;
  vendorName: string;
  itemsCount: number;
  isCod: boolean;
  groupTotal: number;
  address?: AddressData | null;
  awbNumber?: string;
  labelUrl?: string;
  initialAuditData?: SubmittedForwardOrderAudit | null;
  onSuccess: (data: {
    awbNumber: string;
    labelUrl: string;
    auditData: SubmittedForwardOrderAudit;
  }) => void;
  orderType?: string;
  resellerName?: string;
}

export function ForwardOrderLabelModal({
  visible,
  onDismiss,
  orderGrpId,
  vendorName,
  itemsCount,
  isCod,
  groupTotal,
  address,
  awbNumber: initialAwb,
  labelUrl: initialLabelUrl,
  initialAuditData = null,
  onSuccess,
  orderType = 'Customer',
  resellerName = '',
}: ForwardOrderLabelModalProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  // Mode: 'form' (editable inputs) vs 'pdf' (generated PDF + audit log)
  const hasInitialLabel = Boolean(initialLabelUrl);
  const [viewMode, setViewMode] = useState<'form' | 'pdf'>(
    hasInitialLabel ? 'pdf' : 'form'
  );

  // Logistics & Warehouses
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [showWarehousePicker, setShowWarehousePicker] = useState(false);

  // Editable Form Fields (Default values pre-filled)
  const [customOrderId, setCustomOrderId] = useState<string>(orderGrpId || '');
  const [quantity, setQuantity] = useState<string>((itemsCount || 1).toString());
  const [productDesc, setProductDesc] = useState<string>(
    vendorName && !vendorName.toLowerCase().includes('unassigned')
      ? `${vendorName} - (${itemsCount || 1} items)`
      : `Apparel - (${itemsCount || 1} items)`
  );
  const [totalAmount, setTotalAmount] = useState<string>(
    ((parseFloat(groupTotal as any) || 0) * 4).toString()
  );
  const [paymentMode, setPaymentMode] = useState<'COD' | 'Prepaid'>(
    isCod ? 'COD' : 'Prepaid'
  );
  const [shippingMode, setShippingMode] = useState<'Surface' | 'Express'>('Surface');
  const [weightGrams, setWeightGrams] = useState<string>(
    (Math.max(1, itemsCount) * 400).toString()
  );
  const [lengthCm, setLengthCm] = useState<string>('40');
  const [widthCm, setWidthCm] = useState<string>('25');
  const [heightCm, setHeightCm] = useState<string>('3');

  // Recipient Delivery Address Fields
  const [recipientName, setRecipientName] = useState<string>(address?.name || '');
  const [recipientPhone, setRecipientPhone] = useState<string>(address?.phone || '');
  const [recipientAddress, setRecipientAddress] = useState<string>(address?.address || '');
  const [recipientPincode, setRecipientPincode] = useState<string>(address?.pincode || '');
  const [recipientCity, setRecipientCity] = useState<string>(address?.city || '');
  const [recipientState, setRecipientState] = useState<string>(address?.state || '');
  const [codAmount, setCodAmount] = useState<string>(
    isCod ? (groupTotal || 0).toString() : '0'
  );

  // Helper to compute default Seller Name (on Label)
  const computeDefaultSellerName = (type?: string, rName?: string) => {
    if (type?.toLowerCase() === 'reseller') {
      return rName?.trim() ? `From: ${rName.trim()}` : '';
    }
    return 'From: VAYYARI Fashions';
  };

  // 5. Sender / Seller (on Label) state
  const [modalOrderType, setModalOrderType] = useState<'customer' | 'reseller'>(
    orderType?.toLowerCase() === 'reseller' ? 'reseller' : 'customer'
  );
  const [modalResellerName, setModalResellerName] = useState<string>(resellerName || '');
  const [sellerName, setSellerName] = useState<string>(
    computeDefaultSellerName(orderType, resellerName)
  );

  const handleToggleOrderType = (newType: 'customer' | 'reseller') => {
    setModalOrderType(newType);
    setSellerName(computeDefaultSellerName(newType, modalResellerName));
  };

  const handleChangeResellerName = (newName: string) => {
    setModalResellerName(newName);
    if (modalOrderType === 'reseller') {
      setSellerName(newName.trim() ? `From: ${newName.trim()}` : '');
    }
  };

  // Execution & Output state
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [generatedAwb, setGeneratedAwb] = useState<string>(initialAwb || '');
  const [generatedLabelUrl, setGeneratedLabelUrl] = useState<string>(initialLabelUrl || '');
  const [submittedAudit, setSubmittedAudit] = useState<SubmittedForwardOrderAudit | null>(
    initialAuditData
  );

  // Accordion toggle for non-editable audit form below PDF
  const [isAuditExpanded, setIsAuditExpanded] = useState<boolean>(false);
  const [copiedAwb, setCopiedAwb] = useState(false);
  const [showSchedulePickup, setShowSchedulePickup] = useState(false);
  const [scheduledPickupInfo, setScheduledPickupInfo] = useState<{
    pickupDate: string;
    pickupTime: string;
    pickupId?: string;
    displayInfo?: string;
  } | null>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [showFullPreviewModal, setShowFullPreviewModal] = useState(false);
  const [previewImageLoading, setPreviewImageLoading] = useState<boolean>(true);
  const [previewImageError, setPreviewImageError] = useState<boolean>(false);
  // Default aspect ratio for standard 4x6 thermal shipping label (width: 4, height: 6)
  const [labelAspectRatio, setLabelAspectRatio] = useState<number>(4 / 6);

  // Shipping Rate Estimation state
  const [estimating, setEstimating] = useState(false);
  const [estimateResult, setEstimateResult] = useState<{
    estimatedCostFormatted: string;
    estimatedDaysFormatted: string;
    zone: string;
  } | null>(null);

  // Design System Feedback Dialog
  const [feedbackDialog, setFeedbackDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    intent?: 'critical' | 'attention' | 'info' | 'success';
    singleButton?: boolean;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    if (visible) {
      if (initialLabelUrl) {
        setViewMode('pdf');
        setGeneratedAwb(initialAwb || '');
        setGeneratedLabelUrl(initialLabelUrl || '');
        setSubmittedAudit(initialAuditData);
      } else {
        setViewMode('form');
        setGeneratedAwb('');
        setGeneratedLabelUrl('');
        setSubmittedAudit(null);
        setEstimateResult(null);
        setCustomOrderId(orderGrpId || '');
        setQuantity((itemsCount || 1).toString());
        setProductDesc(
          vendorName && !vendorName.toLowerCase().includes('unassigned')
            ? `${vendorName} - (${itemsCount || 1} items)`
            : `Apparel - (${itemsCount || 1} items)`
        );
        setTotalAmount(((parseFloat(groupTotal as any) || 0) * 4).toString());
        setPaymentMode(isCod ? 'COD' : 'Prepaid');
        setWeightGrams((Math.max(1, itemsCount) * 400).toString());
        setCodAmount(isCod ? (groupTotal || 0).toString() : '0');
        if (address) {
          setRecipientName(address.name || '');
          setRecipientPhone(address.phone || '');
          setRecipientAddress(address.address || '');
          setRecipientPincode(address.pincode || '');
          setRecipientCity(address.city || '');
          setRecipientState(address.state || '');
        }

        const currentType = orderType?.toLowerCase() === 'reseller' ? 'reseller' : 'customer';
        const currentReseller = resellerName || '';
        setModalOrderType(currentType);
        setModalResellerName(currentReseller);
        setSellerName(computeDefaultSellerName(currentType, currentReseller));
      }
      loadWarehouses();
    }
  }, [visible, initialAwb, initialLabelUrl, itemsCount, isCod, groupTotal, address, vendorName, orderGrpId, orderType, resellerName]);

  useEffect(() => {
    let isMounted = true;
    if (orderGrpId && visible) {
      logisticsService.getGroupShipments(orderGrpId).then((shipments) => {
        if (!isMounted || !shipments || shipments.length === 0) return;
        const currentAwb = generatedAwb || initialAwb;
        const matched = currentAwb
          ? shipments.find((s) => s.awbNumber === currentAwb && s.status !== 'cancelled')
          : shipments.find((s) => s.status !== 'cancelled');

        const meta = matched?.metadata;
        if (meta && (meta.pickup_scheduled_date || meta.pickup_id)) {
          const pDate = meta.pickup_scheduled_date || '';
          const pTime = meta.pickup_slot || meta.pickup_scheduled_time || '';
          const pId = meta.pickup_id || '';
          setScheduledPickupInfo({
            pickupDate: pDate,
            pickupTime: pTime,
            pickupId: pId ? String(pId) : undefined,
            displayInfo: pDate && pTime ? `${pDate} • ${pTime}` : (pDate || pTime || 'Scheduled'),
          });
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [orderGrpId, visible, generatedAwb, initialAwb]);

  const sortWarehouses = (list: Warehouse[]): Warehouse[] => {
    return [...list].sort((a: Warehouse, b: Warehouse) => {
      if (Boolean(a.isStarred) !== Boolean(b.isStarred)) return a.isStarred ? -1 : 1;
      if (Boolean(a.isCentral) !== Boolean(b.isCentral)) return a.isCentral ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const loadWarehouses = async () => {
    try {
      setLoadingWarehouses(true);
      const [whList, vendorsData] = await Promise.all([
        logisticsService.getWarehouses().catch(() => []),
        vendorService.listVendors(1, 100).catch(() => ({ vendors: [] })),
      ]);

      const available = sortWarehouses(whList || []);
      setWarehouses(available);

      // Match vendor's default warehouse if vendor is present & assigned
      const isVendorAssigned = vendorName && !vendorName.toLowerCase().includes('unassigned');
      const matchedVendor = isVendorAssigned
        ? vendorsData.vendors?.find(
            (v: any) => v.vendorName?.trim().toLowerCase() === vendorName.trim().toLowerCase()
          )
        : null;

      let initialWh: Warehouse | undefined;
      if (matchedVendor?.defaultWarehouseId) {
        initialWh = available.find((w: Warehouse) => w.id === matchedVendor.defaultWarehouseId);
      }

      // If no vendor warehouse is assigned, default pickup to Hyderabad facility (e.g. Hyd apartment / HYD-APT / 502325),
      // prioritizing starred ones at the very top.
      if (!initialWh && available.length > 0) {
        const hydWh = available.find(
          (w: Warehouse) =>
            w.name?.toLowerCase().includes('hyd') ||
            w.code?.toLowerCase().includes('hyd') ||
            w.city?.toLowerCase().includes('hyderabad') ||
            w.pincode === '502325'
        );
        const starredWh = available.find((w: Warehouse) => w.isStarred);
        const centralWh = available.find((w: Warehouse) => w.isCentral);
        initialWh = hydWh || starredWh || centralWh || available[0];
      }

      if (initialWh) {
        setSelectedWarehouse(initialWh);
      } else {
        // Fallback default warehouse object
        setSelectedWarehouse({
          id: 'wh-central',
          code: 'HYD_CENTRAL',
          name: 'Hyderabad Central Fulfillment Hub',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500081',
          isCentral: true,
          isStarred: true,
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Failed to load warehouses for label modal:', err);
      setSelectedWarehouse({
        id: 'wh-central',
        code: 'HYD_CENTRAL',
        name: 'Hyderabad Central Fulfillment Hub',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
        isCentral: true,
        isStarred: true,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const handleToggleWarehouseStar = async (whId: string) => {
    try {
      const newStatus = await logisticsService.toggleWarehouseStar(whId);
      setWarehouses((prev) => {
        const updated = prev.map((w) => (w.id === whId ? { ...w, isStarred: newStatus } : w));
        return sortWarehouses(updated);
      });
      if (selectedWarehouse?.id === whId) {
        setSelectedWarehouse((prev) => (prev ? { ...prev, isStarred: newStatus } : prev));
      }
    } catch (err: any) {
      console.warn('Failed to toggle warehouse star:', err);
      setFeedbackDialog({
        visible: true,
        title: 'Error',
        message: err?.message || 'Could not toggle star status',
        intent: 'critical',
        singleButton: true,
      });
    }
  };

  const handleEstimateShipping = async () => {
    try {
      setEstimating(true);
      const parsedWeight = parseInt(weightGrams, 10) || (Math.max(1, itemsCount) * 400);
      const parsedCod = paymentMode === 'COD' ? parseFloat(codAmount) || groupTotal : 0;
      const res = await logisticsService.estimateShipping({
        originPincode: selectedWarehouse?.pincode || '502325',
        destinationPincode: recipientPincode.trim(),
        shippingMode,
        weightGrams: parsedWeight,
        paymentMode,
        codAmount: parsedCod,
      });
      setEstimateResult({
        estimatedCostFormatted: res.estimatedCostFormatted,
        estimatedDaysFormatted: res.estimatedDaysFormatted,
        zone: res.zone,
      });
    } catch (err: any) {
      console.warn('Failed to estimate shipping:', err);
    } finally {
      setEstimating(false);
    }
  };

  const handleCreateForwardOrder = async () => {
    const parsedWeight = parseInt(weightGrams, 10);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setFeedbackDialog({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a valid weight in grams.',
        intent: 'attention',
        singleButton: true,
      });
      return;
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setFeedbackDialog({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a valid items quantity.',
        intent: 'attention',
        singleButton: true,
      });
      return;
    }

    const parsedTotal = parseFloat(totalAmount);
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      setFeedbackDialog({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a valid total declared package amount.',
        intent: 'attention',
        singleButton: true,
      });
      return;
    }

    if (paymentMode === 'COD') {
      const parsedCod = parseFloat(codAmount);
      if (isNaN(parsedCod) || parsedCod <= 0) {
        setFeedbackDialog({
          visible: true,
          title: 'Validation Error',
          message: 'Please enter a valid COD collection amount.',
          intent: 'attention',
          singleButton: true,
        });
        return;
      }
    }

    if (!selectedWarehouse) {
      setFeedbackDialog({
        visible: true,
        title: 'Validation Error',
        message: 'Please select a pickup warehouse facility.',
        intent: 'attention',
        singleButton: true,
      });
      return;
    }

    if (!recipientAddress.trim() || !recipientPincode.trim()) {
      setFeedbackDialog({
        visible: true,
        title: 'Validation Error',
        message: 'Please specify customer delivery street address and pincode.',
        intent: 'attention',
        singleButton: true,
      });
      return;
    }

    try {
      setCreatingOrder(true);

      const requestPayload = {
        orderId: customOrderId.trim() || orderGrpId,
        quantity: parsedQty,
        productsDesc: productDesc.trim() || `${vendorName || 'Apparel'} (${parsedQty} items)`,
        totalAmount: parsedTotal,
        paymentMode: paymentMode === 'COD' ? 'COD' : 'Pre-paid',
        codAmount: paymentMode === 'COD' ? (parseFloat(codAmount) || 0) : 0,
        pickupLocation: selectedWarehouse.name,
        warehouseId: selectedWarehouse.id,
        warehouseCode: selectedWarehouse.code,
        shippingMode,
        weightGrams: parsedWeight,
        lengthCm: parseFloat(lengthCm) || 40.0,
        widthCm: parseFloat(widthCm) || 25.0,
        heightCm: parseFloat(heightCm) || 3.0,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        recipientAddress: recipientAddress.trim(),
        recipientPincode: recipientPincode.trim(),
        recipientCity: recipientCity.trim() || '',
        recipientState: recipientState.trim() || '',
        orderType: modalOrderType === 'reseller' ? 'Reseller' : 'Customer',
        resellerName: modalOrderType === 'reseller' ? (modalResellerName.trim() || undefined) : undefined,
        sellerName: sellerName.trim(),
        sellerAddress: '', // Sent as "" empty string behind the scenes so Delhivery does not print physical warehouse street address
      };

      const res: any = await searchApiClient.post(
        `/api/v1/orderid/groups/${orderGrpId}/label`,
        requestPayload
      );

      if (res?.awbNumber) {
        const awb = res.awbNumber;
        const pdfUrl = res.labelUrl || `https://delhivery.example.com/labels/${awb}.pdf`;

        const auditData: SubmittedForwardOrderAudit = {
          awbNumber: awb,
          orderGrpId,
          orderId: customOrderId.trim() || orderGrpId,
          quantity: parsedQty,
          productsDesc: productDesc.trim(),
          totalAmount: parsedTotal,
          submittedAt: new Date().toISOString(),
          pickupFacility: {
            code: selectedWarehouse.code,
            name: selectedWarehouse.name,
            alias: selectedWarehouse.alias,
            city: selectedWarehouse.city,
            state: selectedWarehouse.state,
            pincode: selectedWarehouse.pincode,
          },
          shippingMode,
          weightGrams: parsedWeight,
          dimensionsCm: {
            length: parseFloat(lengthCm) || 40.0,
            width: parseFloat(widthCm) || 25.0,
            height: parseFloat(heightCm) || 3.0,
          },
          recipient: {
            name: recipientName,
            phone: recipientPhone,
            address: recipientAddress,
            pincode: recipientPincode,
            city: recipientCity,
            state: recipientState,
          },
          paymentMode: paymentMode === 'COD' ? 'COD' : 'Prepaid',
          collectibleAmount: paymentMode === 'COD' ? (parseFloat(codAmount) || 0) : 0,
          sellerName: sellerName.trim(),
          sellerAddress: '',
        };

        setGeneratedAwb(awb);
        setGeneratedLabelUrl(pdfUrl);
        setSubmittedAudit(auditData);

        // Switch screen to PDF viewer in place of form
        setViewMode('pdf');

        onSuccess({
          awbNumber: awb,
          labelUrl: pdfUrl,
          auditData,
        });

        setFeedbackDialog({
          visible: true,
          title: 'Order Manifested Successfully',
          message: '',
          intent: 'success',
          confirmLabel: `Copy AWB: ${awb}`,
          singleButton: true,
          onConfirm: async () => {
            await Clipboard.setStringAsync(awb);
            setCopiedAwb(true);
            setTimeout(() => setCopiedAwb(false), 2000);
          },
        });
      } else {
        throw new Error(formatDelhiveryErrorMessage(res?.message || res?.error || 'Failed to manifest shipment with Delhivery'));
      }
    } catch (err: any) {
      console.error('Failed to create forward order:', err);
      const friendlyMessage = formatDelhiveryErrorMessage(err?.message || 'Could not manifest shipment with Delhivery.');
      setFeedbackDialog({
        visible: true,
        title: 'Order Creation Failed',
        message: friendlyMessage,
        intent: 'critical',
        confirmLabel: 'OK',
        singleButton: true,
      });
    } finally {
      setCreatingOrder(false);
    }
  };

  const activeAwb = (generatedAwb || initialAwb || '').trim();

  const handleCopyAwb = async () => {
    if (!activeAwb) return;
    await Clipboard.setStringAsync(activeAwb);
    setCopiedAwb(true);
    setTimeout(() => setCopiedAwb(false), 2000);
  };

  const rawLabelUrl =
    generatedLabelUrl ||
    initialLabelUrl ||
    (generatedAwb ? `labels/${generatedAwb}.pdf` : '');
  const resolvedPdfUrl = resolveLabelUrl(rawLabelUrl);
  const resolvedPreviewImageUrl = resolveLabelImageUrl(rawLabelUrl);

  useEffect(() => {
    setPreviewImageLoading(true);
    setPreviewImageError(false);
    setLabelAspectRatio(4 / 6);
  }, [resolvedPreviewImageUrl]);

  const handleOpenPdfViewer = async () => {
    if (!resolvedPdfUrl && !resolvedPreviewImageUrl) {
      setFeedbackDialog({
        visible: true,
        title: 'No Label Document',
        message: 'No PDF shipping label is attached to this order.',
        intent: 'attention',
        singleButton: true,
      });
      return;
    }
    if (Platform.OS === 'web') {
      window.open(resolvedPdfUrl, '_blank');
      return;
    }
    setShowFullPreviewModal(true);
  };

  const handleSharePdf = async () => {
    if (!resolvedPdfUrl) {
      setFeedbackDialog({
        visible: true,
        title: 'No Label Document',
        message: 'No PDF shipping label is attached to this order.',
        intent: 'attention',
        singleButton: true,
      });
      return;
    }

    const idToCopy = (orderGrpId || '').trim();
    if (idToCopy) {
      await Clipboard.setStringAsync(idToCopy);
    }

    const whAlias =
      submittedAudit?.pickupFacility?.alias ||
      selectedWarehouse?.alias ||
      (await resolveWarehouseAlias(vendorName, submittedAudit, selectedWarehouse));
    const custName =
      submittedAudit?.recipient?.name ||
      recipientName ||
      address?.name ||
      '';

    const customFilename = buildShippingLabelFileName(whAlias, custName, activeAwb);
    await shareImageUri(resolvedPdfUrl, customFilename, customFilename);
  };



  return (
    <YStack flex={1} backgroundColor={tokens.background} paddingTop={insets.top}>
      {/* ── Top Header Bar ── */}
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
            accessibilityLabel="Back to package details"
            onPress={onDismiss}
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
          <LuTruck size={20} color={tokens.accent} />
          <YStack flex={1}>
            <Text fontSize={15} fontWeight="800" color={tokens.text} numberOfLines={1}>
              {viewMode === 'form' ? 'Create Forward Order' : 'Delhivery Shipping Label'}
            </Text>
            <Text fontSize={11} color={tokens.textMuted} numberOfLines={1}>
              {orderGrpId} • {vendorName} ({itemsCount} {itemsCount === 1 ? 'item' : 'items'})
            </Text>
          </YStack>
        </XStack>
      </XStack>

        {/* ── Main Body Container ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: viewMode === 'pdf' ? 0 : 16,
            gap: viewMode === 'pdf' ? 12 : 16,
            paddingBottom: viewMode === 'pdf' ? insets.bottom + 100 : 60,
          }}
          showsVerticalScrollIndicator={false}
        >
          {viewMode === 'form' ? (
            /* ─────────────────────────────────────────────────────────────
               1. FORM VIEW: Default values filled & user editable
               ───────────────────────────────────────────────────────────── */
            <YStack gap={14}>
              {/* 1. Pickup Facility / Warehouse */}
              <YStack
                backgroundColor={tokens.surface}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                padding={14}
                gap={10}
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                    1. PICKUP FACILITY (DELHIVERY WAREHOUSE)
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Change pickup facility"
                    onPress={() => setShowWarehousePicker(true)}
                  >
                    <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                      CHANGE
                    </Text>
                  </Pressable>
                </XStack>

                {loadingWarehouses ? (
                  <ActivityIndicator size="small" color={tokens.accent} />
                ) : selectedWarehouse ? (
                  <YStack
                    backgroundColor={tokens.surfaceRaised}
                    borderRadius={tokens.radius.sm}
                    padding={10}
                    borderWidth={1}
                    borderColor={tokens.border}
                    gap={4}
                  >
                    <XStack alignItems="center" gap={8}>
                      <XStack
                        backgroundColor={`${tokens.accent}20`}
                        paddingHorizontal={6}
                        paddingVertical={2}
                        borderRadius={4}
                      >
                        <Text fontSize={10} fontWeight="900" color={tokens.accent}>
                          {selectedWarehouse.code}
                        </Text>
                      </XStack>
                      <Text fontSize={13} fontWeight="700" color={tokens.text} flex={1}>
                        {selectedWarehouse.name}
                      </Text>
                      {selectedWarehouse.alias ? (
                        <XStack
                          backgroundColor="#E0F2FE"
                          paddingHorizontal={6}
                          paddingVertical={2}
                          borderRadius={4}
                        >
                          <Text fontSize={9.5} fontWeight="700" color="#0369A1">
                            🏷️ {selectedWarehouse.alias}
                          </Text>
                        </XStack>
                      ) : null}
                    </XStack>
                    <Text fontSize={11} color={tokens.textMuted}>
                      {[selectedWarehouse.city, selectedWarehouse.state, selectedWarehouse.pincode]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  </YStack>
                ) : (
                  <Pressable
                    onPress={() => setShowWarehousePicker(true)}
                    style={{
                      padding: 12,
                      borderWidth: 1,
                      borderColor: tokens.border,
                      borderRadius: tokens.radius.sm,
                      alignItems: 'center',
                    }}
                  >
                    <Text fontSize={12} color={tokens.textMuted}>
                      Tap to select pickup warehouse
                    </Text>
                  </Pressable>
                )}
              </YStack>

              {/* 2. Payment Mode & Collectible Cash */}
              <YStack
                backgroundColor={tokens.surface}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                padding={14}
                gap={10}
              >
                <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                  2. PAYMENT & COLLECTIBLE CASH
                </Text>

                {/* Side-by-side row: Left half is Payment Mode buttons, Right half is COD Amount */}
                <XStack gap={10} alignItems="flex-start">
                  {/* Left half: Prepaid and COD buttons */}
                  <YStack flex={1} gap={4}>
                    <Text fontSize={10} fontWeight="700" color={tokens.textSecondary}>
                      Payment Mode
                    </Text>
                    <XStack gap={6} height={38}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setPaymentMode('Prepaid')}
                        style={({ pressed }) => ({
                          flex: 1,
                          borderRadius: tokens.radius.sm,
                          borderWidth: 1.5,
                          borderColor: paymentMode === 'Prepaid' ? '#15803D' : tokens.border,
                          backgroundColor: paymentMode === 'Prepaid' ? '#DCFCE7' : tokens.surfaceRaised,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text
                          fontSize={11}
                          fontWeight={paymentMode === 'Prepaid' ? '800' : '600'}
                          color={paymentMode === 'Prepaid' ? '#15803D' : tokens.text}
                        >
                          Prepaid
                        </Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setPaymentMode('COD')}
                        style={({ pressed }) => ({
                          flex: 1,
                          borderRadius: tokens.radius.sm,
                          borderWidth: 1.5,
                          borderColor: paymentMode === 'COD' ? '#B45309' : tokens.border,
                          backgroundColor: paymentMode === 'COD' ? '#FEF3C7' : tokens.surfaceRaised,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text
                          fontSize={11}
                          fontWeight={paymentMode === 'COD' ? '800' : '600'}
                          color={paymentMode === 'COD' ? '#B45309' : tokens.text}
                        >
                          COD
                        </Text>
                      </Pressable>
                    </XStack>
                  </YStack>

                  {/* Right half: COD Amount field */}
                  <YStack flex={1} gap={4}>
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize={10} fontWeight="700" color={tokens.textSecondary}>
                        COD Amount {paymentMode === 'COD' ? '*' : ''}
                      </Text>
                      {paymentMode === 'COD' && (
                        <Text fontSize={9} color="#B45309" fontWeight="700">
                          Mandatory
                        </Text>
                      )}
                    </XStack>

                    {paymentMode === 'COD' ? (
                      <XStack
                        height={38}
                        borderRadius={tokens.radius.sm}
                        borderWidth={1}
                        borderColor={tokens.border}
                        backgroundColor={tokens.background}
                        alignItems="center"
                        paddingHorizontal={8}
                      >
                        <Text fontSize={12} fontWeight="800" color={tokens.textMuted} marginRight={3}>
                          ₹
                        </Text>
                        <TextInput
                          value={codAmount}
                          onChangeText={setCodAmount}
                          keyboardType="numeric"
                          placeholder="Amount"
                          style={{
                            flex: 1,
                            fontSize: 12,
                            fontWeight: '800',
                            color: tokens.text,
                          }}
                        />
                      </XStack>
                    ) : (
                      <XStack
                        height={38}
                        borderRadius={tokens.radius.sm}
                        borderWidth={1}
                        borderColor={`${tokens.success}30`}
                        backgroundColor={`${tokens.success}10`}
                        alignItems="center"
                        paddingHorizontal={8}
                        gap={6}
                      >
                        <LuCheck size={13} color={tokens.success} />
                        <Text fontSize={11} fontWeight="700" color={tokens.success}>
                          ₹0 (Prepaid)
                        </Text>
                      </XStack>
                    )}
                  </YStack>
                </XStack>
              </YStack>

              {/* 3. Recipient Delivery Address */}
              <YStack
                backgroundColor={tokens.surface}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                padding={14}
                gap={10}
              >
                <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                  3. RECIPIENT DELIVERY ADDRESS
                </Text>

                <XStack gap={10}>
                  <YStack flex={1} gap={4}>
                    <Text fontSize={10} fontWeight="700" color={tokens.textSecondary}>
                      Customer Name
                    </Text>
                    <TextInput
                      value={recipientName}
                      onChangeText={setRecipientName}
                      placeholder="Customer Name"
                      style={{
                        height: 38,
                        borderRadius: tokens.radius.sm,
                        borderWidth: 1,
                        borderColor: tokens.border,
                        backgroundColor: tokens.background,
                        paddingHorizontal: 10,
                        fontSize: 12,
                        color: tokens.text,
                      }}
                    />
                  </YStack>

                  <YStack flex={1} gap={4}>
                    <Text fontSize={10} fontWeight="700" color={tokens.textSecondary}>
                      Phone Number
                    </Text>
                    <TextInput
                      value={recipientPhone}
                      onChangeText={setRecipientPhone}
                      placeholder="10-digit phone"
                      keyboardType="phone-pad"
                      style={{
                        height: 38,
                        borderRadius: tokens.radius.sm,
                        borderWidth: 1,
                        borderColor: tokens.border,
                        backgroundColor: tokens.background,
                        paddingHorizontal: 10,
                        fontSize: 12,
                        color: tokens.text,
                      }}
                    />
                  </YStack>
                </XStack>

                <YStack gap={4}>
                  <Text fontSize={10} fontWeight="700" color={tokens.textSecondary}>
                    Street Address & Landmarks
                  </Text>
                  <TextInput
                    value={recipientAddress}
                    onChangeText={setRecipientAddress}
                    placeholder="House / Flat, Street, Area"
                    multiline
                    style={{
                      height: 54,
                      borderRadius: tokens.radius.sm,
                      borderWidth: 1,
                      borderColor: tokens.border,
                      backgroundColor: tokens.background,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      fontSize: 12,
                      color: tokens.text,
                      textAlignVertical: 'top',
                    }}
                  />
                </YStack>

                <YStack gap={4}>
                  <Text fontSize={10} fontWeight="700" color={tokens.textSecondary}>
                    Pincode
                  </Text>
                  <TextInput
                    value={recipientPincode}
                    onChangeText={setRecipientPincode}
                    placeholder="6-digit PIN"
                    keyboardType="numeric"
                    style={{
                      height: 38,
                      borderRadius: tokens.radius.sm,
                      borderWidth: 1,
                      borderColor: tokens.border,
                      backgroundColor: tokens.background,
                      paddingHorizontal: 10,
                      fontSize: 12,
                      color: tokens.text,
                    }}
                  />
                </YStack>
              </YStack>

              {/* 4. Shipping Specifications */}
              <YStack
                backgroundColor={tokens.surface}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                padding={14}
                gap={12}
              >
                <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                  4. SHIPPING SPECIFICATIONS
                </Text>

                {/* Order ID */}
                <YStack gap={4}>
                  <Text fontSize={10} fontWeight="700" color={tokens.textSecondary}>
                    Order ID
                  </Text>
                  <TextInput
                    value={customOrderId}
                    onChangeText={setCustomOrderId}
                    placeholder="Order ID"
                    style={{
                      height: 38,
                      borderRadius: tokens.radius.sm,
                      borderWidth: 1,
                      borderColor: tokens.border,
                      backgroundColor: tokens.background,
                      paddingHorizontal: 10,
                      fontSize: 12,
                      fontWeight: '700',
                      color: tokens.text,
                    }}
                  />
                </YStack>

                {/* Quantity & Total Amount (4x declared liability value) */}
                <XStack gap={10}>
                  <YStack flex={1} gap={4}>
                    <Text fontSize={10} fontWeight="700" color={tokens.textSecondary}>
                      Quantity (Items)
                    </Text>
                    <TextInput
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="numeric"
                      placeholder="Qty"
                      style={{
                        height: 38,
                        borderRadius: tokens.radius.sm,
                        borderWidth: 1,
                        borderColor: tokens.border,
                        backgroundColor: tokens.background,
                        paddingHorizontal: 10,
                        fontSize: 12,
                        fontWeight: '700',
                        color: tokens.text,
                      }}
                    />
                  </YStack>

                  <YStack flex={1.5} gap={4}>
                    <XStack alignItems="center" justifyContent="space-between">
                      <Text fontSize={10} fontWeight="700" color={tokens.textSecondary}>
                        Total Amount (₹)
                      </Text>
                      <XStack
                        backgroundColor={`${tokens.accent}14`}
                        paddingHorizontal={5}
                        paddingVertical={1}
                        borderRadius={3}
                      >
                        <Text fontSize={9} fontWeight="800" color={tokens.accent}>
                          4× Transit Cover
                        </Text>
                      </XStack>
                    </XStack>
                    <TextInput
                      value={totalAmount}
                      onChangeText={setTotalAmount}
                      keyboardType="numeric"
                      placeholder="Total Amount"
                      style={{
                        height: 38,
                        borderRadius: tokens.radius.sm,
                        borderWidth: 1,
                        borderColor: tokens.border,
                        backgroundColor: tokens.background,
                        paddingHorizontal: 10,
                        fontSize: 12,
                        fontWeight: '700',
                        color: tokens.text,
                      }}
                    />
                  </YStack>
                </XStack>

                {/* Product Description */}
                <YStack gap={4}>
                  <Text fontSize={10} fontWeight="700" color={tokens.textSecondary}>
                    Product Description
                  </Text>
                  <TextInput
                    value={productDesc}
                    onChangeText={setProductDesc}
                    placeholder="e.g. Apparel / Saree"
                    style={{
                      height: 38,
                      borderRadius: tokens.radius.sm,
                      borderWidth: 1,
                      borderColor: tokens.border,
                      backgroundColor: tokens.background,
                      paddingHorizontal: 10,
                      fontSize: 12,
                      color: tokens.text,
                    }}
                  />
                </YStack>

                {/* Shipping Mode Selector */}
                <YStack gap={6}>
                  <Text fontSize={11} fontWeight="700" color={tokens.textSecondary}>
                    Shipping Mode
                  </Text>
                  <XStack gap={10}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setShippingMode('Surface')}
                      style={({ pressed }) => ({
                        flex: 1,
                        height: 38,
                        borderRadius: tokens.radius.sm,
                        borderWidth: 1.5,
                        borderColor: shippingMode === 'Surface' ? tokens.accent : tokens.border,
                        backgroundColor: shippingMode === 'Surface' ? `${tokens.accent}14` : tokens.surfaceRaised,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text
                        fontSize={12}
                        fontWeight={shippingMode === 'Surface' ? '800' : '600'}
                        color={shippingMode === 'Surface' ? tokens.accent : tokens.text}
                      >
                        Surface (Standard)
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setShippingMode('Express')}
                      style={({ pressed }) => ({
                        flex: 1,
                        height: 38,
                        borderRadius: tokens.radius.sm,
                        borderWidth: 1.5,
                        borderColor: shippingMode === 'Express' ? tokens.accent : tokens.border,
                        backgroundColor: shippingMode === 'Express' ? `${tokens.accent}14` : tokens.surfaceRaised,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text
                        fontSize={12}
                        fontWeight={shippingMode === 'Express' ? '800' : '600'}
                        color={shippingMode === 'Express' ? tokens.accent : tokens.text}
                      >
                        Express (Air)
                      </Text>
                    </Pressable>
                  </XStack>
                </YStack>

                {/* Package Weight & Box Dimensions */}
                <XStack gap={10}>
                  <YStack flex={1} gap={6}>
                    <Text fontSize={11} fontWeight="700" color={tokens.textSecondary}>
                      Weight (Grams)
                    </Text>
                    <XStack
                      height={40}
                      borderRadius={tokens.radius.sm}
                      borderWidth={1}
                      borderColor={tokens.border}
                      backgroundColor={tokens.background}
                      alignItems="center"
                      paddingHorizontal={10}
                    >
                      <TextInput
                        value={weightGrams}
                        onChangeText={setWeightGrams}
                        keyboardType="numeric"
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: '700',
                          color: tokens.text,
                        }}
                      />
                      <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                        g
                      </Text>
                    </XStack>
                    <Text fontSize={10} color={tokens.textMuted}>
                      Default: 400g × {itemsCount} items
                    </Text>
                  </YStack>

                  <YStack flex={1} gap={6}>
                    <Text fontSize={11} fontWeight="700" color={tokens.textSecondary}>
                      Box / Cover (L × W × H)
                    </Text>
                    <XStack gap={4} alignItems="center">
                      <TextInput
                        value={lengthCm}
                        onChangeText={setLengthCm}
                        keyboardType="numeric"
                        placeholder="L"
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: tokens.radius.sm,
                          borderWidth: 1,
                          borderColor: tokens.border,
                          backgroundColor: tokens.background,
                          fontSize: 12,
                          textAlign: 'center',
                          color: tokens.text,
                        }}
                      />
                      <Text fontSize={11} color={tokens.textMuted}>
                        ×
                      </Text>
                      <TextInput
                        value={widthCm}
                        onChangeText={setWidthCm}
                        keyboardType="numeric"
                        placeholder="W"
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: tokens.radius.sm,
                          borderWidth: 1,
                          borderColor: tokens.border,
                          backgroundColor: tokens.background,
                          fontSize: 12,
                          textAlign: 'center',
                          color: tokens.text,
                        }}
                      />
                      <Text fontSize={11} color={tokens.textMuted}>
                        ×
                      </Text>
                      <TextInput
                        value={heightCm}
                        onChangeText={setHeightCm}
                        keyboardType="numeric"
                        placeholder="H"
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: tokens.radius.sm,
                          borderWidth: 1,
                          borderColor: tokens.border,
                          backgroundColor: tokens.background,
                          fontSize: 12,
                          textAlign: 'center',
                          color: tokens.text,
                        }}
                      />
                    </XStack>
                    <Text fontSize={10} color={tokens.textMuted}>
                      Standard apparel flyer (cm)
                    </Text>
                  </YStack>
                </XStack>

                {/* Rate Estimation Row: Cost and Days on Left, Estimate Button on Right taking half-width */}
                <XStack
                  backgroundColor={tokens.surfaceRaised}
                  borderRadius={tokens.radius.sm}
                  borderWidth={1}
                  borderColor={tokens.border}
                  padding={10}
                  alignItems="center"
                  justifyContent="space-between"
                  gap={10}
                >
                  {/* Left half: Estimation Results (Cost & Days) */}
                  <YStack flex={1} gap={2} justifyContent="center">
                    {estimating ? (
                      <XStack alignItems="center" gap={6}>
                        <ActivityIndicator size="small" color={tokens.accent} />
                        <Text fontSize={11} color={tokens.textMuted}>
                          Estimating rate...
                        </Text>
                      </XStack>
                    ) : estimateResult ? (
                      <YStack gap={1}>
                        <XStack alignItems="baseline" gap={6}>
                          <Text fontSize={15} fontWeight="900" color={tokens.text}>
                            {estimateResult.estimatedCostFormatted}
                          </Text>
                          <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                            {estimateResult.estimatedDaysFormatted}
                          </Text>
                        </XStack>
                        <Text fontSize={9} color={tokens.textMuted}>
                          Delhivery {shippingMode} • {estimateResult.zone}
                        </Text>
                      </YStack>
                    ) : (
                      <YStack gap={1}>
                        <Text fontSize={11} fontWeight="700" color={tokens.text}>
                          Courier Rate Estimate
                        </Text>
                        <Text fontSize={10} color={tokens.textMuted}>
                          Est. charges & transit days
                        </Text>
                      </YStack>
                    )}
                  </YStack>

                  {/* Right half: Estimate Button taking half-width */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Calculate shipping rate estimate"
                    disabled={estimating}
                    onPress={handleEstimateShipping}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 38,
                      borderRadius: tokens.radius.sm,
                      borderWidth: 1.5,
                      borderColor: tokens.accent,
                      backgroundColor: pressed ? `${tokens.accent}25` : `${tokens.accent}12`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      opacity: estimating ? 0.7 : 1,
                    })}
                  >
                    <LuReceipt size={14} color={tokens.accent} />
                    <Text fontSize={11} fontWeight="800" color={tokens.accent} letterSpacing={0.3}>
                      {estimateResult ? 'RE-ESTIMATE' : 'ESTIMATE RATE'}
                    </Text>
                  </Pressable>
                </XStack>
              </YStack>

              {/* 5. Sender / Seller Specifications */}
              <YStack
                backgroundColor={tokens.surface}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                padding={14}
                gap={12}
              >
                <XStack alignItems="center" justifyContent="space-between">
                  <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                    5. SENDER / SELLER SPECIFICATIONS
                  </Text>
                  <XStack
                    backgroundColor={`${tokens.accent}14`}
                    paddingHorizontal={6}
                    paddingVertical={2}
                    borderRadius={tokens.radius.xs}
                  >
                    <Text fontSize={9} fontWeight="800" color={tokens.accent}>
                      ON LABEL
                    </Text>
                  </XStack>
                </XStack>

                {/* Order Type Segmented Toggle (Customer vs Reseller) */}
                <XStack
                  backgroundColor={tokens.surfaceRaised}
                  borderRadius={tokens.radius.sm}
                  borderWidth={1}
                  borderColor={tokens.border}
                  padding={3}
                  gap={4}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: modalOrderType === 'customer' }}
                    accessibilityLabel="Customer Order"
                    onPress={() => handleToggleOrderType('customer')}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 38,
                      borderRadius: tokens.radius.xs,
                      backgroundColor: modalOrderType === 'customer' ? tokens.surface : 'transparent',
                      borderWidth: modalOrderType === 'customer' ? 1.5 : 0,
                      borderColor: modalOrderType === 'customer' ? tokens.accent : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 7,
                      opacity: pressed ? 0.8 : 1,
                      ...(modalOrderType === 'customer'
                        ? {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.08,
                            shadowRadius: 2,
                            elevation: 1,
                          }
                        : {}),
                    })}
                  >
                    <LuUser size={15} color={modalOrderType === 'customer' ? tokens.accent : tokens.textMuted} />
                    <Text
                      fontSize={13}
                      fontWeight={modalOrderType === 'customer' ? '800' : '600'}
                      color={modalOrderType === 'customer' ? tokens.accent : tokens.textSecondary}
                      letterSpacing={0.2}
                    >
                      Customer
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: modalOrderType === 'reseller' }}
                    accessibilityLabel="Reseller Order"
                    onPress={() => handleToggleOrderType('reseller')}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 38,
                      borderRadius: tokens.radius.xs,
                      backgroundColor: modalOrderType === 'reseller' ? tokens.surface : 'transparent',
                      borderWidth: modalOrderType === 'reseller' ? 1.5 : 0,
                      borderColor: modalOrderType === 'reseller' ? tokens.warning : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 7,
                      opacity: pressed ? 0.8 : 1,
                      ...(modalOrderType === 'reseller'
                        ? {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.08,
                            shadowRadius: 2,
                            elevation: 1,
                          }
                        : {}),
                    })}
                  >
                    <LuStore size={15} color={modalOrderType === 'reseller' ? tokens.warning : tokens.textMuted} />
                    <Text
                      fontSize={13}
                      fontWeight={modalOrderType === 'reseller' ? '800' : '600'}
                      color={modalOrderType === 'reseller' ? tokens.warning : tokens.textSecondary}
                      letterSpacing={0.2}
                    >
                      Reseller
                    </Text>
                  </Pressable>
                </XStack>

                {/* If Reseller: Optional Reseller / Boutique Name Input */}
                {modalOrderType === 'reseller' && (
                  <YStack gap={4}>
                    <Text fontSize={10} fontWeight="700" color={tokens.textSecondary}>
                      Reseller / Boutique Name (Optional)
                    </Text>
                    <TextInput
                      value={modalResellerName}
                      onChangeText={handleChangeResellerName}
                      placeholder="e.g. Priya Silk Sarees (leave empty for blank sender)"
                      placeholderTextColor={tokens.textMuted}
                      style={{
                        height: 38,
                        borderRadius: tokens.radius.sm,
                        borderWidth: 1,
                        borderColor: tokens.border,
                        backgroundColor: tokens.background,
                        paddingHorizontal: 10,
                        fontSize: 12,
                        fontWeight: '700',
                        color: tokens.text,
                      }}
                    />
                  </YStack>
                )}
              </YStack>

              {/* Action Button: Create Forward Order */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create forward order with Delhivery"
                disabled={creatingOrder}
                onPress={handleCreateForwardOrder}
                style={({ pressed }) => ({
                  height: 48,
                  borderRadius: tokens.radius.sm,
                  backgroundColor: pressed ? `${tokens.accent}D0` : tokens.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  opacity: creatingOrder ? 0.7 : 1,
                  marginTop: 6,
                })}
              >
                {creatingOrder ? (
                  <ActivityIndicator size="small" color={tokens.accentForeground} />
                ) : (
                  <>
                    <LuTruck size={18} color={tokens.accentForeground} />
                    <Text
                      fontSize={14}
                      fontWeight="800"
                      color={tokens.accentForeground}
                      letterSpacing={0.5}
                    >
                      CREATE FORWARD ORDER
                    </Text>
                  </>
                )}
              </Pressable>
            </YStack>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               2. PDF & AUDIT VIEW: PDF in place of form + Collapsed Audit Form
               ───────────────────────────────────────────────────────────── */
            <YStack gap={16}>
              {/* ── PDF Shipping Label Preview Area (Full Screen Width) ── */}
              <YStack
                width="100%"
                backgroundColor="#FFFFFF"
                borderBottomWidth={1}
                borderBottomColor={tokens.border}
                overflow="hidden"
                gap={0}
              >
                {/* PDF Viewer / Interactive Embed Area */}
                <YStack
                  width="100%"
                  height={
                    Platform.OS === 'web' && resolvedPdfUrl
                      ? Math.max(520, Math.round(screenWidth * 1.45))
                      : Math.round(screenWidth / (labelAspectRatio || (4 / 6)))
                  }
                  backgroundColor="#FFFFFF"
                  alignItems="center"
                  justifyContent="center"
                  position="relative"
                  overflow="hidden"
                >
                  {/* Floating AWB Badge */}
                  {generatedAwb ? (
                    <XStack
                      position="absolute"
                      top={12}
                      right={12}
                      zIndex={3}
                      alignItems="center"
                      gap={4}
                      backgroundColor="rgba(15, 23, 42, 0.85)"
                      paddingHorizontal={10}
                      paddingVertical={5}
                      borderRadius={tokens.radius.sm}
                    >
                      <Text fontSize={10} fontWeight="700" color="#94A3B8">
                        AWB:
                      </Text>
                      <Text fontSize={12} fontWeight="900" color="#FFFFFF">
                        {generatedAwb}
                      </Text>
                    </XStack>
                  ) : null}
                  {Platform.OS === 'web' && resolvedPdfUrl ? (
                    <iframe
                      src={resolvedPdfUrl}
                      title="Delhivery Shipping Label"
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  ) : resolvedPreviewImageUrl ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Open Fullscreen Shipping Label Preview"
                      onPress={handleOpenPdfViewer}
                      style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {previewImageLoading && !previewImageError && (
                        <YStack
                          position="absolute"
                          top={0}
                          left={0}
                          right={0}
                          bottom={0}
                          alignItems="center"
                          justifyContent="center"
                          backgroundColor={tokens.surface}
                          gap={8}
                          zIndex={2}
                        >
                          <ActivityIndicator size="small" color={tokens.accent} />
                          <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                            Loading shipping label preview...
                          </Text>
                        </YStack>
                      )}

                      {previewImageError ? (
                        <YStack
                          width="100%"
                          height="100%"
                          alignItems="center"
                          justifyContent="center"
                          padding={16}
                          gap={10}
                          backgroundColor={tokens.surface}
                        >
                          <LuFileText size={36} color={tokens.textMuted} />
                          <Text fontSize={12} fontWeight="700" color={tokens.textSecondary} textAlign="center">
                            Label image preview unavailable
                          </Text>
                          <XStack gap={8}>
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                setPreviewImageError(false);
                                setPreviewImageLoading(true);
                              }}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: tokens.radius.sm,
                                backgroundColor: tokens.surfaceRaised,
                                borderWidth: 1,
                                borderColor: tokens.border,
                              }}
                            >
                              <Text fontSize={11} fontWeight="700" color={tokens.text}>
                                Retry Preview
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                handleSharePdf();
                              }}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: tokens.radius.sm,
                                backgroundColor: tokens.accent,
                              }}
                            >
                              <Text fontSize={11} fontWeight="700" color="#FFFFFF">
                                Open / Share PDF
                              </Text>
                            </Pressable>
                          </XStack>
                        </YStack>
                      ) : (
                        <Image
                          source={{ uri: resolvedPreviewImageUrl }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="fill"
                          onLoadStart={() => setPreviewImageLoading(true)}
                          onLoad={(e) => {
                            setPreviewImageLoading(false);
                            setPreviewImageError(false);
                            if (e?.source?.width && e?.source?.height) {
                              const calculatedRatio = e.source.width / e.source.height;
                              if (calculatedRatio > 0) {
                                setLabelAspectRatio(calculatedRatio);
                              }
                            }
                          }}
                          onError={() => {
                            setPreviewImageLoading(false);
                            setPreviewImageError(true);
                          }}
                        />
                      )}

                      {!previewImageError && !previewImageLoading && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Open Fullscreen Preview"
                          onPress={() => setShowFullPreviewModal(true)}
                          hitSlop={8}
                          style={({ pressed }) => ({
                            position: 'absolute',
                            bottom: 12,
                            right: 12,
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: pressed ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.82)',
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.25)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 3,
                            elevation: 4,
                          })}
                        >
                          <LuZoomIn size={18} color="#FFFFFF" />
                        </Pressable>
                      )}
                    </Pressable>
                  ) : (
                    <YStack alignItems="center" justifyContent="center" padding={20} gap={12} width="100%">
                      <YStack
                        width={64}
                        height={64}
                        borderRadius={32}
                        backgroundColor={`${tokens.accent}14`}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <LuFileText size={32} color={tokens.accent} />
                      </YStack>

                      <YStack alignItems="center" gap={4}>
                        <Text fontSize={15} fontWeight="800" color={tokens.text}>
                          Delhivery Thermal Label (PDF)
                        </Text>
                        <Text fontSize={11} color={tokens.textMuted} textAlign="center">
                          AWB #{generatedAwb} • 4×6 Barcode Standard
                        </Text>
                      </YStack>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Open PDF in Full Screen Viewer"
                        onPress={handleOpenPdfViewer}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: pressed ? `${tokens.accent}20` : `${tokens.accent}15`,
                          borderWidth: 1,
                          borderColor: tokens.accent,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: tokens.radius.sm,
                        })}
                      >
                        <LuExternalLink size={14} color={tokens.accent} />
                        <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                          Open PDF Viewer
                        </Text>
                      </Pressable>
                    </YStack>
                  )}
                </YStack>
              </YStack>

              {/* ─────────────────────────────────────────────────────────────
                 COLLAPSED NON-EDITABLE FORM FOR AUDIT PURPOSE (BELOW PDF)
                 ───────────────────────────────────────────────────────────── */}
              <YStack
                marginHorizontal={16}
                backgroundColor={tokens.surface}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                overflow="hidden"
              >
                {/* Accordion Header (Click to Toggle Collapse) */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Toggle audit log details"
                  onPress={() => setIsAuditExpanded((prev) => !prev)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    backgroundColor: pressed ? `${tokens.text}08` : tokens.surfaceRaised,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  })}
                >
                  <XStack alignItems="center" gap={8} flex={1}>
                    <Text fontSize={12} fontWeight="800" color={tokens.text}>
                      Submitted Order Details (Audit Log)
                    </Text>
                    <XStack
                      backgroundColor={`${tokens.textMuted}14`}
                      paddingHorizontal={6}
                      paddingVertical={2}
                      borderRadius={4}
                    >
                      <Text fontSize={9} fontWeight="800" color={tokens.textMuted}>
                        NON-EDITABLE
                      </Text>
                    </XStack>
                  </XStack>

                  <XStack alignItems="center" gap={4}>
                    <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                      {isAuditExpanded ? 'Hide' : 'Show Details'}
                    </Text>
                    {isAuditExpanded ? (
                      <LuChevronDown size={16} color={tokens.accent} />
                    ) : (
                      <LuChevronRight size={16} color={tokens.accent} />
                    )}
                  </XStack>
                </Pressable>

                {/* Collapsible Content: Structured Read-Only Submitted Fields */}
                {isAuditExpanded && (
                  <YStack padding={14} gap={12} borderTopWidth={1} borderTopColor={tokens.border}>
                    {/* Timestamp & AWB record */}
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize={11} color={tokens.textMuted}>
                        Submitted At:
                      </Text>
                      <Text fontSize={11} fontWeight="700" color={tokens.text}>
                        {submittedAudit?.submittedAt
                          ? new Date(submittedAudit.submittedAt).toLocaleString('en-IN')
                          : new Date().toLocaleString('en-IN')}
                      </Text>
                    </XStack>

                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize={11} color={tokens.textMuted}>
                        Order Group ID:
                      </Text>
                      <Text fontSize={11} fontWeight="700" color={tokens.text}>
                        {submittedAudit?.orderGrpId || orderGrpId}
                      </Text>
                    </XStack>

                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize={11} color={tokens.textMuted}>
                        Order ID:
                      </Text>
                      <Text fontSize={11} fontWeight="700" color={tokens.text}>
                        {submittedAudit?.orderId || customOrderId || orderGrpId}
                      </Text>
                    </XStack>

                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize={11} color={tokens.textMuted}>
                        Quantity & Declared Value:
                      </Text>
                      <Text fontSize={11} fontWeight="700" color={tokens.text}>
                        {submittedAudit?.quantity || quantity} items • ₹{submittedAudit?.totalAmount || totalAmount}
                      </Text>
                    </XStack>

                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize={11} color={tokens.textMuted}>
                        Product Description:
                      </Text>
                      <Text fontSize={11} fontWeight="700" color={tokens.text}>
                        {submittedAudit?.productsDesc || productDesc}
                      </Text>
                    </XStack>

                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize={11} color={tokens.textMuted}>
                        Carrier & Service:
                      </Text>
                      <Text fontSize={11} fontWeight="700" color={tokens.text}>
                        Delhivery ({submittedAudit?.shippingMode || shippingMode})
                      </Text>
                    </XStack>

                    {/* Pickup Warehouse */}
                    <YStack
                      backgroundColor={tokens.surfaceRaised}
                      padding={10}
                      borderRadius={tokens.radius.sm}
                      gap={2}
                    >
                      <Text fontSize={10} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                        Pickup Warehouse
                      </Text>
                      <Text fontSize={12} fontWeight="700" color={tokens.text}>
                        {submittedAudit?.pickupFacility?.name || selectedWarehouse?.name || 'N/A'} (
                        {submittedAudit?.pickupFacility?.code || selectedWarehouse?.code})
                      </Text>
                      <Text fontSize={11} color={tokens.textMuted}>
                        {[
                          submittedAudit?.pickupFacility?.city || selectedWarehouse?.city,
                          submittedAudit?.pickupFacility?.state || selectedWarehouse?.state,
                          submittedAudit?.pickupFacility?.pincode || selectedWarehouse?.pincode,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    </YStack>

                    {/* Weight & Dimensions */}
                    <XStack gap={10}>
                      <YStack
                        flex={1}
                        backgroundColor={tokens.surfaceRaised}
                        padding={10}
                        borderRadius={tokens.radius.sm}
                        gap={2}
                      >
                        <Text fontSize={10} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                          Manifested Weight
                        </Text>
                        <Text fontSize={12} fontWeight="700" color={tokens.text}>
                          {submittedAudit?.weightGrams || weightGrams} grams
                        </Text>
                      </YStack>

                      <YStack
                        flex={1}
                        backgroundColor={tokens.surfaceRaised}
                        padding={10}
                        borderRadius={tokens.radius.sm}
                        gap={2}
                      >
                        <Text fontSize={10} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                          Dimensions (L×W×H)
                        </Text>
                        <Text fontSize={12} fontWeight="700" color={tokens.text}>
                          {submittedAudit?.dimensionsCm
                            ? `${submittedAudit.dimensionsCm.length}×${submittedAudit.dimensionsCm.width}×${submittedAudit.dimensionsCm.height} cm`
                            : `${lengthCm}×${widthCm}×${heightCm} cm`}
                        </Text>
                      </YStack>
                    </XStack>

                    {/* Recipient Snapshot */}
                    <YStack
                      backgroundColor={tokens.surfaceRaised}
                      padding={10}
                      borderRadius={tokens.radius.sm}
                      gap={2}
                    >
                      <Text fontSize={10} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                        Recipient Delivery Destination
                      </Text>
                      <Text fontSize={12} fontWeight="700" color={tokens.text}>
                        {submittedAudit?.recipient?.name || recipientName} •{' '}
                        {submittedAudit?.recipient?.phone || recipientPhone}
                      </Text>
                      <Text fontSize={11} color={tokens.text}>
                        {submittedAudit?.recipient?.address || recipientAddress}
                      </Text>
                      <Text fontSize={11} color={tokens.textMuted}>
                        PIN:{' '}
                        {[
                          submittedAudit?.recipient?.pincode || recipientPincode,
                          submittedAudit?.recipient?.city || recipientCity,
                          submittedAudit?.recipient?.state || recipientState,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    </YStack>

                    {/* Payment Mode Snapshot */}
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize={11} color={tokens.textMuted}>
                        Payment & Collectible:
                      </Text>
                      <Text fontSize={12} fontWeight="800" color={tokens.text}>
                        {submittedAudit?.paymentMode || (paymentMode === 'COD' ? 'COD' : 'Prepaid')} (₹
                        {submittedAudit?.collectibleAmount ?? (paymentMode === 'COD' ? parseFloat(codAmount) || 0 : 0)})
                      </Text>
                    </XStack>
                  </YStack>
                )}
              </YStack>
            </YStack>
          )}
        </ScrollView>

        {/* ── Sticky Bottom Action Bar (PDF View Mode) ── */}
        {viewMode === 'pdf' && (
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
            paddingBottom={Math.max(insets.bottom, 12)}
            gap={10}
            shadowColor="#000"
            shadowOffset={{ width: 0, height: -2 }}
            shadowOpacity={0.08}
            shadowRadius={4}
            elevation={8}
          >
            {/* Row 1: Schedule Pickup CTA / Scheduled Status Banner */}
            {scheduledPickupInfo ? (
              <XStack
                paddingHorizontal={14}
                paddingVertical={8}
                borderRadius={tokens.radius.sm}
                borderWidth={1.5}
                borderColor="#16a34a"
                backgroundColor="#16a34a0D"
                alignItems="center"
                justifyContent="space-between"
              >
                <XStack alignItems="center" gap={10} flex={1}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: '#16a34a18',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LuCheckCircle2 size={16} color="#16a34a" />
                  </View>
                  <YStack gap={1} flex={1}>
                    <XStack alignItems="center" gap={6} flexWrap="wrap">
                      <Text fontSize={12} fontWeight="800" color="#16a34a" letterSpacing={0.3}>
                        PICKUP SCHEDULED
                      </Text>
                      {scheduledPickupInfo.pickupId ? (
                        <Text fontSize={10} fontWeight="700" color="#64748B">
                          #{scheduledPickupInfo.pickupId}
                        </Text>
                      ) : null}
                    </XStack>
                    <XStack alignItems="center" gap={4}>
                      <LuClock size={11} color="#64748B" />
                      <Text fontSize={11} fontWeight="600" color={tokens.textSecondary || '#475569'}>
                        {scheduledPickupInfo.displayInfo || `${scheduledPickupInfo.pickupDate} • ${scheduledPickupInfo.pickupTime}`}
                      </Text>
                    </XStack>
                  </YStack>
                </XStack>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reschedule Delhivery Pickup"
                  onPress={() => setShowSchedulePickup(true)}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: tokens.radius.xs || 4,
                    borderWidth: 1,
                    borderColor: tokens.accent,
                    backgroundColor: pressed ? `${tokens.accent}20` : `${tokens.accent}10`,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  })}
                >
                  <LuRefreshCw size={12} color={tokens.accent} />
                  <Text fontSize={11} fontWeight="800" color={tokens.accent} letterSpacing={0.3}>
                    RESCHEDULE
                  </Text>
                </Pressable>
              </XStack>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Schedule Delhivery Pickup"
                onPress={() => setShowSchedulePickup(true)}
                style={({ pressed }) => ({
                  height: 42,
                  borderRadius: tokens.radius.sm,
                  borderWidth: 1.5,
                  borderColor: tokens.accent,
                  backgroundColor: pressed ? `${tokens.accent}15` : `${tokens.accent}0A`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                })}
              >
                <LuCalendar size={16} color={tokens.accent} />
                <Text fontSize={12} fontWeight="800" color={tokens.accent} letterSpacing={0.5}>
                  SCHEDULE PICKUP
                </Text>
              </Pressable>
            )}

            {/* Row 2: Copy AWB + Share PDF */}
            <XStack gap={12} alignItems="center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copy AWB number"
                onPress={handleCopyAwb}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 44,
                  borderRadius: tokens.radius.sm,
                  borderWidth: 1.5,
                  borderColor: tokens.border,
                  backgroundColor: pressed ? `${tokens.text}10` : tokens.surfaceRaised,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                })}
              >
                <Text fontSize={12} fontWeight="800" color={tokens.text} numberOfLines={1}>
                  {copiedAwb
                    ? 'AWB COPIED ✓'
                    : activeAwb
                    ? `COPY AWB ${activeAwb}`
                    : 'COPY AWB'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share PDF shipping label"
                onPress={handleSharePdf}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 44,
                  borderRadius: tokens.radius.sm,
                  backgroundColor: pressed ? `${tokens.accent}D0` : tokens.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                })}
              >
                <LuShare2 size={16} color={tokens.accentForeground} />
                <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                  SHARE PDF
                </Text>
              </Pressable>
            </XStack>
          </YStack>
        )}

        {/* ── Sub-Modal: Pickup Warehouse Facility Picker ── */}
        {showWarehousePicker && (
          <Modal
            visible={showWarehousePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowWarehousePicker(false)}
          >
            <YStack
              flex={1}
              backgroundColor="rgba(0,0,0,0.5)"
              justifyContent="center"
              alignItems="center"
              padding={16}
            >
              <YStack
                width="100%"
                maxWidth={380}
                backgroundColor={tokens.background}
                borderRadius={tokens.radius.lg}
                borderWidth={1}
                borderColor={tokens.border}
                padding={16}
                gap={12}
                maxHeight="80%"
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={14} fontWeight="800" color={tokens.text}>
                    Select Pickup Warehouse
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setShowWarehousePicker(false)}
                    hitSlop={8}
                  >
                    <LuX size={16} color={tokens.textSecondary} />
                  </Pressable>
                </XStack>

                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  <YStack gap={8}>
                    {warehouses.map((wh) => {
                      const isSelected = selectedWarehouse?.id === wh.id;
                      return (
                        <Pressable
                          key={wh.id}
                          accessibilityRole="button"
                          onPress={() => {
                            setSelectedWarehouse(wh);
                            setShowWarehousePicker(false);
                          }}
                          style={({ pressed }) => ({
                            padding: 10,
                            borderRadius: tokens.radius.sm,
                            borderWidth: isSelected ? 1.5 : 1,
                            borderColor: isSelected ? tokens.accent : tokens.border,
                            backgroundColor: isSelected
                              ? `${tokens.accent}14`
                              : pressed
                              ? `${tokens.text}08`
                              : tokens.surfaceRaised,
                            gap: 4,
                          })}
                        >
                          <XStack alignItems="center" gap={6}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={wh.isStarred ? 'Unstar warehouse' : 'Star warehouse'}
                              hitSlop={8}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleToggleWarehouseStar(wh.id);
                              }}
                              style={{ padding: 2 }}
                            >
                              <LuStar
                                size={15}
                                color={wh.isStarred ? '#F59E0B' : tokens.textMuted}
                                filled={Boolean(wh.isStarred)}
                              />
                            </Pressable>
                            <XStack
                              backgroundColor={`${tokens.accent}20`}
                              paddingHorizontal={5}
                              paddingVertical={2}
                              borderRadius={3}
                            >
                              <Text fontSize={9} fontWeight="900" color={tokens.accent}>
                                {wh.code}
                              </Text>
                            </XStack>
                            <Text fontSize={12} fontWeight="700" color={tokens.text} flex={1}>
                              {wh.name}
                            </Text>
                            {wh.alias ? (
                              <XStack
                                backgroundColor="#E0F2FE"
                                paddingHorizontal={5}
                                paddingVertical={2}
                                borderRadius={3}
                              >
                                <Text fontSize={9} fontWeight="700" color="#0369A1">
                                  🏷️ {wh.alias}
                                </Text>
                              </XStack>
                            ) : null}
                            {wh.isCentral && (
                              <XStack
                                backgroundColor="#FEF3C7"
                                paddingHorizontal={5}
                                paddingVertical={2}
                                borderRadius={3}
                              >
                                <Text fontSize={8} fontWeight="900" color="#B45309">
                                  CENTRAL
                                </Text>
                              </XStack>
                            )}
                          </XStack>
                          <Text fontSize={10} color={tokens.textMuted}>
                            {[wh.city, wh.state, wh.pincode].filter(Boolean).join(', ')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </YStack>
                </ScrollView>
              </YStack>
            </YStack>
          </Modal>
        )}

        {/* ── Fullscreen Shipping Label Preview (Pan & Zoom Image, Dismiss on Back) ── */}
        <Modal
          visible={showFullPreviewModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFullPreviewModal(false)}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <YStack flex={1} backgroundColor="rgba(0, 0, 0, 0.95)" position="relative">
              {/* Floating Back / Dismiss Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={() => setShowFullPreviewModal(false)}
                hitSlop={14}
                style={({ pressed }) => ({
                  position: 'absolute',
                  top: Math.max(insets.top + 12, 24),
                  left: 16,
                  zIndex: 20,
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.75)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                })}
              >
                <LuArrowLeft size={22} color="#FFFFFF" />
              </Pressable>

              {/* Floating Share PDF Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share PDF"
                onPress={handleSharePdf}
                hitSlop={14}
                style={({ pressed }) => ({
                  position: 'absolute',
                  top: Math.max(insets.top + 12, 24),
                  right: 16,
                  zIndex: 20,
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.75)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                })}
              >
                <LuShare2 size={18} color="#FFFFFF" />
              </Pressable>

              {/* Immersive Pan & Zoom Image Canvas */}
              <YStack flex={1} alignItems="center" justifyContent="center">
                {resolvedPreviewImageUrl ? (
                  <ZoomableImage
                    uri={resolvedPreviewImageUrl}
                    containerWidth={Dimensions.get('window').width}
                    containerHeight={Dimensions.get('window').height}
                    contentFit="contain"
                    isActive={showFullPreviewModal}
                  />
                ) : (
                  <YStack alignItems="center" justifyContent="center" gap={12}>
                    <LuFileText size={48} color="#94A3B8" />
                    <Text fontSize={14} color="#94A3B8">
                      Preview unavailable
                    </Text>
                  </YStack>
                )}
              </YStack>
            </YStack>
          </GestureHandlerRootView>
        </Modal>

        {/* ── Schedule Pickup Modal ── */}
        <SchedulePickupModal
          visible={showSchedulePickup}
          onDismiss={() => setShowSchedulePickup(false)}
          onSuccess={(pickupInfo) => {
            setShowSchedulePickup(false);
            if (pickupInfo) {
              setScheduledPickupInfo(pickupInfo);
            }
          }}
          pickupLocation={selectedWarehouse?.name || 'HYDERABAD'}
          warehouseId={selectedWarehouse?.id}
          warehouseCode={selectedWarehouse?.code}
          expectedPackageCount={1}
          orderGrpId={orderGrpId}
          awbNumber={generatedAwb || initialAwb}
          isReschedule={Boolean(scheduledPickupInfo)}
        />

        {/* ── Design System Feedback Dialog (Success, Validation & Error) ── */}
        <ConfirmDialog
          visible={feedbackDialog.visible}
          title={feedbackDialog.title}
          message={feedbackDialog.message}
          confirmLabel={feedbackDialog.confirmLabel || 'OK'}
          intent={feedbackDialog.intent || 'info'}
          singleButton={feedbackDialog.singleButton ?? true}
          dismissOnBackdropPress={true}
          onConfirm={async () => {
            if (feedbackDialog.onConfirm) await feedbackDialog.onConfirm();
            setFeedbackDialog((prev) => ({ ...prev, visible: false }));
          }}
          onCancel={() => setFeedbackDialog((prev) => ({ ...prev, visible: false }))}
        />
      </YStack>
  );
}
