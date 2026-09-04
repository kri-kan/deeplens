import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

// Check if Storybook mode is activated via env variable, CLI flag, or web query parameter
const isStorybookEnv =
  process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true' ||
  process.env.STORYBOOK_ENABLED === 'true';

const isWebStorybook =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  (window.location.search.includes('storybook=1') ||
    window.location.pathname.startsWith('/storybook'));

const isStorybook = isStorybookEnv || isWebStorybook;

const Root = isStorybook
  ? require('./.storybook').default
  : require('./App').default;

registerRootComponent(Root);
