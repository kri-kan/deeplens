import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ShareButton } from "../../components/atoms/ShareButton/ShareButton";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Atoms/ShareButton",
  component: ShareButton,
  args: {
    ...THEME_ARGS, size: 48 },
  argTypes: {
    ...THEME_ARG_TYPES, size: { control: { type: "number", min: 32, max: 72, step: 4 } } },
};
export default meta;
type Story = StoryObj<typeof ShareButton>;

export const Default: Story = {};
