import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { TargetEligibilitiesBottomSheet } from '../../components/organisms/TargetEligibilitiesBottomSheet';
import { PostPlannerCurationGrid } from '../../components/organisms/PostPlannerCurationGrid';
import { PlannedProductInfo } from '../../components/molecules/post-planner.types';
import { DEFAULT_PRODUCTS, DEFAULT_CHANNELS } from '../../components/pages/AdminPostPlannerPage';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { withFormFactor } from '../utils/FormFactorPreview';

const MOCK_PRODUCT: PlannedProductInfo = DEFAULT_PRODUCTS[0];

function SheetStoryWrapper(props: any) {
  const [open, setOpen] = useState(props.visible ?? true);
  const [selectedProduct, setSelectedProduct] = useState<PlannedProductInfo>(props.product || MOCK_PRODUCT);

  return (
    <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <PostPlannerCurationGrid
        items={DEFAULT_PRODUCTS}
        onSelectItem={(p) => {
          setSelectedProduct(p);
          setOpen(true);
        }}
      />
      <TargetEligibilitiesBottomSheet
        {...props}
        product={selectedProduct}
        visible={open}
        onDismiss={() => setOpen(false)}
        onSaveAffinity={() => setOpen(false)}
      />
    </View>
  );
}

const meta: Meta<any> = {
  title: 'Organisms/TargetEligibilitiesBottomSheet',
  component: TargetEligibilitiesBottomSheet,
  decorators: [withFormFactor('mobile', 'Target Channel Eligibilities Sheet (Mobile 390px)')],
  args: {
    ...THEME_ARGS,
    visible: true,
    product: MOCK_PRODUCT,
    channels: DEFAULT_CHANNELS,
    assignedChannelIds: ['ch-1', 'ch-3'],
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

export const DefaultPrompt: Story = {
  name: '1. Action Sheet (Save vs Complete Footer)',
  args: {
    visible: true,
    assignedChannelIds: ['ch-1', 'ch-3'],
  },
  render: (args) => <SheetStoryWrapper {...args} />,
};

export const SingleChannelAllocation: Story = {
  name: '2. Single Channel Allocated (@vayyari_fashions)',
  args: {
    visible: true,
    assignedChannelIds: ['ch-1'],
  },
  render: (args) => <SheetStoryWrapper {...args} />,
};

export const InteractiveSheet: Story = {
  name: '3. Interactive (Tap Grid Garment to Open Sheet)',
  render: (args) => <SheetStoryWrapper {...args} />,
};
