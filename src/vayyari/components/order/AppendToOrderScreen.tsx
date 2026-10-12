import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  View,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
  LuTag,
  LuPhone,
  LuMapPin,
  LuTruck,
} from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { searchApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { getSearchApiUrl } from '@/utils/api-config';
import { uriToBlob, compressImageToWebP } from '@/utils/media-helpers';
import { useShareIntentContext, SharedMediaItem } from '@/context/ShareIntentContext';
import { OrderIdEntry, OrderUpdateRequest } from '@/types/orders';

type AttachmentType = 'item' | 'tracking_label';

export const AppendToOrderScreen: React.FC = () => {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { sharedMedia, commitCurrentSession, discardCurrentSession } =
    useShareIntentContext();

  const activeMedia: SharedMediaItem | undefined = sharedMedia[0];

  // Attachment type: 'item' (default) vs 'tracking_label'
  const [attachmentType, setAttachmentType] = useState<AttachmentType>('item');

  // Search & order list state
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [recentOrders, setRecentOrders] = useState<OrderIdEntry[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderIdEntry[]>([]);

  // Selected Order and its detailed data
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [orderDetail, setOrderDetail] = useState<OrderIdEntry | null>(null);

  // Tracking Label selection: chosen group ID
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  // Item selection: existing item id or '__NEW__'
  const [selectedItemTarget, setSelectedItemTarget] = useState<string>('__NEW__');

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Fetch recent orders on mount
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const orders = await searchApiClient.get<OrderIdEntry[]>(API_ROUTES.ORDERS.HISTORY, {
        params: { limit: 25 },
      });
      if (orders && Array.isArray(orders)) {
        setRecentOrders(orders);
        setFilteredOrders(orders);
      }
    } catch (e) {
      console.warn('[AppendToOrder] Failed to load history:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredOrders(recentOrders);
      return;
    }
    const lower = query.toLowerCase();
    const filtered = recentOrders.filter(
      (o) =>
        o.id.toLowerCase().includes(lower) ||
        (o.customerPhone && o.customerPhone.toLowerCase().includes(lower)) ||
        (o.instagramHandle && o.instagramHandle.toLowerCase().includes(lower)) ||
        (o.customerName && o.customerName.toLowerCase().includes(lower)) ||
        (o.sourceHandle && o.sourceHandle.toLowerCase().includes(lower))
    );
    setFilteredOrders(filtered);
  };

  // Fetch order details when order is selected
  const handleSelectOrder = async (orderId: string) => {
    setSelectedOrderId(orderId);
    try {
      setLoadingOrderDetail(true);
      const detail = await searchApiClient.get<OrderIdEntry>(API_ROUTES.ORDERS.GET_BY_ID(orderId));
      setOrderDetail(detail);

      // Default Group for tracking label: pick first group if available
      if (detail.groups && detail.groups.length > 0) {
        setSelectedGroupKey(detail.groups[0].orderGrpId);
      } else {
        setSelectedGroupKey(null);
      }

      // Default Item selection:
      // If any existing item doesn't have media, choose that item; otherwise default to '__NEW__'
      if (detail.items && detail.items.length > 0) {
        const itemWithoutMedia = detail.items.find((it) => {
          let hasMedia = false;
          if (it.photoUrl || it.labelUrl) hasMedia = true;
          if (it.attachments && it.attachments.length > 0) hasMedia = true;
          if (it.comments) {
            try {
              const meta = JSON.parse(it.comments);
              if (meta.photoUri || meta.image || meta.catalogImageUrl || meta.attachmentId || meta.storagePath) {
                hasMedia = true;
              }
            } catch {
              // not json
            }
          }
          return !hasMedia;
        });

        if (itemWithoutMedia) {
          setSelectedItemTarget(itemWithoutMedia.itemId || String(itemWithoutMedia.id));
        } else {
          setSelectedItemTarget('__NEW__');
        }
      } else {
        setSelectedItemTarget('__NEW__');
      }
    } catch (err: any) {
      console.error('[AppendToOrder] Failed to load order detail:', err);
      Alert.alert('Error', 'Could not load order details.');
      setSelectedOrderId(null);
      setOrderDetail(null);
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  const handleDiscard = async () => {
    Alert.alert('Discard Media', 'Are you sure you want to discard this staged media?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await discardCurrentSession();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  const handleAttach = async () => {
    if (!activeMedia) {
      Alert.alert('No Media', 'No shared media found to attach.');
      return;
    }
    if (!selectedOrderId || !orderDetail) {
      Alert.alert('Select Order', 'Please select an order to append to.');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Process and upload media to MinIO
      const isVideo = activeMedia.type === 'video';
      let uploadUri = activeMedia.uri;
      let uploadMime = isVideo ? 'video/mp4' : 'image/jpeg';
      let fileName = isVideo ? `video_${Date.now()}.mp4` : `image_${Date.now()}.webp`;

      if (!isVideo) {
        try {
          const comp = await compressImageToWebP(activeMedia.uri);
          uploadUri = comp.uri;
          uploadMime = comp.mimeType;
          fileName = comp.fileName;
        } catch (e) {
          console.warn('[AppendToOrder] Image compression fallback:', e);
        }
      }

      const blob = await uriToBlob(uploadUri, uploadMime);
      const formData = new FormData();
      formData.append('file', blob, fileName);

      const entityType = attachmentType === 'tracking_label' ? 'order_group' : 'order_item';
      const entityId =
        attachmentType === 'tracking_label'
          ? (selectedGroupKey || `${selectedOrderId}-G1`)
          : selectedOrderId;
      const tag = attachmentType === 'tracking_label' ? 'shipping_label' : 'reference';

      const uploadRes = await searchApiClient.postFormData<{
        id: string;
        fileName: string;
        status: string;
        storagePath?: string;
        url?: string;
      }>(
        `${API_ROUTES.ATTACHMENTS.UPLOAD}?entityType=${encodeURIComponent(
          entityType
        )}&entityId=${encodeURIComponent(entityId)}&tag=${encodeURIComponent(tag)}`,
        formData
      );

      const downloadPath =
        uploadRes.url ||
        (uploadRes.storagePath ? API_ROUTES.ATTACHMENTS.DOWNLOAD(uploadRes.storagePath) : '');
      const fullImageUrl = downloadPath.startsWith('http')
        ? downloadPath
        : `${getSearchApiUrl()}${downloadPath}`;

      // 2. Branch: Tracking Label vs Item
      if (attachmentType === 'tracking_label') {
        const updatedGroups = (orderDetail.groups || []).map((g) => {
          if (g.orderGrpId === selectedGroupKey) {
            return {
              ...g,
              labelUrl: fullImageUrl,
            };
          }
          return g;
        });

        const payloadItems = (orderDetail.items || []).map((it) => ({
          productId: it.productId,
          productTitle: it.productTitle,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subtotal: it.subtotal,
          comments: it.comments,
          vendorName: it.vendorName,
        }));

        const updatePayload: Partial<OrderUpdateRequest> = {
          groups: updatedGroups,
          items: payloadItems,
        };

        await searchApiClient.put(API_ROUTES.ORDERS.UPDATE(selectedOrderId), updatePayload);
      } else {
        // Attachment type: 'item'
        const existingItems = orderDetail.items || [];
        let updatedItems: any[] = [];

        if (selectedItemTarget === '__NEW__') {
          // Append as a new item tile
          const newComments = JSON.stringify({
            photoUri: fullImageUrl,
            image: fullImageUrl,
            attachmentId: uploadRes.id,
            storagePath: uploadRes.storagePath,
            size: 'Free Size',
            vendor: 'Unassigned',
            isShared: false,
          });

          const newItem = {
            productId: '',
            productTitle: 'Apparel Item',
            quantity: 1,
            unitPrice: 0,
            subtotal: 0,
            vendorName: 'Unassigned',
            comments: newComments,
          };

          updatedItems = [
            ...existingItems.map((it) => ({
              productId: it.productId,
              productTitle: it.productTitle,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              subtotal: it.subtotal,
              comments: it.comments,
              vendorName: it.vendorName,
            })),
            newItem,
          ];
        } else {
          // Update selected existing item
          updatedItems = existingItems.map((it) => {
            const isMatch = it.itemId === selectedItemTarget || String(it.id) === selectedItemTarget;
            if (!isMatch) {
              return {
                productId: it.productId,
                productTitle: it.productTitle,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                subtotal: it.subtotal,
                comments: it.comments,
                vendorName: it.vendorName,
              };
            }

            let metaObj: Record<string, any> = {};
            if (it.comments) {
              try {
                metaObj = JSON.parse(it.comments);
              } catch {
                metaObj = {};
              }
            }

            metaObj.photoUri = fullImageUrl;
            metaObj.image = fullImageUrl;
            metaObj.attachmentId = uploadRes.id;
            metaObj.storagePath = uploadRes.storagePath;

            return {
              productId: it.productId,
              productTitle: it.productTitle,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              subtotal: it.subtotal,
              comments: JSON.stringify(metaObj),
              vendorName: it.vendorName,
            };
          });
        }

        const updatePayload: Partial<OrderUpdateRequest> = {
          items: updatedItems,
          groups: orderDetail.groups,
        };

        await searchApiClient.put(API_ROUTES.ORDERS.UPDATE(selectedOrderId), updatePayload);
      }

      // 3. Commit session & navigate to order detail view
      await commitCurrentSession();
      Alert.alert('Success', `Attached to Order #${selectedOrderId}!`, [
        {
          text: 'Open Order',
          onPress: () => {
            router.replace(`/utilities/all-orders?orderId=${selectedOrderId}`);
          },
        },
      ]);
    } catch (err: any) {
      console.error('[AppendToOrder] Submission failed:', err);
      Alert.alert('Error', err?.message || 'Failed to attach media to order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <YStack
      flex={1}
      backgroundColor={tokens.background}
      paddingTop={insets.top}
      paddingBottom={insets.bottom}
    >
      {/* ─── App Bar Header ─── */}
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
            onPress={() => router.back()}
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
          onPress={handleDiscard}
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Staged Media Hero Preview ─── */}
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
            alignItems="center"
            justifyContent="center"
          >
            {activeMedia?.uri ? (
              <Image
                source={{ uri: activeMedia.uri }}
                style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
              />
            ) : (
              <LuImage size={24} color={tokens.textMuted} />
            )}
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
              {activeMedia?.type === 'video' ? (
                <LuVideo size={10} color="#fff" />
              ) : (
                <LuImage size={10} color="#fff" />
              )}
              <Text fontSize={9} fontWeight="700" color="#fff">
                {activeMedia?.type === 'video' ? 'VIDEO' : 'PHOTO'}
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
                setSelectedItemTarget('__NEW__');
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
              <LuTag
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
                if (orderDetail?.groups && orderDetail.groups.length > 0) {
                  setSelectedGroupKey(orderDetail.groups[0].orderGrpId);
                }
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

        {/* ─── Target Order Selection ─── */}
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
            {selectedOrderId && (
              <Pressable
                onPress={() => {
                  setSelectedOrderId(null);
                  setOrderDetail(null);
                }}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                  CHANGE ORDER
                </Text>
              </Pressable>
            )}
          </XStack>

          {selectedOrderId && orderDetail ? (
            /* Selected Order Banner */
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
                  Order #{orderDetail.id}
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
                    {orderDetail.customerName || 'Customer'} • {orderDetail.customerPhone || 'N/A'}
                  </Text>
                </XStack>
                {orderDetail.shippingCity && (
                  <XStack alignItems="center" gap={4}>
                    <LuMapPin size={12} color={tokens.textMuted} />
                    <Text fontSize={12} color={tokens.textMuted}>
                      {orderDetail.shippingCity}, {orderDetail.shippingPincode}
                    </Text>
                  </XStack>
                )}
              </XStack>
            </YStack>
          ) : (
            /* Order Search & Recent List */
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
                  onChangeText={handleSearchChange}
                  placeholder="Search by Order ID, Phone, or Handle..."
                  placeholderTextColor={tokens.textMuted}
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: tokens.text,
                  }}
                />
                {searchQuery ? (
                  <Pressable onPress={() => handleSearchChange('')}>
                    <LuX size={14} color={tokens.textMuted} />
                  </Pressable>
                ) : null}
              </XStack>

              <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                RECENT ORDERS ({filteredOrders.length})
              </Text>

              {loadingOrders ? (
                <YStack padding={20} alignItems="center">
                  <ActivityIndicator color={tokens.accent} size="small" />
                </YStack>
              ) : (
                <YStack gap={6}>
                  {filteredOrders.slice(0, 5).map((ord) => (
                    <Pressable
                      key={ord.id}
                      onPress={() => handleSelectOrder(ord.id)}
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
                            backgroundColor={tokens.border}
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

        {loadingOrderDetail && (
          <YStack padding={20} alignItems="center" gap={8}>
            <ActivityIndicator color={tokens.accent} size="small" />
            <Text fontSize={12} color={tokens.textMuted}>
              Loading order items and shipment groups...
            </Text>
          </YStack>
        )}

        {/* ─── Item Selection OR Tracking Group Selection ─── */}
        {selectedOrderId && orderDetail && !loadingOrderDetail && (
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
                    <LuTag size={14} color={tokens.textMuted} />
                    <Text fontSize={11} fontWeight="800" color={tokens.textMuted} letterSpacing={0.8}>
                      SELECT PRODUCT DESTINATION
                    </Text>
                  </XStack>
                  <Text fontSize={11} color={tokens.textMuted}>
                    {(orderDetail.items || []).length} item{(orderDetail.items || []).length === 1 ? '' : 's'}
                  </Text>
                </XStack>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
                >
                  {/* [+] Add as New Line Item Tile */}
                  <Pressable
                    onPress={() => setSelectedItemTarget('__NEW__')}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.75 : 1,
                      width: 120,
                      borderRadius: tokens.radius.md,
                      borderWidth: selectedItemTarget === '__NEW__' ? 2 : 1,
                      borderStyle: selectedItemTarget === '__NEW__' ? 'solid' : 'dashed',
                      borderColor: selectedItemTarget === '__NEW__' ? tokens.accent : tokens.border,
                      backgroundColor:
                        selectedItemTarget === '__NEW__' ? `${tokens.accent}10` : tokens.surfaceRaised,
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
                        selectedItemTarget === '__NEW__' ? tokens.accent : `${tokens.accent}18`
                      }
                      alignItems="center"
                      justifyContent="center"
                    >
                      <LuPlus
                        size={20}
                        color={selectedItemTarget === '__NEW__' ? '#fff' : tokens.accent}
                      />
                    </YStack>
                    <Text
                      fontSize={12}
                      fontWeight="800"
                      color={selectedItemTarget === '__NEW__' ? tokens.accent : tokens.text}
                      textAlign="center"
                    >
                      + New Item
                    </Text>
                    <Text fontSize={9} color={tokens.textMuted} textAlign="center">
                      Create fresh slot
                    </Text>
                    {selectedItemTarget === '__NEW__' && (
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
                  {(orderDetail.items || []).map((item, idx) => {
                    const targetKey = item.itemId || String(item.id);
                    const isSelected = selectedItemTarget === targetKey;

                    let hasMedia = false;
                    let existingPhoto: string | undefined = item.photoUrl;
                    if (item.attachments && item.attachments.length > 0) {
                      hasMedia = true;
                      existingPhoto = item.attachments[0].key;
                    }
                    if (item.comments) {
                      try {
                        const parsed = JSON.parse(item.comments);
                        if (parsed.photoUri || parsed.image || parsed.catalogImageUrl) {
                          hasMedia = true;
                          existingPhoto = parsed.photoUri || parsed.image || parsed.catalogImageUrl;
                        }
                      } catch {
                        // ignore
                      }
                    }

                    return (
                      <Pressable
                        key={targetKey}
                        onPress={() => setSelectedItemTarget(targetKey)}
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
                          {existingPhoto ? (
                            <Image
                              source={{ uri: existingPhoto }}
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
                          {hasMedia ? (
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
                  {(!orderDetail.groups || orderDetail.groups.length === 0) ? (
                    <Text fontSize={12} color={tokens.textMuted}>
                      No shipping groups formed yet. Label will attach to default group ({selectedOrderId}-G1).
                    </Text>
                  ) : (
                    orderDetail.groups.map((grp) => {
                      const isSelected = selectedGroupKey === grp.orderGrpId;
                      return (
                        <Pressable
                          key={grp.orderGrpId}
                          onPress={() => setSelectedGroupKey(grp.orderGrpId)}
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
          onPress={handleAttach}
          disabled={!selectedOrderId || submitting}
          style={({ pressed }) => ({
            flex: 1,
            height: 48,
            borderRadius: tokens.radius.md,
            backgroundColor: !selectedOrderId ? tokens.border : tokens.accent,
            opacity: pressed ? 0.8 : !selectedOrderId ? 0.6 : 1,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          })}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <LuCheck size={18} color="#fff" />
              <Text fontSize={14} fontWeight="800" color="#fff" letterSpacing={0.5}>
                {attachmentType === 'tracking_label'
                  ? 'ATTACH TRACKING LABEL'
                  : selectedItemTarget === '__NEW__'
                  ? 'APPEND AS NEW ITEM'
                  : 'UPDATE ITEM PHOTO'}
              </Text>
            </>
          )}
        </Pressable>
      </XStack>
    </YStack>
  );
};
