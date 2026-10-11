import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Linking,
  Switch,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuStore,
  LuTag,
  LuBarcode,
  LuSparkles,
  LuUser,
  LuPhone,
  LuMail,
  LuLink,
  LuBuilding2,
  LuTruck,
  LuStar,
  LuMapPin,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuCheck,
  LuSearch,
  LuX,
  LuArrowLeft,
  LuSave,
  LuExternalLink,
  LuCircleAlert,
} from '@/components/tamagui-ui/icons/lu';
import { RiWhatsappFill } from '@/components/tamagui-ui/icons/ri';
import { useTheme } from '@/theme';
import { BottomSheet } from '@/components/tamagui-ui/atoms/BottomSheet';

// ─────────────────────────────────────────────
// Data Interfaces & Contracts
// ─────────────────────────────────────────────

export interface DelhiveryWarehouseOption {
  id: string;
  name: string;
  code: string;
  alias?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isCentral?: boolean;
}

export interface VendorAddressItem {
  id?: string;
  vendorId?: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  pincode: string;
  city?: string;
  state?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LinkedWhatsAppChat {
  jid: string;
  name?: string;
  isGroup?: boolean;
  assignedAt?: string;
}

export interface EditVendorFormData {
  id?: string;
  vendorName: string;
  alias?: string;
  vendorCode?: string;
  firstName?: string;
  lastName?: string;
  whatsappPrimary?: string;
  whatsappSecondary?: string;
  orderGroupLink?: string;
  email?: string;
  notes?: string;
  isActive: boolean;
  isFavorite?: boolean;
  defaultWarehouseId?: string | null;
  defaultWarehouseName?: string;
  defaultWarehouseCode?: string;
  defaultWarehouseAlias?: string;
}

export interface EditVendorViewProps {
  initialVendor?: Partial<EditVendorFormData>;
  isNew?: boolean;
  warehouses?: DelhiveryWarehouseOption[];
  warehousesLoading?: boolean;
  addresses?: VendorAddressItem[];
  addressesLoading?: boolean;
  linkedChats?: LinkedWhatsAppChat[];
  chatsLoading?: boolean;
  loading?: boolean;
  saving?: boolean;
  onSave?: (data: EditVendorFormData) => void | Promise<void>;
  onBack?: () => void;
  onSaveAddress?: (address: Omit<VendorAddressItem, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<void> | void;
  onDeleteAddress?: (addressId: string) => Promise<void> | void;
  onNavigateChat?: (jid: string) => void;
  onGenerateCode?: () => string;
  initialWarehouseSheetOpen?: boolean;
  initialAddressModalOpen?: boolean;
  initialErrors?: Record<string, string>;
  showHeaderTitle?: boolean;
}

const WHATSAPP_GREEN = '#25D366';

export function EditVendorView({
  initialVendor,
  isNew = false,
  warehouses = [],
  warehousesLoading = false,
  addresses = [],
  addressesLoading = false,
  linkedChats = [],
  chatsLoading = false,
  loading = false,
  saving = false,
  onSave,
  onBack,
  onSaveAddress,
  onDeleteAddress,
  onNavigateChat,
  onGenerateCode,
  initialWarehouseSheetOpen = false,
  initialAddressModalOpen = false,
  initialErrors = {},
  showHeaderTitle = true,
}: EditVendorViewProps) {
  const { tokens } = useTheme();

  // Main Form State
  const [formData, setFormData] = useState<EditVendorFormData>({
    id: initialVendor?.id,
    vendorName: initialVendor?.vendorName || '',
    alias: initialVendor?.alias || '',
    vendorCode: initialVendor?.vendorCode || '',
    firstName: initialVendor?.firstName || '',
    lastName: initialVendor?.lastName || '',
    whatsappPrimary: initialVendor?.whatsappPrimary || '',
    whatsappSecondary: initialVendor?.whatsappSecondary || '',
    orderGroupLink: initialVendor?.orderGroupLink || '',
    email: initialVendor?.email || '',
    notes: initialVendor?.notes || '',
    isActive: initialVendor?.isActive !== undefined ? initialVendor.isActive : true,
    isFavorite: initialVendor?.isFavorite || false,
    defaultWarehouseId: initialVendor?.defaultWarehouseId || null,
    defaultWarehouseName: initialVendor?.defaultWarehouseName,
    defaultWarehouseCode: initialVendor?.defaultWarehouseCode,
    defaultWarehouseAlias: initialVendor?.defaultWarehouseAlias,
  });

  // Keep form data synchronized when initialVendor updates asynchronously (e.g. initial fetch)
  React.useEffect(() => {
    if (initialVendor) {
      setFormData((prev) => ({
        ...prev,
        ...initialVendor,
        vendorName: initialVendor.vendorName ?? prev.vendorName,
        alias: initialVendor.alias ?? prev.alias,
        vendorCode: initialVendor.vendorCode ?? prev.vendorCode,
        firstName: initialVendor.firstName ?? prev.firstName,
        lastName: initialVendor.lastName ?? prev.lastName,
        whatsappPrimary: initialVendor.whatsappPrimary ?? prev.whatsappPrimary,
        whatsappSecondary: initialVendor.whatsappSecondary ?? prev.whatsappSecondary,
        orderGroupLink: initialVendor.orderGroupLink ?? prev.orderGroupLink,
        email: initialVendor.email ?? prev.email,
        isActive: initialVendor.isActive !== undefined ? initialVendor.isActive : prev.isActive,
        isFavorite: initialVendor.isFavorite !== undefined ? initialVendor.isFavorite : prev.isFavorite,
        defaultWarehouseId: initialVendor.defaultWarehouseId !== undefined ? initialVendor.defaultWarehouseId : prev.defaultWarehouseId,
        defaultWarehouseName: initialVendor.defaultWarehouseName ?? prev.defaultWarehouseName,
        defaultWarehouseCode: initialVendor.defaultWarehouseCode ?? prev.defaultWarehouseCode,
        defaultWarehouseAlias: initialVendor.defaultWarehouseAlias ?? prev.defaultWarehouseAlias,
      }));
    }
  }, [initialVendor]);

  const [errors, setErrors] = useState<Record<string, string>>(initialErrors);

  // Warehouse Picker Sheet State
  const [warehouseSheetOpen, setWarehouseSheetOpen] = useState(initialWarehouseSheetOpen);
  const [warehouseSearch, setWarehouseSearch] = useState('');

  // Address Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(initialAddressModalOpen);
  const [addressForm, setAddressForm] = useState<VendorAddressItem>({
    name: '',
    phone: '',
    line1: '',
    pincode: '',
    isDefault: false,
  });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [savingAddress, setSavingAddress] = useState(false);

  // Field change helper
  const updateField = (field: keyof EditVendorFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Generate random vendor code
  const handleGenerateCode = () => {
    if (onGenerateCode) {
      const code = onGenerateCode();
      updateField('vendorCode', code);
    } else {
      const code = `V${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      updateField('vendorCode', code);
    }
  };

  // Form Validation & Save
  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.vendorName.trim()) {
      newErrors.vendorName = 'Vendor Name is required';
    }
    if (formData.vendorCode && (formData.vendorCode.length < 3 || formData.vendorCode.length > 8)) {
      newErrors.vendorCode = 'Vendor Code must be between 3 and 8 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave?.(formData);
  };

  // Address Actions
  const handleOpenAddAddress = () => {
    setAddressForm({
      name: '',
      phone: '',
      line1: '',
      pincode: '',
      isDefault: addresses.length === 0,
    });
    setAddressErrors({});
    setAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: VendorAddressItem) => {
    setAddressForm({ ...addr });
    setAddressErrors({});
    setAddressModalOpen(true);
  };

  const handleSaveAddress = async () => {
    const errs: Record<string, string> = {};
    if (!addressForm.name.trim()) errs.name = 'Contact Name is required';
    if (!addressForm.phone.trim()) errs.phone = 'Phone Number is required';
    if (!addressForm.line1.trim()) errs.line1 = 'Address line is required';
    if (!addressForm.pincode.trim()) errs.pincode = 'Pincode is required';

    if (Object.keys(errs).length > 0) {
      setAddressErrors(errs);
      return;
    }

    setSavingAddress(true);
    try {
      if (onSaveAddress) {
        await onSaveAddress(
          {
            name: addressForm.name.trim(),
            phone: addressForm.phone.trim(),
            line1: addressForm.line1.trim(),
            line2: addressForm.line2?.trim(),
            pincode: addressForm.pincode.trim(),
            city: addressForm.city?.trim(),
            state: addressForm.state?.trim(),
            isDefault: !!addressForm.isDefault,
          },
          addressForm.id
        );
      }
      setAddressModalOpen(false);
    } finally {
      setSavingAddress(false);
    }
  };

  // Filtered warehouses in picker
  const filteredWarehouses = useMemo(() => {
    if (!warehouseSearch.trim()) return warehouses;
    const q = warehouseSearch.toLowerCase().trim();
    return warehouses.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        (w.alias && w.alias.toLowerCase().includes(q)) ||
        (w.city && w.city.toLowerCase().includes(q)) ||
        (w.state && w.state.toLowerCase().includes(q)) ||
        (w.pincode && w.pincode.includes(q))
    );
  }, [warehouses, warehouseSearch]);

  // Selected warehouse object
  const selectedWarehouse = useMemo(() => {
    if (!formData.defaultWarehouseId) return null;
    return (
      warehouses.find((w) => w.id === formData.defaultWarehouseId) || {
        id: formData.defaultWarehouseId,
        name: formData.defaultWarehouseName || 'Assigned Warehouse',
        code: formData.defaultWarehouseCode || 'WH',
        alias: formData.defaultWarehouseAlias,
        isCentral: false,
      }
    );
  }, [formData.defaultWarehouseId, formData.defaultWarehouseName, formData.defaultWarehouseCode, formData.defaultWarehouseAlias, warehouses]);

  if (loading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor={tokens.background} gap={12} minHeight={400}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text fontSize={14} fontWeight="600" color={tokens.textMuted}>
          Loading vendor profile...
        </Text>
      </YStack>
    );
  }

  const vendorInitials = (formData.vendorName || 'V')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* ──────────────── Top Navigation & Header ──────────────── */}
      {showHeaderTitle && (
        <XStack
          paddingHorizontal={16}
          paddingVertical={12}
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth={1}
          borderBottomColor={tokens.border}
          backgroundColor={tokens.surface}
        >
          <XStack alignItems="center" gap={10} flex={1}>
            {onBack && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={onBack}
                hitSlop={8}
              >
                <XStack
                  width={36}
                  height={36}
                  borderRadius={tokens.radius.full}
                  backgroundColor={tokens.surfaceRaised}
                  alignItems="center"
                  justifyContent="center"
                >
                  <LuArrowLeft size={18} color={tokens.text} />
                </XStack>
              </Pressable>
            )}

            <YStack flex={1}>
              <Text fontSize={17} fontWeight="800" color={tokens.text} numberOfLines={1}>
                {isNew ? 'New Vendor' : formData.vendorName || 'Edit Vendor'}
              </Text>
              <Text fontSize={11} fontWeight="500" color={tokens.textMuted}>
                {isNew ? 'Partner Onboarding' : `Code: ${formData.vendorCode || 'N/A'}`}
              </Text>
            </YStack>
          </XStack>

          {/* Favorite & Quick Save Button */}
          <XStack alignItems="center" gap={8}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={formData.isFavorite ? 'Unmark favorite' : 'Mark as favorite'}
              onPress={() => updateField('isFavorite', !formData.isFavorite)}
              hitSlop={8}
            >
              <XStack
                width={36}
                height={36}
                borderRadius={tokens.radius.full}
                backgroundColor={formData.isFavorite ? '#FEF3C7' : tokens.surfaceRaised}
                alignItems="center"
                justifyContent="center"
              >
                <LuStar
                  size={17}
                  color={formData.isFavorite ? '#F59E0B' : tokens.textMuted}
                />
              </XStack>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save Vendor Changes"
              onPress={handleSave}
              disabled={saving}
            >
              <XStack
                height={36}
                paddingHorizontal={14}
                borderRadius={tokens.radius.md}
                backgroundColor={tokens.accent}
                alignItems="center"
                justifyContent="center"
                gap={6}
                opacity={saving ? 0.7 : 1}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <LuSave size={15} color="#FFFFFF" />
                    <Text fontSize={13} fontWeight="700" color="#FFFFFF">
                      Save
                    </Text>
                  </>
                )}
              </XStack>
            </Pressable>
          </XStack>
        </XStack>
      )}

      {/* ──────────────── Main Scrollable Content ──────────────── */}
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 64,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Overview Card ─── */}
        <YStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.lg}
          borderWidth={1}
          borderColor={tokens.border}
          padding={16}
          gap={12}
        >
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap={12} flex={1}>
              <XStack
                width={52}
                height={52}
                borderRadius={26}
                backgroundColor={tokens.accentSubtle || tokens.surfaceRaised}
                borderWidth={2}
                borderColor={tokens.accent}
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={18} fontWeight="800" color={tokens.accent}>
                  {vendorInitials}
                </Text>
              </XStack>

              <YStack flex={1}>
                <XStack alignItems="center" gap={6} flexWrap="wrap">
                  <Text fontSize={16} fontWeight="800" color={tokens.text} numberOfLines={1}>
                    {formData.vendorName || (isNew ? 'New Vendor Account' : 'Unnamed Vendor')}
                  </Text>
                  {formData.isFavorite && (
                    <XStack
                      backgroundColor="#FEF3C7"
                      paddingHorizontal={6}
                      paddingVertical={2}
                      borderRadius={tokens.radius.xs}
                      alignItems="center"
                      gap={3}
                    >
                      <LuStar size={11} color="#B45309" />
                      <Text fontSize={10} fontWeight="800" color="#B45309">
                        STARRED
                      </Text>
                    </XStack>
                  )}
                </XStack>

                <XStack alignItems="center" gap={8} marginTop={4}>
                  {formData.alias ? (
                    <XStack
                      backgroundColor="#E0F2FE"
                      paddingHorizontal={6}
                      paddingVertical={2}
                      borderRadius={tokens.radius.xs}
                    >
                      <Text fontSize={11} fontWeight="700" color="#0369A1">
                        🏷️ {formData.alias}
                      </Text>
                    </XStack>
                  ) : null}

                  {formData.vendorCode ? (
                    <XStack
                      backgroundColor={tokens.surfaceRaised}
                      paddingHorizontal={6}
                      paddingVertical={2}
                      borderRadius={tokens.radius.xs}
                      borderWidth={1}
                      borderColor={tokens.border}
                    >
                      <Text fontSize={11} fontWeight="700" color={tokens.textMuted} fontFamily="monospace">
                        #{formData.vendorCode}
                      </Text>
                    </XStack>
                  ) : null}
                </XStack>
              </YStack>
            </XStack>

            {/* Active Status Pill & Switch */}
            <YStack alignItems="flex-end" gap={4}>
              <XStack
                backgroundColor={formData.isActive ? '#DCFCE7' : '#FEE2E2'}
                paddingHorizontal={8}
                paddingVertical={3}
                borderRadius={tokens.radius.xs}
              >
                <Text
                  fontSize={10}
                  fontWeight="800"
                  color={formData.isActive ? '#15803D' : '#B91C1C'}
                >
                  {formData.isActive ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </XStack>
              <Switch
                value={formData.isActive}
                onValueChange={(val) => updateField('isActive', val)}
                thumbColor={formData.isActive ? tokens.accent : '#94A3B8'}
                trackColor={{ false: '#E2E8F0', true: tokens.accentSubtle || '#BAE6FD' }}
              />
            </YStack>
          </XStack>
        </YStack>

        {/* ─── Section 1: Store & Identity ─── */}
        <YStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.lg}
          borderWidth={1}
          borderColor={tokens.border}
          padding={16}
          gap={12}
        >
          <XStack alignItems="center" gap={8} borderBottomWidth={1} borderBottomColor={tokens.border} paddingBottom={10}>
            <LuStore size={18} color={tokens.accent} />
            <Text fontSize={14} fontWeight="800" color={tokens.text}>
              Store & Identity
            </Text>
          </XStack>

          {/* Vendor Name Field */}
          <YStack gap={4}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Vendor Name <Text color="#EF4444">*</Text>
              </Text>
              {errors.vendorName && (
                <XStack alignItems="center" gap={4}>
                  <LuCircleAlert size={12} color="#EF4444" />
                  <Text fontSize={11} fontWeight="600" color="#EF4444">
                    {errors.vendorName}
                  </Text>
                </XStack>
              )}
            </XStack>
            <XStack
              height={44}
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={errors.vendorName ? '#EF4444' : tokens.border}
              alignItems="center"
              paddingHorizontal={12}
              gap={8}
            >
              <LuStore size={16} color={tokens.textMuted} />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '600',
                  color: tokens.text,
                  height: '100%',
                }}
                placeholder="e.g. Surat Sarees Hub"
                placeholderTextColor={tokens.textMuted}
                value={formData.vendorName}
                onChangeText={(t) => updateField('vendorName', t)}
              />
            </XStack>
          </YStack>

          {/* Alias / Casual Name */}
          <YStack gap={4}>
            <Text fontSize={12} fontWeight="700" color={tokens.text}>
              Alias (Casual Daily Name)
            </Text>
            <XStack
              height={44}
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.border}
              alignItems="center"
              paddingHorizontal={12}
              gap={8}
            >
              <LuTag size={16} color={tokens.textMuted} />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '500',
                  color: tokens.text,
                  height: '100%',
                }}
                placeholder="e.g. Sree Sarees (used in daily chat)"
                placeholderTextColor={tokens.textMuted}
                value={formData.alias}
                onChangeText={(t) => updateField('alias', t)}
              />
            </XStack>
          </YStack>

          {/* Vendor Code Field */}
          <YStack gap={4}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Vendor Code (3 to 8 uppercase chars)
              </Text>
              {errors.vendorCode && (
                <Text fontSize={11} fontWeight="600" color="#EF4444">
                  {errors.vendorCode}
                </Text>
              )}
            </XStack>
            <XStack
              height={44}
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={errors.vendorCode ? '#EF4444' : tokens.border}
              alignItems="center"
              paddingHorizontal={12}
              gap={8}
            >
              <LuBarcode size={16} color={tokens.textMuted} />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '700',
                  color: tokens.text,
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  height: '100%',
                }}
                placeholder="e.g. VSTH"
                placeholderTextColor={tokens.textMuted}
                value={formData.vendorCode}
                autoCapitalize="characters"
                maxLength={8}
                onChangeText={(t) => updateField('vendorCode', t.toUpperCase().trim())}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Generate random vendor code"
                onPress={handleGenerateCode}
                hitSlop={6}
              >
                <XStack
                  paddingHorizontal={8}
                  paddingVertical={4}
                  borderRadius={tokens.radius.xs}
                  backgroundColor={tokens.surface}
                  borderWidth={1}
                  borderColor={tokens.border}
                  alignItems="center"
                  gap={4}
                >
                  <LuSparkles size={12} color={tokens.accent} />
                  <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                    Generate
                  </Text>
                </XStack>
              </Pressable>
            </XStack>
          </YStack>
        </YStack>

        {/* ─── Section 2: Contact Person ─── */}
        <YStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.lg}
          borderWidth={1}
          borderColor={tokens.border}
          padding={16}
          gap={12}
        >
          <XStack alignItems="center" gap={8} borderBottomWidth={1} borderBottomColor={tokens.border} paddingBottom={10}>
            <LuUser size={18} color={tokens.accent} />
            <Text fontSize={14} fontWeight="800" color={tokens.text}>
              Contact Person
            </Text>
          </XStack>

          <XStack gap={10}>
            <YStack flex={1} gap={4}>
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                First Name
              </Text>
              <XStack
                height={44}
                backgroundColor={tokens.surfaceRaised}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                alignItems="center"
                paddingHorizontal={12}
              >
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: '500',
                    color: tokens.text,
                    height: '100%',
                  }}
                  placeholder="e.g. Ramesh"
                  placeholderTextColor={tokens.textMuted}
                  value={formData.firstName}
                  onChangeText={(t) => updateField('firstName', t)}
                />
              </XStack>
            </YStack>

            <YStack flex={1} gap={4}>
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Last Name
              </Text>
              <XStack
                height={44}
                backgroundColor={tokens.surfaceRaised}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                alignItems="center"
                paddingHorizontal={12}
              >
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: '500',
                    color: tokens.text,
                    height: '100%',
                  }}
                  placeholder="e.g. Kumar"
                  placeholderTextColor={tokens.textMuted}
                  value={formData.lastName}
                  onChangeText={(t) => updateField('lastName', t)}
                />
              </XStack>
            </YStack>
          </XStack>
        </YStack>

        {/* ─── Section 3: Communications ─── */}
        <YStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.lg}
          borderWidth={1}
          borderColor={tokens.border}
          padding={16}
          gap={12}
        >
          <XStack alignItems="center" gap={8} borderBottomWidth={1} borderBottomColor={tokens.border} paddingBottom={10}>
            <RiWhatsappFill size={19} color={WHATSAPP_GREEN} />
            <Text fontSize={14} fontWeight="800" color={tokens.text}>
              Communication Channels
            </Text>
          </XStack>

          {/* Primary WhatsApp */}
          <YStack gap={4}>
            <Text fontSize={12} fontWeight="700" color={tokens.text}>
              Primary WhatsApp Phone
            </Text>
            <XStack
              height={44}
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.border}
              alignItems="center"
              paddingHorizontal={12}
              gap={8}
            >
              <RiWhatsappFill size={17} color={WHATSAPP_GREEN} />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '600',
                  color: tokens.text,
                  height: '100%',
                }}
                placeholder="+91 98765 43210"
                placeholderTextColor={tokens.textMuted}
                keyboardType="phone-pad"
                value={formData.whatsappPrimary}
                onChangeText={(t) => updateField('whatsappPrimary', t)}
              />
              {formData.whatsappPrimary ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Launch WhatsApp chat"
                  onPress={() => {
                    const cleanPhone = formData.whatsappPrimary?.replace(/[^0-9]/g, '');
                    if (cleanPhone) Linking.openURL(`https://wa.me/${cleanPhone}`);
                  }}
                  hitSlop={6}
                >
                  <XStack
                    paddingHorizontal={8}
                    paddingVertical={3}
                    borderRadius={tokens.radius.xs}
                    backgroundColor="#DCFCE7"
                    alignItems="center"
                    gap={4}
                  >
                    <LuExternalLink size={11} color="#15803D" />
                    <Text fontSize={10} fontWeight="800" color="#15803D">
                      Chat
                    </Text>
                  </XStack>
                </Pressable>
              ) : null}
            </XStack>
          </YStack>

          {/* Secondary WhatsApp */}
          <YStack gap={4}>
            <Text fontSize={12} fontWeight="700" color={tokens.text}>
              Secondary WhatsApp (Optional)
            </Text>
            <XStack
              height={44}
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.border}
              alignItems="center"
              paddingHorizontal={12}
              gap={8}
            >
              <LuPhone size={16} color={tokens.textMuted} />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '500',
                  color: tokens.text,
                  height: '100%',
                }}
                placeholder="Alternate contact phone"
                placeholderTextColor={tokens.textMuted}
                keyboardType="phone-pad"
                value={formData.whatsappSecondary}
                onChangeText={(t) => updateField('whatsappSecondary', t)}
              />
            </XStack>
          </YStack>

          {/* Order Group Link */}
          <YStack gap={4}>
            <Text fontSize={12} fontWeight="700" color={tokens.text}>
              Order Group Link
            </Text>
            <XStack
              height={44}
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.border}
              alignItems="center"
              paddingHorizontal={12}
              gap={8}
            >
              <LuLink size={16} color={tokens.textMuted} />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '500',
                  color: tokens.text,
                  height: '100%',
                }}
                placeholder="https://chat.whatsapp.com/..."
                placeholderTextColor={tokens.textMuted}
                autoCapitalize="none"
                value={formData.orderGroupLink}
                onChangeText={(t) => updateField('orderGroupLink', t)}
              />
            </XStack>
          </YStack>

          {/* Email Address */}
          <YStack gap={4}>
            <Text fontSize={12} fontWeight="700" color={tokens.text}>
              Email Address
            </Text>
            <XStack
              height={44}
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.border}
              alignItems="center"
              paddingHorizontal={12}
              gap={8}
            >
              <LuMail size={16} color={tokens.textMuted} />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '500',
                  color: tokens.text,
                  height: '100%',
                }}
                placeholder="vendor@example.com"
                placeholderTextColor={tokens.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(t) => updateField('email', t)}
              />
            </XStack>
          </YStack>
        </YStack>

        {/* ─── Section 4: Logistics & Fulfillment (Delhivery) ─── */}
        <YStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.lg}
          borderWidth={1}
          borderColor={tokens.border}
          padding={16}
          gap={12}
        >
          <XStack alignItems="center" justifyContent="space-between" borderBottomWidth={1} borderBottomColor={tokens.border} paddingBottom={10}>
            <XStack alignItems="center" gap={8}>
              <LuTruck size={18} color={tokens.accent} />
              <Text fontSize={14} fontWeight="800" color={tokens.text}>
                Delhivery Fulfillment Facility
              </Text>
            </XStack>
            {warehousesLoading && <ActivityIndicator size="small" color={tokens.accent} />}
          </XStack>

          <Text fontSize={12} color={tokens.textMuted}>
            Orders dispatched for this vendor will pre-select this registered pickup warehouse.
          </Text>

          {selectedWarehouse ? (
            <YStack
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.accentSubtle || tokens.border}
              padding={12}
              gap={8}
            >
              <XStack alignItems="center" justifyContent="space-between">
                <XStack alignItems="center" gap={8} flex={1}>
                  <XStack
                    backgroundColor="#EFF6FF"
                    paddingHorizontal={6}
                    paddingVertical={3}
                    borderRadius={tokens.radius.xs}
                    borderWidth={1}
                    borderColor="#BFDBFE"
                  >
                    <Text fontSize={11} fontWeight="800" color="#1D4ED8" fontFamily="monospace">
                      {selectedWarehouse.code}
                    </Text>
                  </XStack>
                  <Text fontSize={14} fontWeight="700" color={tokens.text} numberOfLines={1} flex={1}>
                    {selectedWarehouse.name}
                  </Text>
                  {selectedWarehouse.alias && (
                    <XStack
                      backgroundColor="#F3E8FF"
                      paddingHorizontal={6}
                      paddingVertical={2}
                      borderRadius={tokens.radius.xs}
                      borderWidth={1}
                      borderColor="#E9D5FF"
                    >
                      <Text fontSize={10} fontWeight="700" color="#7E22CE">
                        🏷️ {selectedWarehouse.alias}
                      </Text>
                    </XStack>
                  )}
                </XStack>

                {selectedWarehouse.isCentral && (
                  <XStack
                    backgroundColor="#FEF3C7"
                    paddingHorizontal={6}
                    paddingVertical={2}
                    borderRadius={tokens.radius.xs}
                  >
                    <Text fontSize={9} fontWeight="800" color="#B45309">
                      CENTRAL HUB
                    </Text>
                  </XStack>
                )}
              </XStack>

              {(selectedWarehouse.city || selectedWarehouse.state || selectedWarehouse.pincode) && (
                <Text fontSize={12} color={tokens.textMuted}>
                  {[selectedWarehouse.city, selectedWarehouse.state].filter(Boolean).join(', ')}
                  {selectedWarehouse.pincode ? ` - ${selectedWarehouse.pincode}` : ''}
                </Text>
              )}

              <XStack alignItems="center" justifyContent="flex-end" gap={10} marginTop={4}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear default warehouse"
                  onPress={() => {
                    updateField('defaultWarehouseId', null);
                    updateField('defaultWarehouseName', undefined);
                    updateField('defaultWarehouseCode', undefined);
                    updateField('defaultWarehouseAlias', undefined);
                  }}
                  hitSlop={6}
                >
                  <Text fontSize={12} fontWeight="700" color="#EF4444">
                    Clear (Central Hub)
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change default warehouse"
                  onPress={() => setWarehouseSheetOpen(true)}
                  hitSlop={6}
                >
                  <XStack
                    paddingHorizontal={10}
                    paddingVertical={5}
                    borderRadius={tokens.radius.xs}
                    backgroundColor={tokens.surface}
                    borderWidth={1}
                    borderColor={tokens.border}
                    alignItems="center"
                    gap={4}
                  >
                    <LuBuilding2 size={12} color={tokens.text} />
                    <Text fontSize={12} fontWeight="700" color={tokens.text}>
                      Change
                    </Text>
                  </XStack>
                </Pressable>
              </XStack>
            </YStack>
          ) : (
            <XStack
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.border}
              padding={12}
              alignItems="center"
              justifyContent="space-between"
              gap={10}
            >
              <YStack flex={1}>
                <Text fontSize={13} fontWeight="600" color={tokens.text}>
                  Central Hub Default
                </Text>
                <Text fontSize={11} color={tokens.textMuted}>
                  No specific facility assigned. Dispatches route via Central Warehouse.
                </Text>
              </YStack>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select Delhivery warehouse"
                onPress={() => setWarehouseSheetOpen(true)}
              >
                <XStack
                  paddingHorizontal={12}
                  paddingVertical={7}
                  borderRadius={tokens.radius.md}
                  backgroundColor={tokens.accent}
                  alignItems="center"
                  gap={6}
                >
                  <LuBuilding2 size={14} color="#FFFFFF" />
                  <Text fontSize={12} fontWeight="700" color="#FFFFFF">
                    Select Facility
                  </Text>
                </XStack>
              </Pressable>
            </XStack>
          )}

          {/* Favorite Toggle Bar */}
          <XStack
            borderTopWidth={1}
            borderTopColor={tokens.border}
            paddingTop={12}
            alignItems="center"
            justifyContent="space-between"
          >
            <YStack flex={1} paddingRight={10}>
              <XStack alignItems="center" gap={6}>
                <LuStar size={16} color="#F59E0B" />
                <Text fontSize={13} fontWeight="700" color={tokens.text}>
                  Favorite Vendor
                </Text>
              </XStack>
              <Text fontSize={11} color={tokens.textMuted} marginTop={2}>
                Pins this vendor to the top of order forms and logistics selection menus.
              </Text>
            </YStack>
            <Switch
              value={!!formData.isFavorite}
              onValueChange={(val) => updateField('isFavorite', val)}
              thumbColor={formData.isFavorite ? '#F59E0B' : '#94A3B8'}
              trackColor={{ false: '#E2E8F0', true: '#FEF3C7' }}
            />
          </XStack>
        </YStack>

        {/* ─── Section 5: Saved Addresses ─── */}
        <YStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.lg}
          borderWidth={1}
          borderColor={tokens.border}
          padding={16}
          gap={12}
        >
          <XStack alignItems="center" justifyContent="space-between" borderBottomWidth={1} borderBottomColor={tokens.border} paddingBottom={10}>
            <XStack alignItems="center" gap={8}>
              <LuMapPin size={18} color={tokens.accent} />
              <Text fontSize={14} fontWeight="800" color={tokens.text}>
                Saved Addresses {addresses.length > 0 ? `(${addresses.length})` : ''}
              </Text>
            </XStack>

            {!isNew && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add new vendor address"
                onPress={handleOpenAddAddress}
                hitSlop={6}
              >
                <XStack
                  paddingHorizontal={10}
                  paddingVertical={5}
                  borderRadius={tokens.radius.xs}
                  backgroundColor={tokens.surfaceRaised}
                  borderWidth={1}
                  borderColor={tokens.border}
                  alignItems="center"
                  gap={4}
                >
                  <LuPlus size={13} color={tokens.text} />
                  <Text fontSize={12} fontWeight="700" color={tokens.text}>
                    Add
                  </Text>
                </XStack>
              </Pressable>
            )}
          </XStack>

          {isNew ? (
            <YStack
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              padding={14}
              alignItems="center"
            >
              <Text fontSize={12} color={tokens.textMuted} textAlign="center">
                Addresses can be added after saving the vendor profile.
              </Text>
            </YStack>
          ) : addressesLoading ? (
            <ActivityIndicator size="small" color={tokens.accent} />
          ) : addresses.length > 0 ? (
            <YStack gap={10}>
              {addresses.map((addr) => (
                <YStack
                  key={addr.id || `${addr.name}-${addr.phone}`}
                  backgroundColor={tokens.surfaceRaised}
                  borderRadius={tokens.radius.md}
                  borderWidth={1}
                  borderColor={addr.isDefault ? tokens.accent : tokens.border}
                  padding={12}
                  gap={6}
                >
                  <XStack alignItems="center" justifyContent="space-between">
                    <XStack alignItems="center" gap={8}>
                      <Text fontSize={13} fontWeight="800" color={tokens.text}>
                        {addr.name}
                      </Text>
                      {addr.isDefault && (
                        <XStack
                          backgroundColor="#DCFCE7"
                          paddingHorizontal={6}
                          paddingVertical={2}
                          borderRadius={tokens.radius.xs}
                        >
                          <Text fontSize={9} fontWeight="800" color="#15803D">
                            DEFAULT
                          </Text>
                        </XStack>
                      )}
                    </XStack>

                    <XStack alignItems="center" gap={8}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Edit Address"
                        onPress={() => handleOpenEditAddress(addr)}
                        hitSlop={6}
                      >
                        <LuPencil size={14} color={tokens.textMuted} />
                      </Pressable>

                      {onDeleteAddress && addr.id && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Delete Address"
                          onPress={() => onDeleteAddress(addr.id!)}
                          hitSlop={6}
                        >
                          <LuTrash2 size={14} color="#EF4444" />
                        </Pressable>
                      )}
                    </XStack>
                  </XStack>

                  <Text fontSize={12} fontWeight="600" color={tokens.text}>
                    {addr.phone}
                  </Text>
                  <Text fontSize={12} color={tokens.textMuted}>
                    {addr.line1}
                  </Text>
                  <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                    PIN: {addr.pincode}
                  </Text>
                </YStack>
              ))}
            </YStack>
          ) : (
            <YStack
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              padding={16}
              alignItems="center"
              gap={6}
            >
              <Text fontSize={12} color={tokens.textMuted}>
                No saved addresses on file.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add first vendor address"
                onPress={handleOpenAddAddress}
              >
                <Text fontSize={12} fontWeight="700" color={tokens.accent}>
                  + Add First Address
                </Text>
              </Pressable>
            </YStack>
          )}
        </YStack>

        {/* ─── Section 6: Linked WhatsApp Chats ─── */}
        {!isNew && (
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.lg}
            borderWidth={1}
            borderColor={tokens.border}
            padding={16}
            gap={12}
          >
            <XStack alignItems="center" justifyContent="space-between" borderBottomWidth={1} borderBottomColor={tokens.border} paddingBottom={10}>
              <XStack alignItems="center" gap={8}>
                <RiWhatsappFill size={18} color={WHATSAPP_GREEN} />
                <Text fontSize={14} fontWeight="800" color={tokens.text}>
                  Linked WhatsApp Chats {linkedChats.length > 0 ? `(${linkedChats.length})` : ''}
                </Text>
              </XStack>
              {chatsLoading && <ActivityIndicator size="small" color={tokens.accent} />}
            </XStack>

            {linkedChats.length > 0 ? (
              <YStack gap={8}>
                {linkedChats.map((chat) => (
                  <Pressable
                    key={chat.jid}
                    accessibilityRole="button"
                    accessibilityLabel={`Open chat for ${chat.name || chat.jid}`}
                    onPress={() => onNavigateChat?.(chat.jid)}
                  >
                    <XStack
                      backgroundColor={tokens.surfaceRaised}
                      borderRadius={tokens.radius.md}
                      borderWidth={1}
                      borderColor={tokens.border}
                      padding={12}
                      alignItems="center"
                      justifyContent="space-between"
                      gap={10}
                    >
                      <XStack alignItems="center" gap={10} flex={1}>
                        <RiWhatsappFill size={20} color={WHATSAPP_GREEN} />
                        <YStack flex={1}>
                          <XStack alignItems="center" gap={6} flexWrap="wrap">
                            <Text fontSize={13} fontWeight="700" color={tokens.text} numberOfLines={1}>
                              {chat.name || chat.jid}
                            </Text>
                            {chat.isGroup && (
                              <XStack
                                backgroundColor="#E0F2FE"
                                paddingHorizontal={5}
                                paddingVertical={1}
                                borderRadius={tokens.radius.xs}
                              >
                                <Text fontSize={9} fontWeight="800" color="#0369A1">
                                  GROUP
                                </Text>
                              </XStack>
                            )}
                          </XStack>
                          {chat.assignedAt && (
                            <Text fontSize={11} color={tokens.textMuted} marginTop={2}>
                              Linked on {new Date(chat.assignedAt).toLocaleDateString()}
                            </Text>
                          )}
                        </YStack>
                      </XStack>

                      <XStack
                        paddingHorizontal={8}
                        paddingVertical={4}
                        borderRadius={tokens.radius.xs}
                        backgroundColor={tokens.surface}
                        borderWidth={1}
                        borderColor={tokens.border}
                        alignItems="center"
                        gap={4}
                      >
                        <Text fontSize={11} fontWeight="700" color={tokens.text}>
                          View
                        </Text>
                        <LuExternalLink size={11} color={tokens.textMuted} />
                      </XStack>
                    </XStack>
                  </Pressable>
                ))}
              </YStack>
            ) : (
              <YStack
                backgroundColor={tokens.surfaceRaised}
                borderRadius={tokens.radius.md}
                padding={14}
                alignItems="center"
              >
                <Text fontSize={12} color={tokens.textMuted}>
                  No active WhatsApp threads mapped to this vendor.
                </Text>
              </YStack>
            )}
          </YStack>
        )}
      </ScrollView>

      {/* ──────────────── Sticky Bottom Action Bar ──────────────── */}
      <XStack
        paddingHorizontal={16}
        paddingVertical={12}
        borderTopWidth={1}
        borderTopColor={tokens.border}
        backgroundColor={tokens.surface}
        alignItems="center"
        justifyContent="space-between"
        gap={12}
      >
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
            onPress={onBack}
            hitSlop={8}
          >
            <Text fontSize={13} fontWeight="600" color={tokens.textMuted}>
              Cancel
            </Text>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isNew ? 'Create Vendor' : 'Save Changes'}
          onPress={handleSave}
          disabled={saving}
          style={{ flex: 1, maxWidth: 300, marginLeft: 'auto' }}
        >
          <XStack
            height={44}
            borderRadius={tokens.radius.md}
            backgroundColor={tokens.accent}
            alignItems="center"
            justifyContent="center"
            gap={8}
            opacity={saving ? 0.7 : 1}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <LuSave size={16} color="#FFFFFF" />
                <Text fontSize={14} fontWeight="800" color="#FFFFFF">
                  {isNew ? 'Create Vendor' : 'Save Changes'}
                </Text>
              </>
            )}
          </XStack>
        </Pressable>
      </XStack>

      {/* ──────────────── Delhivery Warehouse Picker Sheet ──────────────── */}
      <BottomSheet
        visible={warehouseSheetOpen}
        onClose={() => setWarehouseSheetOpen(false)}
        title="Select Delhivery Facility"
      >
        <YStack gap={12} paddingVertical={8}>
          {/* Search Bar */}
          <XStack
            height={40}
            backgroundColor={tokens.surfaceRaised}
            borderRadius={tokens.radius.md}
            borderWidth={1}
            borderColor={tokens.border}
            alignItems="center"
            paddingHorizontal={10}
            gap={8}
          >
            <LuSearch size={15} color={tokens.textMuted} />
            <TextInput
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: '500',
                color: tokens.text,
                height: '100%',
              }}
              placeholder="Search by facility name, code, or city..."
              placeholderTextColor={tokens.textMuted}
              value={warehouseSearch}
              onChangeText={setWarehouseSearch}
            />
            {warehouseSearch ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setWarehouseSearch('')}
              >
                <LuX size={14} color={tokens.textMuted} />
              </Pressable>
            ) : null}
          </XStack>

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            <YStack gap={8}>
              {/* Option: Central Hub / None */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Default to Central Fulfillment Hub"
                onPress={() => {
                  updateField('defaultWarehouseId', null);
                  updateField('defaultWarehouseName', undefined);
                  updateField('defaultWarehouseCode', undefined);
                  setWarehouseSheetOpen(false);
                }}
              >
                <XStack
                  padding={12}
                  borderRadius={tokens.radius.md}
                  borderWidth={1}
                  borderColor={!formData.defaultWarehouseId ? tokens.accent : tokens.border}
                  backgroundColor={!formData.defaultWarehouseId ? tokens.accentSubtle || tokens.surfaceRaised : tokens.surface}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <YStack gap={2}>
                    <Text fontSize={13} fontWeight="800" color={tokens.text}>
                      None (Central Fulfillment Hub)
                    </Text>
                    <Text fontSize={11} color={tokens.textMuted}>
                      Uses Central Hub stock, pickup rules, and logistics configuration.
                    </Text>
                  </YStack>
                  {!formData.defaultWarehouseId && <LuCheck size={16} color={tokens.accent} />}
                </XStack>
              </Pressable>

              {/* Warehouse List */}
              {filteredWarehouses.map((wh) => {
                const isSelected = formData.defaultWarehouseId === wh.id;
                return (
                  <Pressable
                    key={wh.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${wh.name}`}
                    onPress={() => {
                      updateField('defaultWarehouseId', wh.id);
                      updateField('defaultWarehouseName', wh.name);
                      updateField('defaultWarehouseCode', wh.code);
                      updateField('defaultWarehouseAlias', wh.alias);
                      setWarehouseSheetOpen(false);
                    }}
                  >
                    <XStack
                      padding={12}
                      borderRadius={tokens.radius.md}
                      borderWidth={1}
                      borderColor={isSelected ? tokens.accent : tokens.border}
                      backgroundColor={isSelected ? tokens.accentSubtle || tokens.surfaceRaised : tokens.surface}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <YStack gap={3} flex={1}>
                        <XStack alignItems="center" gap={8}>
                          <XStack
                            backgroundColor="#EFF6FF"
                            paddingHorizontal={5}
                            paddingVertical={2}
                            borderRadius={tokens.radius.xs}
                            borderWidth={1}
                            borderColor="#BFDBFE"
                          >
                            <Text fontSize={10} fontWeight="800" color="#1D4ED8" fontFamily="monospace">
                              {wh.code}
                            </Text>
                          </XStack>
                          <Text fontSize={13} fontWeight="700" color={tokens.text} numberOfLines={1}>
                            {wh.name}
                          </Text>
                          {wh.alias && (
                            <XStack
                              backgroundColor="#F3E8FF"
                              paddingHorizontal={5}
                              paddingVertical={1}
                              borderRadius={tokens.radius.xs}
                              borderWidth={1}
                              borderColor="#E9D5FF"
                            >
                              <Text fontSize={9} fontWeight="700" color="#7E22CE">
                                🏷️ {wh.alias}
                              </Text>
                            </XStack>
                          )}
                          {wh.isCentral && (
                            <XStack
                              backgroundColor="#FEF3C7"
                              paddingHorizontal={5}
                              paddingVertical={1}
                              borderRadius={tokens.radius.xs}
                            >
                              <Text fontSize={9} fontWeight="800" color="#B45309">
                                CENTRAL
                              </Text>
                            </XStack>
                          )}
                        </XStack>

                        {(wh.city || wh.state || wh.pincode) && (
                          <Text fontSize={11} color={tokens.textMuted}>
                            {[wh.city, wh.state].filter(Boolean).join(', ')}{wh.pincode ? ` (${wh.pincode})` : ''}
                          </Text>
                        )}
                      </YStack>

                      {isSelected && <LuCheck size={16} color={tokens.accent} />}
                    </XStack>
                  </Pressable>
                );
              })}
            </YStack>
          </ScrollView>
        </YStack>
      </BottomSheet>

      {/* ──────────────── Address Management Modal / Sheet ──────────────── */}
      <BottomSheet
        visible={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        title={addressForm.id ? 'Edit Vendor Address' : 'New Vendor Address'}
      >
        <YStack gap={12} paddingVertical={8}>
          {/* Contact Name */}
          <YStack gap={4}>
            <Text fontSize={12} fontWeight="700" color={tokens.text}>
              Contact Name <Text color="#EF4444">*</Text>
            </Text>
            <XStack
              height={42}
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={addressErrors.name ? '#EF4444' : tokens.border}
              alignItems="center"
              paddingHorizontal={10}
            >
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: '500',
                  color: tokens.text,
                  height: '100%',
                }}
                placeholder="Full Contact Name"
                placeholderTextColor={tokens.textMuted}
                value={addressForm.name}
                onChangeText={(t) => {
                  setAddressForm((p) => ({ ...p, name: t }));
                  if (addressErrors.name) setAddressErrors((p) => ({ ...p, name: '' }));
                }}
              />
            </XStack>
          </YStack>

          {/* Phone */}
          <YStack gap={4}>
            <Text fontSize={12} fontWeight="700" color={tokens.text}>
              Contact Phone <Text color="#EF4444">*</Text>
            </Text>
            <XStack
              height={42}
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={addressErrors.phone ? '#EF4444' : tokens.border}
              alignItems="center"
              paddingHorizontal={10}
            >
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: '500',
                  color: tokens.text,
                  height: '100%',
                }}
                placeholder="+91 98765 43210"
                placeholderTextColor={tokens.textMuted}
                keyboardType="phone-pad"
                value={addressForm.phone}
                onChangeText={(t) => {
                  setAddressForm((p) => ({ ...p, phone: t }));
                  if (addressErrors.phone) setAddressErrors((p) => ({ ...p, phone: '' }));
                }}
              />
            </XStack>
          </YStack>

          {/* Full Address */}
          <YStack gap={4}>
            <Text fontSize={12} fontWeight="700" color={tokens.text}>
              Address Line (Shop / Building / Street) <Text color="#EF4444">*</Text>
            </Text>
            <XStack
              height={64}
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={addressErrors.line1 ? '#EF4444' : tokens.border}
              paddingHorizontal={10}
              paddingVertical={6}
            >
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: '500',
                  color: tokens.text,
                  textAlignVertical: 'top',
                }}
                multiline
                placeholder="Plot, Shop No, Street, Landmark..."
                placeholderTextColor={tokens.textMuted}
                value={addressForm.line1}
                onChangeText={(t) => {
                  setAddressForm((p) => ({ ...p, line1: t }));
                  if (addressErrors.line1) setAddressErrors((p) => ({ ...p, line1: '' }));
                }}
              />
            </XStack>
          </YStack>

          {/* Pincode */}
          <YStack gap={4}>
            <Text fontSize={12} fontWeight="700" color={tokens.text}>
              Pincode <Text color="#EF4444">*</Text>
            </Text>
            <XStack
              height={42}
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={addressErrors.pincode ? '#EF4444' : tokens.border}
              alignItems="center"
              paddingHorizontal={10}
            >
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: '600',
                  color: tokens.text,
                  height: '100%',
                }}
                placeholder="6-digit PIN code"
                placeholderTextColor={tokens.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                value={addressForm.pincode}
                onChangeText={(t) => {
                  setAddressForm((p) => ({ ...p, pincode: t }));
                  if (addressErrors.pincode) setAddressErrors((p) => ({ ...p, pincode: '' }));
                }}
              />
            </XStack>
          </YStack>

          {/* Set as Default Address */}
          <XStack
            alignItems="center"
            justifyContent="space-between"
            paddingVertical={6}
          >
            <Text fontSize={13} fontWeight="600" color={tokens.text}>
              Set as Default Address
            </Text>
            <Switch
              value={addressForm.isDefault}
              onValueChange={(val) => setAddressForm((p) => ({ ...p, isDefault: val }))}
              thumbColor={addressForm.isDefault ? tokens.accent : '#94A3B8'}
              trackColor={{ false: '#E2E8F0', true: tokens.accentSubtle || '#BAE6FD' }}
            />
          </XStack>

          {/* Submit Address Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save Vendor Address"
            onPress={handleSaveAddress}
            disabled={savingAddress}
          >
            <XStack
              height={44}
              borderRadius={tokens.radius.md}
              backgroundColor={tokens.accent}
              alignItems="center"
              justifyContent="center"
              gap={6}
              marginTop={6}
              opacity={savingAddress ? 0.7 : 1}
            >
              {savingAddress ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text fontSize={14} fontWeight="800" color="#FFFFFF">
                  {addressForm.id ? 'Update Address' : 'Save Address'}
                </Text>
              )}
            </XStack>
          </Pressable>
        </YStack>
      </BottomSheet>
    </YStack>
  );
}
