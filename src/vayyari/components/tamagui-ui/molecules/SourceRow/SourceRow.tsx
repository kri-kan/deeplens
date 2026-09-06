import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { RiWhatsappFill, RiInstagramLine } from '@/components/tamagui-ui/icons/ri';
import { useTheme } from '@/theme';
import { StatusBadge } from '../../atoms/StatusBadge';
import { openPlatformHandle, formatDisplayHandle } from '@/utils/platformLink';

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
    openPlatformHandle(source, sourceContact);
  };

  const displayContact = sourceContact
    ? formatDisplayHandle(source, sourceContact)
    : (source === 'whatsapp' ? 'WhatsApp' : 'Instagram');

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
              {displayContact}
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
