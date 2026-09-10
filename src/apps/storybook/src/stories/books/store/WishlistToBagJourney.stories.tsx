import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuHeart, LuShoppingBag, LuSparkles, LuRotateCcw, LuCheck } from 'react-icons/lu';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../../utils/storyTheme';
import { useTheme } from '../../../theme';
import { JourneyDefinition } from '../types';
import { JourneyPlayer } from '../harness/JourneyPlayer';
import { HomePage } from '../../../components/pages/HomePage';
import { ProductDetailPage } from '../../../components/pages/ProductDetailPage';
import { WishlistPage, INITIAL_WISHLIST_ITEMS } from '../../../components/pages/WishlistPage';
import { CartPage, CartItemData } from '../../../components/pages/CartPage';

interface WishlistJourneyState {
  wishlistCount: number;
  cartItems: CartItemData[];
}

const INITIAL_WISHLIST_STATE: WishlistJourneyState = {
  wishlistCount: INITIAL_WISHLIST_ITEMS.length,
  cartItems: [
    {
      id: 'w1-converted',
      brand: 'VAYYARI HERITAGE',
      name: 'Rani Pink Pure Katan Silk Banarasi Handloom Saree',
      seller: 'VAYYARI MASTER WEAVERS GUILD',
      colorName: 'Rani Pink',
      colorTemplate: 'solid',
      primaryColor: '#e91e63',
      size: 'Free Size',
      availableSizes: ['Free Size'],
      quantity: 1,
      price: 4799,
      originalPrice: 8999,
      gradient: ['#f48fb1', '#ad1457'],
      returnDays: 14,
      selected: true,
    },
  ],
};

function ConversionSuccessChapter({
  onRestart,
}: {
  onRestart: () => void;
}) {
  const { tokens } = useTheme();

  return (
    <YStack
      flex={1}
      minHeight={650}
      backgroundColor={tokens.background}
      alignItems="center"
      justifyContent="center"
      padding={32}
      gap={24}
    >
      <YStack
        width={72}
        height={72}
        borderRadius={36}
        backgroundColor={tokens.accentSubtle}
        alignItems="center"
        justifyContent="center"
      >
        <LuHeart size={40} color={tokens.accent} />
      </YStack>

      <YStack alignItems="center" gap={8} maxWidth={460}>
        <Text fontSize={11} fontWeight="800" color={tokens.accent} letterSpacing={1.4} textTransform="uppercase">
          High-Intent Conversion Complete
        </Text>
        <Text fontSize={26} fontWeight="800" color={tokens.text} textAlign="center">
          Wishlist Item Moved to Bag
        </Text>
        <Text fontSize={14} color={tokens.textSecondary} textAlign="center" lineHeight={22}>
          The customer successfully converted a saved wishlist item into an active checkout session with price protection applied.
        </Text>
      </YStack>

      <YStack
        backgroundColor={tokens.surface}
        borderWidth={1}
        borderColor={tokens.border}
        borderRadius={16}
        padding={20}
        width="100%"
        maxWidth={480}
        gap={12}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textMuted}>Converted Item</Text>
          <Text fontSize={14} fontWeight="700" color={tokens.accent}>Rani Pink Banarasi Saree</Text>
        </XStack>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textMuted}>Promotional Savings</Text>
          <Text fontSize={13} fontWeight="600" color={tokens.text}>₹4,200 (46% Off)</Text>
        </XStack>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textMuted}>Status</Text>
          <XStack backgroundColor={tokens.accentSubtle} paddingHorizontal={8} paddingVertical={2} borderRadius={8}>
            <Text fontSize={12} fontWeight="700" color={tokens.accent}>READY IN SHOPPING BAG</Text>
          </XStack>
        </XStack>
      </YStack>

      <XStack
        backgroundColor={tokens.accent}
        paddingHorizontal={24}
        paddingVertical={12}
        borderRadius={24}
        alignItems="center"
        gap={8}
        cursor="pointer"
        pressStyle={{ opacity: 0.9 }}
        onPress={onRestart}
      >
        <LuRotateCcw size={16} color={tokens.accentForeground} />
        <Text fontSize={14} fontWeight="700" color={tokens.accentForeground}>
          Replay Wishlist Conversion Flow
        </Text>
      </XStack>
    </YStack>
  );
}

const wishlistToBagJourney: JourneyDefinition<WishlistJourneyState> = {
  id: 'wishlist-to-bag-flow',
  title: 'Wishlist Save to Bag Conversion Journey',
  tag: '💖 Store Book · Intent & Conversion',
  description:
    'Simulates a high-intent customer browsing the luxury catalog, bookmarking an artisanal Katan silk saree to their Wishlist, and later moving it directly to their Shopping Bag.',
  initialState: INITIAL_WISHLIST_STATE,
  steps: [
    {
      id: 'step-home',
      title: '1. Discovery',
      subtitle: 'Browse Seasonal Edit',
      badge: 'Discovery',
      simulatedAction: {
        label: 'Discover Banarasi Silk Saree',
        description:
          'Customer browses the festive collection on Home page and taps into the Banarasi handloom section.',
        durationMs: 4000,
      },
      render: ({ nextStep }) => (
        <HomePage
          onNavigateCatalog={() => nextStep()}
          onNavigatePDP={() => nextStep()}
        />
      ),
    },
    {
      id: 'step-pdp',
      title: '2. Save to Wishlist',
      subtitle: 'Bookmark Saree on PDP',
      badge: 'Bookmark',
      simulatedAction: {
        label: 'Save Handloom to Wishlist',
        description:
          'Customer examines Rani Pink silk saree, clicks the Heart bookmark button, and navigates to their personal Wishlist.',
        durationMs: 4000,
      },
      render: ({ nextStep, prevStep }) => (
        <ProductDetailPage
          onNavigateHome={() => prevStep()}
          onNavigateCatalog={() => nextStep()}
        />
      ),
    },
    {
      id: 'step-wishlist',
      title: '3. Wishlist Review',
      subtitle: 'Move Saree to Shopping Bag',
      badge: 'Decision',
      simulatedAction: {
        label: 'Move Saree to Active Bag',
        description:
          'Customer opens Wishlist, verifies stock availability, and taps "Move to Bag" to activate checkout purchase.',
        durationMs: 4500,
      },
      render: ({ nextStep, prevStep }) => (
        <WishlistPage
          onNavigateHome={() => prevStep()}
          onNavigateCart={() => nextStep()}
          onNavigatePDP={() => prevStep()}
        />
      ),
    },
    {
      id: 'step-cart',
      title: '4. Shopping Bag',
      subtitle: 'Review Bag with Converted Item',
      badge: 'Bag',
      simulatedAction: {
        label: 'Review Converted Bag Item',
        description:
          'Shopping Bag updates with Rani Pink Banarasi Saree, applying festive discount and readying for checkout.',
        durationMs: 4000,
      },
      render: ({ nextStep, prevStep, state }) => (
        <CartPage
          initialItems={state.cartItems}
          onNavigateHome={() => prevStep()}
          onProceedToCheckout={() => nextStep()}
        />
      ),
    },
    {
      id: 'step-complete',
      title: '5. Converted',
      subtitle: 'Intent Funnel Complete',
      badge: 'Converted',
      simulatedAction: {
        label: 'Conversion Funnel Logged',
        description:
          'Wishlist-to-Cart analytics event recorded; session primed for payment processing.',
        durationMs: 4500,
      },
      render: ({ goToStep }) => (
        <ConversionSuccessChapter onRestart={() => goToStep(0)} />
      ),
    },
  ],
};

const meta: Meta<typeof JourneyPlayer> = {
  title: 'Books/Store/Wishlist to Bag Journey',
  component: JourneyPlayer,
  args: {
    ...THEME_ARGS,
    initialAutoPlay: false,
    initialFormFactor: 'desktop',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    initialAutoPlay: {
      control: 'boolean',
      description: 'Start simulation automatically on story load',
    },
    initialFormFactor: {
      control: 'select',
      options: ['desktop', 'tablet', 'mobile'],
      description: 'Default viewport size for the journey',
    },
  },
};

export default meta;
type Story = StoryObj<typeof JourneyPlayer>;

export const InteractiveWishlistConversion: Story = {
  render: (args: any) => (
    <JourneyPlayer
      journey={wishlistToBagJourney}
      initialFormFactor={args.initialFormFactor || 'desktop'}
      initialAutoPlay={args.initialAutoPlay || false}
    />
  ),
};

export const AutoPlaySimulation: Story = {
  render: () => (
    <JourneyPlayer
      journey={wishlistToBagJourney}
      initialFormFactor="desktop"
      initialAutoPlay={true}
    />
  ),
};
