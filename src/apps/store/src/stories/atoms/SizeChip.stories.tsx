import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { SizeChip } from "../../components/atoms/SizeChip/SizeChip";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Atoms/SizeChip",
  component: SizeChip,
  args: {
    ...THEME_ARGS, label: "M", selected: false, disabled: false },
  argTypes: {
    ...THEME_ARG_TYPES, selected: { control: "boolean" }, disabled: { control: "boolean" } },
};
export default meta;
type Story = StoryObj<typeof SizeChip>;

export const Default: Story = { args: { label: "M" } };
export const Selected: Story = { args: { label: "L", selected: true } };
export const Disabled: Story = { args: { label: "XS", disabled: true } };
export const SizeRow = (args: any) => {
  const [sel, setSel] = useState("M");
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {["XS", "S", "M", "L", "XL"].map((s) => (
        <SizeChip key={s} label={s} selected={sel === s} disabled={s === "XS"} onPress={() => setSel(s)} />
      ))}
    </View>
  );
};
