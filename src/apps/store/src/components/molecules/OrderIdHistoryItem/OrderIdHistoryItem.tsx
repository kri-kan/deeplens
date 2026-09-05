import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { RiWhatsappFill, RiInstagramFill } from 'react-icons/ri';
import { LuCopy, LuCheck, LuPencil, LuTag } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { TimestampBadge } from '../../atoms/TimestampBadge';
import { StatusBadge } from '../../atoms/StatusBadge';

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
}

const WHATSAPP_GREEN = '#25D366';
const INSTAGRAM_PINK = '#E1306C';

export function OrderIdHistoryItem({
  item,
  onPress,
  onCopy,
  onEdit,
}: OrderIdHistoryItemProps) {
  const { tokens } = useTheme();
  const [copiedType, setCopiedType] = useState<'raw' | 'prefix' | null>(null);

  const isWhatsApp = item.source?.toLowerCase() === 'whatsapp';
  const isInstagram = item.source?.toLowerCase() === 'instagram';

  const contactHandle =
    item.customerPhone || item.instagramHandle || item.sourceHandle || '';

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

  return (
    <XStack
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.md}
      borderWidth={1}
      borderColor={tokens.border}
      paddingVertical={12}
      paddingHorizontal={14}
      alignItems="center"
      justifyContent="space-between"
      opacity={item.isDeleted ? 0.55 : 1}
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 1 }}
      shadowOpacity={0.03}
      shadowRadius={4}
    >
      {/* Left: Platform Icon & Order Details */}
      <XStack alignItems="center" gap={12} flex={1}>
        {/* Platform Circle Badge */}
        <XStack
          width={36}
          height={36}
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
            <RiWhatsappFill size={20} color={WHATSAPP_GREEN} />
          ) : isInstagram ? (
            <RiInstagramFill size={20} color={INSTAGRAM_PINK} />
          ) : (
            <LuTag size={18} color={tokens.textMuted} />
          )}
        </XStack>

        {/* Text Info */}
        <YStack gap={2} flex={1}>
          <XStack alignItems="center" gap={6} flexWrap="wrap">
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`View details for order ${item.id}`}
              onPress={() => onPress?.(item.id)}
              style={{ cursor: 'pointer' } as any}
            >
              <Text
                fontSize={15}
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
                paddingHorizontal={6}
                paddingVertical={2}
                borderRadius={tokens.radius.xs}
              >
                <Text fontSize={10} fontWeight="700" color={tokens.error}>
                  DELETED
                </Text>
              </XStack>
            )}

            {item.paymentMode && (
              <StatusBadge
                label={item.paymentMode.toUpperCase()}
                intent={item.paymentMode.toLowerCase() === 'cod' ? 'attention' : 'positive'}
                size="sm"
              />
            )}
          </XStack>

          {/* Subtitle: Handle + Relative Timestamp */}
          <XStack alignItems="center" gap={8} flexWrap="wrap">
            {contactHandle ? (
              <Text fontSize={12} color={tokens.text} fontWeight="500">
                {contactHandle}
              </Text>
            ) : null}
            {contactHandle && (
              <Text fontSize={11} color={tokens.textMuted}>
                •
              </Text>
            )}
            <TimestampBadge date={item.timestamp} compact size="sm" />
          </XStack>
        </YStack>
      </XStack>

      {/* Right: Actions */}
      <XStack alignItems="center" gap={6}>
        {/* Copy Raw ID */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy order ID ${item.id}`}
          onPress={() => handleCopy(false)}
          style={{ cursor: 'pointer' } as any}
        >
          <XStack
            padding={8}
            borderRadius={tokens.radius.sm}
            backgroundColor={copiedType === 'raw' ? `${tokens.success}18` : tokens.surfaceRaised}
            borderWidth={1}
            borderColor={copiedType === 'raw' ? tokens.success : tokens.border}
            alignItems="center"
            justifyContent="center"
          >
            {copiedType === 'raw' ? (
              <LuCheck size={16} color={tokens.success} />
            ) : (
              <LuCopy size={16} color={tokens.text} />
            )}
          </XStack>
        </Pressable>

        {/* Copy with Prefix */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy order ID ${item.id} with prefix`}
          onPress={() => handleCopy(true)}
          style={{ cursor: 'pointer' } as any}
        >
          <XStack
            padding={8}
            borderRadius={tokens.radius.sm}
            backgroundColor={copiedType === 'prefix' ? `${tokens.success}18` : tokens.surfaceRaised}
            borderWidth={1}
            borderColor={copiedType === 'prefix' ? tokens.success : tokens.accent}
            alignItems="center"
            justifyContent="center"
          >
            {copiedType === 'prefix' ? (
              <LuCheck size={16} color={tokens.success} />
            ) : (
              <LuTag size={16} color={tokens.accent} />
            )}
          </XStack>
        </Pressable>

        {/* Edit Button */}
        {!item.isDeleted && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit order ${item.id}`}
            onPress={() => onEdit?.(item.id)}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              padding={8}
              borderRadius={tokens.radius.sm}
              backgroundColor={tokens.surfaceRaised}
              borderWidth={1}
              borderColor={tokens.border}
              alignItems="center"
              justifyContent="center"
            >
              <LuPencil size={16} color={tokens.textMuted} />
            </XStack>
          </Pressable>
        )}
      </XStack>
    </XStack>
  );
}
