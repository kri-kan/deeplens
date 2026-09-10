import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuUsers,
  LuShieldCheck,
  LuTag,
  LuShoppingBag,
  LuPlus,
  LuLayoutDashboard,
  LuTruck,
  LuCircleCheckBig,
  LuRotateCcw,
  LuPackageCheck,
} from 'react-icons/lu';
import { RiWhatsappFill, RiInstagramFill } from 'react-icons/ri';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../../utils/storyTheme';
import { useTheme } from '../../../theme';
import { JourneyDefinition } from '../types';
import { JourneyPlayer } from '../harness/JourneyPlayer';
import { OperationsHubPage, UtilityGroup } from '../../../components/pages/OperationsHubPage';
import { OrderLedgerPage } from '../../../components/pages/OrderLedgerPage';
import {
  AdminOrderDetailPage,
  OrderItem,
  AddressData,
} from '../../../components/pages/AdminOrderDetailPage';
import { LogisticsOrderCardData } from '../../../components/molecules/LogisticsOrderCard';

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────
const MOCK_GROUPS: UtilityGroup[] = [
  {
    id: 'business',
    title: 'Business & Operations',
    items: [
      {
        id: 'order-ledger',
        title: 'Order Ledger',
        description: 'Multi-channel logistics & dispatch pipeline',
        icon: <LuTruck size={36} color="#059669" />,
        route: '/orders/ledger',
        color: '#059669',
      },
      {
        id: 'orders-whatsapp',
        title: 'WhatsApp Orders',
        description: 'Orders received via WhatsApp chat',
        icon: <RiWhatsappFill size={36} color="#25D366" />,
        route: '/orders/whatsapp',
        color: '#25D366',
      },
      {
        id: 'orders-instagram',
        title: 'Instagram Orders',
        description: 'Orders originating from Instagram DM',
        icon: <RiInstagramFill size={36} color="#E1306C" />,
        route: '/orders/instagram',
        color: '#E1306C',
      },
    ],
  },
  {
    id: 'admin',
    title: 'Administration & Access',
    items: [
      {
        id: 'user-dir',
        title: 'User Directory',
        description: 'Team permissions & roles',
        icon: <LuUsers size={36} color="#6366F1" />,
        route: '/system/users',
        color: '#6366F1',
      },
      {
        id: 'roles-access',
        title: 'Roles & Access',
        description: 'RBAC capability matrix',
        icon: <LuShieldCheck size={36} color="#0D9488" />,
        route: '/system/roles',
        color: '#0D9488',
      },
    ],
  },
];

const now = new Date();
const twentyMinsAgo = new Date(now.getTime() - 20 * 60 * 1000);

const MOCK_LEDGER_ORDERS: LogisticsOrderCardData[] = [
  {
    id: 'ord-101',
    orderNumber: '849201',
    customerName: 'Priya Menon',
    customerPhone: '+91 98765 43210',
    shippingCity: 'Bengaluru',
    shippingState: 'Karnataka',
    source: 'WhatsApp',
    paymentMode: 'COD',
    totalOrderValue: 2949,
    totalCodBalance: 2449,
    orderDate: twentyMinsAgo.toISOString(),
    status: 'PendingFulfillment',
    totalItemsCount: 2,
    packages: [
      {
        id: 'pkg-1',
        packageNumber: 1,
        vendorName: 'Varanasi Weavers Ltd',
        fulfillmentPath: 'ProcureToShip',
        procurementStage: 'Pending',
      },
    ],
    hasNdr: false,
  },
];

const MOCK_ITEMS: OrderItem[] = [
  {
    id: 'item-1',
    productId: 'PRD-10291',
    title: 'Handloom Kanjivaram Silk Saree',
    size: 'Free Size',
    quantity: 1,
    costPerPiece: 2499,
    codChargePerPiece: 50,
    amountPaid: 500,
    vendor: 'Varanasi Weavers Ltd',
    imageColor: '#e8d5c4',
    catalogImageColor: '#b2997d',
  },
  {
    id: 'item-2',
    productId: 'PRD-10292',
    title: 'Zari Embroidered Blouse Piece',
    size: 'M',
    quantity: 2,
    costPerPiece: 450,
    codChargePerPiece: 50,
    amountPaid: 0,
    vendor: 'Surat Handlooms',
    imageColor: '#c9b8a8',
    catalogImageColor: '#9e8a78',
  },
];

const MOCK_ADDRESS: AddressData = {
  name: 'Priya Menon',
  phone: '+91 98765 43210',
  address: '12, Koramangala 4th Block, Bengaluru, Karnataka',
  pincode: '560034',
};

interface AdminFulfillmentState {
  orderId: string;
  items: OrderItem[];
  address: AddressData;
  status: 'Pending' | 'Verified' | 'Dispatched';
  carrierTracking?: string;
}

const INITIAL_ADMIN_STATE: AdminFulfillmentState = {
  orderId: '849201',
  items: MOCK_ITEMS,
  address: MOCK_ADDRESS,
  status: 'Pending',
  carrierTracking: 'DL-BLR-98421',
};

// ─────────────────────────────────────────────
// Dispatched Confirmation Screen
// ─────────────────────────────────────────────
function OrderDispatchedChapter({
  state,
  onRestart,
}: {
  state: AdminFulfillmentState;
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
        <LuPackageCheck size={40} color={tokens.accent} />
      </YStack>

      <YStack alignItems="center" gap={8} maxWidth={460}>
        <Text fontSize={11} fontWeight="800" color={tokens.accent} letterSpacing={1.4} textTransform="uppercase">
          Fulfillment Complete
        </Text>
        <Text fontSize={26} fontWeight="800" color={tokens.text} textAlign="center">
          Order #{state.orderId} Dispatched
        </Text>
        <Text fontSize={14} color={tokens.textSecondary} textAlign="center" lineHeight={22}>
          The consignment has been manifested with BlueDart Express. Vendor procurement slips and customer WhatsApp shipment notifications were dispatched.
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
          <Text fontSize={13} color={tokens.textMuted}>Consignment Tracking</Text>
          <Text fontSize={14} fontWeight="700" color={tokens.accent}>{state.carrierTracking}</Text>
        </XStack>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textMuted}>Customer</Text>
          <Text fontSize={13} fontWeight="600" color={tokens.text}>{state.address.name} ({state.address.phone})</Text>
        </XStack>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textMuted}>Destination</Text>
          <Text fontSize={13} fontWeight="600" color={tokens.text}>{state.address.pincode} · Bengaluru</Text>
        </XStack>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color={tokens.textMuted}>Fulfillment Status</Text>
          <XStack backgroundColor={tokens.accentSubtle} paddingHorizontal={8} paddingVertical={2} borderRadius={8}>
            <Text fontSize={12} fontWeight="700" color={tokens.accent}>DISPATCHED</Text>
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
          Replay Fulfillment Flow
        </Text>
      </XStack>
    </YStack>
  );
}

// ─────────────────────────────────────────────
// The Journey Definition
// ─────────────────────────────────────────────
const adminFulfillmentJourney: JourneyDefinition<AdminFulfillmentState> = {
  id: 'admin-fulfillment-flow',
  title: 'Admin Order Intake & Fulfillment Workflow',
  tag: '📦 Admin Book · Multi-Channel Fulfillment',
  description:
    'Simulates how operations triage pending WhatsApp orders, verify line items with vendors, validate addresses via AI Smart Paste, and dispatch parcels.',
  initialState: INITIAL_ADMIN_STATE,
  steps: [
    {
      id: 'step-operations-hub',
      title: '1. Operations Hub',
      subtitle: 'KPI Triage & Tool Launch',
      badge: 'Triage',
      simulatedAction: {
        label: 'Triage Inbound Orders',
        description:
          'Operations manager reviews the operational queue and taps on "Order Ledger" to inspect pending multi-channel shipments.',
        durationMs: 4000,
      },
      render: ({ nextStep }) => (
        <OperationsHubPage
          groups={MOCK_GROUPS}
          disableSafeArea={true}
          onLaunchTool={() => nextStep()}
        />
      ),
    },
    {
      id: 'step-order-ledger',
      title: '2. Order Ledger',
      subtitle: 'Filter & Select WhatsApp Order',
      badge: 'Search',
      simulatedAction: {
        label: 'Select Pending WhatsApp Order #849201',
        description:
          'Manager reviews unfulfilled orders, filters for WhatsApp COD, and clicks on Priya Menon (#849201) to open details.',
        durationMs: 4000,
      },
      render: ({ nextStep, prevStep }) => (
        <OrderLedgerPage
          initialOrders={MOCK_LEDGER_ORDERS}
          disableSafeArea={true}
          onOrderDetails={() => nextStep()}
          onOrderFulfillment={() => nextStep()}
        />
      ),
    },
    {
      id: 'step-order-detail',
      title: '3. Order Inspection',
      subtitle: 'Review Items & Contact',
      badge: 'Audit',
      simulatedAction: {
        label: 'Inspect Order Line Items & Payment',
        description:
          'Manager checks the customer contact (+91 98765 43210), COD balance (₹2,449), and line items before adjusting inventory.',
        durationMs: 4000,
      },
      render: ({ nextStep, prevStep, state }) => (
        <AdminOrderDetailPage
          orderId={state.orderId}
          createdAt={new Date()}
          source="whatsapp"
          sourceContact={state.address.phone}
          paymentType="cod"
          initialProducts={state.items}
          initialAddress={state.address}
          initialProductSheetOpen={false}
          initialAddressSheetOpen={false}
          onSaveOrder={() => nextStep()}
        />
      ),
    },
    {
      id: 'step-product-sheet',
      title: '4. Line Item Sheet',
      subtitle: 'Edit Quantity & Vendor Cost',
      badge: 'Procurement',
      simulatedAction: {
        label: 'Verify Vendor Procurement & Cost',
        description:
          'Product edit sheet is opened: Manager verifies assignment to Varanasi Weavers Ltd, checks COD charge per piece, and updates wholesale rate.',
        durationMs: 4500,
      },
      render: ({ nextStep, state }) => (
        <AdminOrderDetailPage
          orderId={state.orderId}
          createdAt={new Date()}
          source="whatsapp"
          sourceContact={state.address.phone}
          paymentType="cod"
          initialProducts={state.items}
          initialAddress={state.address}
          initialProductSheetOpen={true}
          initialAddressSheetOpen={false}
          onSaveOrder={() => nextStep()}
        />
      ),
    },
    {
      id: 'step-address-sheet',
      title: '5. AI Address Fill',
      subtitle: 'Smart Paste WhatsApp Message',
      badge: 'Verification',
      simulatedAction: {
        label: 'Smart-Paste & Validate Address',
        description:
          'Address edit sheet is opened: Customer WhatsApp message is auto-parsed into Koramangala 4th Block, 560034 with deliverability verified.',
        durationMs: 4500,
      },
      render: ({ nextStep, state }) => (
        <AdminOrderDetailPage
          orderId={state.orderId}
          createdAt={new Date()}
          source="whatsapp"
          sourceContact={state.address.phone}
          paymentType="cod"
          initialProducts={state.items}
          initialAddress={state.address}
          initialProductSheetOpen={false}
          initialAddressSheetOpen={true}
          onSaveOrder={() => nextStep()}
        />
      ),
    },
    {
      id: 'step-dispatched',
      title: '6. Order Dispatched',
      subtitle: 'Manifest & Consignment Code',
      badge: 'Dispatched',
      simulatedAction: {
        label: 'Consignment Generated & Dispatched',
        description:
          'BlueDart tracking DL-BLR-98421 assigned, manifest signed, and customer notified via automated WhatsApp API.',
        durationMs: 5000,
      },
      render: ({ state, goToStep }) => (
        <OrderDispatchedChapter
          state={state}
          onRestart={() => goToStep(0)}
        />
      ),
    },
  ],
};

// ─────────────────────────────────────────────
// Storybook Meta & Stories
// ─────────────────────────────────────────────
const meta: Meta<typeof JourneyPlayer> = {
  title: 'Books/Admin/Order Fulfillment Workflow',
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

/**
 * Default mobile-first interactive admin workflow (390px iPhone viewport),
 * simulating a mobile warehouse/ops manager executing the full fulfillment run.
 */
export const InteractiveFulfillmentWorkflow: Story = {
  render: (args: any) => (
    <JourneyPlayer
      journey={adminFulfillmentJourney}
      initialFormFactor={args.initialFormFactor || 'mobile'}
      initialAutoPlay={args.initialAutoPlay || false}
    />
  ),
};

/**
 * Desktop workstation view (1200px) for high-density warehouse consoles.
 */
export const DesktopWarehouseView: Story = {
  render: () => (
    <JourneyPlayer
      journey={adminFulfillmentJourney}
      initialFormFactor="desktop"
      initialAutoPlay={false}
    />
  ),
};

/**
 * Auto-Play Simulation: Automatically runs through the entire fulfillment sequence.
 */
export const AutoPlaySimulation: Story = {
  render: () => (
    <JourneyPlayer
      journey={adminFulfillmentJourney}
      initialFormFactor="mobile"
      initialAutoPlay={true}
    />
  ),
};
