import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { MoreLinksCard } from "../../components/organisms/MoreLinksCard/MoreLinksCard";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Organisms/MoreLinksCard",
  component: MoreLinksCard,
  args: {
    ...THEME_ARGS, links: ["More Sarees by VAYYARI", "More Handloom Sarees", "More Sarees"] },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof MoreLinksCard>;

export const Default: Story = {};
export const TwoLinks: Story = { args: { links: ["More Dresses by VAYYARI", "More Dresses"] } };
