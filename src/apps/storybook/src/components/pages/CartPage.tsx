import React, { useState } from 'react';
import { ScrollView, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuCheck,
  LuTrash2,
  LuHeart,
  LuShoppingBag,
  LuArrowRight,
  LuShieldCheck,
} from 'react-icons/lu';
import { useTheme, useResponsive } from '../../theme';
import { CartHeader, CheckoutStep } from '../organisms/CartHeader/CartHeader';
import { DeliveryPincodeChecker } from '../molecules/DeliveryPincodeChecker/DeliveryPincodeChecker';
import { MyntraStyleCartItem, CartItemData } from '../molecules/CartItem/MyntraStyleCartItem';
export type { CartItemData };
import { CouponSection } from '../molecules/CouponSection/CouponSection';
import { ArtisanSupportDonation } from '../molecules/ArtisanSupportDonation/ArtisanSupportDonation';
import { PriceDetailsCard } from '../molecules/PriceDetailsCard/PriceDetailsCard';
import { CrossSellRecommendationsRail, CrossSellProduct } from '../organisms/CrossSellRecommendationsRail/CrossSellRecommendationsRail';

export const INITIAL_CART_ITEMS: CartItemData[] = [
  {
    id: 'c1',
    brand: 'Vayyari Heritage',
    name: 'Kanjivaram Pure Silk Saree (SAR-KAN-901)',
    seller: 'VAYYARI DIRECT HANDLOOM',
    colorName: 'Emerald Green',
    colorTemplate: 'solid',
    primaryColor: 'Emerald Green',
    size: 'Free Size',
    availableSizes: ['Free Size'],
    quantity: 1,
    price: 10999,
    originalPrice: 14999,
    gradient: ['#1B4D3E', '#0d281e'],
    returnDays: 7,
    selected: true,
  },
  {
    id: 'c2',
    brand: 'Vayyari Royal',
    name: 'Banarasi Royal Brocade Saree (SAR-BAN-402)',
    seller: 'VAYYARI DIRECT HANDLOOM',
    colorName: 'Crimson Red',
    colorTemplate: 'solid',
    primaryColor: 'Crimson Red',
    size: 'Free Size',
    availableSizes: ['Free Size'],
    quantity: 1,
    price: 8499,
    originalPrice: 12999,
    gradient: ['#9B111E', '#4a080e'],
    returnDays: 7,
    stockLeft: 2,
    selected: true,
  },
];

export type CartPageProps = {
  initialItems?: CartItemData[];
  onNavigateHome?: () => void;
  onNavigatePDP?: (productId?: string) => void;
  onProceedToCheckout?: (cartSummary: {
    items: CartItemData[];
    totalMRP: number;
    totalDiscount: number;
    couponDiscount: number;
    artisanDonation: number;
    finalTotal: number;
  }) => void;
};

export function CartPage({
  initialItems = INITIAL_CART_ITEMS,
  onNavigateHome,
  onNavigatePDP,
  onProceedToCheckout,
}: CartPageProps) {
  const { tokens } = useTheme();
  const { isMobile, isDesktop } = useResponsive();

  const [items, setItems] = useState<CartItemData[]>(initialItems);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [artisanDonation, setArtisanDonation] = useState<number>(20);
  const [pincode, setPincode] = useState<string>('560001');

  // Selected items filtering
  const selectedItems = items.filter((i) => i.selected);
  const isAllSelected = items.length > 0 && selectedItems.length === items.length;

  const handleToggleSelectAll = () => {
    const nextState = !isAllSelected;
    setItems((prev) => prev.map((item) => ({ ...item, selected: nextState })));
  };

  const handleToggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleQuantityChange = (id: string, newQty: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
    );
  };

  const handleSizeChange = (id: string, newSize: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, size: newSize } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRemoveSelected = () => {
    setItems((prev) => prev.filter((item) => !item.selected));
  };

  const handleAddCrossSell = (prod: CrossSellProduct) => {
    const newItem: CartItemData = {
      id: `cs-${prod.id}-${Date.now()}`,
      brand: prod.brand,
      name: prod.name,
      seller: 'VAYYARI DIRECT',
      colorName: 'Standard',
      colorTemplate: 'solid',
      primaryColor: 'Standard',
      size: 'Free Size',
      availableSizes: ['Free Size'],
      quantity: 1,
      price: prod.price,
      originalPrice: prod.originalPrice,
      gradient: prod.gradient,
      returnDays: 7,
      selected: true,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Price calculations
  const totalMRP = selectedItems.reduce((acc, i) => acc + i.originalPrice * i.quantity, 0);
  const totalSellingPrice = selectedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const totalDiscount = totalMRP - totalSellingPrice;
  const effectiveCouponDiscount = appliedCoupon ? appliedDiscount : 0;
  const effectiveArtisanDonation = artisanDonation > 0 ? artisanDonation : 0;
  const finalTotal = Math.max(0, totalSellingPrice - effectiveCouponDiscount + effectiveArtisanDonation);

  const handleCheckout = () => {
    onProceedToCheckout?.({
      items: selectedItems,
      totalMRP,
      totalDiscount,
      couponDiscount: effectiveCouponDiscount,
      artisanDonation: effectiveArtisanDonation,
      finalTotal,
    });
  };

  return (
    <YStack flex={1} backgroundColor={tokens.background} minHeight="100%">
      {/* Header */}
      <CartHeader
        currentStep="bag"
        onNavigateHome={onNavigateHome}
      />

      {items.length === 0 ? (
        /* Empty Cart State */
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          paddingVertical={60}
          paddingHorizontal={20}
          gap={16}
        >
          <XStack
            width={80}
            height={80}
            borderRadius={tokens.radius.full}
            backgroundColor={tokens.surfaceRaised}
            alignItems="center"
            justifyContent="center"
          >
            <LuShoppingBag size={36} color={tokens.textMuted} />
          </XStack>
          <YStack alignItems="center" gap={6}>
            <Text fontSize={20} fontWeight="900" color={tokens.text}>
              Hey, your bag is empty!
            </Text>
            <Text fontSize={13} color={tokens.textMuted} textAlign="center" maxWidth={300}>
              Explore our festive handloom sarees, anarkalis, and ethnic edits.
            </Text>
          </YStack>
          <XStack
            cursor="pointer"
            backgroundColor={tokens.accent}
            paddingHorizontal={28}
            paddingVertical={12}
            borderRadius={8}
            onPress={onNavigateHome}
            hoverStyle={{ opacity: 0.9 }}
          >
            <Text fontSize={13} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.5}>
              EXPLORE ETHNIC CATALOG ➔
            </Text>
          </XStack>
        </YStack>
      ) : (
        /* Populated Cart Content */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: isDesktop ? 32 : 16,
            paddingTop: 16,
            paddingBottom: isMobile ? 120 : 60,
            maxWidth: 1200,
            width: '100%',
            alignSelf: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          <XStack
            flexDirection={isDesktop ? 'row' : 'column'}
            gap={24}
            alignItems={isDesktop ? 'flex-start' : 'stretch'}
          >
            {/* Left Column: Cart Items, Pincode & Cross-Sells */}
            <YStack flex={isDesktop ? 1.6 : undefined} width="100%" gap={16}>
              {/* Delivery Pincode Checker */}
              <DeliveryPincodeChecker
                initialPincode={pincode}
                onPincodeChange={(pin: string) => setPincode(pin)}
              />

              {/* Select All & Selection Actions Bar */}
              <XStack
                justifyContent="space-between"
                alignItems="center"
                paddingVertical={8}
                paddingHorizontal={4}
                borderBottomWidth={1}
                borderBottomColor={tokens.border}
              >
                <XStack
                  alignItems="center"
                  gap={8}
                  cursor="pointer"
                  onPress={handleToggleSelectAll}
                >
                  <XStack
                    width={18}
                    height={18}
                    borderRadius={4}
                    borderWidth={1.5}
                    borderColor={isAllSelected ? tokens.accent : tokens.border}
                    backgroundColor={isAllSelected ? tokens.accent : 'transparent'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {isAllSelected && <LuCheck size={12} color="#ffffff" />}
                  </XStack>
                  <Text fontSize={13} fontWeight="700" color={tokens.text}>
                    {selectedItems.length}/{items.length} ITEMS SELECTED
                  </Text>
                </XStack>

                <XStack alignItems="center" gap={16}>
                  <Text
                    fontSize={12}
                    fontWeight="700"
                    color={tokens.textMuted}
                    cursor="pointer"
                    hoverStyle={{ color: '#e53935' }}
                    onPress={handleRemoveSelected}
                  >
                    REMOVE
                  </Text>
                </XStack>
              </XStack>

              {/* Line Items List */}
              <YStack gap={12}>
                {items.map((item) => (
                  <MyntraStyleCartItem
                    key={item.id}
                    item={item}
                    onToggleSelect={handleToggleItem}
                    onQuantityChange={handleQuantityChange}
                    onSizeChange={handleSizeChange}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </YStack>

              {/* "You May Also Like" Cross-Sell Rail */}
              <CrossSellRecommendationsRail onAddProduct={handleAddCrossSell} />
            </YStack>

            {/* Right Column: Coupons, Donations & Price Details */}
            <YStack
              flex={isDesktop ? 1 : undefined}
              width="100%"
              gap={16}
              position={isDesktop ? ('sticky' as any) : undefined}
              top={isDesktop ? 80 : undefined}
            >
              {/* Coupons Section */}
              <CouponSection
                appliedCoupon={appliedCoupon}
                appliedDiscount={appliedDiscount}
                cartTotal={totalSellingPrice}
                onApplyCoupon={(code, disc) => {
                  setAppliedCoupon(code);
                  setAppliedDiscount(disc);
                }}
                onRemoveCoupon={() => {
                  setAppliedCoupon(null);
                  setAppliedDiscount(0);
                }}
              />

              {/* Artisan Support Donation */}
              <ArtisanSupportDonation
                selectedAmount={artisanDonation}
                onDonationChange={(amt) => setArtisanDonation(amt)}
              />

              {/* Price Details Card */}
              <PriceDetailsCard
                totalMRP={totalMRP}
                totalDiscount={totalDiscount}
                couponDiscount={effectiveCouponDiscount}
                artisanDonation={effectiveArtisanDonation}
                shippingFee={0}
                itemCount={selectedItems.length}
                onPlaceOrder={handleCheckout}
                disabled={selectedItems.length === 0}
              />

              {/* Security & Assurance Badge */}
              <XStack
                alignItems="center"
                justifyContent="center"
                gap={8}
                paddingVertical={12}
                opacity={0.8}
              >
                <LuShieldCheck size={16} color={tokens.textMuted} />
                <Text fontSize={11} color={tokens.textMuted}>
                  100% Secure Checkout · Authentic Handlooms Guaranteed
                </Text>
              </XStack>
            </YStack>
          </XStack>
        </ScrollView>
      )}

      {/* Mobile Sticky Bottom Checkout Bar */}
      {isMobile && items.length > 0 && (
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          backgroundColor={tokens.surface}
          borderTopWidth={1}
          borderTopColor={tokens.border}
          paddingHorizontal={16}
          paddingVertical={12}
          gap={8}
          zIndex={50}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: -4 }}
          shadowOpacity={0.08}
          shadowRadius={8}
        >
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Text fontSize={11} fontWeight="600" color={tokens.textSecondary}>
                {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected
              </Text>
              <Text fontSize={16} fontWeight="900" color={tokens.text}>
                ₹{finalTotal.toLocaleString('en-IN')}
              </Text>
            </YStack>

            <Pressable
              onPress={handleCheckout}
              disabled={selectedItems.length === 0}
              style={
                ({ pressed }) =>
                  ({
                    backgroundColor: selectedItems.length === 0 ? tokens.border : tokens.accent,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    opacity: pressed ? 0.9 : 1,
                    cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer',
                  } as any)
              }
            >
              <Text fontSize={13} fontWeight="900" color={tokens.accentForeground} letterSpacing={0.5}>
                PLACE ORDER
              </Text>
              <LuArrowRight size={16} color={tokens.accentForeground} />
            </Pressable>
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}
