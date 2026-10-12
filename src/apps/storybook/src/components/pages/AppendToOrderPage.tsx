import React, { useState } from 'react';
import { ScrollView, Pressable, TextInput, Image, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LuArrowLeft,
  LuSearch,
  LuX,
  LuImage,
  LuVideo,
  LuTrash2,
  LuCheck,
  LuPlus,
  LuPackage,
  LuShirt,
  LuStore,
  LuPhone,
  LuMapPin,
  LuTruck,
} from 'react-icons/lu';
import { useTheme } from '../../theme';
import { OrderIdHistoryEntry } from '../molecules/OrderIdHistoryItem';

export type AttachmentTargetType = 'item' | 'tracking_label';

export interface AppendOrderItemSummary {
  id: string;
  itemId?: string;
  productTitle?: string;
  vendorName?: string;
  photoUrl?: string;
  quantity?: number;
  hasMedia?: boolean;
}

export interface AppendOrderGroupSummary {
  orderGrpId: string;
  vendorName?: string;
  status?: string;
  awbNumber?: string;
  labelUrl?: string;
}

export interface AppendToOrderPageProps {
  /** Staged media details */
  mediaUri?: string;
  mediaType?: 'image' | 'video';
  isStaged?: boolean;

  /** Orders list for selection */
  recentOrders?: OrderIdHistoryEntry[];
  isLoadingOrders?: boolean;
  selectedOrderId?: string | null;

  /** Order detail when order is selected */
  isLoadingOrderDetail?: boolean;
  orderItems?: AppendOrderItemSummary[];
  orderGroups?: AppendOrderGroupSummary[];
  customerName?: string;
  customerPhone?: string;
  shippingCity?: string;
  shippingPincode?: string;

  /** Selection state */
  initialAttachmentType?: AttachmentTargetType;
  initialSelectedTarget?: string; // item id, '__NEW__', or group id

  /** Action callbacks */
  onBack?: () => void;
  onDiscard?: () => void;
  onSelectOrder?: (orderId: string) => void;
  onAttach?: (targetType: AttachmentTargetType, targetId: string) => void;
  disableSafeArea?: boolean;
}

export function AppendToOrderPage({
  mediaUri = 'https://picsum.photos/400/500',
  mediaType = 'image',
  isStaged = true,
  recentOrders = [],
  isLoadingOrders = false,
  selectedOrderId = null,
  isLoadingOrderDetail = false,
  orderItems = [],
  orderGroups = [],
  customerName = 'Priya Menon',
  customerPhone = '+91 98765 43210',
  shippingCity = 'Hyderabad',
  shippingPincode = '500081',
  initialAttachmentType = 'item',
  initialSelectedTarget = '__NEW__',
  onBack,
  onDiscard,
  onSelectOrder,
  onAttach,
  disableSafeArea = false,
}: AppendToOrderPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeOrderId, setActiveOrderId] = useState<string | null>(selectedOrderId);
  const [attachmentType, setAttachmentType] = useState<AttachmentTargetType>(initialAttachmentType);
  const [selectedTarget, setSelectedTarget] = useState<string>(initialSelectedTarget);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredOrders = recentOrders.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      (o.customerPhone && o.customerPhone.toLowerCase().includes(q)) ||
      (o.sourceHandle && o.sourceHandle.toLowerCase().includes(q))
    );
  });

  const handleChooseOrder = (id: string) => {
    setActiveOrderId(id);
    onSelectOrder?.(id);
    // Auto select first group or new item
    if (attachmentType === 'tracking_label' && orderGroups.length > 0) {
      setSelectedTarget(orderGroups[0].orderGrpId);
    } else {
      setSelectedTarget('__NEW__');
    }
  };

  const handleConfirmAttach = () => {
    if (!activeOrderId) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onAttach?.(attachmentType, selectedTarget);
    }, 400);
  };

  return (
    <YStack
      flex={1}
      backgroundColor={tokens.background}
      paddingTop={disableSafeArea ? 0 : insets.top}
      paddingBottom={disableSafeArea ? 0 : insets.bottom}
    >
      {/* ─── Modern App Bar Header ─── */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={16}
        paddingVertical={12}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        backgroundColor={tokens.surface}
      >
        <XStack alignItems="center" gap={12}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: tokens.surfaceRaised,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <LuArrowLeft size={18} color={tokens.text} />
          </Pressable>
          <YStack>
            <Text fontSize={16} fontWeight="800" color={tokens.text}>
              Append to Order
            </Text>
            <Text fontSize={11} color={tokens.textMuted}>
              Attach shared media to customer order
            </Text>
          </YStack>
        </XStack>

        <Pressable
          onPress={onDiscard}
          hitSlop={12}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: `${tokens.error}12`,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          })}
        >
          <LuTrash2 size={13} color={tokens.error} />
          <Text fontSize={11} fontWeight="700" color={tokens.error}>
            Discard
          </Text>
        </Pressable>
      </XStack>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Staged Media Banner ─── */}
        <XStack
          padding={12}
          borderRadius={tokens.radius.lg}
          backgroundColor={tokens.surface}
          borderWidth={1}
          borderColor={tokens.border}
          gap={14}
          alignItems="center"
        >
          <YStack
            width={72}
            height={90}
            borderRadius={tokens.radius.md}
            overflow="hidden"
            backgroundColor="#000"
            borderWidth={1}
            borderColor={tokens.border}
            position="relative"
          >
            <Image
              source={{ uri: mediaUri }}
              style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
            />
            <XStack
              position="absolute"
              bottom={4}
              left={4}
              paddingHorizontal={5}
              paddingVertical={2}
              borderRadius={4}
              backgroundColor="rgba(0,0,0,0.65)"
              alignItems="center"
              gap={3}
            >
              {mediaType === 'video' ? (
                <LuVideo size={10} color="#fff" />
              ) : (
                <LuImage size={10} color="#fff" />
              )}
              <Text fontSize={9} fontWeight="700" color="#fff">
                {mediaType === 'video' ? 'VIDEO' : 'PHOTO'}
              </Text>
            </XStack>
          </YStack>

          <YStack flex={1} gap={4}>
            <XStack alignItems="center" gap={6}>
              <XStack
                paddingHorizontal={8}
                paddingVertical={2}
                borderRadius={6}
                backgroundColor={`${tokens.accent}16`}
              >
                <Text fontSize={10} fontWeight="800" color={tokens.accent} letterSpacing={0.5}>
                  SHARED MEDIA STAGED
                </Text>
              </XStack>
            </XStack>
            <Text fontSize={14} fontWeight="800" color={tokens.text}>
              Incoming Media Reference
            </Text>
            <Text fontSize={11} color={tokens.textMuted} lineHeight={16}>
              Select the order and target item or shipping group to append this media.
            </Text>
          </YStack>
        </XStack>

        {/* ─── Target Type Segmented Switcher ─── */}
        <YStack gap={8}>
          <Text fontSize={11} fontWeight="800" color={tokens.textMuted} letterSpacing={0.8}>
            ATTACHMENT TARGET TYPE
          </Text>
          <XStack
            padding={4}
            borderRadius={tokens.radius.md}
            backgroundColor={tokens.surfaceRaised}
            borderWidth={1}
            borderColor={tokens.border}
            gap={6}
          >
            <Pressable
              onPress={() => {
                setAttachmentType('item');
                setSelectedTarget('__NEW__');
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: tokens.radius.sm,
                backgroundColor: attachmentType === 'item' ? tokens.surface : 'transparent',
                borderWidth: attachmentType === 'item' ? 1 : 0,
                borderColor: tokens.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <LuShirt
                size={14}
                color={attachmentType === 'item' ? tokens.accent : tokens.textMuted}
              />
              <Text
                fontSize={12}
                fontWeight="800"
                color={attachmentType === 'item' ? tokens.accent : tokens.textMuted}
              >
                Product Item
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setAttachmentType('tracking_label');
                if (orderGroups.length > 0) setSelectedTarget(orderGroups[0].orderGrpId);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: tokens.radius.sm,
                backgroundColor: attachmentType === 'tracking_label' ? tokens.surface : 'transparent',
                borderWidth: attachmentType === 'tracking_label' ? 1 : 0,
                borderColor: tokens.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <LuTruck
                size={14}
                color={attachmentType === 'tracking_label' ? tokens.accent : tokens.textMuted}
              />
              <Text
                fontSize={12}
                fontWeight="800"
                color={attachmentType === 'tracking_label' ? tokens.accent : tokens.textMuted}
              >
                Tracking Label
              </Text>
            </Pressable>
          </XStack>
        </YStack>

        {/* ─── Selected Target Order Card OR Order Search Picker ─── */}
        <YStack
          padding={14}
          borderRadius={tokens.radius.lg}
          backgroundColor={tokens.surface}
          borderWidth={1}
          borderColor={tokens.border}
          gap={12}
        >
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap={6}>
              <LuPackage size={14} color={tokens.textMuted} />
              <Text fontSize={11} fontWeight="800" color={tokens.textMuted} letterSpacing={0.8}>
                TARGET ORDER
              </Text>
            </XStack>
            {activeOrderId && (
              <Pressable
                onPress={() => setActiveOrderId(null)}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                  CHANGE ORDER
                </Text>
              </Pressable>
            )}
          </XStack>

          {activeOrderId ? (
            /* Active Order Selected Banner */
            <YStack
              padding={12}
              borderRadius={tokens.radius.md}
              backgroundColor={`${tokens.accent}0C`}
              borderWidth={1.5}
              borderColor={tokens.accent}
              gap={8}
            >
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={15} fontWeight="900" color={tokens.text}>
                  Order #{activeOrderId}
                </Text>
                <XStack
                  paddingHorizontal={8}
                  paddingVertical={2}
                  borderRadius={4}
                  backgroundColor={tokens.accent}
                >
                  <Text fontSize={10} fontWeight="800" color="#fff">
                    SELECTED
                  </Text>
                </XStack>
              </XStack>

              <XStack flexWrap="wrap" gap={12}>
                <XStack alignItems="center" gap={4}>
                  <LuPhone size={12} color={tokens.textMuted} />
                  <Text fontSize={12} fontWeight="600" color={tokens.text}>
                    {customerName} • {customerPhone}
                  </Text>
                </XStack>
                {shippingCity && (
                  <XStack alignItems="center" gap={4}>
                    <LuMapPin size={12} color={tokens.textMuted} />
                    <Text fontSize={12} color={tokens.textMuted}>
                      {shippingCity}, {shippingPincode}
                    </Text>
                  </XStack>
                )}
              </XStack>
            </YStack>
          ) : (
            /* Searchable Orders Dropdown / List */
            <YStack gap={10}>
              <XStack
                alignItems="center"
                backgroundColor={tokens.surfaceRaised}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                paddingHorizontal={12}
                height={40}
                gap={8}
              >
                <LuSearch size={15} color={tokens.textMuted} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by Order ID, Phone, or Handle..."
                  placeholderTextColor={tokens.textMuted}
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: tokens.text,
                    outlineStyle: 'none',
                  } as any}
                />
                {searchQuery ? (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <LuX size={14} color={tokens.textMuted} />
                  </Pressable>
                ) : null}
              </XStack>

              <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                RECENT ORDERS ({filteredOrders.length})
              </Text>

              {isLoadingOrders ? (
                <YStack padding={20} alignItems="center">
                  <ActivityIndicator color={tokens.accent} size="small" />
                </YStack>
              ) : (
                <YStack gap={6}>
                  {filteredOrders.slice(0, 5).map(ord => (
                    <Pressable
                      key={ord.id}
                      onPress={() => handleChooseOrder(ord.id)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                        padding: 10,
                        borderRadius: tokens.radius.sm,
                        backgroundColor: tokens.surfaceRaised,
                        borderWidth: 1,
                        borderColor: tokens.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      })}
                    >
                      <YStack gap={2}>
                        <XStack alignItems="center" gap={6}>
                          <Text fontSize={13} fontWeight="800" color={tokens.text}>
                            #{ord.id}
                          </Text>
                          <XStack
                            paddingHorizontal={6}
                            paddingVertical={1}
                            borderRadius={3}
                            backgroundColor={`${tokens.border}`}
                          >
                            <Text fontSize={9} fontWeight="700" color={tokens.textMuted}>
                              {ord.paymentMode?.toUpperCase() || 'COD'}
                            </Text>
                          </XStack>
                        </XStack>
                        <Text fontSize={11} color={tokens.textMuted}>
                          {ord.customerPhone || ord.sourceHandle || 'Direct customer'}
                        </Text>
                      </YStack>
                      <LuPlus size={16} color={tokens.accent} />
                    </Pressable>
                  ))}
                </YStack>
              )}
            </YStack>
          )}
        </YStack>

        {/* ─── Item Selection OR Tracking Group Selection ─── */}
        {activeOrderId && (
          <YStack
            padding={14}
            borderRadius={tokens.radius.lg}
            backgroundColor={tokens.surface}
            borderWidth={1}
            borderColor={tokens.border}
            gap={12}
          >
            {attachmentType === 'item' ? (
              <>
                <XStack alignItems="center" justifyContent="space-between">
                  <XStack alignItems="center" gap={6}>
                    <LuShirt size={14} color={tokens.textMuted} />
                    <Text fontSize={11} fontWeight="800" color={tokens.textMuted} letterSpacing={0.8}>
                      SELECT PRODUCT DESTINATION
                    </Text>
                  </XStack>
                  <Text fontSize={11} color={tokens.textMuted}>
                    {orderItems.length} existing line item{orderItems.length === 1 ? '' : 's'}
                  </Text>
                </XStack>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
                >
                  {/* [+] Add as New Line Item Tile */}
                  <Pressable
                    onPress={() => setSelectedTarget('__NEW__')}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.75 : 1,
                      width: 120,
                      borderRadius: tokens.radius.md,
                      borderWidth: selectedTarget === '__NEW__' ? 2 : 1,
                      borderStyle: selectedTarget === '__NEW__' ? 'solid' : 'dashed',
                      borderColor: selectedTarget === '__NEW__' ? tokens.accent : tokens.border,
                      backgroundColor:
                        selectedTarget === '__NEW__' ? `${tokens.accent}10` : tokens.surfaceRaised,
                      padding: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    })}
                  >
                    <YStack
                      width={40}
                      height={40}
                      borderRadius={20}
                      backgroundColor={
                        selectedTarget === '__NEW__' ? tokens.accent : `${tokens.accent}18`
                      }
                      alignItems="center"
                      justifyContent="center"
                    >
                      <LuPlus
                        size={20}
                        color={selectedTarget === '__NEW__' ? '#fff' : tokens.accent}
                      />
                    </YStack>
                    <Text
                      fontSize={12}
                      fontWeight="800"
                      color={selectedTarget === '__NEW__' ? tokens.accent : tokens.text}
                      textAlign="center"
                    >
                      + New Item
                    </Text>
                    <Text fontSize={9} color={tokens.textMuted} textAlign="center">
                      Create fresh slot
                    </Text>
                    {selectedTarget === '__NEW__' && (
                      <XStack
                        position="absolute"
                        top={6}
                        right={6}
                        width={18}
                        height={18}
                        borderRadius={9}
                        backgroundColor={tokens.accent}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <LuCheck size={11} color="#fff" />
                      </XStack>
                    )}
                  </Pressable>

                  {/* Existing Items Tiles */}
                  {orderItems.map((item, idx) => {
                    const isSelected = selectedTarget === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => setSelectedTarget(item.id)}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.75 : 1,
                          width: 120,
                          borderRadius: tokens.radius.md,
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? tokens.accent : tokens.border,
                          backgroundColor: isSelected ? `${tokens.accent}10` : tokens.surfaceRaised,
                          padding: 8,
                          gap: 6,
                          position: 'relative',
                        })}
                      >
                        <YStack
                          width="100%"
                          height={74}
                          borderRadius={tokens.radius.sm}
                          overflow="hidden"
                          backgroundColor="#000"
                          alignItems="center"
                          justifyContent="center"
                        >
                          {item.photoUrl ? (
                            <Image
                              source={{ uri: item.photoUrl }}
                              style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                            />
                          ) : (
                            <YStack alignItems="center" gap={2}>
                              <LuImage size={20} color={tokens.textMuted} />
                              <Text fontSize={9} color={tokens.textMuted}>
                                No Photo
                              </Text>
                            </YStack>
                          )}
                        </YStack>

                        <YStack gap={2}>
                          <Text
                            fontSize={11}
                            fontWeight="800"
                            color={isSelected ? tokens.accent : tokens.text}
                            numberOfLines={1}
                          >
                            {item.productTitle || `Item #${idx + 1}`}
                          </Text>
                          <Text fontSize={9} color={tokens.textMuted} numberOfLines={1}>
                            {item.vendorName || 'Unassigned'}
                          </Text>
                          {item.hasMedia ? (
                            <Text fontSize={9} fontWeight="700" color={tokens.error}>
                              Has photo (replaces)
                            </Text>
                          ) : (
                            <Text fontSize={9} fontWeight="800" color={tokens.accent}>
                              Missing media ⭐
                            </Text>
                          )}
                        </YStack>

                        {isSelected && (
                          <XStack
                            position="absolute"
                            top={6}
                            right={6}
                            width={18}
                            height={18}
                            borderRadius={9}
                            backgroundColor={tokens.accent}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <LuCheck size={11} color="#fff" />
                          </XStack>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : (
              <>
                <XStack alignItems="center" justifyContent="space-between">
                  <XStack alignItems="center" gap={6}>
                    <LuTruck size={14} color={tokens.textMuted} />
                    <Text fontSize={11} fontWeight="800" color={tokens.textMuted} letterSpacing={0.8}>
                      SELECT SHIPMENT GROUP FOR LABEL
                    </Text>
                  </XStack>
                </XStack>

                <YStack gap={8}>
                  {orderGroups.length === 0 ? (
                    <Text fontSize={12} color={tokens.textMuted}>
                      No shipping groups formed yet. Label will attach to default group ({activeOrderId}-G1).
                    </Text>
                  ) : (
                    orderGroups.map(grp => {
                      const isSelected = selectedTarget === grp.orderGrpId;
                      return (
                        <Pressable
                          key={grp.orderGrpId}
                          onPress={() => setSelectedTarget(grp.orderGrpId)}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.75 : 1,
                            padding: 12,
                            borderRadius: tokens.radius.md,
                            borderWidth: isSelected ? 2 : 1,
                            borderColor: isSelected ? tokens.accent : tokens.border,
                            backgroundColor: isSelected ? `${tokens.accent}0C` : tokens.surfaceRaised,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          })}
                        >
                          <YStack gap={2}>
                            <XStack alignItems="center" gap={8}>
                              <Text
                                fontSize={13}
                                fontWeight="800"
                                color={isSelected ? tokens.accent : tokens.text}
                              >
                                {grp.orderGrpId}
                              </Text>
                              <XStack
                                paddingHorizontal={6}
                                paddingVertical={1}
                                borderRadius={4}
                                backgroundColor={tokens.border}
                              >
                                <Text fontSize={10} color={tokens.textMuted}>
                                  {grp.vendorName || 'Unassigned Vendor'}
                                </Text>
                              </XStack>
                            </XStack>
                            <Text fontSize={11} color={tokens.textMuted}>
                              Status: {grp.status || 'Active'} {grp.awbNumber ? `• AWB: ${grp.awbNumber}` : ''}
                            </Text>
                          </YStack>

                          {isSelected && (
                            <XStack
                              width={22}
                              height={22}
                              borderRadius={11}
                              backgroundColor={tokens.accent}
                              alignItems="center"
                              justifyContent="center"
                            >
                              <LuCheck size={13} color="#fff" />
                            </XStack>
                          )}
                        </Pressable>
                      );
                    })
                  )}
                </YStack>
              </>
            )}
          </YStack>
        )}
      </ScrollView>

      {/* ─── Sticky Bottom Action Footer ─── */}
      <XStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        paddingHorizontal={16}
        paddingVertical={12}
        borderTopWidth={1}
        borderTopColor={tokens.border}
        backgroundColor={tokens.surface}
      >
        <Pressable
          onPress={handleConfirmAttach}
          disabled={!activeOrderId || isSubmitting}
          style={({ pressed }) => ({
            flex: 1,
            height: 48,
            borderRadius: tokens.radius.md,
            backgroundColor: !activeOrderId ? tokens.border : tokens.accent,
            opacity: pressed ? 0.8 : !activeOrderId ? 0.6 : 1,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          })}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <LuCheck size={18} color="#fff" />
              <Text fontSize={14} fontWeight="800" color="#fff" letterSpacing={0.5}>
                {attachmentType === 'tracking_label'
                  ? 'ATTACH TRACKING LABEL'
                  : selectedTarget === '__NEW__'
                  ? 'APPEND AS NEW ITEM'
                  : 'UPDATE ITEM PHOTO'}
              </Text>
            </>
          )}
        </Pressable>
      </XStack>
    </YStack>
  );
}
