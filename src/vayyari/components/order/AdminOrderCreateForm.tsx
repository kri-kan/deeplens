import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ScrollView,
  TextInput,
  Pressable,
  Linking,
  Alert,
  Image,
  ActivityIndicator,
  BackHandler,
  Modal,
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
  LuEye,
  LuImage,
  LuRotateCcw,
} from '@/components/tamagui-ui/icons/lu';
import { ImageViewerModal } from '@/components/tamagui-ui/molecules/ImageViewerModal';
import { CapsuleSegmentControl } from '@/components/tamagui-ui/atoms/CapsuleSegmentControl';
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

import { ProductListSection, OrderItem } from './ProductListSection';
import { ProductEditSheet } from './ProductEditSheet';
import { QuickPickerSheet } from '@/components/tamagui-ui/molecules/QuickPickerSheet';
import { TransactionReceiptSection } from '@/components/tamagui-ui/molecules/TransactionReceiptSection';
import { ConfirmDialog } from '@/components/tamagui-ui/molecules/ConfirmDialog';

// Brand colors
export const WHATSAPP_GREEN = '#25D366';
export const INSTAGRAM_ACTIVE = '#E1306C';

export type OrderSource = 'whatsapp' | 'instagram' | null;
export type PaymentType = 'cod' | 'prepaid';

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
  isReviewed?: boolean;
}

export function AddressCard({ address, onEditPress, isReviewed = true }: AddressCardProps) {
  const { tokens } = useTheme();
  const isUnreviewed = isReviewed === false;

  return (
    <YStack gap={6}>
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={11} fontWeight="700" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
          Delivery Address
        </Text>
        {isUnreviewed && (
          <XStack
            backgroundColor={`${tokens.warning}22`}
            borderWidth={1}
            borderColor={`${tokens.warning}55`}
            borderRadius={tokens.radius.xs}
            paddingHorizontal={7}
            paddingVertical={2}
            alignItems="center"
            gap={4}
          >
            <LuTriangleAlert size={11} color={tokens.warning} />
            <Text fontSize={10} fontWeight="800" color={tokens.warning} letterSpacing={0.4}>
              NOT REVIEWED
            </Text>
          </XStack>
        )}
      </XStack>

      {address ? (
        <YStack
          backgroundColor={isUnreviewed ? `${tokens.warning}0F` : tokens.surface}
          borderWidth={isUnreviewed ? 1.5 : 1}
          borderColor={isUnreviewed ? tokens.warning : tokens.border}
          borderRadius={tokens.radius.md}
          padding={12}
          gap={6}
        >
          {isUnreviewed && (
            <XStack
              backgroundColor={`${tokens.warning}1A`}
              borderRadius={tokens.radius.xs}
              paddingHorizontal={8}
              paddingVertical={5}
              alignItems="center"
              justifyContent="space-between"
              marginBottom={2}
            >
              <XStack gap={6} alignItems="center" flex={1}>
                <LuTriangleAlert size={13} color={tokens.warning} />
                <Text fontSize={11} fontWeight="700" color={tokens.warning} numberOfLines={1}>
                  Copied from cloned order — please review address
                </Text>
              </XStack>
              <Pressable onPress={onEditPress}>
                <Text fontSize={11} fontWeight="800" color={tokens.warning} textDecorationLine="underline">
                  Review
                </Text>
              </Pressable>
            </XStack>
          )}

          <XStack justifyContent="space-between" alignItems="flex-start">
            <XStack gap={8} alignItems="center" flex={1}>
              <YStack
                width={28}
                height={28}
                borderRadius={tokens.radius.full}
                backgroundColor={isUnreviewed ? `${tokens.warning}25` : tokens.accentSubtle}
                alignItems="center"
                justifyContent="center"
              >
                <LuMapPin size={14} color={isUnreviewed ? tokens.warning : tokens.accent} />
              </YStack>
              <Text fontSize={13} fontWeight="700" color={tokens.text} flex={1}>
                {address.name}
              </Text>
            </XStack>

            <Pressable onPress={onEditPress} accessibilityRole="button" accessibilityLabel="Edit address">
              <YStack
                width={28}
                height={28}
                borderRadius={tokens.radius.sm}
                backgroundColor={isUnreviewed ? `${tokens.warning}20` : tokens.surfaceRaised}
                borderWidth={isUnreviewed ? 1 : 0}
                borderColor={isUnreviewed ? tokens.warning : 'transparent'}
                alignItems="center"
                justifyContent="center"
              >
                <LuPencil size={12} color={isUnreviewed ? tokens.warning : tokens.accent} />
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
          <XStack marginHorizontal={20} marginBottom={14} gap={8} alignItems="center">
            {/* Reset button to the left */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset address fields"
              onPress={() => {
                setForm({ name: '', phone: '', address: '', pincode: '', city: '', state: '' });
                setPinServiceable(null);
                setFillState('idle');
                setParsedPreview(null);
                setAiRawText('');
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <XStack
                height={26}
                paddingHorizontal={10}
                alignItems="center"
                justifyContent="center"
                borderRadius={9999}
                borderWidth={1}
                borderColor={tokens.border}
                backgroundColor={tokens.surfaceRaised}
                gap={4}
              >
                <LuRotateCcw size={12} color={tokens.textSecondary} />
                <Text
                  fontSize={11}
                  fontWeight="700"
                  color={tokens.textSecondary}
                  letterSpacing={0.3}
                  textTransform="uppercase"
                >
                  Reset
                </Text>
              </XStack>
            </Pressable>

            <Pressable
              style={{ flex: 1 }}
              accessibilityRole="button"
              accessibilityLabel="Smart paste address from clipboard"
              onPress={handleSmartPaste}
            >
              <XStack
                height={26}
                alignItems="center"
                justifyContent="center"
                borderRadius={9999}
                borderWidth={1}
                borderColor={tokens.accent}
                backgroundColor={tokens.accentSubtle}
                gap={4}
              >
                <LuClipboardPaste size={12} color={tokens.accent} />
                <Text
                  fontSize={11}
                  fontWeight="700"
                  color={tokens.accent}
                  letterSpacing={0.3}
                  textTransform="uppercase"
                >
                  Smart Paste
                </Text>
              </XStack>
            </Pressable>

            <Pressable
              style={{ flex: 1 }}
              accessibilityRole="button"
              accessibilityLabel="Fill address using AI"
              onPress={() => setIsAiMode(true)}
            >
              <XStack
                height={26}
                alignItems="center"
                justifyContent="center"
                borderRadius={9999}
                backgroundColor={tokens.accent}
                gap={4}
              >
                <LuSparkles size={12} color={tokens.accentForeground} />
                <Text
                  fontSize={11}
                  fontWeight="700"
                  color={tokens.accentForeground}
                  letterSpacing={0.3}
                  textTransform="uppercase"
                >
                  AI Parse
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

            <XStack gap={10} marginTop={8}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Discard address changes"
                onPress={onClose}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 46,
                  borderRadius: tokens.radius.md,
                  borderWidth: 1,
                  borderColor: tokens.border,
                  backgroundColor: pressed ? `${tokens.text}10` : tokens.surfaceRaised,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Text fontSize={13} fontWeight="700" color={tokens.textSecondary} letterSpacing={0.4}>
                  DISCARD
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save address"
                onPress={() => {
                  onSave({ ...form, isDelhiveryServiceable: pinServiceable });
                  onClose();
                }}
                style={({ pressed }) => ({
                  flex: 1.5,
                  height: 46,
                  borderRadius: tokens.radius.md,
                  backgroundColor: pressed ? `${tokens.accent}D0` : tokens.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Text fontSize={13} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.6}>
                  SAVE ADDRESS
                </Text>
              </Pressable>
            </XStack>
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
  const { sharedMedia, commitCurrentSession, removeSharedMedia } = useShareIntentContext();

  // Top Section States (UNTOUCHED)
  const [source, setSource] = useState<OrderSource>('whatsapp');
  const [paymentType, setPaymentType] = useState<PaymentType>('cod');
  const [sourceInput, setSourceInput] = useState('');

  // Rest of Screen States (Matching Edit Order Screen)
  const [address, setAddress] = useState<AddressData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false); // Address sheet
  const [products, setProducts] = useState<OrderItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [transactionId, setTransactionId] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // Sheets & Dialogs matching Edit Order screen
  const [activeItem, setActiveItem] = useState<OrderItem | null>(null);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ uri: string; title?: string } | null>(null);
  const handledMediaUris = useRef<Set<string>>(new Set());

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
    type: 'single' | 'batch';
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showExitPrompt, setShowExitPrompt] = useState(false);

  const hasUnsavedChanges = useMemo(() => {
    return (
      products.length > 0 ||
      sourceInput.trim().length > 0 ||
      Boolean(address?.phone || address?.address) ||
      Boolean(receiptUrl) ||
      Boolean(transactionId.trim())
    );
  }, [products, sourceInput, address, receiptUrl, transactionId]);

  const handleAttemptBack = () => {
    if (hasUnsavedChanges) {
      setShowExitPrompt(true);
    } else if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/orders');
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      if (showExitPrompt) {
        setShowExitPrompt(false);
        return true;
      }
      if (hasUnsavedChanges) {
        setShowExitPrompt(true);
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [hasUnsavedChanges, showExitPrompt]);

  const handleDiscardAndExit = () => {
    setShowExitPrompt(false);

    // Clean up any uploaded MinIO attachments created during this uncreated order session
    const attachmentsToClean = products
      .map((p) => p.attachmentId)
      .filter((id): id is string => Boolean(id));

    const pathsToClean = products
      .map((p) => p.storagePath)
      .filter((p): p is string => Boolean(p));

    if (receiptUrl && receiptUrl.includes('/api/v1/Attachment/')) {
      pathsToClean.push(receiptUrl);
    }

    attachmentsToClean.forEach((attId) => {
      searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE(attId)).catch(() => {});
    });
    pathsToClean.forEach((path) => {
      searchApiClient.delete(API_ROUTES.ATTACHMENTS.DELETE_BY_PATH(path)).catch(() => {});
    });

    resetForm();

    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/orders');
    }
  };

  const handleSaveDraftAndExit = async () => {
    setShowExitPrompt(false);
    await handleSubmit('Unconfirmed');
  };

  useEffect(() => {
    if (snackbarVisible) {
      const timer = setTimeout(() => {
        setSnackbarVisible(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [snackbarVisible]);

  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentType(type);
  };

  const handleSourceSelect = (selected: 'whatsapp' | 'instagram') => {
    if (source !== selected) {
      setSource(selected);
      setSourceInput('');
    }
  };

  const resetForm = () => {
    setSource('whatsapp');
    setPaymentType('cod');
    setSourceInput('');
    setAddress(null);
    setProducts([]);
    setSelectedItemIds([]);
    setTransactionId('');
    setReceiptUrl(null);
    handledMediaUris.current.clear();
  };

  // Sync staged shared media from external apps directly into order items
  useEffect(() => {
    if (sharedMedia && sharedMedia.length > 0) {
      setProducts((prev) => {
        const existingUris = new Set(prev.map((i) => i.photoUri || i.image).filter(Boolean));
        const unhandled = sharedMedia.filter(
          (m) => !existingUris.has(m.uri) && !handledMediaUris.current.has(m.uri)
        );
        if (unhandled.length === 0) return prev;

        unhandled.forEach((m) => handledMediaUris.current.add(m.uri));
        const newItems: OrderItem[] = unhandled.map((m, idx) => ({
          id: `item-shared-${Date.now()}-${idx}`,
          title: '',
          productId: '',
          size: 'Free Size',
          quantity: 1,
          costPerPiece: 0,
          photoUri: m.uri,
          image: m.uri,
        }));
        return [...prev, ...newItems];
      });
    }
  }, [sharedMedia]);

  // Product List Handlers matching Edit Order Screen
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
    if (selectedItemIds.length === 0) return;
    setConfirmDialog({
      visible: true,
      type: 'batch',
      title: `Delete ${selectedItemIds.length} Items?`,
      message: `Are you sure you want to remove ${selectedItemIds.length} selected items from this order draft?`,
      confirmLabel: `Delete (${selectedItemIds.length})`,
    });
  };

  const handleAddProduct = () => {
    const newItem: OrderItem = {
      id: `item-${Date.now()}-${products.length}`,
      title: '',
      productId: '',
      size: 'Free Size',
      quantity: 1,
      costPerPiece: 0,
    };
    setActiveItem(newItem);
    setProductSheetOpen(true);
  };

  const handleEditProduct = (item: OrderItem) => {
    setActiveItem(item);
    setProductSheetOpen(true);
  };

  const handleSaveProductItem = (savedItem: OrderItem) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === savedItem.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = savedItem;
        return updated;
      }
      return [...prev, savedItem];
    });
  };

  const handleRequestRemoveProduct = (id: string) => {
    setConfirmDialog({
      visible: true,
      type: 'single',
      targetId: id,
      title: 'Remove Item?',
      message: 'Are you sure you want to remove this item from the order draft?',
      confirmLabel: 'Remove Item',
    });
  };

  const handleConfirmAction = () => {
    if (confirmDialog.type === 'batch') {
      const remaining = products.filter((p) => !selectedItemIds.includes(p.id));
      setProducts(remaining);
      setSelectedItemIds([]);
    } else if (confirmDialog.type === 'single' && confirmDialog.targetId) {
      const targetIdStr = String(confirmDialog.targetId);
      const itemToRemove = products.find((i) => String(i.id) === targetIdStr);
      if (itemToRemove?.photoUri && sharedMedia && sharedMedia.length > 0) {
        const sIdx = sharedMedia.findIndex((m) => m.uri === itemToRemove.photoUri);
        if (sIdx >= 0) {
          removeSharedMedia(sIdx);
        }
      }
      setProducts((prev) => prev.filter((x) => String(x.id) !== targetIdStr));
      setSelectedItemIds((prev) => prev.filter((x) => String(x) !== targetIdStr));
    }
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

  const handleSelectPickerOption = (value: string) => {
    if (!pickerState.itemId) return;
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id !== pickerState.itemId) return item;
        if (pickerState.type === 'size') {
          return { ...item, size: value };
        } else {
          return { ...item, quantity: parseInt(value, 10) || 1 };
        }
      })
    );
    setPickerState((prev) => ({ ...prev, visible: false }));
  };

  const handleUpdateItem = (id: string, updates: Partial<OrderItem>) => {
    setProducts((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  // Receipt Handlers matching Edit Order screen
  const handleUploadReceipt = async (mockUrl: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptUrl(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Failed to pick receipt image:', err);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptUrl(null);
  };

  // Calculations matching Edit Order screen
  const distinctGroupKeys = useMemo(() => {
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

  const totalItemCount = useMemo(() => {
    return products.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [products]);

  const itemsSubtotal = useMemo(() => {
    return products.reduce((sum, item) => {
      const codCharge = paymentType === 'cod' ? (item.codChargePerPiece ?? 50) : 0;
      return sum + (item.quantity || 1) * ((item.costPerPiece || 0) + codCharge);
    }, 0);
  }, [products, paymentType]);

  const totalAmount = itemsSubtotal;

  const handleSubmit = async (statusTarget: OrderStatus = 'Unconfirmed') => {
    if (statusTarget === 'Confirmed') {
      if (!sourceInput.trim()) {
        Alert.alert('Missing Contact', 'Please provide customer WhatsApp number or Instagram handle.');
        return;
      }
      if (products.length === 0) {
        Alert.alert('No Items', 'Please add at least one item before confirming the order.');
        return;
      }
      if (products.some((i) => !i.title?.trim() && !i.productId?.trim() && !i.photoUri && !i.image)) {
        Alert.alert('Invalid Item', 'All added items must have a photo, title or SKU before confirming.');
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

      const orderPayload: Partial<OrderIdEntry> = {
        source: source === 'whatsapp' ? 'WhatsApp' : source === 'instagram' ? 'Instagram' : 'None',
        sourceHandle: sourceInput.trim(),
        paymentMode: paymentType === 'cod' ? 'COD' : 'Prepaid',
        status: statusTarget,
        needLabel: paymentType === 'cod',
        customerName: address?.name || 'Customer',
        customerPhone: source === 'whatsapp' ? sourceInput.trim() : (address?.phone || sourceInput.trim()),
        customerAddress: address?.address,
        shippingStreet: address?.address,
        shippingPincode: address?.pincode,
        shippingCity: address?.city,
        shippingState: address?.state,
        customerId,
        isServiceable: address?.isDelhiveryServiceable ?? false,
        transactionId: transactionId.trim() || undefined,
        attachments: receiptUrl
          ? [{ id: `receipt-${Date.now()}`, key: receiptUrl, name: 'receipt_screenshot.png', tag: 'order_receipt' }]
          : undefined,
        items: products.map((i, idx) => {
          const metaObj: Record<string, any> = {};
          if (i.photoUri || (i.image && i.image !== i.catalogImageUrl)) metaObj.photoUri = i.photoUri || i.image;
          if (i.photoUri || i.image) metaObj.image = i.photoUri || i.image;
          if (i.catalogImageUrl) metaObj.catalogImageUrl = i.catalogImageUrl;
          if (i.size) metaObj.size = i.size || 'Free Size';
          if (i.vendor) metaObj.vendor = i.vendor;
          if (i.codChargePerPiece !== undefined) {
            metaObj.codChargePerPiece = i.codChargePerPiece;
            metaObj['cod/pc'] = i.codChargePerPiece;
          }
          if (i.attachmentId) metaObj.attachmentId = i.attachmentId;
          if (i.storagePath) metaObj.storagePath = i.storagePath;

          const meta = Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : undefined;
          const itemTitle = i.title?.trim() || (i.productId?.trim() ? `Item ${i.productId.trim()}` : `Product Item #${idx + 1}`);
          return {
            productId: i.productId?.trim() || undefined,
            productTitle: itemTitle,
            quantity: i.quantity || 1,
            unitPrice: i.costPerPiece || 0,
            subtotal: (i.costPerPiece || 0) * (i.quantity || 1),
            vendorId: i.vendor || undefined,
            vendorName: i.vendor || undefined,
            comments: meta,
          };
        }),
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
          totalOrderValue: totalAmount,
          totalCodBalance: paymentType === 'cod' ? totalAmount : 0,
          orderDate: new Date().toISOString(),
          status: 'PendingFulfillment',
          hasNdr: false,
          hasEscalation: false,
          items: products.map((i, idx) => {
            const itemTitle = i.title?.trim() || (i.productId?.trim() ? `Item ${i.productId.trim()}` : `Product Item #${idx + 1}`);
            return {
              id: `ITEM-${createdId}-${idx + 1}`,
              orderId: createdId,
              productId: i.productId?.trim() || '',
              productName: itemTitle,
              quantity: i.quantity || 1,
              unitPrice: i.costPerPiece || 0,
              totalPrice: (i.costPerPiece || 0) * (i.quantity || 1),
              proportionalCodAmount: (i.costPerPiece || 0) * (i.quantity || 1),
              vendorId: i.vendor || 'VND-DEFAULT',
              vendorName: i.vendor || 'Default Vendor',
              photoUri: i.photoUri || i.image,
            };
          }),
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
            onPress={handleAttemptBack}
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
        contentContainerStyle={{ paddingBottom: 100 + Math.max(16, insets.bottom) }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack paddingHorizontal={8} paddingTop={10} gap={10}>
          {/* ── Section 1: Order Type & Channel (LEFT EXACTLY AS REQUESTED) ── */}
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
              <CapsuleSegmentControl<PaymentType>
                options={[
                  { value: 'cod', label: 'COD' },
                  { value: 'prepaid', label: 'Prepaid' },
                ]}
                value={paymentType}
                onChange={(val) => val && handlePaymentTypeChange(val)}
                accessibilityLabel="Select payment type"
              />
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

          {/* ── Delhivery Express Serviceability Status Banner (Matching Edit Order Screen) ── */}
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

          {/* ── Product List Section (Matching Edit Order Screen) ── */}
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

          {/* ── Address Preview Card (Matching Edit Order Screen) ── */}
          <AddressCard
            address={address}
            onEditPress={() => setSheetOpen(true)}
          />

          <YStack height={1} backgroundColor={tokens.border} />

          {/* ── Transaction & Receipt Section (Matching Edit Order Screen) ── */}
          <TransactionReceiptSection
            transactionId={transactionId}
            receiptUrl={receiptUrl}
            onChangeTransactionId={setTransactionId}
            onUploadReceipt={handleUploadReceipt}
            onRemoveReceipt={handleRemoveReceipt}
          />
        </YStack>
      </ScrollView>

      {/* ── Sticky Bottom Action Bar (Matching Edit Order Screen) ── */}
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
        paddingBottom={Math.max(12, insets.bottom + 8)}
        shadowColor="#000"
        shadowOffset={{ width: 0, height: -3 }}
        shadowOpacity={0.08}
        shadowRadius={6}
        elevation={8}
        zIndex={100}
      >
        <XStack alignItems="center" justifyContent="space-between" gap={12}>
          {/* Order Summary: Items & Total Price */}
          <YStack flex={1} gap={2}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.5}>
              {totalItemCount} {totalItemCount === 1 ? 'ITEM' : 'ITEMS'} • {distinctGroupKeys.length} {distinctGroupKeys.length === 1 ? 'PKG' : 'PKGS'}
            </Text>
            <Text fontSize={17} fontWeight="900" color={tokens.text}>
              ₹{totalAmount.toLocaleString('en-IN')}
            </Text>
          </YStack>

          {/* Action Buttons: CONFIRM (accent button) and SAVE DRAFT (surface button) */}
          <XStack alignItems="center" gap={8}>
            {/* CONFIRM ORDER Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm order"
              onPress={() => handleSubmit('Confirmed')}
              disabled={isSubmitting}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                height: 40,
                borderRadius: tokens.radius.sm,
                backgroundColor: pressed ? `${tokens.accent}D0` : tokens.accent,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: isSubmitting ? 0.6 : 1,
                shadowColor: tokens.accent,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 3,
              })}
            >
              {isSubmitting ? (
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

            {/* SAVE DRAFT Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save order draft"
              onPress={() => handleSubmit('Unconfirmed')}
              disabled={isSubmitting}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                height: 40,
                borderRadius: tokens.radius.sm,
                borderWidth: 1,
                borderColor: tokens.border,
                backgroundColor: pressed ? `${tokens.text}10` : tokens.surfaceRaised,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isSubmitting ? 0.6 : 1,
              })}
            >
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                {isSubmitting ? 'SAVING...' : 'SAVE DRAFT'}
              </Text>
            </Pressable>
          </XStack>
        </XStack>
      </YStack>

      {/* ── Product Edit Sheet ── */}
      <ProductEditSheet
        visible={productSheetOpen}
        item={activeItem}
        isCod={paymentType === 'cod'}
        onSaveItem={handleSaveProductItem}
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
        visible={sheetOpen}
        initial={emptyAddress}
        onSave={(data) => setAddress(data)}
        onClose={() => setSheetOpen(false)}
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

      {/* ── Fullscreen Photo Viewer ── */}
      <ImageViewerModal
        visible={Boolean(previewImage)}
        imageUrl={previewImage?.uri || ''}
        title={previewImage?.title}
        onClose={() => setPreviewImage(null)}
      />

      {/* ── Floating Snackbar Toast ── */}
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

      {/* ── Unsaved Changes / Exit Prompt Modal ── */}
      <Modal
        visible={showExitPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExitPrompt(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          onPress={() => setShowExitPrompt(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: tokens.surface,
              borderRadius: tokens.radius.lg || 16,
              padding: 20,
              borderWidth: 1,
              borderColor: tokens.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <YStack gap={16}>
              <XStack alignItems="center" gap={12}>
                <YStack
                  width={40}
                  height={40}
                  borderRadius={tokens.radius.full || 20}
                  backgroundColor={`${tokens.warning}1A`}
                  alignItems="center"
                  justifyContent="center"
                >
                  <LuTriangleAlert size={22} color={tokens.warning} />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={16} fontWeight="700" color={tokens.text}>
                    Unsaved Order Changes
                  </Text>
                  <Text fontSize={12} color={tokens.textMuted} marginTop={2}>
                    You have items or details added to this order.
                  </Text>
                </YStack>
              </XStack>

              <Text fontSize={13} color={tokens.textSecondary} lineHeight={18}>
                Would you like to save this order as a draft before leaving, or discard all changes?
              </Text>

              <YStack gap={10} marginTop={4}>
                {/* Save as Draft */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save as draft and exit"
                  onPress={handleSaveDraftAndExit}
                  disabled={isSubmitting}
                  style={({ pressed }) => ({
                    backgroundColor: tokens.accent,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: tokens.radius.sm || 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    opacity: pressed || isSubmitting ? 0.8 : 1,
                  })}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <LuCheck size={16} color="#FFFFFF" />
                      <Text fontSize={13} fontWeight="700" color="#FFFFFF">
                        SAVE AS DRAFT
                      </Text>
                    </>
                  )}
                </Pressable>

                {/* Discard Order */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Discard order and clean up"
                  onPress={handleDiscardAndExit}
                  disabled={isSubmitting}
                  style={({ pressed }) => ({
                    backgroundColor: '#FEE2E2',
                    borderWidth: 1,
                    borderColor: '#FCA5A5',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: tokens.radius.sm || 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    opacity: pressed || isSubmitting ? 0.8 : 1,
                  })}
                >
                  <LuTrash2 size={16} color="#DC2626" />
                  <Text fontSize={13} fontWeight="700" color="#DC2626">
                    DISCARD & EXIT
                  </Text>
                </Pressable>

                {/* Keep Editing */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Keep editing"
                  onPress={() => setShowExitPrompt(false)}
                  disabled={isSubmitting}
                  style={({ pressed }) => ({
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: tokens.border,
                    paddingVertical: 11,
                    paddingHorizontal: 16,
                    borderRadius: tokens.radius.sm || 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text fontSize={13} fontWeight="600" color={tokens.textSecondary}>
                    KEEP EDITING
                  </Text>
                </Pressable>
              </YStack>
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </YStack>
  );
};
