import React from 'react';
import { Pressable, TextInput } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuTrash2,
  LuPlus,
  LuChevronRight,
  LuChevronDown,
  LuX,
  LuBuilding2,
  LuPencil,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { CustomCheckbox } from '../../atoms/CustomCheckbox';

export interface OrderItem {
  id: string;
  title: string;
  productId: string;
  size?: string;
  color?: string;
  quantity: number;
  costPerPiece: number;
  codChargePerPiece?: number;
  amountPaid?: number;
  imageColor?: string;
  catalogImageColor?: string;
  vendor?: string;
}

export interface ProductListSectionProps {
  products?: OrderItem[];
  items?: OrderItem[];
  selectedIds: string[];
  isCod?: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onBatchDelete: () => void;
  onAddProduct: () => void;
  onEditProduct: (item: OrderItem) => void;
  onOpenPicker: (item: OrderItem, type: 'size' | 'qty') => void;
  onUpdateItem: (id: string, updates: Partial<OrderItem>) => void;
  onRemoveProduct: (id: string) => void;
}

export function ProductListSection({
  products,
  items,
  selectedIds,
  isCod = false,
  onToggleSelect,
  onToggleSelectAll,
  onRemoveProduct,
  onBatchDelete,
  onAddProduct,
  onEditProduct,
  onOpenPicker,
  onUpdateItem,
}: ProductListSectionProps) {
  const { tokens } = useTheme();
  const productList = products || items || [];
  const allSelected = productList.length > 0 && selectedIds.length === productList.length;

  return (
    <YStack gap={8}>
      {/* ── Multi-Select Batch Delete Bar ── */}
      <XStack
        backgroundColor={tokens.surface}
        borderWidth={1}
        borderColor={tokens.border}
        borderRadius={tokens.radius.sm}
        paddingHorizontal={12}
        paddingVertical={8}
        alignItems="center"
        justifyContent="space-between"
      >
        {/* Left: Select-All Checkbox + Count */}
        <XStack alignItems="center" gap={8}>
          <CustomCheckbox
            checked={allSelected}
            onToggle={onToggleSelectAll}
            size={18}
            accessibilityLabel="Select all items for batch action"
          />
          <Text fontSize={12} fontWeight="700" color={tokens.text}>
            {selectedIds.length}/{productList.length} ITEMS SELECTED
          </Text>
        </XStack>

        {/* Right: Batch Delete Action & Add Item */}
        <XStack alignItems="center" gap={8}>
          {selectedIds.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${selectedIds.length} selected items`}
              onPress={onBatchDelete}
              hitSlop={6}
            >
              <XStack
                paddingHorizontal={10}
                paddingVertical={5}
                borderRadius={tokens.radius.xs}
                backgroundColor={`${tokens.error}18`}
                borderWidth={1}
                borderColor={`${tokens.error}40`}
                alignItems="center"
                gap={4}
                hoverStyle={{ backgroundColor: `${tokens.error}28` }}
              >
                <LuTrash2 size={12} color={tokens.error} />
                <Text fontSize={11} fontWeight="700" color={tokens.error}>
                  DELETE ({selectedIds.length})
                </Text>
              </XStack>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add product item"
            onPress={onAddProduct}
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
              <LuPlus size={13} color={tokens.accent} />
              <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                ADD ITEM
              </Text>
            </XStack>
          </Pressable>
        </XStack>
      </XStack>

      {/* ── Product Items List ── */}
      <YStack gap={8}>
        {productList.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const codCharge = isCod ? (item.codChargePerPiece ?? 50) : 0;
          const grossLineTotal = (item.quantity || 1) * ((item.costPerPiece || 0) + codCharge);
          const paidAmount = isCod ? (item.amountPaid || 0) : 0;
          const lineTotal = Math.max(0, grossLineTotal - paidAmount);

          return (
            <YStack
              key={item.id}
              backgroundColor={tokens.surface}
              borderWidth={isSelected ? 1.5 : 1}
              borderColor={isSelected ? tokens.accent : tokens.border}
              borderRadius={tokens.radius.md}
              padding={10}
              gap={8}
            >
              {/* ── Top Section: Thumbnail on Left, Product Details on Right ── */}
              <XStack gap={10} alignItems="flex-start">
                {/* Overlaid Checkbox on top-left of Thumbnail */}
                <YStack
                  width={64}
                  height={76}
                  borderRadius={tokens.radius.sm}
                  backgroundColor={item.imageColor || '#f5ebe0'}
                  position="relative"
                  overflow="hidden"
                  borderWidth={1}
                  borderColor={tokens.border}
                >
                  {/* Checkbox overlaid directly on the image with transparent background */}
                  <YStack position="absolute" top={5} left={5} zIndex={5}>
                    <CustomCheckbox
                      checked={isSelected}
                      onToggle={() => onToggleSelect(item.id)}
                      size={18}
                      accessibilityLabel={`Select item ${item.title}`}
                    />
                  </YStack>
                </YStack>

                {/* Right: Title, SKU ID, Size, Qty, Vendor and Remove Button */}
                <YStack flex={1} gap={2}>
                  {/* Line 1: Single Line Title + Actions (Edit & Remove) */}
                  <XStack alignItems="flex-start" justifyContent="space-between">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit details for ${item.title}`}
                      onPress={() => onEditProduct(item)}
                      style={{ flex: 1, paddingRight: 6 } as any}
                    >
                      <Text
                        fontSize={13}
                        fontWeight="700"
                        color={tokens.text}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.title}
                      </Text>
                    </Pressable>

                    <XStack alignItems="center" gap={6}>
                      {/* Edit Details Sheet Trigger */}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit details for ${item.title}`}
                        onPress={() => onEditProduct(item)}
                        hitSlop={6}
                      >
                        <YStack
                          width={22}
                          height={22}
                          borderRadius={tokens.radius.full}
                          alignItems="center"
                          justifyContent="center"
                          backgroundColor={tokens.surfaceRaised}
                          borderWidth={1}
                          borderColor={tokens.border}
                          hoverStyle={{ backgroundColor: tokens.border }}
                        >
                          <LuPencil size={11} color={tokens.accent} />
                        </YStack>
                      </Pressable>

                      {/* Remove [X] button */}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.title}`}
                        onPress={() => onRemoveProduct(item.id)}
                        hitSlop={6}
                      >
                        <YStack
                          width={22}
                          height={22}
                          borderRadius={tokens.radius.full}
                          alignItems="center"
                          justifyContent="center"
                          backgroundColor={tokens.surfaceRaised}
                          hoverStyle={{ backgroundColor: tokens.border }}
                        >
                          <LuX size={12} color={tokens.textMuted} />
                        </YStack>
                      </Pressable>
                    </XStack>
                  </XStack>

                  {/* Line 2: Product ID / SKU, Size Pill and Qty Pill */}
                  <XStack alignItems="center" gap={8} flexWrap="wrap" paddingTop={2}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View SKU details for ${item.productId}`}
                      onPress={() => onEditProduct(item)}
                      hitSlop={4}
                    >
                      <Text
                        fontSize={11}
                        fontWeight="700"
                        color={tokens.accent}
                        textDecorationLine="underline"
                      >
                        {item.productId}
                      </Text>
                    </Pressable>

                    {/* Size Pill */}
                    <Pressable
                      accessibilityRole="combobox"
                      accessibilityLabel={`Size: ${item.size || 'Free Size'}`}
                      accessibilityHint="Tap to change size"
                      onPress={() => onOpenPicker(item, 'size')}
                    >
                      <XStack
                        height={24}
                        paddingHorizontal={7}
                        borderRadius={tokens.radius.sm}
                        borderWidth={1}
                        borderColor={tokens.border}
                        backgroundColor={tokens.surfaceRaised}
                        alignItems="center"
                        gap={3}
                      >
                        <Text fontSize={10} fontWeight="700" color={tokens.text}>
                          Size: {item.size || 'Free Size'}
                        </Text>
                        <LuChevronDown size={10} color={tokens.textMuted} />
                      </XStack>
                    </Pressable>

                    {/* Qty Pill */}
                    <Pressable
                      accessibilityRole="combobox"
                      accessibilityLabel={`Quantity: ${item.quantity || 1}`}
                      accessibilityHint="Tap to change quantity"
                      onPress={() => onOpenPicker(item, 'qty')}
                    >
                      <XStack
                        height={24}
                        paddingHorizontal={7}
                        borderRadius={tokens.radius.sm}
                        borderWidth={1}
                        borderColor={tokens.border}
                        backgroundColor={tokens.surfaceRaised}
                        alignItems="center"
                        gap={3}
                      >
                        <Text fontSize={10} fontWeight="700" color={tokens.text}>
                          Qty: {item.quantity || 1}
                        </Text>
                        <LuChevronDown size={10} color={tokens.textMuted} />
                      </XStack>
                    </Pressable>
                  </XStack>

                  {/* Line 3: Vendor Name placed below SKU ID */}
                  {item.vendor ? (
                    <XStack alignItems="center" gap={4} paddingTop={1}>
                      <LuBuilding2 size={11} color={tokens.textMuted} />
                      <Text fontSize={11} color={tokens.textMuted} numberOfLines={1}>
                        {item.vendor}
                      </Text>
                    </XStack>
                  ) : null}
                </YStack>
              </XStack>

              {/* ── Bottom Section: Spread Out Full-Width Row ── */}
              {/* Spans all the way to the left edge (under thumbnail) with Price, COD, and Paid */}
              <XStack
                alignItems="flex-end"
                justifyContent="space-between"
                paddingTop={7}
                borderTopWidth={1}
                borderTopColor={`${tokens.border}60`}
              >
                {/* Left: Stacked Price, COD & Paid Inputs spread across the left space */}
                <XStack alignItems="flex-end" gap={8} flex={1} paddingRight={8}>
                  {/* Stacked Price Field (Max 5 digits, e.g. 99999) */}
                  <YStack gap={3} flex={1} minWidth={62} maxWidth={76}>
                    <Text fontSize={10} fontWeight="700" color={tokens.textSecondary} numberOfLines={1}>
                      Price / pc (₹)
                    </Text>
                    <TextInput
                      accessibilityLabel="Cost per piece in rupees"
                      value={String(item.costPerPiece ?? 0)}
                      onChangeText={(v) => {
                        const digits = v.replace(/[^0-9]/g, '').slice(0, 5);
                        onUpdateItem(item.id, { costPerPiece: digits ? parseInt(digits, 10) : 0 });
                      }}
                      keyboardType="numeric"
                      maxLength={5}
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: tokens.text,
                        height: 32,
                        paddingVertical: 4,
                        paddingHorizontal: 7,
                        backgroundColor: tokens.surfaceRaised,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: tokens.border,
                        outlineStyle: 'none',
                      } as any}
                    />
                  </YStack>

                  {/* Stacked COD Charge Field (if COD order, Max 4 digits, e.g. 9999) */}
                  {isCod && (
                    <YStack gap={3} flex={0.85} minWidth={52} maxWidth={64}>
                      <Text fontSize={10} fontWeight="700" color={tokens.warningText} numberOfLines={1}>
                        COD / pc (₹)
                      </Text>
                      <TextInput
                        accessibilityLabel="COD charge per piece in rupees"
                        value={String(item.codChargePerPiece ?? 50)}
                        onChangeText={(v) => {
                          const digits = v.replace(/[^0-9]/g, '').slice(0, 4);
                          onUpdateItem(item.id, { codChargePerPiece: digits ? parseInt(digits, 10) : 0 });
                        }}
                        keyboardType="numeric"
                        maxLength={4}
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: tokens.warningText,
                          height: 32,
                          paddingVertical: 4,
                          paddingHorizontal: 7,
                          backgroundColor: tokens.warningSubtle,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: tokens.warningBorder,
                          outlineStyle: 'none',
                        } as any}
                      />
                    </YStack>
                  )}

                  {/* Stacked Paid / Advance Paid Field (if COD order, Max 4 digits, deducts from total) */}
                  {isCod && (
                    <YStack gap={3} flex={0.85} minWidth={52} maxWidth={64}>
                      <Text fontSize={10} fontWeight="700" color={tokens.status.positive.text} numberOfLines={1}>
                        Paid (₹)
                      </Text>
                      <TextInput
                        accessibilityLabel="Advance paid in rupees to deduct from total"
                        value={String(item.amountPaid ?? 0)}
                        onChangeText={(v) => {
                          const digits = v.replace(/[^0-9]/g, '').slice(0, 4);
                          onUpdateItem(item.id, { amountPaid: digits ? parseInt(digits, 10) : 0 });
                        }}
                        keyboardType="numeric"
                        maxLength={4}
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: tokens.status.positive.text,
                          height: 32,
                          paddingVertical: 4,
                          paddingHorizontal: 7,
                          backgroundColor: tokens.status.positive.subtle,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: tokens.status.positive.border,
                          outlineStyle: 'none',
                        } as any}
                      />
                    </YStack>
                  )}
                </XStack>

                {/* Right: Total and Chevron */}
                <XStack alignItems="center" gap={12} paddingBottom={2}>
                  {/* Total */}
                  <YStack alignItems="flex-end" gap={1}>
                    <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.5}>
                      Total
                    </Text>
                    <Text
                      fontSize={15}
                      fontWeight="800"
                      color={tokens.text}
                      aria-label={`Line total: ${lineTotal} rupees`}
                    >
                      ₹{lineTotal.toLocaleString('en-IN')}
                    </Text>
                  </YStack>

                  {/* Big Accent/Black Chevron Button */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit line item details for ${item.title}`}
                    onPress={() => onEditProduct(item)}
                    hitSlop={10}
                  >
                    <YStack
                      width={32}
                      height={32}
                      borderRadius={tokens.radius.sm}
                      backgroundColor={tokens.accent}
                      alignItems="center"
                      justifyContent="center"
                      hoverStyle={{ opacity: 0.88 }}
                      pressStyle={{ scale: 0.94 }}
                    >
                      <LuChevronRight size={18} color={tokens.accentForeground} />
                    </YStack>
                  </Pressable>
                </XStack>
              </XStack>
            </YStack>
          );
        })}
      </YStack>
    </YStack>
  );
}
