import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { HorizontalProductStrip } from "../../components/organisms/HorizontalProductStrip/HorizontalProductStrip";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const PRODUCTS = [
  { id:"1", brand:"VAYYARI", name:"Rose Mist Saree", price:2432, originalPrice:4499, offPercent:46, rating:3.5, gradient:["#f0d5d1","#bf7b71"] as [string,string] },
  { id:"2", brand:"Marks & Spencer", name:"Dyed Belted Maxi", price:2107, originalPrice:4214, offPercent:50, rating:4.5, gradient:["#dfe9d8","#9ec38f"] as [string,string] },
  { id:"3", brand:"W", name:"Leafy Wrap Dress", price:1999, originalPrice:3499, offPercent:43, rating:4.0, gradient:["#ece0d4","#c79b69"] as [string,string] },
];

const meta: Meta<any> = {
  title: "Organisms/HorizontalProductStrip",
  component: HorizontalProductStrip,
  args: {
    ...THEME_ARGS, title: "Fastest Selling Similar Products", subtitle: "Don't miss out on these in-demand products", products: PRODUCTS, showAddToBag: true },
  argTypes: {
    ...THEME_ARG_TYPES, showAddToBag: { control: "boolean" } },
};
export default meta;
type Story = StoryObj<typeof HorizontalProductStrip>;

export const WithSubtitle: Story = {};
export const Sponsored: Story = { args: { title: "Sponsored Products", subtitle: undefined, badgeLabel: "AD", showAddToBag: false } };
export const BrowseOnly: Story = { args: { title: "Similar Products", subtitle: undefined, showAddToBag: false } };
