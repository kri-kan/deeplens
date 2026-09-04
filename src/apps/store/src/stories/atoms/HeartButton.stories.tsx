import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { YStack, XStack, Text } from "tamagui";
import { LinearGradient } from "expo-linear-gradient";
import { HeartButton } from "../../components/atoms/HeartButton/HeartButton";
import { THEME_ARG_TYPES, THEME_ARGS } from "../../utils/storyTheme";

const meta: Meta<any> = {
  title: "Atoms/HeartButton",
  component: HeartButton,
  args: { active: false, size: 48, variant: "box", ...THEME_ARGS },
  argTypes: {
    active: { control: "boolean" },
    variant: { control: "select", options: ["box", "plain"] },
    size: { control: { type: "number", min: 28, max: 72, step: 4 } },
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof HeartButton>;

export const Default: Story = { args: { active: false } };
export const Active: Story = { args: { active: true } };

export const Interactive = (args: any) => {
  const [on, setOn] = useState(false);
  return <HeartButton active={on} onPress={() => setOn((v) => !v)} />;
};

export const PlainNoBackgroundInteractive = (args: any) => {
  const [on, setOn] = useState(false);
  return (
    <YStack gap={12} padding={20} maxWidth={320}>
      <Text fontSize={13} color="#666">
        💡 Plain heart toggle on gradient background without any box:
      </Text>
      <View
        style={{
          width: 240,
          height: 180,
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <LinearGradient
          colors={["#ad1457", "#f48fb1"]}
          style={{ width: "100%", height: "100%" }}
        />
        <View style={{ position: "absolute", top: 12, right: 12 }}>
          <HeartButton
            variant="plain"
            size={36}
            active={on}
            onPress={() => setOn((v) => !v)}
          />
        </View>
      </View>
    </YStack>
  );
};

export const Sizes = (args: any) => (
  <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
    <HeartButton size={32} />
    <HeartButton size={48} active />
    <HeartButton size={64} />
  </View>
);
