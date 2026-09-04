import React, { useState } from 'react';
import { Pressable, TextInput } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuImage, LuBuilding2 } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { BottomSheet } from '../../atoms/BottomSheet';
import { DropdownField } from '../../atoms/DropdownField';
import { CompactField } from '../../atoms/CompactField';
import { QuickPickerSheet } from '../../molecules/QuickPickerSheet';
import { OrderItem } from '../ProductListSection';

export interface ProductEditSheetProps {
  visible: boolean;
  item: OrderItem | null;
  isCod?: boolean;
  onSaveItem: (item: OrderItem) => void;
  onClose: () => void;
}

export function ProductEditSheet({
  visible,
  item,
  isCod = false,
  onSaveItem,
  onClose,
}: ProductEditSheetProps) {
  const { tokens } = useTheme();
  const [form, setForm] = useState<OrderItem | null>(item);

  // Internal Quick Picker for Size & Quantity dropdowns
  const [sheetPickerState, setSheetPickerState] = useState<{
    visible: boolean;
    type: 'size' | 'qty';
    currentValue: string;
  }>({
    visible: false,
    type: 'size',
    currentValue: '',
  });

  React.useEffect(() => {
    setForm(item);
  }, [item]);

  if (!visible || !form) return null;

  const updateField = (field: keyof OrderItem, val: any) => {
    setForm((prev) => (prev ? { ...prev, [field]: val } : prev));
  };

  const handleOpenSheetPicker = (type: 'size' | 'qty') => {
    setSheetPickerState({
      visible: true,
      type,
      currentValue: type === 'size' ? (form.size || 'Free Size') : String(form.quantity || 1),
    });
  };

  const handleSelectSheetOption = (val: string) => {
    if (sheetPickerState.type === 'size') {
      updateField('size', val);
    } else {
      updateField('quantity', parseInt(val, 10) || 1);
    }
  };

  const codCharge = isCod ? (form.codChargePerPiece ?? 50) : 0;
  const grossTotal = (form.quantity || 1) * ((form.costPerPiece || 0) + codCharge);
  const advancePaid = isCod ? (form.amountPaid || 0) : 0;
  const calculatedTotal = Math.max(0, grossTotal - advancePaid);

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title="Edit Item"
        zIndex={200}
        paddingHorizontal={16}
        paddingBottom={32}
      >
        {/* ── Top Image Tiles (Compact 80px Height) ── */}
        <XStack gap={10} paddingBottom={10}>
          {/* Tile 1: Uploaded Photo */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload photo for this product"
            style={{ flex: 1 }}
            onPress={() => alert('Photo upload dialog placeholder')}
          >
            <YStack
              height={80}
              borderRadius={tokens.radius.sm}
              backgroundColor={form.imageColor || '#f5ebe0'}
              alignItems="center"
              justifyContent="flex-end"
              overflow="hidden"
              borderWidth={1}
              borderColor={tokens.border}
            >
              <YStack
                width="100%"
                paddingVertical={4}
                backgroundColor="rgba(0,0,0,0.65)"
                alignItems="center"
              >
                <Text fontSize={10} fontWeight="700" color="#fff">
                  Uploaded Photo
                </Text>
              </YStack>
            </YStack>
          </Pressable>

          {/* Tile 2: Selected from SKU Gallery */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select photo from SKU gallery"
            style={{ flex: 1 }}
            onPress={() => alert('Opening SKU Gallery selector placeholder')}
          >
            <YStack
              height={80}
              borderRadius={tokens.radius.sm}
              backgroundColor={form.productId ? '#c9ada7' : tokens.surfaceRaised}
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
              borderWidth={1.5}
              borderColor={form.productId ? tokens.accent : tokens.border}
              borderStyle={form.productId ? 'solid' : 'dashed'}
            >
              {form.productId ? (
                <YStack width="100%" height="100%" justifyContent="flex-end" alignItems="center">
                  <YStack
                    width="100%"
                    paddingVertical={4}
                    backgroundColor="rgba(0,0,0,0.65)"
                    alignItems="center"
                  >
                    <Text fontSize={10} fontWeight="700" color="#fff">
                      {form.productId}
                    </Text>
                  </YStack>
                </YStack>
              ) : (
                <YStack alignItems="center" gap={2}>
                  <LuImage size={18} color={tokens.accent} />
                  <Text fontSize={10} fontWeight="700" color={tokens.accent}>
                    SKU Gallery
                  </Text>
                  <Text fontSize={9} color={tokens.textMuted} textAlign="center">
                    {form.productId ? 'Linked to SKU' : 'Pick from catalog'}
                  </Text>
                </YStack>
              )}
            </YStack>
          </Pressable>
        </XStack>

        {/* Form Fields — compact underline style */}
        <YStack gap={6}>
          {/* Row 1: Product Title / Name */}
          <CompactField
            label="Product Title / Description"
            value={form.title}
            onChange={(v) => updateField('title', v)}
            placeholder="e.g. Pure Zari Banarasi Saree"
          />

          {/* Row 2: Product ID / SKU, Size Dropdown & Quantity Dropdown (3 Columns) */}
          <XStack gap={10}>
            <YStack flex={1.2}>
              <CompactField
                label="Product ID / SKU"
                value={form.productId}
                onChange={(v) => updateField('productId', v)}
                placeholder="PRD-84920"
              />
            </YStack>
            <YStack flex={1}>
              <DropdownField
                label="Size"
                value={form.size || 'Free Size'}
                onPress={() => handleOpenSheetPicker('size')}
              />
            </YStack>
            <YStack flex={0.7}>
              <DropdownField
                label="Qty"
                value={String(form.quantity || 1)}
                onPress={() => handleOpenSheetPicker('qty')}
              />
            </YStack>
          </XStack>

          {/* Row 3: Price / Pc, COD Charges / Pc & Advance Paid (3 Columns) */}
          <XStack gap={10}>
            {/* Price / Pc (Max 5 digits, e.g. 99999) */}
            <YStack flex={1}>
              <CompactField
                label="Price / Pc (₹)"
                value={String(form.costPerPiece)}
                onChange={(v) => {
                  const digits = v.replace(/[^0-9]/g, '').slice(0, 5);
                  updateField('costPerPiece', digits ? parseInt(digits, 10) : 0);
                }}
                placeholder="1299"
                keyboardType="numeric"
                maxLength={5}
              />
            </YStack>

            {/* COD Charges / Pc (if COD, Max 4 digits, e.g. 9999) */}
            {isCod && (
              <YStack flex={0.9}>
                <CompactField
                  label="COD / Pc (₹)"
                  value={String(form.codChargePerPiece ?? 50)}
                  onChange={(v) => {
                    const digits = v.replace(/[^0-9]/g, '').slice(0, 4);
                    updateField('codChargePerPiece', digits ? parseInt(digits, 10) : 0);
                  }}
                  placeholder="50"
                  keyboardType="numeric"
                  maxLength={4}
                />
              </YStack>
            )}

            {/* Advance Paid / Amount Paid (Max 4 digits, e.g. 9999) */}
            <YStack flex={isCod ? 1.1 : 1}>
              <CompactField
                label={isCod ? 'Advance Paid (₹)' : 'Amount Paid (₹)'}
                value={String(form.amountPaid ?? 0)}
                onChange={(v) => {
                  const digits = v.replace(/[^0-9]/g, '').slice(0, 4);
                  updateField('amountPaid', digits ? parseInt(digits, 10) : 0);
                }}
                placeholder="0"
                keyboardType="numeric"
                maxLength={4}
              />
            </YStack>
          </XStack>

          {/* Row 4: Dedicated Full-Width Row for Vendor Assignment */}
          <YStack
            borderBottomWidth={1}
            borderBottomColor={tokens.border}
            paddingVertical={3}
            gap={1}
          >
            <Text fontSize={9} fontWeight="700" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.4}>
              Vendor Assignment
            </Text>
            <XStack alignItems="center" gap={6} height={24}>
              <LuBuilding2 size={13} color={tokens.textMuted} />
              <TextInput
                accessibilityLabel="Vendor Assignment"
                value={form.vendor}
                onChangeText={(v) => updateField('vendor', v)}
                placeholder="e.g. Varanasi Weavers Ltd, Surat Handlooms Factory #2"
                placeholderTextColor={tokens.textMuted}
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: '700',
                  color: tokens.text,
                  height: 22,
                  paddingVertical: 0,
                  paddingHorizontal: 0,
                  outlineStyle: 'none',
                } as any}
              />
            </XStack>
          </YStack>

          {/* Summary pill */}
          <XStack
            backgroundColor={tokens.surfaceRaised}
            borderRadius={tokens.radius.sm}
            paddingHorizontal={12}
            paddingVertical={8}
            justifyContent="space-between"
            alignItems="center"
            marginTop={4}
          >
            <Text fontSize={12} color={tokens.textMuted}>
              Line Total ({form.quantity || 1} × ₹{(form.costPerPiece || 0) + codCharge}{advancePaid > 0 ? ` - ₹${advancePaid}` : ''})
            </Text>
            <Text fontSize={15} fontWeight="800" color={tokens.text}>
              ₹{calculatedTotal.toLocaleString('en-IN')}
            </Text>
          </XStack>

          {/* Action button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save line item changes"
            onPress={() => {
              onSaveItem(form);
              onClose();
            }}
            style={{ marginTop: 6 }}
          >
            <YStack
              backgroundColor={tokens.accent}
              paddingVertical={12}
              borderRadius={tokens.radius.sm}
              alignItems="center"
              justifyContent="center"
              hoverStyle={{ opacity: 0.92 }}
              pressStyle={{ scale: 0.98 }}
            >
              <Text fontSize={14} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.4}>
                SAVE ITEM
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </BottomSheet>

      {/* Nested QuickPickerSheet for Size / Quantity inside the Edit Sheet */}
      <QuickPickerSheet
        visible={sheetPickerState.visible}
        type={sheetPickerState.type}
        selected={sheetPickerState.currentValue}
        onSelect={handleSelectSheetOption}
        onClose={() => setSheetPickerState((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
}
