import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { StickyAddToBagBar } from "../../components/molecules/StickyAddToBagBar/StickyAddToBagBar";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Molecules/StickyAddToBagBar",
  component: StickyAddToBagBar,
  args: {
    ...THEME_ARGS, price: "₹3,299", title: "Ivory Flow Saree — VAYYARI" },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof StickyAddToBagBar>;

export const Default: Story = {};
export const LongTitle: Story = {
  args: { title: "Handcrafted Zari Border Cotton-Silk Drape in Ivory — VAYYARI Summer Collection 2026" },
};
