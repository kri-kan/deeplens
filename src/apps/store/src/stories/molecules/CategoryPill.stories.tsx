import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { CategoryPill } from "../../components/molecules/CategoryPill/CategoryPill";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Molecules/CategoryPill",
  component: CategoryPill,
  args: {
    ...THEME_ARGS, label: "Sarees", active: false },
  argTypes: {
    ...THEME_ARG_TYPES, active: { control: "boolean" } },
};
export default meta;
type Story = StoryObj<typeof CategoryPill>;

export const Default: Story = {};
export const Active: Story = { args: { active: true } };
export const Row = (args: any) => (
  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
    {["New In","Sarees","Lehengas","Dresses","Festive","Sale"].map((l, i) => (
      <CategoryPill key={l} label={l} active={i === 0} />
    ))}
  </View>
);
