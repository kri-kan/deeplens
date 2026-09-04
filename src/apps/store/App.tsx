import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Header } from "./src/components/Header";
import { ProductCard } from "./src/components/ProductCard";
import { CatalogPage } from "./src/components/CatalogPage";
import { ProductDetailPage } from "./src/components/ProductDetailPage";
import StorybookUIRoot from "./.storybook";
import { colors, radius, spacing } from "./src/theme/designTokens";
import { TamaguiProvider } from "tamagui";
import { ThemeProvider } from "./src/theme";
import tamaguiConfig from "./tamagui.config";

const heroSlides = [
  {
    eyebrow: "New season edit",
    title: "Festive handloom",
    colors: ["#d7b08b", "#b77d52"],
  },
  {
    eyebrow: "Soft pastels",
    title: "Soft pastels",
    colors: ["#f5d6d5", "#cc8d9a"],
  },
  {
    eyebrow: "Flowing layers",
    title: "Flowing silhouettes",
    colors: ["#dfe4f2", "#8aa0d7"],
  },
];

const collectionCards = [
  { label: "Sarees", tone: "#f4d8c7" },
  { label: "Dresses", tone: "#f5d6d5" },
  { label: "Jewellery", tone: "#efe1ce" },
  { label: "Home", tone: "#dfe9d8" },
];

const mockProducts = [
  {
    name: "Ivory Elegance",
    price: 3299,
    originalPrice: 4999,
    gradient: ["#edd9c5", "#d2a77a"],
  },
  {
    name: "Rose Bloom",
    price: 2799,
    originalPrice: 4199,
    gradient: ["#f3d6d8", "#cc8d9a"],
  },
  {
    name: "Blue Grace",
    price: 3099,
    originalPrice: 4699,
    gradient: ["#dfe4f2", "#8aa0d7"],
  },
  {
    name: "Leaf Weave",
    price: 2499,
    originalPrice: 3699,
    gradient: ["#dfe9d8", "#9ec38f"],
  },
];

const footerBlocks = [
  {
    title: "Customer care",
    items: ["Contact us", "Track order", "Returns", "FAQ"],
  },
  {
    title: "About us",
    items: ["Our story", "Careers", "Sustainability", "Press"],
  },
  { title: "Policies", items: ["Shipping", "Terms", "Privacy", "Gift cards"] },
  {
    title: "Follow us",
    items: ["Instagram", "Pinterest", "YouTube", "Facebook"],
  },
];

type Screen = "home" | "catalog" | "pdp" | "wireframes" | "storybook";

function WireframesScreen({
  onNavigate,
}: {
  onNavigate: (screen: Screen) => void;
}) {
  const presets = [
    { label: "Mobile", width: 390, height: 820 },
    { label: "Tablet", width: 768, height: 1024 },
    { label: "Desktop", width: 1180, height: 920 },
    { label: "Extra large", width: 1500, height: 980 },
  ];

  return (
    <View style={styles.wireframeRoot}>
      <View style={styles.wireframeHeader}>
        <Text style={styles.wireframeTitle}>Wireframe review</Text>
        <View style={styles.wireframeTabs}>
          <Pressable
            style={styles.wireframeTab}
            onPress={() => onNavigate("home")}
          >
            <Text style={styles.wireframeTabText}>Home</Text>
          </Pressable>
          <Pressable
            style={styles.wireframeTab}
            onPress={() => onNavigate("catalog")}
          >
            <Text style={styles.wireframeTabText}>Catalog</Text>
          </Pressable>
          <Pressable
            style={styles.wireframeTab}
            onPress={() => onNavigate("pdp")}
          >
            <Text style={styles.wireframeTabText}>PDP</Text>
          </Pressable>
          <Pressable
            style={[styles.wireframeTab, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}
            onPress={() => onNavigate("storybook")}
          >
            <Text style={[styles.wireframeTabText, { color: colors.accent }]}>📚 Storybook</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.wireframeGrid}>
        {presets.map((preset) => (
          <View key={preset.label} style={styles.deviceCard}>
            <Text style={styles.deviceLabel}>{preset.label}</Text>
            <Pressable
              style={[
                styles.mockDevice,
                { width: preset.width, height: preset.height },
              ]}
              onPress={() => onNavigate("home")}
            >
              <View style={styles.mockTopBar}>
                <View style={styles.mockBrand} />
                <View style={styles.mockNavRow}>
                  {["Men", "Women", "Kids", "Home"].map((nav) => (
                    <View key={nav} style={styles.mockNavItem} />
                  ))}
                </View>
                <View style={styles.mockSearch} />
              </View>

              <View style={styles.mockHero} />

              <View style={styles.mockSectionHead}>
                <View style={styles.mockLineTall} />
                <View style={styles.mockLineShort} />
              </View>

              <View style={styles.mockTilesRow}>
                <View style={styles.mockTileWide} />
                <View style={styles.mockTileStack}>
                  <View style={styles.mockTileMini} />
                  <View style={styles.mockTileMini} />
                </View>
              </View>

              <View style={styles.mockProductGrid}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <View key={`tile-${index}`} style={styles.mockProductCard} />
                ))}
              </View>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.wireframeFooter}>
        <Text style={styles.wireframeFooterTitle}>Quick navigation</Text>
        <View style={styles.quickLinks}>
          <Pressable
            style={styles.quickLink}
            onPress={() => onNavigate("home")}
          >
            <Text style={styles.quickLinkText}>↳ View Home page</Text>
          </Pressable>
          <Pressable
            style={styles.quickLink}
            onPress={() => onNavigate("catalog")}
          >
            <Text style={styles.quickLinkText}>↳ View Catalog</Text>
          </Pressable>
          <Pressable style={styles.quickLink} onPress={() => onNavigate("pdp")}>
            <Text style={styles.quickLinkText}>↳ View Product detail</Text>
          </Pressable>
          <Pressable style={[styles.quickLink, { borderColor: colors.accent }]} onPress={() => onNavigate("storybook")}>
            <Text style={[styles.quickLinkText, { color: colors.accent, fontWeight: "700" }]}>↳ 📚 Open Storybook Component Library</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("wireframes");
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isDesktop = width >= 1200 && width < 1440;
  const isXL = width >= 1440;
  const isHome = screen === "home";
  const isCatalog = screen === "catalog";
  const isPdp = screen === "pdp";
  const isWireframes = screen === "wireframes";
  const isStorybook = screen === "storybook";

  const currentView = isCatalog ? (
    <CatalogPage onOpenProduct={() => setScreen("pdp")} />
  ) : isPdp ? (
    <ProductDetailPage />
  ) : isStorybook ? (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.screenTabs}>
        <Pressable style={styles.tab} onPress={() => setScreen("wireframes")}>
          <Text style={styles.tabText}>← Wireframes</Text>
        </Pressable>
        <Pressable style={styles.tab} onPress={() => setScreen("home")}>
          <Text style={styles.tabText}>Home</Text>
        </Pressable>
        <Pressable style={styles.tab} onPress={() => setScreen("catalog")}>
          <Text style={styles.tabText}>Catalog</Text>
        </Pressable>
        <Pressable style={styles.tab} onPress={() => setScreen("pdp")}>
          <Text style={styles.tabText}>PDP</Text>
        </Pressable>
        <Pressable style={[styles.tab, styles.tabActive]} onPress={() => setScreen("storybook")}>
          <Text style={[styles.tabText, styles.tabTextActive]}>📚 Storybook</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>
        <StorybookUIRoot />
      </View>
    </View>
  ) : isWireframes ? (
    <WireframesScreen onNavigate={setScreen} />
  ) : (
    <View style={styles.root}>
      <View style={styles.app}>
        <StatusBar barStyle="dark-content" />
        <Header />

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            {heroSlides.map((slide, index) => (
              <LinearGradient
                key={slide.title}
                colors={slide.colors as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.heroSlide,
                  index === 0 && styles.heroSlideActive,
                ]}
              >
                <Text style={styles.heroEyebrow}>{slide.eyebrow}</Text>
                <Text style={styles.heroTitle}>{slide.title}</Text>
                <View style={styles.heroActions}>
                  <Text style={styles.actionButtonPrimary}>Shop now</Text>
                  <Text style={styles.actionButtonSecondary}>Explore more</Text>
                </View>
              </LinearGradient>
            ))}

            <View style={styles.heroDots}>
              {heroSlides.map((slide, index) => (
                <View
                  key={`${slide.title}-dot`}
                  style={[styles.heroDot, index === 0 && styles.heroDotActive]}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Fresh picks</Text>
              <Pressable onPress={() => setScreen("catalog")}>
                <Text style={styles.link}>View all</Text>
              </Pressable>
            </View>

            <View style={[styles.bento, isMobile && styles.bentoMobile]}>
              <LinearGradient
                colors={["#7d6f6a", "#4d3a39"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.tile,
                  styles.tileLargeDark,
                  isMobile && styles.tileLargeDarkMobile,
                ]}
              >
                <Text style={styles.tileTextDark}>The edit</Text>
              </LinearGradient>

              <View
                style={[styles.bentoStack, isMobile && styles.bentoStackMobile]}
              >
                <LinearGradient
                  colors={["#f2d8c7", "#d7a782"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.tile,
                    styles.tileSmall,
                    isMobile && styles.tileSmallMobile,
                  ]}
                >
                  <Text style={styles.tileText}>Pastels</Text>
                </LinearGradient>

                <View
                  style={[
                    styles.bentoBottomRow,
                    isMobile && styles.bentoBottomRowMobile,
                  ]}
                >
                  <LinearGradient
                    colors={["#ebdbca", "#c89b6d"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.tile,
                      styles.tileMini,
                      isMobile && styles.tileMiniMobile,
                    ]}
                  >
                    <Text style={styles.tileText}>Luxe</Text>
                  </LinearGradient>

                  <LinearGradient
                    colors={["#f5d6d5", "#d5a4a1"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.tile,
                      styles.tileMini,
                      isMobile && styles.tileMiniMobile,
                    ]}
                  >
                    <Text style={styles.tileText}>Occasion</Text>
                  </LinearGradient>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Trending now</Text>
              <Pressable onPress={() => setScreen("catalog")}>
                <Text style={styles.link}>View all</Text>
              </Pressable>
            </View>

            <View style={styles.cards}>
              {collectionCards.map((item) => (
                <View key={item.label} style={styles.cardBox}>
                  <View
                    style={[styles.cardArt, { backgroundColor: item.tone }]}
                  />
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{item.label}</Text>
                    <Text style={styles.cardMeta}>
                      Curated for day-to-night wear
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Popular picks</Text>
              <Pressable onPress={() => setScreen("catalog")}>
                <Text style={styles.link}>View all</Text>
              </Pressable>
            </View>

            <View style={styles.grid}>
              {mockProducts.map((product) => (
                <ProductCard
                  key={product.name}
                  name={product.name}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  gradient={product.gradient as [string, string]}
                  onPress={() => setScreen("pdp")}
                />
              ))}
            </View>
          </View>

          <View style={[styles.storyGrid, isMobile && styles.storyGridMobile]}>
            <View
              style={[styles.storyPanel, isMobile && styles.storyPanelMobile]}
            >
              <Text style={styles.storyText}>New season spirits</Text>
            </View>
            <View style={[styles.storyBox, isMobile && styles.storyBoxMobile]}>
              <Text style={styles.storyTitle}>
                Crafted for your everyday rituals
              </Text>
              <Text style={styles.storyTextSmall}>
                Thoughtful silhouettes, seasonal textures, and expressive
                details designed to move with your life.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            {footerBlocks.map((block) => (
              <View key={block.title} style={styles.footBlock}>
                <Text style={styles.footTitle}>{block.title}</Text>
                {block.items.map((item) => (
                  <Text key={item} style={styles.footItem}>
                    {item}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <ThemeProvider>
        {currentView}
      </ThemeProvider>
    </TamaguiProvider>
  );
}

const styles = StyleSheet.create({
  wireframeRoot: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: 32,
  },
  wireframeHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  wireframeTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.8,
    marginBottom: 12,
  },
  wireframeTabs: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  wireframeTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  wireframeTabText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: colors.ink,
    textTransform: "uppercase",
  },
  wireframeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 20,
  },
  deviceCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  deviceLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 10,
  },
  mockDevice: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  mockTopBar: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.white,
  },
  mockBrand: {
    width: 90,
    height: 16,
    backgroundColor: colors.ink,
    borderRadius: 999,
    marginBottom: 10,
  },
  mockNavRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  mockNavItem: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.soft,
  },
  mockSearch: {
    height: 28,
    backgroundColor: colors.soft,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  mockHero: {
    height: 150,
    backgroundColor: "#d8b08a",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  mockSectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  mockLineTall: {
    width: "38%",
    height: 18,
    backgroundColor: colors.ink,
    borderRadius: 999,
  },
  mockLineShort: {
    width: "18%",
    height: 12,
    backgroundColor: colors.soft,
    borderRadius: 999,
  },
  mockTilesRow: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  mockTileWide: {
    flex: 1.3,
    height: 120,
    backgroundColor: "#f2d7c6",
    borderWidth: 1,
    borderColor: colors.line,
  },
  mockTileStack: {
    flex: 0.7,
    gap: 10,
  },
  mockTileMini: {
    flex: 1,
    backgroundColor: "#f1e5db",
    borderWidth: 1,
    borderColor: colors.line,
  },
  mockProductGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 12,
  },
  mockProductCard: {
    width: "23%",
    height: 150,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenTabs: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: radius.full,
  },
  tabActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: colors.ink,
    textTransform: "uppercase",
  },
  tabTextActive: {
    color: colors.white,
  },
  app: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    position: "relative",
    minHeight: 500,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    overflow: "hidden",
    backgroundColor: "#d7b08b",
  },
  heroSlide: {
    position: "absolute",
    inset: 0,
    justifyContent: "flex-end",
    paddingHorizontal: 36,
    paddingVertical: 32,
    opacity: 0,
  },
  heroSlideActive: {
    opacity: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    color: colors.white,
    opacity: 0.9,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  heroTitle: {
    marginTop: spacing.sm,
    fontSize: 52,
    lineHeight: 52,
    fontWeight: "800",
    letterSpacing: -2,
    color: colors.white,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  heroActions: {
    flexDirection: "row",
    marginTop: spacing.lg,
    gap: 12,
  },
  actionButtonPrimary: {
    backgroundColor: colors.white,
    color: colors.ink,
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  actionButtonSecondary: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    color: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  heroDots: {
    position: "absolute",
    left: 36,
    bottom: 18,
    flexDirection: "row",
    gap: 8,
    zIndex: 2,
  },
  heroDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  heroDotActive: {
    backgroundColor: colors.white,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.ink,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  link: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  bento: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  bentoMobile: {
    flexDirection: "column",
  },
  bentoStack: {
    flex: 1,
    gap: 10,
  },
  bentoStackMobile: {
    width: "100%",
  },
  bentoBottomRow: {
    flexDirection: "row",
    gap: 10,
  },
  bentoBottomRowMobile: {
    flexDirection: "column",
  },
  tile: {
    minHeight: 180,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: "flex-end",
    padding: 16,
  },
  tileLargeDark: {
    width: "48.5%",
    minHeight: 368,
    borderRadius: 0,
  },
  tileLargeDarkMobile: {
    width: "100%",
    minHeight: 260,
  },
  tileSmall: {
    minHeight: 180,
    width: "100%",
  },
  tileSmallMobile: {
    minHeight: 160,
  },
  tileMini: {
    flex: 1,
    minHeight: 180,
  },
  tileMiniMobile: {
    minHeight: 150,
  },
  tileText: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.ink,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  tileTextDark: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.white,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  cards: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 10,
  },
  cardBox: {
    flexBasis: "23%",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 150,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 0,
    overflow: "hidden",
  },
  cardArt: {
    height: 210,
  },
  cardCopy: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.muted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 14,
  },
  storyGrid: {
    paddingHorizontal: 16,
    paddingTop: 22,
    flexDirection: "row",
    gap: 14,
  },
  storyGridMobile: {
    flexDirection: "column",
    paddingHorizontal: 16,
  },
  storyPanel: {
    flex: 1.2,
    minHeight: 200,
    justifyContent: "flex-end",
    padding: 22,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#f2e1d0",
  },
  storyPanelMobile: {
    minHeight: 180,
  },
  storyText: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.ink,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  storyBox: {
    flex: 0.8,
    minHeight: 200,
    padding: 18,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  storyBoxMobile: {
    minHeight: 180,
  },
  storyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 10,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  storyTextSmall: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  footer: {
    marginTop: 18,
    backgroundColor: "#f6f0ea",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  footBlock: {
    width: "23%",
    minWidth: 150,
  },
  footTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 8,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  footItem: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 6,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  wireframeFooter: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  wireframeFooterTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 12,
  },
  quickLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickLink: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  quickLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
    letterSpacing: 0.2,
  },
});
