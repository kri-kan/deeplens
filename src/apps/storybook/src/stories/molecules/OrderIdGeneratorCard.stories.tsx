import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import {
  OrderIdGeneratorCard,
} from '../../components/molecules/OrderIdGeneratorCard';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/OrderIdGeneratorCard',
  component: OrderIdGeneratorCard,
  args: {
    ...THEME_ARGS,
    selectedSource: 'whatsapp',
    paymentMode: 'cod',
    sourceHandle: '+91 98765 43210',
    loading: false,
    onSelectSource: (s: any) => console.log('Selected source:', s),
    onSelectPaymentMode: (m: any) => console.log('Selected mode:', m),
    onChangeSourceHandle: (h: any) => console.log('Handle:', h),
    onGenerate: () => alert('Generated order ID!'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    selectedSource: {
      control: 'select',
      options: ['whatsapp', 'instagram', null],
    },
    paymentMode: {
      control: 'select',
      options: ['cod', 'prepaid', null],
    },
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

export const DefaultWhatsApp: Story = {
  name: 'WhatsApp COD (Ready)',
  args: {
    selectedSource: 'whatsapp',
    paymentMode: 'cod',
    sourceHandle: '+91 98765 43210',
  },
};

export const InstagramPrepaid: Story = {
  name: 'Instagram Prepaid',
  args: {
    selectedSource: 'instagram',
    paymentMode: 'prepaid',
    sourceHandle: '@krikan_handlooms',
  },
};

export const UnselectedState: Story = {
  name: 'Unselected / Empty',
  args: {
    selectedSource: null,
    paymentMode: null,
    sourceHandle: '',
  },
};

export const WithGeneratedIDBanner: Story = {
  name: 'With Generated ID Banner',
  args: {
    selectedSource: null,
    paymentMode: null,
    sourceHandle: '',
    generatedEntry: {
      id: '849201',
      source: 'whatsapp',
      paymentMode: 'cod',
      timestamp: new Date().toISOString(),
      sourceHandle: '+91 98765 43210',
      isNew: true,
    },
  },
};

export const WithInstagramUrlBanner: Story = {
  name: 'With Instagram URL Banner (Clean Handle Display)',
  args: {
    selectedSource: null,
    paymentMode: null,
    sourceHandle: '',
    generatedEntry: {
      id: '849205',
      source: 'instagram',
      paymentMode: 'prepaid',
      timestamp: new Date().toISOString(),
      sourceHandle: 'https://instagram.com/krikan_handlooms/',
      isNew: true,
    },
  },
};

export const LoadingState: Story = {
  name: 'Loading State',
  args: {
    selectedSource: 'whatsapp',
    paymentMode: 'cod',
    sourceHandle: '+91 98765 43210',
    loading: true,
  },
};
