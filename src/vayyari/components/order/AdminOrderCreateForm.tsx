import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  TextInput,
  Pressable,
  Linking,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';

import { useTheme } from '@/theme';
import {
  LuPencil,
  LuPlus,
  LuMapPin,
  LuX,
  LuSparkles,
  LuClipboardPaste,
  LuCheck,
  LuTriangleAlert,
  LuExternalLink,
  LuTrash2,
} from '@/components/tamagui-ui/icons/lu';
import {
  RiWhatsappLine,
  RiWhatsappFill,
  RiInstagramLine,
} from '@/components/tamagui-ui/icons/ri';
import { useShareIntentContext } from '@/context/ShareIntentContext';
import { searchApiClient } from '@/api/client';
import { customersApi } from '@/api/customers';
import { delhiveryService } from '@/services/delhiveryService';
import { API_ROUTES } from '@/constants/api-routes';
import {
  OrderSource as ApiOrderSource,
  PaymentMode,
  OrderIdEntry,
} from '@/types/orders';

// Brand colors
export const WHATSAPP_GREEN = '#25D366';
export const INSTAGRAM_ACTIVE = '#E1306C';

export type OrderSource = 'whatsapp' | 'instagram' | null;
export type PaymentType = 'cod' | 'prepaid';

export interface LocalImage {
  id: string;
  uri: string;
}

export interface AddressData {
  name: string;
  phone: string;
  address: string;
  pincode: string;
  city?: string;
  state?: string;
  isDelhiveryServiceable?: boolean | null;
}

// ─────────────────────────────────────────────
// Underline Field Component
// ─────────────────────────────────────────────
export interface UnderlineFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  multiline?: boolean;
  multilineHeight?: number;
  accessibilityLabel?: string;
  onSmartPaste?: (text: string) => void;
}

export function UnderlineField({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  multilineHeight,
  accessibilityLabel,
  onSmartPaste,
}: UnderlineFieldProps) {
  const { tokens } = useTheme();
  const safeValue = value ?? '';
  const prevLen = useRef(safeValue.length);

  const handleChange = (v: string) => {
    if (onSmartPaste && v.length - prevLen.current > 10) {
      onSmartPaste(v);
    }
    prevLen.current = v.length;
    onChange(v);
  };

  return (
    <YStack paddingBottom={8} borderBottomWidth={1} borderBottomColor={tokens.border}>
      <Text
        fontSize={9}
        fontWeight="700"
        color={tokens.textMuted}
        textTransform="uppercase"
        letterSpacing={1.1}
        marginBottom={3}
      >
        {label}
      </Text>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        value={safeValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={tokens.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        style={{
          fontSize: 15,
          color: tokens.text,
          paddingVertical: 0,
          textAlignVertical: multiline ? 'top' : 'center',
          height: multilineHeight ?? (multiline ? 58 : 24),
          lineHeight: 20,
        }}
      />
    </YStack>
  );
}

// ─────────────────────────────────────────────
// Address Card Component (Exported for Reuse)
// ─────────────────────────────────────────────
export interface AddressCardProps {
  address: AddressData | null;
  onEditPress: () => void;
}

export function AddressCard({ address, onEditPress }: AddressCardProps) {
  const { tokens } = useTheme();

  return (
    <YStack gap={6}>
      <Text fontSize={11} fontWeight="700" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
        Delivery Address
      </Text>

      {address ? (
        <YStack
          backgroundColor={tokens.surface}
          borderWidth={1}
          borderColor={tokens.border}
          borderRadius={tokens.radius.md}
          padding={12}
          gap={6}
        >
          <XStack justifyContent="space-between" alignItems="flex-start">
            <XStack gap={8} alignItems="center" flex={1}>
              <YStack
                width={28}
                height={28}
                borderRadius={tokens.radius.full}
                backgroundColor={tokens.accentSubtle}
                alignItems="center"
                justifyContent="center"
              >
                <LuMapPin size={14} color={tokens.accent} />
              </YStack>
              <Text fontSize={13} fontWeight="700" color={tokens.text} flex={1}>
                {address.name}
              </Text>
            </XStack>

            <Pressable onPress={onEditPress}>
              <YStack
                width={28}
                height={28}
                borderRadius={tokens.radius.sm}
                backgroundColor={tokens.surfaceRaised}
                alignItems="center"
                justifyContent="center"
              >
                <LuPencil size={12} color={tokens.accent} />
              </YStack>
            </Pressable>
          </XStack>

          <Text fontSize={12} color={tokens.textSecondary} lineHeight={17}>
            {address.address}
          </Text>
          <XStack gap={14} alignItems="center">
            <Text fontSize={11} color={tokens.textMuted}>
              PIN: {address.pincode}
            </Text>
            <Text fontSize={11} color={tokens.textMuted}>
              📞 {address.phone}
            </Text>
            {address.isDelhiveryServiceable === true && (
              <XStack gap={4} alignItems="center">
                <LuCheck size={12} color={tokens.success} />
                <Text fontSize={11} fontWeight="600" color={tokens.success}>
                  Delhivery
                </Text>
              </XStack>
            )}
          </XStack>
        </YStack>
      ) : (
        <Pressable onPress={onEditPress}>
          <YStack
            backgroundColor={tokens.surface}
            borderWidth={1.5}
            borderColor={tokens.border}
            borderStyle="dashed"
            borderRadius={tokens.radius.md}
            padding={14}
            alignItems="center"
            justifyContent="center"
            gap={6}
          >
            <YStack
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor={tokens.accentSubtle}
              alignItems="center"
              justifyContent="center"
            >
              <LuPlus size={16} color={tokens.accent} />
            </YStack>
            <Text fontSize={12} color={tokens.textMuted} fontWeight="600">
              Add delivery address (Smart-parse)
            </Text>
          </YStack>
        </Pressable>
      )}
    </YStack>
  );
}

// ─────────────────────────────────────────────
// Address Sheet Component (Exported for Reuse)
// ─────────────────────────────────────────────
export interface AddressSheetProps {
  visible: boolean;
  initial: AddressData;
  onSave: (data: AddressData) => void;
  onClose: () => void;
}

export function AddressSheet({ visible, initial, onSave, onClose }: AddressSheetProps) {
  const { tokens } = useTheme();
  const [form, setForm] = useState<AddressData>(initial);
  const [isAiMode, setIsAiMode] = useState(false);
  const [fillState, setFillState] = useState<'idle' | 'smart-parsed' | 'ai-parsing' | 'ai-error'>('idle');
  const [aiRawText, setAiRawText] = useState('');
  const [isCheckingPin, setIsCheckingPin] = useState(false);
  const [pinServiceable, setPinServiceable] = useState<boolean | null>(initial.isDelhiveryServiceable ?? null);

  useEffect(() => {
    setForm(initial);
    setPinServiceable(initial.isDelhiveryServiceable ?? null);
  }, [initial, visible]);

  if (!visible) return null;

  const updateField = (field: keyof AddressData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePincodeChange = async (pin: string) => {
    updateField('pincode', pin);
    if (pin.length === 6 && /^\d{6}$/.test(pin)) {
      setIsCheckingPin(true);
      try {
        const res = await delhiveryService.checkServiceability(pin);
        setPinServiceable(res.isServiceable);
        if (res.city) updateField('city', res.city);
        if (res.state) updateField('state', res.state);
      } catch {
        setPinServiceable(null);
      } finally {
        setIsCheckingPin(false);
      }
    } else {
      setPinServiceable(null);
    }
  };

  const parseAndApplyText = async (text: string) => {
    const pinMatch = text.match(/\b(\d{6})\b/);
    const phoneMatch = text.match(/(\+?91[\s-]?)?[6-9]\d{9}/);
    const pin = pinMatch ? pinMatch[1] : form.pincode;
    const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, '') : form.phone;

    let cleanAddress = text;
    if (pinMatch) cleanAddress = cleanAddress.replace(pinMatch[0], '');
    if (phoneMatch) cleanAddress = cleanAddress.replace(phoneMatch[0], '');
    cleanAddress = cleanAddress.replace(/[,|\n]+/g, ' ').replace(/\s+/g, ' ').trim();

    const updated: AddressData = {
      ...form,
      phone: phone || form.phone,
      pincode: pin || form.pincode,
      address: cleanAddress || form.address,
    };
    setForm(updated);
    setFillState('smart-parsed');

    if (pin && pin.length === 6) {
      handlePincodeChange(pin);
    }
  };

  const handleSmartPaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim().length > 0) {
        await parseAndApplyText(text);
      }
    } catch {
      setFillState('idle');
    }
  };

  return (
    <YStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="rgba(0,0,0,0.48)"
      justifyContent="flex-end"
      zIndex={200}
      onPress={onClose}
    >
      <YStack
        backgroundColor={tokens.background}
        borderTopLeftRadius={24}
        borderTopRightRadius={24}
        paddingTop={12}
        paddingBottom={32}
        shadowColor="#000"
        shadowOpacity={0.22}
        shadowRadius={24}
        shadowOffset={{ width: 0, height: -8 }}
        onPress={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <YStack alignItems="center" paddingBottom={10}>
          <YStack width={36} height={4} borderRadius={2} backgroundColor={tokens.border} />
        </YStack>

        {/* Header */}
        <XStack paddingHorizontal={20} paddingBottom={12} justifyContent="space-between" alignItems="center">
          <Text fontSize={16} fontWeight="800" color={tokens.text}>
            {isAiMode ? 'Smart Address Parser' : 'Delivery Address'}
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose}>
            <YStack
              width={28}
              height={28}
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.surfaceRaised}
              alignItems="center"
              justifyContent="center"
            >
              <LuX size={13} color={tokens.textSecondary} />
            </YStack>
          </Pressable>
        </XStack>

        {/* Actions row */}
        {!isAiMode && (
          <XStack marginHorizontal={20} marginBottom={14} gap={10}>
            <Pressable
              style={{ flex: 1 }}
              accessibilityRole="button"
              onPress={handleSmartPaste}
            >
              <XStack
                height={32}
                alignItems="center"
                justifyContent="center"
                borderRadius={9999}
                borderWidth={1}
                borderColor={tokens.accent}
                backgroundColor={tokens.accentSubtle}
                gap={6}
              >
                <LuClipboardPaste size={14} color={tokens.accent} />
                <Text fontSize={12} fontWeight="700" color={tokens.accent} letterSpacing={0.4}>
                  SMART PASTE
                </Text>
              </XStack>
            </Pressable>

            <Pressable
              style={{ flex: 1 }}
              accessibilityRole="button"
              onPress={() => setIsAiMode(true)}
            >
              <XStack
                height={32}
                alignItems="center"
                justifyContent="center"
                borderRadius={9999}
                backgroundColor={tokens.accent}
                gap={6}
              >
                <LuSparkles size={14} color={tokens.accentForeground} />
                <Text fontSize={12} fontWeight="700" color={tokens.accentForeground} letterSpacing={0.4}>
                  AI PARSE
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        )}

        {fillState === 'smart-parsed' && (
          <XStack
            marginHorizontal={20}
            marginBottom={10}
            backgroundColor={`${tokens.success}14`}
            borderRadius={tokens.radius.sm}
            borderWidth={1}
            borderColor={`${tokens.success}30`}
            paddingHorizontal={12}
            paddingVertical={7}
            alignItems="center"
            gap={8}
          >
            <LuCheck size={13} color={tokens.success} />
            <Text fontSize={12} fontWeight="600" color={tokens.success} flex={1}>
              Auto-filled from clipboard
            </Text>
          </XStack>
        )}

        {isAiMode ? (
          <YStack paddingHorizontal={20} gap={10}>
            <Text fontSize={12} color={tokens.textMuted}>
              Paste the entire WhatsApp/Instagram delivery text here:
            </Text>
            <YStack
              borderWidth={1}
              borderColor={tokens.border}
              borderRadius={tokens.radius.md}
              backgroundColor={tokens.surface}
              padding={10}
            >
              <TextInput
                value={aiRawText}
                onChangeText={setAiRawText}
                placeholder="Name, Street, Landmark, City, State, PIN, Phone..."
                placeholderTextColor={tokens.textMuted}
                multiline
                numberOfLines={4}
                style={{
                  fontSize: 14,
                  color: tokens.text,
                  height: 80,
                  textAlignVertical: 'top',
                }}
              />
            </YStack>
            <XStack gap={10}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => setIsAiMode(false)}
              >
                <YStack
                  height={44}
                  borderRadius={tokens.radius.md}
                  backgroundColor={tokens.surfaceRaised}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={13} fontWeight="700" color={tokens.textSecondary}>
                    CANCEL
                  </Text>
                </YStack>
              </Pressable>
              <Pressable
                style={{ flex: 1 }}
                onPress={async () => {
                  if (aiRawText.trim()) {
                    await parseAndApplyText(aiRawText);
                    setIsAiMode(false);
                  }
                }}
              >
                <YStack
                  height={44}
                  borderRadius={tokens.radius.md}
                  backgroundColor={tokens.accent}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={13} fontWeight="800" color={tokens.accentForeground}>
                    EXTRACT & FILL
                  </Text>
                </YStack>
              </Pressable>
            </XStack>
          </YStack>
        ) : (
          <YStack paddingHorizontal={20} gap={8}>
            <UnderlineField
              label="Recipient Name *"
              value={form.name}
              onChange={(v) => updateField('name', v)}
              placeholder="e.g. Priya Menon"
            />
            <UnderlineField
              label="Phone Number *"
              value={form.phone}
              onChange={(v) => updateField('phone', v)}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
            />
            <UnderlineField
              label="Street Address / Landmark *"
              value={form.address}
              onChange={(v) => updateField('address', v)}
              placeholder="House, street, locality"
              multiline
              multilineHeight={52}
            />
            <UnderlineField
              label="6-Digit PIN Code *"
              value={form.pincode}
              onChange={handlePincodeChange}
              placeholder="e.g. 560034"
              keyboardType="numeric"
            />

            {/* Delhivery indicator */}
            {isCheckingPin && (
              <XStack alignItems="center" gap={6} paddingTop={4}>
                <ActivityIndicator size="small" color={tokens.accent} />
                <Text fontSize={11} color={tokens.textMuted}>Checking Delhivery pincode...</Text>
              </XStack>
            )}
            {pinServiceable === true && (
              <XStack alignItems="center" gap={6} paddingTop={4}>
                <LuCheck size={14} color={tokens.success} />
                <Text fontSize={12} fontWeight="600" color={tokens.success}>
                  Delhivery Serviceable
                </Text>
              </XStack>
            )}
            {pinServiceable === false && (
              <XStack alignItems="center" gap={6} paddingTop={4}>
                <LuTriangleAlert size={14} color={tokens.error} />
                <Text fontSize={12} fontWeight="600" color={tokens.error}>
                  Unserviceable by Delhivery
                </Text>
              </XStack>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onSave({ ...form, isDelhiveryServiceable: pinServiceable });
                onClose();
              }}
              style={{ marginTop: 8 }}
            >
              <YStack
                height={46}
                borderRadius={tokens.radius.md}
                backgroundColor={tokens.accent}
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={13} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.6}>
                  SAVE ADDRESS
                </Text>
              </YStack>
            </Pressable>
          </YStack>
        )}
      </YStack>
    </YStack>
  );
}

// ─────────────────────────────────────────────
// Main Tamagui Admin Order Create Form
// ─────────────────────────────────────────────
export const AdminOrderCreateForm: React.FC = () => {
  const { tokens } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sharedMedia, commitCurrentSession, discardCurrentSession, removeSharedMedia } = useShareIntentContext();

  const [source, setSource] = useState<OrderSource>('whatsapp');
  const [paymentType, setPaymentType] = useState<PaymentType>('cod');
  const [sourceInput, setSourceInput] = useState('');
  const [images, setImages] = useState<LocalImage[]>([]);
  const [address, setAddress] = useState<AddressData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Line items
  const [items, setItems] = useState<Array<{
    id: string;
    title: string;
    sku: string;
    size: string;
    quantity: number;
    price: number;
  }>>([
    {
      id: `item-${Date.now()}`,
      title: 'Handloom Item',
      sku: '',
      size: 'Free Size',
      quantity: 1,
      price: 0,
    },
  ]);

  // Financials
  const [shippingCharges, setShippingCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync staged shared media from external apps
  useEffect(() => {
    if (sharedMedia && sharedMedia.length > 0) {
      setImages((prev) => {
        const existingUris = new Set(prev.map((i) => i.uri));
        const newImgs = sharedMedia
          .filter((m) => !existingUris.has(m.uri))
          .map((m, idx) => ({ id: `share-${idx}-${Date.now()}`, uri: m.uri }));
        return [...prev, ...newImgs];
      });
    }
  }, [sharedMedia]);

  const handleSourceToggle = (tapped: 'whatsapp' | 'instagram') => {
    setSource(source === tapped ? null : tapped);
    setSourceInput('');
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const picked = result.assets.map((a, idx) => ({
          id: `local-${idx}-${Date.now()}`,
          uri: a.uri,
        }));
        setImages((prev) => [...prev, ...picked]);
      }
    } catch (e) {
      console.warn('Image picker error', e);
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        title: `Item #${prev.length + 1}`,
        sku: '',
        size: 'Free Size',
        quantity: 1,
        price: 0,
      },
    ]);
  };

  const handleUpdateItem = (id: string, updates: Partial<typeof items[0]>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      Alert.alert('Cannot Remove', 'Order must have at least one item.');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const itemsSubtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const totalAmount = Math.max(0, itemsSubtotal + shippingCharges - discount);
  const pendingBalance = Math.max(0, totalAmount - advancePaid);

  const handleSubmit = async () => {
    if (!sourceInput.trim()) {
      Alert.alert('Missing Contact', 'Please provide customer WhatsApp number or Instagram handle.');
      return;
    }
    if (items.some((i) => !i.title.trim())) {
      Alert.alert('Invalid Item', 'All items must have a title.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Auto-create or resolve customer if address present
      let customerId: string | undefined;
      if (address?.phone) {
        try {
          const cust = await customersApi.getOrCreateCustomer(address.phone);
          if (cust && cust.id) {
            customerId = cust.id;
          }
        } catch {
          // ignore lookup failure
        }
      }

      const orderPayload: Partial<OrderIdEntry> = {
        source: source === 'whatsapp' ? 'WhatsApp' : source === 'instagram' ? 'Instagram' : 'None',
        sourceHandle: sourceInput.trim(),
        paymentMode: paymentType === 'cod' ? 'COD' : 'Prepaid',
        customerName: address?.name || 'Customer',
        customerPhone: address?.phone || sourceInput.trim(),
        customerAddress: address?.address,
        shippingStreet: address?.address,
        shippingPincode: address?.pincode,
        shippingCity: address?.city,
        shippingState: address?.state,
        customerId,
        isServiceable: address?.isDelhiveryServiceable ?? false,
        shippingCharges,
        advancePaid,
        items: items.map((i) => ({
          productTitle: i.title,
          sku: i.sku,
          size: i.size,
          quantity: i.quantity,
          unitPrice: i.price,
          totalPrice: i.price * i.quantity,
        })),
      };

      const res = await searchApiClient.post<OrderIdEntry>(API_ROUTES.ORDERS.GENERATE_WITH_ITEMS, orderPayload);

      if (sharedMedia && sharedMedia.length > 0) {
        await commitCurrentSession();
      }

      Alert.alert('Success', `Order #${res.id || 'created'} registered successfully!`, [
        {
          text: 'OK',
          onPress: () => {
            if (res.id) {
              router.replace(`/utilities/order-details/${res.id}`);
            } else {
              router.replace('/(tabs)');
            }
          },
        },
      ]);
    } catch (err: any) {
      console.error('Order creation error:', err);
      Alert.alert('Creation Failed', err?.message || 'Failed to submit order. Please retry.');
    } finally {
      setIsSubmitting(false);
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

  return (
    <YStack flex={1} backgroundColor={tokens.background} position="relative">
      {/* Header */}
      <XStack
        paddingTop={insets.top}
        height={56 + insets.top}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={16}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <Text fontSize={17} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
          New Order
        </Text>
        {sharedMedia && sharedMedia.length > 0 && (
          <XStack
            backgroundColor={`${tokens.accent}15`}
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={tokens.radius.full}
          >
            <Text fontSize={11} fontWeight="700" color={tokens.accent}>
              {sharedMedia.length} Shared Media
            </Text>
          </XStack>
        )}
      </XStack>

      {/* Scrollable Form Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(110, insets.bottom + 90) }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack paddingHorizontal={16} paddingTop={14} gap={14}>
          {/* ── Section 1: Order Type & Channel ── */}
          <YStack gap={8}>
            <XStack alignItems="center" justifyContent="space-between">
              {/* Bare Source Brand Icons */}
              <XStack gap={16} alignItems="center">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Select WhatsApp source"
                  onPress={() => handleSourceToggle('whatsapp')}
                >
                  {source === 'whatsapp' ? (
                    <RiWhatsappFill size={36} color={WHATSAPP_GREEN} />
                  ) : (
                    <RiWhatsappLine size={36} color={tokens.textMuted} />
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Select Instagram source"
                  onPress={() => handleSourceToggle('instagram')}
                >
                  {source === 'instagram' ? (
                    <RiInstagramLine size={36} color={INSTAGRAM_ACTIVE} />
                  ) : (
                    <RiInstagramLine size={36} color={tokens.textMuted} />
                  )}
                </Pressable>
              </XStack>

              {/* Payment Type Pills */}
              <XStack
                backgroundColor={tokens.surfaceRaised}
                borderRadius={tokens.radius.full}
                borderWidth={1}
                borderColor={tokens.border}
                padding={3}
                gap={2}
              >
                {(['cod', 'prepaid'] as PaymentType[]).map((p) => {
                  const isActive = paymentType === p;
                  return (
                    <Pressable key={p} onPress={() => setPaymentType(p)}>
                      <YStack
                        paddingHorizontal={16}
                        paddingVertical={8}
                        borderRadius={tokens.radius.full}
                        backgroundColor={isActive ? tokens.accent : 'transparent'}
                      >
                        <Text
                          fontSize={13}
                          fontWeight="700"
                          color={isActive ? tokens.accentForeground : tokens.textSecondary}
                          letterSpacing={0.3}
                        >
                          {p === 'cod' ? 'COD' : 'Prepaid'}
                        </Text>
                      </YStack>
                    </Pressable>
                  );
                })}
              </XStack>
            </XStack>

            {/* Input with Quick Launcher */}
            {source === 'whatsapp' && (
              <YStack
                backgroundColor={tokens.surface}
                borderWidth={1}
                borderColor={tokens.border}
                borderRadius={tokens.radius.md}
                paddingHorizontal={14}
                height={44}
                justifyContent="center"
              >
                <XStack alignItems="center" gap={10}>
                  <RiWhatsappLine size={18} color={WHATSAPP_GREEN} />
                  <TextInput
                    value={sourceInput}
                    onChangeText={setSourceInput}
                    placeholder="WhatsApp Number / Chat URL *"
                    placeholderTextColor={tokens.textMuted}
                    keyboardType="phone-pad"
                    style={{ flex: 1, fontSize: 14, color: tokens.text }}
                  />
                  {sourceInput.trim().length > 0 && (
                    <Pressable
                      onPress={() => {
                        const clean = sourceInput.replace(/[^0-9]/g, '');
                        if (clean) Linking.openURL(`https://wa.me/${clean}`);
                      }}
                    >
                      <XStack
                        padding={6}
                        borderRadius={tokens.radius.sm}
                        backgroundColor={`${WHATSAPP_GREEN}18`}
                      >
                        <LuExternalLink size={15} color={WHATSAPP_GREEN} />
                      </XStack>
                    </Pressable>
                  )}
                </XStack>
              </YStack>
            )}

            {source === 'instagram' && (
              <YStack
                backgroundColor={tokens.surface}
                borderWidth={1}
                borderColor={tokens.border}
                borderRadius={tokens.radius.md}
                paddingHorizontal={14}
                height={44}
                justifyContent="center"
              >
                <XStack alignItems="center" gap={10}>
                  <RiInstagramLine size={18} color={INSTAGRAM_ACTIVE} />
                  <TextInput
                    value={sourceInput}
                    onChangeText={setSourceInput}
                    placeholder="Instagram Handle or Direct URL *"
                    placeholderTextColor={tokens.textMuted}
                    autoCapitalize="none"
                    style={{ flex: 1, fontSize: 14, color: tokens.text }}
                  />
                  {sourceInput.trim().length > 0 && (
                    <Pressable
                      onPress={() => {
                        const clean = sourceInput.replace(/^@/, '').trim();
                        if (clean) Linking.openURL(`https://ig.me/m/${clean}`);
                      }}
                    >
                      <XStack
                        padding={6}
                        borderRadius={tokens.radius.sm}
                        backgroundColor={`${INSTAGRAM_ACTIVE}18`}
                      >
                        <LuExternalLink size={15} color={INSTAGRAM_ACTIVE} />
                      </XStack>
                    </Pressable>
                  )}
                </XStack>
              </YStack>
            )}
          </YStack>

          <YStack height={1} backgroundColor={tokens.border} />

          {/* ── Section 2: Reference Images Gallery ── */}
          <YStack gap={6}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
              Reference Images ({images.length})
            </Text>
            <XStack flexWrap="wrap" gap={8}>
              {images.map((img) => (
                <YStack
                  key={img.id}
                  width={76}
                  height={76}
                  borderRadius={tokens.radius.md}
                  overflow="hidden"
                  position="relative"
                  backgroundColor={tokens.surfaceRaised}
                >
                  <Image source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  <Pressable
                    style={{ position: 'absolute', top: 4, right: 4 }}
                    onPress={() => handleRemoveImage(img.id)}
                  >
                    <YStack
                      width={20}
                      height={20}
                      borderRadius={10}
                      backgroundColor="rgba(0,0,0,0.6)"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <LuX size={10} color="#FFFFFF" />
                    </YStack>
                  </Pressable>
                </YStack>
              ))}

              <Pressable accessibilityRole="button" onPress={handlePickImage}>
                <YStack
                  width={76}
                  height={76}
                  borderRadius={tokens.radius.md}
                  borderWidth={1.5}
                  borderColor={tokens.border}
                  borderStyle="dashed"
                  backgroundColor={tokens.surface}
                  alignItems="center"
                  justifyContent="center"
                  gap={4}
                >
                  <YStack
                    width={30}
                    height={30}
                    borderRadius={15}
                    backgroundColor={tokens.accentSubtle}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <LuPlus size={16} color={tokens.accent} />
                  </YStack>
                  <Text fontSize={10} color={tokens.textMuted} fontWeight="600">
                    Add Photo
                  </Text>
                </YStack>
              </Pressable>
            </XStack>
          </YStack>

          <YStack height={1} backgroundColor={tokens.border} />

          {/* ── Section 3: Delivery Address Card ── */}
          <AddressCard
            address={address}
            onEditPress={() => setSheetOpen(true)}
          />

          <YStack height={1} backgroundColor={tokens.border} />

          {/* ── Section 4: Line Items ── */}
          <YStack gap={8}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={11} fontWeight="700" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
                Order Items ({items.length})
              </Text>
              <Pressable onPress={handleAddItem}>
                <XStack alignItems="center" gap={4}>
                  <LuPlus size={14} color={tokens.accent} />
                  <Text fontSize={12} fontWeight="700" color={tokens.accent}>
                    Add Item
                  </Text>
                </XStack>
              </Pressable>
            </XStack>

            {items.map((item, index) => (
              <YStack
                key={item.id}
                backgroundColor={tokens.surface}
                borderWidth={1}
                borderColor={tokens.border}
                borderRadius={tokens.radius.md}
                padding={12}
                gap={8}
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={12} fontWeight="700" color={tokens.text}>
                    #{index + 1}
                  </Text>
                  {items.length > 1 && (
                    <Pressable onPress={() => handleRemoveItem(item.id)}>
                      <LuTrash2 size={14} color={tokens.error} />
                    </Pressable>
                  )}
                </XStack>

                <UnderlineField
                  label="Title / Product Name *"
                  value={item.title}
                  onChange={(v) => handleUpdateItem(item.id, { title: v })}
                  placeholder="e.g. Pure Silk Banarasi Saree"
                />

                <XStack gap={10}>
                  <YStack flex={1}>
                    <UnderlineField
                      label="SKU / Code"
                      value={item.sku}
                      onChange={(v) => handleUpdateItem(item.id, { sku: v })}
                      placeholder="e.g. BNR-01"
                    />
                  </YStack>
                  <YStack flex={1}>
                    <UnderlineField
                      label="Size"
                      value={item.size}
                      onChange={(v) => handleUpdateItem(item.id, { size: v })}
                      placeholder="e.g. Free Size, M, L"
                    />
                  </YStack>
                </XStack>

                <XStack gap={10}>
                  <YStack flex={1}>
                    <UnderlineField
                      label="Qty"
                      value={String(item.quantity)}
                      onChange={(v) => handleUpdateItem(item.id, { quantity: parseInt(v, 10) || 1 })}
                      keyboardType="numeric"
                    />
                  </YStack>
                  <YStack flex={1}>
                    <UnderlineField
                      label="Unit Price (₹)"
                      value={String(item.price || '')}
                      onChange={(v) => handleUpdateItem(item.id, { price: parseFloat(v) || 0 })}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </YStack>
                </XStack>
              </YStack>
            ))}
          </YStack>

          <YStack height={1} backgroundColor={tokens.border} />

          {/* ── Section 5: Financials & Notes ── */}
          <YStack gap={8}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
              Financials & Summary
            </Text>

            <XStack gap={10}>
              <YStack flex={1}>
                <UnderlineField
                  label="Shipping (₹)"
                  value={String(shippingCharges || '')}
                  onChange={(v) => setShippingCharges(parseFloat(v) || 0)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </YStack>
              <YStack flex={1}>
                <UnderlineField
                  label="Discount (₹)"
                  value={String(discount || '')}
                  onChange={(v) => setDiscount(parseFloat(v) || 0)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </YStack>
              <YStack flex={1}>
                <UnderlineField
                  label="Advance (₹)"
                  value={String(advancePaid || '')}
                  onChange={(v) => setAdvancePaid(parseFloat(v) || 0)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </YStack>
            </XStack>

            <UnderlineField
              label="Order Notes / Instructions"
              value={notes}
              onChange={setNotes}
              placeholder="e.g. Urgent festive dispatch, gift wrap"
              multiline
              multilineHeight={44}
            />

            {/* Financial Summary Card */}
            <YStack
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              padding={12}
              gap={6}
              marginTop={4}
            >
              <XStack justifyContent="space-between">
                <Text fontSize={12} color={tokens.textMuted}>Items Subtotal</Text>
                <Text fontSize={12} fontWeight="600" color={tokens.text}>₹{itemsSubtotal}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text fontSize={12} color={tokens.textMuted}>Shipping</Text>
                <Text fontSize={12} fontWeight="600" color={tokens.text}>+₹{shippingCharges}</Text>
              </XStack>
              {discount > 0 && (
                <XStack justifyContent="space-between">
                  <Text fontSize={12} color={tokens.textMuted}>Discount</Text>
                  <Text fontSize={12} fontWeight="600" color={tokens.success}>-₹{discount}</Text>
                </XStack>
              )}
              <YStack height={1} backgroundColor={tokens.border} marginVertical={2} />
              <XStack justifyContent="space-between">
                <Text fontSize={13} fontWeight="800" color={tokens.text}>Total Order Value</Text>
                <Text fontSize={15} fontWeight="800" color={tokens.accent}>₹{totalAmount}</Text>
              </XStack>
              {advancePaid > 0 && (
                <XStack justifyContent="space-between">
                  <Text fontSize={12} color={tokens.textMuted}>Pending Balance (on delivery)</Text>
                  <Text fontSize={12} fontWeight="700" color={tokens.textSecondary}>₹{pendingBalance}</Text>
                </XStack>
              )}
            </YStack>
          </YStack>
        </YStack>
      </ScrollView>

      {/* Sticky Submit Bar */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor={tokens.surface}
        borderTopWidth={1}
        borderTopColor={tokens.border}
        paddingHorizontal={16}
        paddingVertical={12}
        paddingBottom={Math.max(24, insets.bottom + 12)}
        shadowColor="#000"
        shadowOpacity={0.08}
        shadowRadius={12}
        shadowOffset={{ width: 0, height: -4 }}
        zIndex={50}
      >
        <Pressable
          accessibilityRole="button"
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <YStack
            height={50}
            borderRadius={tokens.radius.md}
            backgroundColor={isSubmitting ? tokens.surfaceRaised : tokens.accent}
            alignItems="center"
            justifyContent="center"
          >
            {isSubmitting ? (
              <ActivityIndicator color={tokens.textMuted} />
            ) : (
              <Text fontSize={14} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.8}>
                CREATE ORDER
              </Text>
            )}
          </YStack>
        </Pressable>
      </YStack>

      {/* Address Sheet Modal */}
      <AddressSheet
        visible={sheetOpen}
        initial={emptyAddress}
        onSave={(data) => setAddress(data)}
        onClose={() => setSheetOpen(false)}
      />
    </YStack>
  );
};
