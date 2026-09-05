import React, { useState, useEffect } from 'react';
import { TextInput, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { BottomSheet } from '../../atoms/BottomSheet';
import { useTheme } from '../../../theme';
import { OrderIdHistoryEntry } from '../OrderIdHistoryItem';
import { RiWhatsappFill, RiInstagramFill } from 'react-icons/ri';
import { LuPhone, LuRefreshCw, LuCheck } from 'react-icons/lu';

export interface OrderIdEditSheetProps {
  visible: boolean;
  onClose: () => void;
  item: OrderIdHistoryEntry | null;
  onSave: (
    id: string,
    updated: {
      paymentMode: 'cod' | 'prepaid' | null;
      sourceHandle: string;
    }
  ) => void;
}

const WHATSAPP_GREEN = '#25D366';
const INSTAGRAM_PINK = '#E1306C';

export function OrderIdEditSheet({
  visible,
  onClose,
  item,
  onSave,
}: OrderIdEditSheetProps) {
  const { tokens } = useTheme();

  const [editPaymentMode, setEditPaymentMode] = useState<'cod' | 'prepaid' | null>(null);
  const [editHandle, setEditHandle] = useState('');

  useEffect(() => {
    if (item) {
      const mode =
        item.paymentMode?.toLowerCase() === 'cod'
          ? 'cod'
          : item.paymentMode?.toLowerCase() === 'prepaid'
          ? 'prepaid'
          : null;
      setEditPaymentMode(mode);
      setEditHandle(item.customerPhone || item.instagramHandle || item.sourceHandle || '');
    }
  }, [item]);

  if (!item) return null;

  const originalHandle = item.customerPhone || item.instagramHandle || item.sourceHandle || '';
  const originalMode =
    item.paymentMode?.toLowerCase() === 'cod'
      ? 'cod'
      : item.paymentMode?.toLowerCase() === 'prepaid'
      ? 'prepaid'
      : null;

  const hasChanged = editPaymentMode !== originalMode || editHandle !== originalHandle;
  const isWhatsApp = item.source?.toLowerCase() === 'whatsapp';

  const handleReset = () => {
    setEditPaymentMode(originalMode);
    setEditHandle(originalHandle);
  };

  const handleSave = () => {
    onSave(item.id, {
      paymentMode: editPaymentMode,
      sourceHandle: editHandle,
    });
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`Edit Order #${item.id}`}
      paddingHorizontal={16}
      paddingBottom={32}
      footer={
        <XStack gap={10} width="100%" justifyContent="space-between" alignItems="center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset changes"
            onPress={handleReset}
            disabled={!hasChanged}
            style={{ opacity: hasChanged ? 1 : 0.4, cursor: (hasChanged ? 'pointer' : 'default') as any }}
          >
            <XStack
              paddingVertical={10}
              paddingHorizontal={14}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.border}
              backgroundColor={tokens.surfaceRaised}
              alignItems="center"
              gap={6}
            >
              <LuRefreshCw size={15} color={tokens.textMuted} />
              <Text fontSize={13} fontWeight="600" color={tokens.textMuted}>
                Reset
              </Text>
            </XStack>
          </Pressable>

          <XStack gap={10} flex={1} justifyContent="flex-end">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel edit"
              onPress={onClose}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                paddingVertical={10}
                paddingHorizontal={16}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                alignItems="center"
              >
                <Text fontSize={13} fontWeight="600" color={tokens.text}>
                  Cancel
                </Text>
              </XStack>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save updated order"
              onPress={handleSave}
              disabled={!hasChanged}
              style={{
                opacity: hasChanged ? 1 : 0.4,
                cursor: (hasChanged ? 'pointer' : 'default') as any,
              }}
            >
              <XStack
                paddingVertical={10}
                paddingHorizontal={20}
                borderRadius={tokens.radius.md}
                backgroundColor={tokens.accent}
                alignItems="center"
                gap={6}
              >
                <LuCheck size={16} color={tokens.surface} />
                <Text fontSize={13} fontWeight="700" color={tokens.surface}>
                  Save
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        </XStack>
      }
    >
      <YStack gap={16} paddingTop={8} paddingBottom={16}>
        {/* Contact Handle Input */}
        <YStack gap={6}>
          <Text fontSize={12} fontWeight="600" color={tokens.textMuted}>
            {isWhatsApp ? 'WhatsApp Phone Number' : 'Instagram Handle / URL'}
          </Text>
          <XStack
            borderWidth={1}
            borderColor={tokens.border}
            borderRadius={tokens.radius.md}
            backgroundColor={tokens.background}
            paddingHorizontal={12}
            height={44}
            alignItems="center"
            gap={8}
          >
            {isWhatsApp ? (
              <LuPhone size={16} color={WHATSAPP_GREEN} />
            ) : (
              <RiInstagramFill size={16} color={INSTAGRAM_PINK} />
            )}
            <TextInput
              accessibilityLabel="Edit handle input"
              value={editHandle}
              onChangeText={setEditHandle}
              placeholder={isWhatsApp ? '+91 98765 43210' : '@username'}
              placeholderTextColor={tokens.textMuted}
              keyboardType={isWhatsApp ? 'phone-pad' : 'default'}
              style={{
                flex: 1,
                fontSize: 13,
                color: tokens.text,
                outlineStyle: 'none',
              } as any}
            />
          </XStack>
        </YStack>

        {/* Payment Mode Selector */}
        <YStack gap={6}>
          <Text fontSize={12} fontWeight="600" color={tokens.textMuted}>
            Payment Mode
          </Text>
          <XStack gap={10}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Set COD"
              onPress={() => setEditPaymentMode('cod')}
              style={{ flex: 1 }}
            >
              <XStack
                paddingVertical={10}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={editPaymentMode === 'cod' ? tokens.accent : tokens.border}
                backgroundColor={
                  editPaymentMode === 'cod' ? tokens.accent : tokens.surfaceRaised
                }
                alignItems="center"
                justifyContent="center"
              >
                <Text
                  fontSize={13}
                  fontWeight={editPaymentMode === 'cod' ? '700' : '500'}
                  color={editPaymentMode === 'cod' ? tokens.surface : tokens.text}
                >
                  COD
                </Text>
              </XStack>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Set Prepaid"
              onPress={() => setEditPaymentMode('prepaid')}
              style={{ flex: 1 }}
            >
              <XStack
                paddingVertical={10}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={editPaymentMode === 'prepaid' ? tokens.accent : tokens.border}
                backgroundColor={
                  editPaymentMode === 'prepaid' ? tokens.accent : tokens.surfaceRaised
                }
                alignItems="center"
                justifyContent="center"
              >
                <Text
                  fontSize={13}
                  fontWeight={editPaymentMode === 'prepaid' ? '700' : '500'}
                  color={editPaymentMode === 'prepaid' ? tokens.surface : tokens.text}
                >
                  Prepaid
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        </YStack>
      </YStack>
    </BottomSheet>
  );
}
