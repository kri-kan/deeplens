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
import { API_ROUTES } from '@/constants/api-routes';
import {
  OrderIdEntry,
  OrderUpdateRequest,
} from '@/types/orders';

import { DetailHeader } from '@/components/tamagui-ui/molecules/DetailHeader';
import { SourceRow, OrderSource, PaymentType } from '@/components/tamagui-ui/molecules/SourceRow';
import { ConfirmDialog } from '@/components/tamagui-ui/molecules/ConfirmDialog';
import { TransactionReceiptSection } from '@/components/tamagui-ui/molecules/TransactionReceiptSection';
import { ProductListSection, OrderItem } from '@/components/tamagui-ui/organisms/ProductListSection';
import { ProductEditSheet } from '@/components/tamagui-ui/organisms/ProductEditSheet';
import { QuickPickerSheet } from '@/components/tamagui-ui/molecules/QuickPickerSheet';
import { AddressCard, AddressSheet, AddressData } from './AdminOrderCreateForm';
import { LuX, LuCheck } from '@/components/tamagui-ui/icons/lu';

export interface AdminOrderDetailViewProps {
  orderId: string;
  onBack?: () => void;
}

export const AdminOrderDetailView: React.FC<AdminOrderDetailViewProps> = ({
  orderId,
  onBack,
}) => {
  const { tokens } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orderData, setOrderData] = useState<OrderIdEntry | null>(null);

  // Mapped mock/real state
  const [createdAt, setCreatedAt] = useState<string | Date>(new Date());
  const [source, setSource] = useState<OrderSource>('whatsapp');
  const [sourceContact, setSourceContact] = useState<string>('');
  const [paymentType, setPaymentType] = useState<PaymentType>('cod');
  const [products, setProducts] = useState<OrderItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [address, setAddress] = useState<AddressData | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

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

        const src = (res.source || '').toLowerCase();
        if (src.includes('insta')) setSource('instagram');
        else if (src.includes('whats')) setSource('whatsapp');
        else setSource(null);

        setSourceContact(res.sourceHandle || res.customerPhone || '');
        setPaymentType((res.paymentMode || 'COD').toLowerCase() === 'prepaid' ? 'prepaid' : 'cod');

        // Products mapping
        if (res.items && res.items.length > 0) {
          setProducts(
            res.items.map((it: any, idx: number) => ({
              id: it.id || `item-${idx}`,
              productId: it.sku || `PRD-${idx + 1000}`,
              title: it.productTitle || it.title || `Item #${idx + 1}`,
              size: it.size || 'Free Size',
              quantity: it.quantity || 1,
              costPerPiece: it.unitPrice || 0,
              codChargePerPiece: 0,
              amountPaid: 0,
              vendor: it.vendor || 'In-House',
              imageColor: '#f0e6d3',
            }))
          );
        } else {
          setProducts([
            {
              id: 'item-1',
              productId: 'PRD-101',
              title: 'Handloom Saree',
              size: 'Free Size',
              quantity: 1,
              costPerPiece: res.totalAmount || 1499,
              codChargePerPiece: 0,
              amountPaid: 0,
              vendor: 'In-House',
              imageColor: '#f0e6d3',
            },
          ]);
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
    setConfirmDialog({
      visible: true,
      type: 'batch',
      title: `Delete ${selectedItemIds.length} Items?`,
      message: `Are you sure you want to remove ${selectedItemIds.length} selected items from this order?`,
      confirmLabel: `Delete (${selectedItemIds.length})`,
    });
  };

  const handleAddProduct = () => {
    const newItem: OrderItem = {
      id: `item-${Date.now()}`,
      productId: `PRD-${Math.floor(10000 + Math.random() * 90000)}`,
      title: 'New Line Item',
      size: 'Free Size',
      quantity: 1,
      costPerPiece: 999,
      codChargePerPiece: paymentType === 'cod' ? 50 : 0,
      amountPaid: 0,
      vendor: 'Unassigned',
      imageColor: '#f0e6d3',
    };
    setProducts((prev) => [...prev, newItem]);
    setActiveItem(newItem);
    setProductSheetOpen(true);
  };

  const handleEditProduct = (item: OrderItem) => {
    setActiveItem(item);
    setProductSheetOpen(true);
  };

  const handleSaveItem = (updated: OrderItem) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setProductSheetOpen(false);
  };

  const handleUpdateItem = (id: string, updates: Partial<OrderItem>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const handleOpenPicker = (item: OrderItem, type: 'size' | 'qty') => {
    setPickerState({
      visible: true,
      type,
      itemId: item.id,
      currentValue: type === 'size' ? item.size || 'Free Size' : String(item.quantity),
    });
  };

  const handleSelectPickerOption = (value: string) => {
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id !== pickerState.itemId) return item;
        if (pickerState.type === 'size') return { ...item, size: value };
        if (pickerState.type === 'qty') return { ...item, quantity: parseInt(value, 10) || 1 };
        return item;
      })
    );
    setPickerState((prev) => ({ ...prev, visible: false }));
  };

  const handleUploadReceipt = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  // Save full order changes to backend
  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const updatePayload: Partial<OrderUpdateRequest> = {
        paymentMode: paymentType === 'cod' ? 'COD' : 'Prepaid',
        customerName: address?.name,
        customerPhone: address?.phone,
        customerAddress: address?.address,
        shippingStreet: address?.address,
        shippingPincode: address?.pincode,
        shippingCity: address?.city,
        shippingState: address?.state,
        transactionId: transactionId || undefined,
        items: products.map((p) => ({
          productTitle: p.title,
          sku: p.productId,
          size: p.size,
          quantity: p.quantity,
          unitPrice: p.costPerPiece,
          totalPrice: p.costPerPiece * p.quantity,
        })),
      };

      await searchApiClient.put(API_ROUTES.ORDERS.UPDATE(orderId), updatePayload);
      Alert.alert('Success', 'Order updated successfully!');
    } catch (err: any) {
      console.error('Failed to update order:', err);
      Alert.alert('Update Failed', err?.message || 'Could not save changes.');
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
    const item = products.find((p) => p.id === id);
    const itemTitle = item ? `"${item.title}"` : 'this line item';
    setConfirmDialog({
      visible: true,
      type: 'single',
      targetId: id,
      title: 'Remove Item?',
      message: `Are you sure you want to remove ${itemTitle} from this order? This action cannot be undone.`,
      confirmLabel: 'Remove',
    });
  };

  const handleConfirmAction = async () => {
    if (confirmDialog.type === 'batch') {
      setProducts((prev) => prev.filter((p) => !selectedItemIds.includes(p.id)));
      setSelectedItemIds([]);
      setConfirmDialog((prev) => ({ ...prev, visible: false }));
    } else if (confirmDialog.type === 'single' && confirmDialog.targetId) {
      setProducts((prev) => prev.filter((p) => p.id !== confirmDialog.targetId));
      setSelectedItemIds((prev) => prev.filter((x) => x !== confirmDialog.targetId));
      setConfirmDialog((prev) => ({ ...prev, visible: false }));
    } else if (confirmDialog.type === 'deleteOrder') {
      setConfirmDialog((prev) => ({ ...prev, visible: false }));
      try {
        await searchApiClient.delete(API_ROUTES.ORDERS.DELETE(orderId));
        Alert.alert('Deleted', 'Order has been deleted.', [
          {
            text: 'OK',
            onPress: () => {
              if (onBack) onBack();
              else router.back();
            },
          },
        ]);
      } catch (err: any) {
        Alert.alert('Delete Failed', err?.message || 'Could not delete order.');
      }
    }
  };

  if (loading) {
    return (
      <YStack flex={1} backgroundColor={tokens.background} alignItems="center" justifyContent="center" gap={12}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text fontSize={13} color={tokens.textMuted}>Loading order #{orderId}…</Text>
      </YStack>
    );
  }

  const emptyAddress: AddressData = {
    name: address?.name ?? '',
    phone: address?.phone ?? '',
    address: address?.address ?? '',
    pincode: address?.pincode ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    isDelhiveryServiceable: address?.isDelhiveryServiceable,
  };

  return (
    <YStack flex={1} backgroundColor={tokens.background} position="relative">
      {/* ── Detail Header ── */}
      <DetailHeader
        orderId={orderId}
        createdAt={createdAt}
        onSave={handleSaveOrder}
        onDelete={handleDeleteOrder}
      />

      {/* ── Main Scrollable Body ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(60, insets.bottom + 40) }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack paddingHorizontal={16} paddingTop={12} gap={14}>
          {/* Source & Payment Row */}
          <SourceRow
            source={source}
            sourceContact={sourceContact}
            paymentType={paymentType}
          />

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
            products={products}
            selectedIds={selectedItemIds}
            isCod={paymentType === 'cod'}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onBatchDelete={handleBatchDelete}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onOpenPicker={handleOpenPicker}
            onUpdateItem={handleUpdateItem}
            onRemoveProduct={handleRequestRemoveProduct}
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
        onSaveItem={handleSaveItem}
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
    </YStack>
  );
};
