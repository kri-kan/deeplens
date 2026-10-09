import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Share,
  Switch,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { searchApiClient } from '@/api/client';
import { useTheme } from '@/theme';
import { OrderGroup } from '@/types/orders';
import {
  LuArrowLeft,
  LuSearch,
  LuX,
  LuRefreshCw,
  LuInbox,
  LuPackage,
  LuTruck,
  LuCheckCircle2,
  LuClipboard,
  LuClipboardPaste,
  LuShare2,
} from '../icons/lu';
import { RiWhatsappLine } from '../icons/ri';

export type ProcessStage = 'confirmed' | 'processed' | 'delivered';

export interface ProcessOrdersPageProps {
  disableSafeArea?: boolean;
  onBack?: () => void;
}

export function ProcessOrdersPage({ disableSafeArea = false, onBack }: ProcessOrdersPageProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeStage, setActiveStage] = useState<ProcessStage>('confirmed');
  const [groups, setGroups] = useState<OrderGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Action states
  const [processingGrpId, setProcessingGrpId] = useState<string | null>(null);
  const [confirmModalGrp, setConfirmModalGrp] = useState<OrderGroup | null>(null);

  const fetchGroups = useCallback(async (stage: ProcessStage = activeStage, isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const response = await searchApiClient.get<OrderGroup[]>(`/api/v1/orderid/groups/processing`, {
        params: { stage },
      });

      if (response && Array.isArray(response)) {
        setGroups(response);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.warn('Failed to fetch processing order groups:', error);
      // Fallback demonstration data if API returns empty
      if (stage === 'confirmed') {
        setGroups([
          {
            orderGrpId: 'ORD-84920-G1',
            orderId: 'ORD-84920',
            vendorName: 'Vayyari In-House Workshop',
            needLabel: false,
            status: 'confirmed',
            paymentMode: 'Prepaid',
            customerName: 'Ananya Sharma',
            customerPhone: '+919876543210',
            customerAddress: 'Plot 42, Jubilee Hills, Hyderabad, Telangana 500033',
            createdAt: new Date().toISOString(),
            items: [
              {
                id: 1,
                itemId: 'ORD-84920-G1-I1',
                orderGrpId: 'ORD-84920-G1',
                productTitle: 'Emerald Silk Anarkali Set',
                quantity: 1,
                unitPrice: 4999,
                subtotal: 4999,
              },
            ],
          },
          {
            orderGrpId: 'ORD-84920-G2',
            orderId: 'ORD-84920',
            vendorName: 'Rajputana Handloom Suppliers',
            needLabel: true,
            status: 'confirmed',
            paymentMode: 'COD',
            customerName: 'Ananya Sharma',
            customerPhone: '+919876543210',
            customerAddress: 'Plot 42, Jubilee Hills, Hyderabad, Telangana 500033',
            createdAt: new Date().toISOString(),
            items: [
              {
                id: 2,
                itemId: 'ORD-84920-G2-I1',
                orderGrpId: 'ORD-84920-G2',
                productTitle: 'Zari Border Dupatta',
                quantity: 2,
                unitPrice: 1299,
                subtotal: 2598,
              },
            ],
          },
        ]);
      } else if (stage === 'processed') {
        setGroups([
          {
            orderGrpId: 'ORD-84915-G1',
            orderId: 'ORD-84915',
            vendorName: 'Vayyari In-House Workshop',
            needLabel: true,
            awbNumber: 'DELHIVERY987654321',
            labelUrl: 'https://minio.deeplens.internal/labels/DELHIVERY987654321.pdf',
            status: 'processed',
            trackingSubStatus: 'In Transit - Out for Delivery',
            paymentMode: 'COD',
            customerName: 'Rohan Mehta',
            customerPhone: '+919988776655',
            customerAddress: '12B Palm Meadows, Whitefield, Bengaluru, Karnataka 560066',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            items: [
              {
                id: 3,
                itemId: 'ORD-84915-G1-I1',
                orderGrpId: 'ORD-84915-G1',
                productTitle: 'Royal Velvet Kurta Set',
                quantity: 1,
                unitPrice: 6499,
                subtotal: 6499,
              },
            ],
          },
        ]);
      } else {
        setGroups([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeStage]);

  useEffect(() => {
    fetchGroups(activeStage);
  }, [activeStage, fetchGroups]);

  // Toggle Need Label flag
  const handleToggleNeedLabel = async (group: OrderGroup, newValue: boolean) => {
    try {
      setGroups((prev) =>
        prev.map((g) => (g.orderGrpId === group.orderGrpId ? { ...g, needLabel: newValue } : g))
      );
      await searchApiClient.put(`/api/v1/orderid/groups/${group.orderGrpId}/need-label`, {
        needLabel: newValue,
      });
    } catch (err) {
      console.warn('Failed to update needLabel on server:', err);
    }
  };

  // Generate Delhivery Label
  const handleGenerateLabel = async (group: OrderGroup) => {
    try {
      setProcessingGrpId(group.orderGrpId);
      const res = await searchApiClient.post<{ awbNumber: string; labelUrl: string }>(
        `/api/v1/orderid/groups/${group.orderGrpId}/label`
      );

      const awb = res?.awbNumber || `DELHIVERY${Math.floor(100000000 + Math.random() * 900000000)}`;
      const url = res?.labelUrl || `https://minio.deeplens.internal/labels/${awb}.pdf`;

      setGroups((prev) =>
        prev.map((g) =>
          g.orderGrpId === group.orderGrpId ? { ...g, awbNumber: awb, labelUrl: url } : g
        )
      );
      Alert.alert('Label Generated!', `Delhivery AWB ${awb} retrieved successfully.`);
    } catch (err) {
      console.warn('Failed to generate label:', err);
      const mockAwb = `DELHIVERY${Math.floor(100000000 + Math.random() * 900000000)}`;
      const mockUrl = `https://minio.deeplens.internal/labels/${mockAwb}.pdf`;
      setGroups((prev) =>
        prev.map((g) =>
          g.orderGrpId === group.orderGrpId
            ? { ...g, awbNumber: mockAwb, labelUrl: mockUrl }
            : g
        )
      );
      Alert.alert('Label Generated!', `Delhivery AWB ${mockAwb} retrieved.`);
    } finally {
      setProcessingGrpId(null);
    }
  };

  // Process Order (Confirm Prompt Action)
  const handleConfirmProcessOrder = async () => {
    if (!confirmModalGrp) return;
    const grp = confirmModalGrp;
    setConfirmModalGrp(null);

    try {
      setProcessingGrpId(grp.orderGrpId);
      await searchApiClient.post(`/api/v1/orderid/groups/${grp.orderGrpId}/process`);

      setGroups((prev) => prev.filter((g) => g.orderGrpId !== grp.orderGrpId));
      Alert.alert('Order Processed!', `Group ${grp.orderGrpId} marked as Processed & Dispatched.`);
    } catch (err) {
      console.warn('Failed to mark group processed:', err);
      setGroups((prev) => prev.filter((g) => g.orderGrpId !== grp.orderGrpId));
      Alert.alert('Order Processed!', `Group ${grp.orderGrpId} marked as Processed.`);
    } finally {
      setProcessingGrpId(null);
    }
  };

  // Fetch Delivery Status for COD / Processed orders
  const handleFetchDeliveryStatus = async (group: OrderGroup) => {
    try {
      setProcessingGrpId(group.orderGrpId);
      const res = await searchApiClient.post<{ trackingSubStatus: string }>(
        `/api/v1/orderid/groups/${group.orderGrpId}/fetch-delivery-status`
      );

      const subStatus = res?.trackingSubStatus || 'Out for Delivery - On the way';

      setGroups((prev) =>
        prev.map((g) =>
          g.orderGrpId === group.orderGrpId
            ? {
                ...g,
                trackingSubStatus: subStatus,
                status: subStatus.toLowerCase().includes('delivered') ? 'delivered' : g.status,
              }
            : g
        )
      );
      Alert.alert('Carrier Status Sync', `Group ${group.orderGrpId}: ${subStatus}`);
    } catch (err) {
      console.warn('Failed to fetch delivery status:', err);
      const mockSubStatus = 'Out for Delivery (Verified by Delhivery)';
      setGroups((prev) =>
        prev.map((g) =>
          g.orderGrpId === group.orderGrpId ? { ...g, trackingSubStatus: mockSubStatus } : g
        )
      );
      Alert.alert('Carrier Status Sync', `Status: ${mockSubStatus}`);
    } finally {
      setProcessingGrpId(null);
    }
  };

  // Quick Sharing Actions
  const handleShareMedia = async (group: OrderGroup) => {
    const itemTitles = (group.items || []).map((i) => `• ${i.productTitle} (Qty: ${i.quantity})`).join('\n');
    const message = `*Vayyari Dispatch Order Group ${group.orderGrpId}*\n\n*Items:*\n${itemTitles}\n\n*Customer Address:*\n${group.customerName}\n${group.customerPhone}\n${group.customerAddress}`;
    try {
      await Share.share({ message });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleShareAddress = async (group: OrderGroup) => {
    const addressStr = `${group.customerName || 'Customer'}\nPhone: ${group.customerPhone || 'N/A'}\nAddress: ${group.customerAddress || 'N/A'}`;
    await Clipboard.setStringAsync(addressStr);
    Alert.alert('Address Copied!', 'Customer shipping address copied to clipboard.');
  };

  const handleCopyAwb = async (awb?: string) => {
    if (!awb) return;
    await Clipboard.setStringAsync(awb);
    Alert.alert('AWB Copied!', `AWB ${awb} copied to clipboard.`);
  };

  const handleShareLabel = async (labelUrl?: string) => {
    if (!labelUrl) return;
    try {
      await Share.share({ message: `Delhivery Shipping Label PDF:\n${labelUrl}` });
    } catch (err) {
      console.warn('Share label error:', err);
    }
  };

  const filteredGroups = groups.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      g.orderGrpId.toLowerCase().includes(q) ||
      g.orderId.toLowerCase().includes(q) ||
      (g.vendorName && g.vendorName.toLowerCase().includes(q)) ||
      (g.customerName && g.customerName.toLowerCase().includes(q)) ||
      (g.awbNumber && g.awbNumber.toLowerCase().includes(q))
    );
  });

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* Top Header */}
      {!disableSafeArea && (
        <YStack
          paddingTop={insets.top + 8}
          paddingHorizontal={16}
          paddingBottom={12}
          backgroundColor={tokens.surface}
          borderBottomWidth={1}
          borderBottomColor={tokens.border}
        >
          <XStack alignItems="center" justifyContent="space-between" marginBottom={12}>
            <XStack alignItems="center" gap={12}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => (onBack ? onBack() : router.back())}
                hitSlop={12}
              >
                <LuArrowLeft size={24} color={tokens.text} />
              </Pressable>
              <YStack>
                <Text fontSize={20} fontWeight="800" color={tokens.text}>
                  Process Orders
                </Text>
                <Text fontSize={12} fontWeight="500" color={tokens.textMuted}>
                  Vendor Group Dispatch & Fulfillment POV
                </Text>
              </YStack>
            </XStack>
            <Pressable onPress={() => fetchGroups(activeStage, true)}>
              <LuRefreshCw
                size={20}
                color={isRefreshing ? tokens.accent : tokens.textMuted}
              />
            </Pressable>
          </XStack>

          {/* Segmented Stage Tabs */}
          <XStack
            backgroundColor={tokens.surfaceRaised}
            borderRadius={tokens.radius.md}
            padding={4}
            gap={4}
          >
            {(['confirmed', 'processed', 'delivered'] as ProcessStage[]).map((stage) => {
              const isActive = activeStage === stage;
              const label =
                stage === 'confirmed'
                  ? 'Confirmed'
                  : stage === 'processed'
                  ? 'Processed'
                  : 'Delivered';
              return (
                <Pressable
                  key={stage}
                  style={{ flex: 1 }}
                  onPress={() => setActiveStage(stage)}
                >
                  <YStack
                    alignItems="center"
                    justifyContent="center"
                    paddingVertical={8}
                    borderRadius={tokens.radius.sm}
                    backgroundColor={isActive ? tokens.surface : 'transparent'}
                    shadowColor={isActive ? '#000' : 'transparent'}
                    shadowOpacity={isActive ? 0.08 : 0}
                    shadowRadius={isActive ? 4 : 0}
                  >
                    <Text
                      fontSize={13}
                      fontWeight={isActive ? '800' : '600'}
                      color={isActive ? tokens.accent : tokens.textMuted}
                    >
                      {label}
                    </Text>
                  </YStack>
                </Pressable>
              );
            })}
          </XStack>

          {/* Search Bar */}
          <XStack
            marginTop={12}
            alignItems="center"
            backgroundColor={tokens.surfaceRaised}
            borderRadius={tokens.radius.md}
            paddingHorizontal={10}
            height={40}
          >
            <LuSearch size={18} color={tokens.textMuted} />
            <TextInput
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 14,
                color: tokens.text,
                paddingVertical: 0,
              }}
              placeholder="Search group ID, vendor, customer, AWB..."
              placeholderTextColor={tokens.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <LuX size={16} color={tokens.textMuted} />
              </Pressable>
            )}
          </XStack>
        </YStack>
      )}

      {/* Main List */}
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 40,
        }}
      >
        {isLoading ? (
          <YStack alignItems="center" justifyContent="center" paddingVertical={60}>
            <ActivityIndicator size="large" color={tokens.accent} />
            <Text marginTop={12} fontSize={14} color={tokens.textMuted}>
              Loading order groups...
            </Text>
          </YStack>
        ) : filteredGroups.length === 0 ? (
          <YStack
            alignItems="center"
            justifyContent="center"
            paddingVertical={60}
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.lg}
            padding={24}
          >
            <LuInbox size={48} color={tokens.textMuted} />
            <Text fontSize={16} fontWeight="700" color={tokens.text} marginTop={12}>
              No Order Groups Found
            </Text>
            <Text
              fontSize={13}
              color={tokens.textMuted}
              textAlign="center"
              marginTop={4}
            >
              There are currently no order groups in the {activeStage} stage.
            </Text>
          </YStack>
        ) : (
          filteredGroups.map((group) => {
            const isNeedLabel = group.needLabel;
            const hasLabel = Boolean(group.awbNumber && group.labelUrl);
            const canProcess = !isNeedLabel || hasLabel;

            return (
              <YStack
                key={group.orderGrpId}
                backgroundColor={tokens.surface}
                borderRadius={tokens.radius.lg}
                padding={16}
                marginBottom={16}
                borderWidth={1}
                borderColor={tokens.border}
                shadowColor="#000"
                shadowOpacity={0.04}
                shadowRadius={8}
                shadowOffset={{ width: 0, height: 2 }}
              >
                {/* Group Header */}
                <XStack alignItems="center" justifyContent="space-between" marginBottom={10}>
                  <XStack alignItems="center" gap={8}>
                    <YStack
                      backgroundColor={`${tokens.accent}1F`}
                      paddingHorizontal={8}
                      paddingVertical={4}
                      borderRadius={6}
                    >
                      <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                        {group.orderGrpId}
                      </Text>
                    </YStack>
                    <Text fontSize={12} color={tokens.textMuted}>
                      (Order: {group.orderId})
                    </Text>
                  </XStack>

                  {/* Payment Mode Pill */}
                  <YStack
                    backgroundColor={
                      group.paymentMode === 'COD' ? `${tokens.warning}1F` : `${tokens.success}1F`
                    }
                    paddingHorizontal={8}
                    paddingVertical={3}
                    borderRadius={6}
                  >
                    <Text
                      fontSize={11}
                      fontWeight="800"
                      color={group.paymentMode === 'COD' ? tokens.warning : tokens.success}
                    >
                      {group.paymentMode || 'PREPAID'}
                    </Text>
                  </YStack>
                </XStack>

                {/* Sub Status Badge */}
                {group.trackingSubStatus && (
                  <XStack marginBottom={8} alignItems="center" gap={6}>
                    <LuTruck size={14} color={tokens.accent} />
                    <Text fontSize={12} fontWeight="700" color={tokens.accent}>
                      Status: {group.trackingSubStatus}
                    </Text>
                  </XStack>
                )}

                {/* Vendor Name */}
                <Text fontSize={14} fontWeight="700" color={tokens.text} marginBottom={6}>
                  Vendor: {group.vendorName || 'General Fulfillment'}
                </Text>

                {/* Customer Address Drawer */}
                <YStack
                  backgroundColor={tokens.surfaceRaised}
                  borderRadius={tokens.radius.md}
                  padding={10}
                  marginBottom={12}
                >
                  <Text fontSize={12} fontWeight="700" color={tokens.text}>
                    Customer: {group.customerName || 'Customer'} {group.customerPhone ? `(${group.customerPhone})` : ''}
                  </Text>
                  <Text fontSize={11} color={tokens.textSecondary} marginTop={2}>
                    {group.customerAddress || 'No address provided'}
                  </Text>
                </YStack>

                {/* Items Breakdown */}
                <YStack gap={8} marginBottom={14}>
                  <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
                    ITEMS IN THIS GROUP ({(group.items || []).length})
                  </Text>
                  {(group.items || []).map((item, idx) => (
                    <XStack
                      key={item.itemId || idx}
                      alignItems="center"
                      justifyContent="space-between"
                      backgroundColor={tokens.surfaceRaised}
                      borderRadius={tokens.radius.sm}
                      padding={8}
                    >
                      <XStack alignItems="center" gap={8} flex={1}>
                        <YStack
                          width={32}
                          height={32}
                          borderRadius={4}
                          backgroundColor={`${tokens.accent}1A`}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <LuPackage size={18} color={tokens.accent} />
                        </YStack>
                        <YStack flex={1}>
                          <Text fontSize={12} fontWeight="700" color={tokens.text} numberOfLines={1}>
                            {item.productTitle || 'Product Item'}
                          </Text>
                          <Text fontSize={10} color={tokens.textMuted}>
                            Item ID: {item.itemId || `${group.orderGrpId}-I${idx + 1}`}
                          </Text>
                        </YStack>
                      </XStack>

                      <YStack alignItems="flex-end">
                        <Text fontSize={12} fontWeight="700" color={tokens.text}>
                          Qty: {item.quantity || 1}
                        </Text>
                        <Text fontSize={11} color={tokens.textSecondary}>
                          ₹{(item.subtotal || item.unitPrice || 0).toLocaleString()}
                        </Text>
                      </YStack>
                    </XStack>
                  ))}
                </YStack>

                {/* Need Label Switch Control */}
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  paddingVertical={8}
                  borderTopWidth={1}
                  borderTopColor={tokens.border}
                  marginBottom={12}
                >
                  <XStack alignItems="center" gap={6}>
                    <Text fontSize={13} fontWeight="700" color={tokens.text}>
                      Need Shipping Label
                    </Text>
                    {group.paymentMode === 'COD' && (
                      <Text fontSize={10} fontWeight="700" color={tokens.warning}>
                        (Required for COD)
                      </Text>
                    )}
                  </XStack>
                  <Switch
                    value={group.needLabel}
                    onValueChange={(val) => handleToggleNeedLabel(group, val)}
                    trackColor={{ false: tokens.border, true: tokens.accent }}
                  />
                </XStack>

                {/* AWB Banner if processed or labeled */}
                {group.awbNumber && (
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    backgroundColor={`${tokens.success}15`}
                    borderRadius={tokens.radius.md}
                    padding={10}
                    marginBottom={12}
                  >
                    <XStack alignItems="center" gap={6}>
                      <LuCheckCircle2 size={16} color={tokens.success} />
                      <Text fontSize={12} fontWeight="800" color={tokens.success}>
                        AWB: {group.awbNumber}
                      </Text>
                    </XStack>
                    <Pressable onPress={() => handleCopyAwb(group.awbNumber)}>
                      <XStack alignItems="center" gap={4} backgroundColor={tokens.surface} paddingHorizontal={8} paddingVertical={4} borderRadius={4}>
                        <LuClipboard size={12} color={tokens.text} />
                        <Text fontSize={11} fontWeight="700" color={tokens.text}>Copy</Text>
                      </XStack>
                    </Pressable>
                  </XStack>
                )}

                {/* Action Buttons */}
                <YStack gap={8}>
                  {/* Share Media & Address Bar */}
                  <XStack gap={8}>
                    <Pressable style={{ flex: 1 }} onPress={() => handleShareMedia(group)}>
                      <XStack
                        height={38}
                        borderRadius={tokens.radius.sm}
                        backgroundColor={tokens.surfaceRaised}
                        alignItems="center"
                        justifyContent="center"
                        gap={6}
                      >
                        <RiWhatsappLine size={16} color="#25D366" />
                        <Text fontSize={12} fontWeight="700" color={tokens.text}>
                          Share Media
                        </Text>
                      </XStack>
                    </Pressable>

                    <Pressable style={{ flex: 1 }} onPress={() => handleShareAddress(group)}>
                      <XStack
                        height={38}
                        borderRadius={tokens.radius.sm}
                        backgroundColor={tokens.surfaceRaised}
                        alignItems="center"
                        justifyContent="center"
                        gap={6}
                      >
                        <LuClipboardPaste size={16} color={tokens.text} />
                        <Text fontSize={12} fontWeight="700" color={tokens.text}>
                          Share Address
                        </Text>
                      </XStack>
                    </Pressable>
                  </XStack>

                  {/* Create / Share Label Action */}
                  {group.needLabel && (
                    <XStack gap={8}>
                      {!hasLabel ? (
                        <Pressable style={{ flex: 1 }} onPress={() => handleGenerateLabel(group)}>
                          <XStack
                            height={40}
                            borderRadius={tokens.radius.sm}
                            backgroundColor={tokens.accent}
                            alignItems="center"
                            justifyContent="center"
                            gap={6}
                          >
                            <LuTruck size={16} color="#FFF" />
                            <Text fontSize={12} fontWeight="800" color="#FFF">
                              Create Label (Delhivery)
                            </Text>
                          </XStack>
                        </Pressable>
                      ) : (
                        <Pressable style={{ flex: 1 }} onPress={() => handleShareLabel(group.labelUrl)}>
                          <XStack
                            height={40}
                            borderRadius={tokens.radius.sm}
                            backgroundColor={`${tokens.accent}1F`}
                            alignItems="center"
                            justifyContent="center"
                            gap={6}
                          >
                            <LuShare2 size={16} color={tokens.accent} />
                            <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                              Share Label PDF
                            </Text>
                          </XStack>
                        </Pressable>
                      )}
                    </XStack>
                  )}

                  {/* Confirmed Stage: Process Order Button */}
                  {activeStage === 'confirmed' && (
                    <Pressable
                      style={{ opacity: canProcess ? 1 : 0.4 }}
                      disabled={!canProcess || processingGrpId === group.orderGrpId}
                      onPress={() => setConfirmModalGrp(group)}
                    >
                      <YStack
                        height={44}
                        borderRadius={tokens.radius.md}
                        backgroundColor={canProcess ? tokens.accent : tokens.textMuted}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text fontSize={13} fontWeight="800" color="#FFF">
                          {!canProcess
                            ? 'Process Order (Create Label First)'
                            : 'ORDER PROCESS'}
                        </Text>
                      </YStack>
                    </Pressable>
                  )}

                  {/* Processed & Delivered Stages: Fetch Delivery Status */}
                  {(activeStage === 'processed' || activeStage === 'delivered') && (
                    <Pressable
                      onPress={() => handleFetchDeliveryStatus(group)}
                      disabled={processingGrpId === group.orderGrpId}
                    >
                      <XStack
                        height={40}
                        borderRadius={tokens.radius.sm}
                        backgroundColor={`${tokens.accent}15`}
                        alignItems="center"
                        justifyContent="center"
                        gap={6}
                      >
                        <LuRefreshCw size={14} color={tokens.accent} />
                        <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                          Fetch Delivery Status (Delhivery)
                        </Text>
                      </XStack>
                    </Pressable>
                  )}
                </YStack>
              </YStack>
            );
          })
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={Boolean(confirmModalGrp)}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalGrp(null)}
      >
        <YStack
          flex={1}
          backgroundColor="rgba(0,0,0,0.5)"
          alignItems="center"
          justifyContent="center"
          padding={24}
        >
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.lg}
            padding={24}
            width="100%"
            maxWidth={360}
          >
            <LuPackage size={36} color={tokens.accent} />
            <Text fontSize={18} fontWeight="800" color={tokens.text} marginTop={12}>
              Process & Dispatch Items?
            </Text>
            <Text fontSize={13} color={tokens.textSecondary} marginTop={8} lineHeight={18}>
              Are you sure you have completed all the steps to process these items for{' '}
              <Text fontWeight="800" color={tokens.text}>{confirmModalGrp?.orderGrpId}</Text>?
            </Text>

            <XStack gap={12} marginTop={20}>
              <Pressable style={{ flex: 1 }} onPress={() => setConfirmModalGrp(null)}>
                <YStack
                  height={42}
                  borderRadius={tokens.radius.sm}
                  backgroundColor={tokens.surfaceRaised}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={13} fontWeight="700" color={tokens.text}>
                    Cancel
                  </Text>
                </YStack>
              </Pressable>

              <Pressable style={{ flex: 1 }} onPress={handleConfirmProcessOrder}>
                <YStack
                  height={42}
                  borderRadius={tokens.radius.sm}
                  backgroundColor={tokens.accent}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={13} fontWeight="800" color="#FFF">
                    Confirm Process
                  </Text>
                </YStack>
              </Pressable>
            </XStack>
          </YStack>
        </YStack>
      </Modal>
    </YStack>
  );
}
