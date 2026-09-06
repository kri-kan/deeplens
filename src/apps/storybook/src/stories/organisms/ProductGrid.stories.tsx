import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ProductGrid } from "../../components/organisms/ProductGrid/ProductGrid";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const PRODUCTS = [
  { id: "1", name: "Ivory Flow Saree", price: 3299, originalPrice: 4999, gradient: ["#f3e6d8","#d3aa75"] as [string,string] },
  { id: "2", name: "Rose Mist Kurta", price: 2107, originalPrice: 3499, gradient: ["#f0d5d1","#bf7b71"] as [string,string] },
  { id: "3", name: "Stone Drape", price: 4599, gradient: ["#dacdbd","#a89a89"] as [string,string] },
  { id: "4", name: "Sand Weave Set", price: 5299, originalPrice: 7999, gradient: ["#e9d6af","#c09a5b"] as [string,string] },
];

const meta: Meta<any> = {
  title: "Organisms/ProductGrid",
  component: ProductGrid,
  args: {
    ...THEME_ARGS, products: PRODUCTS },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof ProductGrid>;

export const Default: Story = {};
export const TwoProducts: Story = { args: { products: PRODUCTS.slice(0, 2) } };
