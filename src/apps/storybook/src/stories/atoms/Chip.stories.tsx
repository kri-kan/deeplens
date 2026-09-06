import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { Chip } from "../../components/atoms/Chip/Chip";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Atoms/Chip",
  component: Chip,
  args: {
    ...THEME_ARGS, label: "New In", active: false },
  argTypes: {
    ...THEME_ARG_TYPES, active: { control: "boolean" } },
};
export default meta;
type Story = StoryObj<typeof Chip>;

export const Default: Story = { args: { label: "New In" } };
export const Active: Story = { args: { label: "Festive", active: true } };
export const Row = (args: any) => (
  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
    {["New In", "Festive", "Western", "Sarees", "Sale"].map((l, i) => (
      <Chip key={l} label={l} active={i === 1} />
    ))}
  </View>
);
