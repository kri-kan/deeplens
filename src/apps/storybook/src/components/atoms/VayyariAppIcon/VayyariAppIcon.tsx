import React, { useId } from "react";
import { Platform } from "react-native";
import { YStack, XStack, Text } from "tamagui";
import Svg, {
  Defs,
  ClipPath,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
  Rect,
  Path,
} from "react-native-svg";
import { VAYYARI_LOGO_PATH } from "../VayyariLogo/VayyariLogo";

export type IconShape = "circle" | "squircle" | "rounded" | "teardrop" | "square";
export type LauncherTheme = "light" | "dark" | "none";
export type EmblemTone = "gold" | "radiant-gold" | "champagne" | "bronze-gold" | "monochrome-white";

export interface IconPreset {
  id: string;
  name: string;
  category: "current" | "dark-luxury" | "royal-jewel" | "editorial-light" | "metallic-sheen";
  background: string;
  hexForAppJson: string;
  recommendedEmblemTone: EmblemTone;
  hasRim: boolean;
  rimColor: string;
  description: string;
  lightModeFit: string;
  darkModeFit: string;
}

export const VAYYARI_APP_ICON_PRESETS: IconPreset[] = [
  {
    id: "obsidian-current",
    name: "Current Baseline (Obsidian Black)",
    category: "current",
    background: "#0C0E14",
    hexForAppJson: "#0C0E14",
    recommendedEmblemTone: "gold",
    hasRim: false,
    rimColor: "rgba(255, 255, 255, 0.08)",
    description: "The currently deployed icon in app.json. Solid pitch-black circle with gold knot emblem.",
    lightModeFit: "Stark contrast against light wallpapers (current user setup)",
    darkModeFit: "Blends seamlessly into dark AMOLED wallpapers",
  },
  {
    id: "gold-rimmed-obsidian",
    name: "Gold-Rimmed Obsidian Medallion",
    category: "metallic-sheen",
    background: "#0C0E14",
    hexForAppJson: "#0C0E14",
    recommendedEmblemTone: "gold",
    hasRim: true,
    rimColor: "rgba(221, 169, 26, 0.55)",
    description: "Preserves the iconic black background while framing it with a crisp 1.5px 24K gold metallic ring.",
    lightModeFit: "The gold rim prevents the black circle from looking like a flat black hole",
    darkModeFit: "Distinct rim boundary separates icon clearly from dark backgrounds",
  },
  {
    id: "signature-navy",
    name: "Signature DeepLens Navy",
    category: "royal-jewel",
    background: "radial-gradient(circle at 50% 30%, #204576 0%, #1A365D 55%, #0F213D 100%)",
    hexForAppJson: "#1A365D",
    recommendedEmblemTone: "radiant-gold",
    hasRim: true,
    rimColor: "rgba(212, 175, 55, 0.35)",
    description: "Aligns with DeepLens core brand blue & splash screen (#1A365D). Softer and more regal than pitch black.",
    lightModeFit: "High luxury presence with royal jewel-tone warmth on light launcher",
    darkModeFit: "Distinguishable deep sapphire glow against pure dark wallpapers",
  },
  {
    id: "crimson-silk",
    name: "Imperial Silk Crimson",
    category: "royal-jewel",
    background: "radial-gradient(circle at 50% 32%, #4E0E20 0%, #2A0812 60%, #160309 100%)",
    hexForAppJson: "#2A0812",
    recommendedEmblemTone: "radiant-gold",
    hasRim: true,
    rimColor: "rgba(221, 169, 26, 0.4)",
    description: "Evokes authentic Indian bridal saree & handloom zari silk. Warm burgundy-wine backdrop.",
    lightModeFit: "Captivating warm luxury statement without harsh blackness",
    darkModeFit: "Subtle jewel ember resonance on dark displays",
  },
  {
    id: "temple-emerald",
    name: "Heritage Temple Emerald",
    category: "royal-jewel",
    background: "radial-gradient(circle at 50% 32%, #0E482E 0%, #062618 60%, #02140C 100%)",
    hexForAppJson: "#062618",
    recommendedEmblemTone: "radiant-gold",
    hasRim: true,
    rimColor: "rgba(221, 169, 26, 0.38)",
    description: "Traditional Kanjeevaram pattu emerald silk. Deep ceremonial green with radiant golden crest.",
    lightModeFit: "Rich heritage aura that stands out distinctively from standard tech icons",
    darkModeFit: "Deep forest velvet contrast",
  },
  {
    id: "charcoal-vignette",
    name: "Charcoal Luminous Vignette",
    category: "dark-luxury",
    background: "radial-gradient(circle at 50% 28%, #2A303F 0%, #171B24 55%, #0B0E14 100%)",
    hexForAppJson: "#171B24",
    recommendedEmblemTone: "gold",
    hasRim: true,
    rimColor: "rgba(255, 255, 255, 0.12)",
    description: "Refined multi-stop studio lighting gradient. Gives spherical dimension rather than flat solid color.",
    lightModeFit: "Top highlight provides organic lift and separation from light wallpapers",
    darkModeFit: "Center illumination ensures the gold emblem pops brilliantly",
  },
  {
    id: "midnight-plum",
    name: "Midnight Twilight Plum",
    category: "royal-jewel",
    background: "radial-gradient(circle at 50% 32%, #341D4E 0%, #1B0F2A 60%, #0B0512 100%)",
    hexForAppJson: "#1B0F2A",
    recommendedEmblemTone: "radiant-gold",
    hasRim: true,
    rimColor: "rgba(221, 169, 26, 0.35)",
    description: "Haute couture evening gown velvet. Mystical plum-violet undertones.",
    lightModeFit: "Sophisticated luxury fashion accent on light screens",
    darkModeFit: "Velvety jewel presence in dark launcher setups",
  },
  {
    id: "editorial-ivory",
    name: "Editorial Warm Ivory (Light Icon)",
    category: "editorial-light",
    background: "linear-gradient(145deg, #FFFFFF 0%, #FAF7F2 45%, #EFE8DA 100%)",
    hexForAppJson: "#FAF7F2",
    recommendedEmblemTone: "bronze-gold",
    hasRim: true,
    rimColor: "rgba(180, 130, 30, 0.32)",
    description: "Natural light-mode companion: handmade cotton-silk paper texture with antique gold/bronze crest.",
    lightModeFit: "Seamless harmony with light OS themes; feels native, airy, and ultra-high-end",
    darkModeFit: "Punchy, high-contrast medallion on dark wallpapers",
  },
  {
    id: "champagne-bronze",
    name: "Artisan Champagne Bronze",
    category: "metallic-sheen",
    background: "radial-gradient(circle at 50% 30%, #352B1E 0%, #1E170F 60%, #100C07 100%)",
    hexForAppJson: "#1E170F",
    recommendedEmblemTone: "gold",
    hasRim: true,
    rimColor: "rgba(221, 169, 26, 0.45)",
    description: "Rich antique brass and handloom bronze-cast shade, mirroring handcrafted Indian jewelry.",
    lightModeFit: "Warm organic metal tones that bridge light and dark launcher environments",
    darkModeFit: "Deep glowing bronze luster",
  },
  {
    id: "amoled-pure-black",
    name: "AMOLED Pitch Black with Aura",
    category: "current",
    background: "#000000",
    hexForAppJson: "#000000",
    recommendedEmblemTone: "radiant-gold",
    hasRim: true,
    rimColor: "rgba(212, 175, 55, 0.25)",
    description: "True 0% luminance OLED black with luminous golden bloom aura.",
    lightModeFit: "Maximum graphic punch",
    darkModeFit: "Zero battery drain on OLED with illuminated floating crest",
  },
];

export interface VayyariAppIconProps {
  /** Size in pixels (default: 72, launcher standard) */
  size?: number;
  /** Android adaptive mask shape */
  shape?: IconShape;
  /** Background preset ID, CSS color hex, or CSS gradient */
  background?: string;
  /** Ratio of emblem diameter to icon size (default: 0.64 for 66% Android safe zone) */
  emblemScale?: number;
  /** Emblem color gradient tone */
  emblemTone?: EmblemTone;
  /** Whether to render a metallic / refined perimeter rim */
  hasRim?: boolean;
  /** Custom rim color */
  rimColor?: string;
  /** Emblem glow intensity */
  emblemGlow?: "none" | "subtle" | "radiant" | "bloom";
  /** Whether to display the app title below the icon */
  showLabel?: boolean;
  /** Label text (default: 'Vayyari') */
  labelText?: string;
  /** Launcher theme for label contrast & shadow */
  launcherTheme?: LauncherTheme;
  /** Realistic launcher drop-shadow */
  elevation?: boolean;
  /** Optional click handler */
  onPress?: () => void;
  /** Custom container style */
  style?: any;
  /** Test identifier */
  testID?: string;
}

export function resolveIconBackground(bgOrId?: string): {
  background: string;
  hexForAppJson: string;
  preset?: IconPreset;
} {
  if (!bgOrId) {
    const defaultPreset = VAYYARI_APP_ICON_PRESETS[0];
    return {
      background: defaultPreset.background,
      hexForAppJson: defaultPreset.hexForAppJson,
      preset: defaultPreset,
    };
  }

  const found = VAYYARI_APP_ICON_PRESETS.find((p) => p.id === bgOrId);
  if (found) {
    return {
      background: found.background,
      hexForAppJson: found.hexForAppJson,
      preset: found,
    };
  }

  // Raw CSS color or gradient
  const hex = bgOrId.startsWith("#") ? bgOrId.slice(0, 7) : "#0C0E14";
  return {
    background: bgOrId,
    hexForAppJson: hex,
  };
}

export function getShapeBorderRadius(shape: IconShape, size: number): any {
  switch (shape) {
    case "circle":
      return Math.round(size / 2);
    case "squircle":
      return Math.round(size * 0.28);
    case "rounded":
      return Math.round(size * 0.2);
    case "teardrop":
      return {
        borderTopLeftRadius: Math.round(size / 2),
        borderTopRightRadius: Math.round(size / 2),
        borderBottomRightRadius: Math.round(size / 2),
        borderBottomLeftRadius: Math.round(size * 0.16),
      };
    case "square":
      return 0;
    default:
      return Math.round(size / 2);
  }
}

/**
 * Android App Launcher Icon Component with customizable backgrounds, shapes, and launcher environments.
 */
export const VayyariAppIcon: React.FC<VayyariAppIconProps> = ({
  size = 72,
  shape = "circle",
  background = "obsidian-current",
  emblemScale = 0.64,
  emblemTone,
  hasRim,
  rimColor,
  emblemGlow = "subtle",
  showLabel = false,
  labelText = "Vayyari",
  launcherTheme = "light",
  elevation = true,
  onPress,
  style,
  testID = "vayyari-app-icon",
}) => {
  const resolved = resolveIconBackground(background);
  const activePreset = resolved.preset;

  const effectiveEmblemTone =
    emblemTone ?? activePreset?.recommendedEmblemTone ?? "gold";
  const effectiveHasRim = hasRim ?? activePreset?.hasRim ?? false;
  const effectiveRimColor =
    rimColor ?? activePreset?.rimColor ?? "rgba(221, 169, 26, 0.4)";

  const rawId = useId();
  const uid = `vai_${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const clipId = `${uid}_clip`;
  const paintId = `${uid}_paint`;

  const emblemSize = Math.round(size * emblemScale);
  const emblemWidth = emblemSize;
  const emblemHeight = Math.round(emblemSize * (104 / 103));

  // Determine emblem gradient color stops based on tone
  const getGradientStops = () => {
    switch (effectiveEmblemTone) {
      case "radiant-gold":
        return [
          { offset: "0.20", color: "#FFE27B" },
          { offset: "0.60", color: "#E5A91A" },
          { offset: "0.90", color: "#9E680E" },
        ];
      case "bronze-gold":
        return [
          { offset: "0.20", color: "#A87A18" },
          { offset: "0.65", color: "#6A4505" },
          { offset: "0.90", color: "#422B03" },
        ];
      case "champagne":
        return [
          { offset: "0.20", color: "#FDF5DF" },
          { offset: "0.65", color: "#D4AF67" },
          { offset: "0.90", color: "#9F7B36" },
        ];
      case "monochrome-white":
        return [
          { offset: "0.00", color: "#FFFFFF" },
          { offset: "1.00", color: "#F0F0F0" },
        ];
      case "gold":
      default:
        return [
          { offset: "0.301", color: "#DDA91A" },
          { offset: "0.699", color: "#805309", opacity: "0.86" },
          { offset: "0.875", color: "#B18012" },
        ];
    }
  };

  const stops = getGradientStops();

  // Glow filters
  const glowFilters: Record<string, string | undefined> = {
    none: undefined,
    subtle:
      "drop-shadow(0 1px 3px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 4px rgba(221, 169, 26, 0.45))",
    radiant:
      "drop-shadow(0 2px 6px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 10px rgba(221, 169, 26, 0.75))",
    bloom:
      "drop-shadow(0 0 6px rgba(255, 235, 170, 0.9)) drop-shadow(0 0 16px rgba(221, 169, 26, 0.8)) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.85))",
  };
  const filter = glowFilters[emblemGlow];

  const shapeRadius = getShapeBorderRadius(shape, size);
  const radiusStyles =
    typeof shapeRadius === "number"
      ? { borderRadius: shapeRadius }
      : shapeRadius;

  // Elevation shadow
  const shadowStyle = elevation
    ? {
        boxShadow:
          launcherTheme === "light"
            ? "0 4px 12px rgba(0, 0, 0, 0.18), 0 1px 4px rgba(0, 0, 0, 0.12)"
            : "0 6px 16px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.35)",
      }
    : {};

  // Label style
  const labelColor = launcherTheme === "light" ? "#1f2937" : "#f3f4f6";
  const labelShadow =
    launcherTheme === "light"
      ? "0 1px 2px rgba(255, 255, 255, 0.7)"
      : "0 1px 3px rgba(0, 0, 0, 0.85)";

  return (
    <YStack
      alignItems="center"
      gap={6}
      cursor={onPress ? "pointer" : "default"}
      onPress={onPress}
      testID={testID}
      style={style}
    >
      {/* App Icon Container */}
      <div
        style={{
          width: size,
          height: size,
          ...radiusStyles,
          background: resolved.background,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          border: effectiveHasRim ? `1.5px solid ${effectiveRimColor}` : "none",
          boxSizing: "border-box",
          flexShrink: 0,
          transition: "transform 0.18s cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 0.18s ease",
          ...shadowStyle,
        }}
      >
        {/* Subtle Top Specular Glass Reflection */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "48%",
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.0) 100%)",
            pointerEvents: "none",
            ...radiusStyles,
          }}
        />

        {/* Vector Gold Crest */}
        <div
          style={{
            width: emblemWidth,
            height: emblemHeight,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 2,
            lineHeight: 0,
            ...(filter ? { filter } : {}),
          }}
        >
          <svg
            width={emblemWidth}
            height={emblemHeight}
            viewBox="0 0 103 104"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            <g clipPath={`url(#${clipId})`}>
              <g transform="matrix(0.0759543 -0.0142977 0.0141602 0.0775904 47.5152 37.4954)">
                <rect x="0" y="0" width="808.392" height="973.602" fill={`url(#${paintId})`} />
                <rect
                  x="0"
                  y="0"
                  width="808.392"
                  height="973.602"
                  transform="scale(1 -1)"
                  fill={`url(#${paintId})`}
                />
                <rect
                  x="0"
                  y="0"
                  width="808.392"
                  height="973.602"
                  transform="scale(-1 1)"
                  fill={`url(#${paintId})`}
                />
                <rect
                  x="0"
                  y="0"
                  width="808.392"
                  height="973.602"
                  transform="scale(-1)"
                  fill={`url(#${paintId})`}
                />
              </g>
            </g>
            <defs>
              <clipPath id={clipId}>
                <path d={VAYYARI_LOGO_PATH} fillRule="evenodd" clipRule="evenodd" />
              </clipPath>
              <linearGradient
                id={paintId}
                x1="0"
                y1="0"
                x2="500"
                y2="500"
                gradientUnits="userSpaceOnUse"
              >
                {stops.map((s, idx) => (
                  <stop
                    key={idx}
                    offset={s.offset}
                    stopColor={s.color}
                    stopOpacity={(s as any).opacity ?? 1}
                  />
                ))}
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Android System App Label */}
      {showLabel && (
        <Text
          fontSize={Math.max(11, Math.round(size * 0.17))}
          fontWeight="500"
          color={labelColor}
          numberOfLines={1}
          textAlign="center"
          style={{
            textShadow: labelShadow,
            fontFamily: "Roboto, system-ui, -apple-system, sans-serif",
            maxWidth: size + 24,
            marginTop: 2,
            letterSpacing: 0.1,
          }}
        >
          {labelText}
        </Text>
      )}
    </YStack>
  );
};
