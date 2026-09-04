import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuMenu, LuSearch, LuHeart, LuShoppingBag, LuX } from 'react-icons/lu';
import { BrandMark } from '../BrandMark/BrandMark';
import { TopNav } from '../TopNav/TopNav';
import { SearchBar } from '../../molecules/SearchBar/SearchBar';
import { useTheme, useResponsive } from '../../../theme';

export type HeaderProps = {
  navItems?: string[];
  onOpenCart?: () => void;
  onOpenWishlist?: () => void;
  onOpenSearch?: () => void;
};

const FLYOUT_CATEGORIES = [
  ['Indian & Fusion Wear', 'Sarees', 'Kurtas & Suits', 'Lehenga Cholis', 'Dupattas'],
  ['Western Wear', 'Dresses', 'Tops & Tees', 'Trousers & Jeans', 'Jackets & Coats'],
  ['Footwear', 'Flats & Casuals', 'Heels', 'Boots', 'Ethnic Juttis'],
  ['Bag & Accessories', 'Handbags', 'Wallets', 'Luggage', 'Travel'],
  ['Sports & Active Wear', 'Clothing', 'Footwear', 'Accessories', 'Equipment'],
  ['Jewellery', 'Fashion Jewellery', 'Fine Jewellery', 'Earrings', 'Pendants'],
];

export function Header({
  navItems = [
    'Men',
    'Women',
    'Kids',
    'Home',
    'Beauty',
    'Genz',
    'Studio',
    'New',
  ],
  onOpenCart,
  onOpenWishlist,
  onOpenSearch,
}: HeaderProps) {
  const { tokens } = useTheme();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [activeItem, setActiveItem] = useState('Women');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDesktopMenu, setShowDesktopMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <YStack
      position="relative"
      zIndex={100}
      backgroundColor={tokens.surface}
      borderBottomWidth={1}
      borderBottomColor={tokens.border}
    >
      {/* Top Header Bar */}
      <XStack
        height={isMobile ? 58 : 68}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={isMobile ? 14 : isTablet ? 20 : 28}
        gap={12}
      >
        {/* Left: Hamburger (mobile) + Brand + TopNav (desktop) */}
        <XStack alignItems="center" gap={isMobile ? 10 : 18} flex={1}>
          {isMobile ? (
            <XStack
              cursor="pointer"
              padding={6}
              borderRadius={8}
              onPress={() => setMobileMenuOpen(true)}
              hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
            >
              <LuMenu size={20} color={tokens.text} />
            </XStack>
          ) : null}

          <BrandMark size={isMobile ? 26 : 32} title="VAANYA" />

          {isDesktop ? (
            <TopNav
              items={navItems}
              activeItem={activeItem}
              onSelect={(item) => {
                setActiveItem(item);
                setShowDesktopMenu(true);
              }}
            />
          ) : null}
        </XStack>

        {/* Right: Search + Profile + Wishlist + Cart */}
        <XStack alignItems="center" gap={isMobile ? 6 : 12}>
          {/* Desktop & Tablet: inline SearchBar */}
          {!isMobile ? (
            <SearchBar compact={isTablet} />
          ) : (
            /* Mobile: search icon button that expands search bar */
            <XStack
              cursor="pointer"
              padding={8}
              borderRadius={8}
              onPress={() => setShowMobileSearch(!showMobileSearch)}
              hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
            >
              <LuSearch size={18} color={tokens.text} />
            </XStack>
          )}

          {isDesktop ? (
            <XStack
              alignItems="center"
              gap={6}
              cursor="pointer"
              paddingHorizontal={8}
              paddingVertical={6}
              borderRadius={8}
              hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
            >
              <Text fontSize={13} fontWeight="600" color={tokens.text}>
                Profile
              </Text>
            </XStack>
          ) : null}

          <XStack
            cursor="pointer"
            padding={8}
            borderRadius={8}
            onPress={onOpenWishlist}
            hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
          >
            <LuHeart size={19} color={tokens.text} />
          </XStack>

          <XStack
            cursor="pointer"
            padding={8}
            borderRadius={8}
            onPress={onOpenCart}
            hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
            position="relative"
          >
            <LuShoppingBag size={19} color={tokens.text} />
            <XStack
              position="absolute"
              top={2}
              right={2}
              width={16}
              height={16}
              borderRadius={9999}
              backgroundColor={tokens.accent}
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={9} fontWeight="800" color={tokens.accentForeground}>
                1
              </Text>
            </XStack>
          </XStack>
        </XStack>
      </XStack>

      {/* Mobile Expandable Search Bar */}
      {isMobile && showMobileSearch ? (
        <XStack
          paddingHorizontal={14}
          paddingVertical={8}
          borderTopWidth={1}
          borderTopColor={tokens.border}
          backgroundColor={tokens.surfaceRaised}
        >
          <SearchBar compact={false} placeholder="Search for sarees, dresses..." />
        </XStack>
      ) : null}

      {/* Desktop Mega Flyout Menu */}
      {isDesktop && showDesktopMenu && (
        <YStack
          position="absolute"
          top={68}
          left={0}
          right={0}
          backgroundColor={tokens.surface}
          borderBottomWidth={1}
          borderBottomColor={tokens.border}
          paddingHorizontal={32}
          paddingVertical={24}
          shadowColor="#000"
          shadowOpacity={0.12}
          shadowRadius={16}
          onMouseLeave={() => setShowDesktopMenu(false)}
        >
          <XStack justifyContent="space-between" maxWidth={1240} width="100%" alignSelf="center">
            {FLYOUT_CATEGORIES.map(([category, ...items], idx) => (
              <YStack key={idx} gap={8} minWidth={140}>
                <Text
                  fontSize={13}
                  fontWeight="800"
                  textTransform="uppercase"
                  letterSpacing={0.8}
                  color={tokens.accent}
                >
                  {category}
                </Text>
                {items.map((item, i) => (
                  <Text
                    key={i}
                    fontSize={13}
                    color={tokens.textSecondary}
                    cursor="pointer"
                    hoverStyle={{ color: tokens.text, x: 2 }}
                  >
                    {item}
                  </Text>
                ))}
              </YStack>
            ))}
          </XStack>
        </YStack>
      )}

      {/* Mobile Slide-over Navigation Drawer */}
      {isMobile && mobileMenuOpen && (
        <YStack
          position="absolute"
          top={0}
          left={0}
          width={280}
          height={800}
          backgroundColor={tokens.surface}
          borderRightWidth={1}
          borderRightColor={tokens.border}
          padding={20}
          zIndex={200}
          shadowColor="#000"
          shadowOpacity={0.2}
          shadowRadius={20}
        >
          <XStack justifyContent="space-between" alignItems="center" marginBottom={20}>
            <BrandMark size={28} title="VAANYA" />
            <XStack
              cursor="pointer"
              padding={6}
              borderRadius={8}
              onPress={() => setMobileMenuOpen(false)}
            >
              <LuX size={19} color={tokens.text} />
            </XStack>
          </XStack>

          <YStack gap={14}>
            {navItems.map((item) => (
              <XStack
                key={item}
                paddingVertical={8}
                cursor="pointer"
                onPress={() => {
                  setActiveItem(item);
                  setMobileMenuOpen(false);
                }}
              >
                <Text
                  fontSize={15}
                  fontWeight={activeItem === item ? '800' : '600'}
                  color={activeItem === item ? tokens.accent : tokens.text}
                >
                  {item}
                </Text>
              </XStack>
            ))}
          </YStack>
        </YStack>
      )}
    </YStack>
  );
}
