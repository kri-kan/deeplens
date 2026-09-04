import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuSearch, LuFilter, LuSlidersHorizontal, LuShare2 } from 'react-icons/lu';
import { useTheme, AVAILABLE_CAMPAIGNS, CAMPAIGN_REGISTRY, CampaignName } from '../../theme';

// Atoms
import { Badge } from '../../components/atoms/Badge/Badge';
import { Chip } from '../../components/atoms/Chip/Chip';
import { HeartButton } from '../../components/atoms/HeartButton/HeartButton';
import { IconButton } from '../../components/atoms/IconButton/IconButton';
import { PriceTag } from '../../components/atoms/PriceTag/PriceTag';
import { RatingBadge } from '../../components/atoms/RatingBadge/RatingBadge';
import { ShareButton } from '../../components/atoms/ShareButton/ShareButton';
import { SizeChip } from '../../components/atoms/SizeChip/SizeChip';
import { SwatchDot } from '../../components/atoms/SwatchDot/SwatchDot';
import { CustomSwatchDot } from '../../components/atoms/SwatchDot/CustomSwatchDot';
import { CarouselDot } from '../../components/atoms/CarouselDot/CarouselDot';

// Molecules
import { ProductCard } from '../../components/molecules/ProductCard/ProductCard';
import { HorizontalProductCard } from '../../components/molecules/HorizontalProductCard/HorizontalProductCard';
import { CategoryPill } from '../../components/molecules/CategoryPill/CategoryPill';
import { ColourCard } from '../../components/molecules/ColourCard/ColourCard';
import { PromoBanner } from '../../components/molecules/PromoBanner/PromoBanner';
import { SearchBar } from '../../components/molecules/SearchBar/SearchBar';
import { SpecificationRow } from '../../components/molecules/SpecificationRow/SpecificationRow';
import { StickyAddToBagBar } from '../../components/molecules/StickyAddToBagBar/StickyAddToBagBar';
import { FrequentlyBoughtRow } from '../../components/molecules/FrequentlyBoughtRow/FrequentlyBoughtRow';
import { ReviewCard } from '../../components/molecules/ReviewCard/ReviewCard';
import { Breadcrumbs } from '../../components/molecules/Breadcrumbs/Breadcrumbs';

// Organisms
import { BrandMark } from '../../components/organisms/BrandMark/BrandMark';
import { TopNav } from '../../components/organisms/TopNav/TopNav';
import { HorizontalProductStrip } from '../../components/organisms/HorizontalProductStrip/HorizontalProductStrip';
import { SizeSelector } from '../../components/organisms/SizeSelector/SizeSelector';
import { ColourSelector } from '../../components/organisms/ColourSelector/ColourSelector';
import { SpecificationsPanel } from '../../components/organisms/SpecificationsPanel/SpecificationsPanel';
import { RatingsPanel } from '../../components/organisms/RatingsPanel/RatingsPanel';
import { FrequentlyBoughtTogether } from '../../components/organisms/FrequentlyBoughtTogether/FrequentlyBoughtTogether';
import { MoreLinksCard } from '../../components/organisms/MoreLinksCard/MoreLinksCard';

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
function DesignSystemOverviewPage() {
  const { campaign, colorScheme, tokens, setCampaign, toggleColorScheme } = useTheme();
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColour, setSelectedColour] = useState('ivory');
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({ 1: true });

  const colourOptions = [
    { key: 'ivory', label: 'Ivory Gold', gradient: ['#f3e6d8', '#d3aa75'] as [string, string], group: 'warm' as const },
    { key: 'rose', label: 'Rose Petal', gradient: ['#f0d5d1', '#bf7b71'] as [string, string], group: 'warm' as const },
    { key: 'ocean', label: 'Ocean Teal', gradient: ['#dfe4f2', '#8aa0d7'] as [string, string], group: 'cool' as const },
    { key: 'stone', label: 'Stone Slate', gradient: ['#dacdbd', '#8a795f'] as [string, string], group: 'neutral' as const },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.background }}
      contentContainerStyle={{
        padding: 24,
        paddingBottom: 100,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
      }}
    >
      {/* Dynamic Campaign Theme Control Panel */}
      <YStack
        backgroundColor={tokens.surface}
        borderColor={tokens.border}
        borderWidth={1}
        borderRadius={20}
        padding={24}
        marginBottom={32}
        shadowColor="#000000"
        shadowOpacity={0.08}
        shadowRadius={16}
      >
        <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={16}>
          <YStack gap={4}>
            <XStack alignItems="center" gap={10}>
              <BrandMark size={32} label="V" />
              <Text fontSize={22} fontWeight="900" color={tokens.text} letterSpacing={-0.5}>
                Tamagui Design System &amp; Dynamic Theme Engine
              </Text>
            </XStack>
            <Text fontSize={13} color={tokens.textSecondary}>
              Components rebuilt with Tamagui primitives, interactive hover/press states, and reactive campaign tokens.
            </Text>
          </YStack>

          <XStack
            backgroundColor={tokens.surfaceRaised}
            borderColor={tokens.border}
            borderWidth={1}
            borderRadius={12}
            paddingHorizontal={16}
            paddingVertical={10}
            cursor="pointer"
            alignItems="center"
            onPress={toggleColorScheme}
            hoverStyle={{ borderColor: tokens.accent, scale: 1.02 }}
            pressStyle={{ scale: 0.96 }}
          >
            <Text fontSize={13} fontWeight="800" color={tokens.text}>
              {colorScheme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </Text>
          </XStack>
        </XStack>

        {/* Live Campaign Switcher */}
        <YStack marginTop={20} paddingTop={16} borderTopWidth={1} borderTopColor={tokens.border} gap={10}>
          <Text fontSize={12} fontWeight="800" textTransform="uppercase" letterSpacing={0.8} color={tokens.textMuted}>
            Active Theme Campaign:
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {AVAILABLE_CAMPAIGNS.map((c) => {
              const isActive = campaign === c;
              return (
                <XStack
                  key={c}
                  paddingHorizontal={14}
                  paddingVertical={8}
                  borderRadius={9999}
                  borderWidth={1}
                  borderColor={isActive ? tokens.accent : tokens.border}
                  backgroundColor={isActive ? tokens.accent : tokens.surfaceRaised}
                  cursor="pointer"
                  onPress={() => setCampaign(c as CampaignName)}
                  hoverStyle={{ scale: 1.05, borderColor: tokens.accent }}
                  pressStyle={{ scale: 0.95 }}
                >
                  <Text
                    fontSize={12}
                    fontWeight="800"
                    color={isActive ? tokens.accentForeground : tokens.text}
                  >
                    {CAMPAIGN_REGISTRY[c].displayName}
                  </Text>
                </XStack>
              );
            })}
          </XStack>
        </YStack>
      </YStack>

      {/* ========================================================================= */}
      {/* 1. ATOMS */}
      {/* ========================================================================= */}
      <YStack marginBottom={36} gap={16}>
        <YStack gap={2}>
          <Text fontSize={20} fontWeight="800" color={tokens.text}>
            💎 1. Atoms (Base UI Primitives)
          </Text>
          <Text fontSize={13} color={tokens.textSecondary}>
            Micro-components with hover, press, and reactive token styling
          </Text>
        </YStack>

        {/* Badges & Chips Card */}
        <YStack backgroundColor={tokens.surface} borderColor={tokens.border} borderWidth={1} borderRadius={16} padding={20} gap={16}>
          <Text fontSize={12} fontWeight="800" textTransform="uppercase" letterSpacing={0.8} color={tokens.textMuted}>
            Badges &amp; Filter Chips
          </Text>
          <XStack flexWrap="wrap" gap={10} alignItems="center">
            <Badge label="34% OFF" variant="offer" />
            <Badge label="NEW ARRIVAL" variant="new" />
            <Badge label="LIMITED SALE" variant="sale" />
            <Badge label="EXPRESS 2-DAY" variant="express" />
            <Badge label="SPONSORED" variant="sponsored" />
            <Chip label="Handloom Sarees" active={true} />
            <Chip label="Pure Silk" active={false} />
            <Chip label="Zari Border" active={false} />
          </XStack>

          {/* Pricing & Ratings */}
          <Text fontSize={12} fontWeight="800" textTransform="uppercase" letterSpacing={0.8} color={tokens.textMuted} marginTop={8}>
            Price Tags &amp; Ratings
          </Text>
          <XStack flexWrap="wrap" gap={16} alignItems="baseline">
            <PriceTag price={3299} originalPrice={4999} offPercent={34} size="lg" />
            <PriceTag price={2499} originalPrice={3999} offPercent={38} size="md" />
            <PriceTag price={1290} size="sm" />
            <RatingBadge rating={4.8} count={248} />
            <RatingBadge rating={3.9} count={95} />
          </XStack>

          {/* Buttons, Dots & Swatches */}
          <Text fontSize={12} fontWeight="800" textTransform="uppercase" letterSpacing={0.8} color={tokens.textMuted} marginTop={8}>
            Buttons, Dots &amp; Swatches
          </Text>
          <XStack flexWrap="wrap" gap={12} alignItems="center">
            <HeartButton active={false} size={42} />
            <HeartButton active={true} size={42} />
            <ShareButton size={42} />
            <IconButton icon={<LuSearch size={18} color={tokens.text} />} size={42} />
            <IconButton icon={<LuFilter size={18} color={tokens.accent} />} size={42} active={true} />
            <IconButton icon={<LuSlidersHorizontal size={18} color={tokens.text} />} size={42} />
            <CarouselDot active={true} />
            <CarouselDot active={false} />
            <CarouselDot active={false} />
            <SwatchDot color="#d3aa75" selected={true} />
            <CustomSwatchDot template="contrast-border" primaryColor="#1565C0" secondaryColor="#E91E63" size={32} selected={true} />
            <CustomSwatchDot template="dual-tone" primaryColor="#6A1B9A" secondaryColor="#2E7D32" size={32} />
            <CustomSwatchDot template="half-and-half" primaryColor="#FBC02D" secondaryColor="#1B5E20" size={32} />
            <CustomSwatchDot template="multicolor" primaryColor="#C62828" secondaryColor="#FBC02D" tertiaryColor="#2E7D32" quaternaryColor="#1565C0" size={32} />
            <SizeChip label="S" selected={false} />
            <SizeChip label="M" selected={true} />
            <SizeChip label="L" selected={false} />
            <SizeChip label="XL" disabled={true} />
          </XStack>
        </YStack>
      </YStack>

      {/* ========================================================================= */}
      {/* 2. MOLECULES */}
      {/* ========================================================================= */}
      <YStack marginBottom={36} gap={16}>
        <YStack gap={2}>
          <Text fontSize={20} fontWeight="800" color={tokens.text}>
            🧪 2. Molecules (Composed UI Components)
          </Text>
          <Text fontSize={13} color={tokens.textSecondary}>
            Interactive cards, banners, bars, and search components
          </Text>
        </YStack>

        {/* Breadcrumbs Navigation */}
        <YStack backgroundColor={tokens.surface} borderColor={tokens.border} borderWidth={1} borderRadius={16} padding={20} gap={12}>
          <Text fontSize={12} fontWeight="800" textTransform="uppercase" letterSpacing={0.8} color={tokens.textMuted}>
            Site Navigation Breadcrumbs
          </Text>
          <Breadcrumbs
            items={[
              { label: 'Home', onPress: () => {} },
              { label: 'Women', onPress: () => {} },
              { label: 'Festive Handloom Sarees' },
            ]}
          />
        </YStack>

        {/* Search Bar */}
        <YStack backgroundColor={tokens.surface} borderColor={tokens.border} borderWidth={1} borderRadius={16} padding={20} gap={16}>
          <Text fontSize={12} fontWeight="800" textTransform="uppercase" letterSpacing={0.8} color={tokens.textMuted}>
            Search Bar &amp; Category Pills
          </Text>
          <SearchBar />
          <XStack flexWrap="wrap" gap={10}>
            <CategoryPill label="All Handlooms" active={true} />
            <CategoryPill label="Banarasi Silk" active={false} />
            <CategoryPill label="Kanjivaram" active={false} />
            <CategoryPill label="Chanderi" active={false} />
          </XStack>
        </YStack>

        {/* Promo Banner */}
        <PromoBanner
          eyebrow="Festive Gala Edit"
          title="Up to 50% Off Master Handlooms"
          subtitle="Directly from master weavers of Varanasi and Kanchipuram with certified silk mark."
        />

        {/* Product Cards */}
        <YStack backgroundColor={tokens.surface} borderColor={tokens.border} borderWidth={1} borderRadius={16} padding={20} gap={16}>
          <Text fontSize={12} fontWeight="800" textTransform="uppercase" letterSpacing={0.8} color={tokens.textMuted}>
            Product Cards (Grid &amp; Horizontal)
          </Text>
          <XStack flexWrap="wrap" gap={16} alignItems="flex-start">
            <ProductCard
              name="Ivory Gold Saree"
              price={3299}
              originalPrice={4999}
              gradient={['#edd9c5', '#d2a77a']}
              isWishlisted={wishlist[1]}
              onWishlistPress={() => setWishlist((w) => ({ ...w, 1: !w[1] }))}
            />
            <ProductCard
              name="Rose Bloom Silk"
              price={2799}
              originalPrice={4199}
              gradient={['#f3d6d8', '#cc8d9a']}
              isWishlisted={wishlist[2]}
              onWishlistPress={() => setWishlist((w) => ({ ...w, 2: !w[2] }))}
            />
            <HorizontalProductCard
              brand="VAANYA LUXE"
              name="Celestial Organza Drape"
              price={3499}
              originalPrice={5299}
              offPercent={34}
              rating={4.8}
              gradient={['#dfe4f2', '#8aa0d7']}
              showAddToBag={true}
            />
          </XStack>
        </YStack>

        {/* Colour Selector Cards */}
        <YStack backgroundColor={tokens.surface} borderColor={tokens.border} borderWidth={1} borderRadius={16} padding={20} gap={16}>
          <Text fontSize={12} fontWeight="800" textTransform="uppercase" letterSpacing={0.8} color={tokens.textMuted}>
            Colour Cards &amp; Specs
          </Text>
          <XStack flexWrap="wrap" gap={10} alignItems="flex-start">
            {colourOptions.map((c) => (
              <ColourCard
                key={c.key}
                label={c.label}
                gradient={c.gradient}
                selected={selectedColour === c.key}
                onPress={() => setSelectedColour(c.key)}
              />
            ))}
          </XStack>
          <YStack borderWidth={1} borderColor={tokens.border} borderRadius={12} overflow="hidden">
            <SpecificationRow label="Material" value="100% Pure Mulberry Silk" alt={false} />
            <SpecificationRow label="Weave Pattern" value="Handwoven Jacquard Zari" alt={true} />
            <SpecificationRow label="Origin" value="Varanasi, India" alt={false} />
          </YStack>
        </YStack>

        {/* Frequently Bought Row & Review Card */}
        <YStack backgroundColor={tokens.surface} borderColor={tokens.border} borderWidth={1} borderRadius={16} padding={20} gap={16}>
          <Text fontSize={12} fontWeight="800" textTransform="uppercase" letterSpacing={0.8} color={tokens.textMuted}>
            Frequently Bought Row &amp; Customer Review
          </Text>
          <FrequentlyBoughtRow
            brand="VAANYA HERITAGE"
            name="Handmade Silk Brocade Blouse Piece"
            price="₹899"
            originalPrice="₹1,299"
            offLabel="31% OFF"
            gradient={['#f3e6d8', '#d3aa75']}
            checked={true}
          />
          <ReviewCard
            initials="AK"
            name="Ananya Krishnamurthy"
            date="18 August 2026"
            rating={5}
            text="The drape and fabric feel absolute luxury. The gold zari thread has an authentic, subtle sheen rather than an overpowering glare. Truly impressed with the packaging as well."
          />
        </YStack>

        {/* Sticky Add To Bag Bar */}
        <YStack borderRadius={16} overflow="hidden" borderWidth={1} borderColor={tokens.border}>
          <StickyAddToBagBar price="₹3,299" title="Ivory Gold Handloom Saree (Size M)" />
        </YStack>
      </YStack>

      {/* ========================================================================= */}
      {/* 3. ORGANISMS */}
      {/* ========================================================================= */}
      <YStack marginBottom={36} gap={16}>
        <YStack gap={2}>
          <Text fontSize={20} fontWeight="800" color={tokens.text}>
            🏗️ 3. Organisms (High-level Modules)
          </Text>
          <Text fontSize={13} color={tokens.textSecondary}>
            Header, Selectors, Bundles, and Detailed Specifications
          </Text>
        </YStack>

        {/* Top Navigation */}
        <YStack backgroundColor={tokens.surface} borderColor={tokens.border} borderWidth={1} borderRadius={16} padding={20} gap={16}>
          <Text fontSize={12} fontWeight="800" textTransform="uppercase" letterSpacing={0.8} color={tokens.textMuted}>
            Top Navigation Bar
          </Text>
          <TopNav items={['Women', 'Men', 'Kids', 'Home', 'Beauty', 'Heritage']} />
        </YStack>

        {/* Horizontal Product Strip */}
        <YStack backgroundColor={tokens.surface} borderColor={tokens.border} borderWidth={1} borderRadius={16} overflow="hidden">
          <HorizontalProductStrip
            title="Fastest Selling Similar Products"
            subtitle="Curated handlooms in high demand today"
            products={[
              { id: '1', brand: 'VAANYA LUXE', name: 'Rose Mist Handloom Saree', price: 2432, originalPrice: 4499, offPercent: 46, rating: 4.5, gradient: ['#f0d5d1', '#bf7b71'], },
              { id: '2', brand: 'VAANYA HERITAGE', name: 'Dyed Jacquard Silk Drape', price: 2107, originalPrice: 4214, offPercent: 50, rating: 4.8, gradient: ['#dfe9d8', '#9ec38f'], },
              { id: '3', brand: 'VAANYA WEAVES', name: 'Celestial Organza Ensemble', price: 3499, originalPrice: 5299, offPercent: 34, rating: 4.2, gradient: ['#dfe4f2', '#8aa0d7'], },
            ]}
            showAddToBag={true}
          />
        </YStack>

        {/* Size Selector */}
        <YStack backgroundColor={tokens.surface} borderColor={tokens.border} borderWidth={1} borderRadius={16} padding={20}>
          <SizeSelector
            sizes={['XS', 'S', 'M', 'L', 'XL', 'XXL']}
            selected={selectedSize}
            disabled={['XXL']}
            onSelect={setSelectedSize}
          />
        </YStack>

        {/* Colour Selector */}
        <YStack backgroundColor={tokens.surface} borderColor={tokens.border} borderWidth={1} borderRadius={16} padding={20}>
          <ColourSelector
            options={colourOptions}
            selected={selectedColour}
            onSelect={setSelectedColour}
          />
        </YStack>

        {/* Specifications Panel */}
        <SpecificationsPanel
          specs={[
            { label: 'Fabric Composition', value: '100% Katan Mulberry Silk' },
            { label: 'Zari Type', value: 'Tested Gold Electroplated Zari' },
            { label: 'Saree Length', value: '5.5 Meters + 0.8M Blouse' },
            { label: 'Wash Care', value: 'Specialized Dry Cleaning Only' },
            { label: 'Silk Mark Certified', value: 'Yes (SM/2026/IND/9921)' },
          ]}
        />

        {/* Frequently Bought Together */}
        <FrequentlyBoughtTogether
          items={[
            {
              id: '1',
              brand: 'VAANYA LUXE',
              name: 'Ivory Gold Handloom Saree',
              price: '₹3,299',
              originalPrice: '₹4,999',
              offLabel: '34% OFF',
              gradient: ['#f3e6d8', '#d3aa75'],
              checked: true,
            },
            {
              id: '2',
              brand: 'VAANYA HERITAGE',
              name: 'Silk Brocade Stitched Blouse',
              price: '₹1,299',
              originalPrice: '₹1,999',
              offLabel: '35% OFF',
              gradient: ['#f0d5d1', '#bf7b71'],
              checked: true,
            },
          ]}
          totalPrice="₹4,598"
          totalOriginal="₹6,998"
          totalOff="₹2,400 OFF"
        />

        {/* Ratings Panel */}
        <RatingsPanel
          averageRating={4.8}
          totalReviews={248}
          breakdown={[180, 45, 15, 5, 3]}
          photoColors={['#edd9c5', '#f3d6d8', '#dfe4f2', '#dfe9d8']}
          reviews={[
            {
              initials: 'PS',
              name: 'Priyanka Sharma',
              date: '24 August 2026',
              rating: 5,
              text: 'The drape and texture exceeded expectations. Packed in a beautiful protective muslin cloth pouch.',
            },
            {
              initials: 'RM',
              name: 'Radhika Menon',
              date: '20 August 2026',
              rating: 4,
              text: 'Colors are true to image. Very lightweight despite the rich zari work.',
            },
          ]}
        />

        {/* More Links Card */}
        <MoreLinksCard
          links={[
            'About the Craft & Master Weavers',
            'Authentic Silk Mark Verification',
            'Free Express Shipping & 15-Day Return Policy',
            'Customer Care & Styling Concierge',
          ]}
        />
      </YStack>

      {/* ========================================================================= */}
      {/* 4. TEMPLATES */}
      {/* ========================================================================= */}
      <YStack marginBottom={36} gap={16}>
        <YStack gap={2}>
          <Text fontSize={20} fontWeight="800" color={tokens.text}>
            📐 4. Templates (Wireframe Layout Skeletons)
          </Text>
          <Text fontSize={13} color={tokens.textSecondary}>
            Page-level slot layouts with semantic regions (Header, Hero, Grid, Purchase Panel, Drawer)
          </Text>
        </YStack>

        <XStack flexWrap="wrap" gap={16}>
          {[
            {
              title: 'StorefrontTemplate',
              desc: 'Homepage layout with sticky header, hero banner, category strip, featured bento, collections strip, trust guarantees, and footer.',
              slots: 'Header · Hero · Categories · Featured · Collections · TrustBadges · Footer · CartDrawer',
            },
            {
              title: 'CatalogTemplate',
              desc: 'Product listing page (PLP) layout with breadcrumbs, filter chips, summary sorting bar, responsive product grid, and infinite pagination.',
              slots: 'Header · Breadcrumbs · Filters · SummaryBar · ProductGrid · Pagination · CartDrawer',
            },
            {
              title: 'ProductDetailTemplate',
              desc: 'Product detail page (PDP) layout with 2-column responsive split: media gallery, purchase panel, FBT bundle, specifications, reviews, and mobile sticky bar.',
              slots: 'Header · Breadcrumbs · Gallery · PurchasePanel · CrossSells · Specifications · Reviews · Recommendations · StickyBuyBar',
            },
          ].map((tpl) => (
            <YStack
              key={tpl.title}
              flex={1}
              minWidth={280}
              backgroundColor={tokens.surface}
              borderColor={tokens.border}
              borderWidth={1}
              borderRadius={16}
              padding={20}
              gap={8}
            >
              <Text fontSize={16} fontWeight="800" color={tokens.accent}>
                {tpl.title}
              </Text>
              <Text fontSize={12} color={tokens.textSecondary} lineHeight={18}>
                {tpl.desc}
              </Text>
              <YStack
                marginTop={6}
                backgroundColor={tokens.surfaceRaised}
                padding={10}
                borderRadius={8}
                borderWidth={1}
                borderColor={tokens.border}
              >
                <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                  SLOTS:
                </Text>
                <Text fontSize={11} color={tokens.textSecondary} marginTop={2}>
                  {tpl.slots}
                </Text>
              </YStack>
            </YStack>
          ))}
        </XStack>
      </YStack>

      {/* ========================================================================= */}
      {/* 5. PAGES */}
      {/* ========================================================================= */}
      <YStack marginBottom={36} gap={16}>
        <YStack gap={2}>
          <Text fontSize={20} fontWeight="800" color={tokens.text}>
            📱 5. Pages (Full E-Commerce Compositions)
          </Text>
          <Text fontSize={13} color={tokens.textSecondary}>
            Fully functional end-to-end screen compositions with live campaign theming
          </Text>
        </YStack>

        <XStack flexWrap="wrap" gap={16}>
          {[
            {
              name: 'HomePage',
              story: 'Pages/HomePage',
              tag: 'Storefront',
              desc: 'Complete storefront with hero festive edit, artisan initiative banner, fastest-selling collection strip, and trust badges.',
            },
            {
              name: 'CatalogPage',
              story: 'Pages/CatalogPage',
              tag: 'Product Listing',
              desc: 'Filterable catalog with fabric chips, price sorting, interactive product cards with wishlist toggles, and load-more pagination.',
            },
            {
              name: 'ProductDetailPage',
              story: 'Pages/ProductDetailPage',
              tag: 'PDP & Checkout',
              desc: 'Interactive 2-column PDP with swatch picker, size selector, frequently bought together bundle, verified ratings, and slide-up cart drawer.',
            },
          ].map((pg) => (
            <YStack
              key={pg.name}
              flex={1}
              minWidth={280}
              backgroundColor={tokens.surface}
              borderColor={tokens.border}
              borderWidth={1}
              borderRadius={16}
              padding={20}
              gap={10}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={16} fontWeight="900" color={tokens.text}>
                  {pg.name}
                </Text>
                <XStack
                  paddingHorizontal={8}
                  paddingVertical={3}
                  borderRadius={9999}
                  backgroundColor={tokens.accentSubtle}
                  borderWidth={1}
                  borderColor={tokens.accent}
                >
                  <Text fontSize={10} fontWeight="800" color={tokens.accent}>
                    {pg.tag}
                  </Text>
                </XStack>
              </XStack>
              <Text fontSize={12} color={tokens.textSecondary} lineHeight={18}>
                {pg.desc}
              </Text>
              <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                Storybook: <Text color={tokens.accent}>{pg.story}</Text>
              </Text>
            </YStack>
          ))}
        </XStack>
      </YStack>

      {/* ========================================================================= */}
      {/* 6. THEMES */}
      {/* ========================================================================= */}
      <YStack marginBottom={36} gap={16}>
        <YStack gap={2}>
          <Text fontSize={20} fontWeight="800" color={tokens.text}>
            🎨 6. Themes (Dynamic Campaign Token Engine)
          </Text>
          <Text fontSize={13} color={tokens.textSecondary}>
            Multi-campaign token sets switchable programmatically with light &amp; dark variations
          </Text>
        </YStack>

        <XStack flexWrap="wrap" gap={16}>
          {AVAILABLE_CAMPAIGNS.map((c) => {
            const reg = CAMPAIGN_REGISTRY[c];
            const isActive = campaign === c;
            return (
              <YStack
                key={c}
                flex={1}
                minWidth={280}
                backgroundColor={tokens.surface}
                borderColor={isActive ? tokens.accent : tokens.border}
                borderWidth={isActive ? 2 : 1}
                borderRadius={16}
                padding={20}
                gap={12}
                cursor="pointer"
                onPress={() => setCampaign(c)}
                hoverStyle={{ scale: 1.02 }}
                pressStyle={{ scale: 0.98 }}
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={16} fontWeight="900" color={tokens.text}>
                    {reg.displayName}
                  </Text>
                  {isActive ? (
                    <XStack
                      paddingHorizontal={8}
                      paddingVertical={3}
                      borderRadius={9999}
                      backgroundColor={tokens.accent}
                    >
                      <Text fontSize={10} fontWeight="800" color={tokens.accentForeground}>
                        ACTIVE NOW
                      </Text>
                    </XStack>
                  ) : null}
                </XStack>

                <Text fontSize={12} color={tokens.textSecondary} lineHeight={18}>
                  {reg.description}
                </Text>

                {/* Color Palette Preview */}
                <XStack gap={8} alignItems="center" marginTop={4}>
                  <XStack width={28} height={28} borderRadius={8} backgroundColor={reg.light.accent} borderWidth={1} borderColor="rgba(0,0,0,0.1)" />
                  <XStack width={28} height={28} borderRadius={8} backgroundColor={reg.light.surfaceRaised} borderWidth={1} borderColor="rgba(0,0,0,0.1)" />
                  <XStack width={28} height={28} borderRadius={8} backgroundColor={reg.dark.background} borderWidth={1} borderColor="rgba(255,255,255,0.2)" />
                  <XStack width={28} height={28} borderRadius={8} backgroundColor={reg.dark.accent} borderWidth={1} borderColor="rgba(255,255,255,0.2)" />
                </XStack>

                <Text fontSize={11} color={tokens.accent} fontWeight="700">
                  {isActive ? '✓ Currently applied to all components above' : 'Tap to apply this campaign theme →'}
                </Text>
              </YStack>
            );
          })}
        </XStack>
      </YStack>
    </ScrollView>
  );
}

const meta: Meta<any> = {
  args: {
    ...THEME_ARGS,
  },
  title: 'Design System/Overview',
  component: DesignSystemOverviewPage,
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

export const AllComponents: Story = {};
