import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminProductSharePage,
  MOCK_SHARE_MEDIA,
  MOCK_VENDOR_SOURCES,
} from '../../components/pages/AdminProductSharePage';
import { DEFAULT_CHANNELS } from '../../components/pages/AdminPostPlannerPage';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Admin/Product Share & Publish',
  component: AdminProductSharePage,
  decorators: [withFormFactor('mobile', 'Product Share & Publish (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    mode: 'catalog',
    productCode: 'SAR-KAN-901',
    productTitle: 'Kanjivaram Silk Saree',
    category: 'Saree',
    fabric: 'Mulberry Silk',
    price: 8499,
    media: MOCK_SHARE_MEDIA,
    vendorSources: MOCK_VENDOR_SOURCES,
    channels: DEFAULT_CHANNELS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    mode: {
      control: 'radio',
      options: ['catalog', 'post_planner'],
      description: 'Execution context: Catalog PDP (open) vs Post Planner (locked channel)',
    },
    postShareSheetOpen: {
      control: 'boolean',
      description: 'Force open the Post-Share Attribution Bottom Sheet',
    },
    initialAttributionPlatform: {
      control: 'radio',
      options: ['others', 'instagram'],
      description: 'Default attribution destination in bottom sheet',
    },
    initialDatePreset: {
      control: 'select',
      options: ['today', 'tomorrow', 'custom'],
      description: 'Pre-selected schedule preset',
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * 1. Primary Interactive Share Workbench:
 * Operator curates media files, generates AI caption, and taps 'Share Files (12)'
 * which triggers system share and opens the post-share attribution bottom sheet
 * upon returning to capture destination channel & date.
 */
export const InteractiveShareWorkbench: Story = {
  name: '1. Interactive Share Flow (Tap "Share Files" -> Attribution Sheet)',
  args: {
    mode: 'catalog',
  },
};

/**
 * 2. Post-Share Sheet Open — Others (Default Mode):
 * Demonstrates the bottom sheet shown immediately after returning from sharing files.
 * Default is 'Others (WhatsApp / General)' with 1-tap 'Done & Confirm' to mark complete.
 */
export const PostShareOthersMode: Story = {
  name: '2. Post-Share Sheet (Others Default Mode)',
  args: {
    mode: 'catalog',
    postShareSheetOpen: true,
    initialAttributionPlatform: 'others',
  },
};

/**
 * 3. Post-Share Sheet Open — Instagram Mode (@vayyari_fashions Selected):
 * Operator switches destination to Instagram. Renders swipeable circular profile icons
 * and the compact Date & Time input field.
 */
export const PostShareInstagramMode: Story = {
  name: '3. Post-Share Sheet (Instagram Mode: Account Row & Date-Time Field)',
  args: {
    mode: 'catalog',
    postShareSheetOpen: true,
    initialAttributionPlatform: 'instagram',
    initialSelectedChannelId: 'ch-1',
    initialDatePreset: 'today',
  },
};

/**
 * 4. Post-Share Sheet Open — Android Material 3 Calendar & Time Picker Modal Open:
 * Demonstrates the Android Material 3 style Date & Time picker dialog featuring
 * top header banner with selected date, 7-column calendar matrix with circular day selection,
 * day-part timing chips, and Cancel / Set Schedule action buttons.
 */
export const PostShareMaterialPickerModal: Story = {
  name: '4. Post-Share Sheet (Material 3 Calendar & Time Picker Active)',
  args: {
    mode: 'catalog',
    postShareSheetOpen: true,
    calendarModalOpen: true,
    initialAttributionPlatform: 'instagram',
    initialSelectedChannelId: 'ch-1',
    initialDatePreset: 'custom',
    initialCustomDate: '2026-09-18',
    initialCustomSlot: 'evening',
  },
};

/**
 * 5. Post Planner Mode (Context Bound to Channel):
 * Reused in Post Planner when sharing from active channel queue.
 * Displays channel context card while retaining full media and caption control.
 */
export const PostPlannerLockedContext: Story = {
  name: '5. Post Planner Mode (@saree_dump Locked Context)',
  args: {
    mode: 'post_planner',
    lockedChannel: DEFAULT_CHANNELS[2],
  },
};

/**
 * 6. Selective Media Curation (4 of 12 Selected):
 * Demonstrates ordered numbered badges (1..4) with unselected ring indicators.
 */
export const SelectiveMediaCuration: Story = {
  name: '6. Selective Media Curation (4 of 12 Selected)',
  args: {
    mode: 'catalog',
  },
};

/**
 * 7. Rich AI Caption with Vendor Details:
 * Demonstrates pre-generated multi-line caption, character counter, and copy shortcut.
 */
export const RichAiCaptionActive: Story = {
  name: '7. Rich AI Caption & Vendor Source Details',
  args: {
    mode: 'catalog',
    initialDescription:
      '✨ Kanjivaram Silk Saree (SAR-KAN-901)\n\n🌟 Fabric: Mulberry Silk\n🏷️ Price: ₹8,499\n\nExclusive bridal edition handwoven by master weavers in Tamil Nadu.\n\n#VayyariFashions #EthnicWear #KanjivaramSilk #SareeLove',
  },
};
