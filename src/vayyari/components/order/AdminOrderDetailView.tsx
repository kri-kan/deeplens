import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Alert,
} from 'react-native';
import {
  Surface,
  Text,
  TextInput,
  Button,
  IconButton,
  useTheme,
  ActivityIndicator,
  Portal,
  Modal,
  Chip,
  Icon,
  Checkbox,
  Dialog,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';

import { searchApiClient } from '@/api/client';
import { customersApi, Customer } from '@/api/customers';
import { delhiveryService } from '@/services/delhiveryService';
import { API_ROUTES } from '@/constants/api-routes';
import {
  OrderIdEntry,
  OrderItem,
  OrderUpdateRequest,
  PaymentMode,
  OrderSource,
} from '@/types/orders';
import { ImagePreviewModal } from '@/components/ui/ImagePreviewModal';
import { getSearchApiUrl } from '@/utils/api-config';
import { AddressData } from './AdminOrderCreateForm';

const WHATSAPP_GREEN = '#25D366';
const INSTAGRAM_PINK = '#E1306C';

export interface AdminOrderDetailViewProps {
  orderId: string;
  onBack?: () => void;
}

export const AdminOrderDetailView: React.FC<AdminOrderDetailViewProps> = ({
  orderId,
  onBack,
}) => {
  const theme = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orderData, setOrderData] = useState<OrderIdEntry | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  // Line items state
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);

  // Product edit modal state
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editProductCode, setEditProductCode] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState(1);
  const [editComments, setEditComments] = useState('');

  // Address state
  const [address, setAddress] = useState<AddressData | null>(null);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [sheetName, setSheetName] = useState('');
  const [sheetPhone, setSheetPhone] = useState('');
  const [sheetAddress, setSheetAddress] = useState('');
  const [sheetPincode, setSheetPincode] = useState('');
  const [sheetCity, setSheetCity] = useState('');
  const [sheetState, setSheetState] = useState('');
  const [sheetServiceable, setSheetServiceable] = useState<boolean | null>(null);
  const [isCheckingPin, setIsCheckingPin] = useState(false);

  // Financials & Payment state
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('COD');
  const [transactionId, setTransactionId] = useState('');
  const [isEditingTxn, setIsEditingTxn] = useState(false);
  const [shippingCharges, setShippingCharges] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);

  // Receipt screenshot state
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const data = await searchApiClient.get<any>(API_ROUTES.ORDERS.GET_BY_ID(orderId));
      setOrderData(data);
      setItems(data.items || []);
      setTransactionId(data.transactionId || '');
      setPaymentMode(data.paymentMode || 'COD');
      setShippingCharges(data.shippingCharges || 0);
      setAdvancePaid(data.advancePaid || 0);

      // Customer
      if (data.customerId) {
        try {
          const cust = await customersApi.getCustomerById(data.customerId);
          setCustomer(cust);
        } catch (e) {
          console.warn('Failed to load customer profile', e);
        }
      }

      // Address
      if (data.shippingStreet || data.customerAddress) {
        setAddress({
          name: data.customerName || '',
          phone: data.customerPhone || '',
          address: data.shippingStreet || data.customerAddress || '',
          pincode: data.shippingPincode || '',
          city: data.shippingCity || '',
          state: data.shippingState || '',
          isDelhiveryServiceable: data.isServiceable,
        });
      }

      // Receipt attachment
      const receipt = data.attachments?.find((a: any) => a.tag === 'receipt');
      if (receipt) {
        setReceiptUrl(`${getSearchApiUrl()}${API_ROUTES.ATTACHMENTS.DOWNLOAD(receipt.key)}`);
      } else {
        setReceiptUrl(null);
      }
    } catch (e) {
      console.error('[AdminOrderDetailView] Fetch error:', e);
      Alert.alert('Error', 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  };

  // ── Line Item Actions ──
  const handleToggleSelect = (id?: number) => {
    if (id === undefined) return;
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const validIds = items.map((_, idx) => idx);
    if (selectedItemIds.length === validIds.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(validIds);
    }
  };

  const handleBatchDeleteItems = () => {
    Alert.alert(
      'Remove Selected Items?',
      `Are you sure you want to remove ${selectedItemIds.length} item(s) from this order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setItems(prev => prev.filter((_, idx) => !selectedItemIds.includes(idx)));
            setSelectedItemIds([]);
          },
        },
      ]
    );
  };

  const openEditProductSheet = (item: OrderItem) => {
    setEditingItem(item);
    setEditTitle(item.productTitle || item.comments || '');
    setEditProductCode(item.productCode || item.productId || '');
    setEditUnitPrice(String(item.unitPrice || ''));
    setEditQuantity(item.quantity || 1);
    setEditComments(item.comments || '');
    setEditSheetOpen(true);
  };

  const handleSaveProductEdit = () => {
    if (!editingItem) return;
    const updatedPrice = Number(editUnitPrice) || 0;
    const updatedQty = Math.max(1, editQuantity);

    setItems(prev =>
      prev.map(it =>
        it === editingItem
          ? {
              ...it,
              productTitle: editTitle.trim(),
              productCode: editProductCode.trim(),
              productId: editProductCode.trim() || it.productId,
              unitPrice: updatedPrice,
              quantity: updatedQty,
              subtotal: updatedPrice * updatedQty,
              comments: editComments.trim() || undefined,
            }
          : it
      )
    );
    setEditSheetOpen(false);
  };

  const handleAddBlankItem = () => {
    const newItem: OrderItem = {
      productTitle: 'New Line Item',
      productCode: `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
      quantity: 1,
      unitPrice: 0,
      subtotal: 0,
    };
    setItems(prev => [...prev, newItem]);
    openEditProductSheet(newItem);
  };

  // ── Address Actions ──
  const openAddressSheet = () => {
    if (address) {
      setSheetName(address.name);
      setSheetPhone(address.phone);
      setSheetAddress(address.address);
      setSheetPincode(address.pincode);
      setSheetCity(address.city || '');
      setSheetState(address.state || '');
      setSheetServiceable(address.isDelhiveryServiceable ?? null);
    } else {
      setSheetName(orderData?.customerName || '');
      setSheetPhone(orderData?.customerPhone || '');
      setSheetAddress('');
      setSheetPincode('');
      setSheetCity('');
      setSheetState('');
      setSheetServiceable(null);
    }
    setAddressSheetOpen(true);
  };

  const handlePincodeChange = async (pin: string) => {
    const clean = pin.replace(/\D/g, '').slice(0, 6);
    setSheetPincode(clean);
    if (clean.length === 6) {
      setIsCheckingPin(true);
      try {
        const res = await delhiveryService.checkServiceability(clean);
        setSheetServiceable(res.isServiceable);
        if (res.city && !sheetCity) setSheetCity(res.city);
        if (res.state && !sheetState) setSheetState(res.state);
      } catch {
        setSheetServiceable(null);
      } finally {
        setIsCheckingPin(false);
      }
    } else {
      setSheetServiceable(null);
    }
  };

  const handleSaveAddress = () => {
    setAddress({
      name: sheetName.trim(),
      phone: sheetPhone.trim(),
      address: sheetAddress.trim(),
      pincode: sheetPincode.trim(),
      city: sheetCity.trim(),
      state: sheetState.trim(),
      isDelhiveryServiceable: sheetServiceable,
    });
    setAddressSheetOpen(false);
  };

  // ── Receipt Upload ──
  const handlePickReceipt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingReceipt(true);
        const fileUri = result.assets[0].uri;

        // Upload attachment
        const formData = new FormData();
        const filename = fileUri.split('/').pop() || 'receipt.jpg';
        formData.append('file', {
          uri: fileUri,
          name: filename,
          type: 'image/jpeg',
        } as any);
        formData.append('orderId', orderId);
        formData.append('tag', 'receipt');

        await searchApiClient.post(API_ROUTES.ATTACHMENTS.UPLOAD, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setReceiptUrl(fileUri);
        Alert.alert('Success', 'Payment receipt uploaded successfully!');
      }
    } catch (e) {
      console.warn('[AdminOrderDetailView] Receipt upload failed:', e);
      Alert.alert('Upload Failed', 'Could not upload payment screenshot.');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // ── Financial Totals ──
  const itemsTotal = items.reduce(
    (sum, item) => sum + (item.subtotal || (item.unitPrice || 0) * (item.quantity || 1)),
    0
  );
  const totalAmount = itemsTotal + (Number(shippingCharges) || 0);
  const codBalance = paymentMode === 'COD' ? Math.max(0, totalAmount - (Number(advancePaid) || 0)) : 0;

  // ── Save Order Changes ──
  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const updatePayload: OrderUpdateRequest = {
        customerName: address?.name || orderData?.customerName || undefined,
        customerPhone: address?.phone || orderData?.customerPhone || undefined,
        shippingStreet: address?.address || undefined,
        shippingCity: address?.city || undefined,
        shippingState: address?.state || undefined,
        shippingPincode: address?.pincode || undefined,
        paymentMode,
        transactionId: transactionId.trim() || undefined,
        advancePaid: paymentMode === 'COD' ? Number(advancePaid) : totalAmount,
        shippingCharges: Number(shippingCharges) || 0,
        totalAmount,
        items: items.map(item => ({
          productId: item.productId || item.productCode || undefined,
          productTitle: item.productTitle || undefined,
          productCode: item.productCode || undefined,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          subtotal: (item.unitPrice || 0) * (item.quantity || 1),
          comments: item.comments || undefined,
        })),
      };

      await searchApiClient.put(API_ROUTES.ORDERS.UPDATE(orderId), updatePayload);
      Alert.alert('Order Saved', `Order #${orderId} changes have been committed.`);
      setIsEditingTxn(false);
    } catch (e: any) {
      console.error('[AdminOrderDetailView] Save error:', e);
      Alert.alert('Save Failed', e.message || 'Could not update order.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Order ──
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await searchApiClient.delete(API_ROUTES.ORDERS.DELETE(orderId));
      setDeleteDialogOpen(false);
      Alert.alert('Deleted', `Order #${orderId} marked as deleted.`, [
        { text: 'OK', onPress: () => (onBack ? onBack() : router.back()) },
      ]);
    } catch (e: any) {
      Alert.alert('Delete Failed', e.message || 'Could not delete order.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
          Loading Order #{orderId}...
        </Text>
      </View>
    );
  }

  const activeContact = orderData?.customerPhone || orderData?.sourceHandle || '';
  const isWhatsApp = orderData?.source === 'WhatsApp';
  const isInstagram = orderData?.source === 'Instagram';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ── Section 1: DetailHeader ── */}
        <Surface style={styles.headerCard} elevation={1}>
          <View style={styles.headerTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text variant="headlineSmall" style={styles.orderIdText}>
                #{orderId}
              </Text>
              <IconButton
                icon="content-copy"
                size={18}
                onPress={async () => {
                  await Clipboard.setStringAsync(orderId);
                  Alert.alert('Copied', `Order ID #${orderId} copied to clipboard!`);
                }}
              />
            </View>

            {/* Status Pill */}
            <Chip
              mode="flat"
              style={[
                styles.statusChip,
                orderData?.isDeleted && { backgroundColor: '#FCE8E6' },
              ]}
              textStyle={{
                color: orderData?.isDeleted ? '#C5221F' : theme.colors.primary,
                fontWeight: '700',
                fontSize: 12,
              }}
            >
              {orderData?.isDeleted ? 'DELETED' : 'ACTIVE ORDER'}
            </Chip>
          </View>

          {/* Time & Payment Method Row */}
          <View style={styles.timePaymentRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Created: {orderData?.timestamp ? new Date(orderData.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
            </Text>
            <View style={styles.paymentBadge}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                {paymentMode}
              </Text>
            </View>
          </View>
        </Surface>

        {/* ── Section 2: SourceRow ── */}
        {activeContact.length > 0 && (
          <Surface style={styles.sectionCard} elevation={1}>
            <View style={styles.sourceRow}>
              <View style={styles.sourceLeft}>
                <View
                  style={[
                    styles.sourceIconBadge,
                    { backgroundColor: isWhatsApp ? `${WHATSAPP_GREEN}18` : `${INSTAGRAM_PINK}18` },
                  ]}
                >
                  <Icon
                    source={isWhatsApp ? 'whatsapp' : 'instagram'}
                    size={22}
                    color={isWhatsApp ? WHATSAPP_GREEN : INSTAGRAM_PINK}
                  />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                    {orderData?.source || 'Contact'}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {activeContact}
                  </Text>
                </View>
              </View>

              {/* Quick Communication Actions */}
              <View style={styles.sourceActionsRow}>
                {isWhatsApp && (
                  <>
                    <IconButton
                      icon="phone"
                      size={20}
                      iconColor={theme.colors.primary}
                      onPress={() => Linking.openURL(`tel:${activeContact.replace(/\D/g, '')}`)}
                    />
                    <IconButton
                      icon="whatsapp"
                      size={22}
                      iconColor={WHATSAPP_GREEN}
                      onPress={() => {
                        const clean = activeContact.replace(/\D/g, '');
                        Linking.openURL(`https://wa.me/${clean}`);
                      }}
                    />
                  </>
                )}
                {isInstagram && (
                  <IconButton
                    icon="instagram"
                    size={22}
                    iconColor={INSTAGRAM_PINK}
                    onPress={() => {
                      const handle = activeContact.replace('@', '').trim();
                      Linking.openURL(`https://ig.me/m/${handle}`);
                    }}
                  />
                )}
              </View>
            </View>
          </Surface>
        )}

        {/* ── Section 3: ProductListSection ── */}
        <Surface style={styles.sectionCard} elevation={1}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Line Items ({items.length})
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {selectedItemIds.length > 0 && (
                <Button
                  mode="text"
                  compact
                  textColor={theme.colors.error}
                  onPress={handleBatchDeleteItems}
                >
                  Delete ({selectedItemIds.length})
                </Button>
              )}
              <Button mode="text" compact icon="plus" onPress={handleAddBlankItem}>
                Add Item
              </Button>
            </View>
          </View>

          {items.length > 0 && (
            <View style={styles.selectAllRow}>
              <Checkbox
                status={selectedItemIds.length === items.length && items.length > 0 ? 'checked' : 'unchecked'}
                onPress={handleToggleSelectAll}
              />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Select all items
              </Text>
            </View>
          )}

          {items.map((item, idx) => {
            const isSelected = selectedItemIds.includes(idx);
            const lineTotal = (item.unitPrice || 0) * (item.quantity || 1);

            return (
              <View key={idx} style={[styles.itemCard, isSelected && styles.itemCardSelected]}>
                <Checkbox
                  status={isSelected ? 'checked' : 'unchecked'}
                  onPress={() => handleToggleSelect(idx)}
                />

                <View style={styles.itemInfo}>
                  <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                    {item.productTitle || item.productCode || 'Custom Line Item'}
                  </Text>
                  {item.productCode && (
                    <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                      Code: {item.productCode}
                    </Text>
                  )}
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    ₹{item.unitPrice?.toLocaleString('en-IN') || 0} × {item.quantity || 1}
                  </Text>
                </View>

                <View style={styles.itemRight}>
                  <Text variant="titleMedium" style={{ fontWeight: '800' }}>
                    ₹{lineTotal.toLocaleString('en-IN')}
                  </Text>
                  <IconButton
                    icon="pencil"
                    size={18}
                    onPress={() => openEditProductSheet(item)}
                  />
                </View>
              </View>
            );
          })}
        </Surface>

        {/* ── Section 4: Delivery Address Card ── */}
        <Surface style={styles.sectionCard} elevation={1}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Shipping Address
            </Text>
            <IconButton icon="pencil" size={18} onPress={openAddressSheet} />
          </View>

          {address ? (
            <View style={styles.addressCardContent}>
              <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                {address.name}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {address.address}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {[address.city, address.state, `PIN: ${address.pincode}`].filter(Boolean).join(', ')}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                📞 {address.phone}
              </Text>

              {/* Serviceability Badge */}
              <View style={{ marginTop: 6, flexDirection: 'row' }}>
                {address.isDelhiveryServiceable === true && (
                  <Chip icon="check-circle" style={styles.chipSuccess} textStyle={{ color: '#137333', fontSize: 11 }}>
                    Delhivery Serviceable
                  </Chip>
                )}
                {address.isDelhiveryServiceable === false && (
                  <Chip icon="alert-circle" style={styles.chipError} textStyle={{ color: '#C5221F', fontSize: 11 }}>
                    Unserviceable Pincode
                  </Chip>
                )}
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.emptyAddressBox} onPress={openAddressSheet}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                + Add Shipping Address
              </Text>
            </TouchableOpacity>
          )}
        </Surface>

        {/* ── Section 5: Payment & Transaction Proof ── */}
        <Surface style={styles.sectionCard} elevation={1}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Payment Details & Receipt
          </Text>

          {/* Payment Method Switcher */}
          <View style={styles.paymentToggleRow}>
            {(['COD', 'Prepaid'] as PaymentMode[]).map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setPaymentMode(p)}
                style={[
                  styles.paymentOptionPill,
                  paymentMode === p && { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.paymentOptionText,
                    { color: paymentMode === p ? theme.colors.onPrimary : theme.colors.onSurfaceVariant },
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transaction ID */}
          <View style={styles.txnIdRow}>
            {isEditingTxn ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  mode="outlined"
                  dense
                  label="Bank / UPI Transaction ID"
                  value={transactionId}
                  onChangeText={setTransactionId}
                  style={{ flex: 1, height: 40 }}
                />
                <IconButton icon="check" size={18} onPress={() => setIsEditingTxn(false)} />
              </View>
            ) : (
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Txn ID: <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>{transactionId || 'None'}</Text>
                </Text>
                <IconButton icon="pencil" size={16} onPress={() => setIsEditingTxn(true)} />
              </View>
            )}
          </View>

          {/* Receipt Screenshot Section */}
          <View style={styles.receiptSection}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
              Payment Screenshot
            </Text>
            {receiptUrl ? (
              <View style={styles.receiptPreviewBox}>
                <TouchableOpacity onPress={() => setPreviewImage(receiptUrl)}>
                  <Image source={{ uri: receiptUrl }} style={styles.receiptImage} />
                </TouchableOpacity>
                <Button
                  mode="text"
                  compact
                  icon="camera"
                  loading={isUploadingReceipt}
                  onPress={handlePickReceipt}
                >
                  Replace Screenshot
                </Button>
              </View>
            ) : (
              <Button
                mode="outlined"
                icon="camera-plus"
                loading={isUploadingReceipt}
                onPress={handlePickReceipt}
                style={styles.uploadReceiptBtn}
              >
                Upload Payment Receipt
              </Button>
            )}
          </View>

          {/* Financial Breakdown */}
          <View style={styles.divider} />
          <View style={styles.financialRow}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Items Subtotal ({items.length} items)
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
              ₹{itemsTotal.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.financialInputRow}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Shipping Charges
            </Text>
            <TextInput
              mode="outlined"
              dense
              keyboardType="numeric"
              value={String(shippingCharges)}
              onChangeText={txt => setShippingCharges(Number(txt) || 0)}
              style={styles.miniFinancialInput}
              left={<TextInput.Affix text="₹" />}
            />
          </View>

          {paymentMode === 'COD' && (
            <View style={styles.financialInputRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Advance Paid
              </Text>
              <TextInput
                mode="outlined"
                dense
                keyboardType="numeric"
                value={String(advancePaid)}
                onChangeText={txt => setAdvancePaid(Number(txt) || 0)}
                style={styles.miniFinancialInput}
                left={<TextInput.Affix text="₹" />}
              />
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.financialRow}>
            <Text variant="titleMedium" style={{ fontWeight: '800' }}>
              Total Order Value
            </Text>
            <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.primary }}>
              ₹{totalAmount.toLocaleString('en-IN')}
            </Text>
          </View>

          {paymentMode === 'COD' && (
            <View style={styles.financialRow}>
              <Text variant="bodySmall" style={{ color: '#B06000', fontWeight: '700' }}>
                Pending Balance to Collect
              </Text>
              <Text variant="bodySmall" style={{ color: '#B06000', fontWeight: '800' }}>
                ₹{codBalance.toLocaleString('en-IN')}
              </Text>
            </View>
          )}
        </Surface>

        {/* ── Section 6: Fulfillment Action Center ── */}
        <Surface style={[styles.sectionCard, styles.fulfillmentBanner]} elevation={1}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ fontWeight: '800', color: '#1A365D' }}>
              Logistics & Split Fulfillment
            </Text>
            <Text variant="bodySmall" style={{ color: '#4A5568', marginTop: 2 }}>
              Generate Delhivery AWB, build vendor packages, and print shipping labels.
            </Text>
          </View>
          <Button
            mode="contained"
            icon="truck-delivery"
            buttonColor="#1A365D"
            onPress={() => router.push(`/orders/${orderId}/fulfillment` as any)}
          >
            Fulfill
          </Button>
        </Surface>
      </ScrollView>

      {/* ── Sticky Bottom Action Bar ── */}
      <Surface style={styles.bottomBar} elevation={4}>
        <Button
          mode="text"
          textColor={theme.colors.error}
          onPress={() => setDeleteDialogOpen(true)}
          style={{ flex: 0.8 }}
        >
          Delete
        </Button>
        <Button
          mode="contained"
          icon="check"
          loading={saving}
          disabled={saving}
          onPress={handleSaveOrder}
          style={{ flex: 2 }}
          contentStyle={{ height: 48 }}
          labelStyle={{ fontWeight: '800' }}
        >
          Save Changes
        </Button>
      </Surface>

      {/* ── Product Edit Modal Sheet ── */}
      <Portal>
        <Modal
          visible={editSheetOpen}
          onDismiss={() => setEditSheetOpen(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleMedium" style={{ fontWeight: '800', marginBottom: 12 }}>
            Edit Line Item
          </Text>
          <TextInput
            mode="outlined"
            label="Product Title / Name *"
            value={editTitle}
            onChangeText={setEditTitle}
            style={styles.sheetInput}
          />
          <TextInput
            mode="outlined"
            label="Product Code / SKU"
            value={editProductCode}
            onChangeText={setEditProductCode}
            style={styles.sheetInput}
          />
          <TextInput
            mode="outlined"
            label="Unit Price (₹) *"
            keyboardType="numeric"
            value={editUnitPrice}
            onChangeText={setEditUnitPrice}
            style={styles.sheetInput}
          />
          <View style={styles.qtyEditRow}>
            <Text variant="bodyMedium">Quantity:</Text>
            <View style={styles.qtyControls}>
              <IconButton
                icon="minus"
                size={18}
                onPress={() => setEditQuantity(q => Math.max(1, q - 1))}
              />
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                {editQuantity}
              </Text>
              <IconButton icon="plus" size={18} onPress={() => setEditQuantity(q => q + 1)} />
            </View>
          </View>
          <TextInput
            mode="outlined"
            label="Comments / Sizing notes"
            value={editComments}
            onChangeText={setEditComments}
            style={styles.sheetInput}
          />

          <View style={styles.modalActions}>
            <Button mode="text" onPress={() => setEditSheetOpen(false)}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleSaveProductEdit}>
              Update Item
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* ── Address Edit Sheet Modal ── */}
      <Portal>
        <Modal
          visible={addressSheetOpen}
          onDismiss={() => setAddressSheetOpen(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleMedium" style={{ fontWeight: '800', marginBottom: 12 }}>
            Shipping Address
          </Text>
          <ScrollView style={{ maxHeight: 360 }}>
            <TextInput
              mode="outlined"
              label="Recipient Name *"
              value={sheetName}
              onChangeText={setSheetName}
              style={styles.sheetInput}
            />
            <TextInput
              mode="outlined"
              label="Phone Number"
              keyboardType="phone-pad"
              value={sheetPhone}
              onChangeText={setSheetPhone}
              style={styles.sheetInput}
            />
            <TextInput
              mode="outlined"
              label="Street / House / Landmark *"
              multiline
              numberOfLines={2}
              value={sheetAddress}
              onChangeText={setSheetAddress}
              style={styles.sheetInput}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                mode="outlined"
                label="City"
                value={sheetCity}
                onChangeText={setSheetCity}
                style={[styles.sheetInput, { flex: 1 }]}
              />
              <TextInput
                mode="outlined"
                label="State"
                value={sheetState}
                onChangeText={setSheetState}
                style={[styles.sheetInput, { flex: 1 }]}
              />
            </View>
            <TextInput
              mode="outlined"
              label="6-Digit Pincode *"
              keyboardType="numeric"
              maxLength={6}
              value={sheetPincode}
              onChangeText={handlePincodeChange}
              style={styles.sheetInput}
              right={isCheckingPin ? <TextInput.Icon icon={() => <ActivityIndicator size={16} />} /> : undefined}
            />

            {sheetServiceable === true && (
              <Chip icon="check-circle" style={styles.chipSuccess} textStyle={{ color: '#137333', fontSize: 11 }}>
                Delhivery Serviceable
              </Chip>
            )}
            {sheetServiceable === false && (
              <Chip icon="alert-circle" style={styles.chipError} textStyle={{ color: '#C5221F', fontSize: 11 }}>
                Unserviceable Pincode
              </Chip>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <Button mode="text" onPress={() => setAddressSheetOpen(false)}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleSaveAddress}>
              Save Address
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={deleteDialogOpen} onDismiss={() => setDeleteDialogOpen(false)}>
          <Dialog.Title>Delete Order #{orderId}?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to mark this order as deleted? This action will archive all associated records.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              textColor={theme.colors.error}
              loading={isDeleting}
              disabled={isDeleting}
              onPress={handleConfirmDelete}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Full-screen Image Preview Modal */}
      <ImagePreviewModal
        visible={!!previewImage}
        imageUrl={previewImage || ''}
        onDismiss={() => setPreviewImage(null)}
        title={`Payment Receipt #${orderId}`}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 90,
  },
  headerCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdText: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusChip: {
    backgroundColor: '#E8F0FE',
  },
  timePaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  paymentBadge: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sectionCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemCardSelected: {
    backgroundColor: '#EBF8FF',
    borderColor: '#3182CE',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 6,
  },
  itemRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  addressCardContent: {
    marginTop: 4,
  },
  emptyAddressBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E0',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  chipSuccess: {
    backgroundColor: '#E6F4EA',
  },
  chipError: {
    backgroundColor: '#FCE8E6',
  },
  paymentToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 16,
    padding: 3,
    gap: 6,
    marginTop: 6,
  },
  paymentOptionPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 14,
  },
  paymentOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  txnIdRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptSection: {
    marginTop: 10,
  },
  receiptPreviewBox: {
    alignItems: 'center',
  },
  receiptImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#EDF2F7',
  },
  uploadReceiptBtn: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  financialInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  miniFinancialInput: {
    width: 100,
    height: 38,
  },
  fulfillmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BEE3F8',
    padding: 14,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  modalContainer: {
    margin: 20,
    padding: 18,
    borderRadius: 16,
  },
  sheetInput: {
    marginBottom: 10,
  },
  qtyEditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
});
