import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Pressable,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { searchApiClient } from '@/api/client';
import { logisticsService } from '@/services/logistics.service';
import { API_ROUTES } from '@/constants/api-routes';
import {
  OrderIdEntry,
  OrderGroup,
  OrderUpdateRequest,
} from '@/types/orders';

import { DetailHeader } from '@/components/tamagui-ui/molecules/DetailHeader';
import { SourceRow, OrderSource, PaymentType } from '@/components/tamagui-ui/molecules/SourceRow';
import { ConfirmDialog } from '@/components/tamagui-ui/molecules/ConfirmDialog';
import { TransactionReceiptSection } from '@/components/tamagui-ui/molecules/TransactionReceiptSection';
import { ProductListSection, OrderItem } from '@/components/tamagui-ui/organisms/ProductListSection';
import { GroupManagementView } from '@/components/tamagui-ui/organisms/GroupManagementView';
import { ProductEditSheet } from '@/components/tamagui-ui/organisms/ProductEditSheet';
import { QuickPickerSheet } from '@/components/tamagui-ui/molecules/QuickPickerSheet';
import { AddressCard, AddressSheet, AddressData } from './AdminOrderCreateForm';
import { LuX, LuCheck, LuCheckCircle2 } from '@/components/tamagui-ui/icons/lu';

export interface AdminOrderDetailViewProps {
  orderId: string;
  onBack?: () => void;
  showCreatedSnackbar?: boolean;
}

export const AdminOrderDetailView: React.FC<AdminOrderDetailViewProps> = ({
  orderId,
  onBack,
  showCreatedSnackbar = false,
}) => {
  const { tokens } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orderData, setOrderData] = useState<OrderIdEntry | null>(null);

  const [snackbarVisible, setSnackbarVisible] = useState<boolean>(Boolean(showCreatedSnackbar));
  const [snackbarMessage, setSnackbarMessage] = useState<string>(
    `Order #${orderId} created & ID copied to clipboard!`
  );

  useEffect(() => {
    if (snackbarVisible) {
      const timer = setTimeout(() => {
        setSnackbarVisible(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [snackbarVisible]);

  // Mapped mock/real state
  const [createdAt, setCreatedAt] = useState<string | Date>(new Date());
  const [source, setSource] = useState<OrderSource>(null);
  const [sourceContact, setSourceContact] = useState<string>('');
  const [paymentType, setPaymentType] = useState<PaymentType>('cod');
  const [products, setProducts] = useState<OrderItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [address, setAddress] = useState<AddressData | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [groupStages, setGroupStages] = useState<Record<string, string>>({});
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);

  // Sheets & dialogs
  const [activeItem, setActiveItem] = useState<OrderItem | null>(null);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [pickerState, setPickerState] = useState<{
    visible: boolean;
    type: 'size' | 'qty';
    itemId: string;
    currentValue: string;
  }>({
    visible: false,
    type: 'size',
    itemId: '',
    currentValue: '',
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    type: 'single' | 'batch' | 'deleteOrder';
    targetId?: string;
    title: string;
    message: string;
    confirmLabel: string;
  }>({
    visible: false,
    type: 'single',
    title: '',
    message: '',
    confirmLabel: '',
  });

  // Load order data
  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await searchApiClient.get<OrderIdEntry>(API_ROUTES.ORDERS.GET_BY_ID(orderId));
      if (res) {
        setOrderData(res);
        setCreatedAt(res.timestamp ? new Date(res.timestamp) : new Date());

        const srcLower = String(res.source || '').toLowerCase();
        if (srcLower === 'instagram') {
          setSource('instagram');
        } else if (srcLower === 'whatsapp') {
          setSource('whatsapp');
        } else {
          setSource(null);
        }

        const resolvedContact =
          srcLower === 'whatsapp'
            ? (res.customerPhone || res.sourceHandle || '')
            : srcLower === 'instagram'
            ? (res.sourceHandle || res.instagramHandle || '')
            : (res.sourceHandle || res.customerPhone || '');
        setSourceContact(resolvedContact);
        setPaymentType(res.paymentMode === 'Prepaid' ? 'prepaid' : 'cod');

        // Products mapping - strict canonical binding
        if (res.items && res.items.length > 0) {
          setProducts(
            res.items.map((it: any, idx: number) => {
              let parsedMeta: any = {};
              if (it.comments) {
                try {
                  parsedMeta = JSON.parse(it.comments);
                } catch {
                  if (typeof it.comments === 'string' && it.comments.startsWith('http')) {
                    parsedMeta = { catalogImageUrl: it.comments, image: it.comments };
                  }
                }
              }
              const photo = parsedMeta.photoUri || parsedMeta.image || parsedMeta.catalogImageUrl;
              const catalogImg = parsedMeta.catalogImageUrl || (it.productId ? parsedMeta.image : undefined);
              const rawVendor = (parsedMeta.vendor || it.vendorName || (it.vendorId ? String(it.vendorId) : '')).trim();
              const resolvedVendor = (!rawVendor || rawVendor.toLowerCase() === 'unassigned' || rawVendor.toLowerCase() === 'none') ? '' : rawVendor;

              return {
                id: it.id ? String(it.id) : `item-${idx}`,
                productId: it.productId ?? '',
                title: it.productTitle ?? '',
                size: 'Free Size',
                quantity: it.quantity ?? 1,
                costPerPiece: it.unitPrice ?? 0,
                codChargePerPiece: 0,
                amountPaid: 0,
                vendor: resolvedVendor,
                imageColor: '#f0e6d3',
                photoUri: parsedMeta.photoUri,
                catalogImageUrl: catalogImg,
                image: photo,
                attachmentId: parsedMeta.attachmentId || (it.attachments && it.attachments[0]?.id),
                storagePath: parsedMeta.storagePath || (it.attachments && it.attachments[0]?.key),
              };
            })
          );
        } else {
          setProducts([]);
        }

        // Group stages mapping from server order groups
        if (res.groups && res.groups.length > 0) {
          const stagesMap: Record<string, string> = {};
          for (const g of res.groups) {
            const rawV = (g.vendorName || '').trim();
            const isUn = !rawV || rawV.toLowerCase() === 'unassigned' || rawV.toLowerCase() === 'none';
            const k = isUn ? 'Unassigned' : rawV;
            stagesMap[k] = g.status || 'Unconfirmed';
          }
          setGroupStages(stagesMap);
        }

        // Address mapping
        if (res.customerAddress || res.shippingStreet) {
          setAddress({
            name: res.customerName || 'Customer',
            phone: res.customerPhone || res.sourceHandle || '',
            address: res.shippingStreet || res.customerAddress || '',
            pincode: res.shippingPincode || '',
            city: res.shippingCity,
            state: res.shippingState,
            isDelhiveryServiceable: res.isServiceable,
          });
        }

        setTransactionId(res.transactionId || '');
        if (res.attachments && res.attachments.length > 0) {
          setReceiptUrl(res.attachments[0].key || null);
        }
      }
    } catch (err: any) {
      console.error('Failed to load order details:', err);
      Alert.alert('Load Error', 'Could not load order information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const distinctGroupKeys = React.useMemo(() => {
    return Array.from(
      new Set(
        products.map((p) => {
          const raw = (p.vendor || '').trim();
          const isUn = !raw || raw.toLowerCase() === 'unassigned' || raw.toLowerCase() === 'none';
          return isUn ? 'Unassigned' : raw;
        })
      )
    );
  }, [products]);

  const groupLabelInfo = React.useMemo(() => {
    const map: Record<string, { orderGrpId?: string; needLabel?: boolean; awbNumber?: string; labelUrl?: string }> = {};
    if (orderData?.groups) {
      for (const g of orderData.groups) {
        const rawV = (g.vendorName || '').trim();
        const isUn = !rawV || rawV.toLowerCase() === 'unassigned' || rawV.toLowerCase() === 'none';
        const k = isUn ? 'Unassigned' : rawV;
        map[k] = {
          orderGrpId: g.orderGrpId,
          needLabel: g.needLabel ?? (paymentType === 'cod'),
          awbNumber: g.awbNumber,
          labelUrl: g.labelUrl,
        };
      }
    }
    return map;
  }, [orderData?.groups, paymentType]);

  const lockedVendorKeys = React.useMemo(() => {
    return distinctGroupKeys.filter((groupKey) => {
      const info = groupLabelInfo[groupKey];
      const isLabelNeeded = info?.needLabel ?? (paymentType === 'cod');
      const hasLabel = Boolean(info?.labelUrl || info?.awbNumber);
      const stage = (groupStages[groupKey] || 'Unconfirmed').toLowerCase();

      if (isLabelNeeded) {
        return hasLabel;
      } else {
        return stage === 'placed' || stage === 'delivered';
      }
    });
  }, [distinctGroupKeys, groupLabelInfo, paymentType, groupStages]);

  // Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedItemIds.length === products.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(products.map((p) => p.id));
    }
  };

  const handleBatchDelete = () => {
    const lockedSelected = products.filter((p) => {
      if (!selectedItemIds.map(String).includes(String(p.id))) return false;
      const raw = (p.vendor || '').trim();
      const groupKey = (!raw || raw.toLowerCase() === 'unassigned' || raw.toLowerCase() === 'none') ? 'Unassigned' : raw;
      return lockedVendorKeys.includes(groupKey);
    });

    if (lockedSelected.length > 0) {
      Alert.alert(
        'Package Locked',
        'One or more selected items belong to locked packages (shipping label generated or placed/delivered) and cannot be deleted.'
      );
      return;
    }

    setConfirmDialog({
      visible: true,
      type: 'batch',
      title: `Delete ${selectedItemIds.length} Items?`,
      message: `Are you sure you want to remove ${selectedItemIds.length} selected items from this order?`,
      confirmLabel: `Delete (${selectedItemIds.length})`,
    });
  };

  const persistOrderItems = async (itemsList: OrderItem[], stagesOverride?: Record<string, string>) => {
    try {
      const activeStages = stagesOverride || groupStages;

      // Group keys: each distinct vendor name or 'Unassigned'
      const distinctGroupKeys = Array.from(
        new Set(
          itemsList.map((p) => {
            const raw = (p.vendor || '').trim();
            const isUn = !raw || raw.toLowerCase() === 'unassigned' || raw.toLowerCase() === 'none';
            return isUn ? 'Unassigned' : raw;
          })
        )
      );

      const groupsPayload: OrderGroup[] = distinctGroupKeys.map((vName, idx) => ({
        orderGrpId: `${orderId}-G${idx + 1}`,
        orderId: orderId,
        vendorName: vName,
        status: activeStages[vName] || 'Unconfirmed',
        needLabel: paymentType === 'cod',
      }));

      const updatePayload: Partial<OrderUpdateRequest> = {
        source: source === 'whatsapp' ? 'WhatsApp' : source === 'instagram' ? 'Instagram' : 'None',
        sourceHandle: sourceContact || undefined,
        paymentMode: paymentType === 'cod' ? 'COD' : 'Prepaid',
        customerName: address?.name,
        customerPhone: address?.phone,
        customerAddress: address?.address,
        shippingStreet: address?.address,
        shippingPincode: address?.pincode,
        shippingCity: address?.city,
        shippingState: address?.state,
        transactionId: transactionId || undefined,
        groups: groupsPayload,
        items: itemsList.map((p) => {
          const meta = (p.catalogImageUrl || p.photoUri || p.image || p.attachmentId || p.storagePath || p.vendor)
            ? JSON.stringify({
                catalogImageUrl: p.catalogImageUrl,
                photoUri: p.photoUri,
                image: p.image || p.catalogImageUrl || p.photoUri,
                attachmentId: p.attachmentId,
                storagePath: p.storagePath,
                vendor: p.vendor,
              })
            : undefined;

          return {
            productId: p.productId,
            productTitle: p.title,
            quantity: p.quantity,
            unitPrice: p.costPerPiece,
            subtotal: p.costPerPiece * p.quantity,
            comments: meta,
            vendorName: p.vendor,
          };
        }),
      };

      await searchApiClient.put(API_ROUTES.ORDERS.UPDATE(orderId), updatePayload);
    } catch (err: any) {
      console.error('Failed to persist order items:', err);
      Alert.alert('Save Warning', 'Could not persist item changes to server. Tap SAVE to retry.');
    }
  };

  const handleUpdateGroupStage = (groupKey: string, newStage: string) => {
    const updatedStages = { ...groupStages, [groupKey]: newStage };
    setGroupStages(updatedStages);
    persistOrderItems(products, updatedStages);
  };

  const handleAddProduct = () => {
    const draftItem: OrderItem = {
      id: `item-${Date.now()}`,
      productId: '',
      title: '',
      size: 'Free Size',
      quantity: 1,
      costPerPiece: 0,
      codChargePerPiece: paymentType === 'cod' ? 50 : 0,
      amountPaid: 0,
      vendor: '',
      imageColor: '#f0e6d3',
    };
    setActiveItem(draftItem);
    setProductSheetOpen(true);
  };

  const handleEditProduct = (item: OrderItem) => {
    setActiveItem(item);
    setProductSheetOpen(true);
  };

  const handleSaveItem = async (updated: OrderItem) => {
    const existingIndex = products.findIndex((p) => p.id === updated.id);
    const existingItem = existingIndex >= 0 ? products[existingIndex] : null;

    const oldRaw = (existingItem?.vendor || '').trim();
    const oldGroup = (!oldRaw || oldRaw.toLowerCase() === 'unassigned' || oldRaw.toLowerCase() === 'none') ? 'Unassigned' : oldRaw;

    const newRaw = (updated.vendor || '').trim();
    const newGroup = (!newRaw || newRaw.toLowerCase() === 'unassigned' || newRaw.toLowerCase() === 'none') ? 'Unassigned' : newRaw;

    if (oldGroup !== newGroup && lockedVendorKeys.includes(newGroup)) {
      Alert.alert(
        'Package Locked',
        `Cannot assign items to package "${newGroup}". It is already locked.`
      );
      return;
    }

    if (existingItem && oldGroup !== newGroup && lockedVendorKeys.includes(oldGroup)) {
      Alert.alert(
        'Package Locked',
        `Cannot move items out of package "${oldGroup}". It is already locked.`
      );
      return;
    }

    let nextProducts: OrderItem[];
    if (existingIndex >= 0) {
      nextProducts = products.map((p) => (p.id === updated.id ? updated : p));
    } else {
      nextProducts = [...products, updated];
    }
    setProducts(nextProducts);
    setProductSheetOpen(false);
    setActiveItem(null);
    await persistOrderItems(nextProducts);
  };

  const handleUpdateItem = async (id: string, updates: Partial<OrderItem>) => {
    const updated = products.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setProducts(updated);
    await persistOrderItems(updated);
  };

  const handleOpenPicker = (item: OrderItem, type: 'size' | 'qty') => {
    setPickerState({
      visible: true,
      type,
      itemId: item.id,
      currentValue: type === 'size' ? item.size || 'Free Size' : String(item.quantity),
    });
  };

  const handleSelectPickerOption = async (value: string) => {
    const updated = products.map((item) => {
      if (item.id !== pickerState.itemId) return item;
      if (pickerState.type === 'size') return { ...item, size: value };
      if (pickerState.type === 'qty') return { ...item, quantity: parseInt(value, 10) || 1 };
      return item;
    });
    setProducts(updated);
    setPickerState((prev) => ({ ...prev, visible: false }));
    await persistOrderItems(updated);
  };

  const handleUploadReceipt = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setReceiptUrl(res.assets[0].uri);
      }
    } catch (e) {
      console.warn('Receipt picker error:', e);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptUrl(null);
  };

  // Save or confirm full order changes to backend
  const handleSaveOrder = async (confirmAll: boolean = false) => {
    if (confirmAll && products.length === 0) {
      Alert.alert('Empty Order', 'Please add at least one item before confirming the order.');
      return;
    }
    setSaving(true);
    try {
      const distinctGroupKeys = Array.from(
        new Set(
          products.map((p) => {
            const raw = (p.vendor || '').trim();
            const isUn = !raw || raw.toLowerCase() === 'unassigned' || raw.toLowerCase() === 'none';
            return isUn ? 'Unassigned' : raw;
          })
        )
      );

      let activeGroupStages = { ...groupStages };
      if (confirmAll) {
        distinctGroupKeys.forEach((k) => {
          const cur = (activeGroupStages[k] || 'Unconfirmed').toLowerCase();
          if (cur === 'unconfirmed' || cur === 'unformed') {
            activeGroupStages[k] = 'Confirmed';
          }
        });
        setGroupStages(activeGroupStages);
      }

      const groupsPayload: OrderGroup[] = distinctGroupKeys.map((vName, idx) => ({
        orderGrpId: `${orderId}-G${idx + 1}`,
        orderId: orderId,
        vendorName: vName,
        status: activeGroupStages[vName] || (confirmAll ? 'Confirmed' : 'Unconfirmed'),
        needLabel: paymentType === 'cod',
      }));

      const updatePayload: Partial<OrderUpdateRequest> = {
        source: source === 'whatsapp' ? 'WhatsApp' : source === 'instagram' ? 'Instagram' : 'None',
        sourceHandle: sourceContact || undefined,
        paymentMode: paymentType === 'cod' ? 'COD' : 'Prepaid',
        customerName: address?.name,
        customerPhone: address?.phone,
        customerAddress: address?.address,
        shippingStreet: address?.address,
        shippingPincode: address?.pincode,
        shippingCity: address?.city,
        shippingState: address?.state,
        transactionId: transactionId || undefined,
        groups: groupsPayload,
        items: products.map((p) => {
          const meta = (p.catalogImageUrl || p.photoUri || p.image || p.attachmentId || p.storagePath || p.vendor)
            ? JSON.stringify({
                catalogImageUrl: p.catalogImageUrl,
                photoUri: p.photoUri,
                image: p.image || p.catalogImageUrl || p.photoUri,
                attachmentId: p.attachmentId,
                storagePath: p.storagePath,
                vendor: p.vendor,
              })
            : undefined;

          return {
            productId: p.productId,
            productTitle: p.title,
            quantity: p.quantity,
            unitPrice: p.costPerPiece,
            subtotal: p.costPerPiece * p.quantity,
            comments: meta,
            vendorName: p.vendor,
          };
        }),
      };

      await searchApiClient.put(API_ROUTES.ORDERS.UPDATE(orderId), updatePayload);

      if (confirmAll) {
        await searchApiClient.post(API_ROUTES.ORDERS.CONFIRM(orderId), {});
        if (orderData) {
          setOrderData({ ...orderData, status: 'Confirmed' });
        }
        setSnackbarMessage(`Order #${orderId} confirmed successfully!`);
      } else {
        setSnackbarMessage(`Order #${orderId} saved successfully!`);
      }
      setSnackbarVisible(true);
    } catch (err: any) {
      console.error('Failed to update/confirm order:', err);
      setSnackbarMessage(`${confirmAll ? 'Confirm' : 'Update'} Failed: ${err?.message || 'Could not save changes.'}`);
      setSnackbarVisible(true);
    } finally {
      setSaving(false);
    }
  };

  // Delete full order
  const handleDeleteOrder = () => {
    setConfirmDialog({
      visible: true,
      type: 'deleteOrder',
      title: 'Delete Order?',
      message: `Are you sure you want to permanently delete order #${orderId}? This cannot be undone.`,
      confirmLabel: 'Delete Order',
    });
  };

  // Remove single line item with confirmation prompt
  const handleRequestRemoveProduct = (id: string) => {
    const item = products.find((p) => String(p.id) === String(id));
    if (item) {
      const raw = (item.vendor || '').trim();
      const groupKey = (!raw || raw.toLowerCase() === 'unassigned' || raw.toLowerCase() === 'none') ? 'Unassigned' : raw;
      if (lockedVendorKeys.includes(groupKey)) {
        Alert.alert(
          'Package Locked',
          `Cannot remove item from package "${groupKey}" because it is already locked.`
        );
        return;
      }
    }
    const itemTitle = item ? `"${item.title}"` : 'this line item';
    setConfirmDialog({
      visible: true,
      type: 'single',
      targetId: String(id),
      title: 'Remove Item?',
      message: `Are you sure you want to remove ${itemTitle} from this order? This action cannot be undone.`,
      confirmLabel: 'Remove',
    });
  };

  const handleConfirmAction = async () => {
    if (confirmDialog.type === 'batch') {
      const itemsToDelete = products.filter((p) => selectedItemIds.map(String).includes(String(p.id)));
      for (const item of itemsToDelete) {
        const photo = item.photoUri || (item.image !== item.catalogImageUrl ? item.image : undefined);
        const attId = item.attachmentId;
        const stPath = item.storagePath;
        if (attId) {
          searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE(attId)).catch(console.warn);
        } else if (stPath) {
          searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(stPath)).catch(console.warn);
        } else if (photo && (photo.includes('/api/v1/Attachment/') || photo.includes('order/'))) {
          searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(photo)).catch(console.warn);
        }
      }
      const remaining = products.filter((p) => !selectedItemIds.map(String).includes(String(p.id)));
      setProducts(remaining);
      setSelectedItemIds([]);
      setConfirmDialog((prev) => ({ ...prev, visible: false }));
      await persistOrderItems(remaining);
    } else if (confirmDialog.type === 'single' && confirmDialog.targetId) {
      const targetIdStr = String(confirmDialog.targetId);
      const itemToDelete = products.find((p) => String(p.id) === targetIdStr);
      if (itemToDelete) {
        const photo = itemToDelete.photoUri || (itemToDelete.image !== itemToDelete.catalogImageUrl ? itemToDelete.image : undefined);
        const attId = itemToDelete.attachmentId;
        const stPath = itemToDelete.storagePath;
        if (attId) {
          searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE(attId)).catch(console.warn);
        } else if (stPath) {
          searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(stPath)).catch(console.warn);
        } else if (photo && (photo.includes('/api/v1/Attachment/') || photo.includes('order/'))) {
          searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(photo)).catch(console.warn);
        }
      }
      const remaining = products.filter((p) => String(p.id) !== targetIdStr);
      setProducts(remaining);
      setSelectedItemIds((prev) => prev.filter((x) => String(x) !== targetIdStr));
      setConfirmDialog((prev) => ({ ...prev, visible: false }));
      await persistOrderItems(remaining);
    } else if (confirmDialog.type === 'deleteOrder') {
      setConfirmDialog((prev) => ({ ...prev, visible: false }));
      try {
        await searchApiClient.delete(API_ROUTES.ORDERS.DELETE(orderId));
        logisticsService.removeOrder(orderId);
        setSnackbarMessage(`Order #${orderId} deleted!`);
        setSnackbarVisible(true);
        setTimeout(() => {
          if (onBack) onBack();
          else if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/orders');
        }, 500);
      } catch (err: any) {
        console.error('Failed to delete order:', err);
        setSnackbarMessage(`Delete Failed: ${err?.message || 'Could not delete order.'}`);
        setSnackbarVisible(true);
      }
    }
  };

  const emptyAddress: AddressData = {
    name: address?.name ?? '',
    phone: address?.phone ?? '',
    address: address?.address ?? '',
    pincode: address?.pincode ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    isDelhiveryServiceable: address?.isDelhiveryServiceable,
  };

  const handleGenerateGroupLabel = async (orderGrpId: string) => {
    try {
      setSaving(true);
      const res = await searchApiClient.post<any>(`/api/v1/orderid/groups/${orderGrpId}/label`, {});
      setSnackbarMessage(`Label generated for ${orderGrpId}! AWB: ${res.awbNumber || res.awb}`);
      setSnackbarVisible(true);
      await loadOrder();
    } catch (err: any) {
      Alert.alert('Label Generation Failed', err?.message || 'Could not generate Delhivery shipping label.');
    } finally {
      setSaving(false);
    }
  };

  const totalItemCount = React.useMemo(
    () => products.reduce((acc, p) => acc + (p.quantity || 1), 0),
    [products]
  );

  const totalAmount = React.useMemo(
    () => products.reduce((acc, p) => acc + (p.costPerPiece || 0) * (p.quantity || 1), 0),
    [products]
  );

  const derivedStageTag = React.useMemo(() => {
    if (products.length === 0) return '';
    if (distinctGroupKeys.length === 1) {
      return groupStages[distinctGroupKeys[0]] || 'Unconfirmed';
    }
    const STAGE_RANK: Record<string, number> = {
      unconfirmed: 0,
      confirmed: 1,
      processed: 2,
      processing: 2,
      placed: 3,
      dispatched: 3,
      delivered: 4,
    };
    const sorted = [...distinctGroupKeys].sort((a, b) => {
      const rankA = STAGE_RANK[(groupStages[a] || 'unconfirmed').toLowerCase()] ?? 0;
      const rankB = STAGE_RANK[(groupStages[b] || 'unconfirmed').toLowerCase()] ?? 0;
      return rankA - rankB;
    });
    const leastStage = groupStages[sorted[0]] || 'Unconfirmed';
    return `${leastStage} +${distinctGroupKeys.length - 1}`;
  }, [products.length, distinctGroupKeys, groupStages]);

  const vendorGroups = React.useMemo(() => {
    const map = new Map<string, { key: string; vendorName: string; isUnassigned: boolean; items: OrderItem[] }>();
    for (const item of products) {
      const raw = (item.vendor || '').trim();
      const isUnassigned = !raw || raw.toLowerCase() === 'unassigned' || raw.toLowerCase() === 'none';
      const key = isUnassigned ? 'Unassigned' : raw;
      const vendorName = isUnassigned ? 'Unassigned' : raw;
      if (!map.has(key)) {
        map.set(key, { key, vendorName, isUnassigned, items: [] });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.isUnassigned && !b.isUnassigned) return 1;
      if (!a.isUnassigned && b.isUnassigned) return -1;
      return a.vendorName.localeCompare(b.vendorName);
    });
  }, [products]);

  if (loading) {
    return (
      <YStack flex={1} backgroundColor={tokens.background} alignItems="center" justifyContent="center" gap={12}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text fontSize={13} color={tokens.textMuted}>Loading order #{orderId}…</Text>
      </YStack>
    );
  }

  // ── Dedicated Package Group Screen (Full-Page View) ──
  if (activeGroupKey) {
    const targetGroup = vendorGroups.find((g) => g.key === activeGroupKey);
    if (targetGroup) {
      const labelInfo = groupLabelInfo[targetGroup.key];
      const currentStage = groupStages[targetGroup.key] || 'Unconfirmed';
      return (
        <GroupManagementView
          orderId={orderId}
          orderGrpId={labelInfo?.orderGrpId || (orderId ? `${orderId}-${targetGroup.key}` : undefined)}
          vendorName={targetGroup.vendorName}
          isUnassigned={targetGroup.isUnassigned}
          currentStage={currentStage}
          isCod={paymentType === 'cod'}
          needLabel={labelInfo?.needLabel ?? (paymentType === 'cod')}
          awbNumber={labelInfo?.awbNumber}
          labelUrl={labelInfo?.labelUrl}
          isLocked={lockedVendorKeys.includes(targetGroup.key)}
          items={targetGroup.items}
          onUpdateStage={(newStage) => {
            handleUpdateGroupStage(targetGroup.key, newStage);
          }}
          onSave={(newStage) => {
            handleUpdateGroupStage(targetGroup.key, newStage);
            setSnackbarMessage(`Package status updated to ${newStage}`);
            setSnackbarVisible(true);
          }}
          onGenerateLabel={() => {
            const grpId = labelInfo?.orderGrpId;
            if (grpId) {
              handleGenerateGroupLabel(grpId);
            }
          }}
          onViewLabel={(url) => setPreviewImage(url)}
          onShareGroup={() => {}}
          onBack={() => setActiveGroupKey(null)}
        />
      );
    }
  }

  return (
    <YStack flex={1} backgroundColor={tokens.background} position="relative">
      {/* ── Detail Header ── */}
      <DetailHeader
        orderId={orderId}
        createdAt={createdAt}
        status={derivedStageTag}
        statusCount={distinctGroupKeys.length > 1 ? distinctGroupKeys.length - 1 : 0}
        onDelete={handleDeleteOrder}
        onBack={onBack || (() => router.back())}
      />

      {/* ── Main Scrollable Body ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 + Math.max(16, insets.bottom) }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack paddingHorizontal={16} paddingTop={12} gap={14}>
          {/* Source & Payment Row */}
          <SourceRow
            source={source}
            sourceContact={sourceContact}
            paymentType={paymentType}
          />

          {/* Status & Label Requirement Summary Card */}
          <XStack
            backgroundColor={tokens.surface}
            borderWidth={1}
            borderColor={tokens.border}
            borderRadius={tokens.radius.md}
            padding={12}
            alignItems="center"
            justifyContent="space-between"
          >
            <YStack gap={2}>
              <Text fontSize={10} fontWeight="800" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
                ORDER STATUS & FULFILLMENT MODE
              </Text>
              <XStack alignItems="center" gap={8} marginTop={2}>
                <YStack
                  paddingHorizontal={8}
                  paddingVertical={3}
                  borderRadius={6}
                  backgroundColor={orderData?.status === 'Unconfirmed' ? `${tokens.warning}1F` : `${tokens.success}1F`}
                >
                  <Text fontSize={11} fontWeight="800" color={orderData?.status === 'Unconfirmed' ? tokens.warning : tokens.success}>
                    {orderData?.status === 'Unconfirmed' ? 'UNCONFIRMED (DRAFT)' : 'CONFIRMED'}
                  </Text>
                </YStack>

                <YStack
                  paddingHorizontal={8}
                  paddingVertical={3}
                  borderRadius={6}
                  backgroundColor={paymentType === 'cod' || orderData?.needLabel ? `${tokens.accent}1F` : `${tokens.textMuted}1F`}
                >
                  <Text fontSize={11} fontWeight="800" color={paymentType === 'cod' || orderData?.needLabel ? tokens.accent : tokens.textMuted}>
                    {paymentType === 'cod' ? 'LABEL MANDATORY (COD)' : orderData?.needLabel ? 'NEED LABEL (WAREHOUSE)' : 'VENDOR DIRECT (NO LABEL)'}
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </XStack>

          {/* Order Groups (Per Vendor) Card */}
          {orderData?.groups && orderData.groups.length > 0 && (
            <YStack gap={10}>
              <Text fontSize={12} fontWeight="800" color={tokens.textMuted} letterSpacing={0.8} textTransform="uppercase">
                VENDOR ORDER GROUPS & PACKAGES ({orderData.groups.length})
              </Text>
              {orderData.groups.map((grp) => (
                <YStack
                  key={grp.orderGrpId}
                  backgroundColor={tokens.surface}
                  borderWidth={1}
                  borderColor={tokens.border}
                  borderRadius={tokens.radius.md}
                  padding={14}
                  gap={10}
                >
                  <XStack justifyContent="space-between" alignItems="center">
                    <YStack gap={2}>
                      <XStack alignItems="center" gap={6}>
                        <Text fontSize={14} fontWeight="800" color={tokens.text}>
                          {grp.orderGrpId}
                        </Text>
                        <YStack paddingHorizontal={6} paddingVertical={2} borderRadius={4} backgroundColor={`${tokens.accent}1A`}>
                          <Text fontSize={10} fontWeight="700" color={tokens.accent}>
                            {grp.vendorName || 'Default Vendor'}
                          </Text>
                        </YStack>
                      </XStack>
                      {grp.awbNumber && (
                        <Text fontSize={11} color={tokens.textMuted}>
                          AWB: <Text fontWeight="700" color={tokens.text}>{grp.awbNumber}</Text>
                        </Text>
                      )}
                    </YStack>

                    {/* Label Action Button */}
                    {grp.labelUrl ? (
                      <Pressable onPress={() => setPreviewImage(grp.labelUrl!)}>
                        <YStack
                          paddingHorizontal={12}
                          paddingVertical={6}
                          borderRadius={tokens.radius.sm}
                          backgroundColor={`${tokens.success}1A`}
                          borderWidth={1}
                          borderColor={`${tokens.success}40`}
                        >
                          <Text fontSize={11} fontWeight="800" color={tokens.success}>
                            VIEW SHIPPING LABEL (PDF)
                          </Text>
                        </YStack>
                      </Pressable>
                    ) : (grp.needLabel || paymentType === 'cod') ? (
                      <Pressable onPress={() => handleGenerateGroupLabel(grp.orderGrpId)}>
                        <YStack
                          paddingHorizontal={12}
                          paddingVertical={6}
                          borderRadius={tokens.radius.sm}
                          backgroundColor={tokens.accent}
                        >
                          <Text fontSize={11} fontWeight="800" color={tokens.accentForeground}>
                            GENERATE LABEL (DELHIVERY)
                          </Text>
                        </YStack>
                      </Pressable>
                    ) : (
                      <YStack paddingHorizontal={10} paddingVertical={4} borderRadius={tokens.radius.sm} backgroundColor={tokens.surfaceRaised}>
                        <Text fontSize={10} fontWeight="700" color={tokens.textMuted}>
                          NO LABEL NEEDED
                        </Text>
                      </YStack>
                    )}
                  </XStack>

                  {/* Group items display */}
                  <YStack gap={4} paddingTop={4} borderTopWidth={1} borderTopColor={tokens.border}>
                    {grp.items?.map((it) => (
                      <XStack key={it.id || it.itemId} justifyContent="space-between" alignItems="center">
                        <Text fontSize={12} color={tokens.text} flex={1} numberOfLines={1}>
                          • {it.productTitle || 'Product Item'} ({it.itemId || `Item #${it.id}`})
                        </Text>
                        <Text fontSize={12} fontWeight="600" color={tokens.textSecondary}>
                          x{it.quantity} (₹{it.subtotal})
                        </Text>
                      </XStack>
                    ))}
                  </YStack>
                </YStack>
              ))}
            </YStack>
          )}

          {/* Delhivery Serviceability Status Banner */}
          {address?.isDelhiveryServiceable && (
            <XStack
              backgroundColor={`${tokens.accent}12`}
              borderWidth={1}
              borderColor={`${tokens.accent}30`}
              borderRadius={tokens.radius.md}
              padding={12}
              alignItems="center"
              justifyContent="space-between"
            >
              <YStack gap={2}>
                <Text fontSize={11} fontWeight="700" color={tokens.accent} textTransform="uppercase">
                  Delhivery Express
                </Text>
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  PIN: {address.pincode}
                </Text>
              </YStack>
              <XStack gap={4} alignItems="center">
                <LuCheck size={14} color={tokens.success} />
                <Text fontSize={12} fontWeight="700" color={tokens.success}>
                  Serviceable
                </Text>
              </XStack>
            </XStack>
          )}

          {/* Products List Section */}
          <ProductListSection
            orderId={orderId}
            products={products}
            selectedIds={selectedItemIds}
            isCod={paymentType === 'cod'}
            groupStages={groupStages}
            groupLabelInfo={groupLabelInfo}
            lockedVendorKeys={lockedVendorKeys}
            onUpdateGroupStage={handleUpdateGroupStage}
            onGenerateGroupLabel={handleGenerateGroupLabel}
            onViewLabel={(url) => setPreviewImage(url)}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onBatchDelete={handleBatchDelete}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onOpenPicker={handleOpenPicker}
            onUpdateItem={handleUpdateItem}
            onRemoveProduct={handleRequestRemoveProduct}
            onManageGroup={(groupKey) => setActiveGroupKey(groupKey)}
          />

          <YStack height={1} backgroundColor={tokens.border} />

          {/* Address Preview Card */}
          <AddressCard
            address={address}
            onEditPress={() => setAddressSheetOpen(true)}
          />

          <YStack height={1} backgroundColor={tokens.border} />

          {/* Transaction & Receipt Proof Section */}
          <TransactionReceiptSection
            transactionId={transactionId}
            receiptUrl={receiptUrl}
            onChangeTransactionId={setTransactionId}
            onUploadReceipt={handleUploadReceipt}
            onRemoveReceipt={handleRemoveReceipt}
          />
        </YStack>
      </ScrollView>

      {/* ── Product Edit Sheet ── */}
      <ProductEditSheet
        visible={productSheetOpen}
        item={activeItem}
        isCod={paymentType === 'cod'}
        lockedVendorNames={lockedVendorKeys}
        onSaveItem={handleSaveItem}
        onDeleteItem={(item) => handleRequestRemoveProduct(String(item.id))}
        onClose={() => setProductSheetOpen(false)}
      />

      {/* ── Quick Size / Qty Picker ── */}
      <QuickPickerSheet
        visible={pickerState.visible}
        type={pickerState.type}
        selected={pickerState.currentValue}
        onSelect={handleSelectPickerOption}
        onClose={() => setPickerState((prev) => ({ ...prev, visible: false }))}
      />

      {/* ── Address Pull-up Sheet ── */}
      <AddressSheet
        visible={addressSheetOpen}
        initial={emptyAddress}
        onSave={(data: AddressData) => {
          setAddress(data);
          setAddressSheetOpen(false);
        }}
        onClose={() => setAddressSheetOpen(false)}
      />

      {/* ── Confirmation Modal ── */}
      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        intent="critical"
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, visible: false }))}
      />

      {/* ── Receipt Zoom Modal ── */}
      {previewImage && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
          <YStack flex={1} backgroundColor="rgba(0,0,0,0.92)" alignItems="center" justifyContent="center">
            <Pressable
              style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }}
              onPress={() => setPreviewImage(null)}
            >
              <YStack
                width={36}
                height={36}
                borderRadius={18}
                backgroundColor="rgba(255,255,255,0.2)"
                alignItems="center"
                justifyContent="center"
              >
                <LuX size={20} color="#FFFFFF" />
              </YStack>
            </Pressable>
            <Image
              source={{ uri: previewImage }}
              style={{ width: '90%', height: '80%' }}
              resizeMode="contain"
            />
          </YStack>
        </Modal>
      )}
      {/* ── Sticky Bottom Action Bar (SAVE & CONFIRM) ── */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor={tokens.surface}
        borderTopWidth={1}
        borderTopColor={tokens.border}
        paddingHorizontal={16}
        paddingTop={10}
        paddingBottom={Math.max(12, insets.bottom + 8)}
        shadowColor="#000"
        shadowOffset={{ width: 0, height: -3 }}
        shadowOpacity={0.08}
        shadowRadius={6}
        elevation={8}
        zIndex={100}
      >
        <XStack alignItems="center" justifyContent="space-between" gap={12}>
          {/* Order Summary: Items & Price */}
          <YStack flex={1} gap={2}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.5}>
              {totalItemCount} {totalItemCount === 1 ? 'ITEM' : 'ITEMS'} • {distinctGroupKeys.length} {distinctGroupKeys.length === 1 ? 'PKG' : 'PKGS'}
            </Text>
            <Text fontSize={17} fontWeight="900" color={tokens.text}>
              ₹{totalAmount.toLocaleString('en-IN')}
            </Text>
          </YStack>

          {/* Action Buttons: CONFIRM (left) and SAVE (right) */}
          <XStack alignItems="center" gap={8}>
            {/* CONFIRM Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm order"
              onPress={() => handleSaveOrder(true)}
              disabled={saving}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                height: 40,
                borderRadius: tokens.radius.sm,
                backgroundColor: pressed ? `${tokens.accent}D0` : tokens.accent,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: saving ? 0.6 : 1,
                shadowColor: tokens.accent,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 3,
              })}
            >
              {saving ? (
                <ActivityIndicator size="small" color={tokens.accentForeground} />
              ) : (
                <>
                  <LuCheck size={16} color={tokens.accentForeground} />
                  <Text fontSize={12} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.5}>
                    CONFIRM
                  </Text>
                </>
              )}
            </Pressable>

            {/* SAVE Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save order details"
              onPress={() => handleSaveOrder(false)}
              disabled={saving}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                height: 40,
                borderRadius: tokens.radius.sm,
                borderWidth: 1,
                borderColor: tokens.border,
                backgroundColor: pressed ? `${tokens.text}10` : tokens.surfaceRaised,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: saving ? 0.6 : 1,
              })}
            >
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                {saving ? 'SAVING...' : 'SAVE'}
              </Text>
            </Pressable>
          </XStack>
        </XStack>
      </YStack>

      {/* ── Snackbar Toast Banner ── */}
      {snackbarVisible && (
        <YStack
          position="absolute"
          bottom={75 + insets.bottom}
          left={16}
          right={16}
          backgroundColor="#1E293B"
          paddingVertical={12}
          paddingHorizontal={16}
          borderRadius={tokens.radius.md || 8}
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          elevation={5}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.25}
          shadowRadius={3.84}
          zIndex={9999}
        >
          <XStack alignItems="center" gap={8} flex={1}>
            <LuCheckCircle2 size={18} color="#10B981" />
            <Text color="#FFFFFF" fontSize={13} fontWeight="600" flex={1}>
              {snackbarMessage}
            </Text>
          </XStack>
          <Pressable onPress={() => setSnackbarVisible(false)} hitSlop={8}>
            <LuX size={16} color="#94A3B8" />
          </Pressable>
        </YStack>
      )}
    </YStack>
  );
};
