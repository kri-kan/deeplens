import React from "react";
import type { Meta } from "@storybook/react-native";
import { CartDrawer } from "../../components/organisms/CartDrawer/CartDrawer";
import { THEME_ARG_TYPES, THEME_ARGS } from "../../utils/storyTheme";

const ITEMS = [
  { id:"1", name:"Ivory Flow Saree", color:"Ivory", size:"M", price:"₹3,299", gradient:["#f3e6d8","#d3aa75"] as [string,string] },
  { id:"2", name:"Rose Mist Kurta", color:"Rose", size:"S", price:"₹2,107", gradient:["#f0d5d1","#bf7b71"] as [string,string] },
];

const meta: Meta<any> = {
  title: "Organisms/CartDrawer",
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const WithItems = (args: any) => <CartDrawer items={ITEMS} />;
export const OneItem = (args: any) => <CartDrawer items={[ITEMS[0]]} />;
export const Empty = (args: any) => <CartDrawer items={[]} />;
