import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import {
  OrderIdHistoryItem,
} from '../../components/molecules/OrderIdHistoryItem';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/OrderIdHistoryItem',
  component: OrderIdHistoryItem,
  args: {
    ...THEME_ARGS,
    onPress: (id: string) => alert(`Pressed order #${id}`),
    onCopy: (id: string, prefix: boolean) => alert(`Copied #${id} (prefix: ${prefix})`),
    onEdit: (id: string) => alert(`Edit #${id}`),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
  decorators: [
    (Story) => (
      <YStack padding={16} maxWidth={420} width="100%">
        <Story />
      </YStack>
    ),
  ],
};

export default meta;
type Story = StoryObj<any>;

export const WhatsAppCOD: Story = {
  name: 'WhatsApp COD',
  args: {
    item: {
      id: '849201',
      source: 'whatsapp',
      paymentMode: 'cod',
      timestamp: new Date().toISOString(),
      customerPhone: '+91 98765 43210',
    },
  },
};

export const InstagramPrepaid: Story = {
  name: 'Instagram Prepaid',
  args: {
    item: {
      id: '849198',
      source: 'instagram',
      paymentMode: 'prepaid',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      instagramHandle: '@priya_couture',
    },
  },
};

export const DeletedOrder: Story = {
  name: 'Deleted Order Entry',
  args: {
    item: {
      id: '849150',
      source: 'whatsapp',
      paymentMode: 'cod',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      customerPhone: '+91 91234 56789',
      isDeleted: true,
    },
  },
};
