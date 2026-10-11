import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import { SourceRow, SourceRowProps } from '../../components/molecules/SourceRow';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof SourceRow> = {
  title: 'Molecules/SourceRow',
  component: SourceRow,
  decorators: [withFormFactor('mobile', 'Source Row with Deeplink & Payment Status')],
};

export default meta;
type Story = StoryObj<typeof SourceRow>;

export const WhatsAppCOD: Story = {
  args: {
    source: 'whatsapp',
    sourceContact: '9876543210',
    paymentType: 'cod',
  },
  render: (args: any) => (
    <YStack width={390} paddingHorizontal={16} paddingVertical={8}>
      <SourceRow {...(args as SourceRowProps)} />
    </YStack>
  ),
};

export const InstagramPrepaid: Story = {
  args: {
    source: 'instagram',
    sourceContact: '@priya_designs',
    paymentType: 'prepaid',
  },
  render: (args: any) => (
    <YStack width={390} paddingHorizontal={16} paddingVertical={8}>
      <SourceRow {...(args as SourceRowProps)} />
    </YStack>
  ),
};

export const WhatsAppCODReseller: Story = {
  name: 'WhatsApp COD (Reseller with Boutique Name)',
  args: {
    source: 'whatsapp',
    sourceContact: '9876543210',
    paymentType: 'cod',
    orderType: 'reseller',
    resellerName: 'Sri Krishna Silk Sarees',
  },
  render: (args: any) => (
    <YStack width={390} paddingHorizontal={16} paddingVertical={8}>
      <SourceRow {...(args as SourceRowProps)} />
    </YStack>
  ),
};

export const InstagramPrepaidCustomer: Story = {
  name: 'Instagram Prepaid (Customer Direct B2C)',
  args: {
    source: 'instagram',
    sourceContact: '@priya_designs',
    paymentType: 'prepaid',
    orderType: 'customer',
  },
  render: (args: any) => (
    <YStack width={390} paddingHorizontal={16} paddingVertical={8}>
      <SourceRow {...(args as SourceRowProps)} />
    </YStack>
  ),
};

