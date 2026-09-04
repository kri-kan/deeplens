import React, { useState } from "react";
import type { Meta } from "@storybook/react-native";
import { TopNav } from "../../components/organisms/TopNav/TopNav";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const ITEMS = ["Sarees", "Dresses", "Lehengas", "Intimates", "New In", "Sale"];

const meta: Meta<any> = {
  args: {
    ...THEME_ARGS,
  },
  title: "Organisms/TopNav",
  component: TopNav,
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export const Interactive = (args: any) => {
  const [active, setActive] = useState("Sarees");
  return (
    <TopNav
      items={ITEMS}
      activeItem={active}
      onSelect={setActive}
    />
  );
};
