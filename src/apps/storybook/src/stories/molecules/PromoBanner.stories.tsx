import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { PromoBanner } from "../../components/molecules/PromoBanner/PromoBanner";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Molecules/PromoBanner",
  component: PromoBanner,
  args: {
    ...THEME_ARGS, eyebrow: "Limited time", title: "Festive Edit", subtitle: "Fresh arrivals with handcrafted details" },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof PromoBanner>;

export const Default: Story = {};
export const SaleTheme: Story = { args: { eyebrow: "Flash Sale", title: "Up to 70% Off", subtitle: "Selected handloom styles" } };
