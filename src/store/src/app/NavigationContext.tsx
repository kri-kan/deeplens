import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, BackHandler } from 'react-native';
import { RouteName, RouteParams, ROUTE_REGISTRY } from './routes';
import { telemetry } from '../services/telemetry';

interface NavigationContextValue {
  currentRoute: RouteName;
  params: RouteParams;
  history: Array<{ route: RouteName; params: RouteParams }>;
  navigate: (route: RouteName, params?: RouteParams) => void;
  goBack: () => void;
  replace: (route: RouteName, params?: RouteParams) => void;
}

const NavigationContext = createContext<NavigationContextValue>({
  currentRoute: 'home',
  params: {},
  history: [],
  navigate: () => {},
  goBack: () => {},
  replace: () => {},
});

export const NavigationProvider: React.FC<{ initialRoute?: RouteName; children: React.ReactNode }> = ({
  initialRoute = 'home',
  children,
}) => {
  const [currentRoute, setCurrentRoute] = useState<RouteName>(initialRoute);
  const [params, setParams] = useState<RouteParams>({});
  const [history, setHistory] = useState<Array<{ route: RouteName; params: RouteParams }>>([
    { route: initialRoute, params: {} },
  ]);

  // Sync initial URL on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const urlParams: RouteParams = {};
      searchParams.forEach((val, key) => {
        (urlParams as any)[key] = val;
      });

      // Match path to route
      let matchedRoute: RouteName = initialRoute;
      for (const [rName, config] of Object.entries(ROUTE_REGISTRY)) {
        if (config.path === pathname || (config.path !== '/' && pathname.startsWith(config.path))) {
          matchedRoute = rName as RouteName;
          break;
        }
      }

      setCurrentRoute(matchedRoute);
      setParams(urlParams);
      document.title = ROUTE_REGISTRY[matchedRoute]?.title || 'Vayyari';

      const onPopState = (e: PopStateEvent) => {
        if (e.state && e.state.route) {
          setCurrentRoute(e.state.route);
          setParams(e.state.params || {});
          document.title = ROUTE_REGISTRY[e.state.route as RouteName]?.title || 'Vayyari';
        }
      };

      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
    }
  }, [initialRoute]);

  // Android hardware back button handler
  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (history.length > 1) {
          goBack();
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }
  }, [history]);

  const navigate = (route: RouteName, newParams: RouteParams = {}) => {
    setCurrentRoute(route);
    setParams(newParams);
    setHistory((prev) => [...prev, { route, params: newParams }]);
    telemetry.trackEvent('page_view', { route, params: newParams });

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const config = ROUTE_REGISTRY[route];
      const searchParams = new URLSearchParams();
      Object.entries(newParams).forEach(([k, v]) => {
        if (v !== undefined) searchParams.set(k, String(v));
      });
      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const targetUrl = `${config.path}${queryString}`;
      window.history.pushState({ route, params: newParams }, '', targetUrl);
      document.title = config.title;
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const config = ROUTE_REGISTRY[route];
      const searchParams = new URLSearchParams();
      Object.entries(newParams).forEach(([k, v]) => {
        if (v !== undefined) searchParams.set(k, String(v));
      });
      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const targetUrl = `${config.path}${queryString}`;
      window.history.replaceState({ route, params: newParams }, '', targetUrl);
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

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.back();
      }
    } else {
      navigate('home');
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
