import React, { useState } from 'react';
import type { Meta } from '@storybook/react-native';
import { YStack, Button } from 'tamagui';
import { PwaInstallBanner } from '../../components/molecules/PwaInstallBanner';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Molecules/PwaInstallBanner',
  component: PwaInstallBanner,
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const DesktopOfflinePrompt = () => (
  <YStack padding={24} alignItems="center">
    <PwaInstallBanner
      forceVisible={true}
      isDesktop={true}
      appName="Vayyari Luxury Store"
    />
  </YStack>
);

export const MobileHomeScreenPrompt = () => (
  <YStack padding={24} alignItems="center">
    <PwaInstallBanner
      forceVisible={true}
      isDesktop={false}
      appName="Vayyari Luxury Store"
    />
  </YStack>
);

export const InteractiveSimulation = () => {
  const [show, setShow] = useState(true);
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <YStack padding={24} gap={16} alignItems="center">
      <YStack flexDirection="row" gap={10}>
        <Button size="$3" onPress={() => setMode(mode === 'desktop' ? 'mobile' : 'desktop')}>
          Mode: {mode === 'desktop' ? 'Desktop' : 'Mobile'}
        </Button>
        <Button size="$3" onPress={() => setShow(!show)}>
          {show ? 'Hide Banner' : 'Show Banner'}
        </Button>
      </YStack>

      {show && (
        <PwaInstallBanner
          forceVisible={true}
          isDesktop={mode === 'desktop'}
          appName="Vayyari Store"
          onDismiss={() => setShow(false)}
        />
      )}
    </YStack>
  );
};
