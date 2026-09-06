import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ScrollView, View } from "react-native";
import { ColourCard } from "../../components/molecules/ColourCard/ColourCard";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const SWATCHES = [
  { label: "Ivory", gradient: ["#f3e6d8", "#d3aa75"] as [string, string] },
  { label: "Sand", gradient: ["#e9d6af", "#c09a5b"] as [string, string] },
  { label: "Rose", gradient: ["#f0d5d1", "#bf7b71"] as [string, string] },
  { label: "Stone", gradient: ["#dacdbd", "#a89a89"] as [string, string] },
];

const meta: Meta<any> = {
  title: "Molecules/ColourCard",
  component: ColourCard,
  args: {
    ...THEME_ARGS, label: "Ivory", gradient: ["#f3e6d8", "#d3aa75"], selected: false },
  argTypes: {
    ...THEME_ARG_TYPES, selected: { control: "boolean" } },
};
export default meta;
type Story = StoryObj<typeof ColourCard>;

export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };
export const SwatchRow = (args: any) => {
  const [sel, setSel] = useState("Ivory");
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ flexDirection: "row", alignItems: "flex-start", padding: 8 }}
    >
      {SWATCHES.map((s) => (
        <ColourCard key={s.label} {...s} selected={sel === s.label} onPress={() => setSel(s.label)} />
      ))}
    </ScrollView>
  );
};
