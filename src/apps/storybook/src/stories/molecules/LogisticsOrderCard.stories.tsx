import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import {
  LogisticsOrderCard,
  LogisticsOrderCardData,
} from '../../components/molecules/LogisticsOrderCard';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const SAMPLE_ORDER: LogisticsOrderCardData = {
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
  orderDate: new Date().toISOString(),
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
};

const meta: Meta<any> = {
  title: 'Molecules/LogisticsOrderCard',
  component: LogisticsOrderCard,
  args: {
    ...THEME_ARGS,
    order: SAMPLE_ORDER,
    onPressDetails: (id: string) => alert(`View details: ${id}`),
    onPressFulfillment: (id: string) => alert(`Open fulfillment: ${id}`),
    onPressResolveNdr: (id: string) => alert(`Resolve NDR: ${id}`),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
  decorators: [
    (Story) => (
      <YStack padding={16} maxWidth={440} width="100%">
        <Story />
      </YStack>
    ),
  ],
};

export default meta;
type Story = StoryObj<any>;

export const WhatsAppCODPending: Story = {
  name: 'WhatsApp COD (Pending Fulfillment)',
  args: {
    order: SAMPLE_ORDER,
  },
};

export const InTransitWithDelhiveryAWB: Story = {
  name: 'Instagram Prepaid (In Transit)',
  args: {
    order: {
      ...SAMPLE_ORDER,
      orderNumber: 'ORD-849198',
      source: 'Instagram',
      paymentMode: 'Prepaid',
      totalOrderValue: 3200,
      status: 'InTransit',
      packages: [
        {
          id: 'pkg-3',
          packageNumber: 1,
          vendorName: 'Central Hub Stock',
          awbNumber: 'DEL-991823901',
          fulfillmentPath: 'CentralHubStock',
        },
      ],
    },
  },
};

export const NDRExceptionRaised: Story = {
  name: 'NDR Exception Raised',
  args: {
    order: {
      ...SAMPLE_ORDER,
      orderNumber: 'ORD-849185',
      status: 'NdrActionNeeded',
      hasNdr: true,
      packages: [
        {
          id: 'pkg-4',
          packageNumber: 1,
          vendorName: 'Surat Handlooms',
          awbNumber: 'DEL-991821102',
          isNdr: true,
        },
      ],
    },
  },
};
