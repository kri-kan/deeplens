import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  OrderLedgerPage,
  OrderLedgerPageProps,
} from '../../components/pages/OrderLedgerPage';
import { LogisticsOrderCardData } from '../../components/molecules/LogisticsOrderCard';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────

const now = new Date();
const twentyMinsAgo = new Date(now.getTime() - 20 * 60 * 1000);
const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
const yesterday = new Date(now.getTime() - 26 * 60 * 60 * 1000);
const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

const MOCK_ORDERS: LogisticsOrderCardData[] = [
  {
    id: 'ord-101',
    orderNumber: 'ORD-849201',
    customerName: 'Ananya Sharma',
    customerPhone: '+91 98765 43210',
    shippingCity: 'Bengaluru',
    shippingState: 'Karnataka',
    source: 'WhatsApp',
    paymentMode: 'COD',
    totalOrderValue: 4899,
    totalCodBalance: 4399,
    orderDate: twentyMinsAgo.toISOString(),
    status: 'PendingFulfillment',
    totalItemsCount: 2,
    packages: [
      {
        id: 'pkg-1',
        packageNumber: 1,
        vendorName: 'Jaipur Crafts Studio',
        fulfillmentPath: 'ProcureToShip',
        procurementStage: 'Pending',
      },
      {
        id: 'pkg-2',
        packageNumber: 2,
        vendorName: 'Varanasi Weavers',
        fulfillmentPath: 'ProcureToShip',
        procurementStage: 'Pending',
      },
    ],
    hasNdr: false,
  },
  {
    id: 'ord-102',
    orderNumber: 'ORD-849198',
    customerName: 'Rhea Sengupta',
    customerPhone: '+91 91234 56789',
    shippingCity: 'Mumbai',
    shippingState: 'Maharashtra',
    source: 'Instagram',
    paymentMode: 'Prepaid',
    totalOrderValue: 3200,
    orderDate: threeHoursAgo.toISOString(),
    status: 'InTransit',
    totalItemsCount: 1,
    packages: [
      {
        id: 'pkg-3',
        packageNumber: 1,
        vendorName: 'Central Hub Stock',
        awbNumber: 'DEL-991823901',
        fulfillmentPath: 'CentralHubStock',
      },
    ],
    hasNdr: false,
  },
  {
    id: 'ord-103',
    orderNumber: 'ORD-849185',
    customerName: 'Karthik Rao',
    customerPhone: '+91 99887 76655',
    shippingCity: 'Hyderabad',
    shippingState: 'Telangana',
    source: 'WhatsApp',
    paymentMode: 'COD',
    totalOrderValue: 1850,
    totalCodBalance: 1850,
    orderDate: yesterday.toISOString(),
    status: 'NdrActionNeeded',
    totalItemsCount: 1,
    packages: [
      {
        id: 'pkg-4',
        packageNumber: 1,
        vendorName: 'Surat Handlooms',
        awbNumber: 'DEL-991821102',
        isNdr: true,
        fulfillmentPath: 'DirectVendor',
      },
    ],
    hasNdr: true,
  },
  {
    id: 'ord-104',
    orderNumber: 'ORD-849170',
    customerName: 'Meera Nambiar',
    customerPhone: '+91 94433 22110',
    shippingCity: 'Kochi',
    shippingState: 'Kerala',
    source: 'WhatsApp',
    paymentMode: 'Prepaid',
    totalOrderValue: 1450,
    orderDate: threeDaysAgo.toISOString(),
    status: 'InProcurement',
    totalItemsCount: 1,
    packages: [
      {
        id: 'pkg-5',
        packageNumber: 1,
        vendorName: 'Kanchipuram Silks',
        fulfillmentPath: 'ProcureToShip',
        procurementStage: 'Inbound',
      },
    ],
    hasNdr: false,
  },
  {
    id: 'ord-105',
    orderNumber: 'ORD-849140',
    customerName: 'Pooja Deshmukh',
    customerPhone: '+91 97766 55443',
    shippingCity: 'Pune',
    shippingState: 'Maharashtra',
    source: 'Instagram',
    paymentMode: 'Prepaid',
    totalOrderValue: 6500,
    orderDate: new Date(now.getTime() - 96 * 60 * 60 * 1000).toISOString(),
    status: 'Delivered',
    totalItemsCount: 3,
    packages: [
      {
        id: 'pkg-6',
        packageNumber: 1,
        vendorName: 'Central Hub Stock',
        awbNumber: 'DEL-991800129',
        fulfillmentPath: 'CentralHubStock',
      },
    ],
    hasNdr: false,
  },
];

// ─────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────

const meta: Meta<any> = {
  title: 'Pages/OrderLedger',
  component: OrderLedgerPage,
  args: {
    ...THEME_ARGS,
    disableSafeArea: false,
    initialOrders: MOCK_ORDERS,
    onOrderDetails: (id: string) => alert(`Navigate to order details: ${id}`),
    onOrderFulfillment: (id: string) => alert(`Open fulfillment hub for: ${id}`),
    onResolveNdr: (id: string) => alert(`Open NDR resolve sheet for: ${id}`),
    onOpenSettings: () => alert('Open settings modal'),
    onRefresh: () => console.log('Refreshing order ledger...'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    disableSafeArea: {
      control: 'boolean',
      description: 'Disable safe area insets inside storybook device frame',
    },
  },
};

export default meta;
type Story = StoryObj<any>;

// ─────────────────────────────────────────────
// Stories: 7-State UI Validation
// ─────────────────────────────────────────────

/**
 * 1. Populated Active Ledger (Mobile View)
 * Demonstrates the full dispatch ledger with KPI banner, filter pills, COD & Prepaid orders.
 */
export const AllOrders: Story = {
  name: '1. All Orders (Mobile)',
  decorators: [withFormFactor('mobile', 'Order Ledger - All Orders')],
  args: {
    disableSafeArea: true,
    initialFilter: 'All',
  },
};

/**
 * 2. NDR Exception Raised State
 * Focuses on orders flagged with NDR exceptions, showing prominent alert banners and quick action.
 */
export const NdrAlertsFocused: Story = {
  name: '2. NDR Alerts Focused',
  decorators: [withFormFactor('mobile', 'Order Ledger - NDR Alerts')],
  args: {
    disableSafeArea: true,
    initialFilter: 'NdrActionNeeded',
  },
};

/**
 * 3. In-Transit Orders
 * Shows orders dispatched with courier AWB tracking chips.
 */
export const InTransitOrders: Story = {
  name: '3. In-Transit Orders',
  decorators: [withFormFactor('mobile', 'Order Ledger - In Transit')],
  args: {
    disableSafeArea: true,
    initialFilter: 'InTransit',
  },
};

/**
 * 4. Empty Search Results
 * Simulates a filter or search with zero matching results.
 */
export const EmptySearchResults: Story = {
  name: '4. Empty Search State',
  decorators: [withFormFactor('mobile', 'Order Ledger - Empty Search')],
  args: {
    disableSafeArea: true,
    initialSearchQuery: 'nonexistent-query-12345',
  },
};

/**
 * 5. Clean Zero Ledger (Initial State)
 * Zero orders in the database.
 */
export const CleanZeroLedger: Story = {
  name: '5. Zero Activity Ledger',
  decorators: [withFormFactor('mobile', 'Order Ledger - Zero Activity')],
  args: {
    disableSafeArea: true,
    initialOrders: [],
  },
};

/**
 * 6. Responsive Tablet Layout
 * Demonstrates wide layout responsiveness.
 */
export const TabletLedger: Story = {
  name: '6. Tablet / Wide Viewport',
  decorators: [withFormFactor('tablet', 'Order Ledger - Tablet')],
  args: {
    disableSafeArea: true,
    initialFilter: 'All',
  },
};
