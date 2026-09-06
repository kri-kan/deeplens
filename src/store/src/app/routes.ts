export type RouteName =
  | 'onboarding'
  | 'login'
  | 'otp'
  | 'home'
  | 'catalog'
  | 'pdp'
  | 'cart'
  | 'checkout'
  | 'wishlist';

export interface RouteParams {
  category?: string;
  id?: string;
  phone?: string;
  searchQuery?: string;
  from?: RouteName;
}

export interface RouteConfig {
  path: string;
  title: string;
}

export const ROUTE_REGISTRY: Record<RouteName, RouteConfig> = {
  onboarding: { path: '/onboarding', title: 'Welcome to Vayyari' },
  login: { path: '/auth/login', title: 'Sign In' },
  otp: { path: '/auth/otp', title: 'Verify OTP' },
  home: { path: '/', title: 'Vayyari — Authentic Handlooms' },
  catalog: { path: '/catalog', title: 'Curated Catalog' },
  pdp: { path: '/product', title: 'Product Details' },
  cart: { path: '/cart', title: 'Shopping Bag' },
  checkout: { path: '/checkout', title: 'Secure Checkout' },
  wishlist: { path: '/wishlist', title: 'Saved Handlooms' },
};
