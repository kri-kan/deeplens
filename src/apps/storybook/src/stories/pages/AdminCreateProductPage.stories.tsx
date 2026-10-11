import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminCreateProductPage,
  AdminCreateProductPageProps,
  StagedMediaItem,
  LinkedInstagramPostItem,
  DEFAULT_PRODUCT_CATEGORIES,
} from '../../components/pages/AdminCreateProductPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────

const MOCK_STAGED_MEDIA: StagedMediaItem[] = [
  {
    id: 'media-1',
    uri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
    mediaType: 'image',
    isPrimary: true,
    fileName: 'banarasi_silk_front.jpg',
  },
  {
    id: 'media-2',
    uri: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80',
    mediaType: 'image',
    isPrimary: false,
    fileName: 'pallu_zari_detail.jpg',
  },
  {
    id: 'media-3',
    uri: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
    mediaType: 'video',
    isPrimary: false,
    fileName: 'pleat_movement_clip.mp4',
  },
];

const MOCK_LINKED_POSTS: LinkedInstagramPostItem[] = [
  {
    id: 'ig-post-1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80',
    permalink: 'https://instagram.com/p/DF21abc89',
    captionSnippet: 'Handloom weaves pure Banarasi Kadwa silk in royal emerald.',
  },
];

const MOCK_LINKED_POST_ERROR: LinkedInstagramPostItem[] = [
  {
    id: 'ig-post-conflict',
    thumbnailUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=300&q=80',
    permalink: 'https://instagram.com/p/DF99xyz12',
    captionSnippet: 'Bridal Kanjeevaram preview collection reel.',
    productCode: 'SAR-KAN-088',
  },
];

// ─────────────────────────────────────────────
// Meta Setup
// ─────────────────────────────────────────────

type StoryProps = AdminCreateProductPageProps & { campaign?: string; mode?: string };

const meta: Meta<StoryProps> = {
  title: 'Pages/Admin/CreateProduct',
  component: AdminCreateProductPage,
  args: {
    ...THEME_ARGS,
    disableSafeArea: false,
    categories: DEFAULT_PRODUCT_CATEGORIES,
    onBack: () => alert('Back clicked'),
    onCancel: () => alert('Cancel / Discard clicked'),
    onSubmit: (data) => alert(`Product saved:\n${JSON.stringify(data, null, 2)}`),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    disableSafeArea: {
      control: 'boolean',
      description: 'Disable safe area insets (useful inside mock device frames)',
    },
    isLoading: {
      control: 'boolean',
      description: 'Toggle submitting / loading state',
    },
    isTabletSplit: {
      control: 'boolean',
      description: 'Toggle tablet split two-column layout',
    },
  },
};

export default meta;

type Story = StoryObj<StoryProps>;

// ─────────────────────────────────────────────
// 7-State Viswa UI Validation Stories
// ─────────────────────────────────────────────

/**
 * 1. Populated State: Staged intent media from Android share, pre-filled title, category, and vendor price.
 */
export const Populated: Story = {
  name: '1. Populated (Intent Media)',
  decorators: [withFormFactor('mobile', 'Add Product - Populated')],
  args: {
    disableSafeArea: true,
    initialTitle: 'Banarasi Kadwa Mulberry Silk Saree',
    initialDescription:
      'Pure handwoven mulberry silk with antique gold tested zari jaal, contrast temple borders, and rich brocade pallu. Includes running unstitched blouse piece.',
    initialPrice: '5400',
    initialCategory: 'saree',
    initialMedia: MOCK_STAGED_MEDIA,
    initialLinkedPosts: MOCK_LINKED_POSTS,
  },
};

/**
 * 2. Empty State: Fresh intake form with no media staged and blank fields.
 */
export const Empty: Story = {
  name: '2. Empty State (Fresh Intake)',
  decorators: [withFormFactor('mobile', 'Add Product - Empty')],
  args: {
    disableSafeArea: true,
    initialTitle: '',
    initialDescription: '',
    initialPrice: '',
    initialCategory: 'saree',
    initialMedia: [],
    initialLinkedPosts: [],
  },
};

/**
 * 3. Loading / Submitting State: Save button in spinner state, user interactions locked.
 */
export const SubmittingLoading: Story = {
  name: '3. Submitting State (Loading)',
  decorators: [withFormFactor('mobile', 'Add Product - Submitting')],
  args: {
    disableSafeArea: true,
    initialTitle: 'Raw Silk Festive Anarkali Dress',
    initialDescription: 'Heavy embroidered yolk with organza dupatta.',
    initialPrice: '3850',
    initialCategory: 'dress',
    initialMedia: [MOCK_STAGED_MEDIA[0]],
    isLoading: true,
  },
};

/**
 * 4. Validation Error State: Missing title/category and post already linked conflict.
 */
export const ValidationError: Story = {
  name: '4. Error (Validation & Conflicts)',
  decorators: [withFormFactor('mobile', 'Add Product - Error')],
  args: {
    disableSafeArea: true,
    initialTitle: '',
    initialPrice: '2400',
    initialCategory: 'saree',
    initialMedia: [MOCK_STAGED_MEDIA[0]],
    initialLinkedPosts: MOCK_LINKED_POST_ERROR,
    errorMessage: 'Product Title is required. Selected Instagram post is already linked to SKU SAR-KAN-088.',
  },
};

/**
 * 5. Dark Theme (Nocturne Palette): High contrast luxury dark mode.
 */
export const DarkThemeNocturne: Story = {
  name: '5. Dark Theme (Luxe Emerald)',
  decorators: [withFormFactor('mobile', 'Add Product - Nocturne Theme')],
  args: {
    disableSafeArea: true,
    campaign: 'luxe',
    mode: 'dark',
    initialTitle: 'Heritage Patan Patola Double Ikat',
    initialDescription: 'Double ikat geometric chevron weaves with natural dyed silk.',
    initialPrice: '14200',
    initialCategory: 'saree',
    initialMedia: MOCK_STAGED_MEDIA,
    initialLinkedPosts: MOCK_LINKED_POSTS,
  },
};

/**
 * 6. Tablet Split Viewport: Two-column layout with media on left and inputs on right.
 */
export const TabletSplitViewport: Story = {
  name: '6. Tablet Split Viewport',
  decorators: [withFormFactor('tablet', 'Add Product - Tablet Split')],
  args: {
    disableSafeArea: true,
    isTabletSplit: true,
    initialTitle: 'Chanderi Silk Cotton Saree with Tissue Zari',
    initialDescription:
      'Featherlight Chanderi weave featuring gold tissue border and traditional floral buttas.',
    initialPrice: '3100',
    initialCategory: 'saree',
    initialMedia: MOCK_STAGED_MEDIA,
    initialLinkedPosts: MOCK_LINKED_POSTS,
  },
};

/**
 * 7. AI Autofill / Suggested State: Intelligently generated description and craft tagging.
 */
export const AiAutoFilled: Story = {
  name: '7. AI Autofill / Suggested',
  decorators: [withFormFactor('mobile', 'Add Product - AI Suggested')],
  args: {
    disableSafeArea: true,
    initialTitle: 'Handloom Kanjeevaram Pure Silk Saree',
    initialDescription:
      '✨ AI Suggested: Woven on pitloom with pure mulberry silk yarns, solid zari petni border, and contrasting peacock motifs. Perfect for bridal and festive pooja.',
    initialPrice: '7800',
    initialCategory: 'saree',
    initialMedia: MOCK_STAGED_MEDIA,
    initialLinkedPosts: MOCK_LINKED_POSTS,
  },
};
