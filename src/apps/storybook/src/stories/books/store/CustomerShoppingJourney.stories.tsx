import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuCircleCheckBig, LuShoppingBag, LuSparkles, LuArrowRight, LuRotateCcw } from 'react-icons/lu';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../../utils/storyTheme';
import { useTheme } from '../../../theme';
import { JourneyDefinition } from '../types';
import { JourneyPlayer } from '../harness/JourneyPlayer';
import { HomePage } from '../../../components/pages/HomePage';
import { CatalogPage } from '../../../components/pages/CatalogPage';
import { ProductDetailPage } from '../../../components/pages/ProductDetailPage';
import { CartPage, CartItemData, INITIAL_CART_ITEMS } from '../../../components/pages/CartPage';
import { CheckoutPage } from '../../../components/pages/CheckoutPage';

interface StoreJourneyState {
  selectedProduct: {
    name: string;
    price: number;
    size: string;
    color: string;
  };
  cartItems: CartItemData[];
  orderId?: string;
  paymentMethod?: string;
}

const INITIAL_STORE_STATE: StoreJourneyState = {
  selectedProduct: {
    name: 'Ivory Gold Saree',
    price: 3299,
    size: 'Free Size',
    color: 'Navy & Rani Pink',
  },
  cartItems: INITIAL_CART_ITEMS,
  orderId: 'VY-849201',
  paymentMethod: 'upi',
};

// ─────────────────────────────────────────────────────────────
// Order Confirmation Chapter Component
// ─────────────────────────────────────────────────────────────
function OrderConfirmationChapter({
  state,
  onRestart,
}: {
  state: StoreJourneyState;
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
        <LuCircleCheckBig size={40} color={tokens.accent} />
      </YStack>

      <YStack alignItems="center" gap={8} maxWidth={460}>
        <Text fontSize={11} fontWeight="800" color={tokens.accent} letterSpacing={1.4} textTransform="uppercase">
          Order Successfully Placed
        </Text>
        <Text fontSize={26} fontWeight="800" color={tokens.text} textAlign="center">
          Thank You for Shopping with DeepLens
        </Text>
        <Text fontSize={14} color={tokens.textSecondary} textAlign="center" lineHeight={22}>
          Your order #{state.orderId || 'VY-849201'} has been received by our master weavers and is being prepared with artisanal care.
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
          <Text fontSize={13} color={tokens.textMuted}>Order Reference</Text>
          <Text fontSize={14} fontWeight="700" color={tokens.text}>#{state.orderId || 'VY-849201'}</Text>
        </XStack>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textMuted}>Payment Mode</Text>
          <Text fontSize={13} fontWeight="600" color={tokens.text}>Instant UPI (Verified)</Text>
        </XStack>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textMuted}>Items Ordered</Text>
          <Text fontSize={13} fontWeight="600" color={tokens.text}>{state.cartItems.length} Handcrafted Pieces</Text>
        </XStack>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textMuted}>Estimated Delivery</Text>
          <Text fontSize={13} fontWeight="600" color={tokens.accent}>3-4 Business Days · Express Courier</Text>
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
          Replay Customer Journey
        </Text>
      </XStack>
    </YStack>
  );
}

// ─────────────────────────────────────────────────────────────
// The Journey Definition
// ─────────────────────────────────────────────────────────────
const customerShoppingJourney: JourneyDefinition<StoreJourneyState> = {
  id: 'customer-shopping-flow',
  title: 'Customer End-to-End Shopping Journey',
  tag: '🛍️ Store Book · Full Purchase Lifecycle',
  description:
    'Simulates a complete buyer experience: discovering handlooms on the Home page, filtering the Catalog, customizing on PDP, reviewing the Shopping Bag, and completing Checkout.',
  initialState: INITIAL_STORE_STATE,
  steps: [
    {
      id: 'step-home',
      title: '1. Storefront Home',
      subtitle: 'Discovery & Curation',
      badge: 'Discovery',
      simulatedAction: {
        label: 'Explore Festive Collection',
        description:
          'Customer lands on the luxury storefront, explores the Festive Handloom campaign hero banner, and taps "Explore Collection" to open the catalog.',
        durationMs: 4000,
      },
      render: ({ nextStep, updateState }) => (
        <HomePage
          onNavigateCatalog={() => nextStep()}
          onNavigatePDP={(name) => {
            if (name) updateState((prev) => ({ selectedProduct: { ...prev.selectedProduct, name } }));
            nextStep();
          }}
        />
      ),
    },
    {
      id: 'step-catalog',
      title: '2. Product Catalog',
      subtitle: 'Filter & Select Item',
      badge: 'Selection',
      simulatedAction: {
        label: 'Select Handloom Silk Saree',
        description:
          'Customer filters the catalog for Mulberry Silk, scrolls through the artisan grid, and selects the "Ivory Gold Saree" to inspect details.',
        durationMs: 4500,
      },
      render: ({ nextStep, prevStep, updateState }) => (
        <CatalogPage
          onNavigateHome={() => prevStep()}
          onOpenProduct={(name) => {
            if (name) updateState((prev) => ({ selectedProduct: { ...prev.selectedProduct, name } }));
            nextStep();
          }}
        />
      ),
    },
    {
      id: 'step-pdp',
      title: '3. Product Details',
      subtitle: 'Color Swatch & Add to Bag',
      badge: 'Decision',
      simulatedAction: {
        label: 'Add Handloom Saree to Bag',
        description:
          'Customer inspects high-resolution zari details, selects Navy & Rani Pink contrast border, and clicks "Add to Bag", updating the persistent cart.',
        durationMs: 4000,
      },
      render: ({ nextStep, prevStep, updateState, state }) => (
        <ProductDetailPage
          onNavigateHome={() => prevStep()}
          onNavigateCatalog={() => prevStep()}
        />
      ),
    },
    {
      id: 'step-cart',
      title: '4. Shopping Bag',
      subtitle: 'Verify Items & Promo',
      badge: 'Bag Review',
      simulatedAction: {
        label: 'Proceed to Checkout',
        description:
          'Customer reviews the bag with live price breakdown, verifies free shipping eligibility, and clicks "Proceed to Checkout".',
        durationMs: 4000,
      },
      render: ({ nextStep, prevStep, state }) => (
        <CartPage
          initialItems={state.cartItems}
          onNavigateHome={() => prevStep()}
          onNavigatePDP={() => prevStep()}
          onProceedToCheckout={() => nextStep()}
        />
      ),
    },
    {
      id: 'step-checkout',
      title: '5. Single-Screen Checkout',
      subtitle: 'Address & UPI Payment',
      badge: 'Payment',
      simulatedAction: {
        label: 'Confirm Address & Place Order',
        description:
          'Customer selects verified delivery address in Bengaluru, chooses Instant UPI payment, and confirms order.',
        durationMs: 4500,
      },
      render: ({ nextStep, prevStep, state }) => (
        <CheckoutPage
          items={state.cartItems}
          onNavigateHome={() => prevStep()}
          onNavigateBag={() => prevStep()}
        />
      ),
    },
    {
      id: 'step-confirmation',
      title: '6. Order Confirmed',
      subtitle: 'Invoice & Fulfillment Receipt',
      badge: 'Receipt',
      simulatedAction: {
        label: 'Order Confirmed & Logged',
        description:
          'Order #VY-849201 is confirmed and sent to logistics. The customer receives tracking details and receipt summary.',
        durationMs: 5000,
      },
      render: ({ state, goToStep }) => (
        <OrderConfirmationChapter
          state={state}
          onRestart={() => goToStep(0)}
        />
      ),
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// Storybook Meta & Stories
// ─────────────────────────────────────────────────────────────
const meta: Meta<typeof JourneyPlayer> = {
  title: 'Books/Store/Customer Shopping Journey',
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

/**
 * Default interactive book mode: Stakeholder can explore chapters using
 * the scrubber, play/pause automated simulation, or click through pages manually.
 */
export const InteractiveJourney: Story = {
  render: (args: any) => (
    <JourneyPlayer
      journey={customerShoppingJourney}
      initialFormFactor={args.initialFormFactor || 'desktop'}
      initialAutoPlay={args.initialAutoPlay || false}
    />
  ),
};

/**
 * Mobile-first customer journey (390px iPhone viewport).
 */
export const MobileShoppingFlow: Story = {
  render: () => (
    <JourneyPlayer
      journey={customerShoppingJourney}
      initialFormFactor="mobile"
      initialAutoPlay={false}
    />
  ),
};

/**
 * Tablet viewport customer journey (768px iPad viewport).
 */
export const TabletShoppingFlow: Story = {
  render: () => (
    <JourneyPlayer
      journey={customerShoppingJourney}
      initialFormFactor="tablet"
      initialAutoPlay={false}
    />
  ),
};

/**
 * Auto-Play Simulation: Immediately starts playing with automated transitions.
 */
export const AutoPlaySimulation: Story = {
  render: () => (
    <JourneyPlayer
      journey={customerShoppingJourney}
      initialFormFactor="desktop"
      initialAutoPlay={true}
    />
  ),
};
