import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { SwatchDot } from "../../components/atoms/SwatchDot/SwatchDot";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Atoms/SwatchDot",
  component: SwatchDot,
  args: {
    ...THEME_ARGS, color: "#f3e6d8", selected: false },
  argTypes: {
    ...THEME_ARG_TYPES, selected: { control: "boolean" }, color: { control: "color" } },
};
export default meta;
type Story = StoryObj<typeof SwatchDot>;

export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };
export const Palette = (args: any) => {
  const [sel, setSel] = useState("#f3e6d8");
  const swatches = ["#f3e6d8", "#e9d6af", "#dacdbd", "#f0d5d1", "#dfe4f2"];
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {swatches.map((c) => <SwatchDot key={c} color={c} selected={sel === c} onPress={() => setSel(c)} />)}
    </View>
  );
};
