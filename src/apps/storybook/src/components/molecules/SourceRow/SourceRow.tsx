import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { RiWhatsappFill, RiInstagramLine } from 'react-icons/ri';
import { LuUser, LuStore } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { StatusBadge } from '../../atoms/StatusBadge';
import { openPlatformHandle, formatDisplayHandle } from '../../../utils/platformLink';

export type OrderSource = 'whatsapp' | 'instagram' | null;
export type PaymentType = 'cod' | 'prepaid';
export type OrderType = 'customer' | 'reseller' | 'Customer' | 'Reseller';

export interface SourceRowProps {
  source?: OrderSource;
  sourceContact?: string;
  paymentType?: PaymentType;
  orderType?: OrderType;
  resellerName?: string;
}

const WHATSAPP_GREEN = '#25D366';
const INSTAGRAM_ACTIVE = '#E1306C';

export function SourceRow({
  source,
  sourceContact,
  paymentType,
  orderType = 'customer',
  resellerName,
}: SourceRowProps) {
  const { tokens } = useTheme();

  const handleOpenSourceChat = () => {
    if (!sourceContact) return;
    openPlatformHandle(source, sourceContact);
  };

  const displayContact = sourceContact
    ? formatDisplayHandle(source, sourceContact)
    : (source === 'whatsapp' ? 'WhatsApp' : 'Instagram');

  const isReseller = (orderType || '').toLowerCase() === 'reseller';
  const orderTypeLabel = isReseller
    ? (resellerName?.trim() ? `RESELLER • ${resellerName.trim()}` : 'RESELLER')
    : 'CUSTOMER';

  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      paddingVertical={6}
      gap={6}
    >
      {/* Left: Source text + functional logo + contact */}
      <XStack alignItems="center" gap={6} flexShrink={1} maxWidth="42%">
        <Text fontSize={13} color={tokens.textMuted} fontWeight="500">
          Source:
        </Text>

        {/* Functional Logo Button */}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ${source === 'whatsapp' ? 'WhatsApp' : 'Instagram'} chat`}
          onPress={handleOpenSourceChat}
          style={{ cursor: 'pointer' }}
        >
          <XStack alignItems="center" gap={5}>
            {source === 'whatsapp' && (
              <RiWhatsappFill size={19} color={WHATSAPP_GREEN} />
            )}
            {source === 'instagram' && (
              <RiInstagramLine size={19} color={INSTAGRAM_ACTIVE} />
            )}
            <Text
              fontSize={13}
              fontWeight="700"
              color={tokens.text}
              numberOfLines={1}
              ellipsizeMode="tail"
              hoverStyle={{ textDecorationLine: 'underline' }}
            >
              {displayContact}
            </Text>
          </XStack>
        </Pressable>
      </XStack>

      {/* Middle: Order Type Chip (indicating customer or reseller) */}
      <YStack flexShrink={1} maxWidth="36%" alignItems="center" justifyContent="center">
        <StatusBadge
          intent={isReseller ? 'attention' : 'info'}
          label={orderTypeLabel}
          size="md"
          icon={
            isReseller ? (
              <LuStore size={12} color={tokens?.status?.attention?.text || '#B06000'} />
            ) : (
              <LuUser size={12} color={tokens?.status?.info?.text || '#1D4ED8'} />
            )
          }
        />
      </YStack>

      {/* Right: Payment Type Pill (using intent-driven StatusBadge atom) */}
      <StatusBadge
        intent={paymentType === 'cod' ? 'attention' : 'positive'}
        label={paymentType === 'cod' ? 'COD' : 'PREPAID'}
        size="md"
      />
    </XStack>
  );
}
