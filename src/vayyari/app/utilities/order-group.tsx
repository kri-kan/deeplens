import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, Text } from 'tamagui';
import { useTheme } from '@/theme';
import { searchApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { OrderIdEntry } from '@/types/orders';
import { OrderItem } from '@/components/tamagui-ui/organisms/ProductListSection';
import { GroupManagementView } from '@/components/tamagui-ui/organisms/GroupManagementView';

export default function OrderGroupScreen() {
  const { orderId, groupKey } = useLocalSearchParams<{
    orderId: string;
    groupKey: string;
  }>();
  const router = useRouter();
  const { tokens } = useTheme();

  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<OrderIdEntry | null>(null);
  const [groupStages, setGroupStages] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;
      try {
        setLoading(true);
        const data = await searchApiClient.get<OrderIdEntry>(API_ROUTES.ORDERS.GET_BY_ID(orderId));
        setOrderData(data);

        const initialStages: Record<string, string> = {};
        if (data.groups) {
          data.groups.forEach((g) => {
            const raw = (g.vendorName || '').trim();
            const isUn = !raw || raw.toLowerCase() === 'unassigned' || raw.toLowerCase() === 'none';
            const k = isUn ? 'Unassigned' : raw;
            initialStages[k] = g.status || 'Unconfirmed';
          });
        }
        setGroupStages(initialStages);
      } catch (err: any) {
        console.error('Failed to load group details:', err);
        Alert.alert('Load Error', err?.message || 'Could not load package details.');
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <YStack
        flex={1}
        backgroundColor={tokens.background}
        alignItems="center"
        justifyContent="center"
        gap={12}
      >
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text fontSize={13} color={tokens.textMuted}>
          Loading package group…
        </Text>
      </YStack>
    );
  }

  if (!orderData) {
    return (
      <YStack
        flex={1}
        backgroundColor={tokens.background}
        alignItems="center"
        justifyContent="center"
        padding={20}
        gap={8}
      >
        <Text fontSize={15} fontWeight="700" color={tokens.text}>
          Package not found
        </Text>
        <Text fontSize={12} color={tokens.textMuted}>
          Order #{orderId} could not be loaded.
        </Text>
      </YStack>
    );
  }

  const effectiveGroupKey = groupKey || 'Unassigned';
  const isUnassigned =
    effectiveGroupKey.toLowerCase() === 'unassigned' || effectiveGroupKey.toLowerCase() === 'none';

  // Group items
  const items: OrderItem[] = (orderData.items || [])
    .filter((it: any) => {
      const v = (it.vendorName || it.vendor || '').trim();
      const isItemUnassigned = !v || v.toLowerCase() === 'unassigned' || v.toLowerCase() === 'none';
      return isUnassigned ? isItemUnassigned : v.toLowerCase() === effectiveGroupKey.toLowerCase();
    })
    .map((it: any) => ({
      id: it.id || it.itemId,
      productId: it.productId,
      title: it.productTitle || it.title || 'Product Item',
      quantity: it.quantity || 1,
      costPerPiece: it.unitPrice || it.costPerPiece || 0,
      subtotal: it.subtotal,
      vendor: it.vendorName || it.vendor,
      photoUri: it.catalogImageUrl || it.image,
    }));

  const groupInfo = orderData.groups?.find((g) => {
    const raw = (g.vendorName || '').trim();
    const isGUnassigned = !raw || raw.toLowerCase() === 'unassigned' || raw.toLowerCase() === 'none';
    return isUnassigned ? isGUnassigned : raw.toLowerCase() === effectiveGroupKey.toLowerCase();
  });

  const currentStage = groupStages[effectiveGroupKey] || groupInfo?.status || 'Unconfirmed';
  const isCod = orderData.paymentMode?.toLowerCase() === 'cod';

  const handleUpdateStage = async (newStage: string) => {
    setGroupStages((prev) => ({ ...prev, [effectiveGroupKey]: newStage }));
    try {
      if (groupInfo?.orderGrpId) {
        await searchApiClient.patch(`/api/v1/orderid/groups/${groupInfo.orderGrpId}/status`, {
          status: newStage,
        });
      }
    } catch (err: any) {
      console.error('Failed to update group stage:', err);
    }
  };

  return (
    <GroupManagementView
      orderId={orderId || ''}
      orderGrpId={groupInfo?.orderGrpId}
      vendorName={effectiveGroupKey}
      isUnassigned={isUnassigned}
      currentStage={currentStage}
      isCod={isCod}
      needLabel={groupInfo?.needLabel ?? isCod}
      awbNumber={groupInfo?.awbNumber}
      labelUrl={groupInfo?.labelUrl}
      items={items}
      onUpdateStage={handleUpdateStage}
      onBack={() => router.back()}
    />
  );
}
