import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { SpecificationRow } from "../../components/molecules/SpecificationRow/SpecificationRow";
import { radius } from "../../theme/designTokens";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Molecules/SpecificationRow",
  component: SpecificationRow,
  args: {
    ...THEME_ARGS, label: "Shape", value: "Flowing drape", alt: false },
  argTypes: {
    ...THEME_ARG_TYPES, alt: { control: "boolean" } },
};
export default meta;
type Story = StoryObj<typeof SpecificationRow>;

export const Default: Story = {};
export const Alt: Story = { args: { alt: true } };
export const FullGrid = (args: any) => (
  <View style={{ borderWidth: 1, borderColor: "#e7dcd3", borderRadius: radius.md, overflow: "hidden" }}>
    {[["Shape","Flowing drape"],["Length","Full length"],["Neck","Round neck"],["Transparency","Opaque"]]
      .map(([k, v], i) => <SpecificationRow key={k} label={k} value={v} alt={i % 2 === 1} />)}
  </View>
);
