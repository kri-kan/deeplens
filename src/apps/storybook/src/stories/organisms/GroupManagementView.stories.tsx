import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import {
  GroupManagementView,
  GroupManagementViewProps,
} from '../../components/organisms/GroupManagementView';
import { OrderItem } from '../../components/organisms/ProductListSection';

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
    vendor: 'Varanasi Weavers Ltd',
    imageColor: '#c9b8a8',
  },
];

const meta: Meta<typeof GroupManagementView> = {
  title: 'Organisms/GroupManagementView',
  component: GroupManagementView,
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
  decorators: [
    (Story) => (
      <YStack flex={1} minHeight={680}>
        <Story />
      </YStack>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GroupManagementView>;

function InteractiveGroupManagement(props: Partial<GroupManagementViewProps>) {
  const [stage, setStage] = useState(props.currentStage || 'Confirmed');

  return (
    <GroupManagementView
      orderId="0001D"
      orderGrpId="0001D-G1"
      vendorName="Varanasi Weavers Ltd"
      isUnassigned={false}
      currentStage={stage}
      isCod={true}
      needLabel={true}
      awbNumber="12938471928"
      labelUrl="https://example.com/delhivery-label.pdf"
      items={MOCK_ITEMS}
      onUpdateStage={setStage}
      onSave={setStage}
      onBack={() => {}}
      {...props}
    />
  );
}

export const ConfirmedWithLabel: Story = {
  render: () => <InteractiveGroupManagement currentStage="Confirmed" />,
};

export const ProcessedState: Story = {
  render: () => <InteractiveGroupManagement currentStage="Processed" />,
};

export const PlacedState: Story = {
  render: () => <InteractiveGroupManagement currentStage="Placed" />,
};

export const UnassignedNoVendor: Story = {
  render: () => (
    <InteractiveGroupManagement
      vendorName="Unassigned"
      isUnassigned={true}
      orderGrpId="0001D-Unassigned"
      currentStage="Unconfirmed"
      awbNumber={undefined}
      labelUrl={undefined}
      needLabel={false}
      isCod={false}
    />
  ),
};

export const NonLabelWithAddress: Story = {
  render: () => (
    <InteractiveGroupManagement
      vendorName="Varanasi Weavers Ltd"
      currentStage="Confirmed"
      needLabel={false}
      isCod={false}
      awbNumber={undefined}
      labelUrl={undefined}
      address={{
        name: 'Priyanka Sharma',
        phone: '+91 98765 43210',
        address: 'Flat 402, Lotus Towers, 5th Main, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
      }}
    />
  ),
};

