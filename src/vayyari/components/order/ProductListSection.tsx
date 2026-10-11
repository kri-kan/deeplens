import React, { useState, useMemo } from 'react';
import { Pressable, TouchableOpacity, TextInput, Image, Modal, Alert } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuTrash2,
  LuPlus,
  LuPencil,
  LuChevronRight,
  LuChevronDown,
  LuX,
  LuEye,
  LuShare2,
  LuHelpCircle,
  LuCheck,
  LuLock,
  LuBuilding2,
} from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { CustomCheckbox } from '@/components/tamagui-ui/atoms/CustomCheckbox';
import { StatusBadge, StatusIntent } from '@/components/tamagui-ui/atoms/StatusBadge';
import { ImageViewerModal } from '@/components/tamagui-ui/molecules/ImageViewerModal';
import { shareImageUri } from '@/utils/shareImage';
import { isGroupSharingEnabled } from '@/utils/stageTransitionRules';
import { GroupManagementView } from './GroupManagementView';

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
  photoUri?: string;
  image?: string;
  imageUrl?: string;
  catalogImageUrl?: string;
  selectedMediaId?: string;
  attachmentId?: string;
  storagePath?: string;
  isShared?: boolean;
  sharedAt?: string;
}

export const ORDER_STAGES = [
  'Unconfirmed',
  'Confirmed',
  'Placed',
  'Delivered',
] as const;

export interface ProductListSectionProps {
  products?: OrderItem[];
  items?: OrderItem[];
  selectedIds: string[];
  isCod?: boolean;
  orderId?: string;
  orderStage?: string;
  isOrderConfirmed?: boolean;
  readOnly?: boolean;
  groupStages?: Record<string, string>;
  groupLabelInfo?: Record<string, { orderGrpId?: string; needLabel?: boolean; awbNumber?: string; labelUrl?: string }>;
  lockedVendorKeys?: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onBatchDelete: () => void;
  onAddProduct: () => void;
  onEditProduct: (item: OrderItem) => void;
  onOpenPicker: (item: OrderItem, type: 'size' | 'qty') => void;
  onUpdateItem: (id: string, updates: Partial<OrderItem>) => void;
  onRemoveProduct: (id: string) => void;
  onUpdateGroupStage?: (groupKey: string, newStage: string) => void;
  onGenerateGroupLabel?: (orderGrpId: string) => void;
  onViewLabel?: (url: string) => void;
  onShareGroup?: (groupKey: string) => void;
  onManageGroup?: (groupKey: string) => void;
}

export function ProductListSection({
  products,
  items,
  selectedIds,
  isCod = false,
  orderId,
  orderStage,
  isOrderConfirmed = false,
  readOnly = false,
  groupStages = {},
  groupLabelInfo = {},
  lockedVendorKeys = [],
  onToggleSelect,
  onToggleSelectAll,
  onRemoveProduct,
  onBatchDelete,
  onAddProduct,
  onEditProduct,
  onOpenPicker,
  onUpdateItem,
  onUpdateGroupStage,
  onGenerateGroupLabel,
  onViewLabel,
  onShareGroup,
  onManageGroup,
}: ProductListSectionProps) {
  const { tokens } = useTheme();
  const [previewImage, setPreviewImage] = useState<{ uri: string; title?: string } | null>(null);
  const [manageGroupKey, setManageGroupKey] = useState<string | null>(null);

  const getStageIntent = (stage: string): StatusIntent => {
    const s = (stage || '').toLowerCase();
    if (s === 'delivered') return 'positive';
    if (s === 'placed') return 'info';
    if (s === 'confirmed') return 'info';
    return 'attention';
  };

  const productList = products || items || [];
  const allSelected = productList.length > 0 && selectedIds.length === productList.length;

  // Group items automatically by vendor name; all unassigned fall naturally into "Unassigned"
  const vendorGroups = useMemo(() => {
    const map = new Map<string, { key: string; vendorName: string; isUnassigned: boolean; items: OrderItem[] }>();

    for (const item of productList) {
      const raw = (item.vendor || '').trim();
      const isUnassigned = !raw || raw.toLowerCase() === 'unassigned' || raw.toLowerCase() === 'none';
      const key = isUnassigned ? 'Unassigned' : raw;
      const vendorName = isUnassigned ? 'Unassigned' : raw;

      if (!map.has(key)) {
        map.set(key, { key, vendorName, isUnassigned, items: [] });
      }
      map.get(key)!.items.push(item);
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.isUnassigned && !b.isUnassigned) return 1;
      if (!a.isUnassigned && b.isUnassigned) return -1;
      return a.vendorName.localeCompare(b.vendorName);
    });
  }, [productList]);

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
          {!isOrderConfirmed && selectedIds.length > 0 && (
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

          {!isOrderConfirmed && (
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
          )}
        </XStack>
      </XStack>

      {/* ── Product Items List ── */}
      <YStack gap={8}>
        {productList.length === 0 ? (
          <YStack
            backgroundColor={tokens.surface}
            borderWidth={1}
            borderColor={tokens.border}
            borderStyle="dashed"
            borderRadius={0}
            paddingVertical={28}
            paddingHorizontal={16}
            alignItems="center"
            justifyContent="center"
            gap={6}
          >
            <Text fontSize={13} fontWeight="600" color={tokens.textMuted}>
              No items in this order
            </Text>
            <Text fontSize={11} color={tokens.textMuted}>
              Tap "ADD ITEM" above to add products
            </Text>
          </YStack>
        ) : (
          vendorGroups.map((group) => {
            const currentStage = groupStages?.[group.key] || orderStage || 'Unconfirmed';
            const isSharingEnabled = isGroupSharingEnabled(currentStage);
            const isGroupConfirmed =
              Boolean(readOnly) ||
              (currentStage.toLowerCase() !== 'unconfirmed' && currentStage.toLowerCase() !== 'unformed');
            const groupItemCount = group.items.reduce((acc, it) => acc + (it.quantity || 1), 0);
            const groupTotal = group.items.reduce((acc, it) => {
              const codCharge = isCod ? (it.codChargePerPiece ?? 50) : 0;
              const grossLineTotal = (it.quantity || 1) * ((it.costPerPiece || 0) + codCharge);
              const paidAmount = isCod ? (it.amountPaid || 0) : 0;
              return acc + Math.max(0, grossLineTotal - paidAmount);
            }, 0);

            const labelInfo = groupLabelInfo?.[group.key];
            const orderGrpId = labelInfo?.orderGrpId || (orderId ? `${orderId}-${group.key}` : undefined);

            return (
              <YStack
                key={group.key}
                backgroundColor={tokens.surface}
                borderWidth={1}
                borderColor={tokens.border}
                borderRadius={0}
                overflow="hidden"
                gap={0}
              >
                {/* ── Group Header: Vendor Info (Order Group ID & Name), Subtitle, Status Badge & Full-Bleed Blue Chevron Action Button ── */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Manage package for ${orderGrpId ? `${orderGrpId} ` : ''}${group.isUnassigned ? 'No Vendor' : group.vendorName}, currently ${currentStage}`}
                  onPress={() => {
                    if (onManageGroup) {
                      onManageGroup(group.key);
                    } else {
                      setManageGroupKey(group.key);
                    }
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? `${tokens.surfaceRaised}D0` : tokens.surfaceRaised,
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    borderBottomWidth: 1,
                    borderBottomColor: tokens.border,
                  })}
                >
                  {/* Left & Center: Vendor Info (Order Group ID & Name) + Subtitle + Status Badge (No icon next to vendor name) */}
                  <XStack
                    flex={1}
                    paddingLeft={12}
                    paddingRight={10}
                    paddingVertical={10}
                    alignItems="center"
                    justifyContent="space-between"
                    gap={8}
                  >
                    {/* Vendor Name + Subtitle (n items : ₹xxxx) */}
                    <XStack alignItems="center" gap={8} flex={1}>
                      <YStack gap={2} flex={1}>
                        <XStack alignItems="center" gap={6} flexWrap="wrap">
                          <Text fontSize={13} fontWeight="800" color={tokens.text} numberOfLines={1}>
                            {orderGrpId
                              ? `${orderGrpId} • ${group.isUnassigned ? 'No Vendor' : group.vendorName}`
                              : (group.isUnassigned ? 'No Vendor' : group.vendorName)}
                          </Text>
                          <StatusBadge
                            label={currentStage.toUpperCase()}
                            intent={getStageIntent(currentStage)}
                            size="sm"
                          />
                        </XStack>
                        <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                          {groupItemCount} {groupItemCount === 1 ? 'item' : 'items'} : <Text fontWeight="800" color={tokens.text}>₹{groupTotal.toLocaleString('en-IN')}</Text>
                        </Text>
                      </YStack>
                    </XStack>

                    {/* Locked Badge */}
                    {lockedVendorKeys.includes(group.key) && (
                      <XStack alignItems="center" gap={6}>
                        <XStack
                          alignItems="center"
                          gap={3}
                          paddingHorizontal={5}
                          paddingVertical={2}
                          borderRadius={tokens.radius.xs}
                          backgroundColor={`${tokens.accent}1A`}
                        >
                          <LuLock size={10} color={tokens.accent} />
                          <Text fontSize={9} fontWeight="800" color={tokens.accent}>
                            LOCKED
                          </Text>
                        </XStack>
                      </XStack>
                    )}
                  </XStack>

                  {/* Top-to-Bottom Dividing Line & Full-Bleed Blue Action Button */}
                  <YStack
                    width={44}
                    alignSelf="stretch"
                    backgroundColor="#2563EB"
                    borderLeftWidth={1}
                    borderLeftColor={tokens.border}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <LuChevronRight size={18} color="#FFFFFF" />
                  </YStack>
                </Pressable>

                {/* Group Items */}
                <YStack padding={10} gap={8}>
                  {group.items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const codCharge = isCod ? (item.codChargePerPiece ?? 50) : 0;
          const grossLineTotal = (item.quantity || 1) * ((item.costPerPiece || 0) + codCharge);
          const paidAmount = isCod ? (item.amountPaid || 0) : 0;
          const lineTotal = Math.max(0, grossLineTotal - paidAmount);

          const previewImgUri = item.photoUri || (item.image && item.image !== item.catalogImageUrl ? item.image : undefined) || item.catalogImageUrl || item.imageUrl;

          return (
            <YStack
              key={item.id}
              backgroundColor={tokens.surface}
              borderWidth={isSelected ? 1.5 : 1}
              borderColor={isSelected ? tokens.accent : tokens.border}
              borderRadius={tokens.radius.xs}
              padding={10}
              gap={8}
            >
              {/* ── Top Section: Thumbnail on Left, Product Details on Right ── */}
              <XStack gap={10} alignItems="flex-start">
                {/* Thumbnail Container */}
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
                  {previewImgUri ? (
                    <Image
                      source={{ uri: previewImgUri }}
                      style={{ width: '100%', height: '100%', position: 'absolute' }}
                      resizeMode="cover"
                    />
                  ) : null}
                  {/* Checkbox overlaid directly on the image with transparent background */}
                  <YStack position="absolute" top={5} left={5} zIndex={5}>
                    <CustomCheckbox
                      checked={isSelected}
                      onToggle={() => onToggleSelect(item.id)}
                      size={18}
                      accessibilityLabel={`Select item ${item.title}`}
                    />
                  </YStack>

                  {/* Stacked Eye & Share buttons on the right edge of tile */}
                  {previewImgUri ? (
                    <YStack position="absolute" top={5} right={5} zIndex={6}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Preview image for ${item.title}`}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          setPreviewImage({ uri: previewImgUri!, title: item.title || item.productId });
                        }}
                        style={({ pressed }) => ({
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: 'rgba(0, 0, 0, 0.32)',
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.5 : 0.85,
                        })}
                      >
                        <LuEye size={12} color="#ffffff" />
                      </Pressable>

                      <Pressable
                        disabled={!isSharingEnabled}
                        accessibilityRole="button"
                        accessibilityLabel={
                          !isSharingEnabled
                            ? `Sharing disabled for ${item.title} until package is confirmed`
                            : `Share image for ${item.title}`
                        }
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          if (!isSharingEnabled) return;
                          shareImageUri(previewImgUri, item.title || item.productId);
                        }}
                        style={({ pressed }) => ({
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          marginTop: 14,
                          backgroundColor: !isSharingEnabled ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.32)',
                          borderWidth: 1,
                          borderColor: !isSharingEnabled ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: !isSharingEnabled ? 0.35 : pressed ? 0.5 : 0.85,
                        })}
                      >
                        <LuShare2 size={11} color={!isSharingEnabled ? '#94A3B8' : '#ffffff'} />
                      </Pressable>
                    </YStack>
                  ) : null}
                </YStack>

                {/* Right: Title, SKU ID, Size, Qty, Vendor and Remove Button */}
                <YStack flex={1} gap={2}>
                  {/* Line 1: Single Line Title + Actions (Edit & Remove) */}
                  <XStack alignItems="flex-start" justifyContent="space-between">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit details for ${item.title}`}
                      onPress={() => onEditProduct(item)}
                      style={{ flex: 1, paddingRight: 6 }}
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
                    </TouchableOpacity>

                    <XStack alignItems="center" gap={8}>
                      {/* Remove Trash button (only allowed in unconfirmed stage) */}
                      {!isGroupConfirmed && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${item.title}`}
                          onPress={(e) => {
                            e.stopPropagation();
                            onRemoveProduct(String(item.id));
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: tokens.radius.full,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: tokens.errorSubtle || 'rgba(239, 68, 68, 0.12)',
                            borderWidth: 1,
                            borderColor: 'rgba(239, 68, 68, 0.35)',
                          }}
                        >
                          <LuTrash2 size={13} color={tokens.error || '#EF4444'} />
                        </TouchableOpacity>
                      )}
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
                      accessibilityHint={isGroupConfirmed ? 'Item locked' : 'Tap to change size'}
                      accessibilityState={{ disabled: isGroupConfirmed }}
                      disabled={isGroupConfirmed}
                      onPress={() => {
                        if (isGroupConfirmed) return;
                        onOpenPicker(item, 'size');
                      }}
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
                        {!isGroupConfirmed && <LuChevronDown size={10} color={tokens.textMuted} />}
                      </XStack>
                    </Pressable>

                    {/* Qty Pill */}
                    <Pressable
                      accessibilityRole="combobox"
                      accessibilityLabel={`Quantity: ${item.quantity || 1}`}
                      accessibilityHint={isGroupConfirmed ? 'Item locked' : 'Tap to change quantity'}
                      accessibilityState={{ disabled: isGroupConfirmed }}
                      disabled={isGroupConfirmed}
                      onPress={() => {
                        if (isGroupConfirmed) return;
                        onOpenPicker(item, 'qty');
                      }}
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
                        {!isGroupConfirmed && <LuChevronDown size={10} color={tokens.textMuted} />}
                      </XStack>
                    </Pressable>
                  </XStack>

                  {/* Line 3: Vendor Name placed below SKU ID (No icon maintained for vendors) */}
                  {item.vendor ? (
                    <XStack alignItems="center" gap={4} paddingTop={1}>
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
                      editable={!isGroupConfirmed}
                      onChangeText={(v) => {
                        if (isGroupConfirmed) return;
                        const digits = v.replace(/[^0-9]/g, '').slice(0, 5);
                        onUpdateItem(item.id, { costPerPiece: digits ? parseInt(digits, 10) : 0 });
                      }}
                      keyboardType="numeric"
                      maxLength={5}
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: isGroupConfirmed ? tokens.textSecondary : tokens.text,
                        height: 32,
                        paddingVertical: 4,
                        paddingHorizontal: 7,
                        backgroundColor: isGroupConfirmed ? `${tokens.textMuted}0A` : tokens.surfaceRaised,
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
                        editable={!isGroupConfirmed}
                        onChangeText={(v) => {
                          if (isGroupConfirmed) return;
                          const digits = v.replace(/[^0-9]/g, '').slice(0, 4);
                          onUpdateItem(item.id, { codChargePerPiece: digits ? parseInt(digits, 10) : 0 });
                        }}
                        keyboardType="numeric"
                        maxLength={4}
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: isGroupConfirmed ? tokens.textSecondary : tokens.warningText,
                          height: 32,
                          paddingVertical: 4,
                          paddingHorizontal: 7,
                          backgroundColor: isGroupConfirmed ? `${tokens.textMuted}0A` : tokens.warningSubtle,
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
                        editable={!isGroupConfirmed}
                        onChangeText={(v) => {
                          if (isGroupConfirmed) return;
                          const digits = v.replace(/[^0-9]/g, '').slice(0, 4);
                          onUpdateItem(item.id, { amountPaid: digits ? parseInt(digits, 10) : 0 });
                        }}
                        keyboardType="numeric"
                        maxLength={4}
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: isGroupConfirmed ? tokens.textSecondary : tokens.status.positive.text,
                          height: 32,
                          paddingVertical: 4,
                          paddingHorizontal: 7,
                          backgroundColor: isGroupConfirmed ? `${tokens.textMuted}0A` : tokens.status.positive.subtle,
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
                <TouchableOpacity
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isGroupConfirmed
                      ? `View line item details (Locked) for ${item.title || 'item'}`
                      : `Edit line item details for ${item.title || 'item'}`
                  }
                  onPress={() => onEditProduct(item)}
                  hitSlop={{ top: 12, bottom: 12, left: 10, right: 12 }}
                  style={{
                    flexShrink: 0,
                    zIndex: 20,
                  }}
                >
                  <XStack alignItems="center" gap={10} paddingBottom={2}>
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

                    {/* Big Accent/Black Chevron or Lock Button */}
                    <YStack
                      width={36}
                      height={36}
                      borderRadius={tokens.radius.sm}
                      backgroundColor={tokens.accent}
                      alignItems="center"
                      justifyContent="center"
                    >
                      {isGroupConfirmed ? (
                        <LuLock size={16} color={tokens.accentForeground} />
                      ) : (
                        <LuChevronRight size={18} color={tokens.accentForeground} />
                      )}
                    </YStack>
                  </XStack>
                </TouchableOpacity>
              </XStack>
            </YStack>
          );
        })}
      </YStack>
    </YStack>
  );
}))}
</YStack>

      {/* Dedicated Group Management Modal */}
      {(() => {
        if (!manageGroupKey) return null;
        const targetGroup = vendorGroups.find((g) => g.key === manageGroupKey);
        if (!targetGroup) return null;
        const labelInfo = groupLabelInfo[targetGroup.key];
        const currentStage = groupStages[targetGroup.key] || 'Unconfirmed';

        return (
          <GroupManagementView
            orderId={orderId || ''}
            orderGrpId={labelInfo?.orderGrpId || (orderId ? `${orderId}-${targetGroup.key}` : undefined)}
            vendorName={targetGroup.vendorName}
            isUnassigned={targetGroup.isUnassigned}
            currentStage={currentStage}
            isCod={isCod}
            needLabel={labelInfo?.needLabel ?? isCod}
            awbNumber={labelInfo?.awbNumber}
            labelUrl={labelInfo?.labelUrl}
            isLocked={lockedVendorKeys.includes(targetGroup.key)}
            items={targetGroup.items}
            onUpdateStage={(newStage) => {
              onUpdateGroupStage?.(targetGroup.key, newStage);
            }}
            onSave={(newStage) => {
              onUpdateGroupStage?.(targetGroup.key, newStage);
            }}
            onGenerateLabel={() => {
              const grpId = labelInfo?.orderGrpId;
              if (grpId && onGenerateGroupLabel) {
                onGenerateGroupLabel(grpId);
              }
            }}
            onViewLabel={onViewLabel}
            onShareGroup={() => onShareGroup?.(targetGroup.key)}
            onBack={() => setManageGroupKey(null)}
          />
        );
      })()}

      {/* Full-Screen Image Preview Modal with Share Intent */}
      <ImageViewerModal
        visible={!!previewImage}
        imageUrl={previewImage?.uri}
        title={previewImage?.title}
        onClose={() => setPreviewImage(null)}
      />
    </YStack>
  );
}
