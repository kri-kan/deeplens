import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuBuilding2,
  LuTag,
  LuBarcode,
  LuMapPin,
  LuPhone,
  LuUser,
  LuStar,
  LuTrash2,
  LuArrowLeft,
  LuSave,
  LuTruck,
  LuSparkles,
  LuCheck,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';

// ─────────────────────────────────────────────
// Data Interfaces & Contracts
// ─────────────────────────────────────────────

export interface EditWarehouseFormData {
  id?: string;
  name: string;
  alias?: string;
  code: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  contactPerson?: string;
  isCentral: boolean;
  isStarred?: boolean;
  isActive: boolean;
  syncWithDelhivery: boolean;
}

export interface EditWarehouseViewProps {
  initialWarehouse?: Partial<EditWarehouseFormData>;
  isNew?: boolean;
  loading?: boolean;
  saving?: boolean;
  deleting?: boolean;
  onSave?: (data: EditWarehouseFormData) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  onToggleStar?: () => void | Promise<void>;
  onBack?: () => void;
  showHeaderTitle?: boolean;
  initialErrors?: Record<string, string>;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function EditWarehouseView({
  initialWarehouse,
  isNew = false,
  loading = false,
  saving = false,
  deleting = false,
  onSave,
  onDelete,
  onToggleStar,
  onBack,
  showHeaderTitle = true,
  initialErrors = {},
}: EditWarehouseViewProps) {
  const { tokens } = useTheme();

  const [formData, setFormData] = useState<EditWarehouseFormData>({
    id: initialWarehouse?.id,
    name: initialWarehouse?.name || '',
    alias: initialWarehouse?.alias || '',
    code: initialWarehouse?.code || '',
    addressLine1: initialWarehouse?.addressLine1 || '',
    addressLine2: initialWarehouse?.addressLine2 || '',
    city: initialWarehouse?.city || '',
    state: initialWarehouse?.state || '',
    pincode: initialWarehouse?.pincode || '',
    phone: initialWarehouse?.phone || '',
    contactPerson: initialWarehouse?.contactPerson || '',
    isCentral: initialWarehouse?.isCentral || false,
    isStarred: initialWarehouse?.isStarred || false,
    isActive: initialWarehouse?.isActive !== undefined ? initialWarehouse.isActive : true,
    syncWithDelhivery: initialWarehouse?.syncWithDelhivery !== undefined ? initialWarehouse.syncWithDelhivery : true,
  });

  // Sync if initialWarehouse changes asynchronously
  React.useEffect(() => {
    if (initialWarehouse) {
      setFormData((prev) => ({
        ...prev,
        ...initialWarehouse,
        name: initialWarehouse.name ?? prev.name,
        alias: initialWarehouse.alias ?? prev.alias,
        code: initialWarehouse.code ?? prev.code,
        addressLine1: initialWarehouse.addressLine1 ?? prev.addressLine1,
        addressLine2: initialWarehouse.addressLine2 ?? prev.addressLine2,
        city: initialWarehouse.city ?? prev.city,
        state: initialWarehouse.state ?? prev.state,
        pincode: initialWarehouse.pincode ?? prev.pincode,
        phone: initialWarehouse.phone ?? prev.phone,
        contactPerson: initialWarehouse.contactPerson ?? prev.contactPerson,
        isCentral: initialWarehouse.isCentral !== undefined ? initialWarehouse.isCentral : prev.isCentral,
        isStarred: initialWarehouse.isStarred !== undefined ? initialWarehouse.isStarred : prev.isStarred,
        isActive: initialWarehouse.isActive !== undefined ? initialWarehouse.isActive : prev.isActive,
        syncWithDelhivery: initialWarehouse.syncWithDelhivery !== undefined ? initialWarehouse.syncWithDelhivery : prev.syncWithDelhivery,
      }));
    }
  }, [initialWarehouse]);

  const [errors, setErrors] = useState<Record<string, string>>(initialErrors);

  const updateField = (field: keyof EditWarehouseFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Auto-generate code from name
  const handleSuggestCode = () => {
    if (!formData.name.trim()) return;
    const clean = formData.name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((w) => w.substring(0, 4))
      .slice(0, 3)
      .join('-');
    if (clean) {
      updateField('code', clean);
    }
  };

  // Form Validation & Save
  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Facility name is required';
    }
    if (!formData.code.trim()) {
      newErrors.code = 'Facility code is required';
    }
    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address line 1 is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }
    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave?.(formData);
  };

  // Delete Confirmation
  const handleDelete = () => {
    if (!formData.id) return;
    Alert.alert(
      'Delete Warehouse Facility',
      `Are you sure you want to delete "${formData.name}"? Vendors assigned to this warehouse may default to the Central Hub.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(formData.id!),
        },
      ]
    );
  };

  const warehouseInitials = useMemo(() => {
    const title = formData.name.trim();
    if (!title) return isNew ? 'NW' : 'WH';
    return title
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [formData.name, isNew]);

  if (loading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor={tokens.background} gap={12} minHeight={400}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text fontSize={14} fontWeight="600" color={tokens.textMuted}>
          Loading warehouse facility...
        </Text>
      </YStack>
    );
  }

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
                {isNew ? 'New Facility' : formData.name || 'Edit Warehouse'}
              </Text>
              <Text fontSize={11} fontWeight="500" color={tokens.textMuted} numberOfLines={1}>
                {isNew ? 'Register Pickup Location' : formData.alias ? `🏷️ ${formData.alias} • ${formData.code || 'NO-CODE'}` : `Code: ${formData.code || 'N/A'}`}
              </Text>
            </YStack>
          </XStack>

          {/* Star & Save Action */}
          <XStack alignItems="center" gap={8}>
            {!isNew && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={formData.isStarred ? 'Unstar warehouse' : 'Star warehouse'}
                onPress={() => {
                  updateField('isStarred', !formData.isStarred);
                  onToggleStar?.();
                }}
                hitSlop={8}
              >
                <XStack
                  width={36}
                  height={36}
                  borderRadius={tokens.radius.full}
                  backgroundColor={formData.isStarred ? '#FEF3C7' : tokens.surfaceRaised}
                  alignItems="center"
                  justifyContent="center"
                >
                  <LuStar
                    size={17}
                    color={formData.isStarred ? '#F59E0B' : tokens.textMuted}
                  />
                </XStack>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save Warehouse"
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
                borderRadius={tokens.radius.md}
                backgroundColor={tokens.accentSubtle || tokens.surfaceRaised}
                borderWidth={2}
                borderColor={tokens.accent}
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={18} fontWeight="800" color={tokens.accent}>
                  {warehouseInitials}
                </Text>
              </XStack>

              <YStack flex={1}>
                <XStack alignItems="center" gap={6} flexWrap="wrap">
                  <Text fontSize={16} fontWeight="800" color={tokens.text} numberOfLines={1}>
                    {formData.name || (isNew ? 'New Warehouse Facility' : 'Unnamed Warehouse')}
                  </Text>
                  {formData.isStarred && (
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

                <XStack alignItems="center" gap={8} marginTop={4} flexWrap="wrap">
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

                  {formData.code ? (
                    <XStack
                      backgroundColor={tokens.surfaceRaised}
                      paddingHorizontal={6}
                      paddingVertical={2}
                      borderRadius={tokens.radius.xs}
                      borderWidth={1}
                      borderColor={tokens.border}
                    >
                      <Text fontSize={11} fontWeight="700" color={tokens.textMuted} fontFamily="monospace">
                        #{formData.code}
                      </Text>
                    </XStack>
                  ) : null}

                  {formData.isCentral && (
                    <XStack
                      backgroundColor="#FEF3C7"
                      paddingHorizontal={6}
                      paddingVertical={2}
                      borderRadius={tokens.radius.xs}
                      borderWidth={1}
                      borderColor="#FDE68A"
                    >
                      <Text fontSize={10} fontWeight="800" color="#B45309">
                        CENTRAL HUB
                      </Text>
                    </XStack>
                  )}
                </XStack>
              </YStack>
            </XStack>

            {/* Active Status Pill */}
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
                trackColor={{ false: '#E2E8F0', true: tokens.accent }}
              />
            </YStack>
          </XStack>
        </YStack>

        {/* ─── Section 1: Identification & Core Details ─── */}
        <YStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.lg}
          borderWidth={1}
          borderColor={tokens.border}
          padding={16}
          gap={14}
        >
          <XStack alignItems="center" gap={8}>
            <LuBuilding2 size={16} color={tokens.accent} />
            <Text fontSize={14} fontWeight="800" color={tokens.text}>
              Facility Identification
            </Text>
          </XStack>

          {/* Facility Name */}
          <YStack gap={6}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Facility Name <Text color="#EF4444">*</Text>
              </Text>
              {errors.name && (
                <Text fontSize={11} color="#EF4444" fontWeight="600">
                  {errors.name}
                </Text>
              )}
            </XStack>
            <TextInput
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              placeholder="e.g., Hyd apartment, Surat MF"
              placeholderTextColor={tokens.textMuted}
              style={{
                backgroundColor: tokens.surfaceRaised,
                borderRadius: tokens.radius.md,
                borderWidth: 1,
                borderColor: errors.name ? '#EF4444' : tokens.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: tokens.text,
              }}
            />
          </YStack>

          {/* Casual Alias */}
          <YStack gap={6}>
            <XStack alignItems="center" gap={6}>
              <LuTag size={13} color="#0369A1" />
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Casual Alias (Nickname)
              </Text>
            </XStack>
            <TextInput
              value={formData.alias}
              onChangeText={(text) => updateField('alias', text)}
              placeholder="e.g., Bachupally Flat, Surat Godown"
              placeholderTextColor={tokens.textMuted}
              style={{
                backgroundColor: tokens.surfaceRaised,
                borderRadius: tokens.radius.md,
                borderWidth: 1,
                borderColor: tokens.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: tokens.text,
              }}
            />
            <Text fontSize={11} color={tokens.textMuted}>
              Casual nickname you use daily. Used for quick searches, picker badges, and order dispatches.
            </Text>
          </YStack>

          {/* Facility Code */}
          <YStack gap={6}>
            <XStack alignItems="center" justifyContent="space-between">
              <XStack alignItems="center" gap={6}>
                <LuBarcode size={13} color={tokens.textMuted} />
                <Text fontSize={12} fontWeight="700" color={tokens.text}>
                  Facility Code / Client ID <Text color="#EF4444">*</Text>
                </Text>
              </XStack>
              {errors.code ? (
                <Text fontSize={11} color="#EF4444" fontWeight="600">
                  {errors.code}
                </Text>
              ) : isNew ? (
                <Pressable onPress={handleSuggestCode} hitSlop={6}>
                  <XStack alignItems="center" gap={3}>
                    <LuSparkles size={11} color={tokens.accent} />
                    <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                      Suggest
                    </Text>
                  </XStack>
                </Pressable>
              ) : null}
            </XStack>
            <TextInput
              value={formData.code}
              onChangeText={(text) => updateField('code', text.toUpperCase())}
              placeholder="e.g., HYD-APT, GOWTAM-SURAT"
              placeholderTextColor={tokens.textMuted}
              autoCapitalize="characters"
              style={{
                backgroundColor: tokens.surfaceRaised,
                borderRadius: tokens.radius.md,
                borderWidth: 1,
                borderColor: errors.code ? '#EF4444' : tokens.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                fontFamily: 'monospace',
                color: tokens.text,
              }}
            />
          </YStack>

          {/* Central Hub Card Switch */}
          <XStack
            backgroundColor={formData.isCentral ? '#FEF3C7' : tokens.surfaceRaised}
            borderRadius={tokens.radius.md}
            borderWidth={1}
            borderColor={formData.isCentral ? '#FDE68A' : tokens.border}
            padding={12}
            alignItems="center"
            justifyContent="space-between"
            gap={10}
          >
            <YStack flex={1} gap={2}>
              <XStack alignItems="center" gap={6}>
                <LuStar size={14} color="#D97706" />
                <Text fontSize={13} fontWeight="800" color={formData.isCentral ? '#92400E' : tokens.text}>
                  Primary Central Hub
                </Text>
              </XStack>
              <Text fontSize={11} color={formData.isCentral ? '#B45309' : tokens.textMuted}>
                When active, shipments for vendors without an assigned warehouse automatically dispatch from this facility.
              </Text>
            </YStack>

            <Switch
              value={formData.isCentral}
              onValueChange={(val) => updateField('isCentral', val)}
              trackColor={{ false: '#E2E8F0', true: '#F59E0B' }}
            />
          </XStack>
        </YStack>

        {/* ─── Section 2: Address & Geography ─── */}
        <YStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.lg}
          borderWidth={1}
          borderColor={tokens.border}
          padding={16}
          gap={14}
        >
          <XStack alignItems="center" gap={8}>
            <LuMapPin size={16} color={tokens.accent} />
            <Text fontSize={14} fontWeight="800" color={tokens.text}>
              Address & Pickup Location
            </Text>
          </XStack>

          {/* Address Line 1 */}
          <YStack gap={6}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Address Line 1 <Text color="#EF4444">*</Text>
              </Text>
              {errors.addressLine1 && (
                <Text fontSize={11} color="#EF4444" fontWeight="600">
                  {errors.addressLine1}
                </Text>
              )}
            </XStack>
            <TextInput
              value={formData.addressLine1}
              onChangeText={(text) => updateField('addressLine1', text)}
              placeholder="Flat/Shop/Building number, Street, Locality"
              placeholderTextColor={tokens.textMuted}
              multiline
              numberOfLines={2}
              style={{
                backgroundColor: tokens.surfaceRaised,
                borderRadius: tokens.radius.md,
                borderWidth: 1,
                borderColor: errors.addressLine1 ? '#EF4444' : tokens.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: tokens.text,
                minHeight: 56,
              }}
            />
          </YStack>

          {/* Address Line 2 */}
          <YStack gap={6}>
            <Text fontSize={12} fontWeight="700" color={tokens.text}>
              Address Line 2 (Optional)
            </Text>
            <TextInput
              value={formData.addressLine2}
              onChangeText={(text) => updateField('addressLine2', text)}
              placeholder="Landmark, Suite, Area name"
              placeholderTextColor={tokens.textMuted}
              style={{
                backgroundColor: tokens.surfaceRaised,
                borderRadius: tokens.radius.md,
                borderWidth: 1,
                borderColor: tokens.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: tokens.text,
              }}
            />
          </YStack>

          {/* City & State Row */}
          <XStack gap={12}>
            <YStack flex={1} gap={6}>
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={12} fontWeight="700" color={tokens.text}>
                  City <Text color="#EF4444">*</Text>
                </Text>
                {errors.city && (
                  <Text fontSize={10} color="#EF4444" fontWeight="600">
                    {errors.city}
                  </Text>
                )}
              </XStack>
              <TextInput
                value={formData.city}
                onChangeText={(text) => updateField('city', text)}
                placeholder="e.g., Hyderabad"
                placeholderTextColor={tokens.textMuted}
                style={{
                  backgroundColor: tokens.surfaceRaised,
                  borderRadius: tokens.radius.md,
                  borderWidth: 1,
                  borderColor: errors.city ? '#EF4444' : tokens.border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: tokens.text,
                }}
              />
            </YStack>

            <YStack flex={1} gap={6}>
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={12} fontWeight="700" color={tokens.text}>
                  State <Text color="#EF4444">*</Text>
                </Text>
                {errors.state && (
                  <Text fontSize={10} color="#EF4444" fontWeight="600">
                    {errors.state}
                  </Text>
                )}
              </XStack>
              <TextInput
                value={formData.state}
                onChangeText={(text) => updateField('state', text)}
                placeholder="e.g., Telangana"
                placeholderTextColor={tokens.textMuted}
                style={{
                  backgroundColor: tokens.surfaceRaised,
                  borderRadius: tokens.radius.md,
                  borderWidth: 1,
                  borderColor: errors.state ? '#EF4444' : tokens.border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: tokens.text,
                }}
              />
            </YStack>
          </XStack>

          {/* Pincode */}
          <YStack gap={6}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Pincode <Text color="#EF4444">*</Text>
              </Text>
              {errors.pincode && (
                <Text fontSize={11} color="#EF4444" fontWeight="600">
                  {errors.pincode}
                </Text>
              )}
            </XStack>
            <TextInput
              value={formData.pincode}
              onChangeText={(text) => updateField('pincode', text.trim())}
              placeholder="e.g., 502325"
              placeholderTextColor={tokens.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              style={{
                backgroundColor: tokens.surfaceRaised,
                borderRadius: tokens.radius.md,
                borderWidth: 1,
                borderColor: errors.pincode ? '#EF4444' : tokens.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                fontFamily: 'monospace',
                color: tokens.text,
              }}
            />
          </YStack>
        </YStack>

        {/* ─── Section 3: Operations & Contact Person ─── */}
        <YStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.lg}
          borderWidth={1}
          borderColor={tokens.border}
          padding={16}
          gap={14}
        >
          <XStack alignItems="center" gap={8}>
            <LuPhone size={16} color={tokens.accent} />
            <Text fontSize={14} fontWeight="800" color={tokens.text}>
              Operations & Contact
            </Text>
          </XStack>

          {/* Contact Person */}
          <YStack gap={6}>
            <XStack alignItems="center" gap={6}>
              <LuUser size={13} color={tokens.textMuted} />
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Contact Person Name
              </Text>
            </XStack>
            <TextInput
              value={formData.contactPerson}
              onChangeText={(text) => updateField('contactPerson', text)}
              placeholder="e.g., Sowjanya, Gowtam"
              placeholderTextColor={tokens.textMuted}
              style={{
                backgroundColor: tokens.surfaceRaised,
                borderRadius: tokens.radius.md,
                borderWidth: 1,
                borderColor: tokens.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: tokens.text,
              }}
            />
          </YStack>

          {/* Phone */}
          <YStack gap={6}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Pickup Phone Number <Text color="#EF4444">*</Text>
              </Text>
              {errors.phone && (
                <Text fontSize={11} color="#EF4444" fontWeight="600">
                  {errors.phone}
                </Text>
              )}
            </XStack>
            <TextInput
              value={formData.phone}
              onChangeText={(text) => updateField('phone', text)}
              placeholder="e.g., +918712121272"
              placeholderTextColor={tokens.textMuted}
              keyboardType="phone-pad"
              style={{
                backgroundColor: tokens.surfaceRaised,
                borderRadius: tokens.radius.md,
                borderWidth: 1,
                borderColor: errors.phone ? '#EF4444' : tokens.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                fontFamily: 'monospace',
                color: tokens.text,
              }}
            />
          </YStack>
        </YStack>

        {/* ─── Section 4: Delhivery Logistics Integration ─── */}
        <YStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.lg}
          borderWidth={1}
          borderColor={tokens.border}
          padding={16}
          gap={12}
        >
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap={8} flex={1}>
              <XStack
                width={32}
                height={32}
                borderRadius={tokens.radius.sm}
                backgroundColor="#EFF6FF"
                alignItems="center"
                justifyContent="center"
              >
                <LuTruck size={16} color="#2563EB" />
              </XStack>
              <YStack flex={1}>
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  Delhivery API Synchronization
                </Text>
                <Text fontSize={11} color={tokens.textMuted}>
                  Auto-sync changes with Delhivery pickup endpoint
                </Text>
              </YStack>
            </XStack>

            <Switch
              value={formData.syncWithDelhivery}
              onValueChange={(val) => updateField('syncWithDelhivery', val)}
              trackColor={{ false: '#E2E8F0', true: '#2563EB' }}
            />
          </XStack>

          <XStack
            backgroundColor="#F8FAFC"
            borderRadius={tokens.radius.sm}
            padding={10}
            borderWidth={1}
            borderColor="#E2E8F0"
            alignItems="center"
            gap={8}
          >
            <LuCheck size={14} color="#2563EB" />
            <Text fontSize={11} color="#475569" flex={1}>
              {formData.syncWithDelhivery
                ? 'Updates to Name, Pin code, and Address will immediately register in Delhivery portal.'
                : 'Facility will only be saved locally in DeepLens platform.'}
            </Text>
          </XStack>
        </YStack>

        {/* ─── Section 5: Danger Zone (If Editing) ─── */}
        {!isNew && onDelete && (
          <YStack
            backgroundColor="#FEF2F2"
            borderRadius={tokens.radius.lg}
            borderWidth={1}
            borderColor="#FECACA"
            padding={16}
            gap={10}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <YStack flex={1} gap={2}>
                <Text fontSize={13} fontWeight="800" color="#B91C1C">
                  Delete Warehouse Facility
                </Text>
                <Text fontSize={11} color="#991B1B">
                  Remove this facility from fulfillment routing and vendor pickup options.
                </Text>
              </YStack>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete warehouse"
                onPress={handleDelete}
                disabled={deleting}
              >
                <XStack
                  paddingHorizontal={12}
                  paddingVertical={6}
                  borderRadius={tokens.radius.sm}
                  backgroundColor="#EF4444"
                  alignItems="center"
                  gap={4}
                  opacity={deleting ? 0.7 : 1}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <LuTrash2 size={13} color="#FFFFFF" />
                      <Text fontSize={12} fontWeight="700" color="#FFFFFF">
                        Delete
                      </Text>
                    </>
                  )}
                </XStack>
              </Pressable>
            </XStack>
          </YStack>
        )}

        {/* ─── Bottom Save Action Bar ─── */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save Warehouse"
          onPress={handleSave}
          disabled={saving}
        >
          <XStack
            height={46}
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
                <LuSave size={18} color="#FFFFFF" />
                <Text fontSize={14} fontWeight="800" color="#FFFFFF">
                  {isNew ? 'Register Warehouse Facility' : 'Save Warehouse Changes'}
                </Text>
              </>
            )}
          </XStack>
        </Pressable>
      </ScrollView>
    </YStack>
  );
}
export default EditWarehouseView;
