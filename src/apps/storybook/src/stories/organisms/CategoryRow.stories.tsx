import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { CategoryRow } from "../../components/organisms/CategoryRow/CategoryRow";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const ITEMS = ["New In", "Sarees", "Lehengas", "Dresses", "Kurtas", "Festive", "Sale"];

const meta: Meta<any> = {
  title: "Organisms/CategoryRow",
  component: CategoryRow,
  args: {
    ...THEME_ARGS, items: ITEMS, initialActive: "New In" },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof CategoryRow>;

export const Default: Story = {};
export const ActiveSarees: Story = { args: { initialActive: "Sarees" } };
