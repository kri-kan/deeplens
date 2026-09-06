import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { IconButton } from "../../components/atoms/IconButton/IconButton";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Atoms/IconButton",
  component: IconButton,
  args: {
    ...THEME_ARGS, icon: "⤴", size: 48, active: false },
  argTypes: {
    ...THEME_ARG_TYPES, active: { control: "boolean" }, size: { control: { type: "number", min: 32, max: 72 } } },
};
export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = { args: { icon: "⤴" } };
export const Active: Story = { args: { icon: "★", active: true } };
export const Gallery = (args: any) => (
  <View style={{ flexDirection: "row", gap: 10 }}>
    <IconButton icon="⤴" />
    <IconButton icon="♡" />
    <IconButton icon="★" active activeColor="#f59e0b" />
    <IconButton icon="🔍" />
  </View>
);
