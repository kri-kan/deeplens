import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import { OrderTypeSection, OrderTypeSectionProps, OrderType } from '../../components/molecules/OrderTypeSection';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof OrderTypeSection> = {
  title: 'Molecules/OrderTypeSection',
  component: OrderTypeSection,
  decorators: [withFormFactor('mobile', 'Order Type Selection (Customer vs Reseller)')],
};

export default meta;
type Story = StoryObj<typeof OrderTypeSection>;

function InteractiveOrderTypeSection(props: Partial<OrderTypeSectionProps>) {
  const [orderType, setOrderType] = useState<OrderType>(props.orderType ?? 'customer');
  const [resellerName, setResellerName] = useState<string>(props.resellerName ?? '');

  return (
    <YStack width={390} paddingHorizontal={16} paddingVertical={12}>
      <OrderTypeSection
        orderType={orderType}
        onChangeOrderType={setOrderType}
        resellerName={resellerName}
        onChangeResellerName={setResellerName}
      />
    </YStack>
  );
}

export const DefaultCustomer: Story = {
  render: () => <InteractiveOrderTypeSection orderType="customer" />,
};

export const ResellerSelectedEmpty: Story = {
  render: () => <InteractiveOrderTypeSection orderType="reseller" resellerName="" />,
};

export const ResellerWithName: Story = {
  render: () => (
    <InteractiveOrderTypeSection
      orderType="reseller"
      resellerName="Priya Silk Sarees & Boutique"
    />
  ),
};
