import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import {
  TransactionReceiptSection,
  TransactionReceiptSectionProps,
} from '../../components/molecules/TransactionReceiptSection';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof TransactionReceiptSection> = {
  title: 'Molecules/TransactionReceiptSection',
  component: TransactionReceiptSection,
  decorators: [withFormFactor('mobile', 'Payment & Receipt Proof Section')],
  argTypes: {
    transactionId: {
      control: 'text',
      description: 'Transaction or UTR ID entered by admin',
    },
    receiptUrl: {
      control: 'text',
      description: 'URL of uploaded receipt screenshot',
    },
  },
  args: {
    transactionId: '',
    receiptUrl: null,
  },
};

export default meta;
type Story = StoryObj<typeof TransactionReceiptSection>;

export const Empty: Story = {
  args: {
    transactionId: '',
    receiptUrl: null,
    onChangeTransactionId: () => undefined,
    onUploadReceipt: () => undefined,
    onRemoveReceipt: () => undefined,
  },
  render: (args: any) => (
    <YStack width={390} padding={16}>
      <TransactionReceiptSection {...(args as TransactionReceiptSectionProps)} />
    </YStack>
  ),
};

export const WithTransactionId: Story = {
  args: {
    transactionId: 'UPI-20240902-892189',
    receiptUrl: null,
    onChangeTransactionId: () => undefined,
    onUploadReceipt: () => undefined,
    onRemoveReceipt: () => undefined,
  },
  render: (args: any) => (
    <YStack width={390} padding={16}>
      <TransactionReceiptSection {...(args as TransactionReceiptSectionProps)} />
    </YStack>
  ),
};

export const WithReceiptUploaded: Story = {
  args: {
    transactionId: 'HDFC-IMPS-892109481',
    receiptUrl: 'https://images.unsplash.com/photo-1554415707-9e49017aed81?w=400&auto=format&fit=crop&q=80',
    onChangeTransactionId: () => undefined,
    onUploadReceipt: () => undefined,
    onRemoveReceipt: () => undefined,
  },
  render: (args: any) => (
    <YStack width={390} padding={16}>
      <TransactionReceiptSection {...(args as TransactionReceiptSectionProps)} />
    </YStack>
  ),
};

export const Interactive: Story = {
  render: () => {
    const [txnId, setTxnId] = useState('UPI-99281-REF');
    const [receipt, setReceipt] = useState<string | null>(null);

    return (
      <YStack width={390} padding={16}>
        <TransactionReceiptSection
          transactionId={txnId}
          onChangeTransactionId={setTxnId}
          receiptUrl={receipt}
          onUploadReceipt={() =>
            setReceipt('https://images.unsplash.com/photo-1554415707-9e49017aed81?w=400&auto=format&fit=crop&q=80')
          }
          onRemoveReceipt={() => setReceipt(null)}
        />
      </YStack>
    );
  },
};
