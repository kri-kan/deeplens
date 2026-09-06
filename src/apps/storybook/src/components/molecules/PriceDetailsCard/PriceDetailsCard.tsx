import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type PriceDetailsProps = {
  totalMRP: number;
  totalDiscount: number;
  couponDiscount?: number;
  artisanDonation?: number;
  shippingFee?: number;
  itemCount: number;
  onPlaceOrder?: () => void;
  onOpenCoupon?: () => void;
  ctaLabel?: string;
  disabled?: boolean;
};

export function PriceDetailsCard({
  totalMRP,
  totalDiscount,
  couponDiscount = 0,
  artisanDonation = 0,
  shippingFee = 0,
  itemCount,
  onPlaceOrder,
  onOpenCoupon,
  ctaLabel = 'PLACE ORDER',
  disabled = false,
}: PriceDetailsProps) {
  const { tokens } = useTheme();

  const totalAmount = Math.max(0, totalMRP - totalDiscount - couponDiscount + artisanDonation + shippingFee);

  return (
    <YStack
      width="100%"
      backgroundColor={tokens.surface}
      borderColor={tokens.border}
      borderWidth={1}
      borderRadius={16}
      padding={16}
      gap={14}
    >
      <Text fontSize={12} fontWeight="800" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
        Price Details ({itemCount} {itemCount === 1 ? 'Item' : 'Items'})
      </Text>

      <YStack gap={10}>
        {/* Total MRP */}
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textSecondary}>
            Total MRP
          </Text>
          <Text fontSize={13} fontWeight="600" color={tokens.text}>
            ₹{totalMRP.toLocaleString('en-IN')}
          </Text>
        </XStack>

        {/* Discount on MRP */}
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textSecondary}>
            Discount on MRP
          </Text>
          <Text fontSize={13} fontWeight="700" color="#2e7d32">
            - ₹{totalDiscount.toLocaleString('en-IN')}
          </Text>
        </XStack>

        {/* Coupon Discount */}
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textSecondary}>
            Coupon Discount
          </Text>
          {couponDiscount > 0 ? (
            <Text fontSize={13} fontWeight="700" color="#2e7d32">
              - ₹{couponDiscount.toLocaleString('en-IN')}
            </Text>
          ) : (
            <Text
              fontSize={13}
              fontWeight="700"
              color="#e53935"
              cursor="pointer"
              onPress={onOpenCoupon}
              hoverStyle={{ textDecorationLine: 'underline' }}
            >
              Apply Coupon
            </Text>
          )}
        </XStack>

        {/* Artisan Support Donation */}
        {artisanDonation > 0 && (
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={13} color={tokens.textSecondary}>
              Weaver Support Contribution
            </Text>
            <Text fontSize={13} fontWeight="600" color={tokens.text}>
              + ₹{artisanDonation.toLocaleString('en-IN')}
            </Text>
          </XStack>
        )}

        {/* Shipping / Delivery Fee */}
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textSecondary}>
            Shipping & Dispatch
          </Text>
          {shippingFee === 0 ? (
            <XStack alignItems="center" gap={4}>
              <Text fontSize={11} color={tokens.textMuted} textDecorationLine="line-through">
                ₹149
              </Text>
              <Text fontSize={13} fontWeight="800" color="#2e7d32">
                FREE
              </Text>
            </XStack>
          ) : (
            <Text fontSize={13} fontWeight="600" color={tokens.text}>
              ₹{shippingFee.toLocaleString('en-IN')}
            </Text>
          )}
        </XStack>
      </YStack>

      {/* Divider */}
      <YStack height={1} backgroundColor={tokens.border} marginVertical={2} />

      {/* Total Amount Row */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={15} fontWeight="800" color={tokens.text}>
          Total Amount
        </Text>
        <Text fontSize={18} fontWeight="900" color={tokens.text}>
          ₹{totalAmount.toLocaleString('en-IN')}
        </Text>
      </XStack>

      {/* Terms Notice */}
      <Text fontSize={10} color={tokens.textMuted} lineHeight={14}>
        By placing the order, you agree to VAYYARI's{' '}
        <Text color="#e53935" fontWeight="600">Terms of Use</Text> and{' '}
        <Text color="#e53935" fontWeight="600">Privacy Policy</Text>.
      </Text>

      {/* PLACE ORDER Button */}
      <XStack
        cursor={disabled ? 'not-allowed' : 'pointer'}
        opacity={disabled ? 0.6 : 1}
        backgroundColor="#e53935"
        height={48}
        borderRadius={8}
        alignItems="center"
        justifyContent="center"
        onPress={() => !disabled && onPlaceOrder?.()}
        hoverStyle={!disabled ? { opacity: 0.92, scale: 1.01 } : {}}
        pressStyle={!disabled ? { scale: 0.98 } : {}}
        shadowColor="#e53935"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.25}
        shadowRadius={10}
      >
        <Text fontSize={14} fontWeight="900" color="#ffffff" letterSpacing={1.2}>
          {ctaLabel}
        </Text>
      </XStack>
    </YStack>
  );
}
