import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import {
  ProductListSection,
  ProductListSectionProps,
  OrderItem,
} from '../../components/organisms/ProductListSection';
import { withFormFactor } from '../utils/FormFactorPreview';

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

const meta: Meta<typeof ProductListSection> = {
  title: 'Organisms/ProductListSection',
  component: ProductListSection,
  decorators: [withFormFactor('mobile', 'Order Line Items Management Rail')],
  args: {
    products: MOCK_ITEMS,
    selectedIds: [],
    isCod: true,
    onToggleSelect: () => undefined,
    onToggleSelectAll: () => undefined,
    onBatchDelete: () => undefined,
    onAddProduct: () => undefined,
    onEditProduct: () => undefined,
    onOpenPicker: () => undefined,
    onUpdateItem: () => undefined,
    onRemoveProduct: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof ProductListSection>;

export const MultiItemOrder: Story = {
  render: (args: any) => (
    <YStack width={390} padding={16}>
      <ProductListSection {...(args as ProductListSectionProps)} />
    </YStack>
  ),
};

export const BatchSelectedState: Story = {
  args: {
    products: MOCK_ITEMS,
    selectedIds: ['item-1', 'item-2'],
    isCod: true,
  },
  render: (args: any) => (
    <YStack width={390} padding={16}>
      <ProductListSection {...(args as ProductListSectionProps)} />
    </YStack>
  ),
};

export const PrepaidOrder: Story = {
  args: {
    products: MOCK_ITEMS,
    selectedIds: [],
    isCod: false,
  },
  render: (args: any) => (
    <YStack width={390} padding={16}>
      <ProductListSection {...(args as ProductListSectionProps)} />
    </YStack>
  ),
};

export const Interactive: Story = {
  render: () => {
    const [products, setProducts] = useState<OrderItem[]>(MOCK_ITEMS);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const handleToggleSelect = (id: string) => {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    };

    const handleToggleSelectAll = () => {
      if (selectedIds.length === products.length) {
        setSelectedIds([]);
      } else {
        setSelectedIds(products.map((p) => p.id));
      }
    };

    const handleBatchDelete = () => {
      setProducts((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
      setSelectedIds([]);
    };

    const handleAddProduct = () => {
      const newItem: OrderItem = {
        id: `item-${Date.now()}`,
        productId: `PRD-${Math.floor(10000 + Math.random() * 90000)}`,
        title: 'Chanderi Cotton Dupatta',
        size: 'Free Size',
        quantity: 1,
        costPerPiece: 899,
        codChargePerPiece: 50,
        amountPaid: 0,
        vendor: 'Chanderi Artisans',
        imageColor: '#f0e6d3',
      };
      setProducts((prev) => [...prev, newItem]);
    };

    const handleRemoveProduct = (id: string) => {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    };

    const handleUpdateItem = (id: string, updates: Partial<OrderItem>) => {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    };

    return (
      <YStack width={390} padding={16}>
        <ProductListSection
          products={products}
          selectedIds={selectedIds}
          isCod={true}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onBatchDelete={handleBatchDelete}
          onAddProduct={handleAddProduct}
          onEditProduct={(item) => alert(`Edit item: ${item.title}`)}
          onOpenPicker={(item, type) => alert(`Open picker for ${type} on ${item.title}`)}
          onUpdateItem={handleUpdateItem}
          onRemoveProduct={handleRemoveProduct}
        />
      </YStack>
    );
  },
};
