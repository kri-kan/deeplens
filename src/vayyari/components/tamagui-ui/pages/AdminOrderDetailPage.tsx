import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { YStack } from 'tamagui';
import { useTheme } from '@/theme';
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
}

export function AdminOrderDetailPage({
  orderId = '849201',
  createdAt = new Date(),
  compactDate = false,
  source = 'whatsapp',
  sourceContact = '+91 98765 43210',
  paymentType = 'cod',
  initialProducts = [
    {
      id: 'item-1',
      productId: 'PRD-10291',
      title: 'Handloom Kanjivaram Silk Saree',
      size: 'Free Size',
      quantity: 1,
      costPerPiece: 2499,
      codChargePerPiece: 50,
      amountPaid: 500,
      vendor: 'Varanasi Weavers Ltd',
      imageColor: '#e8d5c4',
    },
    {
      id: 'item-2',
      productId: 'PRD-10292',
      title: 'Zari Embroidered Blouse Piece',
      size: 'M',
      quantity: 2,
      costPerPiece: 450,
      codChargePerPiece: 50,
      amountPaid: 0,
      vendor: 'Surat Handlooms',
      imageColor: '#c9b8a8',
    },
  ],
  initialSelectedIds = [],
  initialAddress = {
    name: 'Priya Menon',
    phone: '+91 98765 43210',
    address: '12, Koramangala 4th Block, Bengaluru, Karnataka',
    pincode: '560034',
  },
  initialTransactionId = '',
  initialReceiptUrl = null,
  initialProductSheetOpen = false,
  initialAddressSheetOpen = false,
  initialConfirmDialogOpen = false,
  initialConfirmDialogType = 'single',
  onSaveOrder,
  onDeleteOrder,
}: AdminOrderDetailPageProps) {
  const { tokens } = useTheme();

  // Local state
  const [products, setProducts] = useState<OrderItem[]>(initialProducts);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(initialSelectedIds);
  const [address, setAddress] = useState<AddressData | null>(initialAddress);
  const [transactionId, setTransactionId] = useState(initialTransactionId ?? '');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(initialReceiptUrl);

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
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
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
    type: 'single' | 'batch';
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
      setProducts((prev) => prev.filter((p) => p.id !== confirmDialog.targetId));
      setSelectedItemIds((prev) => prev.filter((x) => x !== confirmDialog.targetId));
    } else if (confirmDialog.type === 'batch') {
      setProducts((prev) => prev.filter((p) => !selectedItemIds.includes(p.id)));
      setSelectedItemIds([]);
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

  const handleSaveAll = () => {
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
    };
    if (onSaveOrder) onSaveOrder(orderData);
    else alert(`Order #${orderId} saved successfully!`);
  };

  const handleDelete = () => {
    if (onDeleteOrder) onDeleteOrder();
    else alert(`Order #${orderId} marked for deletion.`);
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
        compactDate={compactDate}
        onSave={handleSaveAll}
        onDelete={handleDelete}
      />

      {/* ── Scrollable Body ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
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
            products={products}
            selectedIds={selectedItemIds}
            isCod={paymentType === 'cod'}
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
        onSaveItem={handleSaveItem}
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
