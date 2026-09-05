import React, { useState, useRef } from 'react';
import {
  ScrollView,
  TextInput,
  Pressable,
  Linking,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuPencil,
  LuPlus,
  LuMapPin,
  LuX,
  LuSparkles,
  LuClipboardPaste,
  LuArrowLeft,
  LuCheck,
  LuTriangleAlert,
  LuPhone,
  LuExternalLink,
} from 'react-icons/lu';
import {
  RiWhatsappLine,
  RiWhatsappFill,
  RiInstagramLine,
  RiInstagramFill,
} from 'react-icons/ri';
import { useTheme } from '../../theme';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type OrderSource = 'whatsapp' | 'instagram' | null;
export type PaymentType = 'cod' | 'prepaid';

export interface MockImage {
  id: string;
  color: string; // hex — used as placeholder fill
}

export interface AddressData {
  name: string;
  phone: string;
  address: string;
  pincode: string;
}

export type AdminOrderFormPageProps = {
  /** Pre-selected order source (for Storybook stories) */
  initialSource?: OrderSource;
  /** Pre-selected payment type */
  initialPaymentType?: PaymentType;
  /** Pre-filled source input value (phone or handle) */
  initialSourceInput?: string;
  /** Seed images to show in the grid */
  initialImages?: MockImage[];
  /** Pre-filled address (shows the preview card) */
  initialAddress?: AddressData | null;
  /** Whether the address sheet starts open (for Storybook) */
  initialSheetOpen?: boolean;
  /** Callbacks — no-ops in Storybook */
  onAddImage?: () => void;
  onSaveAddress?: (data: AddressData) => void;
  onSubmitOrder?: () => void;
};

// ─────────────────────────────────────────────
// WhatsApp / Instagram brand colours (static)
// ─────────────────────────────────────────────
export const WHATSAPP_GREEN = '#25d366';
export const INSTAGRAM_ACTIVE = '#e1306c'; // vibrant Instagram pink/magenta from brand guidelines

// ─────────────────────────────────────────────
// Section: Order Type (source + payment + input)
// ─────────────────────────────────────────────

interface OrderTypeSectionProps {
  source: OrderSource;
  onSourceChange: (s: OrderSource) => void;
  paymentType: PaymentType;
  onPaymentTypeChange: (p: PaymentType) => void;
  sourceInput: string;
  onSourceInputChange: (v: string) => void;
}

function OrderTypeSection({
  source,
  onSourceChange,
  paymentType,
  onPaymentTypeChange,
  sourceInput,
  onSourceInputChange,
}: OrderTypeSectionProps) {
  const { tokens } = useTheme();

  const handleSourceToggle = (tapped: 'whatsapp' | 'instagram') => {
    onSourceChange(source === tapped ? null : tapped);
    onSourceInputChange('');
  };

  return (
    <YStack gap={8}>
      {/* Row: source icons + payment pills */}
      <XStack alignItems="center" justifyContent="space-between">
        {/* Bare Source Icons */}
        <XStack gap={16} alignItems="center">
          {/* WhatsApp bare icon */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select WhatsApp as order source"
            onPress={() => handleSourceToggle('whatsapp')}
            style={{ cursor: 'pointer' }}
          >
            {source === 'whatsapp' ? (
              <RiWhatsappFill size={36} color={WHATSAPP_GREEN} />
            ) : (
              <RiWhatsappLine size={36} color={tokens.textMuted} />
            )}
          </Pressable>

          {/* Instagram bare icon */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select Instagram as order source"
            onPress={() => handleSourceToggle('instagram')}
            style={{ cursor: 'pointer' }}
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
              <Pressable
                key={p}
                accessibilityRole="button"
                accessibilityLabel={`${p === 'cod' ? 'Cash on Delivery' : 'Prepaid'} payment`}
                onPress={() => onPaymentTypeChange(p)}
              >
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

      {/* Conditional Input */}
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
              accessibilityLabel="WhatsApp phone number or URL input"
              value={sourceInput}
              onChangeText={onSourceInputChange}
              placeholder="WhatsApp Number / URL *"
              placeholderTextColor={tokens.textMuted}
              keyboardType="phone-pad"
              style={{
                flex: 1,
                fontSize: 14,
                color: tokens.text,
                outlineStyle: 'none',
              } as any}
            />
            {sourceInput.trim().length > 0 && (
              <XStack
                cursor="pointer"
                padding={6}
                borderRadius={tokens.radius.sm}
                backgroundColor={`${WHATSAPP_GREEN}18`}
                alignItems="center"
                justifyContent="center"
                hoverStyle={{ backgroundColor: `${WHATSAPP_GREEN}30` }}
                pressStyle={{ scale: 0.92 }}
                role="link"
                aria-label="Open WhatsApp chat"
                onPress={() => {
                  const clean = sourceInput.replace(/[^0-9]/g, '');
                  if (clean) {
                    const url = `https://wa.me/${clean}`;
                    if (typeof window !== 'undefined') {
                      window.open(url, '_blank');
                    } else {
                      Linking.openURL(url);
                    }
                  }
                }}
              >
                <LuExternalLink size={15} color={WHATSAPP_GREEN} />
              </XStack>
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
              accessibilityLabel="Instagram handle or URL input"
              value={sourceInput}
              onChangeText={onSourceInputChange}
              placeholder="Instagram URL / Handle *"
              placeholderTextColor={tokens.textMuted}
              autoCapitalize="none"
              style={{
                flex: 1,
                fontSize: 14,
                color: tokens.text,
                outlineStyle: 'none',
              } as any}
            />
            {sourceInput.trim().length > 0 && (
              <XStack
                cursor="pointer"
                padding={6}
                borderRadius={tokens.radius.sm}
                backgroundColor={`${INSTAGRAM_ACTIVE}18`}
                alignItems="center"
                justifyContent="center"
                hoverStyle={{ backgroundColor: `${INSTAGRAM_ACTIVE}30` }}
                pressStyle={{ scale: 0.92 }}
                role="link"
                aria-label="Open Instagram message"
                onPress={() => {
                  const clean = sourceInput.replace(/^@/, '').trim();
                  if (clean) {
                    const url = `https://ig.me/m/${clean}`;
                    if (typeof window !== 'undefined') {
                      window.open(url, '_blank');
                    } else {
                      Linking.openURL(url);
                    }
                  }
                }}
              >
                <LuExternalLink size={15} color={INSTAGRAM_ACTIVE} />
              </XStack>
            )}
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}

// ─────────────────────────────────────────────
// Section: Reference Image Grid
// ─────────────────────────────────────────────

interface ImageGridSectionProps {
  images: MockImage[];
  onAddImage: () => void;
}

function ImageGridSection({ images, onAddImage }: ImageGridSectionProps) {
  const { tokens } = useTheme();
  const GAP = 8;
  const TILE_SIZE = 76;

  return (
    <YStack gap={6}>
      <Text
        fontSize={11}
        fontWeight="700"
        color={tokens.textMuted}
        textTransform="uppercase"
        letterSpacing={0.8}
      >
        Reference Images
      </Text>

      {/* Grid */}
      <XStack flexWrap="wrap" gap={GAP}>
        {/* Existing image tiles */}
        {images.map((img) => (
          <YStack
            key={img.id}
            width={TILE_SIZE}
            height={TILE_SIZE}
            borderRadius={tokens.radius.md}
            overflow="hidden"
            backgroundColor={img.color}
            flexShrink={0}
            shadowColor="#000"
            shadowOpacity={0.08}
            shadowRadius={6}
            shadowOffset={{ width: 0, height: 2 }}
          />
        ))}

        {/* Upload tile */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add reference image"
          onPress={onAddImage}
        >
          <YStack
            width={TILE_SIZE}
            height={TILE_SIZE}
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
              width={32}
              height={32}
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.accentSubtle}
              alignItems="center"
              justifyContent="center"
            >
              <LuPlus size={18} color={tokens.accent} />
            </YStack>
            <Text fontSize={10} color={tokens.textMuted} fontWeight="600">
              Add
            </Text>
          </YStack>
        </Pressable>
      </XStack>
    </YStack>
  );
}

// ─────────────────────────────────────────────
// Section: Address Preview Card
// ─────────────────────────────────────────────

export interface AddressCardProps {
  address: AddressData | null;
  onEditPress: () => void;
}

export function AddressCard({ address, onEditPress }: AddressCardProps) {
  const { tokens } = useTheme();

  return (
    <YStack gap={6}>
      <Text
        fontSize={11}
        fontWeight="700"
        color={tokens.textMuted}
        textTransform="uppercase"
        letterSpacing={0.8}
      >
        Delivery Address
      </Text>

      {address ? (
        /* Filled address card */
        <YStack
          backgroundColor={tokens.surface}
          borderWidth={1}
          borderColor={tokens.border}
          borderRadius={tokens.radius.md}
          padding={12}
          gap={6}
          shadowColor="#000"
          shadowOpacity={0.04}
          shadowRadius={6}
          shadowOffset={{ width: 0, height: 2 }}
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
                flexShrink={0}
              >
                <LuMapPin size={14} color={tokens.accent} />
              </YStack>
              <Text fontSize={13} fontWeight="700" color={tokens.text} flex={1}>
                {address.name}
              </Text>
            </XStack>

            {/* Edit icon */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit delivery address"
              onPress={onEditPress}
            >
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
          <XStack gap={14}>
            <Text fontSize={11} color={tokens.textMuted}>
              PIN: {address.pincode}
            </Text>
            <Text fontSize={11} color={tokens.textMuted}>
              📞 {address.phone}
            </Text>
          </XStack>
        </YStack>
      ) : (
        /* Empty state card */
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add delivery address"
          onPress={onEditPress}
        >
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
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.accentSubtle}
              alignItems="center"
              justifyContent="center"
            >
              <LuPlus size={16} color={tokens.accent} />
            </YStack>
            <Text fontSize={12} color={tokens.textMuted} fontWeight="600">
              Add delivery address
            </Text>
          </YStack>
        </Pressable>
      )}
    </YStack>
  );
}

// ─────────────────────────────────────────────
// Smart-parse helper
// Detects pipe-delimited format: Name | Phone | Address | Pincode
// ─────────────────────────────────────────────

function trySmartParse(text: string): AddressData | null {
  const parts = text.split('|').map((p) => p.trim());
  if (parts.length === 4 && parts.every((p) => p.length > 0)) {
    return { name: parts[0], phone: parts[1], address: parts[2], pincode: parts[3] };
  }
  return null;
}

// Mock AI parser — simulates a 1.5s network call.
// In production, replace with a real API call.
async function mockAiParse(rawText: string): Promise<AddressData> {
  await new Promise((r) => setTimeout(r, 1500));
  // Simple heuristic mock — real impl would call an LLM endpoint.
  const pinMatch = rawText.match(/\b(\d{6})\b/);
  const phoneMatch = rawText.match(/(\+?91[\s-]?\d{5}[\s-]?\d{5}|\d{10})/);
  return {
    name: 'Priya Menon',
    phone: phoneMatch ? phoneMatch[0] : '+91 98765 43210',
    address: rawText
      .replace(phoneMatch?.[0] ?? '', '')
      .replace(pinMatch?.[0] ?? '', '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80),
    pincode: pinMatch ? pinMatch[1] : '',
  };
}

// ─────────────────────────────────────────────
// Reusable underline field component
// ─────────────────────────────────────────────

type FillState = 'idle' | 'smart-parsed' | 'ai-parsing' | 'ai-filled' | 'ai-error';
type SheetMode = 'form' | 'ai-input';

export interface UnderlineFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  multiline?: boolean;
  /** Fixed height for multiline fields (in px) */
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
    // Heuristic paste detection: value grew by more than 10 chars in one event
    if (onSmartPaste && v.length - prevLen.current > 10) {
      onSmartPaste(v);
    }
    prevLen.current = v.length;
    onChange(v);
  };

  return (
    <YStack
      paddingBottom={8}
      borderBottomWidth={1}
      borderBottomColor={tokens.border}
    >
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
          outlineStyle: 'none',
          textAlignVertical: multiline ? 'top' : 'center',
          height: multilineHeight ?? (multiline ? 58 : 24),
          lineHeight: 20,
        } as any}
      />
    </YStack>
  );
}

// ─────────────────────────────────────────────
// Address Pull-up Sheet — in-frame overlay
// Rendered as position="absolute" so it stays inside
// the FormFactorPreview device frame rather than
// breaking out to browser-level like a <Modal> would.
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
  const [mode, setMode] = useState<SheetMode>('form');
  const [fillState, setFillState] = useState<FillState>('idle');
  const [aiRawText, setAiRawText] = useState('');
  const [aiOriginalText, setAiOriginalText] = useState('');

  // Sync form when initial changes (different Storybook stories)
  React.useEffect(() => {
    setForm(initial);
    setFillState('idle');
    setMode('form');
    setAiRawText('');
    setAiOriginalText('');
  }, [initial]);

  if (!visible) return null;

  const updateField = (field: keyof AddressData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // —— Smart Paste: check any pasted text for pipe-delimited format ——
  const handleSmartPaste = (text: string) => {
    const parsed = trySmartParse(text);
    if (parsed) {
      setForm(parsed);
      setFillState('smart-parsed');
    }
  };

  // —— AI Parse trigger ——
  const handleAiParse = async () => {
    if (!aiRawText.trim()) return;
    const original = aiRawText;
    setAiOriginalText(original);
    setFillState('ai-parsing');
    try {
      const parsed = await mockAiParse(original);
      setForm(parsed);
      setFillState('ai-filled');
      setMode('form'); // switch back to form view to show filled fields
    } catch {
      setFillState('ai-error');
    }
  };

  // —— Mode toggle actions ——
  const switchToAiMode = () => {
    setMode('ai-input');
    setFillState('idle');
    setAiRawText('');
  };
  const switchToFormMode = () => {
    setMode('form');
  };
  const dismissFillBanner = () => {
    if (fillState !== 'ai-filled') setFillState('idle');
  };

  // —— Derived ——
  const isAiMode = mode === 'ai-input';
  const isParsing = fillState === 'ai-parsing';

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
        {/* ── Drag handle ── */}
        <YStack alignItems="center" paddingBottom={10}>
          <YStack width={36} height={4} borderRadius={2} backgroundColor={tokens.border} />
        </YStack>

        {/* ── Header row ── */}
        <XStack
          paddingHorizontal={20}
          paddingBottom={12}
          justifyContent="space-between"
          alignItems="center"
        >
          {isAiMode ? (
            <XStack alignItems="center" gap={8}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to manual form"
                onPress={switchToFormMode}
              >
                <LuArrowLeft size={18} color={tokens.textSecondary} />
              </Pressable>
              <Text fontSize={16} fontWeight="800" color={tokens.text}>
                AI Address Fill
              </Text>
            </XStack>
          ) : (
            <Text fontSize={16} fontWeight="800" color={tokens.text}>
              Delivery Address
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close address sheet"
            onPress={onClose}
          >
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

        {/* ── Mode switcher badge buttons (only in form mode) ── */}
        {!isAiMode && (
          <XStack marginHorizontal={20} marginBottom={14} gap={10}>
            {/* Smart Paste badge button */}
            <XStack
              flex={1}
              height={28}
              alignItems="center"
              justifyContent="center"
              borderRadius={9999}
              borderWidth={1}
              borderColor={tokens.accent}
              backgroundColor={tokens.accentSubtle}
              gap={5}
              cursor="pointer"
              accessibilityRole="button"
              accessibilityLabel="Smart paste address from clipboard"
              onPress={async () => {
                try {
                  const text = await (navigator as any).clipboard.readText();
                  handleSmartPaste(text);
                } catch {
                  setFillState('idle');
                }
              }}
              hoverStyle={{ opacity: 0.88 }}
              pressStyle={{ opacity: 0.75, scale: 0.98 }}
            >
              <LuClipboardPaste size={13} color={tokens.accent} />
              <Text
                fontSize={12}
                fontWeight="700"
                letterSpacing={0.4}
                color={tokens.accent}
                textTransform="uppercase"
                lineHeight={16}
              >
                Smart Paste
              </Text>
            </XStack>

            {/* AI Fill badge button */}
            <XStack
              flex={1}
              height={28}
              alignItems="center"
              justifyContent="center"
              borderRadius={9999}
              backgroundColor={tokens.accent}
              gap={5}
              cursor="pointer"
              accessibilityRole="button"
              accessibilityLabel="Fill address using AI"
              onPress={switchToAiMode}
              hoverStyle={{ opacity: 0.92 }}
              pressStyle={{ opacity: 0.85, scale: 0.98 }}
            >
              <LuSparkles size={13} color={tokens.accentForeground} />
              <Text
                fontSize={12}
                fontWeight="700"
                letterSpacing={0.4}
                color={tokens.accentForeground}
                textTransform="uppercase"
                lineHeight={16}
              >
                AI Fill
              </Text>
            </XStack>
          </XStack>
        )}


        {/* ── Smart-parsed / AI-error banner ── */}
        {!isAiMode && (fillState === 'smart-parsed') && (
          <Pressable onPress={dismissFillBanner}>
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
              <LuX size={11} color={tokens.textMuted} />
            </XStack>
          </Pressable>
        )}
        {!isAiMode && fillState === 'ai-error' && (
          <XStack
            marginHorizontal={20}
            marginBottom={10}
            backgroundColor={`${tokens.error}14`}
            borderRadius={tokens.radius.sm}
            borderWidth={1}
            borderColor={`${tokens.error}30`}
            paddingHorizontal={12}
            paddingVertical={7}
            alignItems="center"
            gap={8}
          >
            <LuTriangleAlert size={13} color={tokens.error} />
            <Text fontSize={12} fontWeight="600" color={tokens.error}>
              AI parsing failed — please fill manually
            </Text>
          </XStack>
        )}

        {/* ════════════════════════════════════════
             FORM MODE
            ════════════════════════════════════════ */}
        {!isAiMode && (
          <YStack paddingHorizontal={20} gap={8}>
            <UnderlineField
              label="Full Name"
              value={form.name}
              onChange={(v) => updateField('name', v)}
              placeholder="Alex Smith"
              onSmartPaste={handleSmartPaste}
            />

            <UnderlineField
              label="Phone"
              value={form.phone}
              onChange={(v) => updateField('phone', v)}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              onSmartPaste={handleSmartPaste}
            />

            <UnderlineField
              label="Street Address"
              value={form.address}
              onChange={(v) => updateField('address', v)}
              placeholder="House / Flat No., Street, Area, City"
              multiline
              multilineHeight={58}
              onSmartPaste={handleSmartPaste}
            />

            <UnderlineField
              label="Postal Code"
              value={form.pincode}
              onChange={(v) => updateField('pincode', v)}
              placeholder="560034"
              keyboardType="numeric"
              onSmartPaste={handleSmartPaste}
            />

            {/* ── AI Comparison card — shown after AI fill ── */}
            {fillState === 'ai-filled' && aiOriginalText.length > 0 && (
              <YStack
                backgroundColor={tokens.surfaceRaised}
                borderRadius={tokens.radius.sm}
                borderWidth={1}
                borderColor={tokens.border}
                paddingHorizontal={12}
                paddingVertical={10}
                gap={4}
                marginTop={2}
              >
                <XStack alignItems="center" gap={6} marginBottom={2}>
                  <LuSparkles size={11} color={tokens.accent} />
                  <Text fontSize={9} fontWeight="700" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.9}>
                    Original — AI parsed from
                  </Text>
                </XStack>
                <Text
                  fontSize={12}
                  color={tokens.textSecondary}
                  lineHeight={17}
                  numberOfLines={4}
                >
                  {aiOriginalText}
                </Text>
              </YStack>
            )}

            {/* Save CTA */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save delivery address"
              onPress={() => {
                onSave(form);
                onClose();
              }}
            >
              <YStack
                height={46}
                borderRadius={tokens.radius.md}
                backgroundColor={tokens.accent}
                alignItems="center"
                justifyContent="center"
                marginTop={6}
              >
                <Text fontSize={13} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.6}>
                  SAVE ADDRESS
                </Text>
              </YStack>
            </Pressable>
          </YStack>
        )}

        {/* ════════════════════════════════════════
             AI FILL MODE
            ════════════════════════════════════════ */}
        {isAiMode && (
          <YStack paddingHorizontal={20} gap={10}>
            {/* Hint */}
            <Text fontSize={12} color={tokens.textMuted} lineHeight={17}>
              Paste any address in natural language — customer chat message, Google Maps result, or a label scan. AI will extract the fields for you.
            </Text>

            {/* Raw address textarea */}
            <YStack
              borderWidth={1}
              borderColor={tokens.border}
              borderRadius={tokens.radius.md}
              backgroundColor={tokens.surface}
              paddingHorizontal={12}
              paddingVertical={10}
            >
              <TextInput
                accessibilityLabel="Paste raw address for AI parsing"
                value={aiRawText}
                onChangeText={setAiRawText}
                placeholder={'e.g. Flat 12B, Prestige Lakeside, Whitefield,\nBengaluru 560066 · Priya Menon +91 9876543210'}
                placeholderTextColor={tokens.textMuted}
                multiline
                numberOfLines={5}
                autoFocus
                style={{
                  fontSize: 14,
                  color: tokens.text,
                  paddingVertical: 0,
                  outlineStyle: 'none',
                  textAlignVertical: 'top',
                  height: 100,
                  lineHeight: 20,
                } as any}
              />
            </YStack>

            {/* Smart paste hint */}
            <Text fontSize={11} color={tokens.textMuted}>
              Tip: For instant fill without AI, paste in format:
              {'  '}Name | Phone | Address | Pincode
            </Text>

            {/* Parse button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Parse address with AI"
              disabled={isParsing || !aiRawText.trim()}
              onPress={handleAiParse}
            >
              <YStack
                height={46}
                borderRadius={tokens.radius.md}
                backgroundColor={
                  isParsing || !aiRawText.trim() ? tokens.surfaceRaised : tokens.accent
                }
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
                gap={8}
              >
                {isParsing ? (
                  <>
                    <Text fontSize={13} fontWeight="800" color={tokens.textMuted}>
                      Parsing…
                    </Text>
                  </>
                ) : (
                  <>
                    <LuSparkles
                      size={15}
                      color={!aiRawText.trim() ? tokens.textMuted : tokens.accentForeground}
                    />
                    <Text
                      fontSize={13}
                      fontWeight="800"
                      color={!aiRawText.trim() ? tokens.textMuted : tokens.accentForeground}
                      letterSpacing={0.4}
                    >
                      Parse with AI
                    </Text>
                  </>
                )}
              </YStack>
            </Pressable>
          </YStack>
        )}
      </YStack>
    </YStack>
  );
}

// ─────────────────────────────────────────────
// Section Divider
// ─────────────────────────────────────────────

function SectionDivider() {
  const { tokens } = useTheme();
  return (
    <YStack height={1} backgroundColor={tokens.border} marginVertical={2} />
  );
}

// ─────────────────────────────────────────────
// Page Header
// ─────────────────────────────────────────────

function AdminPageHeader() {
  const { tokens } = useTheme();
  return (
    <XStack
      height={56}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={16}
      backgroundColor={tokens.surface}
      borderBottomWidth={1}
      borderBottomColor={tokens.border}
    >
      <Text fontSize={17} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
        New Order
      </Text>
    </XStack>
  );
}

// ─────────────────────────────────────────────
// Submit CTA Bar (sticky bottom)
// ─────────────────────────────────────────────

interface SubmitBarProps {
  onSubmit: () => void;
  disabled?: boolean;
}

function SubmitBar({ onSubmit, disabled }: SubmitBarProps) {
  const { tokens } = useTheme();
  return (
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
      paddingBottom={24}
      shadowColor="#000"
      shadowOpacity={0.08}
      shadowRadius={12}
      shadowOffset={{ width: 0, height: -4 }}
      zIndex={50}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create order"
        onPress={onSubmit}
        disabled={disabled}
      >
        <YStack
          height={50}
          borderRadius={tokens.radius.md}
          backgroundColor={disabled ? tokens.surfaceRaised : tokens.accent}
          alignItems="center"
          justifyContent="center"
        >
          <Text
            fontSize={14}
            fontWeight="800"
            color={disabled ? tokens.textMuted : tokens.accentForeground}
            letterSpacing={0.8}
          >
            CREATE ORDER
          </Text>
        </YStack>
      </Pressable>
    </YStack>
  );
}

// ─────────────────────────────────────────────
// AdminOrderFormPage — composed page
// ─────────────────────────────────────────────

export function AdminOrderFormPage({
  initialSource = null,
  initialPaymentType = 'cod',
  initialSourceInput = '',
  initialImages = [],
  initialAddress = null,
  initialSheetOpen = false,
  onAddImage,
  onSaveAddress,
  onSubmitOrder,
}: AdminOrderFormPageProps) {
  const { tokens } = useTheme();

  // ── Local state ──
  const [source, setSource] = useState<OrderSource>(initialSource);
  const [paymentType, setPaymentType] = useState<PaymentType>(initialPaymentType);
  const [sourceInput, setSourceInput] = useState(initialSourceInput);
  const [images, setImages] = useState<MockImage[]>(initialImages);
  const [address, setAddress] = useState<AddressData | null>(initialAddress);
  const [sheetOpen, setSheetOpen] = useState(initialSheetOpen);

  // Empty address form for the sheet
  const emptyAddress: AddressData = {
    name: address?.name ?? '',
    phone: address?.phone ?? '',
    address: address?.address ?? '',
    pincode: address?.pincode ?? '',
  };

  const handleAddImage = () => {
    if (onAddImage) {
      onAddImage();
    } else {
      // Storybook placeholder — add a mock coloured tile
      const MOCK_COLORS = [
        '#f0e6d3',
        '#d4c5b0',
        '#e8d5c4',
        '#c9b8a8',
        '#ddd0c8',
        '#b8a99a',
      ];
      const newImg: MockImage = {
        id: `img-${Date.now()}`,
        color: MOCK_COLORS[images.length % MOCK_COLORS.length],
      };
      setImages((prev) => [...prev, newImg]);
    }
  };

  const handleSaveAddress = (data: AddressData) => {
    setAddress(data);
    if (onSaveAddress) onSaveAddress(data);
  };

  return (
    <YStack flex={1} backgroundColor={tokens.background} position="relative">
      {/* Admin Page Header */}
      <AdminPageHeader />

      {/* Scrollable Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack paddingHorizontal={16} paddingTop={14} gap={12}>
          {/* ── Section 1: Order Type ── */}
          <OrderTypeSection
            source={source}
            onSourceChange={setSource}
            paymentType={paymentType}
            onPaymentTypeChange={setPaymentType}
            sourceInput={sourceInput}
            onSourceInputChange={setSourceInput}
          />

          <SectionDivider />

          {/* ── Section 2: Reference Images ── */}
          <ImageGridSection images={images} onAddImage={handleAddImage} />

          <SectionDivider />

          {/* ── Section 3: Delivery Address ── */}
          <AddressCard
            address={address}
            onEditPress={() => setSheetOpen(true)}
          />
        </YStack>
      </ScrollView>

      {/* Sticky Submit Bar */}
      <SubmitBar
        onSubmit={() => {
          if (onSubmitOrder) onSubmitOrder();
          else alert('Order created!');
        }}
      />

      {/* Address Pull-up Sheet */}
      <AddressSheet
        visible={sheetOpen}
        initial={emptyAddress}
        onSave={handleSaveAddress}
        onClose={() => setSheetOpen(false)}
      />
    </YStack>
  );
}
