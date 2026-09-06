import React, { useEffect } from "react";
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
  if (typeof window !== "undefined") {
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
      if (typeof window !== "undefined") {
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
      if (typeof window !== "undefined") {
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
export default function StorybookUIRoot(props: any) {
  useEffect(() => {
    if (typeof window === "undefined") return;

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

