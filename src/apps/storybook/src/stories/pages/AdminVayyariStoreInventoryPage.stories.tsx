import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminVayyariStoreInventoryPage,
  MOCK_PUBLISHED_PRODUCTS,
} from '../../components/pages/AdminVayyariStoreInventoryPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Admin/Vayyari Store - In-Store Inventory',
  component: AdminVayyariStoreInventoryPage,
  decorators: [withFormFactor('mobile', 'Vayyari Store Inventory (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    products: MOCK_PUBLISHED_PRODUCTS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

/**
 * 1. Default Interactive In-Store Inventory View:
 * Displays all products synced to Store Engine via Kafka with publication timestamps
 * and 1-click shortcut to open the Store Admin Curation Workbench.
 */
export const DefaultStoreInventory: Story = {
  name: '1. In-Store Synced Inventory (Live Products & Curation Action)',
  args: {
    products: MOCK_PUBLISHED_PRODUCTS,
  },
};

/**
 * 2. Empty State (Zero Products in Store):
 * Demonstrates empty state when no products have been published to Store yet.
 */
export const EmptyStoreInventory: Story = {
  name: '2. Empty State (0 Products in Store)',
  args: {
    products: [],
  },
};
