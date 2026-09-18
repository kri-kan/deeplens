import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck, LuSparkles, LuRotateCcw, LuStore, LuLayers, LuTag, LuDollarSign, LuEye } from 'react-icons/lu';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../../utils/storyTheme';
import { useTheme } from '../../../theme';
import { JourneyDefinition } from '../types';
import { JourneyPlayer } from '../harness/JourneyPlayer';
import { AdminVayyariStoreInventoryPage, MOCK_PUBLISHED_PRODUCTS } from '../../../components/pages/AdminVayyariStoreInventoryPage';
import { AdminStoreProductCurationPage } from '../../../components/pages/AdminStoreProductCurationPage';
import {
  INITIAL_COLOR_GROUPS,
  MOCK_CURATION_MEDIA,
} from '../../../components/organisms/StoreCuration/mockCurationData';
import {
  StoreCurationMediaItem,
  StoreColorGroup,
  StoreProductLifecycleState,
} from '../../../components/organisms/StoreCuration/types';

interface StoreCurationJourneyState {
  productId: string;
  productCode: string;
  title: string;
  fabric: string;
  lifecycleState: StoreProductLifecycleState;
  mrp: number;
  salePrice: number;
  baseCostPrice: number;
  mediaList: StoreCurationMediaItem[];
  colorGroups: StoreColorGroup[];
}

const INITIAL_JOURNEY_STATE: StoreCurationJourneyState = {
  productId: 'prod-vf2b58',
  productCode: 'VF2B58',
  title: 'Banarasi Dupion Silk Zari Saree',
  fabric: 'Banarasi Dupion Silk',
  lifecycleState: 'available',
  mrp: 14999,
  salePrice: 10999,
  baseCostPrice: 8499,
  mediaList: MOCK_CURATION_MEDIA,
  colorGroups: INITIAL_COLOR_GROUPS,
};

function JourneyCompletionChapter({
  state,
  onRestart,
}: {
  state: StoreCurationJourneyState;
  onRestart: () => void;
}) {
  const { tokens } = useTheme();

  return (
    <YStack
      flex={1}
      minHeight={650}
      backgroundColor={tokens.background}
      alignItems="center"
      justifyContent="center"
      padding={32}
      gap={24}
    >
      <YStack
        width={72}
        height={72}
        borderRadius={36}
        backgroundColor={tokens.accentSubtle}
        alignItems="center"
        justifyContent="center"
      >
        <LuCheck size={40} color={tokens.accent} />
      </YStack>

      <YStack alignItems="center" gap={8} maxWidth={460}>
        <Text fontSize={11} fontWeight="800" color={tokens.accent} letterSpacing={1.4} textTransform="uppercase">
          Curation Journey Complete
        </Text>
        <Text fontSize={26} fontWeight="800" color={tokens.text} textAlign="center">
          {state.productCode} Curated &amp; Ready for Storefront
        </Text>
        <Text fontSize={13} color={tokens.textMuted} textAlign="center" lineHeight={20}>
          The 3-stage qualify &amp; group pipeline, dynamic N-slot swatches, and commercial pricing margins have been fully verified and persisted.
        </Text>
      </YStack>

      {/* Summary Chips */}
      <XStack gap={10} flexWrap="wrap" justifyContent="center">
        <XStack backgroundColor={tokens.surface} borderWidth={1} borderColor={tokens.border} paddingHorizontal={12} paddingVertical={6} borderRadius={20} gap={6} alignItems="center">
          <LuLayers size={13} color={tokens.accent} />
          <Text fontSize={11} fontWeight="700" color={tokens.text}>
            {state.colorGroups.length} Swatches Configured
          </Text>
        </XStack>
        <XStack backgroundColor={tokens.surface} borderWidth={1} borderColor={tokens.border} paddingHorizontal={12} paddingVertical={6} borderRadius={20} gap={6} alignItems="center">
          <LuStore size={13} color={tokens.accent} />
          <Text fontSize={11} fontWeight="700" color={tokens.text}>
            {state.mediaList.filter((m) => m.isQualified).length} Media Qualified
          </Text>
        </XStack>
        <XStack backgroundColor={tokens.surface} borderWidth={1} borderColor={tokens.border} paddingHorizontal={12} paddingVertical={6} borderRadius={20} gap={6} alignItems="center">
          <LuDollarSign size={13} color={tokens.accent} />
          <Text fontSize={11} fontWeight="700" color={tokens.text}>
            ₹{state.salePrice.toLocaleString('en-IN')} (27% OFF)
          </Text>
        </XStack>
      </XStack>

      <XStack
        cursor="pointer"
        backgroundColor={tokens.accent}
        paddingHorizontal={20}
        paddingVertical={12}
        borderRadius={8}
        alignItems="center"
        gap={8}
        hoverStyle={{ opacity: 0.9 }}
        pressStyle={{ scale: 0.98 }}
        onPress={onRestart}
      >
        <LuRotateCcw size={14} color={tokens.accentForeground} />
        <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
          Replay In-Store to Curation Journey
        </Text>
      </XStack>
    </YStack>
  );
}

export const storeInventoryToCurationJourney: JourneyDefinition<StoreCurationJourneyState> = {
  id: 'store-inventory-to-curation-journey',
  title: 'In-Store Inventory to Curation & Qualify/Group Journey',
  description:
    'End-to-end admin workflow starting from In-Store Inventory, entering the 2-Card Store Curation Landing Hub, executing the 3-Stage Qualify & Group Wizard, refining metadata, and verifying via Live PDP Simulation.',
  tag: 'Store Curation / ADO #533',
  initialState: INITIAL_JOURNEY_STATE,
  steps: [
    {
      id: 'step-1-inventory',
      title: '1. In-Store Synced Inventory',
      subtitle: 'Merchandiser browses live store catalog items',
      badge: 'Inventory Grid',
      simulatedAction: {
        label: 'Selects Product & Taps "Curate in Store ➔"',
        description:
          'The merchandiser spots VF2B58 with 7 raw assets in the active inventory and taps "Curate in Store ➔" to enter the Curation Hub.',
        durationMs: 3200,
      },
      render: ({ nextStep }) => (
        <AdminVayyariStoreInventoryPage
          products={MOCK_PUBLISHED_PRODUCTS}
          onNavigateToStoreCuration={(_id) => nextStep()}
        />
      ),
    },
    {
      id: 'step-2-curation-hub',
      title: '2. Store Curation Landing Hub',
      subtitle: '2-Tile Hub-and-Spoke Entry: Qualify & Group vs Metadata',
      badge: 'Hub Screen',
      simulatedAction: {
        label: 'Navigates to "Qualify & Group" Pipeline',
        description:
          'From the Landing Hub, the merchandiser reviews the overview card and selects "Qualify & Group" (Card 1) to configure swatches and media.',
        durationMs: 3500,
      },
      render: ({ state, nextStep, prevStep, updateState }) => (
        <AdminStoreProductCurationPage
          productCode={state.productCode}
          title={state.title}
          fabric={state.fabric}
          baseCostPrice={state.baseCostPrice}
          initialMrp={state.mrp}
          initialSalePrice={state.salePrice}
          initialLifecycleState={state.lifecycleState}
          initialMedia={state.mediaList}
          initialColorGroups={state.colorGroups}
          initialScreen="hub"
          onBack={prevStep}
          onSave={(payload) => {
            updateState(payload);
            nextStep();
          }}
        />
      ),
    },
    {
      id: 'step-3-stage-1-qualify',
      title: '3. Stage 1: Media Qualification',
      subtitle: 'Filter vendor chat duplicates & assign cover hero',
      badge: '1. Qualify',
      simulatedAction: {
        label: 'Qualifies Studio Images & Flags Common [C] Craft',
        description:
          'Merchandiser checks high-res front drape photos, disqualifies blurry chat clips, and flags universal Zari pallu as Common.',
        durationMs: 3500,
      },
      render: ({ state, nextStep, prevStep, updateState }) => (
        <AdminStoreProductCurationPage
          productCode={state.productCode}
          title={state.title}
          fabric={state.fabric}
          baseCostPrice={state.baseCostPrice}
          initialMrp={state.mrp}
          initialSalePrice={state.salePrice}
          initialLifecycleState={state.lifecycleState}
          initialMedia={state.mediaList}
          initialColorGroups={state.colorGroups}
          initialScreen="qualify_and_group"
          initialStage="qualify"
          onBack={prevStep}
          onSave={(payload) => {
            updateState(payload);
            nextStep();
          }}
        />
      ),
    },
    {
      id: 'step-4-stage-2-swatches',
      title: '4. Stage 2: Swatch Creation & Stepper',
      subtitle: '5 ethnic templates, count stepper & configured swatches row',
      badge: '2. Swatches',
      simulatedAction: {
        label: 'Selects "Border" Template, Steps to 4 & Customizes Swatches',
        description:
          'Merchandiser selects the contrast-border ethnic template, steps variant count to 4 colorways, and reviews the configured swatches row with direct tap/long-press color editing.',
        durationMs: 3500,
      },
      render: ({ state, nextStep, prevStep, updateState }) => (
        <AdminStoreProductCurationPage
          productCode={state.productCode}
          title={state.title}
          fabric={state.fabric}
          baseCostPrice={state.baseCostPrice}
          initialMrp={state.mrp}
          initialSalePrice={state.salePrice}
          initialLifecycleState={state.lifecycleState}
          initialMedia={state.mediaList}
          initialColorGroups={state.colorGroups}
          initialScreen="qualify_and_group"
          initialStage="swatches"
          onBack={prevStep}
          onSave={(payload) => {
            updateState(payload);
            nextStep();
          }}
        />
      ),
    },
    {
      id: 'step-5-stage-3-grouping',
      title: '5. Stage 3: Swatch Heads & Slot-Limited Bottom Sheet',
      subtitle: 'Map photos to swatches, enforce slot limits & frameless bottom nav',
      badge: '3. Grouping',
      simulatedAction: {
        label: 'Assigns Photos, Enforces Slot Limits & Advances via Frameless Nav',
        description:
          'Merchandiser taps swatch heads to assign photos, long-presses (250ms) to open the slot picker modal with template-bound slot count limits (e.g. 2 for Border), and advances via frameless bottom nav.',
        durationMs: 3800,
      },
      render: ({ state, nextStep, prevStep, updateState }) => (
        <AdminStoreProductCurationPage
          productCode={state.productCode}
          title={state.title}
          fabric={state.fabric}
          baseCostPrice={state.baseCostPrice}
          initialMrp={state.mrp}
          initialSalePrice={state.salePrice}
          initialLifecycleState={state.lifecycleState}
          initialMedia={state.mediaList}
          initialColorGroups={state.colorGroups}
          initialScreen="qualify_and_group"
          initialStage="grouping"
          onBack={prevStep}
          onSave={(payload) => {
            updateState(payload);
            nextStep();
          }}
        />
      ),
    },
    {
      id: 'step-6-metadata',
      title: '6. Dedicated Product Metadata & Pricing',
      subtitle: 'AI Craft narrative synthesis & commercial margins',
      badge: 'Metadata',
      simulatedAction: {
        label: 'Generates AI Craft Story & Verifies 23% Gross Margin',
        description:
          'Merchandiser synthesizes weaver story and sets selling price at ₹10,999 with 27% discount from MRP.',
        durationMs: 3500,
      },
      render: ({ state, nextStep, prevStep, updateState }) => (
        <AdminStoreProductCurationPage
          productCode={state.productCode}
          title={state.title}
          fabric={state.fabric}
          baseCostPrice={state.baseCostPrice}
          initialMrp={state.mrp}
          initialSalePrice={state.salePrice}
          initialLifecycleState={state.lifecycleState}
          initialMedia={state.mediaList}
          initialColorGroups={state.colorGroups}
          initialScreen="metadata"
          onBack={prevStep}
          onSave={(payload) => {
            updateState(payload);
            nextStep();
          }}
        />
      ),
    },
    {
      id: 'step-7-live-pdp-simulation',
      title: '7. Live Customer Storefront PDP Simulation',
      subtitle: 'Interactive 390px mobile view with dynamic photo pool',
      badge: 'Live PDP Preview',
      simulatedAction: {
        label: 'Taps Ethnic Swatches to Switch Media & Buffers Video',
        description:
          'Merchandiser validates that selecting a swatch instantly filters the carousel to [Group Photos] + [Common Photos].',
        durationMs: 4000,
      },
      render: ({ state, nextStep, prevStep }) => (
        <AdminStoreProductCurationPage
          productCode={state.productCode}
          title={state.title}
          fabric={state.fabric}
          baseCostPrice={state.baseCostPrice}
          initialMrp={state.mrp}
          initialSalePrice={state.salePrice}
          initialLifecycleState={state.lifecycleState}
          initialMedia={state.mediaList}
          initialColorGroups={state.colorGroups}
          initialScreen="hub"
          initialShowPreview={true}
          onBack={prevStep}
          onSave={nextStep}
        />
      ),
    },
    {
      id: 'step-8-completion',
      title: '8. Verification & Publish Complete',
      subtitle: 'Curation workflow complete across all systems',
      badge: 'Complete',
      simulatedAction: {
        label: 'Journey Complete: Product Synced to Storefront',
        description: 'All colorways, common assets, and commercial pricing are live in the store engine.',
        durationMs: 3000,
      },
      render: ({ state, goToStep }) => (
        <JourneyCompletionChapter state={state} onRestart={() => goToStep(0)} />
      ),
    },
  ],
};

const meta: Meta<typeof JourneyPlayer> = {
  title: 'Books/Admin/Store - In-Store Inventory to Curation Journey',
  component: JourneyPlayer,
  args: {
    ...THEME_ARGS,
    initialFormFactor: 'mobile',
    initialAutoPlay: false,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    initialAutoPlay: {
      control: 'boolean',
      description: 'Start simulation automatically on story load',
    },
    initialFormFactor: {
      control: 'select',
      options: ['mobile', 'tablet', 'desktop'],
      description: 'Default viewport size for the journey',
    },
  },
};

export default meta;
type Story = StoryObj<typeof JourneyPlayer>;

export const InteractiveInventoryToCuration: Story = {
  name: '1. Interactive In-Store Inventory to Curation Journey',
  render: (args: any) => (
    <JourneyPlayer
      journey={storeInventoryToCurationJourney}
      initialFormFactor={args.initialFormFactor || 'mobile'}
      initialAutoPlay={args.initialAutoPlay || false}
    />
  ),
};

export const AutoPlaySimulation: Story = {
  name: '2. Auto-Play Curation Pipeline Simulation',
  render: () => (
    <JourneyPlayer
      journey={storeInventoryToCurationJourney}
      initialFormFactor="mobile"
      initialAutoPlay={true}
    />
  ),
};
