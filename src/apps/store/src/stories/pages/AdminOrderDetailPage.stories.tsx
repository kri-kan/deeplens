import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminOrderDetailPage,
  OrderItem,
} from '../../components/pages/AdminOrderDetailPage';
import { AddressData } from '../../components/pages/AdminOrderFormPage';
import { FormFactorPreview, withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

// ─────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────

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

const MOCK_SINGLE_ITEM: OrderItem[] = [
  {
    id: 'item-1',
    productId: 'PRD-55012',
    title: 'Designer Georgette Anarkali Suit',
    size: 'L',
    quantity: 1,
    costPerPiece: 3899,
    amountPaid: 3899,
    vendor: 'Jaipur Crafts Studio',
    imageColor: '#f0e6d3',
  },
];

const MOCK_ADDRESS: AddressData = {
  name: 'Priya Menon',
  phone: '+91 98765 43210',
  address: '12, Koramangala 4th Block, Bengaluru, Karnataka',
  pincode: '560034',
};

// ─────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────

const meta: Meta<any> = {
  title: 'Pages/AdminOrderDetail',
  component: AdminOrderDetailPage,
  args: {
    ...THEME_ARGS,
    compactDate: false,
    onSaveOrder: (data: any) => alert(`Order saved: ${JSON.stringify(data, null, 2)}`),
    onDeleteOrder: () => alert('Order deleted!'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    compactDate: {
      control: 'boolean',
      description: 'Switch between standard (e.g. "Today, 6:32 PM") and compact ("6:32 PM") timebadge in header',
    },
  },
};

export default meta;
type Story = StoryObj<typeof AdminOrderDetailPage>;

// ─────────────────────────────────────────────
// Stories
// ─────────────────────────────────────────────

/**
 * WhatsApp COD order created today — shows time in header,
 * WhatsApp contact deeplink, COD pill, 2 items, address, and receipt attachment.
 */
export const WhatsAppCODToday: Story = {
  name: 'WhatsApp COD (Today)',
  decorators: [withFormFactor('mobile', 'Order Detail (WhatsApp COD)')],
  args: {
    orderId: '849201',
    createdAt: new Date(), // today -> formatted as "14:25"
    source: 'whatsapp',
    sourceContact: '9876543210',
    paymentType: 'cod',
    initialProducts: MOCK_ITEMS,
    initialAddress: MOCK_ADDRESS,
    initialTransactionId: '',
    initialReceiptUrl: null,
    initialProductSheetOpen: false,
    initialAddressSheetOpen: false,
  },
};

/**
 * Instagram Prepaid order created recently (current year) —
 * shows "24th Aug" in header, Instagram handle, Prepaid pill,
 * 1 item, and verified transaction ID with receipt screenshot attached.
 */
export const InstagramPrepaidRecent: Story = {
  name: 'Instagram Prepaid (Recent)',
  decorators: [withFormFactor('mobile', 'Order Detail (Instagram Prepaid)')],
  args: {
    orderId: '928174',
    createdAt: '2026-08-24T11:20:00Z', // recent -> formatted as "24th Aug"
    source: 'instagram',
    sourceContact: 'priya_menon_style',
    paymentType: 'prepaid',
    initialProducts: MOCK_SINGLE_ITEM,
    initialAddress: MOCK_ADDRESS,
    initialTransactionId: 'UPI-20260824-91823901',
    initialReceiptUrl: 'mock_receipt_screenshot.png',
    initialProductSheetOpen: false,
    initialAddressSheetOpen: false,
  },
};

/**
 * Product Line Item Sheet open — demonstrating editing
 * Product ID, Quantity, Cost per piece, Amount paid, and Vendor assignment.
 */
export const ProductSheetOpen: Story = {
  name: 'Product Sheet Open',
  decorators: [withFormFactor('mobile', 'Order Detail (Product Sheet Open)')],
  args: {
    orderId: '849201',
    createdAt: new Date(),
    source: 'whatsapp',
    sourceContact: '9876543210',
    paymentType: 'cod',
    initialProducts: MOCK_ITEMS,
    initialAddress: MOCK_ADDRESS,
    initialTransactionId: '',
    initialReceiptUrl: null,
    initialProductSheetOpen: true,
    initialAddressSheetOpen: false,
  },
};

/**
 * Address Sheet open — demonstrating editing customer delivery address
 * with underline fields, Smart Paste, and natural language AI Fill.
 */
export const AddressSheetOpen: Story = {
  name: 'Address Sheet Open',
  decorators: [withFormFactor('mobile', 'Order Detail (Address Sheet Open)')],
  args: {
    orderId: '849201',
    createdAt: new Date(),
    source: 'whatsapp',
    sourceContact: '9876543210',
    paymentType: 'cod',
    initialProducts: MOCK_ITEMS,
    initialAddress: MOCK_ADDRESS,
    initialTransactionId: '',
    initialReceiptUrl: null,
    initialProductSheetOpen: false,
    initialAddressSheetOpen: true,
  },
};

/**
 * Older order — demonstrating date formatting for past years ("Nov '24").
 */
export const OlderOrder: Story = {
  name: 'Older Order (Nov 24)',
  decorators: [withFormFactor('mobile', 'Order Detail (Older Order)')],
  args: {
    orderId: '629105',
    createdAt: '2024-11-15T09:45:00Z', // older -> formatted as "Nov '24"
    source: 'whatsapp',
    sourceContact: '9876543210',
    paymentType: 'prepaid',
    initialProducts: MOCK_ITEMS,
    initialAddress: MOCK_ADDRESS,
    initialTransactionId: 'BANK-IMPS-8921092',
    initialReceiptUrl: 'mock_receipt_screenshot.png',
    initialProductSheetOpen: false,
    initialAddressSheetOpen: false,
  },
};

/**
 * Multi-Select Active — demonstrating batch selection of order items,
 * count indicator ("2/2 Items Selected"), and red batch delete action.
 */
export const MultiSelectActive: Story = {
  name: 'Multi-Select Active',
  decorators: [withFormFactor('mobile', 'Order Detail (Multi-Select Active)')],
  args: {
    orderId: '849201',
    createdAt: new Date(),
    source: 'whatsapp',
    sourceContact: '9876543210',
    paymentType: 'cod',
    initialProducts: MOCK_ITEMS,
    initialAddress: MOCK_ADDRESS,
    initialTransactionId: '',
    initialReceiptUrl: null,
    initialProductSheetOpen: false,
    initialAddressSheetOpen: false,
  },
};

export const KidsWearOrder: Story = {
  name: 'Kids Wear Order (0-15 Years)',
  decorators: [withFormFactor('mobile', 'Order Detail (Kids Wear 0-15 Years)')],
  args: {
    orderId: '381924',
    createdAt: new Date(),
    source: 'whatsapp',
    sourceContact: '9876543210',
    paymentType: 'cod',
    initialProducts: [
      {
        id: 'item-kids-1',
        productId: 'KID-28014',
        title: 'Girls Silk Lehenga Choli Set',
        size: '28 (8Y)',
        quantity: 1,
        costPerPiece: 1899,
        codChargePerPiece: 50,
        amountPaid: 0,
        vendor: 'Jaipur Crafts Studio',
        imageColor: '#f3d9dc',
      },
      {
        id: 'item-kids-2',
        productId: 'KID-22009',
        title: 'Kids Festive Kurti & Sharara',
        size: '22 (3Y)',
        quantity: 2,
        costPerPiece: 950,
        codChargePerPiece: 50,
        amountPaid: 0,
        vendor: 'Surat Handlooms',
        imageColor: '#d6e5fa',
      },
    ],
    initialAddress: MOCK_ADDRESS,
    initialTransactionId: '',
    initialReceiptUrl: null,
    initialProductSheetOpen: false,
    initialAddressSheetOpen: false,
  },
};

/**
 * Single item delete confirmation prompt when clicking [X] on a line item
 */
export const SingleItemDeleteConfirmation: Story = {
  args: {
    orderId: '849201',
    createdAt: new Date(),
    source: 'whatsapp',
    sourceContact: '9876543210',
    paymentType: 'cod',
    initialProducts: MOCK_ITEMS,
    initialAddress: MOCK_ADDRESS,
    initialConfirmDialogOpen: true,
    initialConfirmDialogType: 'single',
  },
};

/**
 * Multi-select batch delete confirmation prompt when clicking "DELETE (2)"
 */
export const BatchDeleteConfirmation: Story = {
  args: {
    orderId: '849201',
    createdAt: new Date(),
    source: 'whatsapp',
    sourceContact: '9876543210',
    paymentType: 'cod',
    initialProducts: MOCK_ITEMS,
    initialSelectedIds: ['item-1', 'item-2'],
    initialAddress: MOCK_ADDRESS,
    initialConfirmDialogOpen: true,
    initialConfirmDialogType: 'batch',
  },
};


