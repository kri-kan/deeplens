import React from "react";
import type { Meta } from "@storybook/react-native";
import { FrequentlyBoughtTogether } from "../../components/organisms/FrequentlyBoughtTogether/FrequentlyBoughtTogether";
import { THEME_ARG_TYPES, THEME_ARGS } from "../../utils/storyTheme";

const ITEMS = [
  { id:"1", brand:"VAYYARI", name:"Ivory Flow Saree", price:"₹3,299", originalPrice:"₹4,999", offLabel:"34% OFF", gradient:["#f3e6d8","#d3aa75"] as [string,string] },
  { id:"2", brand:"Trendyol", name:"One Shoulder Top With Skirt", price:"₹2,599", originalPrice:"₹5,199", offLabel:"50% OFF", gradient:["#dfe9d8","#9ec38f"] as [string,string] },
  { id:"3", brand:"AND", name:"Solid Ribbed Tank Top", price:"₹1,290", gradient:["#dfe4f2","#8aa0d7"] as [string,string] },
];

const meta: Meta<any> = {
  title: "Organisms/FrequentlyBoughtTogether",
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const ThreeItems = (args: any) => (
  <FrequentlyBoughtTogether items={ITEMS} totalOriginal="₹16,487" totalPrice="₹7,188" totalOff="42% OFF" />
);
export const TwoItems = (args: any) => (
  <FrequentlyBoughtTogether items={ITEMS.slice(0,2)} totalOriginal="₹10,198" totalPrice="₹5,898" totalOff="42% OFF" />
);
