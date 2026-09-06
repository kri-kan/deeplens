import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuHeart, LuShoppingBag, LuSparkles, LuShare2, LuCheck } from 'react-icons/lu';
import { useTheme, useResponsive } from '../../theme';
import { Header } from '../organisms/Header/Header';
import { TopNav } from '../organisms/TopNav/TopNav';
import { WishlistCard, WishlistItemData } from '../molecules/WishlistCard/WishlistCard';
import { WishlistFilterPills, WishlistFilterType } from '../molecules/WishlistFilterPills/WishlistFilterPills';
import { CartDrawer, CartItem } from '../organisms/CartDrawer/CartDrawer';

export const INITIAL_WISHLIST_ITEMS: WishlistItemData[] = [
  {
    id: 'w1',
    category: 'Sarees',
    brand: 'VAYYARI HERITAGE',
    name: 'Rani Pink Pure Katan Silk Banarasi Handloom Saree',
    colorName: 'Rani Pink',
    colorTemplate: 'solid',
    primaryColor: '#e91e63',
    price: 4799,
    originalPrice: 8999,
    gradient: ['#f48fb1', '#ad1457'],
    stockStatus: 'in_stock',
  },
  {
    id: 'w2',
    category: 'Sarees',
    brand: 'WEAVERS GUILD',
    name: 'Royal Midnight Blue Floral Paithani Silk Saree',
    colorName: 'Midnight Blue',
    colorTemplate: 'multi-tone',
    primaryColor: '#1a237e',
    secondaryColor: '#3949ab',
    price: 6499,
    originalPrice: 12999,
    gradient: ['#7986cb', '#1a237e'],
    stockStatus: 'low_stock',
    stockLeft: 2,
  },
  {
    id: 'w3',
    category: 'Sarees',
    brand: 'KANCHI WEAVE',
    name: 'Temple Border Pure Antique Gold Zari Kanjivaram Saree',
    colorName: 'Antique Gold',
    colorTemplate: 'contrast-border',
    primaryColor: '#880e4f',
    secondaryColor: '#d4af37',
    price: 8299,
    originalPrice: 16499,
    gradient: ['#f6d365', '#d4af37'],
    stockStatus: 'in_stock',
  },
  {
    id: 'w4',
    category: 'Sarees',
    brand: 'TUSSAR ARTISANS',
    name: 'Mustard Yellow Hand-Block Printed Tussar Silk Saree',
    colorName: 'Mustard Yellow',
    colorTemplate: 'solid',
    primaryColor: '#fbc02d',
    price: 3199,
    originalPrice: 5999,
    gradient: ['#fff176', '#f57f17'],
    stockStatus: 'out_of_stock',
  },
  {
    id: 'w5',
    category: 'Sarees',
    brand: 'CHANDERI CLUSTER',
    name: 'Pastel Mint Green Zari Buta Pure Chanderi Saree',
    colorName: 'Mint Green',
    colorTemplate: 'solid',
    primaryColor: '#80cbc4',
    price: 2899,
    originalPrice: 4999,
    gradient: ['#b2dfdb', '#00796b'],
    stockStatus: 'in_stock',
  },
  {
    id: 'w6',
    category: 'Jewellery',
    brand: 'VAYYARI JEWELS',
    name: 'Antique Temple Gold Kundan Choker Necklace Set',
    colorName: 'Kundan Gold',
    colorTemplate: 'solid',
    primaryColor: '#d4af37',
    price: 1499,
    originalPrice: 2999,
    gradient: ['#ffe082', '#ff8f00'],
    stockStatus: 'in_stock',
  },
];

export type WishlistPageProps = {
  initialItems?: WishlistItemData[];
  onNavigateHome?: () => void;
  onNavigateCatalog?: () => void;
  onNavigatePDP?: (id: string) => void;
  onNavigateCart?: () => void;
};

export function WishlistPage({
  initialItems = INITIAL_WISHLIST_ITEMS,
  onNavigateHome,
  onNavigateCatalog,
  onNavigatePDP,
  onNavigateCart,
}: WishlistPageProps) {
  const { tokens } = useTheme();
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const [items, setItems] = useState<WishlistItemData[]>(initialItems);
  const [selectedFilter, setSelectedFilter] = useState<WishlistFilterType>('All');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter calculations
  const filteredItems = items.filter((item) => {
    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'In Stock Only') return item.stockStatus !== 'out_of_stock';
    return item.category === selectedFilter;
  });

  const counts: Record<WishlistFilterType, number> = {
    All: items.length,
    Sarees: items.filter((i) => i.category === 'Sarees').length,
    Lehengas: items.filter((i) => i.category === 'Lehengas').length,
    Jewellery: items.filter((i) => i.category === 'Jewellery').length,
    'In Stock Only': items.filter((i) => i.stockStatus !== 'out_of_stock').length,
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    showToast('Removed item from Wishlist');
  };

  const handleMoveToBag = (item: WishlistItemData) => {
    const newCartItem: CartItem = {
      id: `cart-${item.id}-${Date.now()}`,
      name: item.name,
      color: item.colorName,
      size: 'Free Size',
      price: `₹${item.price.toLocaleString('en-IN')}`,
      gradient: item.gradient,
    };
    setCartItems((prev) => [newCartItem, ...prev]);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setIsCartOpen(true);
  };

  const handleMoveAllToBag = () => {
    const available = items.filter((i) => i.stockStatus !== 'out_of_stock');
    if (available.length === 0) return;

    const newCartItems: CartItem[] = available.map((item) => ({
      id: `cart-${item.id}-${Date.now()}`,
      name: item.name,
      color: item.colorName,
      size: 'Free Size',
      price: `₹${item.price.toLocaleString('en-IN')}`,
      gradient: item.gradient,
    }));

    setCartItems((prev) => [...newCartItems, ...prev]);
    setItems((prev) => prev.filter((i) => i.stockStatus === 'out_of_stock'));
    setIsCartOpen(true);
    showToast(`Moved ${available.length} available items to your bag!`);
  };

  const handleShareWishlist = () => {
    showToast('Wishlist link copied to clipboard! 📋');
  };

  const handleNotifyMe = (item: WishlistItemData) => {
    showToast(`You will be notified when ${item.name} is back in stock! 🔔`);
  };

  return (
    <YStack flex={1} minHeight="100%" backgroundColor={tokens.background} position="relative">
      {/* Global Header */}
      <Header
        onOpenCart={onNavigateCart}
      />
      {!isMobile && (
        <TopNav
          items={['Women', 'Men', 'Kids', 'Home & Living', 'Beauty']}
          onSelect={onNavigateCatalog}
        />
      )}

      {/* Main Container */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: 60,
        }}
      >
        <YStack
          width="100%"
          maxWidth={1240}
          alignSelf="center"
          paddingHorizontal={isMobile ? 12 : 24}
          paddingTop={24}
          gap={20}
        >
          {/* Title Banner & Action Strip */}
          <XStack
            justifyContent="space-between"
            alignItems="flex-start"
            flexWrap="wrap"
            gap={14}
          >
            <YStack gap={4}>
              <XStack alignItems="center" gap={8}>
                <LuHeart size={22} color="#e53935" fill="#e53935" />
                <Text fontSize={isMobile ? 20 : 24} fontWeight="900" color={tokens.text}>
                  My Cherished Pieces
                </Text>
                <XStack
                  paddingHorizontal={8}
                  paddingVertical={2}
                  borderRadius={12}
                  backgroundColor={tokens.surfaceRaised}
                  borderWidth={1}
                  borderColor={tokens.border}
                >
                  <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </Text>
                </XStack>
              </XStack>
              <Text fontSize={13} color={tokens.textSecondary}>
                Handcrafted heirloom sarees and artisan accessories saved for your special moments.
              </Text>
            </YStack>

            {items.length > 0 && (
              <XStack gap={10} alignItems="center" flexWrap="wrap">
                {/* Share Wishlist Button */}
                <XStack
                  cursor="pointer"
                  paddingHorizontal={14}
                  paddingVertical={8}
                  borderRadius={8}
                  backgroundColor={tokens.surface}
                  borderWidth={1}
                  borderColor={tokens.border}
                  alignItems="center"
                  gap={6}
                  onPress={handleShareWishlist}
                  hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
                >
                  <LuShare2 size={14} color={tokens.text} />
                  <Text fontSize={12} fontWeight="700" color={tokens.text}>
                    Share Wishlist
                  </Text>
                </XStack>

                {/* Move All to Bag Button */}
                <XStack
                  cursor="pointer"
                  paddingHorizontal={16}
                  paddingVertical={8}
                  borderRadius={8}
                  backgroundColor="#e53935"
                  alignItems="center"
                  gap={6}
                  onPress={handleMoveAllToBag}
                  hoverStyle={{ opacity: 0.92 }}
                  pressStyle={{ scale: 0.96 }}
                >
                  <LuShoppingBag size={14} color="#ffffff" />
                  <Text fontSize={12} fontWeight="900" color="#ffffff" letterSpacing={0.4}>
                    MOVE ALL TO BAG
                  </Text>
                </XStack>
              </XStack>
            )}
          </XStack>

          {/* Filter Pills */}
          {items.length > 0 && (
            <WishlistFilterPills
              selectedFilter={selectedFilter}
              counts={counts}
              onSelectFilter={(f) => setSelectedFilter(f)}
            />
          )}

          {/* Empty Wishlist State */}
          {items.length === 0 ? (
            <YStack
              paddingVertical={60}
              alignItems="center"
              justifyContent="center"
              gap={16}
              minHeight={450}
            >
              <XStack
                width={88}
                height={88}
                borderRadius={44}
                backgroundColor={tokens.surfaceRaised}
                alignItems="center"
                justifyContent="center"
              >
                <LuHeart size={44} color={tokens.accent} />
              </XStack>
              <Text fontSize={22} fontWeight="800" color={tokens.text}>
                Your Wishlist is Empty
              </Text>
              <Text fontSize={14} color={tokens.textSecondary} textAlign="center" maxWidth={420} lineHeight={20}>
                You haven't saved any handloom sarees yet. Explore our heirloom collections and tap the heart icon on pieces you love.
              </Text>
              <XStack
                cursor="pointer"
                backgroundColor="#e53935"
                paddingHorizontal={32}
                paddingVertical={14}
                borderRadius={8}
                marginTop={10}
                onPress={onNavigateCatalog}
                hoverStyle={{ scale: 1.03 }}
                pressStyle={{ scale: 0.96 }}
              >
                <Text fontSize={14} fontWeight="900" color="#ffffff" letterSpacing={1}>
                  EXPLORE HANDLOOMS
                </Text>
              </XStack>
            </YStack>
          ) : (
            /* Wishlist Products Grid */
            <View
              style={
                {
                  display: 'grid',
                  gridTemplateColumns: isDesktop
                    ? 'repeat(4, minmax(0, 1fr))'
                    : isTablet
                    ? 'repeat(3, minmax(0, 1fr))'
                    : 'repeat(2, minmax(0, 1fr))',
                  gap: isMobile ? 12 : 20,
                  width: '100%',
                } as any
              }
            >
              {filteredItems.map((item) => (
                <WishlistCard
                  key={item.id}
                  item={item}
                  onMoveToBag={handleMoveToBag}
                  onRemove={handleRemove}
                  onShare={handleShareWishlist}
                  onNotifyMe={handleNotifyMe}
                  onClickItem={onNavigatePDP}
                />
              ))}
            </View>
          )}
        </YStack>
      </ScrollView>

      {/* Notification Toast */}
      {toastMessage && (
        <XStack
          position="absolute"
          bottom={24}
          alignSelf="center"
          backgroundColor="#1b1b1b"
          paddingHorizontal={20}
          paddingVertical={12}
          borderRadius={30}
          zIndex={100}
          alignItems="center"
          gap={8}
          shadowColor="#000"
          shadowOpacity={0.25}
          shadowRadius={12}
        >
          <LuSparkles size={16} color={tokens.accent} />
          <Text fontSize={13} fontWeight="700" color="#ffffff">
            {toastMessage}
          </Text>
        </XStack>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          zIndex={90}
        >
          <CartDrawer
            items={cartItems}
            onClose={() => setIsCartOpen(false)}
            onCheckout={() => {
              setIsCartOpen(false);
              onNavigateCart?.();
            }}
          />
        </YStack>
      )}
    </YStack>
  );
}
