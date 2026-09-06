import type { StorybookConfig } from "@storybook/react-native";

const config: StorybookConfig = {
  stories: ["../src/stories/**/*.stories.@(ts|tsx|js|jsx)"],
  deviceAddons: [
    "@storybook/addon-ondevice-controls",
    "@storybook/addon-ondevice-actions",
    "@storybook/addon-ondevice-backgrounds",
  ],
};

export default config;
