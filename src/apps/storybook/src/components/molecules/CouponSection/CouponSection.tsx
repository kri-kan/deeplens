import React, { useState } from 'react';
import { YStack, XStack, Text, Input } from 'tamagui';
import { LuTag, LuCheck, LuX, LuSparkles } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type AvailableCoupon = {
  code: string;
  discountAmount: number;
  description: string;
  minOrder: number;
};

export const DEFAULT_COUPONS: AvailableCoupon[] = [
  {
    code: 'VAYYARI500',
    discountAmount: 500,
    description: 'Flat ₹500 OFF on authentic handlooms & silk sarees',
    minOrder: 2499,
  },
  {
    code: 'HANDLOOM10',
    discountAmount: 350,
    description: 'Special 10% artisan craft discount on your cart',
    minOrder: 1999,
  },
  {
    code: 'FESTIVE1000',
    discountAmount: 1000,
    description: 'Grand Festive Luxury Savings on Bridal Banarasi & Kanjivaram',
    minOrder: 7999,
  },
];

export type CouponSectionProps = {
  appliedCoupon?: string | null;
  appliedDiscount?: number;
  cartTotal?: number;
  onApplyCoupon?: (code: string, discount: number) => void;
  onRemoveCoupon?: () => void;
};

export function CouponSection({
  appliedCoupon,
  appliedDiscount = 0,
  cartTotal = 2697,
  onApplyCoupon,
  onRemoveCoupon,
}: CouponSectionProps) {
  const { tokens } = useTheme();
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleApply = (codeToApply?: string) => {
    const code = (codeToApply || inputCode).trim().toUpperCase();
    if (!code) {
      setError('Please enter a coupon code');
      return;
    }

    const matched = DEFAULT_COUPONS.find((c) => c.code === code);
    if (matched) {
      if (cartTotal < matched.minOrder) {
        setError(`Minimum order value for ${code} is ₹${matched.minOrder.toLocaleString('en-IN')}`);
        return;
      }
      setError('');
      onApplyCoupon?.(matched.code, matched.discountAmount);
      setInputCode('');
      setIsModalOpen(false);
    } else {
      setError('Invalid coupon code');
    }
  };

  return (
    <YStack
      width="100%"
      backgroundColor={tokens.surface}
      borderColor={tokens.border}
      borderWidth={1}
      borderRadius={16}
      padding={16}
      gap={12}
    >
      <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
        Coupons
      </Text>

      {/* Applied Coupon View */}
      {appliedCoupon ? (
        <XStack
          justifyContent="space-between"
          alignItems="center"
          padding={12}
          backgroundColor="rgba(46, 125, 50, 0.08)"
          borderRadius={8}
          borderWidth={1}
          borderColor="rgba(46, 125, 50, 0.3)"
        >
          <XStack alignItems="center" gap={8}>
            <LuCheck size={16} color="#2e7d32" strokeWidth={3} />
            <YStack>
              <Text fontSize={13} fontWeight="800" color="#2e7d32">
                '{appliedCoupon}' Applied
              </Text>
              <Text fontSize={11} color="#2e7d32">
                You saved ₹{appliedDiscount.toLocaleString('en-IN')} extra!
              </Text>
            </YStack>
          </XStack>
          <XStack
            cursor="pointer"
            padding={4}
            onPress={onRemoveCoupon}
            hoverStyle={{ opacity: 0.7 }}
          >
            <LuX size={16} color="#2e7d32" />
          </XStack>
        </XStack>
      ) : (
        /* Apply Coupon Row */
        <YStack gap={8}>
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap={8}>
              <LuTag size={16} color={tokens.text} />
              <Text fontSize={13} fontWeight="700" color={tokens.text}>
                Apply Coupons
              </Text>
            </XStack>

            <XStack
              cursor="pointer"
              paddingHorizontal={14}
              paddingVertical={6}
              borderRadius={6}
              borderWidth={1}
              borderColor="#e53935"
              onPress={() => setIsModalOpen((o) => !o)}
              hoverStyle={{ backgroundColor: 'rgba(229, 57, 53, 0.08)' }}
            >
              <Text fontSize={11} fontWeight="800" color="#e53935" textTransform="uppercase">
                {isModalOpen ? 'Close' : 'Apply'}
              </Text>
            </XStack>
          </XStack>

          <Text fontSize={11} color={tokens.textSecondary}>
            <Text color="#e53935" fontWeight="700">Login</Text> to get up to ₹300 OFF on first order
          </Text>
        </YStack>
      )}

      {/* Expanded Coupon Selector Sheet / Modal */}
      {isModalOpen && !appliedCoupon && (
        <YStack
          marginTop={8}
          paddingTop={12}
          borderTopWidth={1}
          borderTopColor={tokens.border}
          gap={12}
        >
          {/* Custom Input */}
          <XStack gap={8}>
            <XStack flex={1}>
              <Input
                value={inputCode}
                onChangeText={(t) => {
                  setInputCode(t);
                  setError('');
                }}
                placeholder="Enter coupon code (e.g. VAYYARI500)"
                size="$3"
                fontSize={12}
                backgroundColor={tokens.background}
                color={tokens.text}
                borderWidth={1}
                borderColor={error ? tokens.error : tokens.border}
                autoCapitalize="characters"
              />
            </XStack>
            <XStack
              cursor="pointer"
              backgroundColor="#e53935"
              paddingHorizontal={14}
              alignItems="center"
              justifyContent="center"
              borderRadius={6}
              onPress={() => handleApply()}
            >
              <Text fontSize={11} fontWeight="800" color="#ffffff">
                APPLY
              </Text>
            </XStack>
          </XStack>

          {error ? (
            <Text fontSize={11} color={tokens.error} fontWeight="600">
              {error}
            </Text>
          ) : null}

          {/* Available Coupons List */}
          <YStack gap={8}>
            {DEFAULT_COUPONS.map((coupon) => {
              const isEligible = cartTotal >= coupon.minOrder;
              return (
                <XStack
                  key={coupon.code}
                  padding={10}
                  borderRadius={8}
                  backgroundColor={tokens.background}
                  borderWidth={1}
                  borderColor={tokens.border}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <YStack flex={1} gap={2} paddingRight={10}>
                    <XStack alignItems="center" gap={6}>
                      <LuSparkles size={12} color={tokens.accent} />
                      <Text fontSize={12} fontWeight="800" color={tokens.text}>
                        {coupon.code}
                      </Text>
                      <Text fontSize={11} fontWeight="700" color="#2e7d32">
                        Save ₹{coupon.discountAmount}
                      </Text>
                    </XStack>
                    <Text fontSize={11} color={tokens.textSecondary}>
                      {coupon.description}
                    </Text>
                    {!isEligible && (
                      <Text fontSize={10} color={tokens.textMuted}>
                        Add ₹{(coupon.minOrder - cartTotal).toLocaleString('en-IN')} more to unlock
                      </Text>
                    )}
                  </YStack>

                  <XStack
                    cursor={isEligible ? 'pointer' : 'default'}
                    opacity={isEligible ? 1 : 0.4}
                    paddingHorizontal={10}
                    paddingVertical={4}
                    borderRadius={4}
                    backgroundColor={isEligible ? tokens.accent : tokens.surface}
                    onPress={() => isEligible && handleApply(coupon.code)}
                  >
                    <Text fontSize={11} fontWeight="800" color={isEligible ? tokens.accentForeground : tokens.textMuted}>
                      APPLY
                    </Text>
                  </XStack>
                </XStack>
              );
            })}
          </YStack>
        </YStack>
      )}
    </YStack>
  );
}
