import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { RatingBadge } from "../../components/atoms/RatingBadge/RatingBadge";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Atoms/RatingBadge",
  component: RatingBadge,
  args: {
    ...THEME_ARGS, rating: 4.5 },
  argTypes: {
    ...THEME_ARG_TYPES, rating: { control: { type: "number", min: 1, max: 5, step: 0.1 } } },
};
export default meta;
type Story = StoryObj<typeof RatingBadge>;

export const High: Story = { args: { rating: 4.6 } };
export const Mid: Story = { args: { rating: 3.7 } };
export const Low: Story = { args: { rating: 2.8 } };
export const AllTiers = (args: any) => (
  <View style={{ flexDirection: "row", gap: 8 }}>
    <RatingBadge rating={4.6} />
    <RatingBadge rating={3.7} />
    <RatingBadge rating={2.8} />
  </View>
);
