import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { RiWhatsappFill, RiInstagramFill } from '@/components/tamagui-ui/icons/ri';
import {
  LuPackage,
  LuTruck,
  LuTriangleAlert,
  LuUser,
  LuTag,
  LuChevronRight,
  LuCheck,
} from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { TimestampBadge } from '../../atoms/TimestampBadge';
import { StatusBadge } from '../../atoms/StatusBadge';
import { evaluateNoLabelSla } from '@/utils/noLabelSla';

export interface PackageSummary {
  id: string;
  packageNumber: number;
  vendorName: string;
  awbNumber?: string;
  isNdr?: boolean;
  fulfillmentPath?: 'DirectVendor' | 'ProcureToShip' | 'CentralHubStock' | string;
  procurementStage?: string;
}

export interface LogisticsOrderCardData {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  shippingCity: string;
  shippingState: string;
  source: 'WhatsApp' | 'Instagram' | 'Web' | 'Manual' | string;
  paymentMode: 'COD' | 'Prepaid' | string;
  totalOrderValue: number;
  totalCodBalance?: number;
  orderDate: string | Date;
  placedAt?: string | Date;
  hasLabel?: boolean;
  status: string;
  totalItemsCount: number;
  packages: PackageSummary[];
  hasNdr?: boolean;
}

export interface LogisticsOrderCardProps {
  order: LogisticsOrderCardData;
  onPressDetails?: (orderId: string) => void;
  onPressFulfillment?: (orderId: string) => void;
  onPressResolveNdr?: (orderId: string) => void;
  onPressMarkInTransit?: (orderId: string) => void;
  onPressMarkDelivered?: (orderId: string) => void;
  onPressFlagIssue?: (orderId: string) => void;
}

const WHATSAPP_GREEN = '#25D366';
const INSTAGRAM_PINK = '#E1306C';

export function LogisticsOrderCard({
  order,
  onPressDetails,
  onPressFulfillment,
  onPressResolveNdr,
  onPressMarkInTransit,
  onPressMarkDelivered,
  onPressFlagIssue,
}: LogisticsOrderCardProps) {
  const { tokens } = useTheme();

  const isCod = order.paymentMode?.toLowerCase() === 'cod';
  const isWhatsApp = order.source?.toLowerCase() === 'whatsapp';
  const isInstagram = order.source?.toLowerCase() === 'instagram';
  const hasNdr = order.hasNdr || order.status === 'NdrActionNeeded';

  // Evaluate SLA for no-label orders (3-day dispatch & 12-day delivery)
  const slaResult = evaluateNoLabelSla(order);
  const isOverdue = slaResult.isOverdue;
  const isRedBox = hasNdr || isOverdue;

  return (
    <YStack
      backgroundColor={isOverdue ? `${tokens.error}05` : tokens.surface}
      borderRadius={tokens.radius.lg}
      borderWidth={isRedBox ? 2 : 1.5}
      borderColor={isRedBox ? tokens.error : tokens.border}
      padding={14}
      gap={12}
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={isRedBox ? 0.12 : 0.03}
      shadowRadius={8}
    >
      {/* Top Header: Order ID + Source Badge + Date + Payment Pill */}
      <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={8}>
        {/* Left: ID + Platform + Timestamp */}
        <XStack alignItems="center" gap={8}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`View details for order ${order.orderNumber}`}
            onPress={() => onPressDetails?.(order.id)}
          >
            <Text
              fontSize={15}
              fontWeight="800"
              color={tokens.accent}
              letterSpacing={0.3}
            >
              {order.orderNumber.startsWith('#') ? order.orderNumber : `#${order.orderNumber}`}
            </Text>
          </Pressable>

          {/* Source Badge */}
          <XStack
            paddingHorizontal={6}
            paddingVertical={2}
            borderRadius={tokens.radius.full}
            backgroundColor={
              isWhatsApp
                ? `${WHATSAPP_GREEN}18`
                : isInstagram
                ? `${INSTAGRAM_PINK}18`
                : tokens.surfaceRaised
            }
            alignItems="center"
            gap={4}
          >
            {isWhatsApp ? (
              <RiWhatsappFill size={13} color={WHATSAPP_GREEN} />
            ) : isInstagram ? (
              <RiInstagramFill size={13} color={INSTAGRAM_PINK} />
            ) : (
              <LuTag size={12} color={tokens.textMuted} />
            )}
            <Text
              fontSize={10}
              fontWeight="700"
              color={
                isWhatsApp
                  ? WHATSAPP_GREEN
                  : isInstagram
                  ? INSTAGRAM_PINK
                  : tokens.textMuted
              }
            >
              {order.source}
            </Text>
          </XStack>

          {/* Timestamp */}
          <TimestampBadge date={order.orderDate} compact size="sm" />
        </XStack>

        {/* Right: Payment & Amount */}
        <XStack alignItems="center" gap={8}>
          <StatusBadge
            label={isCod ? `COD: ₹${order.totalCodBalance ?? order.totalOrderValue}` : 'Prepaid'}
            intent={isCod ? 'attention' : 'positive'}
            size="sm"
          />
          <Text fontSize={13} fontWeight="800" color={tokens.text}>
            ₹{order.totalOrderValue.toLocaleString('en-IN')}
          </Text>
        </XStack>
      </XStack>

      {/* Divider */}
      <YStack height={1} backgroundColor={tokens.border} />

      {/* Customer Row */}
      <XStack alignItems="center" gap={10}>
        <XStack
          width={34}
          height={34}
          borderRadius={tokens.radius.full}
          backgroundColor={tokens.surfaceRaised}
          alignItems="center"
          justifyContent="center"
        >
          <LuUser size={16} color={tokens.accent} />
        </XStack>
        <YStack gap={1} flex={1}>
          <Text fontSize={13} fontWeight="700" color={tokens.text}>
            {order.customerName}
          </Text>
          <Text fontSize={11} color={tokens.textMuted}>
            {order.customerPhone} • {order.shippingCity}, {order.shippingState}
          </Text>
        </YStack>
      </XStack>

      {/* Packages & Routing */}
      {order.packages && order.packages.length > 0 && (
        <YStack gap={6}>
          <Text fontSize={10} fontWeight="700" color={tokens.textMuted} letterSpacing={0.5}>
            PACKAGES ({order.packages.length}):
          </Text>
          <XStack flexWrap="wrap" gap={6}>
            {order.packages.map((pkg) => {
              const pkgIsNdr = pkg.isNdr;
              const hasAwb = !!pkg.awbNumber;
              return (
                <XStack
                  key={pkg.id}
                  paddingVertical={4}
                  paddingHorizontal={8}
                  borderRadius={tokens.radius.sm}
                  borderWidth={1}
                  borderColor={
                    pkgIsNdr ? tokens.error : hasAwb ? tokens.success : tokens.border
                  }
                  backgroundColor={
                    pkgIsNdr
                      ? `${tokens.error}10`
                      : hasAwb
                      ? `${tokens.success}10`
                      : tokens.surfaceRaised
                  }
                  alignItems="center"
                  gap={5}
                >
                  <LuPackage
                    size={13}
                    color={
                      pkgIsNdr
                        ? tokens.error
                        : hasAwb
                        ? tokens.success
                        : tokens.textMuted
                    }
                  />
                  <Text
                    fontSize={11}
                    fontWeight="600"
                    color={
                      pkgIsNdr
                        ? tokens.error
                        : hasAwb
                        ? tokens.success
                        : tokens.text
                    }
                  >
                    Pkg #{pkg.packageNumber}: {pkg.vendorName}
                    {pkg.awbNumber ? ` (${pkg.awbNumber})` : ''}
                  </Text>
                </XStack>
              );
            })}
          </XStack>
        </YStack>
      )}

      {/* NDR Exception Alert Banner */}
      {hasNdr && (
        <XStack
          backgroundColor={`${tokens.error}14`}
          borderRadius={tokens.radius.md}
          borderWidth={1}
          borderColor={tokens.error}
          padding={10}
          alignItems="center"
          justifyContent="space-between"
          gap={10}
        >
          <XStack alignItems="center" gap={8} flex={1}>
            <LuTriangleAlert size={18} color={tokens.error} />
            <YStack gap={1} flex={1}>
              <Text fontSize={12} fontWeight="700" color={tokens.error}>
                NDR Exception Raised!
              </Text>
              <Text fontSize={11} color={tokens.textMuted} numberOfLines={1}>
                Buyer unreachable or delivery rescheduled
              </Text>
            </YStack>
          </XStack>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Resolve NDR for order ${order.orderNumber}`}
            onPress={() => onPressResolveNdr?.(order.id)}
          >
            <XStack
              paddingVertical={6}
              paddingHorizontal={12}
              borderRadius={tokens.radius.sm}
              backgroundColor={tokens.error}
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={11} fontWeight="700" color="#fff">
                Resolve
              </Text>
            </XStack>
          </Pressable>
        </XStack>
      )}

      {/* No-Label Overdue Dispatch Alert (>= 3 days in Ready to Ship) */}
      {!hasNdr && slaResult.isOverdue && slaResult.type === 'DISPATCH_OVERDUE' && (
        <XStack
          backgroundColor={`${tokens.error}14`}
          borderRadius={tokens.radius.md}
          borderWidth={1}
          borderColor={tokens.error}
          padding={10}
          alignItems="center"
          justifyContent="space-between"
          gap={10}
          flexWrap="wrap"
        >
          <XStack alignItems="center" gap={8} flex={1} minWidth={200}>
            <LuTriangleAlert size={18} color={tokens.error} />
            <YStack gap={1} flex={1}>
              <Text fontSize={12} fontWeight="800" color={tokens.error}>
                OVERDUE DISPATCH (Day {slaResult.daysElapsed} since Placed)
              </Text>
              <Text fontSize={11} color={tokens.textMuted}>
                Vendor has not confirmed dispatch. Please verify offline.
              </Text>
            </YStack>
          </XStack>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mark order ${order.orderNumber} in transit`}
            onPress={() => onPressMarkInTransit?.(order.id)}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              paddingVertical={6}
              paddingHorizontal={12}
              borderRadius={tokens.radius.sm}
              backgroundColor={tokens.error}
              alignItems="center"
              justifyContent="center"
              gap={6}
            >
              <LuTruck size={14} color="#fff" />
              <Text fontSize={11} fontWeight="800" color="#fff">
                Mark In Transit
              </Text>
            </XStack>
          </Pressable>
        </XStack>
      )}

      {/* No-Label Overdue Delivery Alert (>= 12 days since placed, still In Transit) */}
      {!hasNdr && slaResult.isOverdue && slaResult.type === 'DELIVERY_OVERDUE' && (
        <XStack
          backgroundColor={`${tokens.error}14`}
          borderRadius={tokens.radius.md}
          borderWidth={1}
          borderColor={tokens.error}
          padding={10}
          alignItems="center"
          justifyContent="space-between"
          gap={10}
          flexWrap="wrap"
        >
          <XStack alignItems="center" gap={8} flex={1} minWidth={200}>
            <LuTriangleAlert size={18} color={tokens.error} />
            <YStack gap={1} flex={1}>
              <Text fontSize={12} fontWeight="800" color={tokens.error}>
                OVERDUE DELIVERY (Day {slaResult.daysElapsed} since Placed)
              </Text>
              <Text fontSize={11} color={tokens.textMuted}>
                In transit for {slaResult.daysElapsed} days. Verify delivery with buyer.
              </Text>
            </YStack>
          </XStack>

          <XStack alignItems="center" gap={8}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Flag issue for order ${order.orderNumber}`}
              onPress={() => onPressFlagIssue?.(order.id)}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                paddingVertical={6}
                paddingHorizontal={10}
                borderRadius={tokens.radius.sm}
                borderWidth={1}
                borderColor={tokens.error}
                backgroundColor={tokens.surface}
                alignItems="center"
                justifyContent="center"
                gap={4}
              >
                <LuTriangleAlert size={13} color={tokens.error} />
                <Text fontSize={11} fontWeight="700" color={tokens.error}>
                  Flag Issue / NDR
                </Text>
              </XStack>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mark order ${order.orderNumber} delivered`}
              onPress={() => onPressMarkDelivered?.(order.id)}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                paddingVertical={6}
                paddingHorizontal={12}
                borderRadius={tokens.radius.sm}
                backgroundColor={tokens.success}
                alignItems="center"
                justifyContent="center"
                gap={4}
              >
                <LuCheck size={14} color="#fff" />
                <Text fontSize={11} fontWeight="800" color="#fff">
                  Mark Delivered
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        </XStack>
      )}

      {/* Bottom Actions Row: Item Count + Fulfillment Hub Button */}
      <XStack alignItems="center" justifyContent="space-between" paddingTop={2}>
        <XStack
          paddingVertical={4}
          paddingHorizontal={8}
          borderRadius={tokens.radius.sm}
          backgroundColor={tokens.surfaceRaised}
        >
          <Text fontSize={11} fontWeight="600" color={tokens.textMuted}>
            {order.totalItemsCount} item{order.totalItemsCount === 1 ? '' : 's'}
          </Text>
        </XStack>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open fulfillment hub for order ${order.orderNumber}`}
          onPress={() => onPressFulfillment?.(order.id)}
        >
          <XStack
            alignItems="center"
            gap={6}
            paddingVertical={8}
            paddingHorizontal={14}
            borderRadius={tokens.radius.md}
            backgroundColor={tokens.accent}
          >
            <LuTruck size={14} color={tokens.surface} />
            <Text fontSize={12} fontWeight="700" color={tokens.surface}>
              Fulfillment Hub
            </Text>
            <LuChevronRight size={14} color={tokens.surface} />
          </XStack>
        </Pressable>
      </XStack>
    </YStack>
  );
}
