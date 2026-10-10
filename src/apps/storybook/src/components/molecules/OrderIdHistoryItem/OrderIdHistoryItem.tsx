import React, { useState, useRef, useEffect } from 'react';
import { Pressable, TouchableOpacity, Animated, Platform } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { RiWhatsappFill, RiInstagramFill } from 'react-icons/ri';
import { LuCopy, LuCheck, LuPencil, LuTag } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { TimestampBadge } from '../../atoms/TimestampBadge';
import { StatusBadge } from '../../atoms/StatusBadge';
import { openPlatformHandle, formatDisplayHandle } from '../../../utils/platformLink';

export interface OrderGroupSummary {
  orderGrpId?: string;
  vendorId?: string;
  vendorName?: string;
  status?: string;
  updatedAt?: string | Date;
  createdAt?: string | Date;
}

export interface OrderIdHistoryEntry {
  id: string;
  source: 'whatsapp' | 'instagram' | string;
  paymentMode?: 'cod' | 'prepaid' | string | null;
  status?: string;
  stageTag?: string;
  groups?: OrderGroupSummary[];
  timestamp: string | Date;
  sourceHandle?: string;
  customerPhone?: string;
  instagramHandle?: string;
  isDeleted?: boolean;
}

export function computeOrderStageInfo(item: {
  status?: string;
  stageTag?: string;
  groups?: OrderGroupSummary[];
}): {
  displayTag: string;
  primaryStage: string;
  intent: 'attention' | 'positive' | 'critical' | 'info';
  isMultiple: boolean;
  additionalCount: number;
} {
  const getStageIntent = (stage: string): 'attention' | 'positive' | 'critical' | 'info' => {
    const s = (stage || '').toLowerCase();
    if (s === 'delivered') return 'positive';
    if (s === 'cancelled') return 'critical';
    if (s === 'confirmed' || s === 'processing') return 'info';
    return 'attention';
  };

  if (item.stageTag && item.stageTag.trim()) {
    const rawTag = item.stageTag.trim();
    const parts = rawTag.split('+');
    const baseStage = parts[0].trim();
    const isMulti = parts.length > 1;
    const addCount = isMulti ? parseInt(parts[1].trim(), 10) || 0 : 0;
    return {
      displayTag: rawTag.toUpperCase(),
      primaryStage: baseStage,
      intent: getStageIntent(baseStage),
      isMultiple: isMulti,
      additionalCount: addCount,
    };
  }

  if (item.groups && item.groups.length > 0) {
    if (item.groups.length === 1) {
      const stage = (item.groups[0].status || 'Unconfirmed').trim();
      return {
        displayTag: stage.toUpperCase(),
        primaryStage: stage,
        intent: getStageIntent(stage),
        isMultiple: false,
        additionalCount: 0,
      };
    }

    const distinct = Array.from(
      new Set(item.groups.map((g) => (g.status || 'unconfirmed').trim().toLowerCase()))
    );

    if (distinct.length === 1) {
      const stage = item.groups[0].status || 'Unconfirmed';
      return {
        displayTag: stage.toUpperCase(),
        primaryStage: stage,
        intent: getStageIntent(stage),
        isMultiple: false,
        additionalCount: 0,
      };
    }

    const sorted = [...item.groups].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const latest = sorted[0];
    const latestStage = (latest.status || 'Unconfirmed').trim();
    const addCount = item.groups.length - 1;

    return {
      displayTag: `${latestStage.toUpperCase()} +${addCount}`,
      primaryStage: latestStage,
      intent: getStageIntent(latestStage),
      isMultiple: true,
      additionalCount: addCount,
    };
  }

  const fallback = (item.status || 'Unconfirmed').trim();
  return {
    displayTag: fallback.toUpperCase(),
    primaryStage: fallback,
    intent: getStageIntent(fallback),
    isMultiple: false,
    additionalCount: 0,
  };
}

export interface OrderIdHistoryItemProps {
  item: OrderIdHistoryEntry;
  onPress?: (id: string) => void;
  onCopy?: (id: string, includePrefix?: boolean) => void;
  onEdit?: (id: string) => void;
  onOpenPlatform?: (source: string, handle?: string) => void;
}

const WHATSAPP_GREEN = '#25D366';
const INSTAGRAM_PINK = '#E1306C';

export function OrderIdHistoryItem({
  item,
  onPress,
  onCopy,
  onEdit,
  onOpenPlatform,
}: OrderIdHistoryItemProps) {
  const { tokens } = useTheme();
  const [copiedType, setCopiedType] = useState<'raw' | 'prefix' | null>(null);
  const stageInfo = computeOrderStageInfo(item);

  const isWhatsApp = item.source?.toLowerCase() === 'whatsapp';
  const isInstagram = item.source?.toLowerCase() === 'instagram';

  const contactHandle =
    item.customerPhone || item.instagramHandle || item.sourceHandle || '';
  const displayHandle = formatDisplayHandle(item.source, contactHandle);

  const handleCopy = (includePrefix: boolean) => {
    const type = includePrefix ? 'prefix' : 'raw';
    setCopiedType(type);
    if (onCopy) {
      onCopy(item.id, includePrefix);
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const text = includePrefix ? `order id # ${item.id}` : item.id;
      navigator.clipboard.writeText(text);
    }
    setTimeout(() => {
      setCopiedType(null);
    }, 1500);
  };

  const handleOpenPlatform = () => {
    if (onOpenPlatform) {
      onOpenPlatform(item.source, contactHandle);
    } else {
      openPlatformHandle(item.source, contactHandle);
    }
  };

  return (
    <XStack
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.md}
      borderWidth={1}
      borderColor={tokens.border}
      paddingVertical={10}
      paddingHorizontal={12}
      alignItems="center"
      justifyContent="space-between"
      opacity={item.isDeleted ? 0.55 : 1}
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 1 }}
      shadowOpacity={0.03}
      shadowRadius={4}
    >
      {/* Left: Platform Icon & Order Details */}
      <XStack alignItems="center" gap={8} flex={1} minWidth={0}>
        {/* Platform Circle Badge (Clickable Deep-Link) */}
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="link"
          accessibilityLabel={`Open ${item.source} chat or profile`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={handleOpenPlatform}
          style={{ cursor: 'pointer' } as any}
        >
          <XStack
            width={32}
            height={32}
            borderRadius={tokens.radius.full}
            backgroundColor={
              isWhatsApp
                ? `${WHATSAPP_GREEN}18`
                : isInstagram
                ? `${INSTAGRAM_PINK}18`
                : tokens.surfaceRaised
            }
            alignItems="center"
            justifyContent="center"
          >
            {isWhatsApp ? (
              <RiWhatsappFill size={18} color={WHATSAPP_GREEN} />
            ) : isInstagram ? (
              <RiInstagramFill size={18} color={INSTAGRAM_PINK} />
            ) : (
              <LuTag size={16} color={tokens.textMuted} />
            )}
          </XStack>
        </TouchableOpacity>

        {/* Text Info */}
        <YStack gap={2} flex={1} minWidth={0}>
          <XStack alignItems="center" gap={5} flexWrap="nowrap">
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`View details for order ${item.id}`}
              onPress={() => onPress?.(item.id)}
              style={{ cursor: 'pointer' } as any}
            >
              <Text
                fontSize={14}
                fontWeight="800"
                color={tokens.accent}
                letterSpacing={0.3}
              >
                #{item.id}
              </Text>
            </Pressable>

            {item.isDeleted && (
              <XStack
                backgroundColor={`${tokens.error}18`}
                paddingHorizontal={5}
                paddingVertical={2}
                borderRadius={tokens.radius.xs}
              >
                <Text fontSize={9} fontWeight="700" color={tokens.error}>
                  DELETED
                </Text>
              </XStack>
            )}

            {item.paymentMode && (
              <StatusBadge
                label={item.paymentMode.toLowerCase() === 'prepaid' ? 'PAID' : item.paymentMode.toUpperCase()}
                intent={item.paymentMode.toLowerCase() === 'cod' ? 'attention' : 'positive'}
                size="sm"
              />
            )}

            <TimestampBadge date={item.timestamp} compact size="sm" />
          </XStack>

          {/* Subtitle / Second Line: Handle (WhatsApp/Insta link) + Stage/Status Tag */}
          <XStack alignItems="center" gap={8} flexWrap="nowrap">
            {displayHandle ? (
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel={`Open ${displayHandle} on ${item.source}`}
                onPress={handleOpenPlatform}
                style={{ cursor: 'pointer' } as any}
              >
                <Text
                  fontSize={12}
                  color={tokens.text}
                  fontWeight="600"
                  textDecorationLine="underline"
                  textDecorationColor={`${tokens.text}33`}
                  numberOfLines={1}
                >
                  {displayHandle}
                </Text>
              </TouchableOpacity>
            ) : null}

            {!!stageInfo.displayTag && (
              <StatusBadge
                label={stageInfo.displayTag}
                intent={stageInfo.intent}
                size="sm"
              />
            )}
          </XStack>
        </YStack>
      </XStack>

      {/* Right: Actions */}
      <XStack alignItems="center" gap={4} flexShrink={0}>
        {/* Copy Raw ID */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy order ID ${item.id}`}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          onPress={() => handleCopy(false)}
          style={{ cursor: 'pointer' } as any}
        >
          <XStack
            width={28}
            height={28}
            borderRadius={tokens.radius.sm}
            backgroundColor={copiedType === 'raw' ? `${tokens.success}18` : tokens.surfaceRaised}
            borderWidth={1}
            borderColor={copiedType === 'raw' ? tokens.success : tokens.border}
            alignItems="center"
            justifyContent="center"
          >
            {copiedType === 'raw' ? (
              <LuCheck size={14} color={tokens.success} />
            ) : (
              <LuCopy size={14} color={tokens.text} />
            )}
          </XStack>
        </Pressable>

        {/* Copy with Prefix */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy order ID ${item.id} with prefix`}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          onPress={() => handleCopy(true)}
          style={{ cursor: 'pointer' } as any}
        >
          <XStack
            width={28}
            height={28}
            borderRadius={tokens.radius.sm}
            backgroundColor={copiedType === 'prefix' ? `${tokens.success}18` : tokens.surfaceRaised}
            borderWidth={1}
            borderColor={copiedType === 'prefix' ? tokens.success : tokens.accent}
            alignItems="center"
            justifyContent="center"
          >
            {copiedType === 'prefix' ? (
              <LuCheck size={14} color={tokens.success} />
            ) : (
              <LuTag size={14} color={tokens.accent} />
            )}
          </XStack>
        </Pressable>

        {/* Edit Button */}
        {!item.isDeleted && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit order ${item.id}`}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            onPress={() => onEdit?.(item.id)}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              width={28}
              height={28}
              borderRadius={tokens.radius.sm}
              backgroundColor={tokens.surfaceRaised}
              borderWidth={1}
              borderColor={tokens.border}
              alignItems="center"
              justifyContent="center"
            >
              <LuPencil size={14} color={tokens.textMuted} />
            </XStack>
          </Pressable>
        )}
      </XStack>
    </XStack>
  );
}

/**
 * Animated Shimmer Skeleton for an individual Order ID History Card.
 * Mirrors the exact visual structure, dimensions, and paddings of OrderIdHistoryItem.
 */
export function OrderIdHistoryItemShimmer({ tokens: customTokens }: { tokens?: any } = {}) {
  const { tokens: themeTokens } = useTheme();
  const tokens = customTokens || themeTokens;
  const shimmerOpacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerOpacity, {
          toValue: 0.85,
          duration: 650,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shimmerOpacity, {
          toValue: 0.35,
          duration: 650,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerOpacity]);

  return (
    <Animated.View style={{ opacity: shimmerOpacity, width: '100%' }}>
      <XStack
        backgroundColor={tokens.surface}
        borderRadius={tokens.radius.md}
        borderWidth={1}
        borderColor={tokens.border}
        paddingVertical={10}
        paddingHorizontal={12}
        alignItems="center"
        justifyContent="space-between"
      >
        {/* Left: Platform Icon Badge & Order Details */}
        <XStack alignItems="center" gap={8} flex={1} minWidth={0}>
          {/* Platform Icon Badge Placeholder (32x32 circle) */}
          <YStack
            width={32}
            height={32}
            borderRadius={tokens.radius.full}
            backgroundColor={tokens.surfaceRaised}
          />

          {/* Text Info */}
          <YStack gap={6} flex={1} minWidth={0}>
            {/* Top row: Order ID, Status, Timestamp pills */}
            <XStack alignItems="center" gap={6}>
              {/* Order ID Pill */}
              <YStack
                width={68}
                height={16}
                borderRadius={tokens.radius.xs}
                backgroundColor={tokens.surfaceRaised}
              />
              {/* Status Badge Pill */}
              <YStack
                width={42}
                height={14}
                borderRadius={tokens.radius.xs}
                backgroundColor={tokens.surfaceRaised}
              />
              {/* Timestamp Badge Pill */}
              <YStack
                width={52}
                height={14}
                borderRadius={tokens.radius.xs}
                backgroundColor={tokens.surfaceRaised}
              />
            </XStack>

            {/* Bottom row: Contact handle / phone */}
            <YStack
              width="60%"
              height={12}
              borderRadius={tokens.radius.xs}
              backgroundColor={tokens.surfaceRaised}
            />
          </YStack>
        </XStack>

        {/* Right: Actions placeholders */}
        <XStack alignItems="center" gap={4} flexShrink={0}>
          {/* Action 1 (Copy raw) */}
          <YStack
            width={28}
            height={28}
            borderRadius={tokens.radius.sm}
            backgroundColor={tokens.surfaceRaised}
          />
          {/* Action 2 (Copy prefix) */}
          <YStack
            width={28}
            height={28}
            borderRadius={tokens.radius.sm}
            backgroundColor={tokens.surfaceRaised}
          />
          {/* Action 3 (Edit) */}
          <YStack
            width={28}
            height={28}
            borderRadius={tokens.radius.sm}
            backgroundColor={tokens.surfaceRaised}
          />
        </XStack>
      </XStack>
    </Animated.View>
  );
}

/**
 * Animated Shimmer List for Order ID History.
 * Renders multiple placeholder items in a vertical stack.
 */
export function OrderIdHistoryListShimmer({
  count = 5,
  gap = 10,
  tokens,
}: {
  count?: number;
  gap?: number;
  tokens?: any;
}) {
  return (
    <YStack gap={gap} width="100%">
      {Array.from({ length: count }).map((_, index) => (
        <OrderIdHistoryItemShimmer key={`order-history-shimmer-${index}`} tokens={tokens} />
      ))}
    </YStack>
  );
}

