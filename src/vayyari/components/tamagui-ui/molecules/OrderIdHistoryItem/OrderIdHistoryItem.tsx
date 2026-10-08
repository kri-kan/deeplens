import React, { useState } from 'react';
import { Pressable, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { RiWhatsappFill, RiInstagramFill } from '../../icons/ri';
import { LuCopy, LuCheck, LuPencil, LuTag } from '../../icons/lu';
import { useTheme } from '@/theme';
import { TimestampBadge } from '../../atoms/TimestampBadge';
import { StatusBadge } from '../../atoms/StatusBadge';
import { openPlatformHandle, formatDisplayHandle } from '@/utils/platformLink';

export interface OrderIdHistoryEntry {
  id: string;
  source: 'whatsapp' | 'instagram' | string;
  paymentMode?: 'cod' | 'prepaid' | string | null;
  timestamp: string | Date;
  sourceHandle?: string;
  customerPhone?: string;
  instagramHandle?: string;
  isDeleted?: boolean;
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

          {/* Subtitle: Handle (Clean formatted handle) */}
          {displayHandle ? (
            <XStack alignItems="center" gap={8} flexWrap="nowrap">
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
            </XStack>
          ) : null}
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
