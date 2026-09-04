import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { SpecificationsPanel } from "../../components/organisms/SpecificationsPanel/SpecificationsPanel";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const SPECS = [
  { label: "Shape", value: "Flowing drape" },
  { label: "Length", value: "Full length" },
  { label: "Neck", value: "Round neck" },
  { label: "Sleeve Length", value: "Sleeveless" },
  { label: "Flare", value: "Flared" },
  { label: "Transparency", value: "Opaque" },
];

const meta: Meta<any> = {
  title: "Organisms/SpecificationsPanel",
  component: SpecificationsPanel,
  args: {
    ...THEME_ARGS, specs: SPECS },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof SpecificationsPanel>;

export const Default: Story = {};
export const Short: Story = { args: { specs: SPECS.slice(0, 4) } };
