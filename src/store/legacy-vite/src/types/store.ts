export type ThemeMode = 'light' | 'dark';

export type ViewportMode = 'auto' | 'mobile' | 'tablet' | 'desktop';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  reviewsCount: number;
  description: string;
  image: string;
  badge?: string;
  isNew?: boolean;
  isBestseller?: boolean;
  specs: { [key: string]: string };
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
