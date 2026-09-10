import React from 'react';
import {
  AdminPostPlannerQueuePage,
  AdminPostPlannerQueuePageProps,
} from './AdminPostPlannerQueuePage';
import { PlannedProductInfo, TargetChannelOption } from '../molecules/post-planner.types';

export const DEFAULT_CHANNELS: TargetChannelOption[] = [
  {
    id: 'ch-1',
    username: 'vayyari_fashions',
    channelType: 'focus',
    niche: 'Core Luxury Festive Wear',
    avatarUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    isSuggestedMatch: true,
  },
  {
    id: 'ch-2',
    username: 'dressbyvayyari',
    channelType: 'focus',
    niche: 'Kurtis, Anarkalis & Dresses',
    avatarUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
    isSuggestedMatch: false,
  },
  {
    id: 'ch-3',
    username: 'saree_dump',
    channelType: 'dump',
    niche: 'Silk & Handloom Saree Curation',
    avatarUri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
    isSuggestedMatch: true,
  },
  {
    id: 'ch-4',
    username: 'fusion_edits_dump',
    channelType: 'dump',
    niche: 'Modern Western & Fusion Wear',
    avatarUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    isSuggestedMatch: false,
  },
];

export const DEFAULT_PRODUCTS: PlannedProductInfo[] = [
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
    id: 'sku-005',
    productCode: 'SAR-PAT-305',
    title: 'Patola Ikat Silk Saree',
    category: 'Saree',
    fabric: 'Double Ikat Silk',
    price: 14500,
    isStarred: true,
    imageUri: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600&q=80',
    assignedChannelIds: ['ch-3'],
    planningStatus: 'complete',
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

export interface AdminPostPlannerPageProps extends AdminPostPlannerQueuePageProps {
  /** Legacy mode prop preserved for API compatibility */
  initialMode?: 'curation' | 'sharing';
  controlledMode?: 'curation' | 'sharing';
  onModeChange?: (mode: 'curation' | 'sharing') => void;
}

export function AdminPostPlannerPage(props: AdminPostPlannerPageProps) {
  return <AdminPostPlannerQueuePage {...props} />;
}

export { AdminCurationPage } from './AdminCurationPage';
export { AdminPostPlannerQueuePage } from './AdminPostPlannerQueuePage';
