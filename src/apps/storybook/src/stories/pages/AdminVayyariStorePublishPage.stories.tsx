import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminVayyariStorePublishPage,
  MOCK_STARRED_PRODUCTS,
  MOCK_FAILED_PRODUCTS,
} from '../../components/pages/AdminVayyariStorePublishPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Admin/Vayyari Store - Product Publish',
  component: AdminVayyariStorePublishPage,
  decorators: [withFormFactor('mobile', 'Vayyari Store Publish (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    products: MOCK_STARRED_PRODUCTS,
    failedProducts: MOCK_FAILED_PRODUCTS,
    publishedCount: 2,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    publishedCount: {
      control: 'number',
      description: 'Count of products currently active in Store',
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * 1. Default Interactive Publish Workbench:
 * Displays all Starred products eligible for Store publishing in a high-density 3-column Catalog grid tile layout.
 * Operators can search, filter by category, and select single/multiple products.
 */
export const InteractivePublishWorkbench: Story = {
  name: '1. Interactive 3-Column Catalog Grid Tile Publish Workbench',
  args: {
    products: MOCK_STARRED_PRODUCTS,
    failedProducts: MOCK_FAILED_PRODUCTS,
  },
};

/**
 * 2. Empty State (Zero Starred Products):
 * Demonstrates empty state when all starred items have been published or unstarred.
 */
export const EmptyStarredProducts: Story = {
  name: '2. Empty State (0 Starred Products Available)',
  args: {
    products: [],
    failedProducts: [],
  },
};

/**
 * 3. Failed Publishings Review & Retry Queue:
 * Displays products where publishing failed due to media errors or network drops.
 * Merchandisers can review the exact failure diagnostic and trigger batch retries.
 */
export const FailedPublishingsRetryQueue: Story = {
  name: '3. Failed Publishings Review & Retry Queue',
  args: {
    products: [],
    failedProducts: MOCK_FAILED_PRODUCTS,
  },
};

