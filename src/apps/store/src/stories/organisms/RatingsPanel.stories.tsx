import React from "react";
import type { Meta } from "@storybook/react-native";
import { RatingsPanel } from "../../components/organisms/RatingsPanel/RatingsPanel";
import { THEME_ARG_TYPES, THEME_ARGS } from "../../utils/storyTheme";

const REVIEWS = [
  { initials: "AK", name: "Anisha Kotwal", date: "17 Aug 2025", rating: 5, text: "Beautiful dress! 😍 Great quality, perfect fit. Totally loved it! ♥" },
  { initials: "TD", name: "Tiddhi", date: "18 Mar 2026", rating: 4, text: "So comfortable dress, the colour and texture is really good!" },
];
const PHOTOS = ["#f3e6d8","#e9d6af","#dacdbd","#f0d5d1","#dfe4f2","#dfe9d8"];

const meta: Meta<any> = {
  title: "Organisms/RatingsPanel",
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const WithPhotos = (args: any) => (
  <RatingsPanel averageRating={4.6} totalReviews={41} breakdown={[31,6,2,1,1]} photoColors={PHOTOS} reviews={REVIEWS} />
);
export const WithoutPhotos = (args: any) => (
  <RatingsPanel averageRating={4.6} totalReviews={41} breakdown={[31,6,2,1,1]} reviews={REVIEWS} />
);
