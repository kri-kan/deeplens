import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AppendToOrderPage,
  AppendToOrderPageProps,
  AppendOrderItemSummary,
  AppendOrderGroupSummary,
} from '../../components/pages/AppendToOrderPage';
import { OrderIdHistoryEntry } from '../../components/molecules/OrderIdHistoryItem';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const MOCK_RECENT_ORDERS: OrderIdHistoryEntry[] = [
  {
    id: '849201',
    source: 'whatsapp',
    paymentMode: 'cod',
    timestamp: new Date().toISOString(),
    customerPhone: '+91 98765 43210',
    sourceHandle: '+91 98765 43210',
  },
  {
    id: '849202',
    source: 'instagram',
    paymentMode: 'prepaid',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    instagramHandle: '@priya_menon_style',
    sourceHandle: '@priya_menon_style',
  },
  {
    id: '849203',
    source: 'whatsapp',
    paymentMode: 'cod',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    customerPhone: '+91 91234 56789',
    sourceHandle: '+91 91234 56789',
  },
];

const MOCK_ITEMS: AppendOrderItemSummary[] = [
  {
    id: 'item-1',
    productTitle: 'Handloom Kanjivaram Silk Saree',
    vendorName: 'Varanasi Weavers Ltd',
    photoUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300',
    hasMedia: true,
  },
  {
    id: 'item-2',
    productTitle: 'Zari Embroidered Blouse Piece',
    vendorName: 'Surat Handlooms',
    photoUrl: undefined,
    hasMedia: false,
  },
];

const MOCK_GROUPS: AppendOrderGroupSummary[] = [
  {
    orderGrpId: '849201-G1',
    vendorName: 'Varanasi Weavers Ltd',
    status: 'Confirmed',
    awbNumber: '35003110014873',
    labelUrl: 'https://example.com/mock.pdf',
  },
  {
    orderGrpId: '849201-G2',
    vendorName: 'Surat Handlooms',
    status: 'Processing',
  },
];

const meta: Meta<AppendToOrderPageProps> = {
  title: 'Pages/Admin/AppendToOrderPage',
  component: AppendToOrderPage,
  args: {
    ...THEME_ARGS,
    mediaUri: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=500',
    mediaType: 'image',
    isStaged: true,
    recentOrders: MOCK_RECENT_ORDERS,
    isLoadingOrders: false,
    selectedOrderId: '849201',
    isLoadingOrderDetail: false,
    orderItems: MOCK_ITEMS,
    orderGroups: MOCK_GROUPS,
    customerName: 'Priya Menon',
    customerPhone: '+91 98765 43210',
    shippingCity: 'Hyderabad',
    shippingPincode: '500081',
    initialAttachmentType: 'item',
    initialSelectedTarget: '__NEW__',
    onBack: () => alert('Back pressed'),
    onDiscard: () => alert('Discard pressed'),
    onSelectOrder: (id: string) => alert(`Selected order #${id}`),
    onAttach: (type, target) => alert(`Attached to ${type}: ${target}`),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  } as any,
};

export default meta;
type Story = StoryObj<typeof AppendToOrderPage>;

/** 1. Default Rest State (Order Selected, Staged Photo, Target: New Item) */
export const DefaultRest: Story = {
  name: '1. Default / Rest (Order Selected, New Item)',
  decorators: [withFormFactor('mobile', 'Append to Order - New Item Slot')],
  args: {
    selectedOrderId: '849201',
    initialAttachmentType: 'item',
    initialSelectedTarget: '__NEW__',
  },
};

/** 2. Focused / Target Missing Media Item Selected */
export const TargetExistingItemMissingMedia: Story = {
  name: '2. Focused / Missing Media Item Selected',
  decorators: [withFormFactor('mobile', 'Append to Order - Fill Missing Photo')],
  args: {
    selectedOrderId: '849201',
    initialAttachmentType: 'item',
    initialSelectedTarget: 'item-2', // Missing media
  },
};

/** 3. Tracking Label Attachment Mode */
export const TrackingLabelAttachmentMode: Story = {
  name: '3. Active / Tracking Label Mode (Group G2)',
  decorators: [withFormFactor('mobile', 'Append to Order - Tracking Label')],
  args: {
    selectedOrderId: '849201',
    initialAttachmentType: 'tracking_label',
    initialSelectedTarget: '849201-G2',
  },
};

/** 4. Disabled State / No Order Selected (Search Mode) */
export const UnselectedSearchState: Story = {
  name: '4. Unselected Order / Search Picker Mode',
  decorators: [withFormFactor('mobile', 'Append to Order - Select Order First')],
  args: {
    selectedOrderId: null,
  },
};

/** 5. Loading Skeleton State */
export const LoadingState: Story = {
  name: '5. Loading / Order List Shimmer',
  decorators: [withFormFactor('mobile', 'Append to Order - Loading')],
  args: {
    selectedOrderId: null,
    isLoadingOrders: true,
  },
};

/** 6. Video Media Type Staged */
export const VideoMediaStaged: Story = {
  name: '6. Video Staged Media Variant',
  decorators: [withFormFactor('mobile', 'Append to Order - Video Media')],
  args: {
    mediaType: 'video',
    selectedOrderId: '849201',
    initialAttachmentType: 'item',
    initialSelectedTarget: '__NEW__',
  },
};

/** 7. Empty State / No Orders Found */
export const EmptyNoOrdersState: Story = {
  name: '7. Empty / No Recent Orders',
  decorators: [withFormFactor('mobile', 'Append to Order - Empty State')],
  args: {
    selectedOrderId: null,
    recentOrders: [],
    isLoadingOrders: false,
  },
};
