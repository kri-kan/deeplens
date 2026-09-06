import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ReviewCard } from "../../components/molecules/ReviewCard/ReviewCard";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Molecules/ReviewCard",
  component: ReviewCard,
  args: {
    ...THEME_ARGS,
    initials: "AK",
    name: "Anisha Kotwal",
    date: "17 Aug 2025",
    rating: 5,
    text: "Beautiful dress! 😍 Great quality, perfect fit, and looks even prettier in person. Totally loved it! ♥",
  },
  argTypes: {
    ...THEME_ARG_TYPES, rating: { control: { type: "number", min: 1, max: 5 } } },
};
export default meta;
type Story = StoryObj<typeof ReviewCard>;

export const FiveStar: Story = {};
export const FourStar: Story = { args: { initials: "TD", name: "Tiddhi", date: "18 Mar 2026", rating: 4, text: "So comfortable dress, the colour and texture is really good!" } };
export const ThreeStar: Story = { args: { initials: "RS", name: "Richie S", date: "20 Jan 2026", rating: 3, text: "Good product, delivery was a bit slow." } };
