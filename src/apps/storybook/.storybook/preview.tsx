import React from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
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

import { FormFactorShell } from "../src/components/templates/FormFactorShell";

function ThemedStoryContainer({ Story, context }: { Story: any; context: any }) {
  const { tokens, colorScheme, campaign } = useTheme();
  const activeTamaguiTheme = `${campaign}_${colorScheme}`;

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

  // Present stories inside FormFactorShell with Dark Mode & Campaign switching
  const storyTitle = context?.title || "";
  const isOrganismOrAbove =
    storyTitle.startsWith("Organisms") ||
    storyTitle.startsWith("Templates") ||
    storyTitle.startsWith("Pages") ||
    storyTitle.startsWith("Curation") ||
    context?.parameters?.formFactorShell === true;

  const shouldWrapWithShell =
    context?.parameters?.formFactorShell !== false &&
    context?.parameters?.formFactorShell?.disabled !== true;

  let defaultFactor = context?.parameters?.formFactorShell?.defaultFactor;
  if (!defaultFactor) {
    const storyName = (context?.name || context?.story || "").toLowerCase();
    if (storyName.includes("desktop") || storyName.includes("pc")) {
      defaultFactor = "desktop";
    } else if (storyName.includes("tablet") || storyName.includes("ipad")) {
      defaultFactor = "tablet";
    } else if (isOrganismOrAbove) {
      defaultFactor = "mobile";
    } else {
      defaultFactor = "desktop";
    }
  }

  return (
    <TamaguiTheme name={activeTamaguiTheme}>
      {shouldWrapWithShell ? (
        <FormFactorShell
          title={context?.name || context?.story}
          category={storyTitle.split("/")[0]}
          initialFactor={defaultFactor}
        >
          <View
            style={{
              flex: 1,
              width: "100%",
              minHeight: 0,
              display: "flex" as any,
              flexDirection: "column" as any,
              backgroundColor: tokens.background,
            }}
          >
            <Story {...context} />
          </View>
        </FormFactorShell>
      ) : (
        <View
          style={{
            flex: 1,
            minHeight: "100vh" as any,
            backgroundColor: tokens.background,
            padding: 16,
            overflow: "auto" as any,
          }}
        >
          <Story {...context} />
        </View>
      )}
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
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme={tamaguiTheme}>
          <ThemeProvider
            initialCampaign={campaign}
            initialColorScheme={colorScheme}
            autoSchedule={false}
          >
            <ThemedStoryContainer Story={Story} context={context} />
          </ThemeProvider>
        </TamaguiProvider>
      </SafeAreaProvider>
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
