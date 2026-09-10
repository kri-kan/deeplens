import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { AdminStoreProductCurationPage } from '../../components/pages/AdminStoreProductCurationPage';
import {
  INITIAL_COLOR_GROUPS,
  MOCK_CURATION_MEDIA,
} from '../../components/organisms/StoreCuration/mockCurationData';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Admin/Store - Product Curation Workbench',
  component: AdminStoreProductCurationPage,
  decorators: [withFormFactor('mobile', 'Store Product Curation (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    productId: 'prod-vf2b58',
    productCode: 'VF2B58',
    title: 'Banarasi Dupion Silk Zari Saree',
    fabric: 'Banarasi Dupion Silk',
    baseCostPrice: 8499,
    initialMrp: 14999,
    initialSalePrice: 10999,
    initialLifecycleState: 'available',
    initialMedia: MOCK_CURATION_MEDIA,
    initialColorGroups: INITIAL_COLOR_GROUPS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    initialLifecycleState: {
      control: 'select',
      options: ['available', 'few_left', 'sold_out', 'out_of_stock', 'archived'],
      description: 'Storefront lifecycle availability state',
    },
    initialMrp: {
      control: 'number',
      description: 'Maximum Retail Price (Strikethrough)',
    },
    initialSalePrice: {
      control: 'number',
      description: 'Storefront selling price',
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * 0. Store Curation: Main Hub (2 Selection Tiles):
 * Entry hub displaying 2 prominent selection tiles:
 * 1. Qualify & Group (3 Stages: Qualify > Swatches > Grouping)
 * 2. Metadata (Story, AI Narrative & Commercial Pricing Margins)
 */
export const StoreCurationMainHub: Story = {
  name: '0. Store Curation: Main Hub (Qualify & Group + Metadata Tiles)',
  args: {
    initialScreen: 'hub',
    initialShowPreview: false,
  },
};

/**
 * 1. Stage 1: Media Qualification:
 * 3-tiles-per-row layout with check/uncheck per media item, video indicators, and bottom navigation (Left: Store Curation, Right: Swatches).
 */
export const Stage1MediaQualification: Story = {
  name: '1. Qualify & Group: Stage 1 Media Qualification',
  args: {
    initialScreen: 'qualify_and_group',
    initialStage: 'qualify',
    initialShowPreview: false,
  },
};

/**
 * 2. Stage 2: Color Swatch Creation & Group Count:
 * Swatch template picker (5 types), count stepper ([-] Count [+]), and reference grid of qualified media below.
 */
export const Stage2SwatchCreation: Story = {
  name: '2. Stage 2: Swatch Creation & Count Stepper',
  args: {
    initialStage: 'swatch_creation',
    initialShowPreview: false,
  },
};

/**
 * 2b. Stage 2: Two-Digit Swatch Count (12 Colorways):
 * Verifies that the 6th tile stepper, variant labels, and swatch generator scale cleanly to 2 digits.
 */
export const Stage2TwoDigitSwatchCount: Story = {
  name: '2b. Stage 2: Two-Digit Swatch Count (12 Colorways)',
  args: {
    initialStage: 'swatch_creation',
    initialColorGroups: Array.from({ length: 12 }, (_, i) => ({
      id: `cg-${i + 1}`,
      name: `Colorway ${i + 1}`,
      colorwayCode: `VF2B58-COL${i + 1}`,
      template: 'contrast-border',
      slotA: i % 2 === 0 ? '#1B4D3E' : '#C0392B',
      slotB: '#D4AF37',
      isAvailable: true,
    })),
    initialShowPreview: false,
  },
};

/**
 * 3. Stage 3: Swatch Heads, Common [C] & Media Assignment:
 * Horizontal swipeable swatch heads with default [C] Common swatch, overlay count badges,
 * assigning ungrouped media to swatches, and long-press/color picker.
 */
export const Stage3GroupingAndCommon: Story = {
  name: '3. Qualify & Group: Stage 3 Swatch Heads & Grouping (Save in Right)',
  args: {
    initialScreen: 'qualify_and_group',
    initialStage: 'grouping',
    initialShowPreview: false,
  },
};

/**
 * 3b. Long-Press Color Assignment Picker Popup:
 * Interactive modal for assigning N colors based on swatch template (Slot A Body 80%, Slot B Zari 20%),
 * auto-extracted K-Means centroids, 32 Oklch ethnic anchors, and live swatch preview dot.
 */
export const Stage3bColorPickerModalOpen: Story = {
  name: '3b. Long-Press Color Assignment Picker (2 Slots: Body & Zari)',
  args: {
    initialStage: 'grouping',
    initialColorPickerGroupId: 'cg-emerald',
    initialShowPreview: false,
  },
};

/**
 * 3c. Color Assignment Picker (3 Slots: Peacock 3-Color Pie):
 * Demonstrates dynamic N-slot architecture for 3-color pie multi-shade swatches with square slot tiles.
 */
export const Stage3cThreeSlotColorPickerModalOpen: Story = {
  name: '3c. Color Assignment Picker (3 Slots: Peacock 3-Color Pie)',
  args: {
    initialStage: 'grouping',
    initialColorPickerGroupId: 'cg-peacock',
    initialShowPreview: false,
  },
};

/**
 * 4. Stage 4: Metadata, AI Story & Pricing:
 * AI craft description generation and commercial pricing margin calculator.
 */
export const Stage4MetadataAndPricing: Story = {
  name: '4. Dedicated Product Metadata Screen (Story, AI & Margins)',
  args: {
    initialScreen: 'metadata',
    initialShowPreview: false,
  },
};

/**
 * 5. Live Customer Storefront PDP Simulation:
 * Isolates the customer-facing 390px mobile PDP view with carousel dots, bottom ethnic swatches,
 * dynamic photo switching, and video buffering on play tap.
 */
export const Stage5LiveStorefrontPreview: Story = {
  name: '5. Live Storefront PDP Simulation (390px)',
  args: {
    initialStage: 'qualification',
    initialShowPreview: true,
  },
};
