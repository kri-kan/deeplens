import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { PriceTag } from "../../components/atoms/PriceTag/PriceTag";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Atoms/PriceTag",
  component: PriceTag,
  args: {
    ...THEME_ARGS, price: 3299, originalPrice: 4999, offPercent: 34, size: "md" },
  argTypes: {
    ...THEME_ARG_TYPES,
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
};
export default meta;
type Story = StoryObj<typeof PriceTag>;

export const Small: Story = { args: { price: 1090, originalPrice: 3999, offPercent: 73, size: "sm" } };
export const Medium: Story = { args: { price: 3299, originalPrice: 4999, offPercent: 34, size: "md" } };
export const Large: Story = { args: { price: 3299, originalPrice: 4999, offPercent: 34, size: "lg" } };
export const NoDiscount: Story = { args: { price: 1290, size: "md" } };
