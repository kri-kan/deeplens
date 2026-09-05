import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Alert,
  Platform,
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
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';

import { useShareIntentContext } from '@/context/ShareIntentContext';
import { searchApiClient } from '@/api/client';
import { customersApi } from '@/api/customers';
import { delhiveryService, PincodeCheckResult } from '@/services/delhiveryService';
import { API_ROUTES } from '@/constants/api-routes';
import {
  OrderSource,
  PaymentMode,
  OrderIdEntry,
  OrderItemDraft,
  ShippingAddressDraft,
  OrderUpdateRequest,
} from '@/types/orders';

import { ExistingOrderAutocomplete } from './ExistingOrderAutocomplete';
import { CatalogOrderItemsList } from './CatalogOrderItemsList';
import { CatalogItemPickerModal } from './CatalogItemPickerModal';

// Brand colors
const WHATSAPP_GREEN = '#25D366';
const INSTAGRAM_PINK = '#E1306C';

export interface AddressData {
  name: string;
  phone: string;
  address: string;
  pincode: string;
  city?: string;
  state?: string;
  isDelhiveryServiceable?: boolean | null;
}

export const AdminOrderCreateForm: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { sharedMedia, commitCurrentSession, discardCurrentSession, removeSharedMedia } = useShareIntentContext();

  // Mode state
  const [mode, setMode] = useState<'create_new' | 'attach_existing'>('create_new');
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(undefined);

  // Customer & Source State
  const [source, setSource] = useState<OrderSource>('WhatsApp');
  const [sourceInput, setSourceInput] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('COD');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);

  // Financials State
  const [shippingCharges, setShippingCharges] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [notes, setNotes] = useState('');

  // Structured Address State
  const [address, setAddress] = useState<AddressData | null>(null);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [isCheckingPin, setIsCheckingPin] = useState(false);

  // Temporary sheet state for editing address
  const [sheetName, setSheetName] = useState('');
  const [sheetPhone, setSheetPhone] = useState('');
  const [sheetAddress, setSheetAddress] = useState('');
  const [sheetPincode, setSheetPincode] = useState('');
  const [sheetCity, setSheetCity] = useState('');
  const [sheetState, setSheetState] = useState('');
  const [sheetServiceable, setSheetServiceable] = useState<boolean | null>(null);
  const [isParsingClipboard, setIsParsingClipboard] = useState(false);

  // Items State (Media drafts + Catalog drafts)
  const [mediaDrafts, setMediaDrafts] = useState<OrderItemDraft[]>([]);
  const [catalogDrafts, setCatalogDrafts] = useState<OrderItemDraft[]>([]);
  const [catalogPickerVisible, setCatalogPickerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync staged shared media items to mediaDrafts
  useEffect(() => {
    setMediaDrafts(prev => {
      const existingByUri = new Map(prev.map(d => [d.mediaUri, d]));
      return sharedMedia.map((m, idx) => {
        const existing = existingByUri.get(m.uri);
        if (existing) return existing;
        return {
          id: `media-${idx}-${Date.now()}`,
          sourceType: 'media',
          mediaUri: m.uri,
          productCode: '',
          quantity: 1,
          unitPrice: 0,
          subtotal: 0,
        };
      });
    });
  }, [sharedMedia]);

  // Handle selected existing order population
  const handleSelectExistingOrder = (order: OrderIdEntry | null) => {
    if (!order) {
      setSelectedOrderId(undefined);
      return;
    }
    setSelectedOrderId(order.id);
    if (order.source) setSource(order.source);
    if (order.sourceHandle || order.customerPhone) {
      setSourceInput(order.sourceHandle || order.customerPhone || '');
    }
    if (order.customerName) setCustomerName(order.customerName);
    if (order.paymentMode) setPaymentMode(order.paymentMode);
    if (order.customerId) setCustomerId(order.customerId);
    if (order.shippingStreet || order.customerAddress) {
      setAddress({
        name: order.customerName || '',
        phone: order.customerPhone || '',
        address: order.shippingStreet || order.customerAddress || '',
        pincode: order.shippingPincode || '',
        city: order.shippingCity || '',
        state: order.shippingState || '',
        isDelhiveryServiceable: order.isServiceable,
      });
    }
    if (order.advancePaid) setAdvancePaid(order.advancePaid);
    if (order.shippingCharges) setShippingCharges(order.shippingCharges);
  };

  // Add Reference Image from Device Gallery
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newDrafts: OrderItemDraft[] = result.assets.map((asset, idx) => ({
          id: `local-media-${Date.now()}-${idx}`,
          sourceType: 'media',
          mediaUri: asset.uri,
          productCode: '',
          quantity: 1,
          unitPrice: 0,
          subtotal: 0,
        }));
        setMediaDrafts(prev => [...prev, ...newDrafts]);
      }
    } catch (e) {
      console.warn('[AdminOrderCreateForm] Failed to pick image:', e);
      Alert.alert('Image Selection Error', 'Could not open image picker.');
    }
  };

  const handleRemoveMedia = (id: string, mediaIndex?: number) => {
    setMediaDrafts(prev => prev.filter(item => item.id !== id));
    if (mediaIndex !== undefined) {
      removeSharedMedia(mediaIndex);
    }
  };

  const handleUpdateMediaPrice = (id: string, price: number) => {
    setMediaDrafts(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, unitPrice: price, subtotal: price * (item.quantity || 1) }
          : item
      )
    );
  };

  const handleUpdateMediaQty = (id: string, qty: number) => {
    setMediaDrafts(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(1, qty), subtotal: (item.unitPrice || 0) * Math.max(1, qty) }
          : item
      )
    );
  };

  // Address Sheet Helpers
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
      setSheetName(customerName);
      setSheetPhone(source === 'WhatsApp' ? sourceInput : '');
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
      } catch (e) {
        setSheetServiceable(null);
      } finally {
        setIsCheckingPin(false);
      }
    } else {
      setSheetServiceable(null);
    }
  };

  const handlePasteAddressFromClipboard = async () => {
    try {
      setIsParsingClipboard(true);
      const text = await Clipboard.getStringAsync();
      if (!text || !text.trim()) {
        Alert.alert('Clipboard Empty', 'Please copy an address message first.');
        return;
      }

      const raw = text.trim();
      // Extract 6-digit pincode
      const pinMatch = raw.match(/\b(\d{6})\b/);
      // Extract 10-digit phone number
      const phoneMatch = raw.match(/(\+?91[\s-]?)?([6-9]\d{9})\b/);

      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
      let detectedName = '';
      if (lines.length > 0 && !lines[0].match(/\d/) && lines[0].length < 40) {
        detectedName = lines[0].replace(/^(Name|Customer):\s*/i, '');
      }

      if (detectedName) setSheetName(detectedName);
      if (phoneMatch) setSheetPhone(phoneMatch[2]);
      if (pinMatch) {
        handlePincodeChange(pinMatch[1]);
      }

      // Address text: remaining text with phone/pincode stripped
      const cleanAddress = raw
        .replace(/^(Name|Customer):\s*.+/im, '')
        .replace(/(\+?91[\s-]?)?([6-9]\d{9})\b/g, '')
        .replace(/\b\d{6}\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanAddress) {
        setSheetAddress(cleanAddress);
      }
    } catch (e) {
      console.warn('[AdminOrderCreateForm] Clipboard paste failed:', e);
    } finally {
      setIsParsingClipboard(false);
    }
  };

  const handleSaveAddress = () => {
    if (!sheetName.trim()) {
      Alert.alert('Validation', 'Please enter recipient name.');
      return;
    }
    if (!sheetAddress.trim()) {
      Alert.alert('Validation', 'Please enter street address.');
      return;
    }
    if (!sheetPincode || sheetPincode.length < 6) {
      Alert.alert('Validation', 'Please enter a valid 6-digit pincode.');
      return;
    }

    setAddress({
      name: sheetName.trim(),
      phone: sheetPhone.trim(),
      address: sheetAddress.trim(),
      pincode: sheetPincode.trim(),
      city: sheetCity.trim(),
      state: sheetState.trim(),
      isDelhiveryServiceable: sheetServiceable,
    });
    if (!customerName) setCustomerName(sheetName.trim());
    setAddressSheetOpen(false);
  };

  // Financial Calculations
  const allItems = [...mediaDrafts, ...catalogDrafts];
  const itemsTotal = allItems.reduce(
    (sum, item) => sum + (item.subtotal || (item.unitPrice || 0) * (item.quantity || 1)),
    0
  );
  const totalAmount = itemsTotal + (Number(shippingCharges) || 0);
  const codBalance = paymentMode === 'COD' ? Math.max(0, totalAmount - (Number(advancePaid) || 0)) : 0;

  // Final Order Submission
  const handleSubmitOrder = async () => {
    const activeHandle = sourceInput.trim();
    if (!activeHandle) {
      Alert.alert('Required Info Missing', `Please enter the Customer ${source === 'WhatsApp' ? 'Phone Number' : 'Instagram Handle'}.`);
      return;
    }

    if (mode === 'attach_existing' && !selectedOrderId) {
      Alert.alert('Reference Required', 'Please select an existing Order ID to attach to.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Resolve or create customer profile
      let resolvedCustomerId = customerId;
      if (!resolvedCustomerId && activeHandle) {
        try {
          const cust = await customersApi.getOrCreateCustomer(
            source === 'WhatsApp' ? activeHandle : undefined,
            source === 'Instagram' ? activeHandle : undefined
          );
          if (cust && cust.id) {
            resolvedCustomerId = cust.id;
          }
        } catch (e) {
          console.warn('[AdminOrderCreateForm] Customer resolve skipped:', e);
        }
      }

      // 2. Generate new order ID if creating new order
      let targetOrderId = selectedOrderId;
      if (mode === 'create_new') {
        const genRes = await searchApiClient.post<{ orderId: string }>(API_ROUTES.ORDERS.GENERATE, null, {
          params: {
            source,
            paymentMode,
            sourceHandle: activeHandle,
            customerId: resolvedCustomerId,
          },
        });
        targetOrderId = genRes.orderId;
      }

      if (!targetOrderId) {
        throw new Error('Failed to obtain target Order ID');
      }

      // 3. Map line items
      const orderItemsPayload = allItems.map(item => ({
        productId: item.productId || item.productCode || undefined,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        subtotal: item.subtotal || ((item.unitPrice || 0) * (item.quantity || 1)),
        vendorId: item.vendorId,
        sourceType: item.sourceType,
        comments: item.comments || (item.productCode ? `Code: ${item.productCode}` : undefined),
      }));

      // 4. Update order details on backend
      const updatePayload: OrderUpdateRequest = {
        customerName: (address?.name || customerName).trim() || undefined,
        customerPhone: source === 'WhatsApp' ? activeHandle : (address?.phone || undefined),
        sourceHandle: activeHandle,
        shippingStreet: address?.address || undefined,
        shippingCity: address?.city || undefined,
        shippingState: address?.state || undefined,
        shippingPincode: address?.pincode || undefined,
        paymentMode,
        advancePaid: paymentMode === 'COD' ? Number(advancePaid) : totalAmount,
        shippingCharges: Number(shippingCharges) || 0,
        totalAmount,
        items: orderItemsPayload.length > 0 ? orderItemsPayload : undefined,
      };

      await searchApiClient.put(API_ROUTES.ORDERS.UPDATE(targetOrderId), updatePayload);

      // 5. Commit share intent session if applicable
      await commitCurrentSession();

      Alert.alert(
        'Order Successful 🎉',
        mode === 'create_new'
          ? `Order #${targetOrderId} has been created!`
          : `Order #${targetOrderId} updated with new items!`,
        [
          {
            text: 'View Details',
            onPress: () => router.push(`/utilities/order-details/${targetOrderId}` as any),
          },
          {
            text: 'Create Another',
            onPress: () => {
              setSelectedOrderId(undefined);
              setSourceInput('');
              setCustomerName('');
              setAddress(null);
              setMediaDrafts([]);
              setCatalogDrafts([]);
              setShippingCharges(0);
              setAdvancePaid(0);
              setNotes('');
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('[AdminOrderCreateForm] Submit error:', err);
      Alert.alert('Submission Failed', err.message || 'Could not save order. Please check network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Mode Switcher */}
        <Surface style={styles.modeCard} elevation={1}>
          <ExistingOrderAutocomplete
            mode={mode}
            onModeChange={setMode}
            selectedOrderId={selectedOrderId}
            onSelectOrder={handleSelectExistingOrder}
          />
        </Surface>

        {/* ── Section 1: Order Type (Source & Payment) ── */}
        <Surface style={styles.sectionCard} elevation={1}>
          <View style={styles.rowBetween}>
            {/* Platform Brand Icons */}
            <View style={styles.platformIconsRow}>
              {/* WhatsApp Icon */}
              <TouchableOpacity
                accessibilityLabel="Select WhatsApp as order source"
                onPress={() => {
                  setSource('WhatsApp');
                  setSourceInput('');
                }}
                style={[
                  styles.platformIconButton,
                  source === 'WhatsApp' && { borderColor: WHATSAPP_GREEN, backgroundColor: `${WHATSAPP_GREEN}14` },
                ]}
              >
                <Icon source="whatsapp" size={26} color={source === 'WhatsApp' ? WHATSAPP_GREEN : theme.colors.outline} />
              </TouchableOpacity>

              {/* Instagram Icon */}
              <TouchableOpacity
                accessibilityLabel="Select Instagram as order source"
                onPress={() => {
                  setSource('Instagram');
                  setSourceInput('');
                }}
                style={[
                  styles.platformIconButton,
                  source === 'Instagram' && { borderColor: INSTAGRAM_PINK, backgroundColor: `${INSTAGRAM_PINK}14` },
                ]}
              >
                <Icon source="instagram" size={26} color={source === 'Instagram' ? INSTAGRAM_PINK : theme.colors.outline} />
              </TouchableOpacity>
            </View>

            {/* Payment Mode Pills */}
            <View style={styles.paymentPillGroup}>
              {(['COD', 'Prepaid'] as PaymentMode[]).map(p => {
                const isActive = paymentMode === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPaymentMode(p)}
                    style={[
                      styles.paymentPill,
                      isActive && { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.paymentPillText,
                        { color: isActive ? theme.colors.onPrimary : theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Dynamic Smart Contact Input */}
          <View style={styles.sourceInputWrapper}>
            <TextInput
              mode="outlined"
              label={source === 'WhatsApp' ? 'WhatsApp Phone Number *' : 'Instagram Handle / URL *'}
              placeholder={source === 'WhatsApp' ? '+91 98765 43210' : '@username or profile link'}
              value={sourceInput}
              onChangeText={setSourceInput}
              keyboardType={source === 'WhatsApp' ? 'phone-pad' : 'default'}
              autoCapitalize="none"
              style={styles.textInput}
              left={<TextInput.Icon icon={source === 'WhatsApp' ? 'phone' : 'at'} color={source === 'WhatsApp' ? WHATSAPP_GREEN : INSTAGRAM_PINK} />}
              right={
                sourceInput.trim().length > 0 ? (
                  <TextInput.Icon
                    icon="open-in-new"
                    color={source === 'WhatsApp' ? WHATSAPP_GREEN : INSTAGRAM_PINK}
                    onPress={() => {
                      if (source === 'WhatsApp') {
                        const clean = sourceInput.replace(/\D/g, '');
                        if (clean) Linking.openURL(`https://wa.me/${clean}`);
                      } else {
                        const clean = sourceInput.replace(/^@/, '').trim();
                        if (clean) Linking.openURL(`https://ig.me/m/${clean}`);
                      }
                    }}
                  />
                ) : undefined
              }
            />
          </View>
        </Surface>

        {/* ── Section 2: Reference Images / Staged Media ── */}
        <Surface style={styles.sectionCard} elevation={1}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Reference Media ({mediaDrafts.length})
            </Text>
            <TouchableOpacity onPress={handlePickImage}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>+ Add Photos</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaTilesRow}>
            {/* Add Media Tile */}
            <TouchableOpacity style={styles.addMediaTile} onPress={handlePickImage}>
              <View style={[styles.addMediaCircle, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="camera-plus" size={20} color={theme.colors.primary} />
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.primary, marginTop: 4, fontWeight: '600' }}>
                Add Photo
              </Text>
            </TouchableOpacity>

            {/* Media Drafts */}
            {mediaDrafts.map((item, idx) => (
              <View key={item.id} style={styles.mediaTileCard}>
                <Image source={{ uri: item.mediaUri }} style={styles.mediaThumbnail} />
                <TouchableOpacity
                  style={styles.mediaDeleteBadge}
                  onPress={() => handleRemoveMedia(item.id, idx)}
                >
                  <Icon source="close" size={12} color="#FFF" />
                </TouchableOpacity>

                {/* Price & Quantity input tag */}
                <View style={styles.mediaItemTagRow}>
                  <TextInput
                    mode="flat"
                    dense
                    keyboardType="numeric"
                    placeholder="₹ Price"
                    value={item.unitPrice ? String(item.unitPrice) : ''}
                    onChangeText={txt => handleUpdateMediaPrice(item.id, Number(txt) || 0)}
                    style={styles.miniPriceInput}
                  />
                  <View style={styles.miniQtyRow}>
                    <TouchableOpacity onPress={() => handleUpdateMediaQty(item.id, (item.quantity || 1) - 1)}>
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity || 1}</Text>
                    <TouchableOpacity onPress={() => handleUpdateMediaQty(item.id, (item.quantity || 1) + 1)}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </Surface>

        {/* ── Section 3: Catalog Order Items ── */}
        <CatalogOrderItemsList
          items={catalogDrafts}
          onAddItem={item => setCatalogDrafts(prev => [item, ...prev])}
          onRemoveItem={id => setCatalogDrafts(prev => prev.filter(it => it.id !== id))}
        />

        {/* ── Section 4: Delivery Address Card ── */}
        <Surface style={styles.sectionCard} elevation={1}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Delivery Address
          </Text>

          {address ? (
            <View style={styles.addressCard}>
              <View style={styles.addressHeaderRow}>
                <View style={styles.addressNameRow}>
                  <Icon source="map-marker" size={20} color={theme.colors.primary} />
                  <Text variant="titleSmall" style={{ fontWeight: '700', marginLeft: 6 }}>
                    {address.name}
                  </Text>
                </View>
                <IconButton icon="pencil" size={18} onPress={openAddressSheet} />
              </View>

              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {address.address}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {[address.city, address.state, `PIN: ${address.pincode}`].filter(Boolean).join(', ')}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                📞 {address.phone}
              </Text>

              {/* Delhivery Status Badge */}
              <View style={styles.serviceableRow}>
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
            <TouchableOpacity style={styles.emptyAddressCard} onPress={openAddressSheet}>
              <View style={[styles.addMediaCircle, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="plus" size={18} color={theme.colors.primary} />
              </View>
              <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '600', marginTop: 4 }}>
                Add Delivery Address
              </Text>
            </TouchableOpacity>
          )}
        </Surface>

        {/* ── Section 5: Financials Summary ── */}
        <Surface style={styles.sectionCard} elevation={1}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Payment & Financials
          </Text>

          <View style={styles.financialRow}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Items Subtotal ({allItems.length} items)
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
              Total Amount
            </Text>
            <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.primary }}>
              ₹{totalAmount.toLocaleString('en-IN')}
            </Text>
          </View>

          {paymentMode === 'COD' && (
            <View style={styles.financialRow}>
              <Text variant="bodySmall" style={{ color: '#B06000', fontWeight: '700' }}>
                Pending Balance (COD Collect)
              </Text>
              <Text variant="bodySmall" style={{ color: '#B06000', fontWeight: '800' }}>
                ₹{codBalance.toLocaleString('en-IN')}
              </Text>
            </View>
          )}
        </Surface>

        {/* Order Notes */}
        <Surface style={styles.sectionCard} elevation={1}>
          <TextInput
            mode="outlined"
            label="Internal Order Notes (Optional)"
            placeholder="Special delivery instructions, vendor coordination, etc."
            multiline
            numberOfLines={2}
            value={notes}
            onChangeText={setNotes}
            style={styles.notesInput}
          />
        </Surface>
      </ScrollView>

      {/* ── Sticky Bottom Create Button Bar ── */}
      <Surface style={styles.bottomBar} elevation={4}>
        <Button
          mode="contained"
          icon={mode === 'create_new' ? 'check-bold' : 'link-variant'}
          loading={isSubmitting}
          disabled={isSubmitting}
          onPress={handleSubmitOrder}
          contentStyle={styles.bottomButtonContent}
          style={styles.bottomButton}
          labelStyle={{ fontSize: 16, fontWeight: '800' }}
        >
          {mode === 'create_new'
            ? `Create Order • ₹${totalAmount.toLocaleString('en-IN')}`
            : `Attach to #${selectedOrderId || 'Order'}`}
        </Button>
      </Surface>

      {/* ── Address Drawer Sheet Modal ── */}
      <Portal>
        <Modal
          visible={addressSheetOpen}
          onDismiss={() => setAddressSheetOpen(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ fontWeight: '800' }}>
              Delivery Address
            </Text>
            <IconButton icon="close" size={20} onPress={() => setAddressSheetOpen(false)} />
          </View>

          {/* Paste from Clipboard Button */}
          <Button
            mode="outlined"
            icon="clipboard-arrow-down-outline"
            loading={isParsingClipboard}
            onPress={handlePasteAddressFromClipboard}
            style={styles.clipboardButton}
          >
            Paste Address from Clipboard
          </Button>

          <ScrollView style={{ maxHeight: 380 }}>
            <TextInput
              mode="outlined"
              label="Recipient Name *"
              value={sheetName}
              onChangeText={setSheetName}
              style={styles.sheetInput}
            />
            <TextInput
              mode="outlined"
              label="Contact Phone Number"
              keyboardType="phone-pad"
              value={sheetPhone}
              onChangeText={setSheetPhone}
              style={styles.sheetInput}
            />
            <TextInput
              mode="outlined"
              label="Street / House / Building *"
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

          <View style={styles.sheetActionsRow}>
            <Button mode="text" onPress={() => setAddressSheetOpen(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleSaveAddress} style={{ flex: 1 }}>
              Done
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Catalog Item Picker Modal */}
      <CatalogItemPickerModal
        visible={catalogPickerVisible}
        onDismiss={() => setCatalogPickerVisible(false)}
        onSelectItem={item => {
          setCatalogDrafts(prev => [item, ...prev]);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 90,
  },
  modeCard: {
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  sectionCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  platformIconsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  platformIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentPillGroup: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    padding: 3,
    gap: 4,
  },
  paymentPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
  },
  paymentPillText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sourceInputWrapper: {
    marginTop: 12,
  },
  textInput: {
    backgroundColor: 'transparent',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  mediaTilesRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  addMediaTile: {
    width: 80,
    height: 100,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#B0BEC5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMediaCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTileCard: {
    width: 90,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  mediaThumbnail: {
    width: '100%',
    height: 70,
    backgroundColor: '#EEE',
  },
  mediaDeleteBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaItemTagRow: {
    padding: 4,
    gap: 4,
  },
  miniPriceInput: {
    fontSize: 11,
    height: 28,
    backgroundColor: 'transparent',
  },
  miniQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addressCard: {
    marginTop: 8,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyAddressCard: {
    marginTop: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#B0BEC5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceableRow: {
    marginTop: 8,
    flexDirection: 'row',
  },
  chipSuccess: {
    backgroundColor: '#E6F4EA',
  },
  chipError: {
    backgroundColor: '#FCE8E6',
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
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  notesInput: {
    backgroundColor: 'transparent',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  bottomButton: {
    borderRadius: 10,
  },
  bottomButtonContent: {
    height: 50,
  },
  modalContainer: {
    margin: 20,
    padding: 18,
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clipboardButton: {
    marginBottom: 12,
  },
  sheetInput: {
    marginBottom: 10,
  },
  sheetActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
});
