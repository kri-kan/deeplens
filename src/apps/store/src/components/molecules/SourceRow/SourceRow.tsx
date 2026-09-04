import React from 'react';
import { Pressable, Linking } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { RiWhatsappFill, RiInstagramLine } from 'react-icons/ri';
import { useTheme } from '../../../theme';
import { StatusBadge } from '../../atoms/StatusBadge';

export type OrderSource = 'whatsapp' | 'instagram' | null;
export type PaymentType = 'cod' | 'prepaid';

export interface SourceRowProps {
  source?: OrderSource;
  sourceContact?: string;
  paymentType?: PaymentType;
}

const WHATSAPP_GREEN = '#25D366';
const INSTAGRAM_ACTIVE = '#E1306C';

export function SourceRow({ source, sourceContact, paymentType }: SourceRowProps) {
  const { tokens } = useTheme();

  const handleOpenSourceChat = () => {
    if (!sourceContact) return;
    if (source === 'whatsapp') {
      const clean = sourceContact.replace(/[^0-9]/g, '');
      if (clean) {
        const url = `https://wa.me/${clean}`;
        if (typeof window !== 'undefined') window.open(url, '_blank');
        else Linking.openURL(url);
      }
    } else if (source === 'instagram') {
      const clean = sourceContact.replace(/^@/, '').trim();
      if (clean) {
        const url = `https://ig.me/m/${clean}`;
        if (typeof window !== 'undefined') window.open(url, '_blank');
        else Linking.openURL(url);
      }
    }
  };

  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      paddingVertical={6}
    >
      {/* Left: Source text + functional logo + contact */}
      <XStack alignItems="center" gap={8}>
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
          <XStack alignItems="center" gap={6}>
            {source === 'whatsapp' && (
              <RiWhatsappFill size={20} color={WHATSAPP_GREEN} />
            )}
            {source === 'instagram' && (
              <RiInstagramLine size={20} color={INSTAGRAM_ACTIVE} />
            )}
            <Text
              fontSize={13}
              fontWeight="700"
              color={tokens.text}
              hoverStyle={{ textDecorationLine: 'underline' }}
            >
              {sourceContact || (source === 'whatsapp' ? 'WhatsApp' : 'Instagram')}
            </Text>
          </XStack>
        </Pressable>
      </XStack>

      {/* Right: Payment Type Pill (using intent-driven StatusBadge atom) */}
      <StatusBadge
        intent={paymentType === 'cod' ? 'attention' : 'positive'}
        label={paymentType === 'cod' ? 'COD' : 'PREPAID'}
        size="md"
      />
    </XStack>
  );
}
