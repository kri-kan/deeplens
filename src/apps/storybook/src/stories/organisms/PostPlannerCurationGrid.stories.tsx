import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { PostPlannerCurationGrid } from '../../components/organisms/PostPlannerCurationGrid';
import { PlannedProductInfo } from '../../components/molecules/post-planner.types';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { withFormFactor } from '../utils/FormFactorPreview';

const MOCK_ITEMS: PlannedProductInfo[] = [
  {
    id: 'sku-001',
    productCode: 'SAR-KAN-901',
    title: 'Kanjivaram Silk Saree',
    category: 'Saree',
    fabric: 'Mulberry Silk',
    price: 8499,
    isStarred: true,
    imageUri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
    assignedChannelIds: ['ch-1', 'ch-3'],
    planningStatus: 'complete',
  },
  {
    id: 'sku-002',
    productCode: 'SAR-BAN-402',
    title: 'Banarasi Zari Tissue Saree',
    category: 'Saree',
    fabric: 'Tissue Zari',
    price: 11200,
    isStarred: true,
    imageUri: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80',
    assignedChannelIds: ['ch-3'],
    planningStatus: 'in_progress',
  },
  {
    id: 'sku-003',
    productCode: 'DRS-ANA-103',
    title: 'Floor Length Anarkali Gown',
    category: 'Dress',
    fabric: 'Georgette',
    price: 4599,
    isStarred: true,
    imageUri: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
    assignedChannelIds: ['ch-2'],
    planningStatus: 'complete',
  },
  {
    id: 'sku-004',
    productCode: 'LEH-BRD-504',
    title: 'Crimson Velvet Bridal Lehanga',
    category: 'Lehanga',
    fabric: 'Raw Silk Velvet',
    price: 18500,
    isStarred: true,
    imageUri: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=600&q=80',
    assignedChannelIds: ['ch-1', 'ch-4'],
    planningStatus: 'in_progress',
  },
  {
    id: 'sku-008',
    productCode: 'LEH-MIR-808',
    title: 'Mirror Work Georgette Lehanga',
    category: 'Lehanga',
    fabric: 'Faux Georgette',
    price: 12999,
    isStarred: true,
    imageUri: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80',
    assignedChannelIds: [],
    planningStatus: 'in_progress',
  },
];

const meta: Meta<any> = {
  title: 'Organisms/PostPlannerCurationGrid',
  component: PostPlannerCurationGrid,
  args: {
    ...THEME_ARGS,
    items: MOCK_ITEMS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
  decorators: [withFormFactor("mobile", "Post Planner Curation Grid (Mobile 390px)")],
};

export default meta;
type Story = StoryObj;

export const DefaultAllItems: Story = {
  name: '1. All Starred Items (Populated 3-Col Grid)',
  args: {
    items: MOCK_ITEMS,
    showOnlyIncomplete: false,
  },
};

export const FilteredNeedsPlanning: Story = {
  name: '2. Filtered: Needs Planning Only',
  args: {
    items: MOCK_ITEMS,
    showOnlyIncomplete: true,
  },
};

export const SearchActive: Story = {
  name: '3. Search Active (Query "Saree")',
  args: {
    items: MOCK_ITEMS,
    searchQuery: 'Saree',
  },
};

export const EmptyState: Story = {
  name: '4. Empty State (Zero Results)',
  args: {
    items: [],
  },
};
