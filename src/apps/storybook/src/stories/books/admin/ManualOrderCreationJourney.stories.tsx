import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck, LuSparkles, LuRotateCcw, LuPlus } from 'react-icons/lu';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../../utils/storyTheme';
import { useTheme } from '../../../theme';
import { JourneyDefinition } from '../types';
import { JourneyPlayer } from '../harness/JourneyPlayer';
import { OrderIdGeneratorPage } from '../../../components/pages/OrderIdGeneratorPage';
import { AdminOrderFormPage, AddressData } from '../../../components/pages/AdminOrderFormPage';
import { AdminOrderDetailPage, OrderItem } from '../../../components/pages/AdminOrderDetailPage';

interface OrderCreationState {
  generatedId: string;
  sourceContact: string;
  address: AddressData;
  items: OrderItem[];
}

const INITIAL_CREATION_STATE: OrderCreationState = {
  generatedId: '928174',
  sourceContact: '+91 98765 43210',
  address: {
    name: 'Kavita Sundaram',
    phone: '+91 98765 43210',
    address: '45, Indiranagar 100ft Road, Bengaluru, Karnataka',
    pincode: '560038',
  },
  items: [
    {
      id: 'itm-1',
      productId: 'PRD-55012',
      title: 'Pure Chanderi Zari Handloom Saree',
      size: 'Free Size',
      quantity: 1,
      costPerPiece: 3899,
      codChargePerPiece: 50,
      amountPaid: 3899,
      vendor: 'Chanderi Artisans Guild',
      imageColor: '#f0e6d3',
    },
  ],
};

function CreationSuccessChapter({
  state,
  onRestart,
}: {
  state: OrderCreationState;
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
        <LuPlus size={40} color={tokens.accent} />
      </YStack>

      <YStack alignItems="center" gap={8} maxWidth={460}>
        <Text fontSize={11} fontWeight="800" color={tokens.accent} letterSpacing={1.4} textTransform="uppercase">
          Manual Order Provisioned
        </Text>
        <Text fontSize={26} fontWeight="800" color={tokens.text} textAlign="center">
          Order #{state.generatedId} Created
        </Text>
        <Text fontSize={14} color={tokens.textSecondary} textAlign="center" lineHeight={22}>
          The manual WhatsApp order has been provisioned into the ERP ledger, sync alerts sent to Chanderi Artisans Guild, and customer payment verified.
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
          <Text fontSize={13} color={tokens.textMuted}>Allocated Order ID</Text>
          <Text fontSize={14} fontWeight="700" color={tokens.accent}>#{state.generatedId}</Text>
        </XStack>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textMuted}>Customer Contact</Text>
          <Text fontSize={13} fontWeight="600" color={tokens.text}>{state.sourceContact}</Text>
        </XStack>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textMuted}>Customer Name</Text>
          <Text fontSize={13} fontWeight="600" color={tokens.text}>{state.address.name}</Text>
        </XStack>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textMuted}>Total Line Items</Text>
          <Text fontSize={13} fontWeight="600" color={tokens.text}>{state.items.length} Saree Item (₹3,899 Prepaid)</Text>
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
          Replay Manual Intake Flow
        </Text>
      </XStack>
    </YStack>
  );
}

const manualOrderCreationJourney: JourneyDefinition<OrderCreationState> = {
  id: 'manual-order-creation-flow',
  title: 'Manual WhatsApp Order Intake & ID Allocation',
  tag: '✍️ Admin Book · Direct Order Entry',
  description:
    'Simulates a sales executive allocating a sequential Order ID from WhatsApp inquiry, entering customer line items into the intake form, and reviewing the created order ledger entry.',
  initialState: INITIAL_CREATION_STATE,
  steps: [
    {
      id: 'step-generate-id',
      title: '1. ID Allocation',
      subtitle: 'Allocate Sequential Order ID',
      badge: 'Allocation',
      simulatedAction: {
        label: 'Allocate Order ID #928174',
        description:
          'Executive selects WhatsApp source, enters phone number +91 98765 43210, and generates sequential ERP Order ID #928174.',
        durationMs: 4000,
      },
      render: ({ nextStep }) => (
        <OrderIdGeneratorPage
          initialSelectedSource="whatsapp"
          initialPaymentMode="prepaid"
          initialSourceHandle="9876543210"
          disableSafeArea={true}
          onNavigateToDetails={() => nextStep()}
        />
      ),
    },
    {
      id: 'step-order-form',
      title: '2. Intake Form',
      subtitle: 'Fill Items, Address & Receipt',
      badge: 'Entry',
      simulatedAction: {
        label: 'Enter Line Items & Paste Address',
        description:
          'Executive populates Chanderi Silk Saree line item, pastes raw WhatsApp delivery address for Indiranagar, and submits form.',
        durationMs: 4500,
      },
      render: ({ nextStep, state }) => (
        <AdminOrderFormPage
          initialSource="whatsapp"
          initialSourceInput={state.sourceContact}
          initialPaymentType="prepaid"
          initialAddress={state.address}
          onSubmitOrder={() => nextStep()}
        />
      ),
    },
    {
      id: 'step-order-detail',
      title: '3. Order Verification',
      subtitle: 'Review & Verify Provisioned Order',
      badge: 'Audit',
      simulatedAction: {
        label: 'Verify Order Details in Ledger',
        description:
          'Executive verifies that Order #928174 has been created with prepaid payment token, correct delivery address, and single piece quantity.',
        durationMs: 4000,
      },
      render: ({ nextStep, state }) => (
        <AdminOrderDetailPage
          orderId={state.generatedId}
          createdAt={new Date()}
          source="whatsapp"
          sourceContact={state.sourceContact}
          paymentType="prepaid"
          initialProducts={state.items}
          initialAddress={state.address}
          initialTransactionId="UPI-IND-2026-98124"
          onSaveOrder={() => nextStep()}
        />
      ),
    },
    {
      id: 'step-complete',
      title: '4. Intake Logged',
      subtitle: 'ERP Sync & Confirmation',
      badge: 'Synced',
      simulatedAction: {
        label: 'Order Sync Complete',
        description:
          'Order is committed to the central database, vendor notifications triggered, and receipt logged.',
        durationMs: 4500,
      },
      render: ({ state, goToStep }) => (
        <CreationSuccessChapter
          state={state}
          onRestart={() => goToStep(0)}
        />
      ),
    },
  ],
};

const meta: Meta<typeof JourneyPlayer> = {
  title: 'Books/Admin/Manual Order Intake Flow',
  component: JourneyPlayer,
  args: {
    ...THEME_ARGS,
    initialAutoPlay: false,
    initialFormFactor: 'mobile',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    initialAutoPlay: {
      control: 'boolean',
      description: 'Start simulation automatically on story load',
    },
    initialFormFactor: {
      control: 'select',
      options: ['mobile', 'tablet', 'desktop'],
      description: 'Default viewport size for the journey',
    },
  },
};

export default meta;
type Story = StoryObj<typeof JourneyPlayer>;

export const InteractiveOrderCreation: Story = {
  render: (args: any) => (
    <JourneyPlayer
      journey={manualOrderCreationJourney}
      initialFormFactor={args.initialFormFactor || 'mobile'}
      initialAutoPlay={args.initialAutoPlay || false}
    />
  ),
};

export const AutoPlaySimulation: Story = {
  render: () => (
    <JourneyPlayer
      journey={manualOrderCreationJourney}
      initialFormFactor="mobile"
      initialAutoPlay={true}
    />
  ),
};
