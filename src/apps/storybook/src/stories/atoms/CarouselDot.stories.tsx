import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { CarouselDot } from "../../components/atoms/CarouselDot/CarouselDot";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Atoms/CarouselDot",
  component: CarouselDot,
  args: {
    ...THEME_ARGS, active: false },
  argTypes: {
    ...THEME_ARG_TYPES, active: { control: "boolean" } },
};
export default meta;
type Story = StoryObj<typeof CarouselDot>;

export const Inactive: Story = {};
export const Active: Story = { args: { active: true } };
export const DotsRow = (args: any) => {
  const [active, setActive] = useState(0);
  return (
    <View style={{ flexDirection: "row", gap: 7, backgroundColor: "#9ec38f", padding: 16, borderRadius: 12 }}>
      {[0, 1, 2, 3].map((i) => (
        <CarouselDot key={i} active={active === i} onPress={() => setActive(i)} />
      ))}
    </View>
  );
};
