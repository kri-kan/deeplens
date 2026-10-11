import React from 'react';
import { Pressable, TextInput } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuUser, LuStore } from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';

export type OrderType = 'customer' | 'reseller';

export interface OrderTypeSectionProps {
  /** Selected order type */
  orderType: OrderType;
  /** Callback when order type changes */
  onChangeOrderType: (type: OrderType) => void;
  /** Reseller business/contact name */
  resellerName: string;
  /** Callback when reseller name changes */
  onChangeResellerName: (name: string) => void;
  /** Optional container style / accessibility label */
  accessibilityLabel?: string;
}

export function OrderTypeSection({
  orderType,
  onChangeOrderType,
  resellerName,
  onChangeResellerName,
  accessibilityLabel,
}: OrderTypeSectionProps) {
  const { tokens } = useTheme();

  const isReseller = orderType === 'reseller';
  const isCustomer = orderType === 'customer';

  return (
    <YStack gap={8} accessibilityLabel={accessibilityLabel ?? 'Order Type Section'}>
      {/* Section Header */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text
          fontSize={11}
          fontWeight="700"
          color={tokens.textMuted}
          textTransform="uppercase"
          letterSpacing={0.8}
        >
          Order Type
        </Text>
      </XStack>

      {/* Main Container Card */}
      <YStack
        backgroundColor={tokens.surface}
        borderWidth={1}
        borderColor={tokens.border}
        borderRadius={tokens.radius.md}
        paddingHorizontal={12}
        paddingVertical={12}
        gap={12}
      >
        {/* Sleek Segmented Toggle */}
        <XStack
          backgroundColor={tokens.surfaceRaised}
          borderRadius={tokens.radius.sm}
          borderWidth={1}
          borderColor={tokens.border}
          padding={3}
          gap={4}
        >
          {/* Customer Option */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isCustomer }}
            accessibilityLabel="Customer (Direct end-buyer)"
            onPress={() => onChangeOrderType('customer')}
            style={({ pressed }) => ({
              flex: 1,
              height: 38,
              borderRadius: tokens.radius.xs,
              backgroundColor: isCustomer ? tokens.surface : 'transparent',
              borderWidth: isCustomer ? 1.5 : 0,
              borderColor: isCustomer ? tokens.accent : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 7,
              opacity: pressed ? 0.8 : 1,
              ...(isCustomer
                ? {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.08,
                    shadowRadius: 2,
                    elevation: 1,
                  }
                : {}),
            })}
          >
            <LuUser
              size={15}
              color={isCustomer ? tokens.accent : tokens.textMuted}
            />
            <Text
              fontSize={13}
              fontWeight={isCustomer ? '800' : '600'}
              color={isCustomer ? tokens.accent : tokens.textSecondary}
              letterSpacing={0.2}
            >
              Customer
            </Text>
          </Pressable>

          {/* Reseller Option */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isReseller }}
            accessibilityLabel="Reseller (B2B boutique / agent)"
            onPress={() => onChangeOrderType('reseller')}
            style={({ pressed }) => ({
              flex: 1,
              height: 38,
              borderRadius: tokens.radius.xs,
              backgroundColor: isReseller ? tokens.surface : 'transparent',
              borderWidth: isReseller ? 1.5 : 0,
              borderColor: isReseller
                ? (tokens?.status?.attention?.base || '#F59E0B')
                : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 7,
              opacity: pressed ? 0.8 : 1,
              ...(isReseller
                ? {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.08,
                    shadowRadius: 2,
                    elevation: 1,
                  }
                : {}),
            })}
          >
            <LuStore
              size={15}
              color={
                isReseller
                  ? (tokens?.status?.attention?.text || '#B06000')
                  : tokens.textMuted
              }
            />
            <Text
              fontSize={13}
              fontWeight={isReseller ? '800' : '600'}
              color={
                isReseller
                  ? (tokens?.status?.attention?.text || '#B06000')
                  : tokens.textSecondary
              }
              letterSpacing={0.2}
            >
              Reseller
            </Text>
          </Pressable>
        </XStack>

        {/* Reseller Name Input (Enabled when Reseller is selected) */}
        {isReseller && (
          <YStack
            gap={6}
            paddingTop={4}
            borderTopWidth={1}
            borderTopColor={tokens.border}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
                Reseller Name / Boutique
              </Text>
              <Text fontSize={10} fontWeight="500" color={tokens.textMuted}>
                Optional
              </Text>
            </XStack>

            <TextInput
              accessibilityLabel="Reseller Name (Optional)"
              value={resellerName ?? ''}
              onChangeText={onChangeResellerName}
              placeholder="e.g. Priya Sarees / Sri Krishna Collections (Optional)"
              placeholderTextColor={tokens.textMuted}
              style={{
                fontSize: 13,
                color: tokens.text,
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: tokens.surfaceRaised,
                borderRadius: tokens.radius.xs,
                borderWidth: 1,
                borderColor: tokens.border,
                outlineStyle: 'none',
              } as any}
            />

            <Text fontSize={11} color={tokens.textMuted}>
              Optional. If specified, the boutique name will display on tags and manifests.
            </Text>
          </YStack>
        )}
      </YStack>
    </YStack>
  );
}
