import React, { createContext, useContext, useState, useEffect } from "react";
import { Platform, BackHandler, Linking } from "react-native";
import { RouteName, RouteParams, ROUTE_REGISTRY } from "./routes";
import { telemetry } from "../services/telemetry";

export function parseStoreDeepLink(rawUrl: string): { route: RouteName; params: RouteParams } | null {
  try {
    let cleanUrl = rawUrl.trim();
    if (!cleanUrl) return null;

    let pathAndQuery = cleanUrl;
    if (cleanUrl.includes("/--/")) {
      pathAndQuery = cleanUrl.split("/--/")[1] || "";
    } else if (cleanUrl.includes("://")) {
      const parts = cleanUrl.split("://")[1];
      const slashIndex = parts.indexOf("/");
      pathAndQuery = slashIndex !== -1 ? parts.substring(slashIndex) : parts;
    }

    if (pathAndQuery.startsWith("/")) {
      pathAndQuery = pathAndQuery.substring(1);
    }

    const [pathPart, queryPart] = pathAndQuery.split("?");
    const segments = (pathPart || "").split("/").filter(Boolean);

    const queryParams: RouteParams = {};
    if (queryPart) {
      const sp = new URLSearchParams(queryPart);
      sp.forEach((v, k) => {
        (queryParams as any)[k] = v;
      });
    }

    const firstSegment = segments[0]?.toLowerCase();

    // 1. Product / PDP path segment matching: /product/{code} or /pdp/{code}
    if (firstSegment === "product" || firstSegment === "pdp") {
      const productCode = segments[1] || queryParams.id;
      return {
        route: "pdp",
        params: { id: productCode, ...queryParams },
      };
    }

    // 2. Cart: /cart
    if (firstSegment === "cart") {
      return { route: "cart", params: queryParams };
    }

    // 3. Catalog: /catalog or /catalog/{category}
    if (firstSegment === "catalog") {
      return {
        route: "catalog",
        params: { category: segments[1] || queryParams.category, ...queryParams },
      };
    }

    // 4. Wishlist: /wishlist
    if (firstSegment === "wishlist") {
      return { route: "wishlist", params: queryParams };
    }

    // 5. Checkout: /checkout
    if (firstSegment === "checkout") {
      return { route: "checkout", params: queryParams };
    }

    // 6. Home: / or /home
    if (!firstSegment || firstSegment === "home") {
      return { route: "home", params: queryParams };
    }
  } catch (err) {
    console.warn("Failed to parse deep link URL:", err);
  }
  return null;
}

interface NavigationContextValue {
  currentRoute: RouteName;
  params: RouteParams;
  history: Array<{ route: RouteName; params: RouteParams }>;
  navigate: (route: RouteName, params?: RouteParams) => void;
  goBack: () => void;
  replace: (route: RouteName, params?: RouteParams) => void;
}

const NavigationContext = createContext<NavigationContextValue>({
  currentRoute: "home",
  params: {},
  history: [],
  navigate: () => {},
  goBack: () => {},
  replace: () => {},
});

export const NavigationProvider: React.FC<{ initialRoute?: RouteName; children: React.ReactNode }> = ({
  initialRoute = "home",
  children,
}) => {
  const [currentRoute, setCurrentRoute] = useState<RouteName>(initialRoute);
  const [params, setParams] = useState<RouteParams>({});
  const [history, setHistory] = useState<Array<{ route: RouteName; params: RouteParams }>>([
    { route: initialRoute, params: {} },
  ]);

  // Native Deep Linking Listener (Android / iOS)
  useEffect(() => {
    if (Platform.OS !== "web") {
      const handleDeepLink = (url: string | null) => {
        if (!url) return;
        const parsed = parseStoreDeepLink(url);
        if (parsed) {
          setCurrentRoute(parsed.route);
          setParams(parsed.params);
          setHistory((prev) => [...prev, { route: parsed.route, params: parsed.params }]);
          telemetry.trackEvent("deep_link_opened", { url, route: parsed.route, params: parsed.params });
        }
      };

      Linking.getInitialURL().then(handleDeepLink);
      const sub = Linking.addEventListener("url", (e) => handleDeepLink(e.url));
      return () => sub.remove();
    }
  }, []);

  // Sync initial URL on web
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const fullPath = window.location.pathname + window.location.search;
      const parsed = parseStoreDeepLink(fullPath);

      if (parsed) {
        setCurrentRoute(parsed.route);
        setParams(parsed.params);
        document.title = ROUTE_REGISTRY[parsed.route]?.title || "Vayyari";
      } else {
        setCurrentRoute(initialRoute);
        setParams({});
      }

      const onPopState = (e: PopStateEvent) => {
        if (e.state && e.state.route) {
          setCurrentRoute(e.state.route);
          setParams(e.state.params || {});
          document.title = ROUTE_REGISTRY[e.state.route as RouteName]?.title || "Vayyari";
        }
      };

      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    }
  }, [initialRoute]);

  // Android hardware back button handler
  useEffect(() => {
    if (Platform.OS === "android") {
      const onBackPress = () => {
        if (history.length > 1) {
          goBack();
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }
  }, [history]);

  const navigate = (route: RouteName, newParams: RouteParams = {}) => {
    setCurrentRoute(route);
    setParams(newParams);
    setHistory((prev) => [...prev, { route, params: newParams }]);
    telemetry.trackEvent("page_view", { route, params: newParams });

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const config = ROUTE_REGISTRY[route];
      let targetUrl = config.path;
      if (route === "pdp" && newParams.id) {
        targetUrl = `/product/${encodeURIComponent(newParams.id)}`;
      } else {
        const searchParams = new URLSearchParams();
        Object.entries(newParams).forEach(([k, v]) => {
          if (v !== undefined) searchParams.set(k, String(v));
        });
        const queryString = searchParams.toString() ? `?${searchParams.toString()}` : "";
        targetUrl = `${config.path}${queryString}`;
      }

      window.history.pushState({ route, params: newParams }, "", targetUrl);
      document.title = config.title;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const replace = (route: RouteName, newParams: RouteParams = {}) => {
    setCurrentRoute(route);
    setParams(newParams);
    setHistory((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = { route, params: newParams };
      return copy;
    });

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const config = ROUTE_REGISTRY[route];
      let targetUrl = config.path;
      if (route === "pdp" && newParams.id) {
        targetUrl = `/product/${encodeURIComponent(newParams.id)}`;
      } else {
        const searchParams = new URLSearchParams();
        Object.entries(newParams).forEach(([k, v]) => {
          if (v !== undefined) searchParams.set(k, String(v));
        });
        const queryString = searchParams.toString() ? `?${searchParams.toString()}` : "";
        targetUrl = `${config.path}${queryString}`;
      }

      window.history.replaceState({ route, params: newParams }, "", targetUrl);
      document.title = config.title;
    }
  };

  const goBack = () => {
    if (history.length > 1) {
      const prevHistory = [...history];
      prevHistory.pop();
      const lastEntry = prevHistory[prevHistory.length - 1];
      setHistory(prevHistory);
      setCurrentRoute(lastEntry.route);
      setParams(lastEntry.params);

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.history.back();
      }
    } else {
      navigate("home");
    }
  };

  return (
    <NavigationContext.Provider
      value={{
        currentRoute,
        params,
        history,
        navigate,
        goBack,
        replace,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => useContext(NavigationContext);
