import React, { useState } from 'react';
import { ScrollView, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck } from 'react-icons/lu';
import { useTheme } from '../../theme';
import {
  OrderSource,
  PaymentType,
  AddressData,
  AddressCard,
  AddressSheet,
} from './AdminOrderFormPage';
import { DetailHeader, formatOrderDate } from '../molecules/DetailHeader';
import { SourceRow } from '../molecules/SourceRow';
import { QuickPickerSheet } from '../molecules/QuickPickerSheet';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import { TransactionReceiptSection } from '../molecules/TransactionReceiptSection';
import { ProductListSection, OrderItem } from '../organisms/ProductListSection';
import { ProductEditSheet } from '../organisms/ProductEditSheet';

// Re-export shared types for consumer convenience
export type { OrderItem, OrderSource, PaymentType, AddressData };
export { formatOrderDate };

export interface AdminOrderDetailPageProps {
  /** Order identifier displayed at top */
  orderId?: string;
  /** Order creation date (ISO string or Date) */
  createdAt?: string | Date;
  /** Order source (WhatsApp or Instagram) */
  source?: OrderSource;
  /** Contact identifier (phone number or Instagram handle) */
  sourceContact?: string;
  /** Payment method */
  paymentType?: PaymentType;
  /** Line items */
  initialProducts?: OrderItem[];
  /** Pre-selected item IDs for batch actions (for Storybook) */
  initialSelectedIds?: string[];
  /** Customer delivery address */
  initialAddress?: AddressData | null;
  /** Optional transaction ID */
  initialTransactionId?: string;
  /** Optional transaction receipt screenshot URL / placeholder */
  initialReceiptUrl?: string | null;
  /** Whether the product edit sheet starts open (for Storybook) */
  initialProductSheetOpen?: boolean;
  /** Whether the address sheet starts open (for Storybook) */
  initialAddressSheetOpen?: boolean;
  /** Whether the confirmation dialog starts open (for Storybook) */
  initialConfirmDialogOpen?: boolean;
  /** Whether the confirmation dialog is for single item or batch delete */
  initialConfirmDialogType?: 'single' | 'batch';
  /** Whether the header timebadge is compact (for tight real estate) */
  compactDate?: boolean;
  /** Save order callback */
  onSaveOrder?: (data: any) => void;
  /** Delete order callback */
  onDeleteOrder?: () => void;
  /** Go back callback */
  onBack?: () => void;
}

export function AdminOrderDetailPage({
  orderId = '',
  createdAt = new Date(),
  compactDate = false,
  source = null,
  sourceContact = '',
  paymentType = 'cod',
  initialProducts = [],
  initialSelectedIds = [],
  initialAddress = null,
  initialTransactionId = '',
  initialReceiptUrl = null,
  initialProductSheetOpen = false,
  initialAddressSheetOpen = false,
  initialConfirmDialogOpen = false,
  initialConfirmDialogType = 'single',
  onSaveOrder,
  onDeleteOrder,
  onBack,
}: AdminOrderDetailPageProps) {
  const { tokens } = useTheme();

  // Local state
  const [products, setProducts] = useState<OrderItem[]>(initialProducts);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(initialSelectedIds);
  const [address, setAddress] = useState<AddressData | null>(initialAddress);
  const [transactionId, setTransactionId] = useState(initialTransactionId ?? '');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(initialReceiptUrl);
  const [groupStages, setGroupStages] = useState<Record<string, string>>({});

  // Sheets
  const [activeItem, setActiveItem] = useState<OrderItem | null>(null);
  const [productSheetOpen, setProductSheetOpen] = useState(initialProductSheetOpen);
  const [addressSheetOpen, setAddressSheetOpen] = useState(initialAddressSheetOpen);

  // If initialProductSheetOpen is set, initialize with the first item
  React.useEffect(() => {
    if (initialProductSheetOpen && products.length > 0) {
      setActiveItem(products[0]);
    }
  }, [initialProductSheetOpen]);

  // Handlers
  const handleSaveItem = (updated: OrderItem) => {
    const existingIndex = products.findIndex((p) => p.id === updated.id);
    if (existingIndex >= 0) {
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      setProducts((prev) => [...prev, updated]);
    }
    setProductSheetOpen(false);
    setActiveItem(null);
  };

  const handleUpdateItem = (id: string, updates: Partial<OrderItem>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

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
    setProducts((prev) => prev.filter((p) => !selectedItemIds.includes(p.id)));
    setSelectedItemIds([]);
  };

  const handleAddProduct = () => {
    const draftItem: OrderItem = {
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
    setActiveItem(draftItem);
    setProductSheetOpen(true);
  };

  const handleEditProduct = (item: OrderItem) => {
    setActiveItem(item);
    setProductSheetOpen(true);
  };

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

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    type: 'single' | 'batch' | 'deleteOrder';
    targetId?: string;
    title: string;
    message: string;
    confirmLabel: string;
  }>({
    visible: initialConfirmDialogOpen,
    type: initialConfirmDialogType,
    targetId: initialConfirmDialogType === 'single' ? initialProducts[0]?.id : undefined,
    title:
      initialConfirmDialogType === 'single'
        ? 'Remove Item?'
        : `Delete ${initialSelectedIds.length || 2} Items?`,
    message:
      initialConfirmDialogType === 'single'
        ? `Are you sure you want to remove "${initialProducts[0]?.title || 'this item'}" from this order? This action cannot be undone.`
        : `Are you sure you want to remove ${initialSelectedIds.length || 2} selected items from this order? Line totals will be recalculated immediately.`,
    confirmLabel:
      initialConfirmDialogType === 'single'
        ? 'Remove'
        : `Delete (${initialSelectedIds.length || 2})`,
  });

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

  const handleRequestBatchDelete = () => {
    const count = selectedItemIds.length;
    if (count === 0) return;
    setConfirmDialog({
      visible: true,
      type: 'batch',
      title: `Delete ${count} Items?`,
      message: `Are you sure you want to remove ${count} selected items from this order? Line totals will be recalculated immediately.`,
      confirmLabel: `Delete (${count})`,
    });
  };

  const handleConfirmAction = () => {
    if (confirmDialog.type === 'single' && confirmDialog.targetId) {
      const targetIdStr = String(confirmDialog.targetId);
      setProducts((prev) => prev.filter((p) => String(p.id) !== targetIdStr));
      setSelectedItemIds((prev) => prev.filter((x) => String(x) !== targetIdStr));
    } else if (confirmDialog.type === 'batch') {
      setProducts((prev) => prev.filter((p) => !selectedItemIds.map(String).includes(String(p.id))));
      setSelectedItemIds([]);
    } else if (confirmDialog.type === 'deleteOrder') {
      if (onDeleteOrder) onDeleteOrder();
      else alert(`Order #${orderId} deleted.`);
    }
    setConfirmDialog((prev) => ({ ...prev, visible: false }));
  };

  const handleCancelAction = () => {
    setConfirmDialog((prev) => ({ ...prev, visible: false }));
  };

  const handleOpenPicker = (item: OrderItem, type: 'size' | 'qty') => {
    setPickerState({
      visible: true,
      type,
      itemId: item.id,
      currentValue: type === 'size' ? (item.size || 'Free Size') : String(item.quantity || 1),
    });
  };

  const handleSelectPickerOption = (val: string) => {
    if (!pickerState.itemId) return;
    if (pickerState.type === 'size') {
      handleUpdateItem(pickerState.itemId, { size: val });
    } else {
      handleUpdateItem(pickerState.itemId, { quantity: parseInt(val, 10) || 1 });
    }
  };

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

  const groupLabelInfo = React.useMemo(() => {
    const map: Record<string, { orderGrpId?: string; needLabel?: boolean; awbNumber?: string; labelUrl?: string }> = {};
    distinctGroupKeys.forEach((k, idx) => {
      map[k] = {
        orderGrpId: `${orderId}-G${idx + 1}`,
        needLabel: paymentType === 'cod',
      };
    });
    return map;
  }, [distinctGroupKeys, orderId, paymentType]);

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

  const handleSaveOrder = (confirmAll: boolean = false) => {
    let nextStages = { ...groupStages };
    if (confirmAll) {
      distinctGroupKeys.forEach((k) => {
        const cur = (nextStages[k] || 'Unconfirmed').toLowerCase();
        if (cur === 'unconfirmed' || cur === 'unformed') {
          nextStages[k] = 'Confirmed';
        }
      });
      setGroupStages(nextStages);
    }
    const orderData = {
      orderId,
      createdAt,
      source,
      sourceContact,
      paymentType,
      products,
      address,
      transactionId,
      receiptUrl,
      groupStages: nextStages,
      status: confirmAll ? 'Confirmed' : 'Unconfirmed',
    };
    if (onSaveOrder) onSaveOrder(orderData);
    else alert(`Order #${orderId} ${confirmAll ? 'confirmed' : 'saved'} successfully!`);
  };

  const handleDelete = () => {
    setConfirmDialog({
      visible: true,
      type: 'deleteOrder',
      title: 'Delete Order?',
      message: `Are you sure you want to permanently delete order #${orderId}? This cannot be undone.`,
      confirmLabel: 'Delete Order',
    });
  };

  return (
    <YStack
      flex={1}
      height="100%"
      maxHeight="100%"
      backgroundColor={tokens.background}
      position="relative"
      overflow="hidden"
    >
      {/* ── 1. Top Header ── */}
      <DetailHeader
        orderId={orderId}
        createdAt={createdAt}
        status={derivedStageTag}
        statusCount={distinctGroupKeys.length > 1 ? distinctGroupKeys.length - 1 : 0}
        compactDate={compactDate}
        onDelete={handleDelete}
        onBack={onBack}
      />

      {/* ── Scrollable Body ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack paddingHorizontal={12} paddingTop={10} gap={10}>
          {/* ── 2. Source & Payment Row ── */}
          <SourceRow
            source={source}
            sourceContact={sourceContact}
            paymentType={paymentType}
          />

          <YStack height={1} backgroundColor={tokens.border} marginVertical={1} />

          {/* ── 3. Products / Line Items ── */}
          <ProductListSection
            orderId={orderId}
            products={products}
            selectedIds={selectedItemIds}
            isCod={paymentType === 'cod'}
            groupStages={groupStages}
            groupLabelInfo={groupLabelInfo}
            lockedVendorKeys={lockedVendorKeys}
            onUpdateGroupStage={(key, stage) => setGroupStages((prev) => ({ ...prev, [key]: stage }))}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onBatchDelete={handleRequestBatchDelete}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onUpdateItem={handleUpdateItem}
            onRemoveProduct={handleRequestRemoveProduct}
            onOpenPicker={handleOpenPicker}
          />

          <YStack height={1} backgroundColor={tokens.border} marginVertical={1} />

          {/* ── 4. Delivery Address ── */}
          <AddressCard
            address={address}
            onEditPress={() => setAddressSheetOpen(true)}
          />

          <YStack height={1} backgroundColor={tokens.border} marginVertical={1} />

          {/* ── 5. Transaction Receipt Section ── */}
          <TransactionReceiptSection
            transactionId={transactionId}
            onChangeTransactionId={setTransactionId}
            receiptUrl={receiptUrl}
            onUploadReceipt={(url) => setReceiptUrl(url)}
            onRemoveReceipt={() => setReceiptUrl(null)}
          />
        </YStack>
      </ScrollView>

      {/* ── Quick Size / Qty Pull-up Sheet (Root Level -> Anchored to Screen Bottom) ── */}
      <QuickPickerSheet
        visible={pickerState.visible}
        type={pickerState.type}
        title={pickerState.type === 'size' ? 'Select Size' : 'Select Quantity'}
        selected={pickerState.currentValue}
        onSelect={handleSelectPickerOption}
        onClose={() => setPickerState((prev) => ({ ...prev, visible: false }))}
      />

      {/* ── Product Edit Pull-up Sheet (Root Level -> Anchored to Screen Bottom) ── */}
      <ProductEditSheet
        visible={productSheetOpen}
        item={activeItem}
        isCod={paymentType === 'cod'}
        lockedVendorNames={lockedVendorKeys}
        onSaveItem={handleSaveItem}
        onDeleteItem={(item) => handleRequestRemoveProduct(String(item.id))}
        onClose={() => setProductSheetOpen(false)}
      />

      {/* ── Shared Address Pull-up Sheet (Root Level -> Anchored to Screen Bottom) ── */}
      <AddressSheet
        visible={addressSheetOpen}
        initial={
          address ?? {
            name: '',
            phone: '',
            address: '',
            pincode: '',
          }
        }
        onSave={(data) => setAddress(data)}
        onClose={() => setAddressSheetOpen(false)}
      />

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
        paddingVertical={10}
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
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                height: 40,
                borderRadius: tokens.radius.sm,
                backgroundColor: pressed ? `${tokens.accent}D0` : tokens.accent,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                shadowColor: tokens.accent,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 3,
              })}
            >
              <LuCheck size={16} color={tokens.accentForeground} />
              <Text fontSize={12} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.5}>
                CONFIRM
              </Text>
            </Pressable>

            {/* SAVE Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save order details"
              onPress={() => handleSaveOrder(false)}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                height: 40,
                borderRadius: tokens.radius.sm,
                borderWidth: 1,
                borderColor: tokens.border,
                backgroundColor: pressed ? `${tokens.text}10` : tokens.surfaceRaised,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                SAVE
              </Text>
            </Pressable>
          </XStack>
        </XStack>
      </YStack>

      {/* ── Action Confirmation Dialog (Root Level) ── */}
      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel="Cancel"
        intent="critical"
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
      />
    </YStack>
  );
}
