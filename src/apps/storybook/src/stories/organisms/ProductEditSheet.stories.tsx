import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, Button } from 'tamagui';
import { ProductEditSheet } from '../../components/organisms/ProductEditSheet';
import { OrderItem } from '../../components/organisms/ProductListSection';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof ProductEditSheet> = {
  title: 'Organisms/ProductEditSheet',
  component: ProductEditSheet,
  decorators: [withFormFactor('mobile', 'Edit Item Bottom Sheet')],
};

export default meta;
type Story = StoryObj<typeof ProductEditSheet>;

const sampleItem: OrderItem = {
  id: 'item-1',
  title: 'Handloom Kanjivaram Silk Saree with Zari Border',
  productId: 'PRD-10291',
  size: 'Free Size',
  quantity: 1,
  costPerPiece: 2499,
  codChargePerPiece: 50,
  amountPaid: 500,
  vendor: 'Varanasi Weavers Ltd',
  imageColor: '#e8d8c8',
};

function EditSheetInteractive({ isCod = true }: { isCod?: boolean }) {
  const [visible, setVisible] = useState(true);
  const [item, setItem] = useState<OrderItem>(sampleItem);

  return (
    <YStack flex={1} padding={20} justifyContent="center" alignItems="center">
      <Button onPress={() => setVisible(true)}>Open Edit Sheet</Button>
      <ProductEditSheet
        visible={visible}
        item={item}
        isCod={isCod}
        onSaveItem={(updated) => {
          setItem(updated);
          alert(`Saved: ${updated.title} (₹${updated.costPerPiece})`);
        }}
        onClose={() => setVisible(false)}
      />
    </YStack>
  );
}

export const CODOrderItem: Story = {
  render: () => <EditSheetInteractive isCod={true} />,
};

export const PrepaidOrderItem: Story = {
  render: () => <EditSheetInteractive isCod={false} />,
};

const sampleLinkedItem: OrderItem = {
  id: 'item-2',
  title: 'Handloom Kanjivaram Silk Saree with Zari Border',
  productId: 'PRD-10291',
  size: 'Free Size',
  quantity: 1,
  costPerPiece: 2499,
  codChargePerPiece: 0,
  amountPaid: 0,
  vendor: 'Varanasi Weavers Ltd',
  imageColor: '#e8d8c8',
  catalogImageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
};

export const CatalogLinkedOrderItem: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);
    const [item, setItem] = useState<OrderItem>(sampleLinkedItem);

    return (
      <YStack flex={1} padding={20} justifyContent="center" alignItems="center">
        <Button onPress={() => setVisible(true)}>Open Full Screen (Linked Item)</Button>
        <ProductEditSheet
          visible={visible}
          item={item}
          isCod={false}
          onSaveItem={(updated) => {
            setItem(updated);
            alert(`Saved: ${updated.title} (SKU: ${updated.productId}, Vendor: ${updated.vendor || 'None'})`);
          }}
          onClose={() => setVisible(false)}
        />
      </YStack>
    );
  },
};

export const NewLineItem: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);
    const [item, setItem] = useState<OrderItem>({
      id: '',
      title: '',
      productId: '',
      size: 'Free Size',
      quantity: 1,
      costPerPiece: 0,
      vendor: '',
    });

    return (
      <YStack flex={1} padding={20} justifyContent="center" alignItems="center">
        <Button onPress={() => setVisible(true)}>Open New Line Item Screen</Button>
        <ProductEditSheet
          visible={visible}
          item={item}
          isCod={false}
          onSaveItem={(updated) => {
            setItem(updated);
            alert(`Created: ${updated.title} (SKU: ${updated.productId})`);
          }}
          onClose={() => setVisible(false)}
        />
      </YStack>
    );
  },
};


