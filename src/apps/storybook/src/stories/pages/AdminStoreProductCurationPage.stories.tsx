import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { AdminStoreProductCurationPage } from '../../components/pages/AdminStoreProductCurationPage';
import {
  INITIAL_COLOR_GROUPS,
  MOCK_CURATION_MEDIA,
} from '../../components/organisms/StoreCuration/mockCurationData';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Pages/Admin/Store - Product Curation Workbench',
  component: AdminStoreProductCurationPage,
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
 * 0. Store Curation: Main Hub (Mobile View - 390px):
 * Master curation entry hub adapting dynamically across Mobile (390px), Tablet (768px), and Desktop (1240px Fluid).
 * Defaults to Mobile View (390px) with interactive 1-tap form factor switching in the top FormFactorShell toolbar.
 */
export const StoreCurationMainHub: Story = {
  name: '0. Store Curation: Main Hub (Mobile View - 390px)',
  args: {
    initialScreen: 'hub',
    initialShowPreview: false,
  },
  parameters: {
    formFactorShell: {
      defaultFactor: 'mobile',
    },
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
    initialScreen: 'qualify_and_group',
    initialStage: 'swatches',
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
    initialScreen: 'qualify_and_group',
    initialStage: 'swatches',
    initialColorGroups: Array.from({ length: 12 }, (_, i) => ({
      id: `cg-${i + 1}`,
      name: `Colorway ${i + 1}`,
      colorwayCode: `VF2B58-COL${i + 1}`,
      template: 'contrast-border',
      slotA: i % 2 === 0 ? '#1B4D3E' : '#C0392B',
      slotB: '#D4AF37',
      colors: [i % 2 === 0 ? '#1B4D3E' : '#C0392B', '#D4AF37'],
      colorCount: 2,
      isAvailable: true,
    })),
    initialShowPreview: false,
  },
};

/**
 * 2c. Stage 2: Configured Swatches Row (Direct Tap/Long-Press):
 * Demonstrates the horizontal Configured Swatches row rendered below the template tiles & stepper.
 * Merchandiser can tap or long-press any swatch directly in Stage 2 to customize colors.
 */
export const Stage2cConfiguredSwatchesRow: Story = {
  name: '2c. Stage 2: Configured Swatches Row (Direct Tap / Long-Press)',
  args: {
    initialScreen: 'qualify_and_group',
    initialStage: 'swatches',
    initialShowPreview: false,
  },
};

/**
 * 3. Stage 3: Swatch Heads, Common [C] & Frameless Bottom Nav:
 * Horizontal swipeable swatch heads with default [C] Common swatch, overlay count badges,
 * responsive 250ms long-press, and clean frameless bottom nav links (‹ Swatches and Save ✓).
 */
export const Stage3GroupingAndCommon: Story = {
  name: '3. Qualify & Group: Stage 3 Swatch Heads & Frameless Bottom Nav',
  args: {
    initialScreen: 'qualify_and_group',
    initialStage: 'grouping',
    initialShowPreview: false,
  },
};

/**
 * 3b. Color Assignment Picker (2 Slots: Contrast Border, Fixed Limit):
 * Demonstrates strict slot limit for Contrast Border: exactly 2 slots (Body 80%, Border 20%).
 * Notice + Slot button is hidden and slot removal is disabled.
 */
export const Stage3bColorPickerModalOpen: Story = {
  name: '3b. Color Picker: Contrast Border (2 Slots Fixed, Body & Border)',
  args: {
    initialScreen: 'qualify_and_group',
    initialStage: 'grouping',
    initialColorPickerGroupId: 'cg-emerald',
    initialShowPreview: false,
  },
};

/**
 * 3c. Color Assignment Picker (3 Slots: Peacock 3-Color Pie, Variable Limit 2-4):
 * Demonstrates variable slot limits for Multi-Shade: 3 wedges (33% each).
 * Allows adding up to 4 slots (+ Slot is visible) or removing down to 2 slots.
 */
export const Stage3cThreeSlotColorPickerModalOpen: Story = {
  name: '3c. Color Picker: Multi-Shade Split (3 Wedges, Limit: 2–4)',
  args: {
    initialScreen: 'qualify_and_group',
    initialStage: 'grouping',
    initialColorPickerGroupId: 'cg-peacock',
    initialShowPreview: false,
  },
};

/**
 * 3d. Color Assignment Picker (1 Slot: Solid Hue, Fixed Limit):
 * Demonstrates strict 1-slot limit for Solid swatches: Primary (100%).
 * Notice + Slot is completely hidden and slot removal is disabled.
 */
export const Stage3dSolidColorPickerModalOpen: Story = {
  name: '3d. Color Picker: Solid Hue (1 Slot Fixed, Primary 100%)',
  args: {
    initialScreen: 'qualify_and_group',
    initialStage: 'grouping',
    initialColorPickerGroupId: 'cg-royal',
    initialShowPreview: false,
  },
};

/**
 * 3e. Color Assignment Picker (4 Slots: Quadrant Split, Max Limit Reached):
 * Demonstrates 4-quadrant split multi-shade swatch (25% each).
 * Because the 4-slot limit is reached, the + Slot button is automatically hidden.
 */
export const Stage3eFourSlotQuadColorPickerModalOpen: Story = {
  name: '3e. Color Picker: 4-Quadrant Split (Max Limit 4 Reached)',
  args: {
    initialScreen: 'qualify_and_group',
    initialStage: 'grouping',
    initialColorPickerGroupId: 'cg-quad',
    initialShowPreview: false,
  },
};

/**
 * 4. Stage 4: Metadata, Specifications & AI Derivation:
 * 4-section modular editor (Craft & Fabric Specs, Commercial Pricing & Margins, Sizing & Tailoring, Occasions & Facets)
 * with One-Click '✨ AI Auto-Derive All' engine.
 */
export const Stage4MetadataAndPricing: Story = {
  name: '4. Metadata & Specs: 4-Section Editor with AI Auto-Derivation',
  args: {
    initialScreen: 'metadata',
    initialShowPreview: false,
  },
};

/**
 * 4b. Stage 4b: Prefilled from Unified Attributes:
 * Demonstrates automatic specs prefilling and authentic census taxonomy facets from product.unified_attributes.
 */
export const Stage4bPrefilledFromUnifiedAttributes: Story = {
  name: '4b. Metadata & Specs: Prefilled from Unified Attributes',
  args: {
    initialScreen: 'metadata',
    initialShowPreview: false,
    title: 'Soft Linen Printed Running Blouse With Latkan Print',
    fabric: 'Soft Linen',
    baseCostPrice: 380,
    initialMrp: 999,
    initialSalePrice: 550,
    product: {
      id: 'prod-linen-latkan-6e912dbb',
      title: 'Soft Linen Printed Running Blouse With Latkan Print',
      fabric: 'Soft Linen',
      stitch_type: 'Unstitched',
      unified_attributes: {
        price: 550,
        fabric: 'Linen, Digital Print',
        stitch_type: 'Unstitched',
        craft_technique: 'Foil & Digital Fusion Print',
        border_pallu: 'Rich Pallu with Tassels (Latkan)',
        blouse_format: 'Attached Unstitched Running Blouse',
        occasions: ['festive_diwali_puja', 'daily_handloom'],
      },
    },
  },
};

/**
 * 4c. Stage 4c: Sizing & Drape Parity (No-Size Informational vs Multi-Size):
 * Demonstrates the canonical Sizing System Variant (No Size with One Size/Free Size informational badge,
 * editable subtitle, and Letter/Numeric/Kids multi-size availability matrix).
 */
export const Stage4cSizingAndDrapeAlignment: Story = {
  name: '4c. Metadata & Specs: Sizing & Drape Parity with Size Setting Workflow',
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
