import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, Text, Button } from 'tamagui';
import { FloatingPublishToast } from '../../components/molecules/FloatingPublishToast/FloatingPublishToast';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/FloatingPublishToast',
  component: FloatingPublishToast,
  args: {
    ...THEME_ARGS,
    message: '✨ Successfully published 3 product updates to Vayyari Store!',
    visible: true,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof FloatingPublishToast>;

export const DefaultFloating: Story = {
  name: '1. Standard Floating Success Toast',
  args: {
    message: '✨ Successfully published 4 product updates to Vayyari Store!',
    visible: true,
    bottomOffset: 20,
  },
};

export const InteractiveDemo = () => {
  const [toast, setToast] = useState<string | null>('✨ Published 2 products to storefront!');

  return (
    <YStack height={350} padding={20} justifyContent="center" alignItems="center" gap={12}>
      <Text fontSize={13} color="#666">
        Simulate non-disruptive floating feedback without layout shift
      </Text>
      <Button
        size="$3"
        theme="active"
        onPress={() => setToast(`✨ Batch synced at ${new Date().toLocaleTimeString()}!`)}
      >
        Trigger Publish Action
      </Button>

      {toast && (
        <FloatingPublishToast
          message={toast}
          visible={true}
          bottomOffset={30}
          onDismiss={() => setToast(null)}
        />
      )}
    </YStack>
  );
};
