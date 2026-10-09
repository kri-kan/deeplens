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
  LuCheckCircle2,
  LuArrowRight,
  LuArrowLeft,
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
import { logisticsService } from '@/services/logistics.service';
import { API_ROUTES } from '@/constants/api-routes';
import {
  OrderSource as ApiOrderSource,
  PaymentMode,
  OrderIdEntry,
  OrderStatus,
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
  const [parsedPreview, setParsedPreview] = useState<AddressData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    setForm(initial);
    setPinServiceable(initial.isDelhiveryServiceable ?? null);
    setParsedPreview(null);
    setIsExtracting(false);
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

  const extractAddressFromText = async (text: string): Promise<AddressData> => {
    const pinMatch = text.match(/\b(\d{6})\b/);
    const pin = pinMatch ? pinMatch[1] : '';

    const phoneMatch = text.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
    const phone = phoneMatch ? phoneMatch[1] : '';

    let extractedName = '';
    const namePrefixMatch = text.match(/(?:Name|To|Customer|Recipient)[:\s-]+([A-Za-z\s.]+)(?:\n|,|$)/i);
    if (namePrefixMatch && namePrefixMatch[1].trim()) {
      extractedName = namePrefixMatch[1].trim();
    } else {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (
          !/\d/.test(line) &&
          !/address|street|road|pincode|phone|near|opp|flat|house|block|city|state/i.test(line) &&
          line.split(' ').length <= 4 &&
          line.length >= 3 &&
          line.length <= 40
        ) {
          extractedName = line.replace(/^[•\-*]\s*/, '').trim();
          break;
        }
      }
    }

    let cleanAddress = text;
    if (pinMatch) cleanAddress = cleanAddress.replace(pinMatch[0], '');
    if (phoneMatch) cleanAddress = cleanAddress.replace(phoneMatch[0], '');
    if (extractedName) cleanAddress = cleanAddress.replace(extractedName, '');

    cleanAddress = cleanAddress
      .replace(/(?:Name|Phone|Ph|Mob|Mobile|Address|PIN|Pincode|City|State)[:\s-]*/gi, '')
      .replace(/[,|\n]+/g, ', ')
      .replace(/\s+/g, ' ')
      .replace(/^[\s,]+|[\s,]+$/g, '')
      .trim();

    let city = form.city;
    let state = form.state;
    let serviceable: boolean | null = null;

    if (pin && pin.length === 6) {
      try {
        const res = await delhiveryService.checkServiceability(pin);
        serviceable = res.isServiceable;
        if (res.city) city = res.city;
        if (res.state) state = res.state;
      } catch {
        // network/timeout fallback
      }
    }

    return {
      name: extractedName || form.name,
      phone: phone || form.phone,
      address: cleanAddress || form.address,
      pincode: pin || form.pincode,
      city: city || form.city,
      state: state || form.state,
      isDelhiveryServiceable: serviceable ?? form.isDelhiveryServiceable,
    };
  };

  const handleExtract = async () => {
    if (!aiRawText.trim() || isExtracting) return;
    setIsExtracting(true);
    try {
      const extracted = await extractAddressFromText(aiRawText);
      setParsedPreview(extracted);
    } catch {
      // fallback
    } finally {
      setIsExtracting(false);
    }
  };

  const handleProceed = () => {
    if (!parsedPreview) return;
    setForm(parsedPreview);
    if (parsedPreview.pincode) {
      setPinServiceable(parsedPreview.isDelhiveryServiceable ?? null);
    }
    setFillState('smart-parsed');
    setIsAiMode(false);
    setParsedPreview(null);
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

            {/* Flowy auto-expanding textarea */}
            <YStack
              borderWidth={1}
              borderColor={tokens.border}
              borderRadius={tokens.radius.md}
              backgroundColor={tokens.surface}
              padding={10}
            >
              <TextInput
                value={aiRawText}
                onChangeText={(t) => {
                  setAiRawText(t);
                  if (parsedPreview) setParsedPreview(null);
                }}
                placeholder="Name, Street, Landmark, City, State, PIN, Phone..."
                placeholderTextColor={tokens.textMuted}
                multiline
                scrollEnabled={true}
                style={{
                  fontSize: 14,
                  color: tokens.text,
                  minHeight: 80,
                  maxHeight: 160,
                  textAlignVertical: 'top',
                  lineHeight: 20,
                  paddingVertical: 2,
                }}
              />
            </YStack>

            {/* Parsed Preview Tile (appears upon extraction) */}
            {parsedPreview && (
              <YStack
                backgroundColor={`${tokens.accent}0D`}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={`${tokens.accent}33`}
                padding={12}
                gap={8}
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack alignItems="center" gap={6}>
                    <LuCheckCircle2 size={13} color={tokens.success} />
                    <Text fontSize={11} fontWeight="800" color={tokens.text} letterSpacing={0.5} textTransform="uppercase">
                      PARSED DETAILS PREVIEW
                    </Text>
                  </XStack>
                  {parsedPreview.pincode ? (
                    <XStack
                      paddingHorizontal={7}
                      paddingVertical={2}
                      borderRadius={9999}
                      backgroundColor={parsedPreview.isDelhiveryServiceable ? `${tokens.success}1A` : `${tokens.warning}1A`}
                    >
                      <Text
                        fontSize={10}
                        fontWeight="700"
                        color={parsedPreview.isDelhiveryServiceable ? tokens.success : tokens.warning}
                      >
                        {parsedPreview.isDelhiveryServiceable ? '✓ Delhivery Serviceable' : '⚠ PIN Unserviceable'}
                      </Text>
                    </XStack>
                  ) : null}
                </XStack>

                <YStack gap={5}>
                  <XStack alignItems="flex-start" gap={8}>
                    <Text fontSize={11} fontWeight="700" color={tokens.textMuted} width={65}>
                      Recipient:
                    </Text>
                    <Text fontSize={12} fontWeight="600" color={tokens.text} flex={1}>
                      {parsedPreview.name || '—'}
                    </Text>
                  </XStack>

                  <XStack alignItems="flex-start" gap={8}>
                    <Text fontSize={11} fontWeight="700" color={tokens.textMuted} width={65}>
                      Phone:
                    </Text>
                    <Text fontSize={12} fontWeight="600" color={tokens.text} flex={1}>
                      {parsedPreview.phone || '—'}
                    </Text>
                  </XStack>

                  <XStack alignItems="flex-start" gap={8}>
                    <Text fontSize={11} fontWeight="700" color={tokens.textMuted} width={65}>
                      Address:
                    </Text>
                    <Text fontSize={12} fontWeight="500" color={tokens.text} flex={1} numberOfLines={3}>
                      {parsedPreview.address || '—'}
                    </Text>
                  </XStack>

                  <XStack alignItems="flex-start" gap={8}>
                    <Text fontSize={11} fontWeight="700" color={tokens.textMuted} width={65}>
                      PIN / Area:
                    </Text>
                    <Text fontSize={12} fontWeight="600" color={tokens.text} flex={1}>
                      {parsedPreview.pincode || '—'}
                      {(parsedPreview.city || parsedPreview.state) && (
                        ` (${[parsedPreview.city, parsedPreview.state].filter(Boolean).join(', ')})`
                      )}
                    </Text>
                  </XStack>
                </YStack>
              </YStack>
            )}

            {/* Action Buttons */}
            <XStack gap={10}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => {
                  if (parsedPreview) {
                    setParsedPreview(null);
                  } else {
                    setIsAiMode(false);
                  }
                }}
              >
                <YStack
                  height={44}
                  borderRadius={tokens.radius.md}
                  backgroundColor={tokens.surfaceRaised}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={13} fontWeight="700" color={tokens.textSecondary}>
                    {parsedPreview ? 'RESET' : 'CANCEL'}
                  </Text>
                </YStack>
              </Pressable>

              <Pressable
                style={{ flex: 1 }}
                disabled={isExtracting || (!parsedPreview && !aiRawText.trim())}
                onPress={() => {
                  if (parsedPreview) {
                    handleProceed();
                  } else {
                    handleExtract();
                  }
                }}
              >
                <YStack
                  height={44}
                  borderRadius={tokens.radius.md}
                  backgroundColor={
                    isExtracting || (!parsedPreview && !aiRawText.trim())
                      ? `${tokens.accent}55`
                      : tokens.accent
                  }
                  alignItems="center"
                  justifyContent="center"
                  flexDirection="row"
                  gap={6}
                >
                  {isExtracting ? (
                    <>
                      <ActivityIndicator size="small" color={tokens.accentForeground} />
                      <Text fontSize={13} fontWeight="800" color={tokens.accentForeground}>
                        EXTRACTING...
                      </Text>
                    </>
                  ) : parsedPreview ? (
                    <>
                      <Text fontSize={13} fontWeight="800" color={tokens.accentForeground}>
                        PROCEED
                      </Text>
                      <LuArrowRight size={14} color={tokens.accentForeground} />
                    </>
                  ) : (
                    <>
                      <LuSparkles size={14} color={tokens.accentForeground} />
                      <Text fontSize={13} fontWeight="800" color={tokens.accentForeground}>
                        EXTRACT
                      </Text>
                    </>
                  )}
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
export interface AdminOrderCreateFormProps {
  onBack?: () => void;
}

export const AdminOrderCreateForm: React.FC<AdminOrderCreateFormProps> = ({ onBack }) => {
  const { tokens } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sharedMedia, commitCurrentSession, discardCurrentSession, removeSharedMedia } = useShareIntentContext();

  const [source, setSource] = useState<OrderSource>('whatsapp');
  const [paymentType, setPaymentType] = useState<PaymentType>('cod');
  const [needLabel, setNeedLabel] = useState<boolean>(true);
  const [sourceInput, setSourceInput] = useState('');
  const [images, setImages] = useState<LocalImage[]>([]);
  const [address, setAddress] = useState<AddressData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentType(type);
    if (type === 'cod') {
      setNeedLabel(true);
    } else {
      setNeedLabel(false);
    }
  };

  // Line items
  const [items, setItems] = useState<Array<{
    id: string;
    title: string;
    sku: string;
    size: string;
    quantity: number;
    price: number;
    vendorId?: string;
  }>>([]);

  // Financials
  const [shippingCharges, setShippingCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    if (snackbarVisible) {
      const timer = setTimeout(() => {
        setSnackbarVisible(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [snackbarVisible]);

  const resetForm = () => {
    setSource('whatsapp');
    setPaymentType('cod');
    setNeedLabel(true);
    setSourceInput('');
    setImages([]);
    setAddress(null);
    setItems([]);
    setShippingCharges(0);
    setDiscount(0);
    setAdvancePaid(0);
    setNotes('');
  };

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

  const handleSourceSelect = (selected: 'whatsapp' | 'instagram') => {
    if (source !== selected) {
      setSource(selected);
      setSourceInput('');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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
        title: '',
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
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const itemsSubtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const totalAmount = Math.max(0, itemsSubtotal + shippingCharges - discount);
  const pendingBalance = Math.max(0, totalAmount - advancePaid);

  const handleSubmit = async (statusTarget: OrderStatus = 'Unconfirmed') => {
    if (statusTarget === 'Confirmed') {
      if (!sourceInput.trim()) {
        Alert.alert('Missing Contact', 'Please provide customer WhatsApp number or Instagram handle.');
        return;
      }
      if (items.length === 0) {
        Alert.alert('No Items', 'Please add at least one item before confirming the order.');
        return;
      }
      if (items.some((i) => !i.title.trim())) {
        Alert.alert('Invalid Item', 'All added items must have a title before confirming.');
        return;
      }
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

      const effectiveNeedLabel = paymentType === 'cod' ? true : needLabel;

      const orderPayload: Partial<OrderIdEntry> = {
        source: source === 'whatsapp' ? 'WhatsApp' : source === 'instagram' ? 'Instagram' : 'None',
        sourceHandle: sourceInput.trim(),
        paymentMode: paymentType === 'cod' ? 'COD' : 'Prepaid',
        status: statusTarget,
        needLabel: effectiveNeedLabel,
        customerName: address?.name || 'Customer',
        customerPhone: source === 'whatsapp' ? sourceInput.trim() : (address?.phone || sourceInput.trim()),
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
          productId: i.sku || undefined,
          productTitle: i.title,
          quantity: i.quantity,
          unitPrice: i.price,
          subtotal: i.price * i.quantity,
          vendorId: i.vendorId,
        })),
      };

      const res = await searchApiClient.post<{ id?: string; orderId?: string }>(API_ROUTES.ORDERS.GENERATE_WITH_ITEMS, orderPayload);
      const createdId = res?.orderId || res?.id;

      if (createdId) {
        logisticsService.registerOrder({
          id: createdId,
          orderNumber: createdId.startsWith('VY-') ? createdId : `VY-2026-${createdId}`,
          customerName: address?.name || 'Customer',
          customerPhone: source === 'whatsapp' ? sourceInput.trim() : (address?.phone || sourceInput.trim()),
          shippingAddress: address?.address || '',
          shippingCity: address?.city || '',
          shippingState: address?.state || '',
          shippingPincode: address?.pincode || '',
          source: source === 'whatsapp' ? 'WhatsApp' : source === 'instagram' ? 'Instagram' : 'Manual',
          sourceHandle: sourceInput.trim() || undefined,
          paymentMode: paymentType === 'cod' ? 'COD' : 'Prepaid',
          totalOrderValue: items.reduce((acc, it) => acc + it.price * it.quantity, 0) + shippingCharges,
          totalCodBalance: paymentType === 'cod' ? items.reduce((acc, it) => acc + it.price * it.quantity, 0) + shippingCharges : 0,
          orderDate: new Date().toISOString(),
          status: 'PendingFulfillment',
          hasNdr: false,
          hasEscalation: false,
          items: items.map((i, idx) => ({
            id: `ITEM-${createdId}-${idx + 1}`,
            orderId: createdId,
            productId: i.sku || '',
            productName: i.title,
            quantity: i.quantity,
            unitPrice: i.price,
            totalPrice: i.price * i.quantity,
            proportionalCodAmount: i.price * i.quantity,
            vendorId: 'VND-DEFAULT',
            vendorName: 'Default Vendor'
          })),
          packages: []
        });
      }

      if (sharedMedia && sharedMedia.length > 0) {
        await commitCurrentSession();
      }

      if (createdId) {
        try {
          await Clipboard.setStringAsync(createdId);
        } catch (clipErr) {
          console.warn('Failed to copy order ID to clipboard', clipErr);
        }
      }

      resetForm();

      const msg = createdId ? `Order #${createdId} created & ID copied to clipboard!` : 'Order created!';
      setSnackbarMessage(msg);
      setSnackbarVisible(true);

      if (createdId) {
        router.replace(`/utilities/order-details/${createdId}?fromCreate=true&orderCreated=true`);
      } else if (onBack) {
        onBack();
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/orders');
      }
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
        paddingHorizontal={12}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <XStack alignItems="center" gap={10}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => {
              if (onBack) {
                onBack();
              } else if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/orders');
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: tokens.radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? `${tokens.text}12` : 'transparent',
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            <LuArrowLeft size={20} color={tokens.text} />
          </Pressable>
          <Text fontSize={17} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
            New Order
          </Text>
        </XStack>
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
        contentContainerStyle={{ paddingBottom: Math.max(36, insets.bottom + 24) }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack paddingHorizontal={8} paddingTop={10} gap={10}>
          {/* ── Section 1: Order Type & Channel ── */}
          <YStack gap={8}>
            <XStack alignItems="center" justifyContent="space-between">
              {/* Bare Source Brand Icons */}
              <XStack gap={16} alignItems="center">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Select WhatsApp source"
                  onPress={() => handleSourceSelect('whatsapp')}
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
                  onPress={() => handleSourceSelect('instagram')}
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
                    <YStack
                      key={p}
                      accessibilityRole="button"
                      accessibilityLabel={`${p === 'cod' ? 'Cash on Delivery' : 'Prepaid'} payment`}
                      onPress={() => handlePaymentTypeChange(p)}
                      paddingHorizontal={16}
                      paddingVertical={8}
                      borderRadius={tokens.radius.full}
                      backgroundColor={isActive ? tokens.accent : 'transparent'}
                      overflow="hidden"
                      cursor="pointer"
                      pressStyle={{ opacity: 0.85 }}
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
                  );
                })}
              </XStack>
            </XStack>

            {/* Need Label Toggle Switch */}
            <XStack
              backgroundColor={tokens.surface}
              borderWidth={1}
              borderColor={tokens.border}
              borderRadius={tokens.radius.md}
              padding={12}
              alignItems="center"
              justifyContent="space-between"
            >
              <YStack gap={2} flex={1}>
                <XStack alignItems="center" gap={6}>
                  <Text fontSize={13} fontWeight="700" color={tokens.text}>
                    Delhivery Shipping Label
                  </Text>
                  {paymentType === 'cod' ? (
                    <YStack paddingHorizontal={6} paddingVertical={2} borderRadius={4} backgroundColor={`${tokens.accent}20`}>
                      <Text fontSize={9} fontWeight="800" color={tokens.accent}>MANDATORY FOR COD</Text>
                    </YStack>
                  ) : (
                    <YStack paddingHorizontal={6} paddingVertical={2} borderRadius={4} backgroundColor={needLabel ? `${tokens.success}20` : `${tokens.textMuted}20`}>
                      <Text fontSize={9} fontWeight="800" color={needLabel ? tokens.success : tokens.textMuted}>
                        {needLabel ? 'ENABLED' : 'VENDOR DIRECT'}
                      </Text>
                    </YStack>
                  )}
                </XStack>
                <Text fontSize={11} color={tokens.textMuted}>
                  {paymentType === 'cod'
                    ? 'All COD orders require auto-generated Delhivery thermal label before dispatch.'
                    : needLabel
                    ? 'Enabled: Dispatched from own warehouse (Delhivery label auto-generated).'
                    : 'Disabled: Direct vendor dispatch (Image & address details shared with vendor).'}
                </Text>
              </YStack>

              <Pressable
                disabled={paymentType === 'cod'}
                onPress={() => setNeedLabel((prev) => !prev)}
                style={{ opacity: paymentType === 'cod' ? 0.6 : 1 }}
              >
                <YStack
                  width={44}
                  height={26}
                  borderRadius={13}
                  backgroundColor={needLabel ? tokens.accent : tokens.border}
                  padding={3}
                  justifyContent="center"
                >
                  <YStack
                    width={20}
                    height={20}
                    borderRadius={10}
                    backgroundColor="#FFFFFF"
                    alignSelf={needLabel ? 'flex-end' : 'flex-start'}
                  />
                </YStack>
              </Pressable>
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

            {items.length === 0 ? (
              <YStack
                backgroundColor={tokens.surface}
                borderWidth={1}
                borderColor={tokens.border}
                borderStyle="dashed"
                borderRadius={tokens.radius.md}
                paddingVertical={22}
                paddingHorizontal={16}
                alignItems="center"
                justifyContent="center"
                gap={6}
              >
                <Text fontSize={12} color={tokens.textMuted}>
                  No items added yet (optional).
                </Text>
                <Pressable onPress={handleAddItem}>
                  <XStack alignItems="center" gap={4}>
                    <LuPlus size={13} color={tokens.accent} />
                    <Text fontSize={12} fontWeight="700" color={tokens.accent}>
                      Add Item
                    </Text>
                  </XStack>
                </Pressable>
              </YStack>
            ) : (
              items.map((item, index) => (
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
                    <Pressable onPress={() => handleRemoveItem(item.id)}>
                      <LuTrash2 size={14} color={tokens.error} />
                    </Pressable>
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
            )))}
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
        paddingHorizontal={12}
        paddingVertical={12}
        paddingBottom={Math.max(24, insets.bottom + 12)}
        shadowColor="#000"
        shadowOpacity={0.08}
        shadowRadius={12}
        shadowOffset={{ width: 0, height: -4 }}
        zIndex={50}
      >
        <XStack gap={10}>
          {/* Save Draft (Unconfirmed) Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save order draft"
            style={{ flex: 1 }}
            onPress={() => handleSubmit('Unconfirmed')}
            disabled={isSubmitting}
          >
            <YStack
              height={48}
              borderRadius={tokens.radius.md}
              backgroundColor={tokens.surfaceRaised}
              borderWidth={1}
              borderColor={tokens.border}
              alignItems="center"
              justifyContent="center"
            >
              {isSubmitting ? (
                <ActivityIndicator color={tokens.textMuted} />
              ) : (
                <Text fontSize={13} fontWeight="700" color={tokens.textSecondary} letterSpacing={0.5}>
                  SAVE DRAFT
                </Text>
              )}
            </YStack>
          </Pressable>

          {/* Confirm Order Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirm order"
            style={{ flex: 1.5 }}
            onPress={() => handleSubmit('Confirmed')}
            disabled={isSubmitting}
          >
            <YStack
              height={48}
              borderRadius={tokens.radius.md}
              backgroundColor={isSubmitting ? tokens.surfaceRaised : tokens.accent}
              alignItems="center"
              justifyContent="center"
            >
              {isSubmitting ? (
                <ActivityIndicator color={tokens.textMuted} />
              ) : (
                <Text fontSize={13} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.8}>
                  CONFIRM ORDER
                </Text>
              )}
            </YStack>
          </Pressable>
        </XStack>
      </YStack>

      {/* Address Sheet Modal */}
      <AddressSheet
        visible={sheetOpen}
        initial={emptyAddress}
        onSave={(data) => setAddress(data)}
        onClose={() => setSheetOpen(false)}
      />

      {/* Floating Snackbar Toast */}
      {snackbarVisible && (
        <YStack
          position="absolute"
          bottom={80 + insets.bottom}
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
