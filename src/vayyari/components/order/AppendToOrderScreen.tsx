import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Surface,
  Text,
  TextInput,
  IconButton,
  Button,
  useTheme,
  SegmentedButtons,
  Chip,
  Divider,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { searchApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { getSearchApiUrl } from '@/utils/api-config';
import { uriToBlob, compressImageToWebP } from '@/utils/media-helpers';
import { useShareIntentContext, SharedMediaItem } from '@/context/ShareIntentContext';
import { OrderIdEntry, OrderGroup, OrderItem, OrderUpdateRequest } from '@/types/orders';

type AttachmentType = 'item' | 'tracking_label';

export const AppendToOrderScreen: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { sharedMedia, clearSharedMedia, commitCurrentSession, discardCurrentSession } =
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
        params: { limit: 20 },
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
        const targetGroup = orderDetail.groups?.find((g) => g.orderGrpId === selectedGroupKey);
        const groupVendor = targetGroup?.vendorName || 'Unassigned';

        const updatedGroups = (orderDetail.groups || []).map((g) => {
          if (g.orderGrpId === selectedGroupKey) {
            return {
              ...g,
              labelUrl: fullImageUrl,
            };
          }
          return g;
        });

        // Ensure current items comments retain their properties
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
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {/* App Bar / Header */}
      <Surface style={[styles.headerBar, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <IconButton icon="arrow-left" size={24} onPress={() => router.back()} />
        <View style={styles.headerTitleContainer}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
            Append to Order
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Attach shared media to existing order
          </Text>
        </View>
        <IconButton icon="trash-can-outline" iconColor={theme.colors.error} size={22} onPress={handleDiscard} />
      </Surface>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Tile: Staged Media Preview */}
        <Surface
          style={[
            styles.mediaCard,
            {
              backgroundColor: (theme.colors as any).surfaceContainerLow || theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <View style={styles.mediaRow}>
            {activeMedia ? (
              <Image source={{ uri: activeMedia.uri }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
                <IconButton icon="image-off" size={24} />
              </View>
            )}
            <View style={styles.mediaDetails}>
              <View style={styles.badgeRow}>
                <Chip compact icon={activeMedia?.type === 'video' ? 'video' : 'image'} textStyle={{ fontSize: 11 }}>
                  {activeMedia?.type === 'video' ? 'Video' : 'Single Photo'}
                </Chip>
                <Chip compact mode="outlined" textStyle={{ fontSize: 11, color: theme.colors.secondary }}>
                  Staged
                </Chip>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                Ready to append. Select attachment target below.
              </Text>
            </View>
          </View>
        </Surface>

        {/* Attachment Type Switcher */}
        <Surface
          style={[
            styles.sectionCard,
            {
              backgroundColor: (theme.colors as any).surfaceContainerLow || theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Attachment Type
          </Text>
          <SegmentedButtons
            value={attachmentType}
            onValueChange={(val) => setAttachmentType(val as AttachmentType)}
            buttons={[
              {
                value: 'item',
                label: '👕 Item Reference',
                icon: 'tshirt-crew',
              },
              {
                value: 'tracking_label',
                label: '📦 Tracking Label',
                icon: 'barcode-scan',
              },
            ]}
            style={styles.segmentedButtons}
          />
        </Surface>

        {/* Order Selector */}
        <Surface
          style={[
            styles.sectionCard,
            {
              backgroundColor: (theme.colors as any).surfaceContainerLow || theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Target Order
            </Text>
            {selectedOrderId && (
              <TouchableOpacity onPress={() => setSelectedOrderId(null)}>
                <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}>
                  Change
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedOrderId && orderDetail ? (
            <Surface
              style={[
                styles.selectedOrderBanner,
                {
                  backgroundColor: (theme.colors as any).primaryContainer || '#EADDFF',
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <View style={styles.selectedOrderHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                    Order #{orderDetail.id}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {orderDetail.customerName || 'Customer'} • 📞 {orderDetail.customerPhone || 'N/A'}
                  </Text>
                  {orderDetail.shippingCity && (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      📍 {orderDetail.shippingCity}, {orderDetail.shippingPincode}
                    </Text>
                  )}
                </View>
                <Chip compact textStyle={{ fontSize: 11, fontWeight: 'bold' }}>
                  {orderDetail.status || 'Active'}
                </Chip>
              </View>
            </Surface>
          ) : (
            <>
              <TextInput
                label="Search Order ID, Phone, or Customer..."
                value={searchQuery}
                onChangeText={handleSearchChange}
                mode="outlined"
                left={<TextInput.Icon icon="magnify" />}
                right={loadingOrders ? <TextInput.Icon icon="loading" /> : undefined}
                style={styles.searchInput}
              />

              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                Recent Orders ({filteredOrders.length})
              </Text>

              <View style={styles.ordersList}>
                {filteredOrders.slice(0, 5).map((ord) => (
                  <TouchableOpacity
                    key={ord.id}
                    style={[
                      styles.orderListItem,
                      {
                        borderBottomColor: theme.colors.outlineVariant,
                        backgroundColor: (theme.colors as any).surfaceContainerLowest || theme.colors.surface,
                      },
                    ]}
                    onPress={() => handleSelectOrder(ord.id)}
                  >
                    <View style={styles.orderItemRow}>
                      <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                        #{ord.id}
                      </Text>
                      <Chip compact textStyle={{ fontSize: 10 }}>
                        {ord.paymentMode || 'COD'}
                      </Chip>
                    </View>
                    <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
                      {ord.customerName ? `${ord.customerName} • ` : ''}
                      {ord.customerPhone ? `📞 ${ord.customerPhone} • ` : ''}
                      {ord.status || 'Active'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </Surface>

        {/* Loading detail indicator */}
        {loadingOrderDetail && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
              Loading order items and groups...
            </Text>
          </View>
        )}

        {/* Branch: Tracking Label -> Order Groups List */}
        {selectedOrderId && orderDetail && !loadingOrderDetail && attachmentType === 'tracking_label' && (
          <Surface
            style={[
              styles.sectionCard,
              {
                backgroundColor: (theme.colors as any).surfaceContainerLow || theme.colors.surfaceVariant,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
            elevation={1}
          >
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Select Order Group for Shipping Label
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
              Choose which vendor shipment group receives this tracking label:
            </Text>

            {(!orderDetail.groups || orderDetail.groups.length === 0) ? (
              <View style={styles.emptyCard}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  No groups formed yet for this order. Media will attach to default group ({selectedOrderId}-G1).
                </Text>
              </View>
            ) : (
              <View style={styles.groupsContainer}>
                {orderDetail.groups.map((grp) => {
                  const isSelected = selectedGroupKey === grp.orderGrpId;
                  return (
                    <TouchableOpacity
                      key={grp.orderGrpId}
                      style={[
                        styles.groupCard,
                        {
                          borderColor: isSelected ? theme.colors.primary : theme.colors.outlineVariant,
                          backgroundColor: isSelected
                            ? (theme.colors as any).primaryContainer || '#EADDFF'
                            : (theme.colors as any).surfaceContainerLowest || theme.colors.surface,
                        },
                      ]}
                      onPress={() => setSelectedGroupKey(grp.orderGrpId)}
                    >
                      <View style={styles.groupHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                            {grp.orderGrpId} ({grp.vendorName || 'Unassigned'})
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Status: {grp.status || 'Active'} {grp.awbNumber ? `• AWB: ${grp.awbNumber}` : ''}
                          </Text>
                        </View>
                        {isSelected && (
                          <IconButton icon="check-circle" iconColor={theme.colors.primary} size={20} style={{ margin: 0 }} />
                        )}
                      </View>
                      {grp.labelUrl && (
                        <View style={styles.hasLabelNotice}>
                          <Text variant="labelSmall" style={{ color: theme.colors.tertiary, fontWeight: '600' }}>
                            ⚠️ Already has a label. Attaching will replace it.
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </Surface>
        )}

        {/* Branch: Item -> Select existing item without media or [+] New Item */}
        {selectedOrderId && orderDetail && !loadingOrderDetail && attachmentType === 'item' && (
          <Surface
            style={[
              styles.sectionCard,
              {
                backgroundColor: (theme.colors as any).surfaceContainerLow || theme.colors.surfaceVariant,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
            elevation={1}
          >
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Attach to Item
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Choose an existing item missing a photo, or create a new item:
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.itemTilesScroll}>
              {/* Existing Items */}
              {(orderDetail.items || []).map((it, idx) => {
                const targetKey = it.itemId || String(it.id);
                const isSelected = selectedItemTarget === targetKey;

                let hasMedia = false;
                let existingPhoto: string | undefined = it.photoUrl;
                if (it.attachments && it.attachments.length > 0) {
                  hasMedia = true;
                  existingPhoto = it.attachments[0].key;
                }
                if (it.comments) {
                  try {
                    const parsed = JSON.parse(it.comments);
                    if (parsed.photoUri || parsed.image || parsed.catalogImageUrl) {
                      hasMedia = true;
                      existingPhoto = parsed.photoUri || parsed.image || parsed.catalogImageUrl;
                    }
                  } catch {
                    // ignore
                  }
                }

                return (
                  <TouchableOpacity
                    key={targetKey}
                    style={[
                      styles.itemTile,
                      {
                        borderColor: isSelected ? theme.colors.primary : theme.colors.outlineVariant,
                        backgroundColor: isSelected
                          ? (theme.colors as any).primaryContainer || '#EADDFF'
                          : (theme.colors as any).surfaceContainerLowest || theme.colors.surface,
                      },
                    ]}
                    onPress={() => setSelectedItemTarget(targetKey)}
                  >
                    {existingPhoto ? (
                      <Image source={{ uri: existingPhoto }} style={styles.itemTileImage} />
                    ) : (
                      <View style={[styles.itemTileImage, styles.noImagePlaceholder]}>
                        <IconButton icon="image-off-outline" size={20} iconColor={theme.colors.onSurfaceVariant} />
                        <Text variant="labelSmall" style={{ fontSize: 9, color: theme.colors.onSurfaceVariant }}>
                          No Media
                        </Text>
                      </View>
                    )}
                    <View style={styles.itemTileMeta}>
                      <Text variant="labelMedium" numberOfLines={1} style={{ fontWeight: 'bold' }}>
                        {it.productTitle || `Item #${idx + 1}`}
                      </Text>
                      <Text variant="labelSmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
                        {it.vendorName || 'Unassigned'}
                      </Text>
                      {hasMedia ? (
                        <Text variant="labelSmall" style={{ fontSize: 9, color: theme.colors.error, marginTop: 2 }}>
                          Has Media
                        </Text>
                      ) : (
                        <Text variant="labelSmall" style={{ fontSize: 9, color: theme.colors.primary, marginTop: 2 }}>
                          Missing Media ⭐
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <View style={styles.tileCheckBadge}>
                        <IconButton icon="check" iconColor="#fff" size={12} style={{ margin: 0 }} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* [+] Add as New Item Tile */}
              <TouchableOpacity
                style={[
                  styles.itemTile,
                  styles.newItemTile,
                  {
                    borderColor: selectedItemTarget === '__NEW__' ? theme.colors.primary : theme.colors.outlineVariant,
                    backgroundColor:
                      selectedItemTarget === '__NEW__'
                        ? (theme.colors as any).primaryContainer || '#EADDFF'
                        : (theme.colors as any).surfaceContainerLowest || theme.colors.surface,
                  },
                ]}
                onPress={() => setSelectedItemTarget('__NEW__')}
              >
                <View style={styles.newItemIconBox}>
                  <IconButton icon="plus" size={28} iconColor={theme.colors.primary} />
                </View>
                <Text variant="labelMedium" style={{ fontWeight: 'bold', textAlign: 'center', marginTop: 4 }}>
                  [+] New Item
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', fontSize: 10 }}>
                  Add as new tile
                </Text>
                {selectedItemTarget === '__NEW__' && (
                  <View style={styles.tileCheckBadge}>
                    <IconButton icon="check" iconColor="#fff" size={12} style={{ margin: 0 }} />
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Surface>
        )}
      </ScrollView>

      {/* Bottom Action Footer */}
      <Surface style={[styles.footerBar, { backgroundColor: theme.colors.surface }]} elevation={4}>
        <Button
          mode="contained"
          onPress={handleAttach}
          loading={submitting}
          disabled={submitting || !selectedOrderId}
          style={styles.attachButton}
          contentStyle={{ height: 48 }}
          labelStyle={{ fontWeight: 'bold', fontSize: 15 }}
        >
          {attachmentType === 'tracking_label' ? 'Attach Tracking Label' : 'Attach to Order Item'}
        </Button>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 4,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 90,
  },
  mediaCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: {
    width: 68,
    height: 84,
    borderRadius: 10,
    backgroundColor: '#000',
  },
  placeholderThumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  mediaDetails: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  sectionCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  segmentedButtons: {
    marginTop: 4,
  },
  searchInput: {
    backgroundColor: 'transparent',
  },
  ordersList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  orderListItem: {
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  selectedOrderBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedOrderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  groupsContainer: {
    gap: 8,
  },
  groupCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hasLabelNotice: {
    marginTop: 4,
  },
  emptyCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  itemTilesScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  itemTile: {
    position: 'relative',
    width: 110,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: 6,
  },
  itemTileImage: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  noImagePlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTileMeta: {
    marginTop: 6,
  },
  newItemTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    paddingVertical: 14,
  },
  newItemIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#10B981',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  attachButton: {
    borderRadius: 12,
  },
});
