import React, { useEffect } from "react";
import { Platform } from "react-native";
import { view } from "./storybook.requires";

const DEFAULT_STORY_ID = "design-system-overview--all-components";

/**
 * Legacy prefix mappings when CSF story titles get reorganized.
 */
const LEGACY_PREFIX_MAPPINGS: [string, string][] = [
  // AdminOrderDetailPage renamed title Pages/AdminOrderDetail -> Pages/Admin/OrderDetail
  ["pages-adminorderdetail--", "pages-admin-orderdetail--"],
  // AdminOrderFormPage renamed title Pages/AdminOrderForm -> Pages/Admin/OrderForm
  ["pages-adminorderform--", "pages-admin-orderform--"],
  // OrderIdGeneratorPage
  ["pages-admin-orderidgenerator--", "pages-orderidgenerator--"],
  // OrderLedgerPage
  ["pages-orderledger--", "pages-admin-orderledger--"],
  // Storefront pages
  ["pages-cartpage--", "pages-store-cart--"],
  ["pages-catalogpage--", "pages-store-catalog--"],
  ["pages-checkoutpage--", "pages-store-checkout--"],
  ["pages-homepage--", "pages-store-home--"],
  ["pages-productdetailpage--", "pages-store-productdetail--"],
  ["pages-wishlistpage--", "pages-store-wishlist--"],
  // Flatten PostPlanner molecules and organisms to match peer atomic structure
  ["molecules-postplanner-", "molecules-"],
  ["organisms-postplanner-", "organisms-"],
  // Post Planner & Curation mappings
  ["pages-admin-postplanner-curation--", "pages-admin-curation--"],
  ["pages-admin-post-planner-curation--", "pages-admin-curation--"],
  ["pages-admin-postplanner-sharing-queue--", "pages-admin-post-planner-sharing-queue--"],
  ["pages-admin-postplanner-queue--", "pages-admin-post-planner-sharing-queue--"],
  ["pages-admin-post-planner-queue--", "pages-admin-post-planner-sharing-queue--"],
  // Store Curation and Publish prefix mappings
  ["pages-admin-store-curation--", "pages-admin-store-product-curation-workbench--"],
  ["pages-admin-store-curation-workbench--", "pages-admin-store-product-curation-workbench--"],
  ["pages-admin-store-product-curation--", "pages-admin-store-product-curation-workbench--"],
  ["pages-admin-store-publish--", "pages-admin-vayyari-store-product-publish--"],
  ["pages-admin-store-product-publish--", "pages-admin-vayyari-store-product-publish--"],
];

/**
 * Explicit alias mappings for known legacy story IDs stored in browser localStorage or URLs.
 */
const LEGACY_STORY_ALIASES: Record<string, string> = {
  // AdminOrderDetailPage stories
  "pages-adminorderdetail--whats-app-cod-today": "pages-admin-orderdetail--whats-app-cod-today",
  "pages-adminorderdetail--whatsapp-cod-today": "pages-admin-orderdetail--whats-app-cod-today",
  "pages-adminorderdetail--whatsappcodtoday": "pages-admin-orderdetail--whats-app-cod-today",
  "pages-admin-orderdetail--whatsappcodtoday": "pages-admin-orderdetail--whats-app-cod-today",
  "pages-admin-orderdetail--whatsapp-cod-today": "pages-admin-orderdetail--whats-app-cod-today",
  "pages-adminorderdetail--instagram-prepaid-recent": "pages-admin-orderdetail--instagram-prepaid-recent",
  "pages-adminorderdetail--product-sheet-open": "pages-admin-orderdetail--product-sheet-open",
  "pages-adminorderdetail--address-sheet-open": "pages-admin-orderdetail--address-sheet-open",
  "pages-adminorderdetail--older-order": "pages-admin-orderdetail--older-order",
  "pages-adminorderdetail--multi-select-active": "pages-admin-orderdetail--multi-select-active",
  "pages-adminorderdetail--kids-wear-order": "pages-admin-orderdetail--kids-wear-order",
  // OrderIdGeneratorPage stories
  "pages-admin-orderidgenerator--populatedstate": "pages-orderidgenerator--populated-state",
  "pages-admin-orderidgenerator--populated-state": "pages-orderidgenerator--populated-state",
  "pages-orderidgenerator--populatedstate": "pages-orderidgenerator--populated-state",
  // Post Planner / Curation aliases
  "pages-admin-curation": "pages-admin-curation--interactive-workbench",
  "pages-admin-curation--default-curation": "pages-admin-curation--default-curation-grid",
  "pages-admin-curation--curation": "pages-admin-curation--interactive-workbench",
  "pages-admin-curation--curation-grid": "pages-admin-curation--default-curation-grid",
  "pages-admin-post-planner-curation": "pages-admin-curation--interactive-workbench",
  "pages-admin-post-planner-sharing-queue": "pages-admin-post-planner-sharing-queue--interactive-workbench",
  "pages-admin-post-planner-queue": "pages-admin-post-planner-sharing-queue--interactive-workbench",
  "pages-admin-post-planner--curation": "pages-admin-curation--interactive-workbench",
  "pages-admin-post-planner--curation-grid": "pages-admin-curation--default-curation-grid",
  "pages-admin-post-planner--queue": "pages-admin-post-planner-sharing-queue--interactive-workbench",
  "pages-admin-post-planner--sharing-queue": "pages-admin-post-planner-sharing-queue--interactive-workbench",
  // Product Share & Publish aliases
  "pages-admin-product-share": "pages-admin-product-share-publish--interactive-catalog-share",
  "pages-admin-product-share-publish": "pages-admin-product-share-publish--interactive-catalog-share",
  "pages-admin-productshare": "pages-admin-product-share-publish--interactive-catalog-share",
  "pages-admin-share": "pages-admin-product-share-publish--interactive-catalog-share",
  // Store Product Curation Workbench aliases
  "pages-admin-store-product-curation-workbench": "pages-admin-store-product-curation-workbench--default-curation-workbench",
  "pages-admin-store-product-curation": "pages-admin-store-product-curation-workbench--default-curation-workbench",
  "pages-admin-store-curation": "pages-admin-store-product-curation-workbench--default-curation-workbench",
  "pages-admin-store-curation-workbench": "pages-admin-store-product-curation-workbench--default-curation-workbench",
  "pages-store-curation": "pages-admin-store-product-curation-workbench--default-curation-workbench",
  "pages-admin-store-workbench": "pages-admin-store-product-curation-workbench--default-curation-workbench",
  "pages-admin-storeproductcuration": "pages-admin-store-product-curation-workbench--default-curation-workbench",
  "pages-admin-store-curation--default-curation-workbench": "pages-admin-store-product-curation-workbench--default-curation-workbench",
  "pages-admin-store-curation-workbench--default-curation-workbench": "pages-admin-store-product-curation-workbench--default-curation-workbench",
  "pages-admin-store-product-curation--default-curation-workbench": "pages-admin-store-product-curation-workbench--default-curation-workbench",
  // Vayyari Store Product Publish aliases
  "pages-admin-vayyari-store-product-publish": "pages-admin-vayyari-store-product-publish--interactive-publish-workbench",
  "pages-admin-vayyari-store-publish": "pages-admin-vayyari-store-product-publish--interactive-publish-workbench",
  "pages-admin-store-publish": "pages-admin-vayyari-store-product-publish--interactive-publish-workbench",
  "pages-admin-store-product-publish": "pages-admin-vayyari-store-product-publish--interactive-publish-workbench",
  "pages-admin-vayyari-store-product-publish--interactive-publish-workbench": "pages-admin-vayyari-store-product-publish--interactive-publish-workbench",
  // Vayyari Store In-Store Inventory aliases
  "pages-admin-vayyari-store-in-store-inventory": "pages-admin-vayyari-store-in-store-inventory--default-store-inventory",
  "pages-admin-vayyari-store-inventory": "pages-admin-vayyari-store-in-store-inventory--default-store-inventory",
  "pages-admin-store-inventory": "pages-admin-vayyari-store-in-store-inventory--default-store-inventory",
  "pages-admin-store-synced-inventory": "pages-admin-vayyari-store-in-store-inventory--default-store-inventory",
  // Beta Store Cart aliases
  "pages-store-beta-cart": "pages-store-beta-beta-cart--default-beta-cart",
  "pages-store-beta-beta-cart": "pages-store-beta-beta-cart--default-beta-cart",
  "pages-store-beta-bag": "pages-store-beta-beta-cart--default-beta-cart",
  "pages-beta-cart": "pages-store-beta-beta-cart--default-beta-cart",
  "pages-beta-bag": "pages-store-beta-beta-cart--default-beta-cart",
  // Typeform Discovery Viewport aliases
  "pages-prelaunch-typeform-discovery-journey--tablet-single-screen-4-columns": "pages-prelaunch-typeform-discovery-journey--single-screen-flow-with-rewards",
  "pages-prelaunch-typeform-discovery-journey--desktop-single-screen-5-columns": "pages-prelaunch-typeform-discovery-journey--single-screen-flow-with-rewards",
  "pages-prelaunch-typeform-discovery-journey--mobile-single-screen-square": "pages-prelaunch-typeform-discovery-journey--single-screen-flow-with-rewards",

  // Form Factor Consolidations - Store Pages
  "pages-store-home--desktop-view": "pages-store-home--interactive-form-factors",
  "pages-store-home--tablet-view": "pages-store-home--interactive-form-factors",
  "pages-store-home--mobile-view": "pages-store-home--interactive-form-factors",
  "pages-store-catalog--desktop-view": "pages-store-catalog--interactive-form-factors",
  "pages-store-catalog--tablet-view": "pages-store-catalog--interactive-form-factors",
  "pages-store-catalog--mobile-view": "pages-store-catalog--interactive-form-factors",
  "pages-store-checkout--desktop-view": "pages-store-checkout--interactive-form-factors",
  "pages-store-checkout--tablet-view": "pages-store-checkout--interactive-form-factors",
  "pages-store-checkout--mobile-view": "pages-store-checkout--interactive-form-factors",
  "pages-store-wishlist--desktop-view": "pages-store-wishlist--interactive-form-factors",
  "pages-store-wishlist--tablet-view": "pages-store-wishlist--interactive-form-factors",
  "pages-store-wishlist--mobile-view": "pages-store-wishlist--interactive-form-factors",
  "pages-store-productdetail--desktop-view": "pages-store-productdetail--interactive-form-factors",
  "pages-store-productdetail--tablet-view": "pages-store-productdetail--interactive-form-factors",
  "pages-store-productdetail--mobile-view": "pages-store-productdetail--interactive-form-factors",

  // Form Factor Consolidations - Wireframe Templates
  "templates-catalogtemplate--desktop-view": "templates-catalogtemplate--interactive-form-factors",
  "templates-catalogtemplate--tablet-view": "templates-catalogtemplate--interactive-form-factors",
  "templates-catalogtemplate--mobile-view": "templates-catalogtemplate--interactive-form-factors",
  "templates-productdetailtemplate--desktop-view": "templates-productdetailtemplate--interactive-form-factors",
  "templates-productdetailtemplate--tablet-view": "templates-productdetailtemplate--interactive-form-factors",
  "templates-productdetailtemplate--mobile-view": "templates-productdetailtemplate--interactive-form-factors",
  "templates-storefronttemplate--desktop-view": "templates-storefronttemplate--interactive-form-factors",
  "templates-storefronttemplate--tablet-view": "templates-storefronttemplate--interactive-form-factors",
  "templates-storefronttemplate--mobile-view": "templates-storefronttemplate--interactive-form-factors",
  "templates-wishlisttemplate--desktop-view": "templates-wishlisttemplate--interactive-form-factors",
  "templates-wishlisttemplate--tablet-view": "templates-wishlisttemplate--interactive-form-factors",
  "templates-wishlisttemplate--mobile-view": "templates-wishlisttemplate--interactive-form-factors",
  "templates-carttemplate--desktop-view": "templates-carttemplate--interactive-form-factors",
  "templates-carttemplate--tablet-view": "templates-carttemplate--interactive-form-factors",
  "templates-carttemplate--mobile-view": "templates-carttemplate--interactive-form-factors",

  // Form Factor Consolidations - Shopping Bags & Workbenches
  "pages-store-cart--mobile-cart-view": "pages-store-cart--default-cart",
  "pages-store-beta-beta-cart--mobile-beta-cart-view": "pages-store-beta-beta-cart--default-beta-cart",
  "pages-admin-survey-framework-4-design-preview-sandbox--tablet-preview-story": "pages-admin-survey-framework-4-design-preview-sandbox--survey-preview-sandbox",
  "pages-admin-survey-framework-4-design-preview-sandbox--desktop-preview-story": "pages-admin-survey-framework-4-design-preview-sandbox--survey-preview-sandbox",
  "pages-admin-survey-framework-4---design-preview--sandbox--tablet-preview-story": "pages-admin-survey-framework-4-design-preview-sandbox--survey-preview-sandbox",
  "pages-admin-survey-framework-4---design-preview--sandbox--desktop-preview-story": "pages-admin-survey-framework-4-design-preview-sandbox--survey-preview-sandbox",
  "curation-sizesettingworkflow--mobile-curation-view-390px": "curation-sizesettingworkflow--interactive-curation-workflow",
  "curation-sizesettingworkflow--tablet-curation-view-768px": "curation-sizesettingworkflow--interactive-curation-workflow",
  "curation-sizesettingworkflow--desktop-curation-workspace-1100px": "curation-sizesettingworkflow--interactive-curation-workflow",
  "curation-sizecurationworkflow--mobile-curation-view-390px": "curation-sizesettingworkflow--interactive-curation-workflow",
  "curation-sizecurationworkflow--tablet-curation-view-768px": "curation-sizesettingworkflow--interactive-curation-workflow",
  "curation-sizecurationworkflow--desktop-curation-workspace-1100px": "curation-sizesettingworkflow--interactive-curation-workflow",
  "organisms-productgallery--mobile-with-color-selection": "organisms-productgallery--interactive-product-gallery",
  "organisms-productgallery--tablet-carousel-with-color-selection": "organisms-productgallery--interactive-product-gallery",
  "organisms-productgallery--desktop-interactive": "organisms-productgallery--interactive-product-gallery",

  // Form Factor Consolidations - Admin Pages
  "pages-admin-adminhomescreen--tablet-view": "pages-admin-adminhomescreen--light-mode-reduced-blur",
  "pages-admin-operationshub--tablet-hub": "pages-admin-operationshub--admin-home-with-quick-action-overlay",
  "pages-admin-operationshubpage--tablet-hub": "pages-admin-operationshub--admin-home-with-quick-action-overlay",
  "pages-admin-orderidgenerator--tablet-view": "pages-admin-orderidgenerator--loading-shimmer-state",
  "pages-admin-orderidgeneratorpage--tablet-view": "pages-admin-orderidgenerator--loading-shimmer-state",
  "pages-admin-orderledger--tablet-ledger": "pages-admin-orderledger--all-orders-filter",
  "pages-admin-orderledgerpage--tablet-ledger": "pages-admin-orderledger--all-orders-filter",
  "pages-admin-allorderspage--tablet-view": "pages-admin-allorderspage--all-orders-populated",
  "pages-admin-productcatalog--tablet-viewport": "pages-admin-productcatalog--ai-facet-filtering-and-matrix",
  "pages-admin-adminproductcatalogpage--tablet-viewport": "pages-admin-productcatalog--ai-facet-filtering-and-matrix",
  "pages-admin-createproduct--tablet-split-viewport": "pages-admin-createproduct--ai-auto-filled",
  "pages-admin-admincreateproductpage--tablet-split-viewport": "pages-admin-createproduct--ai-auto-filled",
  "pages-admin-storefront-administration--tablet-viewport": "pages-admin-storefront-administration--default-overview",
  "pages-admin-utilitieshubpage--tablet-view": "pages-admin-utilitieshubpage--default-mobile-view",
};

/**
 * Normalizes any requested story ID:
 * 1. Checks explicit alias map
 * 2. Checks prefix remappings
 * 3. Validates against view._storyIndex entries with hyphen/case tolerance
 * 4. Falls back to DEFAULT_STORY_ID if non-existent
 */
export function normalizeStoryId(rawId: string | null | undefined): string {
  if (!rawId || typeof rawId !== "string") {
    return DEFAULT_STORY_ID;
  }

  const clean = rawId.trim();
  if (!clean) return DEFAULT_STORY_ID;

  // 1. Direct alias dictionary lookup
  if (LEGACY_STORY_ALIASES[clean]) {
    return LEGACY_STORY_ALIASES[clean];
  }

  // 2. Prefix mapping lookup
  for (const [oldPrefix, newPrefix] of LEGACY_PREFIX_MAPPINGS) {
    if (clean.startsWith(oldPrefix)) {
      const remapped = clean.replace(oldPrefix, newPrefix);
      if (LEGACY_STORY_ALIASES[remapped]) return LEGACY_STORY_ALIASES[remapped];
      return remapped;
    }
  }

  // 3. Dynamic validation against view._storyIndex if loaded
  try {
    const entries = (view as any)?._storyIndex?.entries;
    if (entries && typeof entries === "object") {
      if (entries[clean]) return clean;

      const keys = Object.keys(entries);
      if (keys.length > 0) {
        // Hyphen / case insensitive search
        const strippedClean = clean.replace(/-/g, "").toLowerCase();
        const found = keys.find(
          (k) =>
            k.toLowerCase() === clean.toLowerCase() ||
            k.replace(/-/g, "").toLowerCase() === strippedClean
        );
        if (found) return found;

        // Suffix matching (e.g. story name after '--')
        const suffix = clean.split("--")[1];
        if (suffix) {
          const strippedSuffix = suffix.replace(/-/g, "").toLowerCase();
          const suffixFound = keys.find((k) => {
            const kSuffix = k.split("--")[1];
            return (
              kSuffix &&
              kSuffix.replace(/-/g, "").toLowerCase() === strippedSuffix
            );
          });
          if (suffixFound) return suffixFound;
        }

        // Fallback to default or first available story in index
        if (entries[DEFAULT_STORY_ID]) return DEFAULT_STORY_ID;
        return keys[0];
      }
    }
  } catch {}

  return clean;
}

// Defensive patch on Storybook internals to prevent crashes on missing story / HMR transitions
try {
  if (typeof (view as any)?._storyIdExists === "function") {
    const origStoryIdExists = (view as any)._storyIdExists.bind(view);
    (view as any)._storyIdExists = (storyId: string) => {
      if (origStoryIdExists(storyId)) return true;
      const normalized = normalizeStoryId(storyId);
      return origStoryIdExists(normalized);
    };
  }

  const preview = (view as any)?._preview;
  if (preview) {
    const origSelectSpecifiedStory = preview.selectSpecifiedStory?.bind(preview);
    if (typeof origSelectSpecifiedStory === "function") {
      preview.selectSpecifiedStory = async () => {
        try {
          const specifier = preview.selectionStore?.selectionSpecifier?.storySpecifier;
          if (typeof specifier === "string" && specifier !== "*") {
            const normalized = normalizeStoryId(specifier);
            if (preview.selectionStore?.selectionSpecifier) {
              preview.selectionStore.selectionSpecifier.storySpecifier = normalized;
            }
          }
          await origSelectSpecifiedStory();
        } catch (err) {
          console.warn("[Storybook Router] Handled story selection exception, falling back:", err);
          if (preview.selectionStore?.selectionSpecifier) {
            preview.selectionStore.selectionSpecifier.storySpecifier = DEFAULT_STORY_ID;
          }
          try {
            await origSelectSpecifiedStory();
          } catch {}
        }
      };
    }

    const patchStoryIndex = (storyIndex: any) => {
      if (storyIndex && typeof storyIndex.storyIdToEntry === "function" && !storyIndex.__patched) {
        storyIndex.__patched = true;
        const origStoryIdToEntry = storyIndex.storyIdToEntry.bind(storyIndex);
        storyIndex.storyIdToEntry = (storyId: string) => {
          if (storyIndex.entries && storyIndex.entries[storyId]) {
            return origStoryIdToEntry(storyId);
          }
          const normalized = normalizeStoryId(storyId);
          if (storyIndex.entries && storyIndex.entries[normalized]) {
            return origStoryIdToEntry(normalized);
          }
          const fallbackKey =
            (storyIndex.entries && storyIndex.entries[DEFAULT_STORY_ID])
              ? DEFAULT_STORY_ID
              : Object.keys(storyIndex.entries || {})[0];
          if (fallbackKey && storyIndex.entries[fallbackKey]) {
            return origStoryIdToEntry(fallbackKey);
          }
          return origStoryIdToEntry(storyId);
        };
      }
    };

    if (preview.storyStoreValue?.storyIndex) {
      patchStoryIndex(preview.storyStoreValue.storyIndex);
    }
  }
} catch (err) {
  console.warn("[Storybook Router] Defensive patching error:", err);
}

/**
 * Resolve initial story ID from:
 * 1. URL search params (?id=... or ?story=... or ?STORYBOOK_STORY_ID=...)
 * 2. URL hash (#...)
 * 3. localStorage ('lastOpenedStory')
 * 4. Fallback default ('design-system-overview--all-components')
 */
function getInitialStoryId(): string {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl =
        params.get("id") ||
        params.get("story") ||
        params.get("STORYBOOK_STORY_ID");
      if (fromUrl) {
        const normalized = normalizeStoryId(fromUrl);
        if (normalized !== fromUrl) {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set("id", normalized);
          window.history.replaceState({ storyId: normalized }, "", currentUrl.toString());
          window.localStorage.setItem("lastOpenedStory", normalized);
        }
        return normalized;
      }

      const hash = window.location.hash.replace(/^#\/?/, "");
      if (hash) {
        return normalizeStoryId(hash);
      }

      const stored = window.localStorage.getItem("lastOpenedStory");
      if (stored) {
        const normalized = normalizeStoryId(stored);
        if (normalized !== stored) {
          window.localStorage.setItem("lastOpenedStory", normalized);
        }
        return normalized;
      }
    } catch {}
  }
  return normalizeStoryId(DEFAULT_STORY_ID);
}

const storage = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        if (key === "lastOpenedStory") {
          const params = new URLSearchParams(window.location.search);
          const fromUrl =
            params.get("id") ||
            params.get("story") ||
            params.get("STORYBOOK_STORY_ID");
          if (fromUrl) return normalizeStoryId(fromUrl);
        }
        if (window.localStorage) {
          const stored = window.localStorage.getItem(key);
          if (key === "lastOpenedStory" && stored) {
            return normalizeStoryId(stored);
          }
          return stored;
        }
      }
    } catch {}
    return null;
  },
  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const normalized = key === "lastOpenedStory" ? normalizeStoryId(value) : value;
        if (window.localStorage) {
          window.localStorage.setItem(key, normalized);
        }
        // Synchronize browser URL query param so refresh / copy-paste URL maintains exact story & state
        if (key === "lastOpenedStory" && normalized) {
          const currentUrl = new URL(window.location.href);
          if (currentUrl.searchParams.get("id") !== normalized) {
            currentUrl.searchParams.set("id", normalized);
            window.history.pushState({ storyId: normalized }, "", currentUrl.toString());
          }
        }
      }
    } catch {}
  },
};

const initialStoryId = getInitialStoryId();

const StorybookUI = view.getStorybookUI({
  shouldPersistSelection: true,
  enableWebsockets: false,
  storage,
  initialSelection: initialStoryId as any,
});

/**
 * StorybookUIRoot wrapper with:
 * - Two-way browser URL history routing (popstate / back / forward buttons)
 * - Auto-persistence across page reloads
 */
/**
 * Enhances desktop Storybook sidebar:
 * 1. Expands sidebar width to 340px (preventing text wrapping on long component names).
 * 2. Keeps the search input and logo static / sticky at the top during scroll.
 * 3. Prevents text wrapping on story tree items while adding clean ellipsis.
 */
const COLLAPSED_CATEGORIES = [
  { id: "atoms", name: "Atoms", letter: "A", color: "#2563EB", bg: "#EFF6FF" },
  { id: "molecules", name: "Molecules", letter: "M", color: "#7C3AED", bg: "#F5F3FF" },
  { id: "organisms", name: "Organisms", letter: "O", color: "#059669", bg: "#ECFDF5" },
  { id: "templates", name: "Templates", letter: "T", color: "#D97706", bg: "#FFFBEB" },
  { id: "pages", name: "Pages", letter: "P", color: "#DC2626", bg: "#FEF2F2" },
  { id: "design-system", name: "Design System", letter: "DS", color: "#4F46E5", bg: "#EEF2FF" },
  { id: "curation", name: "Curation", letter: "Cu", color: "#0891B2", bg: "#ECFEFF" },
  { id: "catalog", name: "Catalog", letter: "Ct", color: "#EA580C", bg: "#FFF7ED" },
  { id: "books", name: "Books", letter: "B", color: "#4338CA", bg: "#EEF2FF" },
  { id: "theme", name: "Themes", letter: "Th", color: "#9333EA", bg: "#FAF5FF" },
];

/**
 * Enhances desktop Storybook sidebar:
 * 1. Expands sidebar width to 340px when open; fixed 64px when collapsed.
 * 2. Keeps search input and logo sticky at top during scroll.
 * 3. Prevents text wrapping on story tree items with neat ellipsis.
 * 4. Auto-scrolls left sidebar to keep selected component/link focused in view.
 * 5. Provides a Sync button next to Storybook title to scroll back to selected item when moved away.
 * 6. Provides a Top-Level Collapse Toggle that only collapses/expands top-level menus, retaining sub-menu states.
 * 7. When collapsed, renders a sleek navigation rail with icon/alphabet badges (A, M, O, T, P...) instead of a blank white column.
 */
function useSidebarEnhancements() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || typeof document === "undefined") return;

    const STYLE_ID = "storybook-sidebar-enhancements";
    let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
        /* 1. Desktop sidebar drawer widths */
        #sb-desktop-sidebar:not(.sb-collapsed-sidebar),
        div[style*="border-right-width"]:has(#storybook-explorer-tree),
        div[style*="borderRightWidth"]:has(#storybook-explorer-tree) {
          width: 340px !important;
          min-width: 340px !important;
          max-width: 340px !important;
        }

        /* 2. Pin logo container static at the top with action buttons (scoped strictly to sidebar) */
        #sb-desktop-sidebar .r-overflowY-1rnoaur > div > div:first-child,
        #sb-desktop-sidebar div[style*="overflow-y: auto"] > div > div:first-child,
        .r-overflowY-1rnoaur:has(#storybook-explorer-tree) > div > div:first-child,
        div[style*="overflow-y: auto"]:has(#storybook-explorer-tree) > div > div:first-child {
          position: sticky !important;
          top: 0px !important;
          z-index: 30 !important;
          background-color: var(--sb-sidebar-bg, #ffffff) !important;
          padding: 8px 12px 8px 16px !important;
          height: 48px !important;
          box-sizing: border-box !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: space-between !important;
        }

        /* 3. Pin search input static right beneath the logo with full-bleed background (scoped strictly to sidebar) */
        #sb-desktop-sidebar .r-paddingTop-95jzfe,
        .r-overflowY-1rnoaur:has(#storybook-explorer-tree) .r-paddingTop-95jzfe {
          background-color: var(--sb-sidebar-bg, #ffffff) !important;
        }

        #sb-desktop-sidebar div:has(> input),
        .r-overflowY-1rnoaur:has(#storybook-explorer-tree) div:has(> input) {
          position: sticky !important;
          top: 48px !important;
          z-index: 25 !important;
          background-color: var(--sb-sidebar-bg, #ffffff) !important;
          margin-left: -10px !important;
          margin-right: -10px !important;
          padding-left: 10px !important;
          padding-right: 10px !important;
          padding-top: 6px !important;
          padding-bottom: 8px !important;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08) !important;
        }

        /* Bridge and fill any gap between title header and search with solid background */
        #sb-desktop-sidebar div:has(> input)::before,
        .r-overflowY-1rnoaur:has(#storybook-explorer-tree) div:has(> input)::before {
          content: "" !important;
          position: absolute !important;
          top: -18px !important;
          left: 0 !important;
          right: 0 !important;
          height: 20px !important;
          background-color: var(--sb-sidebar-bg, #ffffff) !important;
          z-index: -1 !important;
        }

        /* Fix search icon positioning: indented inside input and vertically centered */
        #sb-desktop-sidebar div:has(> input) > div:first-child,
        .r-overflowY-1rnoaur:has(#storybook-explorer-tree) div:has(> input) > div:first-child {
          left: 20px !important;
          top: 6px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        /* 4. Prevent text wrapping on story tree items with neat ellipsis */
        #storybook-explorer-tree div[dir="auto"],
        #storybook-explorer-tree .css-text-146c3p1 {
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        /* 5. Header Actions Toolbar (Sync + Collapse Toggle) */
        .sb-header-actions {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          margin-left: auto !important;
          margin-right: 8px !important;
          z-index: 35 !important;
        }

        .sb-action-btn {
          width: 28px !important;
          height: 28px !important;
          border-radius: 6px !important;
          border: 1px solid var(--sb-border-color, rgba(0, 0, 0, 0.12)) !important;
          background: var(--sb-action-bg, rgba(0, 0, 0, 0.03)) !important;
          color: var(--sb-icon-color, #4b5563) !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          transition: all 0.15s ease-in-out !important;
          padding: 0 !important;
          outline: none !important;
        }

        .sb-action-btn:hover {
          background: var(--sb-action-hover, rgba(0, 0, 0, 0.08)) !important;
          border-color: var(--sb-accent-color, #029CFD) !important;
          color: var(--sb-accent-color, #029CFD) !important;
          transform: translateY(-1px) !important;
        }

        .sb-action-btn:active {
          transform: scale(0.95) !important;
        }

        .sb-action-btn svg {
          width: 15px !important;
          height: 15px !important;
          stroke: currentColor !important;
          transition: transform 0.35s ease !important;
        }

        /* 6. Selected Component Focus Pulse Highlight */
        @keyframes sbSelectedPulse {
          0% {
            outline: 2px solid #029CFD;
            box-shadow: 0 0 0 0 rgba(2, 156, 253, 0.7);
          }
          40% {
            outline: 2px solid #029CFD;
            box-shadow: 0 0 0 6px rgba(2, 156, 253, 0.35);
          }
          100% {
            outline: 2px solid transparent;
            box-shadow: 0 0 0 0 rgba(2, 156, 253, 0);
          }
        }

        .sb-selected-pulse {
          animation: sbSelectedPulse 1.4s ease-out !important;
          border-radius: 4px !important;
        }

        /* 7. Collapsed Sidebar Rail */
        .sb-collapsed-sidebar {
          width: 64px !important;
          min-width: 64px !important;
          max-width: 64px !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          background-color: var(--sb-sidebar-bg, #ffffff) !important;
          height: 100% !important;
          overflow: hidden !important;
          user-select: none !important;
          border-right-width: 1px !important;
          border-right-style: solid !important;
          border-right-color: var(--sb-border-color, rgba(0, 0, 0, 0.1)) !important;
        }

        .sb-collapsed-rail {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 8px !important;
          width: 100% !important;
          flex: 1 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          padding-top: 6px !important;
          padding-bottom: 20px !important;
          scrollbar-width: none !important;
        }

        .sb-collapsed-rail::-webkit-scrollbar {
          display: none !important;
        }

        .sb-rail-divider {
          width: 36px !important;
          height: 1px !important;
          background: var(--sb-border-color, rgba(0, 0, 0, 0.1)) !important;
          margin: 6px 0 !important;
        }

        .sb-rail-item {
          position: relative !important;
          width: 44px !important;
          height: 44px !important;
          border-radius: 10px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          border: 1px solid transparent !important;
          background: transparent !important;
          transition: all 0.18s ease !important;
          padding: 0 !important;
          outline: none !important;
        }

        .sb-rail-item:hover {
          background: var(--sb-action-hover, rgba(0, 0, 0, 0.05)) !important;
          border-color: var(--sb-border-color, rgba(0, 0, 0, 0.1)) !important;
          transform: translateY(-1px) !important;
        }

        .sb-rail-item:active {
          transform: scale(0.94) !important;
        }

        .sb-rail-item.active {
          background: rgba(2, 156, 253, 0.12) !important;
          border-color: rgba(2, 156, 253, 0.35) !important;
        }

        .sb-rail-item.active::before {
          content: "" !important;
          position: absolute !important;
          left: 2px !important;
          top: 10px !important;
          bottom: 10px !important;
          width: 3px !important;
          border-radius: 2px !important;
          background: var(--sb-accent-color, #029CFD) !important;
        }

        .sb-rail-badge {
          width: 32px !important;
          height: 32px !important;
          border-radius: 8px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          letter-spacing: -0.3px !important;
          transition: all 0.18s ease !important;
        }

        .sb-rail-item.active .sb-rail-badge {
          background: var(--sb-accent-color, #029CFD) !important;
          color: #ffffff !important;
          box-shadow: 0 2px 6px rgba(2, 156, 253, 0.35) !important;
        }

        /* Tooltip on hover */
        .sb-rail-tooltip {
          position: absolute !important;
          left: 54px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          background: #111827 !important;
          color: #ffffff !important;
          padding: 5px 10px !important;
          border-radius: 6px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          white-space: nowrap !important;
          pointer-events: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          transition: opacity 0.15s ease, transform 0.15s ease !important;
          z-index: 100 !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
        }

        .sb-rail-tooltip::before {
          content: "" !important;
          position: absolute !important;
          right: 100% !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          border-width: 4px !important;
          border-style: solid !important;
          border-color: transparent #111827 transparent transparent !important;
        }

        .sb-rail-item:hover .sb-rail-tooltip {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateY(-50%) translateX(2px) !important;
        }

        /* ==========================================================
         * 8. STORYBOOK CONTROLS TAB COMPREHENSIVE OVERHAUL
         * ========================================================== */

        /* Controls Table Row Alignment & Spacing */
        div:has(> div[style*="width: 25%"]):has(> div[style*="width: 75%"]) {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          padding: 10px 20px !important;
          transition: background-color 0.15s ease !important;
          box-sizing: border-box !important;
        }

        div:has(> div[style*="width: 25%"]):has(> div[style*="width: 75%"]):hover {
          background-color: var(--sb-ctrl-row-hover, rgba(0, 0, 0, 0.015)) !important;
        }

        /* Controls Table Header */
        div:has(> div[style*="width: 25%"]):has(> div[style*="width: 75%"]):first-child {
          border-bottom: 1px solid var(--sb-ctrl-border-off, #E2E8F0) !important;
          background-color: var(--sb-ctrl-header-bg, rgba(0, 0, 0, 0.02)) !important;
          padding-top: 12px !important;
          padding-bottom: 12px !important;
        }

        div:has(> div[style*="width: 25%"]):has(> div[style*="width: 75%"]):first-child div[dir="auto"] {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.8px !important;
          color: var(--sb-ctrl-header-text, #64748B) !important;
        }

        /* Controls Prop Label (Left Column) */
        div:has(> div[style*="width: 25%"]):has(> div[style*="width: 75%"]) > div[style*="width: 25%"] {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          letter-spacing: -0.1px !important;
          color: var(--sb-ctrl-label-color, #334155) !important;
        }

        /* Controls Control Cell Wrapper (Right Column) */
        div:has(> div[style*="width: 25%"]):has(> div[style*="width: 75%"]) > div[style*="width: 75%"] {
          display: flex !important;
          align-items: center !important;
          min-height: 36px !important;
        }

        /* --- Toggle Switch ([role="switch"]) Overhaul --- */
        /* Switch Container */
        div[style*="width: 40px"]:has(> input[role="switch"]) {
          width: 46px !important;
          height: 24px !important;
          min-width: 46px !important;
          min-height: 24px !important;
          max-width: 46px !important;
          max-height: 24px !important;
          position: relative !important;
          display: inline-flex !important;
          align-items: center !important;
          cursor: pointer !important;
          user-select: none !important;
          margin: 0 !important;
          padding: 0 !important;
          border-radius: 9999px !important;
          box-sizing: border-box !important;
          vertical-align: middle !important;
        }

        /* Switch Track (first child) */
        div[style*="width: 40px"]:has(> input[role="switch"]) > div:first-child {
          position: absolute !important;
          inset: 0 !important;
          width: 46px !important;
          height: 24px !important;
          border-radius: 12px !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          transition: background-color 0.22s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.22s ease, box-shadow 0.22s ease !important;
        }

        /* Switch Track UNCHECKED */
        div[style*="width: 40px"]:has(> input[role="switch"]:not(:checked)) > div:first-child {
          background-color: var(--sb-ctrl-track-off, #E2E8F0) !important;
          border: 1.5px solid var(--sb-ctrl-border-off, #CBD5E1) !important;
        }

        /* Switch Track CHECKED */
        div[style*="width: 40px"]:has(> input[role="switch"]:checked) > div:first-child {
          background-color: var(--sb-ctrl-track-on, #0F766E) !important;
          border: 1.5px solid var(--sb-ctrl-border-on, #0D9488) !important;
          box-shadow: 0 0 10px rgba(15, 118, 110, 0.25) !important;
        }

        /* Switch Thumb (second child) */
        div[style*="width: 40px"]:has(> input[role="switch"]) > div:nth-child(2) {
          position: absolute !important;
          width: 18px !important;
          height: 18px !important;
          border-radius: 50% !important;
          top: 3px !important;
          left: 3px !important;
          background-color: #FFFFFF !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.16), 0 1px 2px rgba(0, 0, 0, 0.1) !important;
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, background-color 0.2s ease !important;
          margin: 0 !important;
          margin-inline-start: 0 !important;
          align-self: unset !important;
          z-index: 2 !important;
          box-sizing: border-box !important;
        }

        /* Switch Thumb UNCHECKED */
        div[style*="width: 40px"]:has(> input[role="switch"]:not(:checked)) > div:nth-child(2) {
          transform: translateX(0px) !important;
        }

        /* Switch Thumb CHECKED (46px - 18px - 3px - 3px = 22px travel) */
        div[style*="width: 40px"]:has(> input[role="switch"]:checked) > div:nth-child(2) {
          transform: translateX(22px) !important;
        }

        /* Switch Native Input (clickable target overlay) */
        div[style*="width: 40px"]:has(> input[role="switch"]) > input[role="switch"] {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          opacity: 0 !important;
          cursor: pointer !important;
          z-index: 10 !important;
        }

        /* Switch Hover & Focus States */
        div[style*="width: 40px"]:has(> input[role="switch"]):hover > div:first-child {
          filter: brightness(0.97) !important;
        }

        div[style*="width: 40px"]:has(> input[role="switch"]:checked):hover > div:first-child {
          background-color: var(--sb-ctrl-track-on-hover, #115E59) !important;
        }

        div[style*="width: 40px"]:has(> input[role="switch"]):hover > div:nth-child(2) {
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.22), 0 1px 3px rgba(0, 0, 0, 0.14) !important;
        }

        div[style*="width: 40px"]:has(> input[role="switch"]:focus) > div:first-child,
        div[style*="width: 40px"]:has(> input[role="switch"]:focus-visible) > div:first-child {
          outline: 2px solid #0284C7 !important;
          outline-offset: 2px !important;
        }

        /* Switch Parent Cell - align with ON/OFF label */
        div.css-view-g5y9jx:has(> div[style*="width: 40px"] > input[role="switch"]) {
          display: inline-flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 12px !important;
        }

        /* Switch State Label ("ON" / "OFF") */
        div[style*="width: 40px"]:has(> input[role="switch"])::after {
          content: "OFF";
          position: absolute;
          left: 56px;
          top: 50%;
          transform: translateY(-50%);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.6px !important;
          color: var(--sb-ctrl-off-text, #94A3B8) !important;
          user-select: none !important;
          pointer-events: none !important;
          transition: color 0.2s ease !important;
        }

        div[style*="width: 40px"]:has(> input[role="switch"]:checked)::after {
          content: "ON";
          color: var(--sb-ctrl-track-on, #0F766E) !important;
        }

        /* --- Dropdowns (<select>) --- */
        div[style*="width: 75%"] select {
          width: 100% !important;
          max-width: 340px !important;
          min-height: 36px !important;
          padding: 6px 36px 6px 12px !important;
          border-radius: 8px !important;
          border: 1px solid var(--sb-ctrl-input-border, #CBD5E1) !important;
          background-color: var(--sb-ctrl-input-bg, #FFFFFF) !important;
          color: var(--sb-ctrl-input-color, #1E293B) !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important;
          background-position: right 10px center !important;
          background-size: 16px 16px !important;
          cursor: pointer !important;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease !important;
        }

        div[style*="width: 75%"] select:hover {
          border-color: #94A3B8 !important;
          background-color: var(--sb-ctrl-input-hover-bg, #F8FAFC) !important;
        }

        div[style*="width: 75%"] select:focus {
          outline: none !important;
          border-color: #0284C7 !important;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15) !important;
        }

        /* --- Text & Number Inputs --- */
        div[style*="width: 75%"] input[type="text"],
        div[style*="width: 75%"] input[type="number"],
        div[style*="width: 75%"] input:not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([role="switch"]) {
          width: 100% !important;
          max-width: 340px !important;
          min-height: 36px !important;
          padding: 6px 12px !important;
          border-radius: 8px !important;
          border: 1px solid var(--sb-ctrl-input-border, #CBD5E1) !important;
          background-color: var(--sb-ctrl-input-bg, #FFFFFF) !important;
          color: var(--sb-ctrl-input-color, #1E293B) !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
          box-sizing: border-box !important;
        }

        div[style*="width: 75%"] input:not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([role="switch"]):hover {
          border-color: #94A3B8 !important;
        }

        div[style*="width: 75%"] input:not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([role="switch"]):focus {
          outline: none !important;
          border-color: #0284C7 !important;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15) !important;
        }

        /* --- Radio Buttons --- */
        div[role="radio"] {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          padding: 4px 10px 4px 6px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          transition: background-color 0.15s ease, border-color 0.15s ease !important;
          user-select: none !important;
        }

        div[role="radio"]:hover {
          background-color: rgba(2, 156, 253, 0.08) !important;
        }

        div[role="radio"] > div:first-child {
          width: 18px !important;
          height: 18px !important;
          border-radius: 50% !important;
          border: 2px solid var(--sb-ctrl-border-off, #94A3B8) !important;
          background-color: var(--sb-ctrl-input-bg, #FFFFFF) !important;
          transition: border-color 0.15s ease, background-color 0.15s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-sizing: border-box !important;
        }

        /* Selected Radio Circle */
        div[role="radio"]:has(.r-backgroundColor-7ma9xs) > div:first-child,
        div[role="radio"][aria-checked="true"] > div:first-child,
        div[role="radio"][aria-selected="true"] > div:first-child {
          border-color: var(--sb-ctrl-track-on, #0F766E) !important;
        }

        /* Selected Radio Inner Dot */
        div[role="radio"] .r-backgroundColor-7ma9xs,
        div[role="radio"][aria-checked="true"] > div:first-child > div,
        div[role="radio"][aria-selected="true"] > div:first-child > div {
          width: 8px !important;
          height: 8px !important;
          border-radius: 50% !important;
          background-color: var(--sb-ctrl-track-on, #0F766E) !important;
          transform: scale(1) !important;
          transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        /* Unselected Radio Inner Dot */
        div[role="radio"] .r-backgroundColor-14lw9ot:not([class*="borderColor"]) {
          width: 8px !important;
          height: 8px !important;
          border-radius: 50% !important;
          background-color: transparent !important;
          transform: scale(0) !important;
        }

        /* Selected Radio Text Label */
        div[role="radio"]:has(.r-backgroundColor-7ma9xs) > div[dir="auto"] {
          color: var(--sb-ctrl-track-on, #0F766E) !important;
          font-weight: 600 !important;
        }

        div[role="radio"] > div[dir="auto"],
        div[role="radio"] > span {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          color: var(--sb-ctrl-label-color, #334155) !important;
          margin-left: 8px !important;
          transition: color 0.15s ease !important;
        }

        /* --- Range / Slider --- */
        div[style*="width: 75%"] > div:has(> div > div[style*="border-radius: 16px"]),
        div[style*="width: 75%"] > div:has(> div > div[style*="borderRadius: 16px"]) {
          width: 100% !important;
          max-width: 340px !important;
        }

        /* Slider Fill Track */
        div[style*="width: 75%"] .r-backgroundColor-7ma9xs.r-borderRadius-1jkafct {
          background-color: var(--sb-ctrl-track-on, #0F766E) !important;
        }

        /* Slider Thumb */
        div[style*="width: 75%"] .r-borderRadius-1867qdf {
          background-color: var(--sb-ctrl-track-on, #0F766E) !important;
          box-shadow: 0 2px 6px rgba(15, 118, 110, 0.35) !important;
        }

        /* --- Controls Header Reset Button --- */
        div[style*="width: 75%"] div[role="button"]:has(> img),
        div[style*="width: 75%"] button:has(> img) {
          opacity: 0.6 !important;
          transition: opacity 0.15s ease, transform 0.15s ease !important;
          border-radius: 4px !important;
          cursor: pointer !important;
        }

        div[style*="width: 75%"] div[role="button"]:has(> img):hover,
        div[style*="width: 75%"] button:has(> img):hover {
          opacity: 1 !important;
          transform: rotate(-30deg) !important;
        }
      `;

    let lastFocusedStoryId: string | null = null;

    function getCurrentStoryId(): string {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("id") || params.get("story");
        if (urlId) return urlId;
        const stored = window.localStorage.getItem("lastOpenedStory");
        if (stored) return stored;
        const channelId = (view as any)?._preview?.currentSelection?.storyId;
        if (channelId) return channelId;
      } catch {}
      return DEFAULT_STORY_ID;
    }

    function getTopLevelRootButtons(): HTMLElement[] {
      const tree = document.getElementById("storybook-explorer-tree");
      if (!tree) return [];
      // In react-native-web Storybook, top-level root menus have aria-expanded and do NOT have aria-controls
      return Array.from(
        tree.querySelectorAll('div[aria-expanded]:not([aria-controls]), [data-action="collapse-root"]')
      ) as HTMLElement[];
    }

    function updateCollapseToggleUi() {
      const toggleBtn = document.getElementById("sb-btn-collapse-toggle");
      if (!toggleBtn) return;
      const rootButtons = getTopLevelRootButtons();
      const anyExpanded = rootButtons.some((b) => b.getAttribute("aria-expanded") === "true");

      if (anyExpanded) {
        toggleBtn.title = "Collapse all top-level menus";
        toggleBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 14 12 6 20 14"></polyline>
            <line x1="4" y1="19" x2="20" y2="19"></line>
          </svg>
        `;
      } else {
        toggleBtn.title = "Expand all top-level menus";
        toggleBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 10 12 18 20 10"></polyline>
            <line x1="4" y1="5" x2="20" y2="5"></line>
          </svg>
        `;
      }
    }

    let isSyncing = false;

    /**
     * Requirement 1 & 2:
     * Focus / scroll left menu to selected component or link.
     * When force: true (Sync button clicked), if the selected component's parent
     * (component, folder, or root category) is collapsed, automatically expand all ancestors
     * from top to bottom and focus / pulse the selected component/story.
     */
    async function scrollToSelectedStory(options?: { smooth?: boolean; pulse?: boolean; force?: boolean }) {
      const tree = document.getElementById("storybook-explorer-tree");
      if (!tree) return;

      const currentStoryId = getCurrentStoryId();
      if (!options?.force && lastFocusedStoryId === currentStoryId) {
        return;
      }

      const rawComponentId = currentStoryId.includes("--") ? currentStoryId.split("--")[0] : currentStoryId;
      const componentId = rawComponentId.toLowerCase();

      const findTarget = (): HTMLElement | null => {
        // Direct ID match: id="${currentStoryId}" or id="default_${currentStoryId}"
        const direct = document.getElementById(currentStoryId) || document.getElementById("default_" + currentStoryId);
        if (direct) return direct;

        // Attribute suffix/contains match
        const suffixMatch = document.querySelector(
          `#storybook-explorer-tree [id$="${currentStoryId}"]`
        ) as HTMLElement | null;
        if (suffixMatch) return suffixMatch;

        const containsMatch = document.querySelector(
          `#storybook-explorer-tree [id*="${currentStoryId}"]`
        ) as HTMLElement | null;
        if (containsMatch) return containsMatch;

        // Selected background match
        const buttons = document.querySelectorAll(
          '#storybook-explorer-tree div[role="button"][style*="background-color"], #storybook-explorer-tree div[tabindex="0"][style*="background-color"]'
        );
        for (let i = 0; i < buttons.length; i++) {
          const btn = buttons[i] as HTMLElement;
          const bg = btn.style.backgroundColor;
          if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
            return btn;
          }
        }
        return null;
      };

      const executeScroll = (el: HTMLElement) => {
        lastFocusedStoryId = currentStoryId;
        el.scrollIntoView({
          behavior: options?.smooth !== false ? "smooth" : "auto",
          block: "center",
          inline: "nearest",
        });

        if (options?.pulse) {
          el.classList.remove("sb-selected-pulse");
          void el.offsetWidth;
          el.classList.add("sb-selected-pulse");
          setTimeout(() => {
            el.classList.remove("sb-selected-pulse");
          }, 1500);
        }
      };

      let target = findTarget();

      // If force is requested (Sync button clicked) or target is hidden due to collapsed ancestors:
      if (options?.force) {
        if (isSyncing) return;
        isSyncing = true;

        try {
          // Check if any ancestor (root category, sub-folder, or component parent) is collapsed
          for (let step = 0; step < 6; step++) {
            // 1. Expand top-level root category if collapsed
            const rootButtons = getTopLevelRootButtons();
            const matchedRoot = rootButtons.find((btn) => {
              const pId = btn.parentElement?.id?.toLowerCase() || "";
              const text = btn.textContent?.toLowerCase().replace(/\s+/g, "-") || "";
              if (pId && (componentId === pId || componentId.startsWith(pId + "-"))) return true;
              if (text && (componentId === text || componentId.startsWith(text + "-"))) return true;
              return false;
            });

            if (matchedRoot && matchedRoot.getAttribute("aria-expanded") === "false") {
              matchedRoot.click();
              await new Promise((r) => setTimeout(r, 100));
              continue;
            }

            // 2. Expand any collapsed ancestors in the tree
            const allCollapsed = Array.from(tree.querySelectorAll("*")).filter(
              (el) => el.getAttribute("aria-expanded") === "false"
            ) as HTMLElement[];

            const collapsedAncestors = allCollapsed.filter((el) => {
              const id = el.id?.toLowerCase();
              if (!id) return false;
              return (
                currentStoryId.toLowerCase() === id ||
                currentStoryId.toLowerCase().startsWith(id + "-") ||
                currentStoryId.toLowerCase().startsWith(id + "_") ||
                currentStoryId.toLowerCase().startsWith(id + "--") ||
                componentId === id ||
                componentId.startsWith(id + "-") ||
                componentId.startsWith(id + "_")
              );
            });

            if (collapsedAncestors.length === 0) {
              break; // All ancestors are expanded!
            }

            // Expand the topmost collapsed ancestor first
            const nextToExpand = collapsedAncestors[0];
            nextToExpand.click();
            await new Promise((r) => setTimeout(r, 100));
          }

          // Update collapse toggle button UI to reflect current open state
          updateCollapseToggleUi();

          // Wait a tick for React Native Web DOM reconciliation
          await new Promise((r) => setTimeout(r, 50));
          target = findTarget();
        } finally {
          isSyncing = false;
        }
      }

      if (target) {
        executeScroll(target);
      } else {
        // Fallback: if story leaf is still not found, focus the component parent element
        const compEl = document.getElementById(componentId) || document.getElementById(rawComponentId);
        if (compEl) {
          executeScroll(compEl);
        }
      }
    }

    /**
     * Requirement 2 & 3:
     * Injects Sync button and Top-Level Collapse/Expand Toggle next to Storybook title.
     */
    function injectHeaderActions() {
      const tree = document.getElementById("storybook-explorer-tree");
      if (!tree) return;

      const sidebar = tree.closest('div[style*="border-right-width"], div[style*="borderRightWidth"]') as HTMLElement | null;
      const logoSvg = sidebar ? sidebar.querySelector("svg") : null;
      const header = logoSvg ? (logoSvg.parentElement as HTMLElement) : null;
      if (!header) return;

      let toolbar = document.getElementById("sb-header-actions");
      if (toolbar) {
        // Toolbar already mounted: simply refresh collapse toggle state if needed
        updateCollapseToggleUi();
        return;
      }

      toolbar = document.createElement("div");
      toolbar.className = "sb-header-actions";
      toolbar.id = "sb-header-actions";

      // 1. Sync button (scrolls back to selected menu when moved away, expanding ancestors if collapsed)
      const syncBtn = document.createElement("button");
      syncBtn.className = "sb-action-btn";
      syncBtn.id = "sb-btn-sync";
      syncBtn.title = "Sync: Scroll to selected component";
      syncBtn.setAttribute("aria-label", "Scroll to selected component in menu");
      syncBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
        </svg>
      `;

      syncBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const svg = syncBtn.querySelector("svg");
        if (svg) {
          svg.style.transition = "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
          svg.style.transform = "rotate(360deg)";
        }
        await scrollToSelectedStory({ smooth: true, pulse: true, force: true });
        if (svg) {
          setTimeout(() => {
            svg.style.transition = "none";
            svg.style.transform = "";
          }, 350);
        }
      });

      // 2. Collapse Toggle button (collapses/expands only top-level menus, retaining sub-menus)
      const collapseToggleBtn = document.createElement("button");
      collapseToggleBtn.className = "sb-action-btn";
      collapseToggleBtn.id = "sb-btn-collapse-toggle";
      collapseToggleBtn.setAttribute("aria-label", "Collapse or expand all top-level menus");
      updateCollapseToggleUi();

      collapseToggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const rootButtons = getTopLevelRootButtons();
        const anyExpanded = rootButtons.some((b) => b.getAttribute("aria-expanded") === "true");

        if (anyExpanded) {
          // Collapse all top-level menus (only touches roots, sub-menus keep their internal states)
          rootButtons.forEach((btn) => {
            if (btn.getAttribute("aria-expanded") === "true") {
              btn.click();
            }
          });
        } else {
          // Expand all top-level menus (restores previously opened sub-menus)
          rootButtons.forEach((btn) => {
            if (btn.getAttribute("aria-expanded") === "false") {
              btn.click();
            }
          });
        }

        setTimeout(updateCollapseToggleUi, 80);
      });

      toolbar.appendChild(syncBtn);
      toolbar.appendChild(collapseToggleBtn);

      // Place toolbar next to the Storybook title, before the hamburger button
      const hamburgerBtn = header.querySelector('button[role="button"], div[role="button"]');
      if (hamburgerBtn && hamburgerBtn.parentElement === header) {
        hamburgerBtn.id = "sb-btn-hamburger-close";
        header.insertBefore(toolbar, hamburgerBtn);
      } else if (header.children.length > 1) {
        header.insertBefore(toolbar, header.lastElementChild);
      } else {
        header.appendChild(toolbar);
      }
    }

    /**
     * Requirement 4:
     * When left menu is collapsed, render an icon/alphabet navigation rail
     * for Atoms, Molecules, Organisms, Templates, Pages, etc.
     */
    function manageCollapsedRail(sidebar: HTMLElement) {
      const hasTree = !!sidebar.querySelector("#storybook-explorer-tree");
      const existingRail = document.getElementById("sb-collapsed-rail");

      if (hasTree) {
        sidebar.classList.remove("sb-collapsed-sidebar");
        sidebar.style.removeProperty("padding");
        sidebar.style.setProperty("width", "340px", "important");
        sidebar.style.setProperty("min-width", "340px", "important");
        sidebar.style.setProperty("max-width", "340px", "important");
        if (existingRail) {
          existingRail.remove();
        }
        const divider = sidebar.querySelector(".sb-rail-divider");
        if (divider) divider.remove();
        return;
      }

      // Sidebar is collapsed: style container and render the rail
      sidebar.classList.add("sb-collapsed-sidebar");
      sidebar.style.removeProperty("padding");
      sidebar.style.setProperty("width", "64px", "important");
      sidebar.style.setProperty("min-width", "64px", "important");
      sidebar.style.setProperty("max-width", "64px", "important");

      const currentStoryId = getCurrentStoryId().toLowerCase();

      // If rail already exists, ONLY update active highlights without recreating DOM!
      if (existingRail) {
        const items = existingRail.querySelectorAll(".sb-rail-item");
        items.forEach((btn) => {
          const catId = btn.getAttribute("data-category-id");
          if (!catId) return;
          const isActive =
            currentStoryId.startsWith(catId + "-") ||
            currentStoryId.startsWith(catId + "_") ||
            currentStoryId.includes(catId);
          if (isActive) {
            btn.classList.add("active");
          } else {
            btn.classList.remove("active");
          }
        });
        return;
      }

      // First time mounting collapsed rail:
      const hamburgerBtn = sidebar.querySelector('button[role="button"], div[role="button"]') as HTMLElement | null;
      if (hamburgerBtn) {
        hamburgerBtn.id = "sb-btn-hamburger-open";
        hamburgerBtn.style.margin = "12px auto 6px auto";
        hamburgerBtn.title = "Expand sidebar";
        if (!hamburgerBtn.hasAttribute("data-sb-bound")) {
          hamburgerBtn.setAttribute("data-sb-bound", "true");
          hamburgerBtn.addEventListener("click", () => {
            sidebar.classList.remove("sb-collapsed-sidebar");
            sidebar.style.removeProperty("padding");
            sidebar.style.setProperty("width", "340px", "important");
            sidebar.style.setProperty("min-width", "340px", "important");
            sidebar.style.setProperty("max-width", "340px", "important");
            setTimeout(applyDynamicStyles, 50);
          });
        }
      }

      let divider = sidebar.querySelector(".sb-rail-divider") as HTMLElement | null;
      if (!divider) {
        divider = document.createElement("div");
        divider.className = "sb-rail-divider";
        if (hamburgerBtn && hamburgerBtn.nextSibling) {
          sidebar.insertBefore(divider, hamburgerBtn.nextSibling);
        } else {
          sidebar.appendChild(divider);
        }
      }

      const rail = document.createElement("div");
      rail.className = "sb-collapsed-rail";
      rail.id = "sb-collapsed-rail";

      COLLAPSED_CATEGORIES.forEach((cat) => {
        const itemBtn = document.createElement("button");
        itemBtn.className = "sb-rail-item";
        itemBtn.setAttribute("data-category-id", cat.id);
        itemBtn.setAttribute("aria-label", cat.name);

        const isActive =
          currentStoryId.startsWith(cat.id + "-") ||
          currentStoryId.startsWith(cat.id + "_") ||
          currentStoryId.includes(cat.id);

        if (isActive) {
          itemBtn.classList.add("active");
        }

        itemBtn.innerHTML = `
          <div class="sb-rail-badge" style="background: ${isActive ? 'var(--sb-accent-color, #029CFD)' : cat.bg}; color: ${isActive ? '#ffffff' : cat.color};">
            ${cat.letter}
          </div>
          <span class="sb-rail-tooltip">${cat.name}</span>
        `;

        itemBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Immediately restore width on click
          sidebar.classList.remove("sb-collapsed-sidebar");
          sidebar.style.removeProperty("padding");
          sidebar.style.setProperty("width", "340px", "important");
          sidebar.style.setProperty("min-width", "340px", "important");
          sidebar.style.setProperty("max-width", "340px", "important");

          // 1. Expand the sidebar via the hamburger button
          const toggleBtn = (document.getElementById("sb-btn-hamburger-open") ||
            sidebar.querySelector('button[role="button"], div[role="button"]')) as HTMLElement | null;
          if (toggleBtn) {
            toggleBtn.click();
          }

          // 2. Once expanded, expand and scroll to this top-level category
          setTimeout(() => {
            applyDynamicStyles();
            const rootButtons = getTopLevelRootButtons();
            const matchedRoot = rootButtons.find((btn) => {
              const parentId = btn.parentElement?.id?.toLowerCase() || "";
              const text = btn.textContent?.toLowerCase() || "";
              return parentId === cat.id || text.includes(cat.id);
            });
            if (matchedRoot) {
              if (matchedRoot.getAttribute("aria-expanded") === "false") {
                matchedRoot.click();
              }
              matchedRoot.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 150);
        });

        rail.appendChild(itemBtn);
      });

      sidebar.appendChild(rail);
    }

    const applyDynamicStyles = () => {
      // Find the desktop sidebar container
      const tree = document.getElementById("storybook-explorer-tree");
      let sidebar: HTMLElement | null = document.getElementById("sb-desktop-sidebar");

      if (tree) {
        if (!sidebar) {
          let cur: HTMLElement | null = tree;
          while (cur && cur.parentElement && cur !== document.body) {
            if (
              cur.style?.borderRightWidth ||
              cur.style?.width === "240px" ||
              cur.style?.width === "340px" ||
              cur.getAttribute("style")?.includes("border-right-width")
            ) {
              sidebar = cur;
              break;
            }
            cur = cur.parentElement;
          }
        }
        if (sidebar) {
          sidebar.id = "sb-desktop-sidebar";
        }
      } else {
        // Collapsed state: find sidebar by id or border-right on the left container
        if (!sidebar) {
          sidebar = document.querySelector(
            'div[style*="border-right-width"], div[style*="borderRightWidth"]'
          ) as HTMLElement | null;
          if (sidebar) {
            sidebar.id = "sb-desktop-sidebar";
          }
        }
      }

      if (!sidebar || !sidebar.parentElement) return;

      const parentBg = window.getComputedStyle(sidebar.parentElement).backgroundColor;
      const bg =
        parentBg && parentBg !== "rgba(0, 0, 0, 0)" && parentBg !== "transparent"
          ? parentBg
          : "#ffffff";
      document.documentElement.style.setProperty("--sb-sidebar-bg", bg);

      const isDark =
        bg.includes("0, 0, 0") ||
        bg === "#090909" ||
        bg === "#000000" ||
        bg.startsWith("rgb(9") ||
        bg.startsWith("rgb(4");

      document.documentElement.style.setProperty(
        "--sb-border-color",
        isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"
      );
      document.documentElement.style.setProperty(
        "--sb-action-bg",
        isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)"
      );
      document.documentElement.style.setProperty(
        "--sb-action-hover",
        isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"
      );
      document.documentElement.style.setProperty(
        "--sb-icon-color",
        isDark ? "#d1d5db" : "#4b5563"
      );
      document.documentElement.style.setProperty("--sb-accent-color", "#029CFD");

      /* Controls panel adaptive dynamic properties */
      document.documentElement.style.setProperty(
        "--sb-ctrl-label-color",
        isDark ? "#E2E8F0" : "#334155"
      );
      document.documentElement.style.setProperty(
        "--sb-ctrl-input-bg",
        isDark ? "#1E293B" : "#FFFFFF"
      );
      document.documentElement.style.setProperty(
        "--sb-ctrl-input-hover-bg",
        isDark ? "#334155" : "#F8FAFC"
      );
      document.documentElement.style.setProperty(
        "--sb-ctrl-input-border",
        isDark ? "#475569" : "#CBD5E1"
      );
      document.documentElement.style.setProperty(
        "--sb-ctrl-input-color",
        isDark ? "#F8FAFC" : "#1E293B"
      );
      document.documentElement.style.setProperty(
        "--sb-ctrl-track-off",
        isDark ? "#334155" : "#E2E8F0"
      );
      document.documentElement.style.setProperty(
        "--sb-ctrl-border-off",
        isDark ? "#475569" : "#CBD5E1"
      );
      document.documentElement.style.setProperty(
        "--sb-ctrl-track-on",
        isDark ? "#0D9488" : "#0F766E"
      );
      document.documentElement.style.setProperty(
        "--sb-ctrl-track-on-hover",
        isDark ? "#0F766E" : "#115E59"
      );
      document.documentElement.style.setProperty(
        "--sb-ctrl-border-on",
        isDark ? "#14B8A6" : "#0D9488"
      );
      document.documentElement.style.setProperty(
        "--sb-ctrl-off-text",
        isDark ? "#94A3B8" : "#64748B"
      );
      document.documentElement.style.setProperty(
        "--sb-ctrl-header-bg",
        isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.02)"
      );
      document.documentElement.style.setProperty(
        "--sb-ctrl-header-text",
        isDark ? "#94A3B8" : "#64748B"
      );
      document.documentElement.style.setProperty(
        "--sb-ctrl-row-hover",
        isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.015)"
      );

      if (tree) {
        // Sidebar is open: ensure 340px width and remove any collapsed constraints
        sidebar.classList.remove("sb-collapsed-sidebar");
        sidebar.style.removeProperty("padding");
        sidebar.style.setProperty("width", "340px", "important");
        sidebar.style.setProperty("min-width", "340px", "important");
        sidebar.style.setProperty("max-width", "340px", "important");
        manageCollapsedRail(sidebar);
        injectHeaderActions();
        scrollToSelectedStory({ smooth: false });
      } else {
        // Sidebar is collapsed: set 64px width and show category rail
        manageCollapsedRail(sidebar);
      }
    };

    applyDynamicStyles();
    const interval = setInterval(applyDynamicStyles, 600);

    // Scroll automatically when story selection changes via Storybook channel or popstate
    const handleStoryChange = () => {
      setTimeout(() => {
        applyDynamicStyles();
        scrollToSelectedStory({ smooth: true });
      }, 100);
    };

    window.addEventListener("popstate", handleStoryChange);

    // Also auto-focus whenever a story link is clicked in the tree
    const handleTreeClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest("#storybook-explorer-tree")) {
        setTimeout(() => {
          scrollToSelectedStory({ smooth: true });
        }, 120);
      }
    };
    document.addEventListener("click", handleTreeClick, { capture: true, passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener("popstate", handleStoryChange);
      document.removeEventListener("click", handleTreeClick, { capture: true } as any);
    };
  }, []);
}

export default function StorybookUIRoot(props: any) {
  useSidebarEnhancements();
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || typeof window.addEventListener !== "function") return;

    // Handle browser Back / Forward navigation
    const handlePopState = (event: PopStateEvent) => {
      try {
        const params = new URLSearchParams(window.location.search);
        const rawStoryId =
          params.get("id") ||
          params.get("story") ||
          event.state?.storyId ||
          window.location.hash.replace(/^#\/?/, "");

        if (rawStoryId) {
          const storyId = normalizeStoryId(rawStoryId);
          if ((view as any)._channel) {
            (view as any)._channel.emit("setCurrentStory", { storyId });
            window.localStorage.setItem("lastOpenedStory", storyId);
          }
        }
      } catch (err) {
        console.warn("[Storybook Router] popstate error:", err);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return <StorybookUI {...props} />;
}

