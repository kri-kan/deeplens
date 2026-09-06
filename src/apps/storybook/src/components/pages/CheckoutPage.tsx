import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { LuCircleCheckBig, LuShoppingBag, LuSparkles, LuArrowLeft } from 'react-icons/lu';
import { useTheme, useResponsive } from '../../theme';
import { CartHeader } from '../organisms/CartHeader/CartHeader';
import { AddressSelector, AddressData, INITIAL_ADDRESSES } from '../molecules/AddressSelector/AddressSelector';
import { DeliveryOptionSelector, DeliverySpeed } from '../molecules/DeliveryOptionSelector/DeliveryOptionSelector';
import { PaymentMethodSelector, PaymentMethodType } from '../molecules/PaymentMethodSelector/PaymentMethodSelector';
import { PriceDetailsCard } from '../molecules/PriceDetailsCard/PriceDetailsCard';
import { CartItemData, INITIAL_CART_ITEMS } from './CartPage';

export type CheckoutPageProps = {
  items?: CartItemData[];
  onNavigateHome?: () => void;
  onNavigateBag?: () => void;
};

export function CheckoutPage({
  items = INITIAL_CART_ITEMS,
  onNavigateHome,
  onNavigateBag,
}: CheckoutPageProps) {
  const { tokens } = useTheme();
  const { isMobile, isDesktop } = useResponsive();

  const [selectedAddressId, setSelectedAddressId] = useState('addr1');
  const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeed>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');

  const shippingFee = deliverySpeed === 'express' ? 149 : 0;
  const totalMRP = items.reduce((sum, i) => sum + i.originalPrice * i.quantity, 0);
  const totalSelling = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalDiscount = Math.max(0, totalMRP - totalSelling);
  const finalTotal = totalSelling + shippingFee;

  const handlePlaceOrder = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setOrderId(`VY-${Math.floor(100000 + Math.random() * 900000)}`);
      setIsOrderPlaced(true);
    }, 1500);
  };

  if (isOrderPlaced) {
    return (
      <YStack flex={1} minHeight="100%" backgroundColor={tokens.background}>
        <CartHeader currentStep="payment" onNavigateHome={onNavigateHome} />
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          padding={24}
          gap={16}
        >
          <XStack
            width={88}
            height={88}
            borderRadius={44}
            backgroundColor="rgba(46, 125, 50, 0.12)"
            alignItems="center"
            justifyContent="center"
          >
            <LuCircleCheckBig size={54} color="#2e7d32" strokeWidth={2.5} />
          </XStack>

          <Text fontSize={26} fontWeight="900" color={tokens.text} textAlign="center">
            Order Placed Successfully!
          </Text>
          <Text fontSize={14} fontWeight="700" color={tokens.accent}>
            Order ID: {orderId}
          </Text>

          <Text fontSize={13} color={tokens.textSecondary} textAlign="center" maxWidth={440} lineHeight={20}>
            Thank you for cherishing authentic Indian handlooms. Your parcel is being packed by our artisan guild in Bengaluru.
          </Text>

          {/* Quick Summary Card */}
          <YStack
            width="100%"
            maxWidth={440}
            backgroundColor={tokens.surface}
            borderColor={tokens.border}
            borderWidth={1}
            borderRadius={16}
            padding={16}
            gap={10}
            marginTop={10}
          >
            <XStack justifyContent="space-between">
              <Text fontSize={12} color={tokens.textSecondary}>Amount Paid</Text>
              <Text fontSize={14} fontWeight="800" color={tokens.text}>₹{finalTotal.toLocaleString('en-IN')}</Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text fontSize={12} color={tokens.textSecondary}>Payment Mode</Text>
              <Text fontSize={12} fontWeight="700" color={tokens.text} textTransform="uppercase">{paymentMethod}</Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text fontSize={12} color={tokens.textSecondary}>Estimated Delivery</Text>
              <Text fontSize={12} fontWeight="800" color="#2e7d32">
                {deliverySpeed === 'express' ? 'Wed, 3 Sep (Express)' : 'Fri, 5 Sep (Standard)'}
              </Text>
            </XStack>
          </YStack>

          <XStack
            cursor="pointer"
            backgroundColor="#e53935"
            paddingHorizontal={32}
            paddingVertical={14}
            borderRadius={8}
            marginTop={16}
            onPress={onNavigateHome}
            hoverStyle={{ scale: 1.03 }}
            pressStyle={{ scale: 0.96 }}
          >
            <Text fontSize={14} fontWeight="900" color="#ffffff" letterSpacing={1}>
              CONTINUE SHOPPING
            </Text>
          </XStack>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} minHeight="100%" backgroundColor={tokens.background}>
      <CartHeader
        currentStep="address"
        onNavigateHome={onNavigateHome}
        onBack={onNavigateBag}
        showBackButton={true}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: isMobile ? 120 : 60,
        }}
      >
        <XStack
          width="100%"
          maxWidth={1240}
          alignSelf="center"
          paddingHorizontal={isMobile ? 12 : 24}
          paddingTop={20}
          gap={24}
          flexDirection={isDesktop ? 'row' : 'column'}
          alignItems="flex-start"
        >
          {/* Left Column: Address, Speed & Payment */}
          <YStack flex={isDesktop ? 1.6 : undefined} width="100%" gap={16}>
            <AddressSelector
              selectedAddressId={selectedAddressId}
              onSelectAddress={(id) => setSelectedAddressId(id)}
            />

            <DeliveryOptionSelector
              selectedSpeed={deliverySpeed}
              onSpeedChange={(s) => setDeliverySpeed(s)}
            />

            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onMethodChange={(m) => setPaymentMethod(m)}
            />
          </YStack>

          {/* Right Column: Order Items Summary & Price Details (Sticky on Desktop) */}
          <YStack
            flex={isDesktop ? 1 : undefined}
            width="100%"
            gap={16}
            position={isDesktop ? 'sticky' as any : undefined}
            top={isDesktop ? 80 : undefined}
          >
            {/* Order Items Preview Card */}
            <YStack
              width="100%"
              backgroundColor={tokens.surface}
              borderColor={tokens.border}
              borderWidth={1}
              borderRadius={16}
              padding={16}
              gap={12}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={12} fontWeight="800" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
                  Order Items ({items.length})
                </Text>
                <Text
                  fontSize={11}
                  fontWeight="800"
                  color="#e53935"
                  cursor="pointer"
                  onPress={onNavigateBag}
                  hoverStyle={{ textDecorationLine: 'underline' }}
                >
                  EDIT BAG
                </Text>
              </XStack>

              <YStack gap={10}>
                {items.map((item) => (
                  <XStack key={item.id} gap={10} alignItems="center">
                    <YStack width={44} height={56} borderRadius={6} overflow="hidden" flexShrink={0}>
                      <LinearGradient colors={item.gradient} style={{ width: '100%', height: '100%' }} />
                    </YStack>
                    <YStack flex={1} gap={2}>
                      <Text fontSize={12} fontWeight="700" color={tokens.text} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text fontSize={10} color={tokens.textSecondary}>
                        Size: {item.size} • Qty: {item.quantity}
                      </Text>
                      <Text fontSize={12} fontWeight="800" color={tokens.text}>
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </Text>
                    </YStack>
                  </XStack>
                ))}
              </YStack>
            </YStack>

            {/* Price Details */}
            <PriceDetailsCard
              totalMRP={totalMRP}
              totalDiscount={totalDiscount}
              shippingFee={shippingFee}
              itemCount={items.length}
              ctaLabel={isProcessing ? 'PROCESSING...' : `PAY SECURELY ₹${finalTotal.toLocaleString('en-IN')}`}
              onPlaceOrder={handlePlaceOrder}
              disabled={isProcessing}
            />
          </YStack>
        </XStack>
      </ScrollView>

      {/* Mobile Sticky Place Order Bar */}
      {isMobile && (
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          backgroundColor={tokens.surface}
          borderTopWidth={1}
          borderTopColor={tokens.border}
          paddingHorizontal={16}
          paddingVertical={10}
          gap={8}
          zIndex={50}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: -4 }}
          shadowOpacity={0.08}
          shadowRadius={8}
        >
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={12} fontWeight="700" color={tokens.textSecondary}>
              Total Payable Amount:
            </Text>
            <Text fontSize={15} fontWeight="900" color={tokens.text}>
              ₹{finalTotal.toLocaleString('en-IN')}
            </Text>
          </XStack>

          <XStack
            cursor={isProcessing ? 'not-allowed' : 'pointer'}
            opacity={isProcessing ? 0.7 : 1}
            backgroundColor="#e53935"
            height={46}
            borderRadius={8}
            alignItems="center"
            justifyContent="center"
            onPress={handlePlaceOrder}
          >
            <Text fontSize={14} fontWeight="900" color="#ffffff" letterSpacing={1}>
              {isProcessing ? 'PROCESSING...' : `PAY SECURELY ₹${finalTotal.toLocaleString('en-IN')}`}
            </Text>
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}
