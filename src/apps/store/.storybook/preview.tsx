import React from "react";
import { View } from "react-native";
import { TamaguiProvider, Theme as TamaguiTheme } from "tamagui";
import { ThemeProvider, useTheme } from "../src/theme";
import { CampaignName, ColorScheme } from "../src/theme/types";
import { THEME_ARG_TYPES, THEME_ARGS } from "../src/utils/storyTheme";
import tamaguiConfig from "../tamagui.config";

const VALID_CAMPAIGNS: CampaignName[] = [
  "luxe",
  "valentine",
  "summer",
  "blackfriday",
  "ramadan",
];

function ThemedStoryContainer({ Story, tamaguiTheme, context }: { Story: any; tamaguiTheme: string; context: any }) {
  const { tokens } = useTheme();

  // Keep browser address bar in sync with currently active story for seamless refreshes & sharing
  React.useEffect(() => {
    if (typeof window !== "undefined" && context?.id) {
      try {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get("id") !== context.id) {
          currentUrl.searchParams.set("id", context.id);
          window.history.replaceState({ storyId: context.id }, "", currentUrl.toString());
          window.localStorage.setItem("lastOpenedStory", context.id);
        }
      } catch {}
    }
  }, [context?.id]);

  return (
    <TamaguiTheme name={tamaguiTheme}>
      <View
        style={{
          flex: 1,
          minHeight: "100%",
          backgroundColor: tokens.background,
          padding: 16,
          overflow: "auto" as any,
        }}
      >
        <Story {...context} />
      </View>
    </TamaguiTheme>
  );
}

export const decorators = [
  (Story: any, context: any) => {
    const rawCampaign = context?.args?.campaign || context?.globals?.campaign;
    const campaign: CampaignName =
      VALID_CAMPAIGNS.includes(rawCampaign)
        ? rawCampaign
        : "luxe";
        
    const rawScheme = context?.args?.colorScheme || context?.globals?.colorScheme || context?.globals?.theme;
    const colorScheme: ColorScheme =
      rawScheme === "dark" ? "dark" : "light";

    const tamaguiTheme = `${campaign}_${colorScheme}`;

    return (
      <TamaguiProvider key={tamaguiTheme} config={tamaguiConfig} defaultTheme={tamaguiTheme}>
        <ThemeProvider
          key={tamaguiTheme}
          initialCampaign={campaign}
          initialColorScheme={colorScheme}
          autoSchedule={false}
        >
          <ThemedStoryContainer Story={Story} tamaguiTheme={tamaguiTheme} context={context} />
        </ThemeProvider>
      </TamaguiProvider>
    );
  },
];

// Global args and argTypes: ensures 100% of stories have theme controls in the Controls panel
export const args = {
  ...THEME_ARGS,
};

export const argTypes = {
  ...THEME_ARG_TYPES,
};

export const parameters = {
  options: {
    storySort: {
      order: [
        "Design System",
        ["Overview", "*"],
        "Atoms",
        "Molecules",
        "Organisms",
        "Templates",
        "Pages",
        "Themes",
        "*",
      ],
    },
  },
  controls: {
    expanded: true,
  },
  backgrounds: {
    default: "warm-parchment",
    values: [
      { name: "warm-parchment", value: "#f5f1ed" },
      { name: "white", value: "#ffffff" },
      { name: "luxe-dark", value: "#090909" },
      { name: "valentine-dark", value: "#0d0609" },
      { name: "summer-dark", value: "#041014" },
      { name: "blackfriday-dark", value: "#000000" },
      { name: "ramadan-dark", value: "#040914" },
    ],
  },
};
