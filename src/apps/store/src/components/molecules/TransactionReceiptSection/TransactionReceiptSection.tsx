import React from 'react';
import { Pressable, TextInput } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuPlus, LuX, LuReceipt } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface TransactionReceiptSectionProps {
  transactionId: string;
  onChangeTransactionId: (val: string) => void;
  receiptUrl: string | null;
  onUploadReceipt: (url: string) => void;
  onRemoveReceipt: () => void;
}

export function TransactionReceiptSection({
  transactionId,
  onChangeTransactionId,
  receiptUrl,
  onUploadReceipt,
  onRemoveReceipt,
}: TransactionReceiptSectionProps) {
  const { tokens } = useTheme();

  return (
    <YStack gap={8}>
      <XStack justifyContent="space-between" alignItems="center">
        <Text
          fontSize={11}
          fontWeight="700"
          color={tokens.textMuted}
          textTransform="uppercase"
          letterSpacing={0.8}
        >
          Payment & Receipt (Optional)
        </Text>
      </XStack>

      <YStack
        backgroundColor={tokens.surface}
        borderWidth={1}
        borderColor={tokens.border}
        borderRadius={tokens.radius.md}
        paddingHorizontal={10}
        paddingVertical={10}
        gap={8}
      >
        {/* Transaction ID Input */}
        <YStack gap={4}>
          <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
            Transaction / UTR ID
          </Text>
          <TextInput
            accessibilityLabel="Transaction or UTR ID"
            value={transactionId}
            onChangeText={onChangeTransactionId}
            placeholder="e.g. UPI-20240902-892189 or Bank Ref"
            placeholderTextColor={tokens.textMuted}
            style={{
              fontSize: 13,
              color: tokens.text,
              paddingVertical: 6,
              paddingHorizontal: 10,
              backgroundColor: tokens.surfaceRaised,
              borderRadius: tokens.radius.xs,
              borderWidth: 1,
              borderColor: tokens.border,
              outlineStyle: 'none',
            } as any}
          />
        </YStack>

        {/* Receipt Screenshot Upload / Preview */}
        <YStack gap={4}>
          <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
            Receipt Screenshot
          </Text>

          {receiptUrl ? (
            /* Uploaded thumbnail preview */
            <XStack
              backgroundColor={tokens.surfaceRaised}
              borderRadius={tokens.radius.sm}
              borderWidth={1}
              borderColor={tokens.border}
              padding={8}
              alignItems="center"
              justifyContent="space-between"
            >
              <XStack alignItems="center" gap={8} flex={1}>
                <YStack
                  width={40}
                  height={40}
                  borderRadius={tokens.radius.xs}
                  backgroundColor={tokens.successSubtle}
                  alignItems="center"
                  justifyContent="center"
                >
                  <LuReceipt size={18} color={tokens.success} />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={12} fontWeight="700" color={tokens.text} numberOfLines={1}>
                    receipt_screenshot.png
                  </Text>
                  <Text fontSize={10} color={tokens.success}>
                    ✓ Receipt Attached
                  </Text>
                </YStack>
              </XStack>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove receipt screenshot"
                onPress={onRemoveReceipt}
                hitSlop={8}
              >
                <YStack
                  width={24}
                  height={24}
                  borderRadius={tokens.radius.full}
                  backgroundColor={tokens.surface}
                  alignItems="center"
                  justifyContent="center"
                  borderWidth={1}
                  borderColor={tokens.border}
                >
                  <LuX size={12} color={tokens.textMuted} />
                </YStack>
              </Pressable>
            </XStack>
          ) : (
            /* Dashed Upload Box */
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upload transaction receipt screenshot"
              onPress={() => onUploadReceipt('mock://receipt-screenshot.png')}
            >
              <YStack
                height={56}
                borderRadius={tokens.radius.sm}
                borderWidth={1.5}
                borderColor={tokens.border}
                borderStyle="dashed"
                alignItems="center"
                justifyContent="center"
                backgroundColor={tokens.surfaceRaised}
                gap={3}
                hoverStyle={{ borderColor: tokens.accent }}
              >
                <XStack alignItems="center" gap={6}>
                  <LuPlus size={14} color={tokens.accent} />
                  <Text fontSize={12} fontWeight="600" color={tokens.accent}>
                    Attach Receipt Screenshot
                  </Text>
                </XStack>
                <Text fontSize={10} color={tokens.textMuted}>
                  PNG, JPG up to 5MB
                </Text>
              </YStack>
            </Pressable>
          )}
        </YStack>
      </YStack>
    </YStack>
  );
}
