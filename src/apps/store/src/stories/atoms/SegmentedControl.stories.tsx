import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import { SegmentedControl } from '../../components/atoms/SegmentedControl';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof SegmentedControl> = {
  title: 'Atoms/SegmentedControl',
  component: SegmentedControl,
  decorators: [withFormFactor('mobile', 'Segmented Tab Switcher Atom')],
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

function InteractiveSegment() {
  const [active, setActive] = useState('sarees');
  return (
    <YStack padding={20} maxWidth={360}>
      <SegmentedControl
        activeId={active}
        onChange={setActive}
        options={[
          { id: 'sarees', label: 'Sarees & Dresses' },
          { id: 'kids', label: 'Kids (0-15 Years)' },
        ]}
      />
    </YStack>
  );
}

export const CategorySwitcher: Story = {
  render: () => <InteractiveSegment />,
};
