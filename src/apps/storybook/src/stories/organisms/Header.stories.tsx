import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Header } from "../../components/organisms/Header/Header";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const NAV = ["Sarees", "Dresses", "Lehengas", "Intimates"];

const meta: Meta<any> = {
  title: "Organisms/Header",
  component: Header,
  args: {
    ...THEME_ARGS, navItems: NAV },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof Header>;

export const Desktop: Story = {};
export const Mobile: Story = {};
