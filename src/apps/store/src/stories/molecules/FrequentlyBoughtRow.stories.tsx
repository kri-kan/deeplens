import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { FrequentlyBoughtRow } from "../../components/molecules/FrequentlyBoughtRow/FrequentlyBoughtRow";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Molecules/FrequentlyBoughtRow",
  component: FrequentlyBoughtRow,
  args: {
    ...THEME_ARGS,
    brand: "VAYYARI", name: "Ivory Flow Saree", price: "₹3,299",
    originalPrice: "₹4,999", offLabel: "34% OFF",
    gradient: ["#f3e6d8", "#d3aa75"] as [string, string], checked: true,
  },
  argTypes: {
    ...THEME_ARG_TYPES, checked: { control: "boolean" } },
};
export default meta;
type Story = StoryObj<typeof FrequentlyBoughtRow>;

export const Checked: Story = {};
export const Unchecked: Story = { args: { checked: false } };
export const NoDiscount: Story = { args: { brand: "AND", name: "Solid Ribbed Tank Top", price: "₹1,290", gradient: ["#dfe4f2", "#8aa0d7"] as [string, string] } };
