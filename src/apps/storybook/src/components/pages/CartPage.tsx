import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck, LuTrash2, LuHeart, LuShoppingBag, LuLock } from 'react-icons/lu';
import { useTheme, useResponsive } from '../../theme';
import { CartHeader } from '../organisms/CartHeader/CartHeader';
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
    brand: 'Indo Era',
    name: 'Ethnic Motifs Embroidered Regular Gotta Patti Kurta Set',
    seller: 'ZENZIOR BRAND TECHNOLOGY PRIVATE LIMITED',
    colorName: 'Rust Amber',
    colorTemplate: 'solid',
    primaryColor: 'Rust Amber',
    size: 'M',
    availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
    quantity: 1,
    price: 1698,
    originalPrice: 8999,
    gradient: ['#d77a56', '#8d3b20'],
    returnDays: 14,
    selected: true,
  },
  {
    id: 'c2',
    brand: 'colorkosh',
    name: 'Women Ethnic Motifs Embroidered Chikankari Handloom Kurta',
    seller: 'COLORKOSH ARTISANS GUILD',
    colorName: 'Sky Blue',
    colorTemplate: 'solid',
    primaryColor: 'Sky Blue',
    size: 'L',
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    quantity: 1,
    price: 976,
    originalPrice: 5500,
    gradient: ['#90caf9', '#1565c0'],
    returnDays: 2,
    stockLeft: 4,
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
  const { isMobile, isTablet, isDesktop } = useResponsive();

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
      seller: 'VAYYARI Artisan Guild',
      colorName: 'Antique Gold',
      colorTemplate: 'solid',
      primaryColor: '#d4af37',
      size: 'Free Size',
      quantity: 1,
      price: prod.price,
      originalPrice: prod.originalPrice,
      gradient: prod.gradient,
      returnDays: 7,
      selected: true,
    };
    setItems((prev) => [newItem, ...prev]);
  };

  // Calculations based on selected items
  const totalMRP = selectedItems.reduce((acc, item) => acc + item.originalPrice * item.quantity, 0);
  const totalSellingPrice = selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalDiscount = Math.max(0, totalMRP - totalSellingPrice);
  const effectiveCouponDiscount = appliedCoupon && selectedItems.length > 0 ? appliedDiscount : 0;
  const effectiveArtisanDonation = selectedItems.length > 0 ? artisanDonation : 0;
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
    <YStack flex={1} minHeight="100%" backgroundColor={tokens.background}>
      {/* Header */}
      <CartHeader
        currentStep="bag"
        onNavigateHome={onNavigateHome}
        onBack={onNavigateHome}
        showBackButton={true}
      />

      {items.length === 0 ? (
        /* Empty Cart State */
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          padding={32}
          gap={16}
          minHeight={500}
        >
          <XStack
            width={80}
            height={80}
            borderRadius={40}
            backgroundColor={tokens.surfaceRaised}
            alignItems="center"
            justifyContent="center"
          >
            <LuShoppingBag size={40} color={tokens.accent} />
          </XStack>
          <Text fontSize={22} fontWeight="800" color={tokens.text}>
            Hey, your bag feels light!
          </Text>
          <Text fontSize={14} color={tokens.textSecondary} textAlign="center" maxWidth={400}>
            There is nothing in your shopping bag. Explore our heirloom sarees and handwoven crafts from artisan clusters.
          </Text>
          <XStack
            cursor="pointer"
            backgroundColor="#e53935"
            paddingHorizontal={32}
            paddingVertical={14}
            borderRadius={8}
            marginTop={10}
            onPress={onNavigateHome}
            hoverStyle={{ scale: 1.03 }}
            pressStyle={{ scale: 0.96 }}
          >
            <Text fontSize={14} fontWeight="900" color="#ffffff" letterSpacing={1}>
              EXPLORE HANDLOOMS
            </Text>
          </XStack>
        </YStack>
      ) : (
        /* Main Cart Layout */
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
            {/* Left Column: Line Items & Cross-Sell */}
            <YStack flex={isDesktop ? 1.6 : undefined} width="100%" gap={16}>
              {/* Delivery Pincode Checker */}
              <DeliveryPincodeChecker
                initialPincode={pincode}
                onPincodeChange={(pin) => setPincode(pin)}
              />

              {/* Selection Header & Batch Actions */}
              <XStack
                width="100%"
                backgroundColor={tokens.surface}
                borderColor={tokens.border}
                borderWidth={1}
                borderRadius={12}
                paddingHorizontal={16}
                paddingVertical={12}
                justifyContent="space-between"
                alignItems="center"
              >
                <XStack alignItems="center" gap={10} cursor="pointer" onPress={handleToggleSelectAll}>
                  <XStack
                    width={18}
                    height={18}
                    borderRadius={4}
                    borderWidth={1.5}
                    borderColor={isAllSelected ? '#e53935' : tokens.borderStrong}
                    backgroundColor={isAllSelected ? '#e53935' : 'transparent'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {isAllSelected && <LuCheck size={12} color="#ffffff" strokeWidth={3} />}
                  </XStack>
                  <Text fontSize={13} fontWeight="800" color={tokens.text}>
                    {selectedItems.length}/{items.length} ITEMS SELECTED
                  </Text>
                  {selectedItems.length > 0 && (
                    <Text fontSize={13} fontWeight="800" color="#e53935">
                      (₹{totalSellingPrice.toLocaleString('en-IN')})
                    </Text>
                  )}
                </XStack>

                {/* Batch Actions */}
                <XStack alignItems="center" gap={16}>
                  {selectedItems.length > 0 && (
                    <>
                      <Text
                        fontSize={12}
                        fontWeight="800"
                        color={tokens.textMuted}
                        cursor="pointer"
                        onPress={handleRemoveSelected}
                        hoverStyle={{ color: '#e53935' }}
                      >
                        REMOVE
                      </Text>
                      <Text
                        fontSize={12}
                        fontWeight="800"
                        color={tokens.textMuted}
                        cursor="pointer"
                        hoverStyle={{ color: tokens.accent }}
                      >
                        MOVE TO WISHLIST
                      </Text>
                    </>
                  )}
                </XStack>
              </XStack>

              {/* Cart Items List */}
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

              {/* Login / Existing Bag Prompt Banner */}
              <XStack
                width="100%"
                backgroundColor={tokens.surface}
                borderColor={tokens.border}
                borderWidth={1}
                borderRadius={12}
                padding={14}
                justifyContent="space-between"
                alignItems="center"
              >
                <XStack alignItems="center" gap={10}>
                  <XStack
                    width={32}
                    height={32}
                    borderRadius={16}
                    backgroundColor={tokens.surfaceRaised}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <LuLock size={16} color={tokens.accent} />
                  </XStack>
                  <Text fontSize={12} fontWeight="600" color={tokens.textSecondary}>
                    Login to see items from your existing bag and wishlist
                  </Text>
                </XStack>
                <Text
                  fontSize={12}
                  fontWeight="800"
                  color="#e53935"
                  cursor="pointer"
                  hoverStyle={{ textDecorationLine: 'underline' }}
                >
                  LOGIN NOW
                </Text>
              </XStack>

              {/* "You May Also Like" Cross-Sell Rail */}
              <CrossSellRecommendationsRail
                onAddProduct={handleAddCrossSell}
              />
            </YStack>

            {/* Right Column: Coupons, Donation & Price Details (Sticky on Desktop) */}
            <YStack
              flex={isDesktop ? 1 : undefined}
              width="100%"
              gap={16}
              position={isDesktop ? 'sticky' as any : undefined}
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
            </YStack>
          </XStack>
        </ScrollView>
      )}

      {/* Mobile Sticky Bottom Place Order Bar */}
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
          paddingVertical={10}
          gap={8}
          zIndex={50}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: -4 }}
          shadowOpacity={0.08}
          shadowRadius={8}
        >
          {/* Top selection notice */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={12} fontWeight="700" color={tokens.textSecondary}>
              {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected for order
            </Text>
            <Text fontSize={14} fontWeight="900" color={tokens.text}>
              ₹{finalTotal.toLocaleString('en-IN')}
            </Text>
          </XStack>

          {/* Full-width Place Order Button */}
          <XStack
            cursor={selectedItems.length === 0 ? 'not-allowed' : 'pointer'}
            opacity={selectedItems.length === 0 ? 0.6 : 1}
            backgroundColor="#e53935"
            height={46}
            borderRadius={8}
            alignItems="center"
            justifyContent="center"
            onPress={() => selectedItems.length > 0 && handleCheckout()}
            hoverStyle={selectedItems.length > 0 ? { opacity: 0.92 } : {}}
            pressStyle={selectedItems.length > 0 ? { scale: 0.98 } : {}}
          >
            <Text fontSize={14} fontWeight="900" color="#ffffff" letterSpacing={1}>
              PLACE ORDER
            </Text>
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}
