import React, { useState } from "react";
import type { Meta } from "@storybook/react-native";
import { SizeSelector } from "../../components/organisms/SizeSelector/SizeSelector";
import { THEME_ARG_TYPES, THEME_ARGS } from "../../utils/storyTheme";

const meta: Meta<any> = {
  title: "Organisms/SizeSelector",
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const Interactive = (args: any) => {
  const [sel, setSel] = useState("M");
  return <SizeSelector sizes={["XS","S","M","L","XL"]} selected={sel} disabled={["XS"]} onSelect={setSel} />;
};

export const OneSize = (args: any) => <SizeSelector sizes={["One Size"]} selected="One Size" />;
