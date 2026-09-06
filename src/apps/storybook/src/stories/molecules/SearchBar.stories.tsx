import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { SearchBar } from "../../components/molecules/SearchBar/SearchBar";

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
const meta: Meta<any> = {
  title: "Molecules/SearchBar",
  component: SearchBar,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, maxWidth: 520, width: "100%" }}>
        <Story />
      </View>
    ),
  ],
  args: {
    ...THEME_ARGS,
    compact: false,
    placeholder: "Search for sarees, dresses, jewellery...",
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    compact: { control: "boolean" },
    placeholder: { control: "text" },
  },
};
export default meta;
type Story = StoryObj<typeof SearchBar>;

export const Full: Story = {
  args: { compact: false },
};

export const Compact: Story = {
  args: { compact: true },
};

export const WithQuery: Story = {
  args: {
    compact: false,
    value: "Banarasi Silk Saree",
  },
};

export const Interactive = (args: any) => {
  const [query, setQuery] = useState("");
  return (
    <View style={{ gap: 12 }}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Type to test interactive search..."
      />
    </View>
  );
};
