import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ScrollView, View } from "react-native";
import { HorizontalProductCard } from "../../components/molecules/HorizontalProductCard/HorizontalProductCard";
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: "Molecules/HorizontalProductCard",
  component: HorizontalProductCard,
  args: {
    brand: "VAYYARI", name: "Rose Mist Saree", price: 2432, originalPrice: 4499, offPercent: 46,
    rating: 4.2, gradient: ["#f0d5d1", "#bf7b71"] as [string, string], showAddToBag: false,
    ...THEME_ARGS,
  },
  argTypes: { showAddToBag: { control: "boolean" } },
};
export default meta;
type Story = StoryObj<typeof HorizontalProductCard>;

export const Default: Story = {};
export const WithAddToBag: Story = { args: { showAddToBag: true } };
export const NoRating: Story = { args: { rating: undefined } };
export const HorizontalStrip = (args: any) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    <View style={{ flexDirection: "row", gap: 12 }}>
      {[
        { brand: "VAYYARI", name: "Rose Mist Saree", price: 2432, originalPrice: 4499, offPercent: 46, rating: 3.5, gradient: ["#f0d5d1","#bf7b71"] as [string,string] },
        { brand: "Marks & Spencer", name: "Dyed Belted Maxi Dress", price: 2107, originalPrice: 4214, offPercent: 50, rating: 4.5, gradient: ["#dfe9d8","#9ec38f"] as [string,string] },
        { brand: "W", name: "Leafy Wrap Dress", price: 1999, originalPrice: 3499, offPercent: 43, rating: 4.0, gradient: ["#ece0d4","#c79b69"] as [string,string] },
      ].map((p) => <HorizontalProductCard key={p.name} {...p} showAddToBag />)}
    </View>
  </ScrollView>
);
