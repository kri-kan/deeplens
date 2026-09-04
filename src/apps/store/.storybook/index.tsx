import React, { useEffect } from "react";
import { view } from "./storybook.requires";

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
      if (fromUrl) return fromUrl;

      const hash = window.location.hash.replace(/^#\/?/, "");
      if (hash) return hash;

      const stored = window.localStorage.getItem("lastOpenedStory");
      if (stored) return stored;
    } catch {}
  }
  return "design-system-overview--all-components";
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
          if (fromUrl) return fromUrl;
        }
        if (window.localStorage) {
          return window.localStorage.getItem(key);
        }
      }
    } catch {}
    return null;
  },
  setItem: async (key: string, value: string) => {
    try {
      if (typeof window !== "undefined") {
        if (window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        // Synchronize browser URL query param so refresh / copy-paste URL maintains exact story & state
        if (key === "lastOpenedStory" && value) {
          const currentUrl = new URL(window.location.href);
          if (currentUrl.searchParams.get("id") !== value) {
            currentUrl.searchParams.set("id", value);
            window.history.pushState({ storyId: value }, "", currentUrl.toString());
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
        const storyId =
          params.get("id") ||
          params.get("story") ||
          event.state?.storyId ||
          window.location.hash.replace(/^#\/?/, "");

        if (storyId && (view as any)._channel) {
          (view as any)._channel.emit("setCurrentStory", { storyId });
          window.localStorage.setItem("lastOpenedStory", storyId);
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
