import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { BrandMark } from "../../components/organisms/BrandMark/BrandMark";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Organisms/BrandMark",
  component: BrandMark,
  args: {
    ...THEME_ARGS,
    size: 36,
    label: "V",
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    size: { control: { type: "number", min: 20, max: 72, step: 4 } },
  },
};
export default meta;
type Story = StoryObj<typeof BrandMark>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 24, label: "V" },
};

export const Large: Story = {
  args: { size: 56, label: "VAYYARI" },
};

export const Gallery = (args: any) => (
  <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
    <BrandMark size={24} label="V" />
    <BrandMark size={36} label="V" />
    <BrandMark size={48} label="V" />
    <BrandMark size={56} label="V" />
  </View>
);
